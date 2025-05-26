import { 
  Room
} from 'livekit-server-sdk'
import { getRoomService } from './client'
import { prisma } from '@/lib/prisma'
import { RoomStatus } from '@/lib/db/types'
import { RoomRepository } from '@/lib/db/repositories/room.repository'

export interface CreateRoomOptions {
  name: string
  organizationId: string
  emptyTimeout?: number
  maxParticipants?: number
  metadata?: Record<string, any>
  enableTranscriptionAgent?: boolean
  enableCustomerAgent?: boolean
  customerContext?: {
    name?: string
    company?: string
    purpose?: string
  }
}

export class LiveKitRoomService {
  // Create a new LiveKit room and save to database
  static async createRoom(options: CreateRoomOptions) {
    const { 
      name, 
      organizationId, 
      metadata = {},
      enableTranscriptionAgent = true,
      enableCustomerAgent = false,
      customerContext
    } = options
    const roomService = getRoomService()
    
    // Generate unique room ID
    const liveKitRoomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    
    // Create LiveKit room
    const roomMetadata = {
      ...metadata,
      organizationId,
      roomName: name,
      transcriptionEnabled: enableTranscriptionAgent,
      customerAgentEnabled: enableCustomerAgent,
      customerContext: customerContext || {},
      // Agent dispatch info for agents to check
      requiresTranscription: enableTranscriptionAgent,
      requiresCustomerAgent: enableCustomerAgent,
    }

    const createRequest = {
      name: liveKitRoomId,
      emptyTimeout: options.emptyTimeout || 300, // 5 minutes default
      maxParticipants: options.maxParticipants || 100,
      metadata: JSON.stringify(roomMetadata),
    } as any
    
    const livekitRoom = await roomService.createRoom(createRequest)
    
    // Save to database
    const dbRoom = await RoomRepository.create({
      liveKitRoomId,
      name,
      organizationId,
    })
    
    return {
      room: dbRoom,
      livekitRoom,
    }
  }
  
  // Get room information from LiveKit
  static async getLiveKitRoom(liveKitRoomId: string) {
    const roomService = getRoomService()
    
    try {
      const rooms = await roomService.listRooms([liveKitRoomId])
      return rooms[0] || null
    } catch (error) {
      console.error('Error fetching LiveKit room:', error)
      return null
    }
  }
  
  // List all active rooms for an organization
  static async listActiveRooms(organizationId: string) {
    const dbRooms = await RoomRepository.getActiveRooms(organizationId)
    const roomService = getRoomService()
    
    // Get LiveKit room status for each
    const roomsWithStatus = await Promise.all(
      dbRooms.map(async (dbRoom) => {
        const lkRoom = await this.getLiveKitRoom(dbRoom.liveKitRoomId)
        return {
          ...dbRoom,
          participantCount: lkRoom?.numParticipants || 0,
          isActive: !!lkRoom,
        }
      })
    )
    
    return roomsWithStatus
  }
  
  // End a room (mark as ended, don't delete from LiveKit)
  static async endRoom(roomId: string) {
    const room = await RoomRepository.findById(roomId)
    if (!room) throw new Error('Room not found')
    
    // Update database status
    await RoomRepository.updateStatus(roomId, RoomStatus.ENDED)
    
    // Optionally kick all participants
    const roomService = getRoomService()
    const participants = await roomService.listParticipants(room.liveKitRoomId)
    
    // Remove all participants
    await Promise.all(
      participants.map(p => 
        roomService.removeParticipant(room.liveKitRoomId, p.identity)
      )
    )
    
    return { success: true }
  }
  
  // Get participants in a room
  static async getParticipants(liveKitRoomId: string) {
    const roomService = getRoomService()
    return await roomService.listParticipants(liveKitRoomId)
  }
  
  // Update participant metadata
  static async updateParticipant(
    liveKitRoomId: string,
    identity: string,
    metadata: Record<string, any>
  ) {
    const roomService = getRoomService()
    
    return await roomService.updateParticipant(
      liveKitRoomId,
      identity,
      JSON.stringify(metadata)
    )
  }
  
  // Remove participant from room
  static async removeParticipant(
    liveKitRoomId: string,
    identity: string
  ) {
    const roomService = getRoomService()
    
    return await roomService.removeParticipant(liveKitRoomId, identity)
  }
}
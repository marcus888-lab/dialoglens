import { 
  Room, 
  CreateRoomRequest,
  ListRoomsRequest,
  DeleteRoomRequest,
  ListParticipantsRequest,
  RoomParticipantIdentity,
  UpdateParticipantRequest,
  RemoveParticipantResponse
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
}

export class LiveKitRoomService {
  // Create a new LiveKit room and save to database
  static async createRoom(options: CreateRoomOptions) {
    const { name, organizationId, metadata = {} } = options
    const roomService = getRoomService()
    
    // Generate unique room ID
    const liveKitRoomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Create LiveKit room
    const createRequest: CreateRoomRequest = {
      name: liveKitRoomId,
      emptyTimeout: options.emptyTimeout || 300, // 5 minutes default
      maxParticipants: options.maxParticipants || 100,
      metadata: JSON.stringify({
        ...metadata,
        organizationId,
        roomName: name,
        transcriptionEnabled: true,
      }),
    }
    
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
      const rooms = await roomService.listRooms({ names: [liveKitRoomId] })
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
    const participants = await roomService.listParticipants({
      room: room.liveKitRoomId,
    })
    
    // Remove all participants
    await Promise.all(
      participants.map(p => 
        roomService.removeParticipant({
          room: room.liveKitRoomId,
          identity: p.identity,
        })
      )
    )
    
    return { success: true }
  }
  
  // Get participants in a room
  static async getParticipants(liveKitRoomId: string) {
    const roomService = getRoomService()
    
    const request: ListParticipantsRequest = {
      room: liveKitRoomId,
    }
    
    return await roomService.listParticipants(request)
  }
  
  // Update participant metadata
  static async updateParticipant(
    liveKitRoomId: string,
    identity: string,
    metadata: Record<string, any>
  ) {
    const roomService = getRoomService()
    
    const request: UpdateParticipantRequest = {
      room: liveKitRoomId,
      identity,
      metadata: JSON.stringify(metadata),
    }
    
    return await roomService.updateParticipant(request)
  }
  
  // Remove participant from room
  static async removeParticipant(
    liveKitRoomId: string,
    identity: string
  ): Promise<RemoveParticipantResponse> {
    const roomService = getRoomService()
    
    return await roomService.removeParticipant({
      room: liveKitRoomId,
      identity,
    })
  }
}
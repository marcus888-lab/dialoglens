import { prisma } from '@/lib/prisma'
import { RoomStatus, ConversationStatus } from '@/lib/db/types'

export interface RoomEvent {
  room: {
    sid: string
    name: string
    createdAt: number
    emptyTimeout?: number
    maxParticipants?: number
    metadata?: string
    numParticipants?: number
  }
}

export class RoomWebhookHandler {
  // Handle room started event
  static async handleRoomStarted(event: RoomEvent) {
    console.log('Room started:', event.room.name)
    
    // Room is already created in our DB when we create it via API
    // This is just for logging/monitoring
    const room = await prisma.room.findUnique({
      where: { liveKitRoomId: event.room.name }
    })
    
    if (room) {
      console.log(`Room ${room.name} is now active in LiveKit`)
    }
  }
  
  // Handle room finished event
  static async handleRoomFinished(event: RoomEvent) {
    console.log('Room finished:', event.room.name)
    
    const room = await prisma.room.findUnique({
      where: { liveKitRoomId: event.room.name },
      include: {
        conversations: {
          where: {
            status: ConversationStatus.RECORDING
          }
        }
      }
    })
    
    if (!room) {
      console.error(`Room not found: ${event.room.name}`)
      return
    }
    
    // Update room status
    await prisma.room.update({
      where: { id: room.id },
      data: {
        status: RoomStatus.ENDED,
        endedAt: new Date()
      }
    })
    
    // End any active conversations
    if (room.conversations.length > 0) {
      await prisma.conversation.updateMany({
        where: {
          roomId: room.id,
          status: ConversationStatus.RECORDING
        },
        data: {
          status: ConversationStatus.PROCESSING,
          endTime: new Date()
        }
      })
    }
    
    console.log(`Room ${room.name} marked as ended`)
  }
}
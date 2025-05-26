import { prisma } from '@/lib/prisma'

export interface ParticipantEvent {
  room: {
    sid: string
    name: string
  }
  participant: {
    sid: string
    identity: string
    name?: string
    metadata?: string
    joinedAt: number
    state?: string
  }
}

export class ParticipantWebhookHandler {
  // Handle participant joined event
  static async handleParticipantJoined(event: ParticipantEvent) {
    console.log(`Participant joined: ${event.participant.identity} in room ${event.room.name}`)
    
    // Find active conversation for this room
    const room = await prisma.room.findUnique({
      where: { liveKitRoomId: event.room.name },
      include: {
        conversations: {
          where: { status: 'RECORDING' },
          orderBy: { startTime: 'desc' },
          take: 1
        }
      }
    })
    
    if (!room || room.conversations.length === 0) {
      console.log('No active conversation found for participant')
      return
    }
    
    const conversation = room.conversations[0]
    
    // Check if participant already exists
    const existingParticipant = await prisma.participant.findFirst({
      where: {
        liveKitIdentity: event.participant.identity,
        conversationId: conversation.id
      }
    })
    
    if (!existingParticipant) {
      // Create participant record
      await prisma.participant.create({
        data: {
          liveKitIdentity: event.participant.identity,
          name: event.participant.name || event.participant.identity,
          conversationId: conversation.id,
          joinedAt: new Date(event.participant.joinedAt)
        }
      })
      
      console.log(`Created participant record for ${event.participant.identity}`)
    }
  }
  
  // Handle participant left event
  static async handleParticipantLeft(event: ParticipantEvent) {
    console.log(`Participant left: ${event.participant.identity} from room ${event.room.name}`)
    
    // Find the participant in active conversation
    const room = await prisma.room.findUnique({
      where: { liveKitRoomId: event.room.name },
      include: {
        conversations: {
          where: { status: 'RECORDING' },
          orderBy: { startTime: 'desc' },
          take: 1
        }
      }
    })
    
    if (!room || room.conversations.length === 0) {
      return
    }
    
    const conversation = room.conversations[0]
    
    // Update participant left time
    await prisma.participant.updateMany({
      where: {
        liveKitIdentity: event.participant.identity,
        conversationId: conversation.id,
        leftAt: null
      },
      data: {
        leftAt: new Date()
      }
    })
    
    console.log(`Updated participant ${event.participant.identity} left time`)
  }
}
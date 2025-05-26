import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { LiveKitRoomService } from '@/lib/livekit/room.service'
import { LiveKitEgressService } from '@/lib/livekit/egress.service'
import { z } from 'zod'

interface RouteParams {
  params: {
    conversationId: string
  }
}

const startRecordingSchema = z.object({
  participants: z.array(z.object({
    identity: z.string(),
    name: z.string(),
    trackId: z.string(),
  }))
})

// POST /api/conversations/[conversationId]/start-recording
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const body = await request.json()
    const { participants } = startRecordingSchema.parse(body)
    
    // Get conversation with room
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
      include: { room: true }
    })
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }
    
    if (conversation.status !== 'RECORDING') {
      return NextResponse.json(
        { error: 'Conversation is not in recording state' },
        { status: 400 }
      )
    }
    
    // Create participant records
    const dbParticipants = await Promise.all(
      participants.map(p => 
        prisma.participant.create({
          data: {
            liveKitIdentity: p.identity,
            name: p.name,
            conversationId: params.conversationId,
            joinedAt: new Date(),
          }
        })
      )
    )
    
    // Start egress for each participant
    const participantData = participants.map((p, index) => ({
      id: dbParticipants[index].id,
      identity: p.identity,
      trackId: p.trackId,
    }))
    
    const egressJobs = await LiveKitEgressService.startTrackEgress({
      conversationId: params.conversationId,
      roomName: conversation.room.liveKitRoomId,
      participants: participantData,
    })
    
    return NextResponse.json({
      success: true,
      participants: dbParticipants,
      egressJobs: egressJobs.map(j => ({
        id: j.egressJob.id,
        egressId: j.egressInfo.egressId,
        participantId: j.egressJob.participantId,
      }))
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error starting recording:', error)
    return NextResponse.json(
      { error: 'Failed to start recording' },
      { status: 500 }
    )
  }
}
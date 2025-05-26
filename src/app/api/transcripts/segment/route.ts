import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/api.helpers'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    // Verify API key or user auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      roomId,
      participantId,
      participantName,
      text,
      isFinal,
      confidence,
      timestamp,
    } = body

    // Find the room
    const room = await prisma.room.findUnique({
      where: { liveKitRoomId: roomId },
      include: { conversations: { orderBy: { startedAt: 'desc' }, take: 1 } },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Get or create active conversation
    let conversation = room.conversations[0]
    if (!conversation || conversation.endedAt) {
      conversation = await prisma.conversation.create({
        data: {
          roomId: room.id,
          organizationId: room.organizationId,
          participantCount: 1,
          metadata: JSON.stringify({ 
            transcriptionInProgress: true,
            liveTranscription: true 
          }),
        },
      })
    }

    // Find or create participant
    let participant = await prisma.participant.findFirst({
      where: {
        conversationId: conversation.id,
        liveKitIdentity: participantId,
      },
    })

    if (!participant) {
      participant = await prisma.participant.create({
        data: {
          conversationId: conversation.id,
          liveKitIdentity: participantId,
          name: participantName,
          joinedAt: new Date(timestamp),
        },
      })

      // Update participant count
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { participantCount: { increment: 1 } },
      })
    }

    // Create transcript segment
    const segment = await prisma.segment.create({
      data: {
        conversationId: conversation.id,
        participantId: participant.id,
        text,
        startTime: timestamp / 1000, // Convert to seconds
        endTime: (timestamp + 1000) / 1000, // Approximate 1 second duration
        confidence,
        metadata: JSON.stringify({ 
          isFinal,
          realTime: true,
          source: 'agent' 
        }),
      },
    })

    return NextResponse.json({
      success: true,
      segment: {
        id: segment.id,
        conversationId: conversation.id,
        participantId: participant.id,
      },
    })
  } catch (error) {
    console.error('Error processing transcript segment:', error)
    return NextResponse.json(
      { error: 'Failed to process segment' },
      { status: 500 }
    )
  }
}
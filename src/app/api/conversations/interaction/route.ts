import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    // Verify API key
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { roomId, speaker, text, timestamp, metadata } = body

    // Find the room and active conversation
    const room = await prisma.room.findUnique({
      where: { liveKitRoomId: roomId },
      include: { 
        conversations: { 
          where: { endedAt: null },
          orderBy: { startedAt: 'desc' }, 
          take: 1 
        } 
      },
    })

    if (!room || !room.conversations[0]) {
      return NextResponse.json({ error: 'Active conversation not found' }, { status: 404 })
    }

    const conversation = room.conversations[0]

    // Store interaction in conversation metadata
    const currentMetadata = JSON.parse(conversation.metadata || '{}')
    const interactions = currentMetadata.interactions || []
    
    interactions.push({
      speaker,
      text,
      timestamp,
      metadata,
    })

    // Update conversation with new interaction
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        metadata: JSON.stringify({
          ...currentMetadata,
          interactions,
          lastInteractionAt: timestamp,
        }),
      },
    })

    // If this is a customer service interaction, create a notification
    if (metadata?.agentType === 'customer-service') {
      await prisma.notification.create({
        data: {
          type: 'CUSTOMER_INTERACTION',
          title: 'Customer Service Update',
          message: `${speaker}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`,
          metadata: JSON.stringify({
            conversationId: conversation.id,
            roomId: room.id,
            interaction: { speaker, text, timestamp },
          }),
          organizationId: room.organizationId,
        },
      })
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
    })
  } catch (error) {
    console.error('Error recording interaction:', error)
    return NextResponse.json(
      { error: 'Failed to record interaction' },
      { status: 500 }
    )
  }
}
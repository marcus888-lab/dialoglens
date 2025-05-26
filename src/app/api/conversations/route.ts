import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ConversationStatus } from '@/lib/db/types'

const createConversationSchema = z.object({
  roomId: z.string().cuid(),
})

// POST /api/conversations - Start a new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomId } = createConversationSchema.parse(body)
    
    // Verify room exists and is active
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    })
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }
    
    if (room.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Room is not active' },
        { status: 400 }
      )
    }
    
    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        roomId,
        startTime: new Date(),
        status: ConversationStatus.RECORDING,
      },
      include: {
        room: true,
      }
    })
    
    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

// GET /api/conversations - List conversations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const status = searchParams.get('status')
    
    const where: any = {}
    
    if (roomId) {
      where.roomId = roomId
    }
    
    if (status) {
      where.status = status
    }
    
    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        room: true,
        participants: true,
        _count: {
          select: { egressJobs: true }
        }
      },
      orderBy: { startTime: 'desc' },
      take: 50,
    })
    
    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Error listing conversations:', error)
    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    )
  }
}
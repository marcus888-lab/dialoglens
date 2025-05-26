import { NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/livekit/client'
import { RoomRepository } from '@/lib/db/repositories/room.repository'
import { z } from 'zod'

interface RouteParams {
  params: {
    roomId: string
  }
}

const tokenRequestSchema = z.object({
  identity: z.string().min(1),
  name: z.string().min(1),
  metadata: z.record(z.any()).optional(),
})

// POST /api/rooms/[roomId]/token - Generate access token
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const body = await request.json()
    const validated = tokenRequestSchema.parse(body)
    
    // Verify room exists
    const room = await RoomRepository.findById(params.roomId)
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }
    
    // Generate token
    const token = generateToken(
      room.liveKitRoomId,
      validated.identity,
      validated.name,
      validated.metadata ? JSON.stringify(validated.metadata) : undefined
    )
    
    return NextResponse.json({
      token,
      room: {
        id: room.id,
        name: room.name,
        liveKitRoomId: room.liveKitRoomId,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error generating token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
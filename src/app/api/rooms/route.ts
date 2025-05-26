import { NextRequest, NextResponse } from 'next/server'
import { LiveKitRoomService } from '@/lib/livekit/room.service'
import { z } from 'zod'

// Validation schema
const createRoomSchema = z.object({
  name: z.string().min(1).max(255),
  organizationId: z.string().cuid(),
  metadata: z.record(z.any()).optional(),
  enableTranscriptionAgent: z.boolean().optional().default(true),
  enableCustomerAgent: z.boolean().optional().default(false),
  customerContext: z.object({
    name: z.string().optional(),
    company: z.string().optional(),
    purpose: z.string().optional(),
  }).optional(),
})

// GET /api/rooms - List rooms
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      )
    }
    
    const rooms = await LiveKitRoomService.listActiveRooms(organizationId)
    
    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('Error listing rooms:', error)
    return NextResponse.json(
      { error: 'Failed to list rooms' },
      { status: 500 }
    )
  }
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = createRoomSchema.parse(body)
    
    const result = await LiveKitRoomService.createRoom(validated)
    
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating room:', error)
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    )
  }
}
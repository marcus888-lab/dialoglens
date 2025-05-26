import { NextRequest, NextResponse } from 'next/server'
import { LiveKitRoomService } from '@/lib/livekit/room.service'
import { RoomRepository } from '@/lib/db/repositories/room.repository'

interface RouteParams {
  params: {
    roomId: string
  }
}

// GET /api/rooms/[roomId] - Get room details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const room = await RoomRepository.findById(params.roomId)
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }
    
    // Get LiveKit room status
    const liveKitRoom = await LiveKitRoomService.getLiveKitRoom(room.liveKitRoomId)
    
    return NextResponse.json({
      room,
      liveKit: liveKitRoom,
    })
  } catch (error) {
    console.error('Error fetching room:', error)
    return NextResponse.json(
      { error: 'Failed to fetch room' },
      { status: 500 }
    )
  }
}

// DELETE /api/rooms/[roomId] - End a room
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await LiveKitRoomService.endRoom(params.roomId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error ending room:', error)
    return NextResponse.json(
      { error: 'Failed to end room' },
      { status: 500 }
    )
  }
}
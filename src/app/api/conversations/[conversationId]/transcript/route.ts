import { NextRequest, NextResponse } from 'next/server'
import { TranscriptionService } from '@/lib/transcription/transcription.service'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { conversationId } = params
    
    // Check if conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        transcript: {
          include: {
            segments: true,
          },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (!conversation.transcript) {
      return NextResponse.json(
        { error: 'Transcript not available' },
        { status: 404 }
      )
    }

    // Get full transcript with parsed content
    const transcript = await TranscriptionService.getTranscript(conversationId)

    return NextResponse.json({ transcript })
  } catch (error) {
    console.error('Error fetching transcript:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transcript' },
      { status: 500 }
    )
  }
}
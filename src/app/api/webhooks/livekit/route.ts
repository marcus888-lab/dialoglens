import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, parseWebhookEvent } from '@/lib/webhooks/verify'
import { RoomWebhookHandler } from '@/lib/webhooks/handlers/room.handler'
import { ParticipantWebhookHandler } from '@/lib/webhooks/handlers/participant.handler'
import { EgressWebhookHandler } from '@/lib/webhooks/handlers/egress.handler'

// POST /api/webhooks/livekit - Handle LiveKit webhook events
export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const body = await request.text()
    
    // Get signature headers
    const signature = request.headers.get('x-livekit-signature')
    const timestamp = request.headers.get('x-livekit-timestamp')
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(body, signature, timestamp)
    
    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    // Parse event
    const event = await parseWebhookEvent(body)
    
    if (!event) {
      return NextResponse.json(
        { error: 'Invalid event data' },
        { status: 400 }
      )
    }
    
    console.log(`Received webhook event: ${event.event}`)
    
    // Route to appropriate handler
    switch (event.event) {
      // Room events
      case 'room_started':
        await RoomWebhookHandler.handleRoomStarted(event)
        break
      case 'room_finished':
        await RoomWebhookHandler.handleRoomFinished(event)
        break
        
      // Participant events
      case 'participant_joined':
        await ParticipantWebhookHandler.handleParticipantJoined(event)
        break
      case 'participant_left':
        await ParticipantWebhookHandler.handleParticipantLeft(event)
        break
        
      // Egress events
      case 'egress_started':
        await EgressWebhookHandler.handleEgressStarted(event)
        break
      case 'egress_updated':
        await EgressWebhookHandler.handleEgressUpdated(event)
        break
      case 'egress_ended':
        await EgressWebhookHandler.handleEgressEnded(event)
        break
        
      default:
        console.log(`Unhandled event type: ${event.event}`)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
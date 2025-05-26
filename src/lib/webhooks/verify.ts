import { WebhookReceiver } from 'livekit-server-sdk'
import { livekitConfig } from '@/lib/livekit/config'

// LiveKit webhook receiver instance
let webhookReceiver: WebhookReceiver | null = null

export function getWebhookReceiver(): WebhookReceiver {
  if (!webhookReceiver) {
    webhookReceiver = new WebhookReceiver(
      livekitConfig.apiKey,
      livekitConfig.apiSecret
    )
  }
  return webhookReceiver
}

// Reset for testing
export function resetWebhookReceiver() {
  webhookReceiver = null
}

// Verify webhook signature
export async function verifyWebhookSignature(
  body: string,
  signature: string | null,
  timestamp: string | null
): Promise<boolean> {
  if (!signature || !timestamp) {
    return false
  }

  try {
    const receiver = getWebhookReceiver()
    // The receive method is synchronous in the SDK
    receiver.receive(body, signature)
    return true
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return false
  }
}

// Parse webhook event
export async function parseWebhookEvent(body: string) {
  try {
    return JSON.parse(body)
  } catch (error) {
    console.error('Failed to parse webhook body:', error)
    return null
  }
}
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyWebhookSignature, parseWebhookEvent, getWebhookReceiver, resetWebhookReceiver } from '../verify'
import { WebhookReceiver } from 'livekit-server-sdk'

// Mock livekit-server-sdk
vi.mock('livekit-server-sdk', () => ({
  WebhookReceiver: vi.fn().mockImplementation(() => ({
    receive: vi.fn()
  }))
}))

// Mock the config
vi.mock('@/lib/livekit/config', () => ({
  livekitConfig: {
    apiKey: 'test-key',
    apiSecret: 'test-secret'
  }
}))

describe('Webhook Verification', () => {
  let mockReceiver: any

  beforeEach(() => {
    vi.clearAllMocks()
    resetWebhookReceiver()
    mockReceiver = {
      receive: vi.fn()
    }
    vi.mocked(WebhookReceiver).mockImplementation(() => mockReceiver)
  })

  describe('getWebhookReceiver', () => {
    it('should return singleton instance', () => {
      const receiver1 = getWebhookReceiver()
      const receiver2 = getWebhookReceiver()
      
      expect(receiver1).toBe(receiver2)
      expect(WebhookReceiver).toHaveBeenCalledOnce()
    })
  })

  describe('verifyWebhookSignature', () => {
    it('should return true for valid signature', async () => {
      const body = JSON.stringify({ event: 'test' })
      const signature = 'valid-signature'
      const timestamp = '1234567890'

      mockReceiver.receive.mockReturnValue(undefined)

      const result = await verifyWebhookSignature(body, signature, timestamp)

      expect(result).toBe(true)
      expect(mockReceiver.receive).toHaveBeenCalledWith(body, signature)
    })

    it('should return false for invalid signature', async () => {
      const body = JSON.stringify({ event: 'test' })
      const signature = 'invalid-signature'
      const timestamp = '1234567890'

      mockReceiver.receive.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const result = await verifyWebhookSignature(body, signature, timestamp)

      expect(result).toBe(false)
    })

    it('should return false for missing signature or timestamp', async () => {
      const body = JSON.stringify({ event: 'test' })

      expect(await verifyWebhookSignature(body, null, '123')).toBe(false)
      expect(await verifyWebhookSignature(body, 'sig', null)).toBe(false)
      expect(await verifyWebhookSignature(body, null, null)).toBe(false)
    })
  })

  describe('parseWebhookEvent', () => {
    it('should parse valid JSON', async () => {
      const event = { event: 'room_started', room: { name: 'test' } }
      const body = JSON.stringify(event)

      const result = await parseWebhookEvent(body)

      expect(result).toEqual(event)
    })

    it('should return null for invalid JSON', async () => {
      const body = 'invalid json'

      const result = await parseWebhookEvent(body)

      expect(result).toBeNull()
    })
  })
})
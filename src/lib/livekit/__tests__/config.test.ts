import { describe, it, expect, beforeEach, vi } from 'vitest'
import { livekitConfig, validateLiveKitConfig } from '../config'

describe('LiveKit Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('livekitConfig', () => {
    it('should return config with all required fields', () => {
      expect(livekitConfig).toHaveProperty('apiKey')
      expect(livekitConfig).toHaveProperty('apiSecret')
      expect(livekitConfig).toHaveProperty('wsUrl')
      expect(livekitConfig).toHaveProperty('egress')
      expect(livekitConfig).toHaveProperty('room')
    })

    it('should have correct egress configuration', () => {
      expect(livekitConfig.egress).toEqual({
        audioCodec: 'opus',
        audioQuality: 'high',
        fileType: 'ogg',
        s3: {
          bucket: expect.any(String),
          region: expect.any(String),
          accessKeyId: expect.any(String),
          secretAccessKey: expect.any(String),
        },
      })
    })

    it('should have correct room defaults', () => {
      expect(livekitConfig.room).toEqual({
        emptyTimeout: 300,
        maxParticipants: 100,
      })
    })
  })

  describe('validateLiveKitConfig', () => {
    it('should pass validation with all required env vars', () => {
      expect(() => validateLiveKitConfig()).not.toThrow()
    })

    it('should throw error when missing required env vars', () => {
      delete process.env.LIVEKIT_API_KEY
      delete process.env.AWS_S3_BUCKET

      expect(() => validateLiveKitConfig()).toThrow(
        'Missing required environment variables: LIVEKIT_API_KEY, AWS_S3_BUCKET'
      )
    })
  })
})
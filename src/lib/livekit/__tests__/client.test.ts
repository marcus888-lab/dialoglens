import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  getRoomService, 
  getEgressClient, 
  generateToken,
  createS3Upload,
  createTrackEgressRequest 
} from '../client'
import { AccessToken, EncodedFileType } from 'livekit-server-sdk'

// Mock livekit-server-sdk
vi.mock('livekit-server-sdk', () => ({
  RoomServiceClient: vi.fn(() => ({})),
  EgressClient: vi.fn(() => ({})),
  AccessToken: vi.fn(() => ({
    addGrant: vi.fn(),
    toJwt: vi.fn(() => 'mock-jwt-token'),
  })),
  EncodedFileType: {
    OGG: 'OGG',
  },
  VideoGrant: vi.fn(),
}))

describe('LiveKit Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getRoomService', () => {
    it('should return a singleton RoomServiceClient', () => {
      const service1 = getRoomService()
      const service2 = getRoomService()
      
      expect(service1).toBe(service2)
    })
  })

  describe('getEgressClient', () => {
    it('should return a singleton EgressClient', () => {
      const client1 = getEgressClient()
      const client2 = getEgressClient()
      
      expect(client1).toBe(client2)
    })
  })

  describe('generateToken', () => {
    it('should generate a JWT token with correct parameters', () => {
      const roomName = 'test-room'
      const participantIdentity = 'test-user'
      const participantName = 'Test User'
      const metadata = 'test-metadata'

      const token = generateToken(roomName, participantIdentity, participantName, metadata)

      expect(token).toBe('mock-jwt-token')
      expect(AccessToken).toHaveBeenCalledWith(
        expect.any(String), // apiKey
        expect.any(String), // apiSecret
        {
          identity: participantIdentity,
          name: participantName,
          metadata,
        }
      )
    })

    it('should work without optional parameters', () => {
      const token = generateToken('room', 'identity')
      expect(token).toBe('mock-jwt-token')
    })
  })

  describe('createS3Upload', () => {
    it('should create proper S3 upload configuration', () => {
      const roomId = 'room-123'
      const participantId = 'participant-456'
      const timestamp = 1234567890

      const result = createS3Upload(roomId, participantId, timestamp)

      expect(result).toEqual({
        fileType: EncodedFileType.OGG,
        filepath: `recordings/${roomId}/${participantId}/${timestamp}.ogg`,
        s3: {
          accessKey: expect.any(String),
          secret: expect.any(String),
          region: expect.any(String),
          bucket: expect.any(String),
        },
      })
    })
  })

  describe('createTrackEgressRequest', () => {
    it('should create track egress request with S3 upload', () => {
      const roomName = 'test-room'
      const trackId = 'track-123'
      const participantIdentity = 'user-123'
      const participantId = 'participant-123'

      const result = createTrackEgressRequest(
        roomName,
        trackId,
        participantIdentity,
        participantId
      )

      expect(result).toEqual({
        roomName,
        trackId,
        file: expect.objectContaining({
          fileType: EncodedFileType.OGG,
          filepath: expect.stringContaining(`recordings/${roomName}/${participantId}/`),
        }),
      })
    })
  })
})
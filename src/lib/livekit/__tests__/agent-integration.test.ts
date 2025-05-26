import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LiveKitRoomService } from '../room.service'
import { getRoomService } from '../client'

// Mock the client
vi.mock('../client', () => ({
  getRoomService: vi.fn(),
}))

// Mock the repository
vi.mock('@/lib/db/repositories/room.repository', () => ({
  RoomRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    updateStatus: vi.fn(),
    getActiveRooms: vi.fn(),
  },
}))

describe('Agent Integration', () => {
  const mockRoomService = {
    createRoom: vi.fn(),
    listRooms: vi.fn(),
    listParticipants: vi.fn(),
    removeParticipant: vi.fn(),
    updateParticipant: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getRoomService as any).mockReturnValue(mockRoomService)
  })

  describe('Room Creation with Agents', () => {
    it('should create room with transcription agent enabled by default', async () => {
      const mockLiveKitRoom = {
        sid: 'room-sid',
        name: 'room-123',
        numParticipants: 0,
        metadata: JSON.stringify({
          organizationId: 'org-123',
          roomName: 'Test Room',
          transcriptionEnabled: true,
          requiresTranscription: true,
        }),
      }

      mockRoomService.createRoom.mockResolvedValue(mockLiveKitRoom)

      const { RoomRepository } = await import('@/lib/db/repositories/room.repository')
      ;(RoomRepository.create as any).mockResolvedValue({
        id: 'room-id',
        liveKitRoomId: 'room-123',
        name: 'Test Room',
        organizationId: 'org-123',
      })

      const result = await LiveKitRoomService.createRoom({
        name: 'Test Room',
        organizationId: 'org-123',
      })

      expect(mockRoomService.createRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.stringContaining('"requiresTranscription":true'),
        })
      )
    })

    it('should create room with customer agent when enabled', async () => {
      const customerContext = {
        name: 'John Doe',
        company: 'Acme Corp',
        purpose: 'Technical Support',
      }

      const mockLiveKitRoom = {
        sid: 'room-sid',
        name: 'room-123',
        numParticipants: 0,
        metadata: JSON.stringify({
          organizationId: 'org-123',
          roomName: 'Customer Support',
          customerAgentEnabled: true,
          requiresCustomerAgent: true,
          customerContext,
        }),
      }

      mockRoomService.createRoom.mockResolvedValue(mockLiveKitRoom)

      const { RoomRepository } = await import('@/lib/db/repositories/room.repository')
      ;(RoomRepository.create as any).mockResolvedValue({
        id: 'room-id',
        liveKitRoomId: 'room-123',
        name: 'Customer Support',
        organizationId: 'org-123',
      })

      const result = await LiveKitRoomService.createRoom({
        name: 'Customer Support',
        organizationId: 'org-123',
        enableCustomerAgent: true,
        customerContext,
      })

      const metadata = JSON.parse(
        mockRoomService.createRoom.mock.calls[0][0].metadata
      )

      expect(metadata.requiresCustomerAgent).toBe(true)
      expect(metadata.customerContext).toEqual(customerContext)
    })

    it('should create room without agents when disabled', async () => {
      const mockLiveKitRoom = {
        sid: 'room-sid',
        name: 'room-123',
        numParticipants: 0,
        metadata: JSON.stringify({
          organizationId: 'org-123',
          roomName: 'No Agents Room',
          transcriptionEnabled: false,
          customerAgentEnabled: false,
        }),
      }

      mockRoomService.createRoom.mockResolvedValue(mockLiveKitRoom)

      const { RoomRepository } = await import('@/lib/db/repositories/room.repository')
      ;(RoomRepository.create as any).mockResolvedValue({
        id: 'room-id',
        liveKitRoomId: 'room-123',
        name: 'No Agents Room',
        organizationId: 'org-123',
      })

      const result = await LiveKitRoomService.createRoom({
        name: 'No Agents Room',
        organizationId: 'org-123',
        enableTranscriptionAgent: false,
        enableCustomerAgent: false,
      })

      const metadata = JSON.parse(
        mockRoomService.createRoom.mock.calls[0][0].metadata
      )

      expect(metadata.requiresTranscription).toBe(false)
      expect(metadata.requiresCustomerAgent).toBe(false)
    })
  })

  describe('Room Metadata', () => {
    it('should include agent configuration in room metadata', async () => {
      const mockLiveKitRoom = {
        sid: 'room-sid',
        name: 'room-123',
        numParticipants: 0,
        metadata: '{}',
      }

      mockRoomService.createRoom.mockResolvedValue(mockLiveKitRoom)

      const { RoomRepository } = await import('@/lib/db/repositories/room.repository')
      ;(RoomRepository.create as any).mockResolvedValue({
        id: 'room-id',
        liveKitRoomId: 'room-123',
        name: 'Test Room',
        organizationId: 'org-123',
      })

      await LiveKitRoomService.createRoom({
        name: 'Test Room',
        organizationId: 'org-123',
        metadata: { customField: 'value' },
        enableTranscriptionAgent: true,
        enableCustomerAgent: true,
        customerContext: { name: 'Test User' },
      })

      const createCall = mockRoomService.createRoom.mock.calls[0][0]
      const metadata = JSON.parse(createCall.metadata)

      expect(metadata).toMatchObject({
        organizationId: 'org-123',
        roomName: 'Test Room',
        customField: 'value',
        transcriptionEnabled: true,
        customerAgentEnabled: true,
        requiresTranscription: true,
        requiresCustomerAgent: true,
        customerContext: { name: 'Test User' },
      })
    })
  })
})
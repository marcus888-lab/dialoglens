import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LiveKitRoomService } from '../room.service'
import { getRoomService } from '../client'
import { RoomRepository } from '@/lib/db/repositories/room.repository'
import { RoomStatus } from '@/lib/db/types'

// Mock dependencies
vi.mock('../client', () => ({
  getRoomService: vi.fn(() => ({
    createRoom: vi.fn(),
    listRooms: vi.fn(),
    listParticipants: vi.fn(),
    updateParticipant: vi.fn(),
    removeParticipant: vi.fn(),
  })),
}))

vi.mock('@/lib/db/repositories/room.repository', () => ({
  RoomRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByLiveKitId: vi.fn(),
    getActiveRooms: vi.fn(),
    updateStatus: vi.fn(),
  },
}))

describe('LiveKitRoomService', () => {
  const mockRoomService = {
    createRoom: vi.fn(),
    listRooms: vi.fn(),
    listParticipants: vi.fn(),
    updateParticipant: vi.fn(),
    removeParticipant: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRoomService).mockReturnValue(mockRoomService as any)
  })

  describe('createRoom', () => {
    it('should create room in LiveKit and database', async () => {
      const options = {
        name: 'Test Room',
        organizationId: 'org-123',
        metadata: { customField: 'value' },
      }

      const mockLiveKitRoom = { 
        name: expect.stringContaining('room-'),
        numParticipants: 0,
      }
      const mockDbRoom = {
        id: 'db-room-123',
        name: 'Test Room',
        liveKitRoomId: mockLiveKitRoom.name,
        organizationId: 'org-123',
      }

      mockRoomService.createRoom.mockResolvedValue(mockLiveKitRoom)
      vi.mocked(RoomRepository.create).mockResolvedValue(mockDbRoom as any)

      const result = await LiveKitRoomService.createRoom(options)

      expect(mockRoomService.createRoom).toHaveBeenCalledWith({
        name: expect.stringContaining('room-'),
        emptyTimeout: 300,
        maxParticipants: 100,
        metadata: expect.stringContaining('"transcriptionEnabled":true'),
      })

      expect(RoomRepository.create).toHaveBeenCalledWith({
        liveKitRoomId: expect.stringContaining('room-'),
        name: 'Test Room',
        organizationId: 'org-123',
      })

      expect(result).toEqual({
        room: mockDbRoom,
        livekitRoom: mockLiveKitRoom,
      })
    })
  })

  describe('getLiveKitRoom', () => {
    it('should return room info from LiveKit', async () => {
      const mockRoom = { name: 'room-123', numParticipants: 2 }
      mockRoomService.listRooms.mockResolvedValue([mockRoom])

      const result = await LiveKitRoomService.getLiveKitRoom('room-123')

      expect(mockRoomService.listRooms).toHaveBeenCalledWith(['room-123'])
      expect(result).toEqual(mockRoom)
    })

    it('should return null if room not found', async () => {
      mockRoomService.listRooms.mockResolvedValue([])

      const result = await LiveKitRoomService.getLiveKitRoom('room-123')

      expect(result).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      mockRoomService.listRooms.mockRejectedValue(new Error('API Error'))

      const result = await LiveKitRoomService.getLiveKitRoom('room-123')

      expect(result).toBeNull()
    })
  })

  describe('endRoom', () => {
    it('should update room status and remove participants', async () => {
      const mockRoom = {
        id: 'room-123',
        liveKitRoomId: 'lk-room-123',
      }
      const mockParticipants = [
        { identity: 'user-1' },
        { identity: 'user-2' },
      ]

      vi.mocked(RoomRepository.findById).mockResolvedValue(mockRoom as any)
      vi.mocked(RoomRepository.updateStatus).mockResolvedValue({} as any)
      mockRoomService.listParticipants.mockResolvedValue(mockParticipants)
      mockRoomService.removeParticipant.mockResolvedValue({})

      const result = await LiveKitRoomService.endRoom('room-123')

      expect(RoomRepository.updateStatus).toHaveBeenCalledWith('room-123', RoomStatus.ENDED)
      expect(mockRoomService.removeParticipant).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })

    it('should throw error if room not found', async () => {
      vi.mocked(RoomRepository.findById).mockResolvedValue(null)

      await expect(LiveKitRoomService.endRoom('room-123')).rejects.toThrow('Room not found')
    })
  })
})
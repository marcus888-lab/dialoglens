import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RoomRepository } from '../room.repository'
import { prisma } from '@/lib/prisma'
import { RoomStatus } from '@/lib/db/types'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('RoomRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create a room with ACTIVE status', async () => {
      const mockRoom = {
        id: 'room-1',
        liveKitRoomId: 'lk-room-1',
        name: 'Test Room',
        organizationId: 'org-1',
        status: RoomStatus.ACTIVE,
        organization: { id: 'org-1', name: 'Test Org' },
      }

      vi.mocked(prisma.room.create).mockResolvedValue(mockRoom as any)

      const result = await RoomRepository.create({
        liveKitRoomId: 'lk-room-1',
        name: 'Test Room',
        organizationId: 'org-1',
      })

      expect(prisma.room.create).toHaveBeenCalledWith({
        data: {
          liveKitRoomId: 'lk-room-1',
          name: 'Test Room',
          organizationId: 'org-1',
          status: RoomStatus.ACTIVE,
        },
        include: {
          organization: true,
        },
      })

      expect(result).toEqual(mockRoom)
    })
  })

  describe('findById', () => {
    it('should find a room by id with relations', async () => {
      const mockRoom = {
        id: 'room-1',
        name: 'Test Room',
        conversations: [],
      }

      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as any)

      const result = await RoomRepository.findById('room-1')

      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        include: {
          organization: true,
          conversations: {
            orderBy: { startTime: 'desc' },
          },
        },
      })

      expect(result).toEqual(mockRoom)
    })
  })

  describe('updateStatus', () => {
    it('should update room status', async () => {
      const mockUpdatedRoom = {
        id: 'room-1',
        status: RoomStatus.ENDED,
        endedAt: new Date(),
      }

      vi.mocked(prisma.room.update).mockResolvedValue(mockUpdatedRoom as any)

      const result = await RoomRepository.updateStatus('room-1', RoomStatus.ENDED)

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: {
          status: RoomStatus.ENDED,
          endedAt: expect.any(Date),
        },
      })

      expect(result).toEqual(mockUpdatedRoom)
    })

    it('should not set endedAt for non-ENDED status', async () => {
      const mockUpdatedRoom = {
        id: 'room-1',
        status: RoomStatus.ARCHIVED,
      }

      vi.mocked(prisma.room.update).mockResolvedValue(mockUpdatedRoom as any)

      await RoomRepository.updateStatus('room-1', RoomStatus.ARCHIVED)

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: {
          status: RoomStatus.ARCHIVED,
        },
      })
    })
  })

  describe('getActiveRooms', () => {
    it('should return only active rooms for organization', async () => {
      const mockRooms = [
        { id: 'room-1', status: RoomStatus.ACTIVE },
        { id: 'room-2', status: RoomStatus.ACTIVE },
      ]

      vi.mocked(prisma.room.findMany).mockResolvedValue(mockRooms as any)

      const result = await RoomRepository.getActiveRooms('org-1')

      expect(prisma.room.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          status: RoomStatus.ACTIVE,
        },
      })

      expect(result).toEqual(mockRooms)
    })
  })
})
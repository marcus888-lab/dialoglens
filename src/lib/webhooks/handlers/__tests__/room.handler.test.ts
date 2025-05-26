import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RoomWebhookHandler } from '../room.handler'
import { prisma } from '@/lib/prisma'
import { RoomStatus, ConversationStatus } from '@/lib/db/types'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    conversation: {
      updateMany: vi.fn(),
    },
  },
}))

describe('RoomWebhookHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleRoomStarted', () => {
    it('should log room started event', async () => {
      const event = {
        room: {
          sid: 'room-sid',
          name: 'room-123',
          createdAt: Date.now(),
        },
      }

      const mockRoom = {
        id: 'db-room-123',
        name: 'Test Room',
        liveKitRoomId: 'room-123',
      }

      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as any)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      await RoomWebhookHandler.handleRoomStarted(event)

      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { liveKitRoomId: 'room-123' },
      })
      expect(consoleSpy).toHaveBeenCalledWith('Room started:', 'room-123')
      expect(consoleSpy).toHaveBeenCalledWith('Room Test Room is now active in LiveKit')

      consoleSpy.mockRestore()
    })
  })

  describe('handleRoomFinished', () => {
    it('should update room status and end active conversations', async () => {
      const event = {
        room: {
          sid: 'room-sid',
          name: 'room-123',
          createdAt: Date.now(),
        },
      }

      const mockRoom = {
        id: 'db-room-123',
        name: 'Test Room',
        liveKitRoomId: 'room-123',
        conversations: [
          { id: 'conv-1', status: ConversationStatus.RECORDING },
        ],
      }

      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as any)
      vi.mocked(prisma.room.update).mockResolvedValue({} as any)
      vi.mocked(prisma.conversation.updateMany).mockResolvedValue({ count: 1 } as any)

      await RoomWebhookHandler.handleRoomFinished(event)

      expect(prisma.room.findUnique).toHaveBeenCalledWith({
        where: { liveKitRoomId: 'room-123' },
        include: {
          conversations: {
            where: { status: ConversationStatus.RECORDING },
          },
        },
      })

      expect(prisma.room.update).toHaveBeenCalledWith({
        where: { id: 'db-room-123' },
        data: {
          status: RoomStatus.ENDED,
          endedAt: expect.any(Date),
        },
      })

      expect(prisma.conversation.updateMany).toHaveBeenCalledWith({
        where: {
          roomId: 'db-room-123',
          status: ConversationStatus.RECORDING,
        },
        data: {
          status: ConversationStatus.PROCESSING,
          endTime: expect.any(Date),
        },
      })
    })

    it('should handle room not found', async () => {
      const event = {
        room: {
          sid: 'room-sid',
          name: 'room-123',
          createdAt: Date.now(),
        },
      }

      vi.mocked(prisma.room.findUnique).mockResolvedValue(null)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await RoomWebhookHandler.handleRoomFinished(event)

      expect(consoleSpy).toHaveBeenCalledWith('Room not found: room-123')
      expect(prisma.room.update).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
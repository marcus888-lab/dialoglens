import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Job } from 'bullmq'
import { TranscriptionProcessor } from '../processors/transcription.processor'
import { EgressProcessor } from '../processors/egress.processor'
import { NotificationProcessor } from '../processors/notification.processor'
import { prisma } from '@/lib/prisma'
import { EgressService } from '@/lib/livekit/egress.service'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    egressJob: {
      update: vi.fn(),
    },
    transcript: {
      create: vi.fn(),
    },
    conversation: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/livekit/egress.service', () => ({
  EgressService: {
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    getActiveEgresses: vi.fn(),
  },
}))

vi.mock('../queues', () => ({
  notificationQueue: {
    add: vi.fn(),
  },
}))

describe('Processors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('TranscriptionProcessor', () => {
    let processor: TranscriptionProcessor

    beforeEach(() => {
      processor = new TranscriptionProcessor()
    })

    afterEach(async () => {
      await processor.close()
    })

    it('should process transcription job successfully', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          egressJobId: 'egress-123',
          recordingUrl: 'https://example.com/recording.mp4',
          conversationId: 'conv-123',
        },
        updateProgress: vi.fn(),
      } as unknown as Job<any>

      vi.mocked(prisma.transcript.create).mockResolvedValue({
        id: 'transcript-123',
        conversationId: 'conv-123',
        content: 'Simulated transcript content',
        metadata: '{}',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await processor['process'](mockJob)

      expect(prisma.egressJob.update).toHaveBeenCalledWith({
        where: { id: 'egress-123' },
        data: { status: 'PROCESSING' },
      })

      expect(prisma.transcript.create).toHaveBeenCalled()

      expect(prisma.egressJob.update).toHaveBeenCalledWith({
        where: { id: 'egress-123' },
        data: { status: 'COMPLETED' },
      })

      expect(result).toEqual({ transcriptId: 'transcript-123' })
    })

    it('should handle transcription failure', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          egressJobId: 'egress-123',
          recordingUrl: 'https://example.com/recording.mp4',
          conversationId: 'conv-123',
        },
        updateProgress: vi.fn(),
      } as unknown as Job<any>

      const error = new Error('Transcription failed')
      vi.mocked(prisma.transcript.create).mockRejectedValue(error)

      await expect(processor['process'](mockJob)).rejects.toThrow(error)

      expect(prisma.egressJob.update).toHaveBeenLastCalledWith({
        where: { id: 'egress-123' },
        data: { status: 'FAILED' },
      })
    })
  })

  describe('EgressProcessor', () => {
    let processor: EgressProcessor

    beforeEach(() => {
      processor = new EgressProcessor()
    })

    afterEach(async () => {
      await processor.close()
    })

    it('should start egress recording', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          roomId: 'room-123',
          conversationId: 'conv-123',
          type: 'start',
        },
      } as Job<any>

      vi.mocked(EgressService.startRecording).mockResolvedValue({
        egressJob: { liveKitEgressId: 'lk-egress-123' },
      } as any)

      const result = await processor['process'](mockJob)

      expect(EgressService.startRecording).toHaveBeenCalledWith('room-123', 'conv-123')
      expect(result).toEqual({ egressId: 'lk-egress-123' })
    })

    it('should stop egress recording', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          roomId: 'room-123',
          conversationId: 'conv-123',
          type: 'stop',
        },
      } as Job<any>

      vi.mocked(EgressService.getActiveEgresses).mockResolvedValue([
        { liveKitEgressId: 'lk-egress-1' },
        { liveKitEgressId: 'lk-egress-2' },
      ] as any)

      const result = await processor['process'](mockJob)

      expect(EgressService.stopRecording).toHaveBeenCalledWith('lk-egress-1')
      expect(EgressService.stopRecording).toHaveBeenCalledWith('lk-egress-2')
      expect(result).toEqual({ stopped: 2 })
    })
  })

  describe('NotificationProcessor', () => {
    let processor: NotificationProcessor

    beforeEach(() => {
      processor = new NotificationProcessor()
    })

    afterEach(async () => {
      await processor.close()
    })

    it('should process transcription complete notification', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          type: 'transcription_complete',
          conversationId: 'conv-123',
          metadata: { transcriptId: 'transcript-123' },
        },
      } as Job<any>

      vi.mocked(prisma.conversation.findUnique).mockResolvedValue({
        id: 'conv-123',
        title: 'Test Conversation',
        organization: { name: 'Test Org' },
      } as any)

      const result = await processor['process'](mockJob)

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-123' },
        data: {
          status: 'TRANSCRIBED',
          transcribedAt: expect.any(Date),
        },
      })

      expect(result).toEqual({ notified: true })
    })

    it('should handle conversation not found', async () => {
      const mockJob = {
        id: 'job-123',
        data: {
          type: 'transcription_complete',
          conversationId: 'conv-123',
          metadata: {},
        },
      } as Job<any>

      vi.mocked(prisma.conversation.findUnique).mockResolvedValue(null)

      await expect(processor['process'](mockJob)).rejects.toThrow('Conversation conv-123 not found')
    })
  })
})
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { JobService } from '../job.service'
import { transcriptionQueue, egressQueue, notificationQueue } from '../queues'
import { redis } from '../config'

vi.mock('../queues', () => {
  const createMockQueue = () => ({
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: vi.fn(),
    clean: vi.fn().mockResolvedValue([]),
    close: vi.fn().mockResolvedValue(undefined),
  })

  return {
    transcriptionQueue: createMockQueue(),
    egressQueue: createMockQueue(),
    notificationQueue: createMockQueue(),
  }
})

describe('JobService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterAll(async () => {
    await redis.quit()
  })

  describe('addTranscriptionJob', () => {
    it('should add a transcription job with default delay', async () => {
      const jobData = {
        egressJobId: 'egress-123',
        recordingUrl: 'https://example.com/recording.mp4',
        conversationId: 'conv-123',
      }

      const job = await JobService.addTranscriptionJob(jobData)

      expect(job).toEqual({ id: 'mock-job-id' })
      expect(transcriptionQueue.add).toHaveBeenCalledWith(
        'transcription-conv-123',
        jobData,
        { delay: 1000 }
      )
    })

    it('should add a transcription job with custom options', async () => {
      const jobData = {
        egressJobId: 'egress-123',
        recordingUrl: 'https://example.com/recording.mp4',
        conversationId: 'conv-123',
      }
      const options = { delay: 5000, attempts: 5 }

      await JobService.addTranscriptionJob(jobData, options)

      expect(transcriptionQueue.add).toHaveBeenCalledWith(
        'transcription-conv-123',
        jobData,
        options
      )
    })
  })

  describe('addEgressJob', () => {
    it('should add a start egress job', async () => {
      const jobData = {
        roomId: 'room-123',
        conversationId: 'conv-123',
        type: 'start' as const,
      }

      const job = await JobService.addEgressJob(jobData)

      expect(job).toEqual({ id: 'mock-job-id' })
      expect(egressQueue.add).toHaveBeenCalledWith(
        'egress-start-room-123',
        jobData,
        undefined
      )
    })

    it('should add a stop egress job', async () => {
      const jobData = {
        roomId: 'room-123',
        conversationId: 'conv-123',
        type: 'stop' as const,
      }

      await JobService.addEgressJob(jobData)

      expect(egressQueue.add).toHaveBeenCalledWith(
        'egress-stop-room-123',
        jobData,
        undefined
      )
    })
  })

  describe('addNotificationJob', () => {
    it('should add a notification job', async () => {
      const jobData = {
        type: 'transcription_complete' as const,
        conversationId: 'conv-123',
        metadata: { transcriptId: 'transcript-123' },
      }

      const job = await JobService.addNotificationJob(jobData)

      expect(job).toEqual({ id: 'mock-job-id' })
      expect(notificationQueue.add).toHaveBeenCalledWith(
        'notification-transcription_complete-conv-123',
        jobData,
        undefined
      )
    })
  })

  describe('getTranscriptionJobStatus', () => {
    it('should return job status when job exists', async () => {
      const mockJob = {
        id: 'job-123',
        data: { conversationId: 'conv-123' },
        progress: 50,
        getState: vi.fn().mockResolvedValue('active'),
        failedReason: null,
        processedOn: Date.now(),
        finishedOn: null,
      }

      vi.mocked(transcriptionQueue.getJob).mockResolvedValue(mockJob as any)

      const status = await JobService.getTranscriptionJobStatus('job-123')

      expect(status).toEqual({
        id: 'job-123',
        data: { conversationId: 'conv-123' },
        progress: 50,
        state: 'active',
        failedReason: null,
        processedOn: mockJob.processedOn,
        finishedOn: null,
      })
    })

    it('should return null when job does not exist', async () => {
      vi.mocked(transcriptionQueue.getJob).mockResolvedValue(null)

      const status = await JobService.getTranscriptionJobStatus('non-existent')

      expect(status).toBeNull()
    })
  })

  describe('cleanQueues', () => {
    it('should clean all queues', async () => {
      await JobService.cleanQueues()

      expect(transcriptionQueue.clean).toHaveBeenCalledTimes(2)
      expect(egressQueue.clean).toHaveBeenCalledTimes(2)
      expect(notificationQueue.clean).toHaveBeenCalledTimes(2)

      // Check completed jobs cleaned
      expect(transcriptionQueue.clean).toHaveBeenCalledWith(0, 1000, 'completed')
      expect(egressQueue.clean).toHaveBeenCalledWith(0, 1000, 'completed')
      expect(notificationQueue.clean).toHaveBeenCalledWith(0, 1000, 'completed')

      // Check failed jobs cleaned
      expect(transcriptionQueue.clean).toHaveBeenCalledWith(0, 1000, 'failed')
      expect(egressQueue.clean).toHaveBeenCalledWith(0, 1000, 'failed')
      expect(notificationQueue.clean).toHaveBeenCalledWith(0, 1000, 'failed')
    })
  })

  describe('closeQueues', () => {
    it('should close all queues', async () => {
      await JobService.closeQueues()

      expect(transcriptionQueue.close).toHaveBeenCalled()
      expect(egressQueue.close).toHaveBeenCalled()
      expect(notificationQueue.close).toHaveBeenCalled()
    })
  })
})
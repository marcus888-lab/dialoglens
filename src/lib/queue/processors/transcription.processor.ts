import { Worker, Job } from 'bullmq'
import { queueOptions, QUEUE_NAMES } from '../config'
import type { TranscriptionJobData } from '../types'
import { prisma } from '@/lib/prisma'
import { notificationQueue } from '../queues'
import { TranscriptionService } from '@/lib/transcription/transcription.service'
import { StorageService } from '@/lib/transcription/storage.service'

export class TranscriptionProcessor {
  private worker: Worker<TranscriptionJobData>

  constructor() {
    this.worker = new Worker<TranscriptionJobData>(
      QUEUE_NAMES.TRANSCRIPTION,
      this.process.bind(this),
      queueOptions
    )

    this.worker.on('completed', (job) => {
      console.log(`Transcription job ${job.id} completed`)
    })

    this.worker.on('failed', (job, err) => {
      console.error(`Transcription job ${job?.id} failed:`, err)
    })
  }

  private async process(job: Job<TranscriptionJobData>) {
    const { egressJobId, recordingUrl, conversationId } = job.data
    const startTime = Date.now()

    try {
      await prisma.egressJob.update({
        where: { id: egressJobId },
        data: { status: 'PROCESSING' },
      })

      // Get signed URL for the recording
      const s3Key = StorageService.extractKeyFromUrl(recordingUrl)
      const signedUrl = await StorageService.getSignedDownloadUrl(s3Key)

      // Update progress
      await job.updateProgress({ status: 'transcribing', progress: 10 })

      // Perform transcription
      const transcriptionResult = await TranscriptionService.transcribeAudio(signedUrl, {
        enablePunctuation: true,
        enableWordTimeOffsets: true,
      })

      // Update progress
      await job.updateProgress({ status: 'saving', progress: 90 })

      // Save transcription to database
      const processingTime = Date.now() - startTime
      const { transcript } = await TranscriptionService.saveTranscription(
        conversationId,
        transcriptionResult,
        processingTime
      )

      await prisma.egressJob.update({
        where: { id: egressJobId },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      await job.updateProgress({ status: 'completed', progress: 100 })

      await notificationQueue.add('transcription-complete', {
        type: 'transcription_complete',
        conversationId,
        metadata: { 
          transcriptId: transcript.id,
          wordCount: transcriptionResult.wordCount,
          duration: transcriptionResult.duration,
          speakerCount: transcriptionResult.speakerCount,
        },
      })

      return { transcriptId: transcript.id }
    } catch (error) {
      await prisma.egressJob.update({
        where: { id: egressJobId },
        data: { 
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date(),
        },
      })

      await notificationQueue.add('transcription-failed', {
        type: 'transcription_failed',
        conversationId,
        metadata: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          egressJobId,
        },
      })

      throw error
    }
  }

  async close() {
    await this.worker.close()
  }
}
import { Worker, Job } from 'bullmq'
import { queueOptions, QUEUE_NAMES } from '../config'
import type { TranscriptionJobData } from '../types'
import { prisma } from '@/lib/prisma'
import { notificationQueue } from '../queues'

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

    try {
      await prisma.egressJob.update({
        where: { id: egressJobId },
        data: { status: 'PROCESSING' },
      })

      // TODO: Integrate with Google Cloud Speech-to-Text
      // For now, simulate transcription processing
      await this.simulateTranscription(job)

      const transcript = await prisma.transcript.create({
        data: {
          conversationId,
          content: 'Simulated transcript content',
          metadata: JSON.stringify({
            processingTime: Date.now(),
            jobId: job.id,
          }),
        },
      })

      await prisma.egressJob.update({
        where: { id: egressJobId },
        data: { status: 'COMPLETED' },
      })

      await notificationQueue.add('transcription-complete', {
        type: 'transcription_complete',
        conversationId,
        metadata: { transcriptId: transcript.id },
      })

      return { transcriptId: transcript.id }
    } catch (error) {
      await prisma.egressJob.update({
        where: { id: egressJobId },
        data: { status: 'FAILED' },
      })

      await notificationQueue.add('transcription-failed', {
        type: 'transcription_failed',
        conversationId,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      })

      throw error
    }
  }

  private async simulateTranscription(job: Job<TranscriptionJobData>) {
    const progress = { processed: 0, total: 100 }
    
    for (let i = 0; i <= 100; i += 10) {
      progress.processed = i
      await job.updateProgress(progress)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  async close() {
    await this.worker.close()
  }
}
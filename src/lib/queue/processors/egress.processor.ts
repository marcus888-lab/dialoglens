import { Worker, Job } from 'bullmq'
import { queueOptions, QUEUE_NAMES } from '../config'
import type { EgressJobData } from '../types'
import { EgressService } from '@/lib/livekit/egress.service'
import { notificationQueue } from '../queues'

export class EgressProcessor {
  private worker: Worker<EgressJobData>

  constructor() {
    this.worker = new Worker<EgressJobData>(
      QUEUE_NAMES.EGRESS,
      this.process.bind(this),
      queueOptions
    )

    this.worker.on('completed', (job) => {
      console.log(`Egress job ${job.id} completed`)
    })

    this.worker.on('failed', (job, err) => {
      console.error(`Egress job ${job?.id} failed:`, err)
    })
  }

  private async process(job: Job<EgressJobData>) {
    const { roomId, conversationId, type } = job.data

    try {
      if (type === 'start') {
        const result = await EgressService.startRecording(roomId, conversationId)
        return { egressId: result.egressJob.liveKitEgressId }
      } else if (type === 'stop') {
        const egressJobs = await EgressService.getActiveEgresses(roomId)
        
        for (const egressJob of egressJobs) {
          await EgressService.stopRecording(egressJob.liveKitEgressId)
        }

        await notificationQueue.add('egress-complete', {
          type: 'egress_complete',
          conversationId,
          metadata: { roomId },
        })

        return { stopped: egressJobs.length }
      }
    } catch (error) {
      await notificationQueue.add('egress-failed', {
        type: 'egress_failed',
        conversationId,
        metadata: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          roomId,
          type,
        },
      })

      throw error
    }
  }

  async close() {
    await this.worker.close()
  }
}
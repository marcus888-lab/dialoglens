import { transcriptionQueue, egressQueue, notificationQueue } from './queues'
import type { TranscriptionJobData, EgressJobData, NotificationJobData } from './types'
import { JobsOptions } from 'bullmq'

export class JobService {
  static async addTranscriptionJob(
    data: TranscriptionJobData,
    options?: JobsOptions
  ) {
    const job = await transcriptionQueue.add(
      `transcription-${data.conversationId}`,
      data,
      {
        ...options,
        delay: options?.delay || 1000, // Default 1 second delay
      }
    )
    return job
  }

  static async addEgressJob(
    data: EgressJobData,
    options?: JobsOptions
  ) {
    const job = await egressQueue.add(
      `egress-${data.type}-${data.roomId}`,
      data,
      options
    )
    return job
  }

  static async addNotificationJob(
    data: NotificationJobData,
    options?: JobsOptions
  ) {
    const job = await notificationQueue.add(
      `notification-${data.type}-${data.conversationId}`,
      data,
      options
    )
    return job
  }

  static async getTranscriptionJobStatus(jobId: string) {
    const job = await transcriptionQueue.getJob(jobId)
    if (!job) return null

    return {
      id: job.id,
      data: job.data,
      progress: job.progress,
      state: await job.getState(),
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }
  }

  static async getEgressJobStatus(jobId: string) {
    const job = await egressQueue.getJob(jobId)
    if (!job) return null

    return {
      id: job.id,
      data: job.data,
      state: await job.getState(),
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    }
  }

  static async cleanQueues() {
    await transcriptionQueue.clean(0, 1000, 'completed')
    await transcriptionQueue.clean(0, 1000, 'failed')
    await egressQueue.clean(0, 1000, 'completed')
    await egressQueue.clean(0, 1000, 'failed')
    await notificationQueue.clean(0, 1000, 'completed')
    await notificationQueue.clean(0, 1000, 'failed')
  }

  static async closeQueues() {
    await transcriptionQueue.close()
    await egressQueue.close()
    await notificationQueue.close()
  }
}
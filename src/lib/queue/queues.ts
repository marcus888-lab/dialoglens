import { Queue } from 'bullmq'
import { queueOptions, QUEUE_NAMES } from './config'
import type { TranscriptionJobData, EgressJobData, NotificationJobData } from './types'

export const transcriptionQueue = new Queue<TranscriptionJobData>(
  QUEUE_NAMES.TRANSCRIPTION,
  queueOptions
)

export const egressQueue = new Queue<EgressJobData>(
  QUEUE_NAMES.EGRESS,
  queueOptions
)

export const notificationQueue = new Queue<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATION,
  queueOptions
)
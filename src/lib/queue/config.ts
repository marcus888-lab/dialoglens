import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

export const queueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
    },
    removeOnFail: {
      count: 500,
    },
  },
}

export const QUEUE_NAMES = {
  TRANSCRIPTION: 'transcription',
  EGRESS: 'egress',
  NOTIFICATION: 'notification',
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]
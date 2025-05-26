import { Worker, Job } from 'bullmq'
import { queueOptions, QUEUE_NAMES } from '../config'
import type { NotificationJobData } from '../types'
import { prisma } from '@/lib/prisma'

export class NotificationProcessor {
  private worker: Worker<NotificationJobData>

  constructor() {
    this.worker = new Worker<NotificationJobData>(
      QUEUE_NAMES.NOTIFICATION,
      this.process.bind(this),
      queueOptions
    )

    this.worker.on('completed', (job) => {
      console.log(`Notification job ${job.id} completed`)
    })

    this.worker.on('failed', (job, err) => {
      console.error(`Notification job ${job?.id} failed:`, err)
    })
  }

  private async process(job: Job<NotificationJobData>) {
    const { type, conversationId, metadata } = job.data

    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { organization: true },
      })

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`)
      }

      // TODO: Implement actual notification logic (email, webhook, etc.)
      // For now, just log the notification
      console.log('Notification:', {
        type,
        organization: conversation.organization.name,
        conversationTitle: conversation.title,
        metadata,
      })

      // Update conversation status based on notification type
      if (type === 'transcription_complete') {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { 
            status: 'TRANSCRIBED',
            transcribedAt: new Date(),
          },
        })
      } else if (type === 'transcription_failed') {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { status: 'FAILED' },
        })
      }

      return { notified: true }
    } catch (error) {
      console.error('Notification processing error:', error)
      throw error
    }
  }

  async close() {
    await this.worker.close()
  }
}
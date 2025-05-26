import { InAppNotification, NotificationData } from './notification.types'

// In-memory storage for MVP
// In production, this would be stored in the database
const notifications = new Map<string, InAppNotification[]>()

export class InAppNotificationService {
  static async createNotification(
    userId: string,
    data: NotificationData
  ): Promise<InAppNotification> {
    const notification: InAppNotification = {
      ...data,
      userId,
      read: false,
      createdAt: new Date(),
    }

    const userNotifications = notifications.get(userId) || []
    userNotifications.unshift(notification)
    notifications.set(userId, userNotifications)

    return notification
  }

  static async getNotifications(
    userId: string,
    options: { limit?: number; unreadOnly?: boolean } = {}
  ): Promise<InAppNotification[]> {
    const { limit = 50, unreadOnly = false } = options
    let userNotifications = notifications.get(userId) || []

    if (unreadOnly) {
      userNotifications = userNotifications.filter(n => !n.read)
    }

    return userNotifications.slice(0, limit)
  }

  static async markAsRead(userId: string, notificationIndex: number): Promise<void> {
    const userNotifications = notifications.get(userId) || []
    if (userNotifications[notificationIndex]) {
      userNotifications[notificationIndex].read = true
      notifications.set(userId, userNotifications)
    }
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = notifications.get(userId) || []
    userNotifications.forEach(n => (n.read = true))
    notifications.set(userId, userNotifications)
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const userNotifications = notifications.get(userId) || []
    return userNotifications.filter(n => !n.read).length
  }

  static async clearNotifications(userId: string): Promise<void> {
    notifications.delete(userId)
  }

  // Notification creation helpers
  static async notifyTranscriptionComplete(
    userId: string,
    conversationTitle: string,
    transcriptId: string
  ): Promise<InAppNotification> {
    return this.createNotification(userId, {
      type: 'TRANSCRIPTION_COMPLETE',
      title: 'Transcription Complete',
      message: `Your transcription for "${conversationTitle}" is ready to view.`,
      metadata: {
        transcriptId,
        conversationTitle,
      },
    })
  }

  static async notifyTranscriptionFailed(
    userId: string,
    conversationTitle: string,
    error: string
  ): Promise<InAppNotification> {
    return this.createNotification(userId, {
      type: 'TRANSCRIPTION_FAILED',
      title: 'Transcription Failed',
      message: `Failed to transcribe "${conversationTitle}": ${error}`,
      metadata: {
        conversationTitle,
        error,
      },
    })
  }

  static async notifyRoomEnded(
    userId: string,
    roomName: string,
    duration: number
  ): Promise<InAppNotification> {
    const durationMinutes = Math.floor(duration / 60)
    return this.createNotification(userId, {
      type: 'ROOM_ENDED',
      title: 'Room Ended',
      message: `"${roomName}" ended after ${durationMinutes} minutes.`,
      metadata: {
        roomName,
        duration,
      },
    })
  }
}
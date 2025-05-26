import { describe, it, expect, beforeEach } from 'vitest'
import { InAppNotificationService } from '../in-app.service'

describe('InAppNotificationService', () => {
  const userId = 'test-user-123'

  beforeEach(() => {
    // Clear all notifications before each test
    InAppNotificationService.clearNotifications(userId)
  })

  describe('createNotification', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        type: 'TRANSCRIPTION_COMPLETE' as const,
        title: 'Test Title',
        message: 'Test message',
        metadata: { test: true },
      }

      const notification = await InAppNotificationService.createNotification(
        userId,
        notificationData
      )

      expect(notification).toMatchObject({
        ...notificationData,
        userId,
        read: false,
      })
      expect(notification.createdAt).toBeInstanceOf(Date)
    })
  })

  describe('getNotifications', () => {
    it('should return empty array for new user', async () => {
      const notifications = await InAppNotificationService.getNotifications('new-user')
      expect(notifications).toEqual([])
    })

    it('should return notifications in reverse chronological order', async () => {
      // Create notifications
      await InAppNotificationService.createNotification(userId, {
        type: 'ROOM_ENDED',
        title: 'First',
        message: 'First notification',
      })

      await InAppNotificationService.createNotification(userId, {
        type: 'TRANSCRIPTION_COMPLETE',
        title: 'Second',
        message: 'Second notification',
      })

      const notifications = await InAppNotificationService.getNotifications(userId)
      
      expect(notifications).toHaveLength(2)
      expect(notifications[0].title).toBe('Second')
      expect(notifications[1].title).toBe('First')
    })

    it('should respect limit option', async () => {
      // Create 5 notifications
      for (let i = 0; i < 5; i++) {
        await InAppNotificationService.createNotification(userId, {
          type: 'ROOM_ENDED',
          title: `Notification ${i}`,
          message: `Message ${i}`,
        })
      }

      const notifications = await InAppNotificationService.getNotifications(userId, {
        limit: 3,
      })

      expect(notifications).toHaveLength(3)
    })

    it('should filter unread notifications when requested', async () => {
      // Create notifications
      await InAppNotificationService.createNotification(userId, {
        type: 'ROOM_ENDED',
        title: 'Notification 1',
        message: 'Message 1',
      })

      await InAppNotificationService.createNotification(userId, {
        type: 'TRANSCRIPTION_COMPLETE',
        title: 'Notification 2',
        message: 'Message 2',
      })

      // Mark first as read
      await InAppNotificationService.markAsRead(userId, 1)

      const unreadNotifications = await InAppNotificationService.getNotifications(
        userId,
        { unreadOnly: true }
      )

      expect(unreadNotifications).toHaveLength(1)
      expect(unreadNotifications[0].title).toBe('Notification 2')
    })
  })

  describe('markAsRead', () => {
    it('should mark specific notification as read', async () => {
      await InAppNotificationService.createNotification(userId, {
        type: 'ROOM_ENDED',
        title: 'Test',
        message: 'Test message',
      })

      await InAppNotificationService.markAsRead(userId, 0)

      const notifications = await InAppNotificationService.getNotifications(userId)
      expect(notifications[0].read).toBe(true)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      // Create multiple notifications
      for (let i = 0; i < 3; i++) {
        await InAppNotificationService.createNotification(userId, {
          type: 'ROOM_ENDED',
          title: `Notification ${i}`,
          message: `Message ${i}`,
        })
      }

      await InAppNotificationService.markAllAsRead(userId)

      const notifications = await InAppNotificationService.getNotifications(userId)
      expect(notifications.every(n => n.read)).toBe(true)
    })
  })

  describe('getUnreadCount', () => {
    it('should return 0 for new user', async () => {
      const count = await InAppNotificationService.getUnreadCount('new-user')
      expect(count).toBe(0)
    })

    it('should return correct unread count', async () => {
      // Create 3 notifications
      for (let i = 0; i < 3; i++) {
        await InAppNotificationService.createNotification(userId, {
          type: 'ROOM_ENDED',
          title: `Notification ${i}`,
          message: `Message ${i}`,
        })
      }

      // Mark one as read
      await InAppNotificationService.markAsRead(userId, 1)

      const count = await InAppNotificationService.getUnreadCount(userId)
      expect(count).toBe(2)
    })
  })

  describe('notification helpers', () => {
    it('should create transcription complete notification', async () => {
      const notification = await InAppNotificationService.notifyTranscriptionComplete(
        userId,
        'Test Conversation',
        'transcript-123'
      )

      expect(notification).toMatchObject({
        type: 'TRANSCRIPTION_COMPLETE',
        title: 'Transcription Complete',
        message: 'Your transcription for "Test Conversation" is ready to view.',
        metadata: {
          transcriptId: 'transcript-123',
          conversationTitle: 'Test Conversation',
        },
      })
    })

    it('should create transcription failed notification', async () => {
      const notification = await InAppNotificationService.notifyTranscriptionFailed(
        userId,
        'Test Conversation',
        'Out of memory'
      )

      expect(notification).toMatchObject({
        type: 'TRANSCRIPTION_FAILED',
        title: 'Transcription Failed',
        message: 'Failed to transcribe "Test Conversation": Out of memory',
      })
    })

    it('should create room ended notification', async () => {
      const notification = await InAppNotificationService.notifyRoomEnded(
        userId,
        'Meeting Room',
        1800 // 30 minutes
      )

      expect(notification).toMatchObject({
        type: 'ROOM_ENDED',
        title: 'Room Ended',
        message: '"Meeting Room" ended after 30 minutes.',
      })
    })
  })
})
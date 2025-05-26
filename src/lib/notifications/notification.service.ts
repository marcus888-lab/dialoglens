import { EmailService } from './email.service'
import { InAppNotificationService } from './in-app.service'
import { AuthService } from '@/lib/auth/auth.service'
import type { Organization } from '@prisma/client'

export interface NotificationOptions {
  email?: boolean
  inApp?: boolean
}

export class NotificationService {
  static async notifyTranscriptionComplete(
    organizationId: string,
    conversationTitle: string,
    transcriptId: string,
    options: NotificationOptions = { email: true, inApp: true }
  ): Promise<void> {
    try {
      // Get organization details
      const organization = await this.getOrganizationWithUser(organizationId)
      if (!organization) return

      const promises: Promise<any>[] = []

      // Send email notification
      if (options.email && organization.email) {
        promises.push(
          EmailService.sendTranscriptionCompleteEmail(
            organization.email,
            conversationTitle,
            transcriptId
          )
        )
      }

      // Send in-app notification
      if (options.inApp) {
        promises.push(
          InAppNotificationService.notifyTranscriptionComplete(
            organization.clerkId,
            conversationTitle,
            transcriptId
          )
        )
      }

      await Promise.all(promises)
    } catch (error) {
      console.error('Error sending transcription complete notification:', error)
    }
  }

  static async notifyTranscriptionFailed(
    organizationId: string,
    conversationTitle: string,
    error: string,
    options: NotificationOptions = { email: true, inApp: true }
  ): Promise<void> {
    try {
      const organization = await this.getOrganizationWithUser(organizationId)
      if (!organization) return

      const promises: Promise<any>[] = []

      if (options.email && organization.email) {
        promises.push(
          EmailService.sendTranscriptionFailedEmail(
            organization.email,
            conversationTitle,
            error
          )
        )
      }

      if (options.inApp) {
        promises.push(
          InAppNotificationService.notifyTranscriptionFailed(
            organization.clerkId,
            conversationTitle,
            error
          )
        )
      }

      await Promise.all(promises)
    } catch (error) {
      console.error('Error sending transcription failed notification:', error)
    }
  }

  static async notifyRoomEnded(
    organizationId: string,
    roomName: string,
    duration: number,
    options: NotificationOptions = { email: true, inApp: true }
  ): Promise<void> {
    try {
      const organization = await this.getOrganizationWithUser(organizationId)
      if (!organization) return

      const promises: Promise<any>[] = []

      if (options.email && organization.email) {
        promises.push(
          EmailService.sendRoomEndedEmail(
            organization.email,
            roomName,
            duration
          )
        )
      }

      if (options.inApp) {
        promises.push(
          InAppNotificationService.notifyRoomEnded(
            organization.clerkId,
            roomName,
            duration
          )
        )
      }

      await Promise.all(promises)
    } catch (error) {
      console.error('Error sending room ended notification:', error)
    }
  }

  private static async getOrganizationWithUser(
    organizationId: string
  ): Promise<Organization & { email?: string }> {
    // In a real implementation, this would:
    // 1. Get the organization from the database
    // 2. Get the user's email from Clerk
    // For now, we'll return a mock
    return {
      id: organizationId,
      clerkId: 'user_123',
      name: 'Test Organization',
      email: 'user@example.com',
      settings: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}
import { EmailNotification } from './notification.types'

export class EmailService {
  static async sendEmail(notification: EmailNotification): Promise<void> {
    // In a real implementation, this would use a service like:
    // - SendGrid
    // - AWS SES
    // - Resend
    // - Postmark
    
    console.log('Sending email notification:', {
      to: notification.to,
      subject: notification.subject,
      title: notification.title,
      message: notification.message,
    })

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // For MVP, we'll just log the email
    // In production, you would integrate with an email service
  }

  static async sendTranscriptionCompleteEmail(
    email: string,
    conversationTitle: string,
    transcriptId: string
  ): Promise<void> {
    await this.sendEmail({
      type: 'TRANSCRIPTION_COMPLETE',
      to: email,
      subject: `Transcription Ready: ${conversationTitle}`,
      title: 'Your transcription is ready!',
      message: `The transcription for "${conversationTitle}" has been completed and is now available for viewing.`,
      metadata: {
        transcriptId,
        conversationTitle,
      },
    })
  }

  static async sendTranscriptionFailedEmail(
    email: string,
    conversationTitle: string,
    error: string
  ): Promise<void> {
    await this.sendEmail({
      type: 'TRANSCRIPTION_FAILED',
      to: email,
      subject: `Transcription Failed: ${conversationTitle}`,
      title: 'Transcription failed',
      message: `We encountered an error while transcribing "${conversationTitle}". Error: ${error}`,
      metadata: {
        conversationTitle,
        error,
      },
    })
  }

  static async sendRoomEndedEmail(
    email: string,
    roomName: string,
    duration: number
  ): Promise<void> {
    const durationMinutes = Math.floor(duration / 60)
    await this.sendEmail({
      type: 'ROOM_ENDED',
      to: email,
      subject: `Room Ended: ${roomName}`,
      title: 'Your room has ended',
      message: `The room "${roomName}" has ended after ${durationMinutes} minutes. The recording is being processed.`,
      metadata: {
        roomName,
        duration,
      },
    })
  }
}
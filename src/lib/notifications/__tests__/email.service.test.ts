import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmailService } from '../email.service'

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('sendEmail', () => {
    it('should log email details', async () => {
      const notification = {
        type: 'TRANSCRIPTION_COMPLETE' as const,
        to: 'test@example.com',
        subject: 'Test Subject',
        title: 'Test Title',
        message: 'Test message',
        metadata: { test: true },
      }

      await EmailService.sendEmail(notification)

      expect(console.log).toHaveBeenCalledWith(
        'Sending email notification:',
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Test Subject',
          title: 'Test Title',
          message: 'Test message',
        })
      )
    })
  })

  describe('sendTranscriptionCompleteEmail', () => {
    it('should send transcription complete email', async () => {
      const sendEmailSpy = vi.spyOn(EmailService, 'sendEmail')

      await EmailService.sendTranscriptionCompleteEmail(
        'user@example.com',
        'Test Conversation',
        'transcript-123'
      )

      expect(sendEmailSpy).toHaveBeenCalledWith({
        type: 'TRANSCRIPTION_COMPLETE',
        to: 'user@example.com',
        subject: 'Transcription Ready: Test Conversation',
        title: 'Your transcription is ready!',
        message: 'The transcription for "Test Conversation" has been completed and is now available for viewing.',
        metadata: {
          transcriptId: 'transcript-123',
          conversationTitle: 'Test Conversation',
        },
      })
    })
  })

  describe('sendTranscriptionFailedEmail', () => {
    it('should send transcription failed email', async () => {
      const sendEmailSpy = vi.spyOn(EmailService, 'sendEmail')

      await EmailService.sendTranscriptionFailedEmail(
        'user@example.com',
        'Test Conversation',
        'Out of memory'
      )

      expect(sendEmailSpy).toHaveBeenCalledWith({
        type: 'TRANSCRIPTION_FAILED',
        to: 'user@example.com',
        subject: 'Transcription Failed: Test Conversation',
        title: 'Transcription failed',
        message: 'We encountered an error while transcribing "Test Conversation". Error: Out of memory',
        metadata: {
          conversationTitle: 'Test Conversation',
          error: 'Out of memory',
        },
      })
    })
  })

  describe('sendRoomEndedEmail', () => {
    it('should send room ended email', async () => {
      const sendEmailSpy = vi.spyOn(EmailService, 'sendEmail')

      await EmailService.sendRoomEndedEmail(
        'user@example.com',
        'Meeting Room',
        1800 // 30 minutes
      )

      expect(sendEmailSpy).toHaveBeenCalledWith({
        type: 'ROOM_ENDED',
        to: 'user@example.com',
        subject: 'Room Ended: Meeting Room',
        title: 'Your room has ended',
        message: 'The room "Meeting Room" has ended after 30 minutes. The recording is being processed.',
        metadata: {
          roomName: 'Meeting Room',
          duration: 1800,
        },
      })
    })
  })
})
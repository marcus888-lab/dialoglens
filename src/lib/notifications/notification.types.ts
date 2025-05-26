export type NotificationType = 
  | 'TRANSCRIPTION_COMPLETE'
  | 'TRANSCRIPTION_FAILED'
  | 'ROOM_ENDED'
  | 'EGRESS_STARTED'
  | 'EGRESS_FAILED'

export interface NotificationData {
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, any>
}

export interface EmailNotification extends NotificationData {
  to: string
  subject: string
}

export interface InAppNotification extends NotificationData {
  userId: string
  read: boolean
  createdAt: Date
}
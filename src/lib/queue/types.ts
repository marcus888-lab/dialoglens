export interface TranscriptionJobData {
  egressJobId: string
  recordingUrl: string
  conversationId: string
}

export interface EgressJobData {
  roomId: string
  conversationId: string
  type: 'start' | 'stop'
}

export interface NotificationJobData {
  type: 'transcription_complete' | 'transcription_failed' | 'egress_complete' | 'egress_failed'
  conversationId: string
  metadata?: Record<string, any>
}

export type JobData = TranscriptionJobData | EgressJobData | NotificationJobData
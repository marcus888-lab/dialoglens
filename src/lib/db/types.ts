// Database enum values as const
export const RoomStatus = {
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  ARCHIVED: 'ARCHIVED'
} as const

export const ConversationStatus = {
  RECORDING: 'RECORDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const

export const JobStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
} as const

// Type exports
export type RoomStatus = typeof RoomStatus[keyof typeof RoomStatus]
export type ConversationStatus = typeof ConversationStatus[keyof typeof ConversationStatus]
export type JobStatus = typeof JobStatus[keyof typeof JobStatus]

// Transcript content type
export interface TranscriptContent {
  version: string
  language: string
  duration: number
  segments: Array<{
    speakerId: string
    speakerName: string
    text: string
    startTime: number
    endTime: number
    confidence?: number
  }>
}

// Word timing data type
export interface WordTiming {
  word: string
  startTime: number
  endTime: number
  confidence?: number
}
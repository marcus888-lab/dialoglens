export interface TranscriptionSegment {
  speakerTag: number
  text: string
  startTime: number
  endTime: number
  words: TranscriptionWord[]
}

export interface TranscriptionWord {
  word: string
  startTime: number
  endTime: number
  confidence?: number
  speakerTag?: number
}

export interface TranscriptionResult {
  segments: TranscriptionSegment[]
  fullText: string
  duration: number
  wordCount: number
  speakerCount: number
  language: string
  confidence: number
}

export interface SpeakerLabel {
  speakerTag: number
  name?: string
  identifier?: string
}

export interface TranscriptionOptions {
  languageCode?: string
  speakerCount?: number
  enablePunctuation?: boolean
  enableWordTimeOffsets?: boolean
  model?: string
}
import { SpeechClient } from '@google-cloud/speech'

// Initialize the Google Speech client
let speechClient: SpeechClient | null = null

export function getSpeechClient(): SpeechClient {
  if (!speechClient) {
    speechClient = new SpeechClient()
  }
  return speechClient
}

export const transcriptionConfig = {
  encoding: 'MP3' as const,
  sampleRateHertz: 48000,
  languageCode: 'en-US',
  model: 'latest_long',
  useEnhanced: true,
  enableAutomaticPunctuation: true,
  enableWordTimeOffsets: true,
  enableSpeakerDiarization: true,
  diarizationSpeakerCount: 2,
  minSpeakerCount: 2,
  maxSpeakerCount: 10,
}

export const supportedLanguages = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
]
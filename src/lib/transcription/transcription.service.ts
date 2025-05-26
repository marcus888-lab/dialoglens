import { getSpeechClient, transcriptionConfig } from './config'
import type { TranscriptionOptions, TranscriptionResult, TranscriptionSegment, TranscriptionWord } from './types'
import { prisma } from '@/lib/prisma'
import { parseJSON } from '@/lib/db/utils'

export class TranscriptionService {
  static async transcribeAudio(
    audioUrl: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const client = getSpeechClient()
    
    // Merge options with defaults
    const config = {
      ...transcriptionConfig,
      languageCode: options.languageCode || transcriptionConfig.languageCode,
      diarizationSpeakerCount: options.speakerCount || transcriptionConfig.diarizationSpeakerCount,
      enableAutomaticPunctuation: options.enablePunctuation ?? transcriptionConfig.enableAutomaticPunctuation,
      enableWordTimeOffsets: options.enableWordTimeOffsets ?? transcriptionConfig.enableWordTimeOffsets,
      model: options.model || transcriptionConfig.model,
    }

    const audio = {
      uri: audioUrl,
    }

    const request = {
      config,
      audio,
    }

    try {
      // Perform the transcription
      const [operation] = await client.longRunningRecognize(request)
      const [response] = await operation.promise()

      if (!response.results) {
        throw new Error('No transcription results')
      }

      // Process the results
      const segments = this.processResults(response.results)
      const fullText = segments.map(s => s.text).join(' ')
      const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length
      const duration = segments[segments.length - 1]?.endTime || 0
      const speakerCount = new Set(segments.map(s => s.speakerTag)).size
      const avgConfidence = this.calculateAverageConfidence(segments)

      return {
        segments,
        fullText,
        duration,
        wordCount,
        speakerCount,
        language: config.languageCode,
        confidence: avgConfidence,
      }
    } catch (error) {
      console.error('Transcription error:', error)
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static processResults(results: any[]): TranscriptionSegment[] {
    const segments: TranscriptionSegment[] = []
    let currentSegment: TranscriptionSegment | null = null

    for (const result of results) {
      const alternative = result.alternatives?.[0]
      if (!alternative) continue

      // Process words with speaker diarization
      for (const wordInfo of alternative.words || []) {
        const word: TranscriptionWord = {
          word: wordInfo.word,
          startTime: this.timeToSeconds(wordInfo.startTime),
          endTime: this.timeToSeconds(wordInfo.endTime),
          confidence: wordInfo.confidence,
          speakerTag: wordInfo.speakerTag,
        }

        // Create new segment for speaker change
        if (!currentSegment || currentSegment.speakerTag !== wordInfo.speakerTag) {
          if (currentSegment) {
            segments.push(currentSegment)
          }
          currentSegment = {
            speakerTag: wordInfo.speakerTag || 0,
            text: '',
            startTime: word.startTime,
            endTime: word.endTime,
            words: [],
          }
        }

        // Add word to current segment
        currentSegment.text += (currentSegment.text ? ' ' : '') + word.word
        currentSegment.endTime = word.endTime
        currentSegment.words.push(word)
      }
    }

    // Add final segment
    if (currentSegment) {
      segments.push(currentSegment)
    }

    return segments
  }

  private static timeToSeconds(time: any): number {
    if (!time) return 0
    const seconds = parseInt(time.seconds || 0)
    const nanos = parseInt(time.nanos || 0)
    return seconds + nanos / 1e9
  }

  private static calculateAverageConfidence(segments: TranscriptionSegment[]): number {
    let totalConfidence = 0
    let wordCount = 0

    for (const segment of segments) {
      for (const word of segment.words) {
        if (word.confidence !== undefined) {
          totalConfidence += word.confidence
          wordCount++
        }
      }
    }

    return wordCount > 0 ? totalConfidence / wordCount : 0
  }

  static async saveTranscription(
    conversationId: string,
    result: TranscriptionResult,
    processingTime: number
  ) {
    // Create transcript record
    const transcript = await prisma.transcript.create({
      data: {
        conversationId,
        content: JSON.stringify(result),
        rawContent: result.fullText,
        processingTime,
        wordCount: result.wordCount,
      },
    })

    // Create segment records
    const segments = await Promise.all(
      result.segments.map((segment, index) =>
        prisma.segment.create({
          data: {
            transcriptId: transcript.id,
            speakerLabel: `Speaker ${segment.speakerTag}`,
            text: segment.text,
            startTime: segment.startTime,
            endTime: segment.endTime,
            confidence: this.calculateSegmentConfidence(segment),
            words: JSON.stringify(segment.words),
          },
        })
      )
    )

    return { transcript, segments }
  }

  private static calculateSegmentConfidence(segment: TranscriptionSegment): number {
    const confidences = segment.words
      .map(w => w.confidence)
      .filter((c): c is number => c !== undefined)
    
    if (confidences.length === 0) return 0
    
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length
  }

  static async getTranscript(conversationId: string) {
    const transcript = await prisma.transcript.findUnique({
      where: { conversationId },
      include: { segments: true },
    })

    if (!transcript) return null

    return {
      ...transcript,
      content: parseJSON(transcript.content) as TranscriptionResult,
      segments: transcript.segments.map(segment => ({
        ...segment,
        words: parseJSON(segment.words || '[]'),
      })),
    }
  }
}
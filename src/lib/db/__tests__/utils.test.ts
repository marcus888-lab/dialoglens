import { describe, it, expect } from 'vitest'
import {
  serializeJSON,
  parseJSON,
  parseTranscriptContent,
  serializeTranscriptContent,
  parseWordTiming,
  serializeWordTiming,
} from '../utils'
import { TranscriptContent, WordTiming } from '../types'

describe('Database Utils', () => {
  describe('JSON serialization', () => {
    it('should serialize and parse JSON correctly', () => {
      const data = { test: 'value', number: 123 }
      const serialized = serializeJSON(data)
      const parsed = parseJSON(serialized)
      
      expect(parsed).toEqual(data)
    })

    it('should return null for invalid JSON', () => {
      const result = parseJSON('invalid json')
      expect(result).toBeNull()
    })

    it('should return null for null input', () => {
      const result = parseJSON(null)
      expect(result).toBeNull()
    })
  })

  describe('Transcript content', () => {
    const mockTranscript: TranscriptContent = {
      version: '1.0',
      language: 'en-US',
      duration: 3600,
      segments: [
        {
          speakerId: 'speaker-1',
          speakerName: 'Alice',
          text: 'Hello world',
          startTime: 0,
          endTime: 5,
          confidence: 0.95,
        },
      ],
    }

    it('should serialize and parse transcript content', () => {
      const serialized = serializeTranscriptContent(mockTranscript)
      const parsed = parseTranscriptContent(serialized)
      
      expect(parsed).toEqual(mockTranscript)
    })
  })

  describe('Word timing', () => {
    const mockWords: WordTiming[] = [
      { word: 'Hello', startTime: 0, endTime: 0.5, confidence: 0.95 },
      { word: 'world', startTime: 0.6, endTime: 1.0, confidence: 0.93 },
    ]

    it('should serialize and parse word timing', () => {
      const serialized = serializeWordTiming(mockWords)
      const parsed = parseWordTiming(serialized)
      
      expect(parsed).toEqual(mockWords)
    })
  })
})
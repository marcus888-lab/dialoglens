import { describe, it, expect } from 'vitest'
import { RoomStatus, ConversationStatus, JobStatus } from '../types'

describe('Database Types', () => {
  describe('Enum values', () => {
    it('should have correct RoomStatus values', () => {
      expect(RoomStatus.ACTIVE).toBe('ACTIVE')
      expect(RoomStatus.ENDED).toBe('ENDED')
      expect(RoomStatus.ARCHIVED).toBe('ARCHIVED')
    })

    it('should have correct ConversationStatus values', () => {
      expect(ConversationStatus.RECORDING).toBe('RECORDING')
      expect(ConversationStatus.PROCESSING).toBe('PROCESSING')
      expect(ConversationStatus.COMPLETED).toBe('COMPLETED')
      expect(ConversationStatus.FAILED).toBe('FAILED')
    })

    it('should have correct JobStatus values', () => {
      expect(JobStatus.PENDING).toBe('PENDING')
      expect(JobStatus.RUNNING).toBe('RUNNING')
      expect(JobStatus.COMPLETED).toBe('COMPLETED')
      expect(JobStatus.FAILED).toBe('FAILED')
    })
  })
})
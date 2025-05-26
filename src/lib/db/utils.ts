import { prisma } from '@/lib/prisma'
import { TranscriptContent, WordTiming } from './types'

// JSON serialization helpers
export const serializeJSON = (data: any): string => {
  return JSON.stringify(data)
}

export const parseJSON = <T>(json: string | null): T | null => {
  if (!json) return null
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

// Transcript helpers
export const parseTranscriptContent = (content: string): TranscriptContent | null => {
  return parseJSON<TranscriptContent>(content)
}

export const serializeTranscriptContent = (content: TranscriptContent): string => {
  return serializeJSON(content)
}

// Word timing helpers
export const parseWordTiming = (words: string | null): WordTiming[] | null => {
  return parseJSON<WordTiming[]>(words)
}

export const serializeWordTiming = (words: WordTiming[]): string => {
  return serializeJSON(words)
}

// Database transaction helper
export const withTransaction = async <T>(
  fn: (tx: typeof prisma) => Promise<T>
): Promise<T> => {
  return await prisma.$transaction(async (tx) => {
    return await fn(tx as typeof prisma)
  })
}

// Soft delete helper (for future use)
export const softDelete = async (
  model: any,
  id: string
): Promise<void> => {
  await model.update({
    where: { id },
    data: { deletedAt: new Date() }
  })
}
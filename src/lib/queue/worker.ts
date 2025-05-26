import { TranscriptionProcessor, EgressProcessor, NotificationProcessor } from './processors'

let transcriptionProcessor: TranscriptionProcessor | null = null
let egressProcessor: EgressProcessor | null = null
let notificationProcessor: NotificationProcessor | null = null

export function initializeWorkers() {
  if (process.env.NODE_ENV === 'test') {
    console.log('Skipping worker initialization in test environment')
    return
  }

  if (!transcriptionProcessor) {
    transcriptionProcessor = new TranscriptionProcessor()
    console.log('Transcription processor initialized')
  }

  if (!egressProcessor) {
    egressProcessor = new EgressProcessor()
    console.log('Egress processor initialized')
  }

  if (!notificationProcessor) {
    notificationProcessor = new NotificationProcessor()
    console.log('Notification processor initialized')
  }
}

export async function shutdownWorkers() {
  const shutdownPromises: Promise<void>[] = []

  if (transcriptionProcessor) {
    shutdownPromises.push(transcriptionProcessor.close())
    transcriptionProcessor = null
  }

  if (egressProcessor) {
    shutdownPromises.push(egressProcessor.close())
    egressProcessor = null
  }

  if (notificationProcessor) {
    shutdownPromises.push(notificationProcessor.close())
    notificationProcessor = null
  }

  await Promise.all(shutdownPromises)
  console.log('All workers shut down')
}
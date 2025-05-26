import { EgressInfo } from 'livekit-server-sdk'
import { EgressService } from '@/lib/livekit/egress.service'
import { JobService } from '@/lib/queue'

export interface EgressEvent {
  egressInfo: EgressInfo
}

export class EgressWebhookHandler {
  // Handle egress started event
  static async handleEgressStarted(event: EgressEvent) {
    console.log(`Egress started: ${event.egressInfo.egressId}`)
    // Status update is handled when we create the egress job
  }
  
  // Handle egress updated event
  static async handleEgressUpdated(event: EgressEvent) {
    console.log(`Egress updated: ${event.egressInfo.egressId}`)
    // Could be used for progress tracking if needed
  }
  
  // Handle egress ended event
  static async handleEgressEnded(event: EgressEvent) {
    console.log(`Egress ended: ${event.egressInfo.egressId}`)
    
    // Process the completion
    const result = await EgressService.handleEgressComplete(event.egressInfo)
    
    // If we have a recording URL, queue transcription job
    if (result && result.recordingUrl) {
      await JobService.addTranscriptionJob({
        egressJobId: result.egressJob.id,
        recordingUrl: result.recordingUrl,
        conversationId: result.egressJob.conversationId,
      })
    }
  }
}
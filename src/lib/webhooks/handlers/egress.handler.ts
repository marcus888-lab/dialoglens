import { EgressInfo } from 'livekit-server-sdk'
import { LiveKitEgressService } from '@/lib/livekit/egress.service'

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
    await LiveKitEgressService.handleEgressComplete(event.egressInfo)
  }
}
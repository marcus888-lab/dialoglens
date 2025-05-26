import {
  EgressInfo,
  TrackEgressRequest,
  RoomCompositeEgressRequest,
  EncodedFileType,
  AudioCodec,
  ListEgressRequest,
  StopEgressRequest,
} from 'livekit-server-sdk'
import { getEgressClient, createS3Upload } from './client'
import { prisma } from '@/lib/prisma'
import { JobStatus } from '@/lib/db/types'

export interface StartEgressOptions {
  conversationId: string
  roomName: string
  participants: Array<{
    id: string
    identity: string
    trackId: string
  }>
}

export class LiveKitEgressService {
  // Start individual track egress for each participant
  static async startTrackEgress(options: StartEgressOptions) {
    const egressClient = getEgressClient()
    const { conversationId, roomName, participants } = options
    
    const egressJobs = await Promise.all(
      participants.map(async (participant) => {
        try {
          // Create egress request
          const timestamp = Date.now()
          const request: TrackEgressRequest = {
            roomName,
            trackId: participant.trackId,
            file: createS3Upload(roomName, participant.id, timestamp),
          }
          
          // Start egress
          const egressInfo = await egressClient.startTrackEgress(request)
          
          // Save to database
          const egressJob = await prisma.egressJob.create({
            data: {
              liveKitEgressId: egressInfo.egressId,
              conversationId,
              participantId: participant.id,
              status: JobStatus.RUNNING,
            }
          })
          
          return {
            egressJob,
            egressInfo,
          }
        } catch (error) {
          console.error(`Failed to start egress for participant ${participant.id}:`, error)
          
          // Create failed job record
          await prisma.egressJob.create({
            data: {
              liveKitEgressId: `failed-${Date.now()}-${participant.id}`,
              conversationId,
              participantId: participant.id,
              status: JobStatus.FAILED,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          })
          
          throw error
        }
      })
    )
    
    return egressJobs
  }
  
  // Start room composite egress (all participants in one file)
  static async startRoomCompositeEgress(
    conversationId: string,
    roomName: string
  ) {
    const egressClient = getEgressClient()
    const timestamp = Date.now()
    
    const request: RoomCompositeEgressRequest = {
      roomName,
      audioOnly: true,
      file: {
        fileType: EncodedFileType.OGG,
        filepath: `recordings/${roomName}/composite/${timestamp}.ogg`,
        s3: {
          accessKey: process.env.AWS_ACCESS_KEY_ID!,
          secret: process.env.AWS_SECRET_ACCESS_KEY!,
          region: process.env.AWS_REGION || 'us-east-1',
          bucket: process.env.AWS_S3_BUCKET!,
        },
      },
    }
    
    const egressInfo = await egressClient.startRoomCompositeEgress(request)
    
    // Note: For composite egress, we might not have individual participant records
    // This would need to be handled differently based on requirements
    
    return egressInfo
  }
  
  // List active egress jobs
  static async listEgress(roomName?: string) {
    const egressClient = getEgressClient()
    
    const request: ListEgressRequest = {}
    if (roomName) {
      request.roomName = roomName
    }
    
    return await egressClient.listEgress(request)
  }
  
  // Stop an egress job
  static async stopEgress(egressId: string) {
    const egressClient = getEgressClient()
    
    const request: StopEgressRequest = {
      egressId,
    }
    
    return await egressClient.stopEgress(request)
  }
  
  // Process egress completion webhook
  static async handleEgressComplete(egressInfo: EgressInfo) {
    const { egressId, status, fileResults, error } = egressInfo
    
    // Find the egress job in database
    const egressJob = await prisma.egressJob.findUnique({
      where: { liveKitEgressId: egressId }
    })
    
    if (!egressJob) {
      console.error(`Egress job not found for ID: ${egressId}`)
      return
    }
    
    // Update job status
    const updateData: any = {
      completedAt: new Date(),
    }
    
    if (status === 'EGRESS_COMPLETE' && fileResults && fileResults.length > 0) {
      updateData.status = JobStatus.COMPLETED
      updateData.audioFileUrl = fileResults[0].location
    } else {
      updateData.status = JobStatus.FAILED
      updateData.error = error || 'Egress failed without error message'
    }
    
    await prisma.egressJob.update({
      where: { id: egressJob.id },
      data: updateData,
    })
    
    // Check if all jobs for the conversation are complete
    await this.checkConversationComplete(egressJob.conversationId)
  }
  
  // Check if all egress jobs for a conversation are complete
  private static async checkConversationComplete(conversationId: string) {
    const jobs = await prisma.egressJob.findMany({
      where: { conversationId }
    })
    
    const allComplete = jobs.every(
      job => job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED
    )
    
    if (allComplete) {
      // Update conversation status
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          status: 'PROCESSING', // Ready for transcription
          endTime: new Date(),
        }
      })
      
      // TODO: Trigger transcription pipeline
      console.log(`Conversation ${conversationId} ready for transcription`)
    }
  }
  
  // Get egress status
  static async getEgressStatus(egressId: string) {
    const egressClient = getEgressClient()
    const egresses = await egressClient.listEgress({ egressId })
    
    return egresses[0] || null
  }
}
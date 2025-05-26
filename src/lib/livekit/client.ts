import {
  RoomServiceClient,
  EgressClient,
  AccessToken,
  VideoGrant,
  TrackEgressRequest,
  EncodedFileOutput,
  EncodedFileType,
  AudioCodec,
} from 'livekit-server-sdk'
import { livekitConfig } from './config'

// Singleton instances
let roomService: RoomServiceClient | null = null
let egressClient: EgressClient | null = null

export function getRoomService(): RoomServiceClient {
  if (!roomService) {
    roomService = new RoomServiceClient(
      livekitConfig.wsUrl,
      livekitConfig.apiKey,
      livekitConfig.apiSecret
    )
  }
  return roomService
}

export function getEgressClient(): EgressClient {
  if (!egressClient) {
    egressClient = new EgressClient(
      livekitConfig.wsUrl,
      livekitConfig.apiKey,
      livekitConfig.apiSecret
    )
  }
  return egressClient
}

// Token generation
export function generateToken(
  roomName: string,
  participantIdentity: string,
  participantName?: string,
  metadata?: string
): string {
  const at = new AccessToken(
    livekitConfig.apiKey,
    livekitConfig.apiSecret,
    {
      identity: participantIdentity,
      name: participantName,
      metadata,
    }
  )

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  }

  at.addGrant(grant)
  at.ttl = '10h' // Token valid for 10 hours

  return at.toJwt()
}

// Create S3 upload configuration
export function createS3Upload(
  roomId: string,
  participantId: string,
  timestamp: number
): EncodedFileOutput {
  const { s3 } = livekitConfig.egress
  const key = `recordings/${roomId}/${participantId}/${timestamp}.${livekitConfig.egress.fileType}`

  return {
    fileType: EncodedFileType.OGG,
    filepath: key,
    s3: {
      accessKey: s3.accessKeyId,
      secret: s3.secretAccessKey,
      region: s3.region,
      bucket: s3.bucket,
    },
  }
}

// Create track egress request
export function createTrackEgressRequest(
  roomName: string,
  trackId: string,
  participantIdentity: string,
  participantId: string
): TrackEgressRequest {
  const timestamp = Date.now()
  
  return {
    roomName,
    trackId,
    file: createS3Upload(roomName, participantId, timestamp),
  }
}
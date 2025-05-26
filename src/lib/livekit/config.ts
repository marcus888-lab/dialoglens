export const livekitConfig = {
  apiKey: process.env.LIVEKIT_API_KEY!,
  apiSecret: process.env.LIVEKIT_API_SECRET!,
  wsUrl: process.env.LIVEKIT_URL!,
  
  // Egress configuration
  egress: {
    audioCodec: 'opus' as const,
    audioQuality: 'high' as const,
    fileType: 'ogg' as const,
    
    // S3 configuration for audio storage
    s3: {
      bucket: process.env.AWS_S3_BUCKET!,
      region: process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  },
  
  // Room configuration defaults
  room: {
    emptyTimeout: 300, // 5 minutes
    maxParticipants: 100,
  }
}

// Validate configuration
export function validateLiveKitConfig() {
  const required = [
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'LIVEKIT_URL',
    'AWS_S3_BUCKET',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
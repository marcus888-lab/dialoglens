# DialogLens Technical Context

## System Architecture Overview

DialogLens implements a distributed architecture for recording, transcribing, and managing multi-participant conversations using LiveKit infrastructure.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │     │  LiveKit Room   │     │  LiveKit Cloud  │
│  (Next.js App)  │────▶│  (Audio/Video)  │────▶│  (Egress API)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                                │
         │                                                │
         ▼                                                ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Routes    │     │ Webhook Handler │◀────│  Cloud Storage  │
│  (Next.js API)  │     │  (Egress End)   │     │   (S3/GCS)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                       │
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   PostgreSQL    │     │   Job Queue     │     │   STT Service   │
│   (Prisma ORM)  │◀────│   (BullMQ)      │────▶│ (Google Cloud)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Core Components

### 1. Web Application Layer
**Technology**: Next.js 14 with App Router
- Server-side rendering for optimal performance
- API routes for backend functionality
- Real-time updates via Server-Sent Events or WebSockets
- Responsive UI with Tailwind CSS

### 2. LiveKit Integration
**Components**:
- **Room Management**: Create and manage conversation rooms
- **Participant Tracking**: Monitor who joins/leaves
- **Egress Control**: Initiate and manage audio recording jobs
- **Webhook Processing**: Handle egress completion events

**Key APIs**:
```typescript
// Room creation
POST /twirp/livekit.RoomService/CreateRoom

// Egress initiation
POST /twirp/livekit.Egress/StartTrackEgress

// Webhook endpoint
POST /api/webhooks/livekit/egress
```

### 3. Audio Processing Pipeline

#### Stage 1: Recording
- **Method**: LiveKit Track Egress (individual participant tracks)
- **Format**: Opus codec in OGG container
- **Storage**: Direct upload to S3/GCS bucket
- **Naming**: `{roomId}/{participantId}/{timestamp}.ogg`

#### Stage 2: Retrieval
- Webhook triggers download from cloud storage
- Temporary local storage for processing
- Cleanup after successful transcription

#### Stage 3: Transcription
- **Service**: Google Cloud Speech-to-Text v2
- **Features**: 
  - Multi-channel audio support
  - Speaker diarization
  - Word-level timestamps
  - Confidence scores
- **Configuration**:
```json
{
  "config": {
    "encoding": "OGG_OPUS",
    "sampleRateHertz": 48000,
    "languageCode": "en-US",
    "enableSpeakerDiarization": true,
    "diarizationSpeakerCount": null,
    "enableAutomaticPunctuation": true,
    "enableWordTimeOffsets": true,
    "model": "latest_long"
  }
}
```

### 4. Data Models (Prisma Schema)

```prisma
model Room {
  id                String        @id @default(cuid())
  liveKitRoomId     String        @unique
  name              String
  createdAt         DateTime      @default(now())
  endedAt           DateTime?
  status            RoomStatus    @default(ACTIVE)
  conversations     Conversation[]
  organizationId    String
  organization      Organization  @relation(fields: [organizationId], references: [id])
}

model Conversation {
  id                String        @id @default(cuid())
  roomId            String
  room              Room          @relation(fields: [roomId], references: [id])
  startTime         DateTime
  endTime           DateTime?
  egressJobs        EgressJob[]
  transcript        Transcript?
  participants      Participant[]
  status            ConvStatus    @default(RECORDING)
}

model EgressJob {
  id                String        @id @default(cuid())
  liveKitEgressId   String        @unique
  conversationId    String
  conversation      Conversation  @relation(fields: [conversationId], references: [id])
  participantId     String
  participant       Participant   @relation(fields: [participantId], references: [id])
  status            JobStatus     @default(PENDING)
  audioFileUrl      String?
  startedAt         DateTime      @default(now())
  completedAt       DateTime?
  error             String?
}

model Participant {
  id                String        @id @default(cuid())
  liveKitIdentity   String
  name              String
  conversationId    String
  conversation      Conversation  @relation(fields: [conversationId], references: [id])
  egressJobs        EgressJob[]
  speakerLabel      String?       // Assigned after diarization
  joinedAt          DateTime
  leftAt            DateTime?
}

model Transcript {
  id                String        @id @default(cuid())
  conversationId    String        @unique
  conversation      Conversation  @relation(fields: [conversationId], references: [id])
  content           Json          // Structured transcript data
  rawContent        String?       // Plain text version
  createdAt         DateTime      @default(now())
  processingTime    Int?          // milliseconds
  wordCount         Int?
  segments          Segment[]
}

model Segment {
  id                String        @id @default(cuid())
  transcriptId      String
  transcript        Transcript    @relation(fields: [transcriptId], references: [id])
  speakerLabel      String
  text              String
  startTime         Float         // seconds
  endTime           Float         // seconds
  confidence        Float?
  words             Json?         // Word-level timing data
}

enum RoomStatus {
  ACTIVE
  ENDED
  ARCHIVED
}

enum ConvStatus {
  RECORDING
  PROCESSING
  COMPLETED
  FAILED
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

### 5. Job Queue Architecture

**Technology**: BullMQ with Redis
- Reliable job processing with retries
- Priority queues for different job types
- Dead letter queue for failed jobs

**Queue Types**:
1. **egress-completion**: Process webhook notifications
2. **audio-download**: Retrieve files from cloud storage
3. **transcription**: Submit to STT service
4. **notification**: Send completion notifications

**Job Flow**:
```typescript
interface TranscriptionJob {
  conversationId: string;
  audioFiles: Array<{
    participantId: string;
    fileUrl: string;
  }>;
  retryCount: number;
  priority: number;
}

// Job processor
async function processTranscriptionJob(job: Job<TranscriptionJob>) {
  const { conversationId, audioFiles } = job.data;
  
  // 1. Download audio files
  const localFiles = await downloadAudioFiles(audioFiles);
  
  // 2. Submit to STT service
  const transcript = await submitToSTT(localFiles);
  
  // 3. Process and store results
  await storeTranscript(conversationId, transcript);
  
  // 4. Cleanup
  await cleanupLocalFiles(localFiles);
  
  // 5. Trigger notifications
  await notificationQueue.add('transcript-ready', { conversationId });
}
```

### 6. Security Architecture

#### Authentication & Authorization
- **Method**: JWT-based authentication (Clerk/NextAuth)
- **RBAC Model**:
  - Organization Admin: Full access
  - Member: View own conversations
  - Guest: View shared transcripts only

#### Data Security
- **Encryption at Rest**: AES-256 for database
- **Encryption in Transit**: TLS 1.3
- **File Storage**: Signed URLs with expiration
- **API Security**: Rate limiting, API key rotation

#### Compliance
- GDPR data retention policies
- Audit logging for all access
- Data anonymization options
- Right to deletion implementation

### 7. Monitoring & Observability

**Metrics Collection**:
- Application metrics (Vercel Analytics)
- Error tracking (Sentry)
- Custom business metrics

**Key Metrics**:
```typescript
interface SystemMetrics {
  // Performance
  transcriptionLatency: Histogram;
  egressJobDuration: Histogram;
  apiResponseTime: Histogram;
  
  // Reliability
  transcriptionSuccessRate: Gauge;
  egressFailureCount: Counter;
  webhookProcessingErrors: Counter;
  
  // Business
  dailyActiveRooms: Gauge;
  totalTranscriptionsProcessed: Counter;
  averageConversationLength: Histogram;
}
```

### 8. External Service Integration

#### LiveKit Cloud
- **Authentication**: API key + secret
- **Rate Limits**: 100 req/sec
- **Retry Strategy**: Exponential backoff
- **Failover**: Multi-region support

#### Google Cloud Speech-to-Text
- **Authentication**: Service account JSON
- **Quotas**: 
  - 480 minutes/day (free tier)
  - Unlimited (paid)
- **Batch Processing**: Up to 10,000 minutes
- **Streaming**: Real-time with 5-minute chunks

#### Cloud Storage (S3/GCS)
- **Bucket Structure**:
  ```
  dialoglens-audio/
  ├── recordings/
  │   ├── {year}/{month}/{day}/
  │   │   └── {roomId}/
  │   │       └── {participantId}/
  │   │           └── {timestamp}.ogg
  └── temp/
      └── processing/
  ```
- **Lifecycle Policies**: 30-day retention
- **Access Control**: IAM roles, signed URLs

### 9. Development & Deployment

#### Local Development
```bash
# Environment setup
npm install
cp .env.example .env.local
docker-compose up -d  # PostgreSQL, Redis

# Database setup
npx prisma migrate dev
npx prisma generate

# Development server
npm run dev
```

#### CI/CD Pipeline
- **Build**: GitHub Actions
- **Testing**: Jest, Playwright
- **Deployment**: Vercel (frontend), AWS ECS (workers)
- **Staging**: Automatic on PR
- **Production**: Manual approval

#### Environment Variables
```env
# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_URL=

# Database
DATABASE_URL=

# Cloud Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS=

# Redis
REDIS_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

### 10. Scalability Considerations

#### Horizontal Scaling
- Stateless API servers
- Multiple job queue workers
- Read replicas for database
- CDN for static assets

#### Performance Optimization
- Database indexing strategy
- Caching layer (Redis)
- Lazy loading transcripts
- Pagination for large datasets

#### Cost Optimization
- On-demand transcription processing
- Automatic audio file cleanup
- Efficient storage formats
- Reserved instance pricing

## Future Architecture Evolution

### Phase 2: Real-time Transcription
- LiveKit Agents for streaming STT
- WebSocket connections for live updates
- In-memory transcript assembly

### Phase 3: Advanced Features
- Multi-language support
- Custom vocabulary training
- AI-powered summarization
- Integration APIs for third-party tools

---

*This document represents the technical foundation for DialogLens MVP implementation.*
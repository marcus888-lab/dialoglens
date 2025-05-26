# LiveKit Agent Architecture for DialogLens

## Overview

This document details the LiveKit Agent implementation for real-time transcription in DialogLens. Agents are server-side participants that join LiveKit rooms to process audio streams and generate live transcripts with speaker diarization.

## Agent Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Agent Pool    │     │ Agent Dispatcher│     │  LiveKit Room   │
│  (Worker Nodes) │◀────│   (Controller)  │────▶│  (Audio/Video)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                        │                       │
         │                        │                       │
         ▼                        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  STT Service    │     │  Agent Registry │     │  Room Events    │
│ (Google/Gemini) │     │   (Redis/DB)    │     │  (Webhooks)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Core Components

### 1. Agent Dispatcher Service

The dispatcher manages agent lifecycle and room assignments:

```typescript
// agent-dispatcher.ts
import { RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';
import { AgentPool } from './agent-pool';
import { AgentRegistry } from './agent-registry';

export class AgentDispatcher {
  private roomClient: RoomServiceClient;
  private agentPool: AgentPool;
  private registry: AgentRegistry;

  constructor(config: DispatcherConfig) {
    this.roomClient = new RoomServiceClient(
      config.livekitHost,
      config.apiKey,
      config.apiSecret
    );
    this.agentPool = new AgentPool(config.agentConfig);
    this.registry = new AgentRegistry(config.redis);
  }

  // Webhook handler for room events
  async handleRoomEvent(event: WebhookEvent) {
    switch (event.event) {
      case 'room_started':
        await this.assignAgentToRoom(event.room);
        break;
      case 'room_finished':
        await this.removeAgentFromRoom(event.room);
        break;
      case 'participant_joined':
        // Scale agents if needed
        await this.checkAgentCapacity(event.room);
        break;
    }
  }

  async assignAgentToRoom(room: Room) {
    // Check if transcription is enabled for this room
    const metadata = JSON.parse(room.metadata || '{}');
    if (!metadata.transcriptionEnabled) return;

    // Check if agent already assigned
    const existingAgent = await this.registry.getAgentForRoom(room.sid);
    if (existingAgent) return;

    // Get available agent from pool
    const agent = await this.agentPool.getAvailableAgent();
    if (!agent) {
      // Queue for later assignment
      await this.registry.queueRoomForAgent(room.sid);
      return;
    }

    // Create agent token for room access
    const token = this.createAgentToken(room.sid, agent.id);

    // Dispatch agent to join room
    await agent.joinRoom({
      roomId: room.sid,
      token,
      transcriptionConfig: {
        language: metadata.language || 'en-US',
        enableDiarization: true,
        maxSpeakers: metadata.maxParticipants || 10,
        sttProvider: 'google', // or 'gemini'
      }
    });

    // Register assignment
    await this.registry.assignAgentToRoom(agent.id, room.sid);
  }

  private createAgentToken(roomId: string, agentId: string): string {
    const at = new AccessToken(
      this.config.apiKey,
      this.config.apiSecret,
      {
        identity: `agent-${agentId}`,
        name: 'Transcription Agent',
        metadata: JSON.stringify({ type: 'transcription-agent' })
      }
    );
    at.addGrant({ roomJoin: true, room: roomId });
    return at.toJwt();
  }
}
```

### 2. Transcription Agent Implementation

The agent that joins rooms and processes audio:

```typescript
// transcription-agent.ts
import { Room, RoomEvent, RemoteTrackPublication, RemoteAudioTrack } from 'livekit-client';
import { SpeechClient } from '@google-cloud/speech';
import { TranscriptBuffer } from './transcript-buffer';

export class TranscriptionAgent {
  private room: Room;
  private speechClient: SpeechClient;
  private transcriptBuffer: TranscriptBuffer;
  private audioProcessors: Map<string, AudioProcessor>;
  
  constructor(private config: AgentConfig) {
    this.speechClient = new SpeechClient();
    this.transcriptBuffer = new TranscriptBuffer();
    this.audioProcessors = new Map();
  }

  async joinRoom(options: JoinOptions) {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // Set up event handlers
    this.room.on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed.bind(this));
    this.room.on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed.bind(this));
    this.room.on(RoomEvent.ParticipantConnected, this.handleParticipantConnected.bind(this));
    this.room.on(RoomEvent.Disconnected, this.handleDisconnected.bind(this));

    // Connect to room
    await this.room.connect(this.config.livekitUrl, options.token);
    
    // Initialize STT session
    await this.initializeSTTSession(options.transcriptionConfig);
  }

  private async handleTrackSubscribed(
    track: RemoteTrackPublication,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant
  ) {
    if (track.kind !== 'audio') return;

    const audioTrack = track as RemoteAudioTrack;
    
    // Create audio processor for this participant
    const processor = new AudioProcessor({
      participantId: participant.identity,
      participantName: participant.name || participant.identity,
      sttClient: this.speechClient,
      onTranscript: (segment) => this.handleTranscriptSegment(segment)
    });

    // Start processing audio
    processor.processTrack(audioTrack);
    this.audioProcessors.set(participant.identity, processor);
  }

  private handleTranscriptSegment(segment: TranscriptSegment) {
    // Add to buffer
    this.transcriptBuffer.addSegment(segment);

    // Publish to room as data message for real-time display
    this.room.localParticipant.publishData(
      JSON.stringify({
        type: 'transcript',
        segment: {
          speaker: segment.participantName,
          text: segment.text,
          timestamp: segment.timestamp,
          confidence: segment.confidence
        }
      }),
      DataPacket_Kind.RELIABLE
    );

    // Store in database for persistence
    this.storeTranscriptSegment(segment);
  }

  private async initializeSTTSession(config: TranscriptionConfig) {
    // Configure speech recognition
    this.recognitionConfig = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: config.language,
      enableSpeakerDiarization: false, // We handle this via separate tracks
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      model: 'latest_long',
      useEnhanced: true,
    };
  }
}

// Audio processor for individual participant tracks
class AudioProcessor {
  private stream: any; // STT streaming session
  
  constructor(private config: ProcessorConfig) {
    this.initializeStream();
  }

  async processTrack(audioTrack: RemoteAudioTrack) {
    // Get audio stream from track
    const audioStream = audioTrack.getStream();
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioStream);
    
    // Create script processor for chunking
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      // Convert to format expected by STT
      const audioBytes = this.convertFloat32ToInt16(inputData);
      this.stream.write({ audioContent: audioBytes });
    };

    // Connect audio pipeline
    source.connect(processor);
    processor.connect(audioContext.destination);
  }

  private initializeStream() {
    this.stream = this.config.sttClient
      .streamingRecognize({
        config: this.config.recognitionConfig,
        interimResults: true,
      })
      .on('data', (response) => {
        const result = response.results[0];
        if (result && result.alternatives[0]) {
          this.config.onTranscript({
            participantId: this.config.participantId,
            participantName: this.config.participantName,
            text: result.alternatives[0].transcript,
            isFinal: result.isFinal,
            confidence: result.alternatives[0].confidence,
            timestamp: Date.now(),
            words: result.alternatives[0].words,
          });
        }
      })
      .on('error', (error) => {
        console.error('STT stream error:', error);
        // Reconnect logic
        this.reconnectStream();
      });
  }
}
```

### 3. Agent Pool Management

Manages a pool of agent workers:

```typescript
// agent-pool.ts
export class AgentPool {
  private agents: Map<string, AgentWorker>;
  private availableAgents: Set<string>;
  private busyAgents: Map<string, string>; // agentId -> roomId
  
  constructor(private config: PoolConfig) {
    this.agents = new Map();
    this.availableAgents = new Set();
    this.busyAgents = new Map();
    
    // Initialize pool
    this.initializePool();
  }

  private async initializePool() {
    const poolSize = this.config.minAgents || 5;
    
    for (let i = 0; i < poolSize; i++) {
      const agent = await this.createAgent();
      this.agents.set(agent.id, agent);
      this.availableAgents.add(agent.id);
    }

    // Auto-scaling monitor
    this.startAutoScaling();
  }

  async getAvailableAgent(): Promise<AgentWorker | null> {
    // Get first available agent
    const agentId = this.availableAgents.values().next().value;
    if (!agentId) {
      // Try to scale up
      if (this.agents.size < this.config.maxAgents) {
        return await this.scaleUp();
      }
      return null;
    }

    const agent = this.agents.get(agentId);
    if (agent) {
      this.availableAgents.delete(agentId);
      return agent;
    }
    return null;
  }

  private async createAgent(): Promise<AgentWorker> {
    // Create new agent worker
    const agent = new AgentWorker({
      id: generateId(),
      sttConfig: this.config.sttConfig,
      onComplete: (agentId) => this.releaseAgent(agentId),
    });

    await agent.initialize();
    return agent;
  }

  private async scaleUp(): Promise<AgentWorker | null> {
    if (this.agents.size >= this.config.maxAgents) {
      return null;
    }

    const agent = await this.createAgent();
    this.agents.set(agent.id, agent);
    return agent;
  }

  private async scaleDown() {
    // Remove idle agents beyond minimum
    if (this.availableAgents.size > this.config.minAgents) {
      const agentsToRemove = this.availableAgents.size - this.config.minAgents;
      const iterator = this.availableAgents.values();
      
      for (let i = 0; i < agentsToRemove; i++) {
        const agentId = iterator.next().value;
        const agent = this.agents.get(agentId);
        if (agent) {
          await agent.shutdown();
          this.agents.delete(agentId);
          this.availableAgents.delete(agentId);
        }
      }
    }
  }

  private startAutoScaling() {
    setInterval(async () => {
      const utilization = this.busyAgents.size / this.agents.size;
      
      if (utilization > 0.8) {
        // Scale up if high utilization
        await this.scaleUp();
      } else if (utilization < 0.3) {
        // Scale down if low utilization
        await this.scaleDown();
      }
    }, 30000); // Check every 30 seconds
  }
}
```

### 4. Agent Registry

Tracks agent assignments and room states:

```typescript
// agent-registry.ts
export class AgentRegistry {
  constructor(private redis: Redis) {}

  async assignAgentToRoom(agentId: string, roomId: string) {
    const key = `agent:${agentId}`;
    const roomKey = `room:${roomId}`;
    
    await this.redis.multi()
      .hset(key, {
        status: 'busy',
        roomId,
        assignedAt: Date.now()
      })
      .hset(roomKey, {
        agentId,
        status: 'transcribing'
      })
      .sadd('active:agents', agentId)
      .sadd('active:rooms', roomId)
      .exec();
  }

  async getAgentForRoom(roomId: string): Promise<string | null> {
    const roomData = await this.redis.hgetall(`room:${roomId}`);
    return roomData?.agentId || null;
  }

  async releaseAgent(agentId: string) {
    const agentData = await this.redis.hgetall(`agent:${agentId}`);
    if (!agentData?.roomId) return;

    await this.redis.multi()
      .del(`agent:${agentId}`)
      .hdel(`room:${agentData.roomId}`, 'agentId')
      .srem('active:agents', agentId)
      .exec();

    // Check for queued rooms
    const queuedRoom = await this.redis.lpop('queued:rooms');
    if (queuedRoom) {
      // Return room ID for immediate assignment
      return queuedRoom;
    }
  }

  async queueRoomForAgent(roomId: string) {
    await this.redis.rpush('queued:rooms', roomId);
  }

  // Monitoring methods
  async getActiveAgentCount(): Promise<number> {
    return await this.redis.scard('active:agents');
  }

  async getAgentMetrics(): Promise<AgentMetrics> {
    const activeAgents = await this.redis.smembers('active:agents');
    const metrics: AgentMetrics = {
      total: activeAgents.length,
      busy: 0,
      available: 0,
      avgSessionDuration: 0,
    };

    for (const agentId of activeAgents) {
      const agentData = await this.redis.hgetall(`agent:${agentId}`);
      if (agentData?.status === 'busy') {
        metrics.busy++;
      } else {
        metrics.available++;
      }
    }

    return metrics;
  }
}
```

### 5. Deployment Configuration

#### Docker Compose for Agent Workers

```yaml
# docker-compose.agent.yml
version: '3.8'

services:
  agent-dispatcher:
    build: 
      context: .
      dockerfile: Dockerfile.dispatcher
    environment:
      - LIVEKIT_URL=${LIVEKIT_URL}
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
      - REDIS_URL=${REDIS_URL}
      - DATABASE_URL=${DATABASE_URL}
    ports:
      - "3010:3010"
    depends_on:
      - redis
      - postgres

  agent-worker:
    build:
      context: .
      dockerfile: Dockerfile.agent
    environment:
      - LIVEKIT_URL=${LIVEKIT_URL}
      - GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/google-stt.json
      - REDIS_URL=${REDIS_URL}
      - WORKER_ID=${WORKER_ID}
    volumes:
      - ./credentials:/app/credentials:ro
    deploy:
      replicas: 5
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

#### Kubernetes Deployment

```yaml
# agent-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: transcription-agent
spec:
  replicas: 10
  selector:
    matchLabels:
      app: transcription-agent
  template:
    metadata:
      labels:
        app: transcription-agent
    spec:
      containers:
      - name: agent
        image: dialoglens/transcription-agent:latest
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        env:
        - name: LIVEKIT_URL
          valueFrom:
            secretKeyRef:
              name: livekit-config
              key: url
        - name: GOOGLE_APPLICATION_CREDENTIALS
          value: /app/credentials/google-stt.json
        volumeMounts:
        - name: google-creds
          mountPath: /app/credentials
          readOnly: true
      volumes:
      - name: google-creds
        secret:
          secretName: google-stt-credentials
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: agent-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: transcription-agent
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 6. Integration with Main Application

```typescript
// api/rooms/[roomId]/start-transcription.ts
export async function POST(req: Request) {
  const { roomId } = await req.json();
  
  // Update room metadata to enable transcription
  const roomClient = new RoomServiceClient(
    process.env.LIVEKIT_URL!,
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!
  );

  await roomClient.updateRoomMetadata(roomId, {
    transcriptionEnabled: true,
    language: 'en-US',
    maxParticipants: 10,
  });

  // Dispatcher will automatically assign agent via webhook
  
  return Response.json({ 
    success: true,
    message: 'Transcription agent will join room shortly'
  });
}
```

### 7. Monitoring and Observability

```typescript
// agent-metrics.ts
export class AgentMetricsCollector {
  private prometheus = new PrometheusClient();
  
  // Define metrics
  private metrics = {
    agentsActive: new this.prometheus.Gauge({
      name: 'dialoglens_agents_active',
      help: 'Number of active transcription agents'
    }),
    
    transcriptionLatency: new this.prometheus.Histogram({
      name: 'dialoglens_transcription_latency',
      help: 'Latency of transcription segments',
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    }),
    
    agentMemoryUsage: new this.prometheus.Gauge({
      name: 'dialoglens_agent_memory_usage',
      help: 'Memory usage per agent',
      labelNames: ['agent_id']
    }),
    
    sttApiErrors: new this.prometheus.Counter({
      name: 'dialoglens_stt_api_errors',
      help: 'STT API error count',
      labelNames: ['error_type']
    })
  };

  collectMetrics() {
    // Collect from registry
    setInterval(async () => {
      const registry = new AgentRegistry(redis);
      const metrics = await registry.getAgentMetrics();
      
      this.metrics.agentsActive.set(metrics.busy);
    }, 10000);
  }
}
```

## Key Benefits of Agent-Based Approach

1. **Real-time Processing**: Transcripts available during the conversation
2. **Lower Latency**: No need to wait for recording completion
3. **Live Features**: Enable live captions, real-time translation
4. **Scalability**: Agents can scale independently of room servers
5. **Flexibility**: Can process audio with custom logic before STT

## Migration Path from Egress

1. Deploy agent infrastructure alongside existing Egress
2. Enable agent-based transcription for select rooms
3. Compare quality and performance metrics
4. Gradually migrate all rooms to agent-based approach
5. Maintain Egress as fallback or for archival needs

---

*This architecture enables real-time transcription while maintaining the reliability and scalability required for production use.*
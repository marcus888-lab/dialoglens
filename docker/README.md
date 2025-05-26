# Docker Setup for DialogLens

This directory contains Docker configurations for running the entire DialogLens stack.

## Architecture

The Docker Compose setup includes:

1. **app** - Next.js web application
2. **redis** - Redis for job queue
3. **livekit** - LiveKit server for real-time communication
4. **transcription-agent** - Python agent for real-time transcription
5. **customer-agent** - Python agent for customer service interactions
6. **worker** - BullMQ worker for processing background jobs

## Prerequisites

1. Docker and Docker Compose installed
2. Google Cloud service account JSON file for Speech-to-Text API
3. AWS credentials for S3 storage
4. Clerk authentication keys
5. LiveKit API keys
6. OpenAI API key (for customer agent)

## Setup Instructions

1. **Copy environment file:**
   ```bash
   cp .env.docker.example .env
   ```

2. **Configure environment variables:**
   Edit `.env` and fill in all required values.

3. **Add Google Cloud credentials:**
   Place your `service-account.json` file in this docker directory.

4. **Build and start services:**
   ```bash
   docker-compose up --build
   ```

## Service URLs

- **Web App**: http://localhost:3000
- **LiveKit**: ws://localhost:7880
- **Redis**: redis://localhost:6379

## Managing Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f [service-name]

# Stop all services
docker-compose down

# Rebuild specific service
docker-compose build [service-name]

# Scale agents
docker-compose up -d --scale transcription-agent=3
```

## Agent Configuration

### Transcription Agent
- Automatically joins rooms when `requiresTranscription: true` in room metadata
- Sends real-time transcripts to the API
- Supports multiple concurrent rooms

### Customer Agent
- Joins rooms when `requiresCustomerAgent: true` in room metadata
- Uses GPT-4 for conversational AI
- Handles customer service interactions

## Development vs Production

For production:
1. Use external managed services (Redis, PostgreSQL)
2. Configure proper SSL/TLS
3. Use secrets management
4. Set up monitoring and logging
5. Configure auto-scaling

## Troubleshooting

1. **Agent not joining rooms:**
   - Check LiveKit server logs
   - Verify agent metadata in room creation
   - Ensure agents are registered with LiveKit

2. **Transcription not working:**
   - Verify Google Cloud credentials
   - Check agent logs for errors
   - Ensure audio is being published to room

3. **Database issues:**
   - SQLite file permissions
   - Volume mounting issues
   - Migration status
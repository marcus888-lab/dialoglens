# DialogLens Development Log

## Overview
This document tracks the complete development process of DialogLens, a conversation transcription system using LiveKit for recording and AI for speaker diarization.

## Development Timeline

### Phase 1: Project Setup (Completed)
**Time: 2024-01-26 15:00-16:00**

#### 1.1 Initial Project Setup
- **Action**: Created Next.js project with Bun
- **Tech Stack Selected**:
  - Next.js 14 with App Router
  - TypeScript
  - Tailwind CSS v4
  - SQLite with Prisma ORM
  - Bun as package manager

#### 1.2 Tailwind v4 Configuration
- **Issue**: Initial setup had Tailwind v4.0.0 with "Missing field negated" error
- **Solution**: Updated to Tailwind v4.1.7
- **Configuration**:
  - Removed traditional config file (zero-config approach)
  - Set up PostCSS with @tailwindcss/postcss
  - Configured theme using @theme in CSS

#### 1.3 Project Structure
```
DialogLens/
├── src/
│   ├── app/          # Next.js app router
│   ├── components/   # React components
│   ├── lib/          # Core business logic
│   ├── hooks/        # React hooks
│   └── test/         # Test setup
├── prisma/           # Database schema
├── scripts/          # Utility scripts
└── public/           # Static assets
```

### Phase 2: Database Setup (Completed)
**Branch**: `feature/database-setup`
**Time: 2024-01-26 16:00-17:00**

#### 2.1 Prisma Configuration
- **Action**: Set up Prisma with SQLite
- **Challenges**: 
  - SQLite doesn't support JSON fields → Used String type
  - SQLite doesn't support enums → Used String with comments
- **Schema Created**:
  - Organization
  - Room
  - Conversation
  - Participant
  - EgressJob
  - Transcript
  - Segment

#### 2.2 Database Utilities
- Created type definitions for pseudo-enums
- JSON serialization/deserialization helpers
- Repository pattern for Room model
- Transaction helper functions

#### 2.3 Seed Data
- Created comprehensive seed script
- Test data for all models
- Sample transcript with segments

#### 2.4 Testing
- **Tests Created**: 13 tests
- **Coverage**: Types, utilities, repository
- **Result**: All tests passing ✅

### Phase 3: LiveKit Integration (Completed)
**Branch**: `feature/livekit-integration`
**Time: 2024-01-26 17:00-18:30**

#### 3.1 LiveKit Configuration
- Environment variables setup
- S3 configuration for audio storage
- Room defaults (timeout, max participants)

#### 3.2 Core Services
- **RoomService**: Create/manage LiveKit rooms
- **EgressService**: Handle audio recordings
- **Client utilities**: Token generation, S3 upload config

#### 3.3 API Routes Created
- `POST /api/rooms` - Create room
- `GET /api/rooms` - List rooms
- `GET /api/rooms/[id]` - Get room details
- `DELETE /api/rooms/[id]` - End room
- `POST /api/rooms/[id]/token` - Generate access token
- `POST /api/conversations` - Start conversation
- `POST /api/conversations/[id]/start-recording` - Begin egress

#### 3.4 Client Integration
- Created `useLiveKit` React hook
- Handles room connection
- Manages participants
- Audio track subscriptions

#### 3.5 Testing
- **Tests Created**: 17 tests
- **Coverage**: Config, client, room service
- **Result**: All tests passing ✅

### Phase 4: Webhook Handlers (Completed)
**Branch**: `feature/webhook-handlers`
**Time: 2024-01-26 19:00-19:30**

#### 4.1 Webhook Verification
- Signature validation using LiveKit SDK
- Singleton webhook receiver
- Event parsing with error handling

#### 4.2 Event Handlers
- **Room Handler**: Started/finished events
- **Participant Handler**: Joined/left events
- **Egress Handler**: Started/updated/ended events

#### 4.3 API Route
- `POST /api/webhooks/livekit` - Process LiveKit events
- Signature verification
- Event routing to appropriate handlers

#### 4.4 Testing
- **Tests Created**: 9 tests
- **Coverage**: Verification, room handler
- **Result**: All tests passing ✅

### Phase 5: Job Queue (In Progress)
**Branch**: `feature/job-queue`
**Time: 2024-01-26 20:00-ongoing**

[To be continued...]

## Key Decisions Made

### 1. Architecture Decision: Egress vs Agent
- **Chosen**: Egress-based approach for MVP
- **Reasoning**: 
  - Simpler implementation
  - Better for compliance/archival
  - Lower complexity
  - Proven pattern

### 2. Database: SQLite vs PostgreSQL
- **Chosen**: SQLite
- **Reasoning**:
  - Simpler deployment
  - Good for MVP
  - Easy local development
  - Can migrate later if needed

### 3. Testing Strategy
- **Framework**: Vitest
- **Approach**: Test-first development
- **Coverage**: Unit tests for all services
- **Mocking**: Prisma and external services

### 4. Git Workflow
- Feature branches for each component
- Tests must pass before merging
- Automated test-and-merge script
- Clean commit history

## Challenges & Solutions

### Challenge 1: Tailwind v4 Compatibility
- **Problem**: v4.0.0 had bug with Next.js
- **Solution**: Updated to v4.1.7

### Challenge 2: SQLite Limitations
- **Problem**: No JSON or enum support
- **Solution**: String fields with helper functions

### Challenge 3: Environment Variables
- **Problem**: Prisma couldn't read .env.local
- **Solution**: Created .env file for Prisma

## Next Steps

1. Complete webhook handlers
2. Implement job queue with BullMQ
3. Integrate Google Cloud Speech-to-Text
4. Build authentication with Clerk
5. Create dashboard UI
6. Set up notifications

## Commands Reference

```bash
# Development
bun run dev           # Start dev server
bun run test         # Run tests in watch mode
bun run test:run     # Run tests once
bun run test:merge   # Test and merge branch

# Database
bun run db:generate  # Generate Prisma client
bun run db:migrate   # Run migrations
bun run db:seed      # Seed database
bun run db:studio    # Open Prisma Studio

# Build
bun run build        # Build for production
bun run start        # Start production server
```

---

*Last Updated: 2024-01-26 19:00*
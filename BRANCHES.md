# DialogLens Feature Branches Overview

## Branch Structure

### Main Branch
- `main` - Production-ready code, all features merged here after testing

### Feature Branches

#### 1. `feature/database-setup`
**Purpose**: Set up Prisma migrations and database initialization
- Create initial migrations
- Set up database connection
- Create seed data for testing
- Database utilities and helpers

#### 2. `feature/livekit-integration`
**Purpose**: Implement LiveKit SDK integration for room management
- LiveKit client setup
- Room creation and management APIs
- Participant tracking
- Egress job initiation
- LiveKit webhook configuration

#### 3. `feature/authentication`
**Purpose**: Implement Clerk authentication and authorization
- Clerk integration setup
- Protected routes
- User management
- Organization management
- RBAC implementation

#### 4. `feature/transcription-pipeline`
**Purpose**: Build the audio transcription pipeline
- Google Cloud Speech-to-Text integration
- Audio file processing
- Speaker diarization
- Transcript formatting
- Error handling for STT

#### 5. `feature/ui-dashboard`
**Purpose**: Create the main user interface
- Dashboard layout
- Room management UI
- Transcript viewer
- Search and filter functionality
- Responsive design

#### 6. `feature/webhook-handlers`
**Purpose**: Implement webhook endpoints
- LiveKit egress webhooks
- Event processing
- Error handling
- Webhook security

#### 7. `feature/job-queue`
**Purpose**: Set up BullMQ job processing
- Redis connection
- Queue workers
- Job scheduling
- Retry logic
- Job monitoring

#### 8. `feature/notification-system`
**Purpose**: Build notification system
- Email notifications
- In-app notifications
- Transcript ready alerts
- Error notifications

## Development Workflow

1. **Starting a new feature**:
   ```bash
   git checkout feature/[feature-name]
   git merge main  # Get latest changes
   ```

2. **Committing changes**:
   ```bash
   git add .
   git commit -m "feat: [description]"
   ```

3. **Merging back to main**:
   ```bash
   git checkout main
   git merge feature/[feature-name]
   ```

## Current Status

- [x] Initial setup complete
- [x] Database setup
- [x] LiveKit integration
- [x] Authentication
- [x] Transcription pipeline
- [x] UI Dashboard
- [x] Webhook handlers
- [x] Job queue
- [ ] Notification system

## Priority Order

1. Database setup (foundation)
2. LiveKit integration (core functionality)
3. Webhook handlers (process recordings)
4. Job queue (async processing)
5. Transcription pipeline (main feature)
6. Authentication (security)
7. UI Dashboard (user interface)
8. Notification system (user experience)
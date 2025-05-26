# DialogLens - AI Conversation Transcription

DialogLens is a comprehensive web application for recording, managing, and transcribing conversations with automatic speaker identification. Built with Next.js, LiveKit, and Google Cloud Speech-to-Text.

## 🚀 Features

- **Real-time Room Management** - Create and join LiveKit rooms for conversation recording
- **Automatic Transcription** - AI-powered transcription with speaker diarization
- **Speaker Identification** - Color-coded speakers with statistics
- **Search & Filter** - Find specific conversations and transcript content
- **Dashboard Interface** - Modern, responsive UI built with shadcn/ui
- **Authentication** - Secure user management with Clerk
- **Notifications** - Email and in-app notifications for events
- **Download Options** - Export transcripts in multiple formats

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS v4
- **UI Components**: shadcn/ui, Radix UI primitives
- **Authentication**: Clerk
- **Database**: SQLite with Prisma ORM
- **Real-time**: LiveKit for video/audio rooms
- **Transcription**: Google Cloud Speech-to-Text
- **File Storage**: AWS S3
- **Job Queue**: BullMQ with Redis
- **Testing**: Vitest with React Testing Library
- **Package Manager**: Bun

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Bun](https://bun.sh) (v1.2.13 or later)
- [Node.js](https://nodejs.org) (v18 or later)
- [Redis](https://redis.io) (for job queue)

You'll also need accounts and API keys for:

- [Clerk](https://clerk.com) - Authentication
- [LiveKit](https://livekit.io) - Real-time rooms
- [Google Cloud](https://cloud.google.com) - Speech-to-Text API
- [AWS](https://aws.amazon.com) - S3 for file storage

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd DialogLens
bun install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="file:./dev.db"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# LiveKit
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# Google Cloud Speech-to-Text
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1

# Redis (for job queue)
REDIS_URL=redis://localhost:6379
```

### 3. Database Setup

```bash
# Generate Prisma client
bun run db:generate

# Run database migrations
bun run db:migrate

# Seed the database (optional)
bun run db:seed
```

### 4. Start Services

You'll need to start Redis for the job queue:

```bash
# Start Redis (macOS with Homebrew)
brew services start redis

# Or with Docker
docker run -d --name redis -p 6379:6379 redis:alpine
```

### 5. Run the Application

```bash
# Development mode
bun run dev

# Or build for production
bun run build
bun run start
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 📖 Usage Guide

### Getting Started

1. **Sign Up/Sign In**
   - Visit the app and create an account through Clerk
   - You'll be automatically redirected to the dashboard

2. **Create Your First Room**
   - Go to "Rooms" in the sidebar
   - Click "Create Room"
   - Enter a room name and click "Create"

3. **Join a Room**
   - Click "Join" on any active room
   - Allow microphone/camera permissions
   - Start your conversation

4. **Recording & Transcription**
   - Recordings start automatically when participants join
   - Transcription begins after the room ends
   - You'll receive notifications when transcripts are ready

### Dashboard Features

#### Main Dashboard
- Overview statistics (conversations, transcripts, active rooms)
- Recent conversations list
- Quick action buttons

#### Conversations Page
- View all your recorded conversations
- Filter by status (Active, Processing, Completed)
- Search by conversation title or room name
- Access conversation details and transcripts

#### Rooms Page
- Manage active and past rooms
- Create new rooms for recording
- Join existing rooms
- End active rooms

#### Transcripts Page
- Browse all completed transcripts
- Search within transcript content
- Filter by recent/all transcripts
- Download transcripts in various formats

#### Transcript Detail View
- Full transcript with speaker identification
- Color-coded speakers for easy reading
- Search within specific transcripts
- Speaker statistics and speaking time
- Copy/share/download options

### Notifications

DialogLens provides notifications for:

- **Transcription Complete** - When your transcript is ready
- **Transcription Failed** - If there's an error processing
- **Room Ended** - When a recording session finishes

Notifications appear as:
- **Toast notifications** - Real-time popups during app usage
- **Notification bell** - Badge with unread count in the header
- **Email notifications** - Sent to your registered email (configurable)

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
bun run test

# Run tests once (CI mode)
bun run test:run

# Run specific test files
bun run test:run src/lib/notifications/__tests__/
```

Current test coverage:
- Database repositories: 5 tests
- LiveKit integration: 17 tests
- Webhook handlers: 9 tests
- Job queue: 15 tests
- Transcription pipeline: 10 tests
- Authentication: 18 tests
- UI dashboard: 10 tests
- Notification system: 16 tests

**Total: 100+ tests** across all features

## 🔧 Development Scripts

```bash
# Development
bun run dev              # Start development server
bun run build           # Build for production
bun run start           # Start production server
bun run lint            # Run ESLint

# Testing
bun run test            # Run tests in watch mode
bun run test:run        # Run tests once

# Database
bun run db:generate     # Generate Prisma client
bun run db:migrate      # Run database migrations
bun run db:push         # Push schema changes
bun run db:studio       # Open Prisma Studio
bun run db:seed         # Seed database with test data
```

## 📁 Project Structure

```
DialogLens/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard pages
│   │   ├── sign-in/          # Auth pages
│   │   └── layout.tsx        # Root layout
│   ├── components/           # React components
│   │   ├── layout/          # Layout components
│   │   ├── notifications/   # Notification components
│   │   └── ui/              # shadcn/ui components
│   ├── lib/                 # Core business logic
│   │   ├── auth/           # Authentication services
│   │   ├── db/             # Database utilities
│   │   ├── livekit/        # LiveKit integration
│   │   ├── notifications/  # Notification services
│   │   ├── queue/          # Job queue processors
│   │   ├── transcription/  # Speech-to-text services
│   │   └── webhooks/       # Webhook handlers
│   ├── hooks/              # React hooks
│   └── test/               # Test setup and utilities
├── prisma/                 # Database schema and migrations
├── public/                # Static assets
└── scripts/               # Utility scripts
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on push

### Docker

```dockerfile
FROM oven/bun:1.2.13
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install
COPY . .
RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Environment Variables for Production

Remember to set all required environment variables in your deployment platform:

- Database URL (use PostgreSQL for production)
- Clerk authentication keys
- LiveKit credentials
- Google Cloud service account
- AWS S3 credentials
- Redis URL

## 🔒 Security Considerations

- All API routes are protected with Clerk authentication
- Webhook endpoints verify signatures from LiveKit
- File uploads are validated and stored in S3
- Database queries use Prisma's built-in protection against SQL injection
- Environment variables are properly validated

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`bun run test:run`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [troubleshooting guide](./docs/troubleshooting.md)
2. Search existing GitHub issues
3. Create a new issue with detailed reproduction steps

## 🔮 Roadmap

- [ ] WebSocket/SSE for real-time notifications
- [ ] Advanced analytics and conversation insights
- [ ] Integration with popular meeting platforms (Zoom, Teams)
- [ ] AI-powered conversation summaries
- [ ] Multi-language support for transcription
- [ ] Custom vocabulary and terminology training
- [ ] Conversation sentiment analysis
- [ ] Export to popular formats (PDF, DOCX, etc.)

---

Built with ❤️ using [Bun](https://bun.sh), [Next.js](https://nextjs.org), and [LiveKit](https://livekit.io).
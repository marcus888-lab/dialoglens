import { PrismaClient } from '@prisma/client'
import { RoomStatus, ConversationStatus, JobStatus } from '../src/lib/db/types'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create test organization
  const org = await prisma.organization.create({
    data: {
      name: 'Test Organization',
    }
  })
  console.log('✅ Created organization:', org.name)

  // Create test user
  const user = await prisma.user.create({
    data: {
      clerkId: 'user_test_123',
      email: 'test@example.com',
      name: 'Test User',
      organizationId: org.id
    }
  })
  console.log('✅ Created user:', user.email)

  // Create test room
  const room = await prisma.room.create({
    data: {
      liveKitRoomId: 'test-room-123',
      name: 'Test Meeting Room',
      status: RoomStatus.ACTIVE,
      organizationId: org.id
    }
  })
  console.log('✅ Created room:', room.name)

  // Create test conversation
  const conversation = await prisma.conversation.create({
    data: {
      roomId: room.id,
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T11:00:00Z'),
      status: ConversationStatus.COMPLETED
    }
  })
  console.log('✅ Created conversation')

  // Create test participants
  const participant1 = await prisma.participant.create({
    data: {
      liveKitIdentity: 'participant-1',
      name: 'Alice Johnson',
      conversationId: conversation.id,
      speakerLabel: 'Speaker 1',
      joinedAt: new Date('2024-01-01T10:00:00Z'),
      leftAt: new Date('2024-01-01T11:00:00Z')
    }
  })

  const participant2 = await prisma.participant.create({
    data: {
      liveKitIdentity: 'participant-2',
      name: 'Bob Smith',
      conversationId: conversation.id,
      speakerLabel: 'Speaker 2',
      joinedAt: new Date('2024-01-01T10:05:00Z'),
      leftAt: new Date('2024-01-01T10:55:00Z')
    }
  })
  console.log('✅ Created participants')

  // Create test egress jobs
  await prisma.egressJob.create({
    data: {
      liveKitEgressId: 'egress-1',
      conversationId: conversation.id,
      participantId: participant1.id,
      status: JobStatus.COMPLETED,
      audioFileUrl: 's3://bucket/audio1.ogg',
      completedAt: new Date('2024-01-01T11:05:00Z')
    }
  })

  await prisma.egressJob.create({
    data: {
      liveKitEgressId: 'egress-2',
      conversationId: conversation.id,
      participantId: participant2.id,
      status: JobStatus.COMPLETED,
      audioFileUrl: 's3://bucket/audio2.ogg',
      completedAt: new Date('2024-01-01T11:05:00Z')
    }
  })
  console.log('✅ Created egress jobs')

  // Create test transcript
  const transcript = await prisma.transcript.create({
    data: {
      conversationId: conversation.id,
      content: JSON.stringify({
        version: '1.0',
        language: 'en-US',
        duration: 3600,
        segments: [
          {
            speakerId: participant1.id,
            speakerName: 'Alice Johnson',
            text: 'Hello everyone, welcome to our meeting today.',
            startTime: 0,
            endTime: 5,
            confidence: 0.95
          },
          {
            speakerId: participant2.id,
            speakerName: 'Bob Smith',
            text: 'Thank you Alice. I have prepared the presentation.',
            startTime: 6,
            endTime: 10,
            confidence: 0.92
          }
        ]
      }),
      rawContent: 'Hello everyone, welcome to our meeting today. Thank you Alice. I have prepared the presentation.',
      processingTime: 5000,
      wordCount: 15
    }
  })
  console.log('✅ Created transcript')

  // Create test segments
  await prisma.segment.createMany({
    data: [
      {
        transcriptId: transcript.id,
        speakerLabel: 'Speaker 1',
        text: 'Hello everyone, welcome to our meeting today.',
        startTime: 0,
        endTime: 5,
        confidence: 0.95
      },
      {
        transcriptId: transcript.id,
        speakerLabel: 'Speaker 2',
        text: 'Thank you Alice. I have prepared the presentation.',
        startTime: 6,
        endTime: 10,
        confidence: 0.92
      }
    ]
  })
  console.log('✅ Created segments')

  console.log('🎉 Database seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
import { prisma } from '@/lib/prisma'
import { RoomStatus } from '@/lib/db/types'
import { Prisma } from '@prisma/client'

export class RoomRepository {
  static async create(data: {
    liveKitRoomId: string
    name: string
    organizationId: string
  }) {
    return await prisma.room.create({
      data: {
        ...data,
        status: RoomStatus.ACTIVE
      },
      include: {
        organization: true
      }
    })
  }

  static async findById(id: string) {
    return await prisma.room.findUnique({
      where: { id },
      include: {
        organization: true,
        conversations: {
          orderBy: { startTime: 'desc' }
        }
      }
    })
  }

  static async findByLiveKitId(liveKitRoomId: string) {
    return await prisma.room.findUnique({
      where: { liveKitRoomId },
      include: {
        organization: true
      }
    })
  }

  static async findByOrganization(organizationId: string) {
    return await prisma.room.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { conversations: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  static async updateStatus(id: string, status: RoomStatus) {
    const data: Prisma.RoomUpdateInput = {
      status
    }
    
    if (status === RoomStatus.ENDED) {
      data.endedAt = new Date()
    }

    return await prisma.room.update({
      where: { id },
      data
    })
  }

  static async getActiveRooms(organizationId: string) {
    return await prisma.room.findMany({
      where: {
        organizationId,
        status: RoomStatus.ACTIVE
      }
    })
  }
}
import { prisma } from '@/lib/db/prisma'
import type { Organization, Prisma } from '@prisma/client'

export class OrganizationRepository {
  static async create(
    data: Prisma.OrganizationCreateInput
  ): Promise<Organization> {
    return prisma.organization.create({ data })
  }

  static async findById(id: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { id },
    })
  }

  static async findByClerkId(clerkId: string): Promise<Organization | null> {
    return prisma.organization.findUnique({
      where: { clerkId },
    })
  }

  static async update(
    id: string,
    data: Prisma.OrganizationUpdateInput
  ): Promise<Organization> {
    return prisma.organization.update({
      where: { id },
      data,
    })
  }

  static async delete(id: string): Promise<Organization> {
    return prisma.organization.delete({
      where: { id },
    })
  }

  static async list(
    options: {
      skip?: number
      take?: number
      orderBy?: Prisma.OrganizationOrderByWithRelationInput
    } = {}
  ): Promise<Organization[]> {
    return prisma.organization.findMany(options)
  }
}
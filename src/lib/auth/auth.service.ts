import { auth, currentUser } from '@clerk/nextjs/server'
import { OrganizationRepository } from '@/lib/db/repositories/organization.repository'
import type { Organization } from '@prisma/client'

export interface AuthUser {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
}

export class AuthService {
  static async getCurrentUser(): Promise<AuthUser | null> {
    const user = await currentUser()
    if (!user) return null

    return {
      id: user.id,
      email: user.emailAddresses?.[0]?.emailAddress || null,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
    }
  }

  static async getCurrentUserId(): Promise<string | null> {
    const { userId } = await auth()
    return userId
  }

  static async ensureAuthenticated(): Promise<string> {
    const userId = await this.getCurrentUserId()
    if (!userId) {
      throw new Error('Unauthorized')
    }
    return userId
  }

  static async getOrCreateOrganization(userId: string): Promise<Organization> {
    let organization = await OrganizationRepository.findByClerkId(userId)
    
    if (!organization) {
      const user = await currentUser()
      if (!user) {
        throw new Error('User not found')
      }

      organization = await OrganizationRepository.create({
        clerkId: userId,
        name: user.firstName && user.lastName 
          ? `${user.firstName} ${user.lastName}'s Organization`
          : `User ${userId}'s Organization`,
        settings: '{}', // SQLite doesn't support JSON type
      })
    }

    return organization
  }

  static async getUserOrganization(): Promise<Organization | null> {
    const userId = await this.getCurrentUserId()
    if (!userId) return null

    return this.getOrCreateOrganization(userId)
  }

  static async requireUserOrganization(): Promise<Organization> {
    const userId = await this.ensureAuthenticated()
    return this.getOrCreateOrganization(userId)
  }
}
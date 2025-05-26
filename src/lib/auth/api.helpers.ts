import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from './auth.service'
import type { Organization } from '@prisma/client'

export interface AuthenticatedContext {
  userId: string
  organization: Organization
}

export async function withAuth<T = any>(
  handler: (req: NextRequest, context: AuthenticatedContext) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse<T | { error: string }>> => {
    try {
      const userId = await AuthService.ensureAuthenticated()
      const organization = await AuthService.getOrCreateOrganization(userId)

      const context: AuthenticatedContext = {
        userId,
        organization,
      }

      return await handler(req, context)
    } catch (error) {
      console.error('Authentication error:', error)
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }
}

export async function withOptionalAuth<T = any>(
  handler: (req: NextRequest, context: AuthenticatedContext | null) => Promise<NextResponse<T>>
) {
  return async (req: NextRequest): Promise<NextResponse<T>> => {
    try {
      const userId = await AuthService.getCurrentUserId()
      if (!userId) {
        return await handler(req, null)
      }

      const organization = await AuthService.getOrCreateOrganization(userId)
      const context: AuthenticatedContext = {
        userId,
        organization,
      }

      return await handler(req, context)
    } catch (error) {
      console.error('Optional auth error:', error)
      return await handler(req, null)
    }
  }
}
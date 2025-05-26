import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withOptionalAuth } from '../api.helpers'
import { AuthService } from '../auth.service'

// Mock AuthService
vi.mock('../auth.service')

describe('API Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('withAuth', () => {
    it('should call handler with authenticated context', async () => {
      const mockUserId = 'user_123'
      const mockOrg = {
        id: 'org_123',
        clerkId: mockUserId,
        name: 'Test Org',
        settings: '{}',
      }

      vi.mocked(AuthService.ensureAuthenticated).mockResolvedValue(mockUserId)
      vi.mocked(AuthService.getOrCreateOrganization).mockResolvedValue(mockOrg as any)

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const wrappedHandler = await withAuth(handler)
      const req = new NextRequest('http://localhost:3000/api/test')
      const response = await wrappedHandler(req)

      expect(handler).toHaveBeenCalledWith(req, {
        userId: mockUserId,
        organization: mockOrg,
      })
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ success: true })
    })

    it('should return 401 when not authenticated', async () => {
      vi.mocked(AuthService.ensureAuthenticated).mockRejectedValue(
        new Error('Unauthorized')
      )

      const handler = vi.fn()
      const wrappedHandler = await withAuth(handler)
      const req = new NextRequest('http://localhost:3000/api/test')
      const response = await wrappedHandler(req)

      expect(handler).not.toHaveBeenCalled()
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toEqual({ error: 'Unauthorized' })
    })
  })

  describe('withOptionalAuth', () => {
    it('should call handler with authenticated context when logged in', async () => {
      const mockUserId = 'user_123'
      const mockOrg = {
        id: 'org_123',
        clerkId: mockUserId,
        name: 'Test Org',
        settings: '{}',
      }

      vi.mocked(AuthService.getCurrentUserId).mockResolvedValue(mockUserId)
      vi.mocked(AuthService.getOrCreateOrganization).mockResolvedValue(mockOrg as any)

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ success: true })
      )

      const wrappedHandler = await withOptionalAuth(handler)
      const req = new NextRequest('http://localhost:3000/api/test')
      const response = await wrappedHandler(req)

      expect(handler).toHaveBeenCalledWith(req, {
        userId: mockUserId,
        organization: mockOrg,
      })
      expect(response.status).toBe(200)
    })

    it('should call handler with null context when not logged in', async () => {
      vi.mocked(AuthService.getCurrentUserId).mockResolvedValue(null)

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ public: true })
      )

      const wrappedHandler = await withOptionalAuth(handler)
      const req = new NextRequest('http://localhost:3000/api/test')
      const response = await wrappedHandler(req)

      expect(handler).toHaveBeenCalledWith(req, null)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ public: true })
    })

    it('should handle auth errors gracefully', async () => {
      vi.mocked(AuthService.getCurrentUserId).mockRejectedValue(
        new Error('Auth service error')
      )

      const handler = vi.fn().mockResolvedValue(
        NextResponse.json({ fallback: true })
      )

      const wrappedHandler = await withOptionalAuth(handler)
      const req = new NextRequest('http://localhost:3000/api/test')
      const response = await wrappedHandler(req)

      expect(handler).toHaveBeenCalledWith(req, null)
      expect(response.status).toBe(200)
    })
  })
})
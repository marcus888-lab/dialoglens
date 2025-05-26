import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '../auth.service'
import { OrganizationRepository } from '@/lib/db/repositories/organization.repository'

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}))

// Mock repository
vi.mock('@/lib/db/repositories/organization.repository')

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentUser', () => {
    it('should return null when no user is logged in', async () => {
      const { currentUser } = await import('@clerk/nextjs/server')
      vi.mocked(currentUser).mockResolvedValue(null)

      const result = await AuthService.getCurrentUser()
      expect(result).toBeNull()
    })

    it('should return user data when logged in', async () => {
      const { currentUser } = await import('@clerk/nextjs/server')
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
        emailAddresses: [{ emailAddress: 'john@example.com' }],
        imageUrl: 'https://example.com/avatar.jpg',
      } as any)

      const result = await AuthService.getCurrentUser()
      expect(result).toEqual({
        id: 'user_123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        imageUrl: 'https://example.com/avatar.jpg',
      })
    })
  })

  describe('getCurrentUserId', () => {
    it('should return null when not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      const result = await AuthService.getCurrentUserId()
      expect(result).toBeNull()
    })

    it('should return userId when authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as any)

      const result = await AuthService.getCurrentUserId()
      expect(result).toBe('user_123')
    })
  })

  describe('ensureAuthenticated', () => {
    it('should throw error when not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      await expect(AuthService.ensureAuthenticated()).rejects.toThrow('Unauthorized')
    })

    it('should return userId when authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as any)

      const result = await AuthService.ensureAuthenticated()
      expect(result).toBe('user_123')
    })
  })

  describe('getOrCreateOrganization', () => {
    it('should return existing organization', async () => {
      const mockOrg = {
        id: 'org_123',
        clerkId: 'user_123',
        name: 'Test Org',
        settings: '{}',
      }
      vi.mocked(OrganizationRepository.findByClerkId).mockResolvedValue(mockOrg as any)

      const result = await AuthService.getOrCreateOrganization('user_123')
      expect(result).toEqual(mockOrg)
      expect(OrganizationRepository.create).not.toHaveBeenCalled()
    })

    it('should create new organization when none exists', async () => {
      const { currentUser } = await import('@clerk/nextjs/server')
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_123',
        firstName: 'John',
        lastName: 'Doe',
      } as any)
      
      vi.mocked(OrganizationRepository.findByClerkId).mockResolvedValue(null)
      
      const mockNewOrg = {
        id: 'org_new',
        clerkId: 'user_123',
        name: "John Doe's Organization",
        settings: '{}',
      }
      vi.mocked(OrganizationRepository.create).mockResolvedValue(mockNewOrg as any)

      const result = await AuthService.getOrCreateOrganization('user_123')
      expect(result).toEqual(mockNewOrg)
      expect(OrganizationRepository.create).toHaveBeenCalledWith({
        clerkId: 'user_123',
        name: "John Doe's Organization",
        settings: '{}',
      })
    })

    it('should handle user without name', async () => {
      const { currentUser } = await import('@clerk/nextjs/server')
      vi.mocked(currentUser).mockResolvedValue({
        id: 'user_123',
        firstName: null,
        lastName: null,
      } as any)
      
      vi.mocked(OrganizationRepository.findByClerkId).mockResolvedValue(null)
      
      const mockNewOrg = {
        id: 'org_new',
        clerkId: 'user_123',
        name: "User user_123's Organization",
        settings: '{}',
      }
      vi.mocked(OrganizationRepository.create).mockResolvedValue(mockNewOrg as any)

      const result = await AuthService.getOrCreateOrganization('user_123')
      expect(OrganizationRepository.create).toHaveBeenCalledWith({
        clerkId: 'user_123',
        name: "User user_123's Organization",
        settings: '{}',
      })
    })
  })

  describe('getUserOrganization', () => {
    it('should return null when not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      const result = await AuthService.getUserOrganization()
      expect(result).toBeNull()
    })

    it('should return organization when authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as any)
      
      const mockOrg = {
        id: 'org_123',
        clerkId: 'user_123',
        name: 'Test Org',
        settings: '{}',
      }
      vi.mocked(OrganizationRepository.findByClerkId).mockResolvedValue(mockOrg as any)

      const result = await AuthService.getUserOrganization()
      expect(result).toEqual(mockOrg)
    })
  })

  describe('requireUserOrganization', () => {
    it('should throw error when not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: null } as any)

      await expect(AuthService.requireUserOrganization()).rejects.toThrow('Unauthorized')
    })

    it('should return organization when authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server')
      vi.mocked(auth).mockResolvedValue({ userId: 'user_123' } as any)
      
      const mockOrg = {
        id: 'org_123',
        clerkId: 'user_123',
        name: 'Test Org',
        settings: '{}',
      }
      vi.mocked(OrganizationRepository.findByClerkId).mockResolvedValue(mockOrg as any)

      const result = await AuthService.requireUserOrganization()
      expect(result).toEqual(mockOrg)
    })
  })
})
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Clerk
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: 'test-user-123' }),
  currentUser: vi.fn().mockResolvedValue({
    id: 'test-user-123',
    emailAddresses: [{ emailAddress: 'test@example.com' }],
    firstName: 'Test',
    lastName: 'User',
  }),
}))

// Mock environment variables for tests
process.env.DATABASE_URL = 'file:./test.db'
process.env.LIVEKIT_API_KEY = 'test-api-key'
process.env.LIVEKIT_API_SECRET = 'test-api-secret'
process.env.LIVEKIT_URL = 'wss://test.livekit.cloud'
process.env.AWS_ACCESS_KEY_ID = 'test-access-key'
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key'
process.env.AWS_S3_BUCKET = 'test-bucket'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test_pk_test'
process.env.CLERK_SECRET_KEY = 'test_sk_test'
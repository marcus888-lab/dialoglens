import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DashboardLayout } from '../dashboard-layout'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/dashboard'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}))

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  UserButton: () => <div data-testid="user-button">User Button</div>,
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutDashboard: () => <div>LayoutDashboard</div>,
  MessageSquare: () => <div>MessageSquare</div>,
  Settings: () => <div>Settings</div>,
  Menu: () => <div>Menu</div>,
  X: () => <div>X</div>,
  FileText: () => <div>FileText</div>,
  Users: () => <div>Users</div>,
}))

describe('DashboardLayout', () => {
  it('should render the layout with children', () => {
    render(
      <DashboardLayout>
        <div data-testid="child-content">Test Content</div>
      </DashboardLayout>
    )
    
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('should display the app name', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )
    
    const appNames = screen.getAllByText('DialogLens')
    expect(appNames.length).toBeGreaterThan(0)
  })

  it('should render navigation items', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )
    
    // Use getAllByText since there are multiple instances (mobile and desktop)
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Conversations').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Transcripts').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Rooms').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0)
  })

  it('should render the user button', () => {
    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )
    
    expect(screen.getByTestId('user-button')).toBeInTheDocument()
  })

  it('should highlight active navigation item', async () => {
    const { usePathname } = await import('next/navigation')
    vi.mocked(usePathname).mockReturnValue('/dashboard/conversations')
    
    const { container } = render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    )
    
    const conversationsLinks = container.querySelectorAll('a[href="/dashboard/conversations"]')
    expect(conversationsLinks.length).toBeGreaterThan(0)
    conversationsLinks.forEach(link => {
      expect(link.className).toContain('bg-primary')
    })
  })
})
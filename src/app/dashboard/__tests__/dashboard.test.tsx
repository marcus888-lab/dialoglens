import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardPage from '../page'

// Mock the Card components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
}))

describe('DashboardPage', () => {
  it('should render the dashboard title', async () => {
    const Component = await DashboardPage()
    const { container } = render(Component)
    
    const title = container.querySelector('h1')
    expect(title?.textContent).toBe('Dashboard')
  })

  it('should display all stat cards', async () => {
    const Component = await DashboardPage()
    const { container } = render(Component)
    
    const cards = container.querySelectorAll('[data-testid="card"]')
    expect(cards.length).toBeGreaterThanOrEqual(4) // At least 4 stat cards
  })

  it('should show stat values', async () => {
    const Component = await DashboardPage()
    render(Component)
    
    // Check for some expected stat values
    expect(screen.getByText('24')).toBeInTheDocument() // Total conversations
    expect(screen.getByText('18')).toBeInTheDocument() // Transcripts
    expect(screen.getByText('3')).toBeInTheDocument()  // Active rooms
    expect(screen.getByText('2')).toBeInTheDocument()  // Processing jobs
  })

  it('should render recent conversations section', async () => {
    const Component = await DashboardPage()
    render(Component)
    
    expect(screen.getByText('Recent Conversations')).toBeInTheDocument()
    expect(screen.getByText('Your most recent recorded conversations')).toBeInTheDocument()
  })

  it('should render quick actions section', async () => {
    const Component = await DashboardPage()
    render(Component)
    
    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByText('Create New Room')).toBeInTheDocument()
    expect(screen.getByText('View All Transcripts')).toBeInTheDocument()
    expect(screen.getByText('Manage Settings')).toBeInTheDocument()
  })
})
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, FileText, Users, Clock } from 'lucide-react'

async function getDashboardStats() {
  // TODO: Fetch real data from database
  return {
    totalConversations: 24,
    totalTranscripts: 18,
    activeRooms: 3,
    processingJobs: 2,
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Conversations
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transcripts
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTranscripts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalConversations - stats.totalTranscripts} pending
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Rooms
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeRooms}</div>
            <p className="text-xs text-muted-foreground">
              Live conversations
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Processing
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingJobs}</div>
            <p className="text-xs text-muted-foreground">
              Jobs in queue
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>
              Your most recent recorded conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No conversations yet. Start a new room to begin recording.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full text-left p-2 hover:bg-accent rounded-lg transition-colors">
                Create New Room
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded-lg transition-colors">
                View All Transcripts
              </button>
              <button className="w-full text-left p-2 hover:bg-accent rounded-lg transition-colors">
                Manage Settings
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
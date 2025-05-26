'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Filter, MoreVertical, Eye, Download, Trash2 } from 'lucide-react'

// Mock data - replace with real API calls
const mockConversations = [
  {
    id: '1',
    title: 'Product Team Meeting',
    roomName: 'product-standup',
    startTime: '2024-01-26T10:00:00Z',
    endTime: '2024-01-26T10:30:00Z',
    duration: 1800,
    participantCount: 5,
    status: 'COMPLETED',
    hasTranscript: true,
  },
  {
    id: '2',
    title: 'Client Presentation',
    roomName: 'client-demo',
    startTime: '2024-01-26T14:00:00Z',
    endTime: '2024-01-26T15:00:00Z',
    duration: 3600,
    participantCount: 8,
    status: 'PROCESSING',
    hasTranscript: false,
  },
  {
    id: '3',
    title: 'Engineering Sync',
    roomName: 'eng-sync',
    startTime: '2024-01-26T16:00:00Z',
    endTime: null,
    duration: 0,
    participantCount: 3,
    status: 'ACTIVE',
    hasTranscript: false,
  },
]

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function getStatusBadge(status: string) {
  const variants: Record<string, { label: string; className: string }> = {
    ACTIVE: { label: 'Active', className: 'bg-green-500' },
    PROCESSING: { label: 'Processing', className: 'bg-yellow-500' },
    COMPLETED: { label: 'Completed', className: 'bg-blue-500' },
    FAILED: { label: 'Failed', className: 'bg-red-500' },
  }
  
  const variant = variants[status] || variants.COMPLETED
  return (
    <Badge className={variant.className}>
      {variant.label}
    </Badge>
  )
}

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()

  const filteredConversations = mockConversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.roomName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Conversations</h1>
        <Button onClick={() => router.push('/dashboard/rooms/new')}>
          New Conversation
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Conversations</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-[300px]"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Participants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConversations.map((conversation) => (
                <TableRow key={conversation.id}>
                  <TableCell className="font-medium">
                    {conversation.title}
                  </TableCell>
                  <TableCell>{conversation.roomName}</TableCell>
                  <TableCell>{formatDate(conversation.startTime)}</TableCell>
                  <TableCell>
                    {conversation.duration > 0
                      ? formatDuration(conversation.duration)
                      : 'In progress'}
                  </TableCell>
                  <TableCell>{conversation.participantCount}</TableCell>
                  <TableCell>{getStatusBadge(conversation.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/conversations/${conversation.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {conversation.hasTranscript && (
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download Transcript
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredConversations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No conversations found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
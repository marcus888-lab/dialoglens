'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Download, FileText, Calendar, Clock, Users } from 'lucide-react'

interface Transcript {
  id: string
  conversationId: string
  conversationTitle: string
  createdAt: string
  duration: number
  speakerCount: number
  wordCount: number
  language: string
  confidence: number
}

// Mock data - replace with real API calls
const mockTranscripts: Transcript[] = [
  {
    id: '1',
    conversationId: 'conv-1',
    conversationTitle: 'Product Team Meeting',
    createdAt: '2024-01-26T10:30:00Z',
    duration: 1800,
    speakerCount: 5,
    wordCount: 3245,
    language: 'en-US',
    confidence: 0.94,
  },
  {
    id: '2',
    conversationId: 'conv-2',
    conversationTitle: 'Client Presentation',
    createdAt: '2024-01-25T15:00:00Z',
    duration: 3600,
    speakerCount: 8,
    wordCount: 7832,
    language: 'en-US',
    confidence: 0.91,
  },
  {
    id: '3',
    conversationId: 'conv-3',
    conversationTitle: 'Engineering Sync',
    createdAt: '2024-01-24T16:30:00Z',
    duration: 2700,
    speakerCount: 3,
    wordCount: 4521,
    language: 'en-US',
    confidence: 0.96,
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
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }
  
  return date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function TranscriptsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [transcripts, setTranscripts] = useState<Transcript[]>(mockTranscripts)
  const [selectedTab, setSelectedTab] = useState('all')
  const router = useRouter()

  const filteredTranscripts = transcripts.filter(transcript =>
    transcript.conversationTitle.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const recentTranscripts = filteredTranscripts.filter(transcript => {
    const date = new Date(transcript.createdAt)
    const dayAgo = new Date()
    dayAgo.setDate(dayAgo.getDate() - 1)
    return date > dayAgo
  })

  async function downloadTranscript(transcriptId: string, format: 'txt' | 'json' | 'pdf' = 'txt') {
    try {
      const response = await fetch(`/api/transcripts/${transcriptId}/download?format=${format}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transcript-${transcriptId}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading transcript:', error)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Transcripts</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transcripts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All Transcripts</TabsTrigger>
          <TabsTrigger value="recent">Recent</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4">
            {filteredTranscripts.map((transcript) => (
              <Card 
                key={transcript.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/dashboard/transcripts/${transcript.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {transcript.conversationTitle}
                      </CardTitle>
                      <CardDescription>
                        {formatDate(transcript.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {(transcript.confidence * 100).toFixed(0)}% accuracy
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(transcript.duration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {transcript.speakerCount} speakers
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {transcript.wordCount.toLocaleString()} words
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadTranscript(transcript.id, 'txt')
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {filteredTranscripts.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  No transcripts found matching your search
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="recent" className="mt-4">
          <div className="grid gap-4">
            {recentTranscripts.map((transcript) => (
              <Card 
                key={transcript.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/dashboard/transcripts/${transcript.id}`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {transcript.conversationTitle}
                      </CardTitle>
                      <CardDescription>
                        {formatDate(transcript.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {(transcript.confidence * 100).toFixed(0)}% accuracy
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(transcript.duration)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {transcript.speakerCount} speakers
                    </div>
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {transcript.wordCount.toLocaleString()} words
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {recentTranscripts.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  No recent transcripts from the last 24 hours
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
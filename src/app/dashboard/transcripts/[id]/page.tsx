'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Download, 
  Search, 
  Clock, 
  User, 
  Volume2,
  Copy,
  Share
} from 'lucide-react'

interface Segment {
  id: string
  speakerId: string
  speakerLabel: string
  startTime: number
  endTime: number
  text: string
  confidence: number
}

interface Transcript {
  id: string
  conversationTitle: string
  createdAt: string
  duration: number
  segments: Segment[]
  speakerCount: number
  language: string
  overallConfidence: number
}

// Mock data - replace with real API call
const mockTranscript: Transcript = {
  id: '1',
  conversationTitle: 'Product Team Meeting',
  createdAt: '2024-01-26T10:30:00Z',
  duration: 1800,
  speakerCount: 3,
  language: 'en-US',
  overallConfidence: 0.94,
  segments: [
    {
      id: 'seg-1',
      speakerId: 'speaker-1',
      speakerLabel: 'Speaker 1',
      startTime: 0,
      endTime: 15,
      text: "Good morning everyone. Let's start with a quick update on the new features we're working on.",
      confidence: 0.95,
    },
    {
      id: 'seg-2',
      speakerId: 'speaker-2',
      speakerLabel: 'Speaker 2',
      startTime: 15,
      endTime: 45,
      text: "Sure, I've been working on the authentication system. We've implemented the basic login and registration flow, and I'm now working on adding OAuth support for Google and GitHub sign-in.",
      confidence: 0.93,
    },
    {
      id: 'seg-3',
      speakerId: 'speaker-3',
      speakerLabel: 'Speaker 3',
      startTime: 45,
      endTime: 70,
      text: "That sounds great. I've been focusing on the dashboard UI. The main layout is complete, and I've started implementing the data visualization components. We should have a working prototype by the end of the week.",
      confidence: 0.96,
    },
    {
      id: 'seg-4',
      speakerId: 'speaker-1',
      speakerLabel: 'Speaker 1',
      startTime: 70,
      endTime: 90,
      text: "Excellent progress. Let's make sure we coordinate on the API integration. Speaker 2, can you share the API documentation with Speaker 3?",
      confidence: 0.94,
    },
  ],
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getSpeakerColor(speakerId: string): string {
  const colors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-purple-100 text-purple-800',
    'bg-yellow-100 text-yellow-800',
    'bg-pink-100 text-pink-800',
  ]
  const index = parseInt(speakerId.split('-')[1]) % colors.length
  return colors[index]
}

export default function TranscriptDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [transcript, setTranscript] = useState<Transcript | null>(mockTranscript)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('transcript')

  const filteredSegments = transcript?.segments.filter(segment =>
    segment.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  async function copyTranscript() {
    if (!transcript) return
    const text = transcript.segments
      .map(seg => `${seg.speakerLabel} (${formatTime(seg.startTime)}): ${seg.text}`)
      .join('\n\n')
    await navigator.clipboard.writeText(text)
  }

  async function downloadTranscript(format: 'txt' | 'json' = 'txt') {
    // Implementation for downloading transcript
    console.log('Downloading transcript in format:', format)
  }

  if (!transcript) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading transcript...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/dashboard/transcripts')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{transcript.conversationTitle}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(transcript.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyTranscript}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          <Button variant="outline" size="sm">
            <Share className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button size="sm" onClick={() => downloadTranscript('txt')}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {formatTime(transcript.duration)}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Speakers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {transcript.speakerCount}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Language</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {transcript.language}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {(transcript.overallConfidence * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="speakers">Speakers</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>
          
          {selectedTab === 'transcript' && (
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[300px]"
              />
            </div>
          )}
        </div>
        
        <TabsContent value="transcript">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {(searchQuery ? filteredSegments : transcript.segments).map((segment) => (
                  <div key={segment.id} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <Badge
                        className={getSpeakerColor(segment.speakerId)}
                        variant="secondary"
                      >
                        {segment.speakerLabel}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(segment.startTime)}
                      </p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm leading-relaxed">{segment.text}</p>
                      {segment.confidence < 0.8 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Low confidence ({(segment.confidence * 100).toFixed(0)}%)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {searchQuery && filteredSegments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No results found for "{searchQuery}"
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="speakers">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from(new Set(transcript.segments.map(s => s.speakerId))).map((speakerId) => {
                  const speakerSegments = transcript.segments.filter(s => s.speakerId === speakerId)
                  const totalWords = speakerSegments.reduce((acc, seg) => acc + seg.text.split(' ').length, 0)
                  const totalTime = speakerSegments.reduce((acc, seg) => acc + (seg.endTime - seg.startTime), 0)
                  
                  return (
                    <div key={speakerId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={getSpeakerColor(speakerId)}
                          variant="secondary"
                        >
                          {speakerSegments[0].speakerLabel}
                        </Badge>
                        <div>
                          <p className="font-medium">{speakerSegments.length} segments</p>
                          <p className="text-sm text-muted-foreground">
                            {totalWords} words • {formatTime(totalTime)} speaking time
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summary">
          <Card>
            <CardContent className="p-6">
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground">
                  AI-generated summary will be available here in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Video, VideoOff, Plus } from 'lucide-react'

interface Room {
  id: string
  name: string
  liveKitRoomId: string
  status: string
  participantCount: number
  createdAt: string
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchRooms()
  }, [])

  async function fetchRooms() {
    try {
      const response = await fetch('/api/rooms')
      if (response.ok) {
        const data = await response.json()
        setRooms(data.rooms)
      }
    } catch (error) {
      console.error('Error fetching rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createRoom() {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setCreateDialogOpen(false)
        setNewRoomName('')
        router.push(`/dashboard/rooms/${data.room.id}`)
      }
    } catch (error) {
      console.error('Error creating room:', error)
    }
  }

  async function endRoom(roomId: string) {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchRooms()
      }
    } catch (error) {
      console.error('Error ending room:', error)
    }
  }

  function getStatusBadge(status: string) {
    const isActive = status === 'ACTIVE'
    return (
      <Badge className={isActive ? 'bg-green-500' : 'bg-gray-500'}>
        {isActive ? 'Active' : 'Ended'}
      </Badge>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Rooms</h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Room
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Room</DialogTitle>
              <DialogDescription>
                Create a new room for recording conversations
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Room Name
                </Label>
                <Input
                  id="name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Team Meeting"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createRoom} disabled={!newRoomName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{room.name}</CardTitle>
                {getStatusBadge(room.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  {room.participantCount} participants
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  {room.status === 'ACTIVE' ? (
                    <Video className="mr-2 h-4 w-4" />
                  ) : (
                    <VideoOff className="mr-2 h-4 w-4" />
                  )}
                  {new Date(room.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {room.status === 'ACTIVE' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => router.push(`/dashboard/rooms/${room.id}`)}
                      className="flex-1"
                    >
                      Join
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => endRoom(room.id)}
                      className="flex-1"
                    >
                      End
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/rooms/${room.id}`)}
                    className="w-full"
                  >
                    View Details
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading rooms...</p>
        </div>
      )}

      {!loading && rooms.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No rooms created yet. Create your first room to start recording conversations.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Room
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
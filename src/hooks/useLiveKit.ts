import { useEffect, useState } from 'react'
import {
  Room,
  RoomEvent,
  Participant,
  Track,
  RemoteParticipant,
  LocalParticipant,
} from 'livekit-client'

export interface UseLiveKitOptions {
  roomId: string
  token?: string
  onParticipantConnected?: (participant: RemoteParticipant) => void
  onParticipantDisconnected?: (participant: RemoteParticipant) => void
  onTrackSubscribed?: (track: Track, participant: RemoteParticipant) => void
}

export function useLiveKit(options: UseLiveKitOptions) {
  const { roomId, token, onParticipantConnected, onParticipantDisconnected, onTrackSubscribed } = options
  
  const [room, setRoom] = useState<Room | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    if (!token) return
    
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720, frameRate: 30 },
      },
      audioCaptureDefaults: {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })
    
    setRoom(room)
    
    // Set up event handlers
    room.on(RoomEvent.Connected, () => {
      setIsConnected(true)
      setParticipants([room.localParticipant, ...Array.from(room.participants.values())])
    })
    
    room.on(RoomEvent.Disconnected, () => {
      setIsConnected(false)
      setParticipants([])
    })
    
    room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      setParticipants(prev => [...prev, participant])
      onParticipantConnected?.(participant)
    })
    
    room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      setParticipants(prev => prev.filter(p => p.identity !== participant.identity))
      onParticipantDisconnected?.(participant)
    })
    
    room.on(RoomEvent.TrackSubscribed, (track: Track, _publication, participant: RemoteParticipant) => {
      onTrackSubscribed?.(track, participant)
    })
    
    room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
      // Handle track unsubscription if needed
    })
    
    // Connect to room
    const connect = async () => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || ''
        await room.connect(wsUrl, token)
      } catch (err) {
        console.error('Failed to connect to room:', err)
        setError(err as Error)
      }
    }
    
    connect()
    
    // Cleanup
    return () => {
      room.disconnect()
    }
  }, [token, onParticipantConnected, onParticipantDisconnected, onTrackSubscribed])
  
  const getAudioTracks = () => {
    if (!room) return []
    
    const tracks: Array<{ participant: Participant; track: Track }> = []
    
    participants.forEach(participant => {
      participant.audioTracks.forEach(publication => {
        if (publication.track) {
          tracks.push({
            participant,
            track: publication.track,
          })
        }
      })
    })
    
    return tracks
  }
  
  return {
    room,
    participants,
    isConnected,
    error,
    getAudioTracks,
  }
}
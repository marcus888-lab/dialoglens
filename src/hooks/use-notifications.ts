'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import type { InAppNotification } from '@/lib/notifications/notification.types'

export function useNotifications() {
  useEffect(() => {
    // Poll for new notifications
    const checkNotifications = async () => {
      try {
        const response = await fetch('/api/notifications?limit=1&unreadOnly=true')
        if (response.ok) {
          const data = await response.json()
          const latestNotification = data.notifications[0] as InAppNotification
          
          if (latestNotification && !latestNotification.read) {
            // Show toast for new notification
            showNotificationToast(latestNotification)
            
            // Mark as read after showing
            await fetch('/api/notifications/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notificationIndex: 0 }),
            })
          }
        }
      } catch (error) {
        console.error('Error checking notifications:', error)
      }
    }

    // Check immediately
    checkNotifications()

    // Then check every 30 seconds
    const interval = setInterval(checkNotifications, 30000)

    return () => clearInterval(interval)
  }, [])
}

function showNotificationToast(notification: InAppNotification) {
  const options = {
    duration: 5000,
    action: notification.metadata?.transcriptId ? {
      label: 'View',
      onClick: () => {
        window.location.href = `/dashboard/transcripts/${notification.metadata.transcriptId}`
      },
    } : undefined,
  }

  switch (notification.type) {
    case 'TRANSCRIPTION_COMPLETE':
      toast.success(notification.title, {
        description: notification.message,
        ...options,
      })
      break
    case 'TRANSCRIPTION_FAILED':
      toast.error(notification.title, {
        description: notification.message,
        duration: 10000,
      })
      break
    case 'ROOM_ENDED':
      toast.info(notification.title, {
        description: notification.message,
        ...options,
      })
      break
    default:
      toast(notification.title, {
        description: notification.message,
        ...options,
      })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { InAppNotificationService } from '@/lib/notifications/in-app.service'
import { auth } from '@clerk/nextjs/server'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { notificationIndex, markAll } = body

    if (markAll) {
      await InAppNotificationService.markAllAsRead(userId)
    } else if (typeof notificationIndex === 'number') {
      await InAppNotificationService.markAsRead(userId, notificationIndex)
    } else {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking notifications as read:', error)
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    )
  }
}
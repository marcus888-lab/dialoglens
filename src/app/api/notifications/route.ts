import { NextRequest, NextResponse } from 'next/server'
import { InAppNotificationService } from '@/lib/notifications/in-app.service'
import { auth } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const notifications = await InAppNotificationService.getNotifications(userId, {
      limit,
      unreadOnly,
    })

    const unreadCount = await InAppNotificationService.getUnreadCount(userId)

    return NextResponse.json({
      notifications,
      unreadCount,
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}
# Notification System Implementation

## Overview
This document describes the notification system implementation for DialogLens, providing both email and in-app notifications for key events.

## Features Implemented

### 1. Notification Types
- **TRANSCRIPTION_COMPLETE**: Notifies when a transcription is ready
- **TRANSCRIPTION_FAILED**: Notifies when transcription fails
- **ROOM_ENDED**: Notifies when a room ends
- **EGRESS_STARTED**: Notifies when recording starts
- **EGRESS_FAILED**: Notifies when recording fails

### 2. Email Notifications
- Mock email service for MVP (console logging)
- Ready for integration with real email providers:
  - SendGrid
  - AWS SES
  - Resend
  - Postmark
- Email templates for each notification type

### 3. In-App Notifications
- In-memory storage for MVP
- Real-time notification updates
- Unread count tracking
- Mark as read functionality
- Notification history

### 4. UI Components

#### Notification Bell (`/src/components/notifications/notification-bell.tsx`)
- Shows unread count badge
- Dropdown menu with recent notifications
- Real-time updates every 30 seconds
- Mark individual or all as read
- Icons for different notification types

#### Toast Notifications
- Uses Sonner library
- Shows real-time notifications as toasts
- Different styles for success/error/info
- Action buttons to view related content

### 5. API Endpoints

#### GET `/api/notifications`
- Fetch user notifications
- Query parameters:
  - `limit`: Number of notifications (default: 50)
  - `unreadOnly`: Filter only unread (default: false)
- Returns notifications and unread count

#### POST `/api/notifications/read`
- Mark notifications as read
- Body parameters:
  - `notificationIndex`: Mark specific notification
  - `markAll`: Mark all as read

### 6. Integration Hooks

#### `useNotifications()`
- Polls for new notifications
- Shows toast notifications for new items
- Auto-marks notifications as read after display

## Usage Examples

### Send Notifications from Job Processors

```typescript
// In transcription processor
await NotificationService.notifyTranscriptionComplete(
  organization.id,
  conversation.title,
  transcript.id
)

// In egress handler
await NotificationService.notifyRoomEnded(
  organization.id,
  room.name,
  duration
)
```

### Add Notification Bell to Layout

```tsx
import { NotificationBell } from '@/components/notifications/notification-bell'

// In your header/nav component
<NotificationBell />
```

### Enable Toast Notifications

```tsx
import { useNotifications } from '@/hooks/use-notifications'

// In your dashboard layout
export function DashboardLayout() {
  useNotifications() // Enables toast notifications
  
  return (
    // Your layout content
  )
}
```

## Testing

### Test Coverage
- Email service tests: 4 tests ✅
- In-app service tests: 12 tests ✅
- Total: 16 tests passing

### Run Tests
```bash
bun run test:run src/lib/notifications/__tests__/
```

## Future Enhancements

### 1. Database Persistence
- Store notifications in database
- Add notification preferences table
- User notification settings

### 2. Real Email Integration
- Integrate with email service provider
- HTML email templates
- Email preference management

### 3. WebSocket/SSE Support
- Real-time push notifications
- Instant updates without polling
- Better performance

### 4. Notification Preferences
- Per-notification-type preferences
- Email vs in-app preferences
- Frequency settings

### 5. Rich Notifications
- Include preview data
- Actionable notifications
- Grouped notifications

## Environment Variables Needed

For production email integration:
```env
# Email Service (choose one)
SENDGRID_API_KEY=your-api-key
AWS_SES_REGION=us-east-1
RESEND_API_KEY=your-api-key
POSTMARK_API_KEY=your-api-key

# Notification Settings
NOTIFICATION_FROM_EMAIL=noreply@dialoglens.com
NOTIFICATION_FROM_NAME=DialogLens
```

## Implementation Status
✅ Email service (mock implementation)
✅ In-app notification service
✅ Notification bell component
✅ Toast notifications with Sonner
✅ API endpoints
✅ React hooks
✅ Comprehensive tests
⏳ Database persistence (future)
⏳ Real email integration (future)
⏳ WebSocket support (future)
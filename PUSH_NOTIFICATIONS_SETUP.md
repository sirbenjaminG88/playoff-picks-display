# Push Notifications Setup Guide (Firebase Cloud Messaging)

## ✅ What's Been Completed

### Firebase Setup
- ✅ Firebase project created: "Emma Fantasy Football"
- ✅ iOS app registered with bundle ID: `app.lovable.emma.playoffs`
- ✅ GoogleService-Info.plist added to iOS project
- ✅ APNs authentication key uploaded to Firebase:
  - Key ID: `M4AWT3VY9V`
  - Team ID: `2V49GL688W`
  - File: `AuthKey_M4AWT3VY9V.p8`

### iOS App Configuration
- ✅ Installed `@capacitor-firebase/messaging@7.5.0` plugin
- ✅ Installed `firebase` npm package
- ✅ Updated `capacitor.config.ts` with FirebaseMessaging plugin config
- ✅ Initialized Firebase in `AppDelegate.swift` with `FirebaseApp.configure()`
- ✅ Created `usePushNotifications` hook that:
  - Requests user permission for notifications
  - Registers device with Firebase Cloud Messaging
  - Receives and handles FCM tokens automatically
  - Stores push tokens in the database
  - Handles incoming notifications (foreground and background)
- ✅ Integrated push notifications into the app (src/App.tsx)
- ✅ Synced Capacitor iOS project with Firebase dependencies

### Database Setup
- ✅ `push_tokens` table exists in Supabase
- ✅ Table stores FCM tokens with user_id, platform, and timestamp
- ✅ RLS policies configured for secure token management
- ✅ Tokens saved automatically when users grant permission

### Testing
- ✅ Notification permission prompt working
- ✅ FCM token generation confirmed
- ✅ Token saved to database
- ✅ Test notifications received successfully on iPhone

---

## How It Works

### Token Flow
1. User signs in to the app
2. App requests notification permission (iOS native prompt)
3. User grants permission
4. iOS registers with APNs and receives APNS token
5. Firebase exchanges APNS token for FCM token
6. `tokenReceived` listener fires in JavaScript
7. FCM token saved to `push_tokens` table in Supabase

### Notification Flow
1. Backend sends notification to Firebase Cloud Messaging API
2. Firebase routes notification to APNs with your credentials
3. APNs delivers to user's device
4. iOS displays banner notification (if app in background)
5. App handles notification (if in foreground)

---

## Sending Notifications from Backend

### Option 1: Firebase Admin SDK (Recommended)

Install the Firebase Admin SDK in your Supabase Edge Function:

```typescript
// supabase/functions/send-notifications/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Get user's FCM token from database
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId)
    .eq('platform', 'ios')

  if (!tokens || tokens.length === 0) {
    return new Response('No push tokens found', { status: 404 })
  }

  // Send notification via Firebase Cloud Messaging API
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')

  for (const { token } of tokens) {
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': \`key=\${FCM_SERVER_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: 'Picks Reminder',
          body: "Don't forget to submit your playoff picks!",
        },
        // Optional: Custom data payload
        data: {
          type: 'pick_reminder',
          week_id: 'wild-card'
        }
      }),
    })
  }

  return new Response('Notifications sent', { status: 200 })
})
```

### Option 2: Firebase REST API

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \\
  -H "Authorization: key=YOUR_FCM_SERVER_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "USER_FCM_TOKEN",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test from your backend"
    }
  }'
```

---

## Getting Your FCM Server Key

1. Go to **Firebase Console** → Your Project
2. Click the **gear icon** → **Project Settings**
3. Go to **Cloud Messaging** tab
4. Under **"Cloud Messaging API (Legacy)"**, copy the **Server Key**

**Note:** The legacy API will be deprecated in June 2024. For new projects, use Firebase Admin SDK instead.

---

## Supabase Environment Variables

Set these in your Supabase project:

```bash
# Firebase Cloud Messaging Server Key (from Firebase Console)
supabase secrets set FCM_SERVER_KEY=your_server_key_here
```

---

## Testing Notifications

### From Firebase Console (Manual Test)

1. Go to **Firebase Console** → **Engage** → **Messaging**
2. Click **"Create your first campaign"** → **"Firebase Notification messages"**
3. Enter title and message
4. Click **"Send test message"**
5. Paste an FCM token from your `push_tokens` table
6. Click **"Test"**

### From Your Backend

```bash
# Get a test token from database
supabase db query "SELECT token FROM push_tokens LIMIT 1;"

# Send test notification
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-notifications \\
  -H "Authorization: Bearer YOUR_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"user_id": "test-user-id"}'
```

---

## File Reference

### iOS Files
- **Firebase Config**: `ios/App/App/GoogleService-Info.plist`
- **App Delegate**: `ios/App/App/AppDelegate.swift` (Firebase initialization)
- **Capacitor Config**: `capacitor.config.ts` (FirebaseMessaging plugin)

### React/TypeScript Files
- **Push Hook**: `src/hooks/usePushNotifications.ts`
- **App Integration**: `src/App.tsx`

### Supabase Files
- **Database Migration**: `supabase/migrations/20251219122808_create_push_tokens_table.sql`
- **Edge Function**: `supabase/functions/send-pick-deadline-notifications/index.ts` (needs updating for FCM)

---

## Troubleshooting

### No push token in database
- ✅ Running on physical device (push notifications don't work in simulator)
- ✅ User granted notification permission
- ✅ User is signed in when permission is granted
- Check Xcode console for `[FirebaseMessaging]` logs
- Look for `✅ FCM TOKEN RECEIVED:` in logs

### Notifications not received
- Verify FCM Server Key is correct in Supabase secrets
- Check that token exists in `push_tokens` table
- Make sure app is installed via Xcode or TestFlight (not just dev build)
- For production: Ensure APNs key is uploaded to Firebase
- Check Firebase Console → Cloud Messaging → Quota to see if messages were sent

### Token not generating
- Check Xcode console for errors:
  - `APNS device token not set` = Permission not granted yet
  - `Declining request for FCM Token` = APNS token not ready
- Ensure `GoogleService-Info.plist` is in the Xcode project (not just filesystem)
- Verify bundle ID matches in:
  - Xcode project settings
  - `capacitor.config.ts` (`app.lovable.emma.playoffs`)
  - Firebase Console iOS app config

### Firebase errors
- `FirebaseApp.configure() could not find GoogleService-Info.plist`:
  - File must be added to Xcode project, not just copied to folder
  - Right-click in Xcode → Add Files → Select plist → Check "Copy items if needed" and "App" target
- `Bundle ID mismatch`:
  - Update Xcode bundle identifier to match `capacitor.config.ts`

---

## Production Checklist

Before releasing to App Store:

- [ ] APNs key uploaded to Firebase Console
- [ ] `GoogleService-Info.plist` added to Xcode project
- [ ] Bundle ID matches everywhere (Xcode, Firebase, Capacitor config)
- [ ] FCM Server Key stored in Supabase secrets
- [ ] Push Notifications capability enabled in Xcode
- [ ] Tested on physical device with production build
- [ ] Edge function deployed and tested
- [ ] Notification content reviewed for clarity
- [ ] Scheduling/cron configured for automated sends
- [ ] Analytics/logging in place to monitor delivery

---

## Next Steps

1. **Update Edge Function** to use FCM instead of direct APNs
2. **Set up automated scheduling** for pick deadline notifications
3. **Add notification handling** for when user taps notification (navigate to picks page)
4. **Implement notification preferences** (let users opt in/out of specific types)
5. **Add analytics** to track notification delivery and open rates

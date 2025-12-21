import { useEffect } from 'react';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log('[FirebaseMessaging] Not a native platform, skipping setup');
      return;
    }

    const setupPushNotifications = async () => {
      try {
        console.log('[FirebaseMessaging] Setting up push notifications...');
        console.log('[FirebaseMessaging] User ID:', user?.id);

        // Clear badge on app open
        try {
          await FirebaseMessaging.setBadgeCount({ count: 0 });
          console.log('[FirebaseMessaging] Badge cleared on app open');
        } catch (badgeError) {
          console.error('[FirebaseMessaging] Error clearing badge:', badgeError);
        }

        // Request permission to use push notifications
        const result = await FirebaseMessaging.requestPermissions();

        console.log('[FirebaseMessaging] Permission result:', result.receive);

        if (result.receive === 'granted') {
          console.log('[FirebaseMessaging] Permission granted, waiting for FCM token via listener...');
          // Don't call getToken() here - let the tokenReceived listener handle it
          // The token will arrive automatically once APNS registration completes
        } else {
          console.log('[FirebaseMessaging] Permission denied');
        }
      } catch (error) {
        console.error('[FirebaseMessaging] Error setting up notifications:', error);
      }
    };

    // Listen for token received (this fires when APNS token is ready and FCM token is generated)
    const tokenListener = FirebaseMessaging.addListener('tokenReceived', async (event) => {
      console.log('[FirebaseMessaging] ✅ FCM TOKEN RECEIVED:', event.token);

      // Save token to database
      if (user && event.token) {
        try {
          const { error } = await supabase
            .from('push_tokens')
            .upsert({
              user_id: user.id,
              token: event.token,
              platform: Capacitor.getPlatform(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'user_id,token'
            });

          if (error) {
            console.error('[FirebaseMessaging] Error saving token:', error);
          } else {
            console.log('[FirebaseMessaging] ✅ Token saved to database');
          }
        } catch (err) {
          console.error('[FirebaseMessaging] Error saving token:', err);
        }
      }
    });

    // Listen for notifications received while app is in foreground
    const notificationListener = FirebaseMessaging.addListener('notificationReceived', (event) => {
      console.log('[FirebaseMessaging] Notification received:', event.notification);
    });

    // Listen for notification actions (when user taps notification)
    const actionListener = FirebaseMessaging.addListener('notificationActionPerformed', async (event) => {
      console.log('[FirebaseMessaging] Notification action performed:', event);

      // Clear badge when user taps notification
      try {
        await FirebaseMessaging.setBadgeCount({ count: 0 });
        console.log('[FirebaseMessaging] Badge cleared on notification tap');
      } catch (error) {
        console.error('[FirebaseMessaging] Error clearing badge:', error);
      }

      // TODO: Navigate to picks page when notification is tapped
    });

    // Initialize push notifications if user is logged in
    if (user) {
      setupPushNotifications();
    }

    // Cleanup listeners on unmount
    return () => {
      tokenListener.then(listener => listener.remove());
      notificationListener.then(listener => listener.remove());
      actionListener.then(listener => listener.remove());
    };
  }, [user]);
}

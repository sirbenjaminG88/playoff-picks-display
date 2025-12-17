import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.emma.playoffs',
  appName: 'Emma Fantasy Football',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    }
  }
};

export default config;

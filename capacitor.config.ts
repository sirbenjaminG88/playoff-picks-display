import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2eefee5788904711a2bb541c24b6a97b',
  appName: 'playoff-picks-display',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 250,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    }
  }
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2eefee5788904711a2bb541c24b6a97b',
  appName: 'playoff-picks-display',
  webDir: 'dist',
  server: {
    url: 'https://2eefee57-8890-4711-a2bb-541c24b6a97b.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.emma.playoffs',
  appName: 'Emma Fantasy Football',
  webDir: 'dist',
  plugins: {
    FirebaseMessaging: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    }
  },
  ios: {
    contentInset: 'always',
    infoPlist: {
      NSCameraUsageDescription: 'This app needs access to your camera to take profile photos.',
      NSPhotoLibraryUsageDescription: 'This app needs access to your photo library to select profile photos.',
      NSPhotoLibraryAddUsageDescription: 'This app needs access to save photos to your library.'
    }
  }
};

export default config;
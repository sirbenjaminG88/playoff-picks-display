import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { supabase } from '@/integrations/supabase/client';

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_SERVER = 'emma-app';

// Biometry types matching the plugin
type BiometryType = 'touchId' | 'faceId' | 'fingerprintAuthentication' | 'faceAuthentication' | 'irisAuthentication' | 'none';

interface BiometricResult {
  success: boolean;
  error?: unknown;
  data?: unknown;
}

export function useBiometricAuth() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometryType>('none');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkBiometricAvailability();
      await checkBiometricEnabled();
      setIsLoading(false);
    };
    init();
  }, []);

  // Re-check biometric enabled status when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[useBiometricAuth] Page visible, re-checking enabled status...');
        checkBiometricEnabled();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const checkBiometricAvailability = async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[useBiometricAuth] Not on native platform');
      setBiometricAvailable(false);
      return;
    }

    try {
      console.log('[useBiometricAuth] Checking biometric availability...');
      const result = await NativeBiometric.isAvailable();
      console.log('[useBiometricAuth] Biometric result:', result);
      setBiometricAvailable(result.isAvailable);
      setBiometricType(result.biometryType || 'none');
    } catch (error) {
      console.error('[useBiometricAuth] Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const checkBiometricEnabled = async () => {
    try {
      const { value } = await Preferences.get({ key: BIOMETRIC_CREDENTIALS_KEY });
      const enabled = !!value;
      console.log('[useBiometricAuth] Biometric enabled check:', { key: BIOMETRIC_CREDENTIALS_KEY, value, enabled });
      setBiometricEnabled(enabled);
    } catch (error) {
      console.error('[useBiometricAuth] Error checking biometric enabled:', error);
      setBiometricEnabled(false);
    }
  };

  const enableBiometric = useCallback(async (email: string, password: string): Promise<BiometricResult> => {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Not on native platform' };
    }

    try {
      // Verify identity first (prompts Face ID/Touch ID)
      await NativeBiometric.verifyIdentity({
        reason: 'Enable biometric login',
        title: 'Enable Face ID/Touch ID',
      });

      // Store credentials securely in device keychain
      await NativeBiometric.setCredentials({
        username: email,
        password: password,
        server: BIOMETRIC_SERVER,
      });

      // Mark as enabled
      await Preferences.set({
        key: BIOMETRIC_CREDENTIALS_KEY,
        value: 'enabled',
      });

      setBiometricEnabled(true);
      return { success: true };
    } catch (error) {
      console.error('[useBiometricAuth] Error enabling biometric:', error);
      return { success: false, error };
    }
  }, []);

  const disableBiometric = useCallback(async (): Promise<void> => {
    try {
      if (Capacitor.isNativePlatform()) {
        await NativeBiometric.deleteCredentials({ server: BIOMETRIC_SERVER });
      }
      await Preferences.remove({ key: BIOMETRIC_CREDENTIALS_KEY });
      setBiometricEnabled(false);
    } catch (error) {
      console.error('[useBiometricAuth] Error disabling biometric:', error);
    }
  }, []);

  const loginWithBiometric = useCallback(async (): Promise<BiometricResult> => {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Not on native platform' };
    }

    try {
      // Verify identity (prompts Face ID/Touch ID)
      await NativeBiometric.verifyIdentity({
        reason: 'Log in to your account',
        title: 'Log In',
      });

      // Get stored credentials from keychain
      const credentials = await NativeBiometric.getCredentials({ server: BIOMETRIC_SERVER });

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.username,
        password: credentials.password,
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('[useBiometricAuth] Biometric login error:', error);
      return { success: false, error };
    }
  }, []);

  const getBiometricLabel = useCallback((): string => {
    switch (biometricType) {
      case 'faceId':
      case 'faceAuthentication':
        return 'Face ID';
      case 'touchId':
      case 'fingerprintAuthentication':
        return 'Touch ID';
      case 'irisAuthentication':
        return 'Iris';
      default:
        return 'Biometric';
    }
  }, [biometricType]);

  return {
    biometricAvailable,
    biometricType,
    biometricEnabled,
    isLoading,
    enableBiometric,
    disableBiometric,
    loginWithBiometric,
    getBiometricLabel,
  };
}

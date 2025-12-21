import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
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

// Dynamic import for native biometric plugin to avoid web errors
let NativeBiometric: any = null;

async function loadNativeBiometric() {
  if (Capacitor.isNativePlatform() && !NativeBiometric) {
    try {
      const module = await import('@capgo/capacitor-native-biometric');
      NativeBiometric = module.NativeBiometric;
    } catch (error) {
      console.error('Failed to load NativeBiometric:', error);
    }
  }
  return NativeBiometric;
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

  const checkBiometricAvailability = async () => {
    if (!Capacitor.isNativePlatform()) {
      setBiometricAvailable(false);
      return;
    }

    try {
      const plugin = await loadNativeBiometric();
      if (!plugin) {
        setBiometricAvailable(false);
        return;
      }

      const result = await plugin.isAvailable();
      setBiometricAvailable(result.isAvailable);
      setBiometricType(result.biometryType || 'none');
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setBiometricAvailable(false);
    }
  };

  const checkBiometricEnabled = async () => {
    try {
      const { value } = await Preferences.get({ key: BIOMETRIC_CREDENTIALS_KEY });
      setBiometricEnabled(!!value);
    } catch (error) {
      console.error('Error checking biometric enabled:', error);
      setBiometricEnabled(false);
    }
  };

  const enableBiometric = useCallback(async (email: string, password: string): Promise<BiometricResult> => {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Not on native platform' };
    }

    try {
      const plugin = await loadNativeBiometric();
      if (!plugin) {
        return { success: false, error: 'Biometric plugin not available' };
      }

      // Verify identity first (prompts Face ID/Touch ID)
      await plugin.verifyIdentity({
        reason: 'Enable biometric login',
        title: 'Enable Face ID/Touch ID',
      });

      // Store credentials securely in device keychain
      await plugin.setCredentials({
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
      console.error('Error enabling biometric:', error);
      return { success: false, error };
    }
  }, []);

  const disableBiometric = useCallback(async (): Promise<void> => {
    try {
      if (Capacitor.isNativePlatform()) {
        const plugin = await loadNativeBiometric();
        if (plugin) {
          await plugin.deleteCredentials({ server: BIOMETRIC_SERVER });
        }
      }
      await Preferences.remove({ key: BIOMETRIC_CREDENTIALS_KEY });
      setBiometricEnabled(false);
    } catch (error) {
      console.error('Error disabling biometric:', error);
    }
  }, []);

  const loginWithBiometric = useCallback(async (): Promise<BiometricResult> => {
    if (!Capacitor.isNativePlatform()) {
      return { success: false, error: 'Not on native platform' };
    }

    try {
      const plugin = await loadNativeBiometric();
      if (!plugin) {
        return { success: false, error: 'Biometric plugin not available' };
      }

      // Verify identity (prompts Face ID/Touch ID)
      await plugin.verifyIdentity({
        reason: 'Log in to your account',
        title: 'Log In',
      });

      // Get stored credentials from keychain
      const credentials = await plugin.getCredentials({ server: BIOMETRIC_SERVER });

      // Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.username,
        password: credentials.password,
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Biometric login error:', error);
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

import { ReactNode } from "react";
import { Capacitor } from "@capacitor/core";

interface SafeAreaProps {
  children: ReactNode;
  className?: string;
}

/**
 * SafeArea wrapper component that applies iOS safe area insets.
 * Only applies padding when running inside Capacitor (native iOS/Android).
 * Uses CSS env() variables for dynamic safe area values.
 * Note: Bottom padding is NOT applied here since BottomNav handles it with a dedicated spacer.
 */
export function SafeArea({ children, className = "" }: SafeAreaProps) {
  const isNative = Capacitor.isNativePlatform();

  return (
    <div
      className={className}
      style={
        isNative
          ? {
              paddingTop: "env(safe-area-inset-top)",
              paddingLeft: "env(safe-area-inset-left)",
              paddingRight: "env(safe-area-inset-right)",
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

/**
 * Hook to check if running in native Capacitor environment
 */
export function useIsNative() {
  return Capacitor.isNativePlatform();
}

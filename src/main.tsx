import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { SplashScreen } from "./components/SplashScreen";
import "./index.css";

const SPLASH_DURATION_MS = 3000;

/**
 * RootWithSplash - Shows the Lottie splash screen before mounting the main App.
 * This ensures the splash is the very first thing rendered in the React tree.
 */
const RootWithSplash = () => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen />;
  }

  return <App />;
};

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<RootWithSplash />);
}

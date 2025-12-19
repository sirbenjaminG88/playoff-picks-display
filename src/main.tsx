import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('[main.tsx] Starting app...');

const rootElement = document.getElementById("root");
if (rootElement) {
  console.log('[main.tsx] Root element found, rendering App...');
  createRoot(rootElement).render(<App />);
} else {
  console.error('[main.tsx] Root element not found!');
}
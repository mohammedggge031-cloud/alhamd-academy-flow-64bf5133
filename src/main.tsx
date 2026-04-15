import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Suppress known React 18 + Radix UI forwardRef warnings (harmless upstream issue)
const origConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("Function components cannot be given refs")) return;
  origConsoleError(...args);
};

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker only in production, outside iframes
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  const isInIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const isPreviewHost = window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");

  if (isPreviewHost || isInIframe) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
  }
}

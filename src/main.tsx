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

/**
 * Production Error Tracking via Sentry
 */
import * as Sentry from "@sentry/react";

let sentryInitialized = false;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || sentryInitialized) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.PROD ? "production" : "development",
    // Only send errors in production
    enabled: import.meta.env.PROD,
    // Sample 100% of errors, 10% of transactions
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    // Scrub sensitive data
    beforeSend(event) {
      // Remove user PII
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
    ignoreErrors: [
      // Browser noise
      "ResizeObserver loop",
      "Network request failed",
      "Load failed",
      "Failed to fetch dynamically imported module",
    ],
  });

  sentryInitialized = true;
}

export function reportError(error: unknown, context?: string) {
  if (import.meta.env.DEV) {
    console.error(`[ErrorTracking:${context ?? "unknown"}]`, error);
    return;
  }

  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, { extra: { context } });
}

export function initGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, "window.onerror");
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, "unhandledrejection");
  });
}

/**
 * Production Error Tracking
 * 
 * Lightweight error capture for production. Logs structured error data
 * that can be forwarded to any monitoring service (Sentry, LogRocket, etc.)
 * 
 * To connect Sentry: replace reportError() body with Sentry.captureException()
 */

interface ErrorReport {
  message: string;
  stack?: string;
  context?: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

const ERROR_QUEUE: ErrorReport[] = [];
const MAX_QUEUE = 50;

function buildReport(error: unknown, context?: string): ErrorReport {
  const err = error instanceof Error ? error : new Error(String(error));
  return {
    message: err.message,
    stack: err.stack?.slice(0, 1000),
    context,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
}

export function reportError(error: unknown, context?: string) {
  if (import.meta.env.DEV) {
    console.error(`[ErrorTracking:${context ?? "unknown"}]`, error);
    return;
  }

  const report = buildReport(error, context);

  if (ERROR_QUEUE.length < MAX_QUEUE) {
    ERROR_QUEUE.push(report);
  }

  // In production, this is where you'd send to Sentry/external service
  // e.g. Sentry.captureException(error, { extra: { context } });
}

export function getErrorQueue(): readonly ErrorReport[] {
  return ERROR_QUEUE;
}

export function initGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    reportError(event.error ?? event.message, "window.onerror");
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, "unhandledrejection");
  });
}

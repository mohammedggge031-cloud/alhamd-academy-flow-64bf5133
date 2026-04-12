import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type LazyModule<T extends ComponentType<any>> = {
  default: T;
};

const LAZY_IMPORT_ERROR_PATTERNS = [
  "Failed to fetch dynamically imported module",
  "Importing a module script failed",
  "Loading chunk",
  "ChunkLoadError",
];

export const isLazyImportError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return LAZY_IMPORT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

export const lazyWithRetry = <T extends ComponentType<any>>(
  importer: () => Promise<LazyModule<T>>,
  retryKey: string,
): LazyExoticComponent<T> =>
  lazy(async () => {
    const storageKey = `lazy-retry:${retryKey}`;

    try {
      const module = await importer();
      sessionStorage.removeItem(storageKey);
      return module;
    } catch (error) {
      if (isLazyImportError(error)) {
        const hasRetried = sessionStorage.getItem(storageKey) === "1";

        if (!hasRetried) {
          sessionStorage.setItem(storageKey, "1");
          window.location.reload();
          return new Promise<LazyModule<T>>(() => {});
        }

        sessionStorage.removeItem(storageKey);
      }

      throw error;
    }
  });
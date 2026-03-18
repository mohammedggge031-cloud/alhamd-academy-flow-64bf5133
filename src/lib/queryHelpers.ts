/**
 * Wraps a Supabase query promise with a timeout to prevent infinite loading.
 * If the query doesn't resolve within `ms` milliseconds, it rejects.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), ms)
    ),
  ]);
}

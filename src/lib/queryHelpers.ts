/**
 * Wraps a promise-like with a timeout to prevent infinite loading.
 */
export function withTimeout<T>(promiseLike: PromiseLike<T>, ms = 10000): Promise<T> {
  const promise = Promise.resolve(promiseLike);
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), ms)
    ),
  ]);
}

/**
 * Runs async thunks in sequential batches to stay within connection limits.
 * Batch N fully completes (connections released) before batch N+1 starts.
 */
export async function batchedPromiseAll<T>(
  thunks: (() => Promise<T>)[],
  batchSize = 4,
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < thunks.length; i += batchSize) {
    const batch = thunks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

const WINDOW_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Strict sliding-window rate limiter. Guarantees that no more than
 * `maxPerSecond` calls to `acquire()` are admitted in any 1000 ms window,
 * even under concurrent callers. Uses an internal promise chain as a mutex so
 * concurrent `acquire()` calls are serialized and cannot race past the limit.
 */
export class StrictRateLimiter {
  private readonly timestamps: number[] = [];
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly maxPerSecond: number) {
    if (!Number.isInteger(maxPerSecond) || maxPerSecond <= 0) {
      throw new Error(`StrictRateLimiter requires a positive integer, received ${maxPerSecond}`);
    }
  }

  async acquire(): Promise<void> {
    const run = this.queue.then(() => this.reserveSlot());
    // Swallow rejections on the chain so one failure doesn't break the mutex.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async reserveSlot(): Promise<void> {
    this.evictExpired();

    while (this.timestamps.length >= this.maxPerSecond) {
      const oldest = this.timestamps[0]!;
      const waitMs = WINDOW_MS - (Date.now() - oldest) + 1;
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      this.evictExpired();
    }

    this.timestamps.push(Date.now());
  }

  private evictExpired(): void {
    const cutoff = Date.now() - WINDOW_MS;
    while (this.timestamps.length > 0 && this.timestamps[0]! <= cutoff) {
      this.timestamps.shift();
    }
  }
}

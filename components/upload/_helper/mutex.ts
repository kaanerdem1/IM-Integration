/**
 * Simple Mutex/Lock implementation for preventing race conditions
 */

export class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  /**
   * Acquire the lock. If already locked, waits until released.
   */
  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  /**
   * Release the lock and process next in queue
   */
  release(): void {
    if (!this.locked) {
      console.warn('[Mutex] Attempted to release unlocked mutex');
      return;
    }

    const next = this.queue.shift();
    if (next) {
      // Next in queue gets the lock
      next();
    } else {
      // No one waiting, unlock
      this.locked = false;
    }
  }

  /**
   * Execute function with mutex lock
   */
  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

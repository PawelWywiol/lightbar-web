import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rafTimeout } from './lib/utils/rafTimeout/rafTimeout';

describe('rafTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      return setTimeout(() => cb(performance.now()), 16) as unknown as number;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
      clearTimeout(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return a cancel function', () => {
    const callback = vi.fn();
    const cancel = rafTimeout(callback, 100);
    expect(typeof cancel).toBe('function');
    cancel();
  });

  it('should call callback after timeout', async () => {
    const callback = vi.fn();
    rafTimeout(callback, 50);

    await vi.advanceTimersByTimeAsync(100);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should not call callback when cancelled', async () => {
    const callback = vi.fn();
    const cancel = rafTimeout(callback, 100);

    cancel();
    await vi.advanceTimersByTimeAsync(200);

    expect(callback).not.toHaveBeenCalled();
  });

  it('should call callback immediately when timeout is 0', async () => {
    const callback = vi.fn();
    rafTimeout(callback, 0);

    await vi.advanceTimersByTimeAsync(20);

    expect(callback).toHaveBeenCalled();
  });
});

export const rafTimeout = (callback: () => void, timeout = 0): (() => void) => {
  let rafId: number;
  let cancelled = false;
  const start = performance.now();

  const loop = (now: number) => {
    if (cancelled) return;

    if (now - start >= timeout) {
      callback();
    } else {
      rafId = requestAnimationFrame(loop);
    }
  };

  rafId = requestAnimationFrame(loop);

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
};

export interface SpaceTracker {
  isHeld: () => boolean;
  markUsed: () => void;
  destroy: () => void;
}

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || target.matches('input, textarea'));

export const createSpaceTracker = (target: typeof globalThis): SpaceTracker => {
  let held = false;
  let used = false;

  const reset = () => {
    held = false;
    used = false;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space' && !isTyping(event.target)) held = true;
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (event.code !== 'Space') return;
    if (used) event.preventDefault();
    reset();
  };

  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', reset);

  return {
    isHeld: () => held,
    markUsed: () => {
      used = held;
    },
    destroy: () => {
      target.removeEventListener('keydown', onKeyDown);
      target.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('blur', reset);
    },
  };
};

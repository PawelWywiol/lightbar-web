import { afterEach, describe, expect, it } from 'vitest';
import type { SpaceTracker } from './schemeGrid.space';
import { createSpaceTracker } from './schemeGrid.space';

const trackers: SpaceTracker[] = [];

const setup = () => {
  const tracker = createSpaceTracker(globalThis);
  trackers.push(tracker);
  return tracker;
};

const press = (type: 'keydown' | 'keyup', target: EventTarget = window, code = 'Space') => {
  const event = new KeyboardEvent(type, { bubbles: true, cancelable: true, code });
  target.dispatchEvent(event);
  return event;
};

afterEach(() => {
  for (const tracker of trackers.splice(0)) tracker.destroy();
});

describe('createSpaceTracker', () => {
  it('holds Space between keydown and keyup', () => {
    const tracker = setup();
    press('keydown', window, 'KeyA');
    expect(tracker.isHeld()).toBe(false);
    press('keydown');
    expect(tracker.isHeld()).toBe(true);
    press('keyup', window, 'KeyA');
    expect(tracker.isHeld()).toBe(true);
    press('keyup');
    expect(tracker.isHeld()).toBe(false);
  });

  it('ignores Space typed into a text field', () => {
    const tracker = setup();
    const input = document.createElement('input');
    document.body.append(input);
    press('keydown', input);
    input.remove();
    expect(tracker.isHeld()).toBe(false);
  });

  it('blocks the Space keyup only after it was used', () => {
    const tracker = setup();
    tracker.markUsed();
    press('keydown');
    expect(press('keyup').defaultPrevented).toBe(false);
    press('keydown');
    tracker.markUsed();
    expect(press('keyup').defaultPrevented).toBe(true);
    press('keydown');
    expect(press('keyup').defaultPrevented).toBe(false);
  });

  it('resets on window blur', () => {
    const tracker = setup();
    press('keydown');
    tracker.markUsed();
    window.dispatchEvent(new Event('blur'));
    expect(tracker.isHeld()).toBe(false);
    expect(press('keyup').defaultPrevented).toBe(false);
  });

  it('stops listening on destroy', () => {
    const tracker = setup();
    tracker.destroy();
    press('keydown');
    expect(tracker.isHeld()).toBe(false);
  });
});

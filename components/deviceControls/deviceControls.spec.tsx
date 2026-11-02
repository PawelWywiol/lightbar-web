import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import { useConnectedDevices } from '../../lib/devices/devicesProvider';
import type { LightColor } from '../../lib/lights/lights.types';
import { saveLastSentScheme } from '../../lib/schemes/schemesStorage';
import { DeviceControls } from './deviceControls';

interface FakeCarousel {
  options: { startIndex: number; loop: boolean; dragFree: boolean };
  selected: number;
  handlers: Set<() => void>;
  scrollTo: (index: number, jump?: boolean) => void;
}

const carousels: FakeCarousel[] = [];

vi.mock('embla-carousel-react', async () => {
  const { useState } = await import('react');

  const useFakeCarousel = (options: FakeCarousel['options']) => {
    const [api] = useState(() => {
      const carousel: FakeCarousel = {
        options,
        selected: options.startIndex,
        handlers: new Set(),
        scrollTo: (index) => {
          carousel.selected = index;
          for (const handler of carousel.handlers) handler();
        },
      };
      carousels.push(carousel);

      return {
        carousel,
        selectedScrollSnap: () => carousel.selected,
        scrollTo: vi.fn((index: number, jump?: boolean) => carousel.scrollTo(index, jump)),
        on: (_name: string, handler: () => void) => carousel.handlers.add(handler),
        off: (_name: string, handler: () => void) => carousel.handlers.delete(handler),
      };
    });

    return [vi.fn(), api];
  };

  return { default: useFakeCarousel };
});

vi.mock('../../lib/devices/devicesProvider', () => ({ useConnectedDevices: vi.fn(() => ({})) }));

const ADJUST = { brightness: 75, speed: 100, hue: 4 };

const mockDevice = (adjust?: typeof ADJUST) =>
  vi.mocked(useConnectedDevices).mockReturnValue({
    selectedDevice: { url: 'a', info: { type: 'info', data: { uid: 'a', leds: 86, network: 1, adjust } } },
  } as unknown as ReturnType<typeof useConnectedDevices>);

const listen = (name: string) => {
  const listener = vi.fn();
  document.addEventListener(name, listener);
  return {
    detail: () => (listener.mock.lastCall as [CustomEvent] | undefined)?.[0]?.detail as Record<string, unknown>,
    stop: () => document.removeEventListener(name, listener),
    listener,
  };
};

const saveScheme = (uid: string, name: string) =>
  saveLastSentScheme({
    uid,
    scheme: {
      name,
      frames: [{ type: 0, shuffle: false, hueShift: 0, pixelShift: 0, tempo: 60, colors: [1, 2] as LightColor[] }],
    },
  });

const carouselStartingAt = (startIndex: number) =>
  carousels.find(({ options }) => options.startIndex === startIndex) as FakeCarousel;

describe('DeviceControls', () => {
  beforeEach(() => {
    localStorage.clear();
    carousels.length = 0;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.mocked(useConnectedDevices).mockReturnValue({} as ReturnType<typeof useConnectedDevices>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing without a responding device', () => {
    const { container } = render(<DeviceControls />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the last scheme with current settings', () => {
    mockDevice(ADJUST);
    saveScheme('a', 'Aurora');
    render(<DeviceControls />);

    expect(screen.getByRole('heading', { name: 'Aurora' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: MESSAGES.control.brightness })).toHaveAttribute('aria-valuetext', '75%');
    expect(screen.getByRole('button', { name: 'x1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('slider', { name: MESSAGES.control.hue })).toHaveAttribute('aria-valuetext', '+4');
  });

  it('uses a bounded drag free brightness and a looping drag free color shift', () => {
    mockDevice(ADJUST);
    render(<DeviceControls />);

    expect(carouselStartingAt(75).options).toMatchObject({ loop: false, dragFree: true });
    expect(carouselStartingAt(36).options).toMatchObject({ loop: true, dragFree: true });
  });

  it('sends brightness as the carousel moves', () => {
    mockDevice(ADJUST);
    const events = listen('app:update:adjust');
    render(<DeviceControls />);

    act(() => carouselStartingAt(75).scrollTo(40));

    expect(events.detail()).toEqual({ ...ADJUST, brightness: 40 });
    expect(screen.getByRole('slider', { name: MESSAGES.control.brightness })).toHaveAttribute('aria-valuetext', '40%');
    events.stop();
  });

  it('maps the color carousel to -32..+31 with red at zero', () => {
    mockDevice({ ...ADJUST, hue: 0 });
    const events = listen('app:update:adjust');
    render(<DeviceControls />);

    expect(screen.getByRole('slider', { name: MESSAGES.control.hue })).toHaveAttribute('aria-valuetext', '0');

    act(() => carouselStartingAt(32).scrollTo(0));
    expect(events.detail()).toMatchObject({ hue: -32 });

    act(() => carouselStartingAt(32).scrollTo(63));
    expect(events.detail()).toMatchObject({ hue: 31 });
    events.stop();
  });

  it('does not send when the selected value stays the same', () => {
    mockDevice(ADJUST);
    const events = listen('app:update:adjust');
    render(<DeviceControls />);

    act(() => carouselStartingAt(75).scrollTo(75));

    expect(events.listener).not.toHaveBeenCalled();
    events.stop();
  });

  it('changes values with arrow keys, clamping brightness and wrapping color shift', () => {
    mockDevice({ brightness: 100, speed: 100, hue: 31 });
    const events = listen('app:update:adjust');
    render(<DeviceControls />);

    fireEvent.keyDown(screen.getByRole('slider', { name: MESSAGES.control.brightness }), { key: 'ArrowRight' });
    expect(events.listener).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('slider', { name: MESSAGES.control.hue }), { key: 'ArrowRight' });
    expect(events.detail()).toMatchObject({ hue: -32 });
    events.stop();
  });

  it.each([
    ['x0.25', { ...ADJUST, speed: 25 }],
    ['x2', { ...ADJUST, speed: 200 }],
    [MESSAGES.control.reset, { ...ADJUST, hue: 0 }],
  ])('sends settings after clicking %s', (name, expected) => {
    mockDevice(ADJUST);
    const events = listen('app:update:adjust');
    render(<DeviceControls />);

    fireEvent.click(screen.getByRole('button', { name }));

    expect(events.detail()).toEqual(expected);
    events.stop();
  });

  it('moves the carousel when the value changes from outside', () => {
    mockDevice(ADJUST);
    const { rerender } = render(<DeviceControls />);
    const events = listen('app:update:adjust');

    mockDevice({ ...ADJUST, brightness: 10 });
    rerender(<DeviceControls />);

    expect(screen.getByRole('slider', { name: MESSAGES.control.brightness })).toHaveAttribute('aria-valuetext', '10%');
    expect(events.listener).not.toHaveBeenCalled();
    events.stop();
  });

  it('hides settings for firmware without them but keeps colors', () => {
    mockDevice();
    render(<DeviceControls />);

    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByRole('button', { name: 'x1' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: MESSAGES.control.color }));

    expect(screen.getByRole('button', { name: `${MESSAGES.control.color} 1` })).toBeTruthy();
  });

  it('sets a single color and clears color shift', () => {
    mockDevice(ADJUST);
    const events = listen('app:save:scheme');
    render(<DeviceControls />);

    fireEvent.click(screen.getByRole('button', { name: MESSAGES.control.color }));
    fireEvent.click(screen.getByRole('button', { name: `${MESSAGES.control.color} 1` }));

    expect(events.detail()).toMatchObject({
      uid: 'color-192',
      adjust: { ...ADJUST, hue: 0 },
      scheme: { name: MESSAGES.control.color, frames: [{ colors: [192] }] },
    });
    events.stop();
  });

  it('offers every palette hue and white on a looping strip', () => {
    mockDevice(ADJUST);
    saveScheme('color-255', MESSAGES.control.color);
    render(<DeviceControls />);

    expect(screen.getByRole('button', { name: `${MESSAGES.control.color} 64` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('color-strip').firstElementChild?.children).toHaveLength(64);
    expect(carouselStartingAt(63).options).toMatchObject({ loop: true, dragFree: true });
  });

  it('switches to the scheme tab when a scheme is sent from the color tab', () => {
    mockDevice(ADJUST);
    render(<DeviceControls />);

    fireEvent.click(screen.getByRole('button', { name: MESSAGES.control.color }));
    expect(screen.queryByRole('slider', { name: MESSAGES.control.hue })).toBeNull();

    fireEvent(
      document,
      new CustomEvent('app:save:scheme', {
        detail: {
          uid: 'b',
          scheme: {
            name: 'Fire',
            frames: [{ type: 0, shuffle: false, hueShift: 0, pixelShift: 0, tempo: 60, colors: [1] }],
          },
        },
      }),
    );

    expect(screen.getByRole('slider', { name: MESSAGES.control.hue })).toBeTruthy();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import { useConnectedDevices } from '../../lib/devices/devicesProvider';
import type { LightColor } from '../../lib/lights/lights.types';
import { saveLastSentScheme } from '../../lib/schemes/schemesStorage';
import { DeviceControls } from './deviceControls';

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

describe('DeviceControls', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('shows the last scheme with current settings marked', () => {
    mockDevice(ADJUST);
    saveScheme('a', 'Aurora');
    render(<DeviceControls />);

    expect(screen.getByRole('heading', { name: 'Aurora' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '75%' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'x1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('slider', { name: MESSAGES.control.hue })).toHaveValue('4');
  });

  it.each([
    ['0%', { ...ADJUST, brightness: 0 }],
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

  it('sends color shift only after releasing the slider', () => {
    mockDevice(ADJUST);
    const events = listen('app:update:adjust');
    render(<DeviceControls />);
    const slider = screen.getByRole('slider', { name: MESSAGES.control.hue });

    fireEvent.change(slider, { target: { value: '-32' } });
    expect(events.listener).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent('-32');

    fireEvent.pointerUp(slider);
    expect(events.detail()).toEqual({ ...ADJUST, hue: -32 });
    events.stop();
  });

  it('hides settings for firmware without them but keeps colors', () => {
    mockDevice();
    render(<DeviceControls />);

    expect(screen.queryByRole('group', { name: MESSAGES.control.brightness })).toBeNull();

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

  it('offers every palette hue and white on the strip, without duplicates for assistive tech', () => {
    mockDevice(ADJUST);
    saveScheme('color-255', MESSAGES.control.color);
    render(<DeviceControls />);

    expect(screen.getByRole('button', { name: `${MESSAGES.control.color} 64` })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.queryByRole('button', { name: `${MESSAGES.control.color} 65` })).toBeNull();
    expect(screen.getByTestId('color-strip').children).toHaveLength(64 * 3);
  });

  it('wraps the strip around when scrolled past a copy', () => {
    mockDevice(ADJUST);
    saveScheme('color-192', MESSAGES.control.color);
    render(<DeviceControls />);
    const strip = screen.getByTestId('color-strip');
    Object.defineProperty(strip, 'scrollWidth', { value: 3000 });

    strip.scrollLeft = 100;
    fireEvent.scroll(strip);
    expect(strip.scrollLeft).toBe(1100);

    strip.scrollLeft = 1600;
    fireEvent.scroll(strip);
    expect(strip.scrollLeft).toBe(600);
  });

  it('scrolls the strip by mouse drag without picking a color', () => {
    mockDevice(ADJUST);
    saveScheme('color-192', MESSAGES.control.color);
    const events = listen('app:save:scheme');
    render(<DeviceControls />);
    const strip = screen.getByTestId('color-strip');
    strip.setPointerCapture = vi.fn();
    Object.defineProperty(strip, 'scrollWidth', { value: 3000 });
    const color = screen.getByRole('button', { name: `${MESSAGES.control.color} 2` });
    strip.scrollLeft = 1200;

    fireEvent.pointerDown(color, { pointerType: 'mouse', button: 0, clientX: 300 });
    fireEvent.pointerMove(color, { pointerType: 'mouse', clientX: 250 });
    expect(strip.scrollLeft).toBe(1250);

    fireEvent.pointerUp(color, { pointerType: 'mouse', clientX: 250 });
    fireEvent.click(color);
    expect(events.listener).not.toHaveBeenCalled();

    fireEvent.pointerDown(color, { pointerType: 'mouse', button: 0, clientX: 250 });
    fireEvent.pointerUp(color, { pointerType: 'mouse', clientX: 250 });
    fireEvent.click(color);
    expect(events.listener).toHaveBeenCalledOnce();
    events.stop();
  });

  it('switches to the scheme tab when a scheme is sent from the color tab', () => {
    mockDevice(ADJUST);
    render(<DeviceControls />);

    fireEvent.click(screen.getByRole('button', { name: MESSAGES.control.color }));
    expect(screen.queryByRole('slider')).toBeNull();

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

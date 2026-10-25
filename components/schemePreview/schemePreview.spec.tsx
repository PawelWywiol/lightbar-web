import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import type { LightColor, LightsFrame } from '../../lib/lights/lights.types';
import { resolveBinaryColorStyle } from '../editor/editor.utils';
import { SchemePreview } from './schemePreview';

const frame = (colors: number[]): LightsFrame => ({
  type: 0,
  shuffle: false,
  hueShift: 0,
  pixelShift: 0,
  tempo: 60,
  colors: colors as LightColor[],
});

const mockContext = () => {
  const painted: string[] = [];
  const context = {
    fillStyle: '',
    globalAlpha: 1,
    fillRect: vi.fn(() => painted.push(context.fillStyle)),
    drawImage: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
  return painted;
};

describe('SchemePreview', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fits as many dots as the width allows and repeats the frame like the device', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(110);
    const painted = mockContext();
    render(<SchemePreview frames={[frame([1, 2])]} pitch={20} />);

    const canvas = screen.getByRole('img', { name: MESSAGES.scheme.preview }) as HTMLCanvasElement;
    expect(canvas.width).toBe(5);
    expect(canvas.style.width).toBe('100px');
    await waitFor(() => expect(painted.length).toBeGreaterThanOrEqual(5));
    expect(painted.slice(0, 5)).toEqual([1, 2, 1, 2, 1].map((color) => resolveBinaryColorStyle(color as LightColor)));
  });

  it('samples the whole frame when it is longer than the preview', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(40);
    const painted = mockContext();
    render(<SchemePreview frames={[frame([1, 2, 3, 4, 5])]} pitch={20} />);

    expect((screen.getByRole('img') as HTMLCanvasElement).width).toBe(2);
    await waitFor(() => expect(painted.length).toBeGreaterThanOrEqual(2));
    expect(painted.slice(0, 2)).toEqual([1, 3].map((color) => resolveBinaryColorStyle(color as LightColor)));
  });
});

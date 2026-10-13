import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import { ConnectedDevicesProvider } from '../../lib/devices/devicesProvider';
import type { LightColor } from '../../lib/lights/lights.types';
import { DeviceStatusCard, LastSentCard } from './deviceStatus';

describe('DeviceStatusCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the empty state and opens devices dialog', () => {
    render(
      <ConnectedDevicesProvider>
        <DeviceStatusCard />
      </ConnectedDevicesProvider>,
    );
    const card = screen.getByRole('button', { name: MESSAGES.device.manage });

    expect(card).toHaveTextContent(MESSAGES.device.none);
    expect(card).toHaveTextContent(MESSAGES.device.add);

    fireEvent.click(card);

    expect(screen.getByRole('dialog', { name: MESSAGES.device.dialogHeader })).toBeVisible();
  });
});

describe('LastSentCard', () => {
  it('shows the last sent scheme name with preview', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(
      <LastSentCard
        schemeData={{
          uid: 'a',
          updatedAt: '',
          scheme: {
            name: 'Aurora',
            frames: [{ type: 0, shuffle: false, hueShift: 0, pixelShift: 0, tempo: 60, colors: [1] as LightColor[] }],
          },
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Aurora' })).toBeTruthy();
    expect(screen.getByText(MESSAGES.schemes.lastSent)).toBeTruthy();
    expect(screen.getByRole('img', { name: MESSAGES.scheme.preview })).toBeTruthy();
  });
});

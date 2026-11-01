import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import { ConnectedDevicesProvider } from '../../lib/devices/devicesProvider';
import { DeviceStatusCard } from './deviceStatus';

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

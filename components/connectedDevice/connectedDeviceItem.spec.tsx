import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import { openDeviceBridge } from '../../lib/devices/devicesBridge';
import { ConnectedDeviceItem } from './connectedDeviceItem';

vi.mock('../../lib/devices/devicesBridge', () => ({ openDeviceBridge: vi.fn() }));

const renderItem = (status: 'CLOSED' | 'CONNECTED', onSelect = vi.fn()) => {
  render(
    <ConnectedDeviceItem
      device={{ url: '192.168.0.30', status }}
      isSelected={false}
      onSelect={onSelect}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  return onSelect;
};

describe('ConnectedDeviceItem', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('hides device page connect button when connected', () => {
    renderItem('CONNECTED');

    expect(screen.queryByText(MESSAGES.device.connectViaDevicePage)).toBeNull();
  });

  it('selects device after bridge opens', async () => {
    vi.mocked(openDeviceBridge).mockResolvedValue(true);
    const onSelect = renderItem('CLOSED');

    fireEvent.click(screen.getByText(MESSAGES.device.connectViaDevicePage));

    expect(openDeviceBridge).toHaveBeenCalledWith('192.168.0.30');
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith('192.168.0.30'));
  });

  it('does not select device when bridge fails', async () => {
    vi.mocked(openDeviceBridge).mockResolvedValue(false);
    const onSelect = renderItem('CLOSED');

    fireEvent.click(screen.getByText(MESSAGES.device.connectViaDevicePage));

    await waitFor(() => expect(openDeviceBridge).toHaveBeenCalled());
    expect(onSelect).not.toHaveBeenCalled();
  });
});

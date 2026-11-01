import { ChevronRightIcon, PlusIcon } from 'lucide-react';
import type { ConnectionType } from '../../lib/connections/connections.types';
import { useConnectedDevices } from '../../lib/devices/devicesProvider';
import { useMessages } from '../../lib/i18n/i18n';
import { cn } from '../../lib/ui/utils/cn';
import { getDeviceLabel, getDeviceStatusMessage } from '../connectedDevice/connectedDeviceInfo';
import { ConnectedDevicesDialog } from '../connectedDevice/connectedDevicesDialog';

const STATUS_CLASS_NAME: Record<ConnectionType, string> = {
  CONNECTED: 'text-success',
  CONNECTING: 'text-warning',
  PROCESSING: 'text-warning',
  CLOSED: 'text-error',
};

export const DeviceStatusCard = () => {
  const messages = useMessages();
  const { selectedDevice } = useConnectedDevices();
  const leds = selectedDevice?.info?.data.leds;

  return (
    <ConnectedDevicesDialog
      trigger={
        <button
          type="button"
          aria-label={messages.device.manage}
          className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-white/5 px-3.5 py-3 text-left hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-linear-135 from-primary to-glow text-13 font-extrabold text-white">
            {leds ?? <PlusIcon className="h-4 w-4" />}
          </span>
          <span className="flex min-w-0 flex-1 flex-col text-13 leading-tight">
            <span className="truncate text-sm font-bold">
              {selectedDevice ? getDeviceLabel(selectedDevice) : messages.device.none}
            </span>
            {selectedDevice ? (
              <span className="truncate">
                <span className={cn('font-semibold', STATUS_CLASS_NAME[selectedDevice.status ?? 'CLOSED'])}>
                  ● {getDeviceStatusMessage(selectedDevice, messages)}
                </span>
                {` · ${selectedDevice.url}`}
              </span>
            ) : (
              <span className="truncate text-muted-foreground">{messages.device.add}</span>
            )}
          </span>
          <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
        </button>
      }
    />
  );
};

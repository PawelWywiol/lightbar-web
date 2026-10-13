import { useMessages } from '../../lib/i18n/i18n';
import type { ConnectedDevice } from '../../lib/devices/devices.types';
import { openDeviceBridge } from '../../lib/devices/devicesBridge';
import type { ConnectedDeviceInput } from '../../lib/devices/devicesSchema';
import { Button } from '../../lib/ui/button/button';
import { DropDownMenuWrapper } from '../../lib/ui/dropdownMenu/dropdownMenu';
import { ConnectedDeviceInfo } from './connectedDeviceInfo';

interface ConnectedDeviceItemProps {
  device: ConnectedDevice;
  isSelected: boolean;
  onSelect: (url: string) => void;
  onEdit: (device: ConnectedDeviceInput) => void;
  onDelete: (device: ConnectedDevice) => void;
}

const connectViaDevicePage = async (url: string, onSelect: (url: string) => void) => {
  if (await openDeviceBridge(url)) {
    onSelect(url);
  }
};

export const ConnectedDeviceItem = ({ device, isSelected, onSelect, onEdit, onDelete }: ConnectedDeviceItemProps) => {
  const messages = useMessages();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-center items-center text-left gap-4">
        <Button
          className="flex flex-1 justify-stretch p-2 h-auto"
          variant="ghost"
          aria-pressed={isSelected}
          onClick={() => onSelect(device.url)}
        >
          <ConnectedDeviceInfo device={device} />
        </Button>
        <DropDownMenuWrapper
          options={[
            {
              label: messages.common.select,
              onClick: () => onSelect(device.url),
            },
            {
              label: messages.common.edit,
              onClick: () => onEdit(device),
            },
            {
              label: messages.common.delete,
              onClick: () => onDelete(device),
            },
          ]}
        />
      </div>
      {device.status === 'CLOSED' && (
        <Button variant="outline" onClick={() => void connectViaDevicePage(device.url, onSelect)}>
          {messages.device.connectViaDevicePage}
        </Button>
      )}
    </div>
  );
};

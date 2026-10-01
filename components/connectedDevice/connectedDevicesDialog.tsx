import { useCallback, useState } from 'react';
import { MESSAGES } from '../../lib/config/messages';
import type { ConnectedDevice } from '../../lib/devices/devices.types';
import { useConnectedDevices } from '../../lib/devices/devicesProvider';
import type { ConnectedDeviceInput } from '../../lib/devices/devicesSchema';
import { DialogWrapper } from '../../lib/ui/dialog/dialog';
import { ConnectedDeviceEditor } from './connectedDeviceEditor';
import { ConnectedDeviceItem } from './connectedDeviceItem';
import { ConnectedDevicesEmptyListInfo } from './connectedDevicesEmptyListInfo';

export const ConnectedDevicesDialog = () => {
  const { devices, updateDevice, removeDevice, findDevices, scanProgress, selectedDevice, selectDevice } =
    useConnectedDevices();

  const [deviceInfo, setDeviceInfo] = useState<ConnectedDeviceInput>({
    url: '',
    label: '',
  });

  const handleSelect = useCallback(
    (url: string) => {
      selectDevice(url);
    },
    [selectDevice],
  );

  const handleEdit = useCallback((device: ConnectedDeviceInput) => {
    setDeviceInfo(device);
  }, []);

  const handleDelete = useCallback(
    (device: ConnectedDevice) => {
      removeDevice(device.url);
    },
    [removeDevice],
  );

  return (
    <DialogWrapper trigger={<span>{MESSAGES.device.triggerDialogLabel}</span>} title={MESSAGES.device.dialogHeader}>
      <div className="flex flex-col gap-2">
        {devices.length > 0 ? (
          devices.map((device) => (
            <ConnectedDeviceItem
              key={device.url}
              device={device}
              isSelected={selectedDevice?.url === device.url}
              onSelect={handleSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <ConnectedDevicesEmptyListInfo findDevices={findDevices} scanProgress={scanProgress} />
        )}
      </div>
      <ConnectedDeviceEditor deviceInfo={deviceInfo} setDeviceInfo={setDeviceInfo} updateDevice={updateDevice} />
    </DialogWrapper>
  );
};

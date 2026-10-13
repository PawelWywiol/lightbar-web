import type { ConnectedDevice } from '../../lib/devices/devices.types';
import { type ConnectedDeviceInput, isValidDeviceUrl } from '../../lib/devices/devicesSchema';
import { useMessages } from '../../lib/i18n/i18n';
import { Button } from '../../lib/ui/button/button';
import { Input } from '../../lib/ui/input/input';

export const ConnectedDeviceEditor = ({
  deviceInfo,
  setDeviceInfo,
  updateDevice,
}: {
  deviceInfo: ConnectedDeviceInput;
  setDeviceInfo: (deviceInfo: ConnectedDeviceInput) => void;
  updateDevice: (device: ConnectedDevice) => void;
}) => {
  const messages = useMessages();
  const isUrlValid = deviceInfo.url.length === 0 || isValidDeviceUrl(deviceInfo.url);

  return (
    <div className="flex justify-center align-middle gap-2 pt-3 mt-2 border-t">
      <div className="flex flex-1 flex-col justify-stretch gap-1">
        <Input
          className={`w-full ${isUrlValid ? '' : 'border-destructive'}`}
          value={deviceInfo.url}
          onChange={(event) => setDeviceInfo({ ...deviceInfo, url: event.target.value })}
          placeholder={messages.device.urlInputPlaceholder}
        />
        {!isUrlValid && <span className="text-xs text-destructive">{messages.device.urlInvalid}</span>}
      </div>
      <div className="flex flex-1 justify-stretch">
        <Input
          className="w-full"
          value={deviceInfo.label ?? ''}
          onChange={(event) => setDeviceInfo({ ...deviceInfo, label: event.target.value })}
          placeholder={messages.device.labelInputPlaceholder}
        />
      </div>
      <div className="flex">
        <Button
          disabled={deviceInfo.url.length === 0 || !isUrlValid}
          onClick={() => {
            updateDevice(deviceInfo);
            setDeviceInfo({ url: '', label: '' });
          }}
        >
          {messages.common.save}
        </Button>
      </div>
    </div>
  );
};

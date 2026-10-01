import { useMemo } from 'react';
import { MESSAGES } from '../../lib/config/messages';
import type { ConnectedDevice } from '../../lib/devices/devices.types';
import { type ConnectedDeviceInput, validateDeviceUrl } from '../../lib/devices/devicesSchema';
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
  const urlValidation = useMemo(
    () => (deviceInfo.url.length > 0 ? validateDeviceUrl(deviceInfo.url) : { valid: true }),
    [deviceInfo.url],
  );

  return (
    <div className="flex justify-center align-middle gap-2 pt-3 mt-2 border-t">
      <div className="flex flex-1 flex-col justify-stretch gap-1">
        <Input
          className={`w-full ${!urlValidation.valid ? 'border-destructive' : ''}`}
          value={deviceInfo.url}
          onChange={(event) => setDeviceInfo({ ...deviceInfo, url: event.target.value })}
          placeholder={MESSAGES.device.urlInputPlaceholder}
        />
        {!urlValidation.valid && <span className="text-xs text-destructive">{urlValidation.error}</span>}
      </div>
      <div className="flex flex-1 justify-stretch">
        <Input
          className="w-full"
          value={deviceInfo.label ?? ''}
          onChange={(event) => setDeviceInfo({ ...deviceInfo, label: event.target.value })}
          placeholder={MESSAGES.device.labelInputPlaceholder}
        />
      </div>
      <div className="flex">
        <Button
          disabled={deviceInfo.url.length === 0 || !urlValidation.valid}
          onClick={() => {
            updateDevice(deviceInfo);
            setDeviceInfo({ url: '', label: '' });
          }}
        >
          {MESSAGES.common.save}
        </Button>
      </div>
    </div>
  );
};

import { MESSAGES } from '../../lib/config/messages';
import type { ConnectedDevice } from '../../lib/devices/devices.types';
import { connectedDeviceInfoStatus } from './connectedDeviceInfoStatus.styled';

const getDeviceLabel = (device: ConnectedDevice): string =>
  device.label?.length ? device.label : (device.info?.data.uid ?? device.url);

const getDeviceFormattedLeds = (device: ConnectedDevice): string =>
  device.info?.data.leds ? `${device.info?.data.leds} ${MESSAGES.device.leds}` : '';

const getDeviceStatusMessage = (device: ConnectedDevice): string =>
  MESSAGES.connection[(device.status?.toLocaleLowerCase() as keyof typeof MESSAGES.connection) ?? 'closed'];

export const ConnectedDeviceInfo = ({ device }: { device: ConnectedDevice }) => {
  const deviceLabel = getDeviceLabel(device);
  const formattedDeviceLeds = getDeviceFormattedLeds(device);
  const deviceStatusMessage = getDeviceStatusMessage(device);

  return (
    <div className="text-left h-10 grid grid-cols-[auto_1fr_auto] w-full gap-x-4 items-center">
      <span className={connectedDeviceInfoStatus({ status: device.status })} />
      <span className="truncate">{deviceLabel}</span>
      <span className="text-right text-xs">{formattedDeviceLeds}</span>
      <span className="text-xs truncate">{deviceStatusMessage}</span>
    </div>
  );
};

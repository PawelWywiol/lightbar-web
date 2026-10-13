import type { Messages } from '../../lib/config/messages';
import type { ConnectedDevice } from '../../lib/devices/devices.types';
import { useMessages, usePlural } from '../../lib/i18n/i18n';
import { connectedDeviceInfoStatus } from './connectedDeviceInfoStatus.styled';

export const getDeviceLabel = (device: ConnectedDevice): string =>
  device.label?.length ? device.label : (device.info?.data.uid ?? device.url);

export const getDeviceStatusMessage = (device: ConnectedDevice, messages: Messages): string =>
  messages.connection[(device.status?.toLocaleLowerCase() as keyof Messages['connection']) ?? 'closed'];

export const ConnectedDeviceInfo = ({ device }: { device: ConnectedDevice }) => {
  const deviceLabel = getDeviceLabel(device);
  const messages = useMessages();
  const formatCount = usePlural();
  const leds = device.info?.data.leds;
  const formattedDeviceLeds = leds ? formatCount(leds, messages.device.leds) : '';
  const deviceStatusMessage = getDeviceStatusMessage(device, messages);

  return (
    <div className="text-left h-10 grid grid-cols-[auto_1fr_auto] w-full gap-x-4 items-center">
      <span className={connectedDeviceInfoStatus({ status: device.status })} />
      <span className="truncate">{deviceLabel}</span>
      <span className="text-right text-xs">{formattedDeviceLeds}</span>
      <span className="text-xs truncate">{deviceStatusMessage}</span>
    </div>
  );
};

import { useMessages } from '../../lib/i18n/i18n';
import { Button } from '../../lib/ui/button/button';

export const ConnectedDevicesEmptyListInfo = ({
  findDevices,
  scanProgress,
}: {
  findDevices: () => void;
  scanProgress: number;
}) => {
  const messages = useMessages();

  return (
    <>
      <span>{messages.device.noDevicesFound}</span>
      <Button onClick={() => findDevices()} disabled={scanProgress !== 100}>
        {scanProgress === 100 ? messages.device.scanForDevices : `${messages.device.scanning} ${scanProgress}%`}
      </Button>
    </>
  );
};

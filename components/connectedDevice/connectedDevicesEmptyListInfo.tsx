import { MESSAGES } from '../../lib/config/messages';
import { Button } from '../../lib/ui/button/button';

export const ConnectedDevicesEmptyListInfo = ({
  findDevices,
  scanProgress,
}: {
  findDevices: () => void;
  scanProgress: number;
}) => (
  <>
    <span>{MESSAGES.device.noDevicesFound}</span>
    <Button onClick={() => findDevices()} disabled={scanProgress !== 100}>
      {scanProgress === 100
        ? MESSAGES.device.scanForDevices
        : `${MESSAGES.device.scanning} ${scanProgress}%`}
    </Button>
  </>
);

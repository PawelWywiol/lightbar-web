import { cva } from 'cva';

export const connectedDeviceInfoStatus = cva('aspect-square rounded-full h-4 row-span-2', {
  variants: {
    status: {
      PROCESSING: 'bg-warning',
      CONNECTING: 'bg-warning',
      CONNECTED: 'bg-success',
      CLOSED: 'bg-error',
    },
  },
  defaultVariants: {
    status: 'CLOSED',
  },
});

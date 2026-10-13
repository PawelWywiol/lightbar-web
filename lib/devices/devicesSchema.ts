import { z } from 'zod';
import { isIPAddress, isUrl } from './devicesApi';

const ConnectedDeviceValidationSchema = z.object({
  url: z.string(),
  label: z.string().optional(),
});

export const ConnectedDevicesValidationSchema = z.array(ConnectedDeviceValidationSchema);

export type ConnectedDeviceInput = z.infer<typeof ConnectedDeviceValidationSchema>;

export const ConnectedDeviceUrlValidationSchema = z.string().optional();

export const isValidDeviceUrl = (url: string) => isIPAddress(url) || isUrl(url);

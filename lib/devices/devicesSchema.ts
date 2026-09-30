import { z } from 'zod';
import { isIPAddress, isUrl } from './devicesApi';

export const DeviceUrlSchema = z
  .string()
  .min(1, 'URL is required')
  .refine((value) => isIPAddress(value) || isUrl(value), {
    message: 'Must be a valid IP address or HTTP/HTTPS URL',
  });

export const ConnectedDeviceValidationSchema = z.object({
  url: z.string(),
  label: z.string().optional(),
});

export const ConnectedDevicesValidationSchema = z.array(ConnectedDeviceValidationSchema);

export type ConnectedDeviceInput = z.infer<typeof ConnectedDeviceValidationSchema>;
export type ConnectedDevicesInput = z.infer<typeof ConnectedDevicesValidationSchema>;

export const ConnectedDeviceUrlValidationSchema = z.string().optional();

export const validateDeviceUrl = (url: string): { valid: boolean; error?: string | undefined } => {
  const result = DeviceUrlSchema.safeParse(url);
  return result.success
    ? { valid: true }
    : { valid: false, error: result.error.issues[0]?.message };
};

import { CONNECTED_DEVICE_API_DEFAULT_PATH } from './devices.config';
import { progressPercentage } from './devices.utils';
import { isIPAddress } from './devicesApi';

const DEVICE_SCAN_DEFAULT_SCHEMA = 'http';
const DEVICE_SCAN_DEFAULT_PATH = '/';
const DEVICE_SCAN_DEFAULT_TIMEOUT = 120;
const DEVICE_SCAN_DEFAULT_METHOD = 'GET';

const SUBNETS_IPS = Object.entries({
  '10.0.0': ['1', '138', '2'],
  '10.1.1': ['1'],
  '10.1.10': ['1'],
  '10.10.1': ['1'],
  '10.90.90': ['90'],
  '192.168.0': ['1', '10', '100', '101', '227', '254', '3', '30', '50'],
  '192.168.1': ['10', '100', '20', '200', '210', '254', '99'],
  '192.168.10': ['10', '100', '50'],
  '192.168.100': ['100'],
  '192.168.123': ['254'],
  '192.168.168': ['168'],
  '192.168.2': ['254'],
  '192.168.223': ['100'],
  '192.168.254': ['254'],
  '200.200.200': ['5'],
}).flatMap(([ip, parts]) => parts.map((part) => `${ip}.${part}`));

const checkIPConnection = async (
  ip: string,
  {
    schema = DEVICE_SCAN_DEFAULT_SCHEMA,
    path = DEVICE_SCAN_DEFAULT_PATH,
    timeout = DEVICE_SCAN_DEFAULT_TIMEOUT,
    method = DEVICE_SCAN_DEFAULT_METHOD,
  }: {
    schema?: string | undefined;
    path?: string | undefined;
    timeout?: number | undefined;
    method?: string | undefined;
  } = {},
) => {
  if (!isIPAddress(ip)) {
    return null;
  }

  const controller = new AbortController();
  const { signal } = controller;

  const config: RequestInit = {
    signal: signal,
    method: method,
    mode: 'no-cors',
    headers: {
      'cache-control': 'cache',
      pragma: 'cache',
    },
    credentials: 'omit',
  };

  let checkResult: string | null = ip;

  try {
    await Promise.race([
      fetch(`${schema}://${ip}${path}`, config),
      new Promise((_, reject) =>
        setTimeout(() => {
          controller.abort();
          checkResult = null;
          reject(new Error(`Timeout of ${timeout}ms reached while trying to connect to ${schema}://${ip}${path}`));
        }, timeout),
      ),
    ]);
  } catch {
    if (path !== DEVICE_SCAN_DEFAULT_PATH) {
      checkResult = null;
    }
  }

  return checkResult;
};

const scanSubnetForConnectedDevices = async (
  subnet: string,
  currentProgress: number,
  maxProgress: number,
  setScanProgress: (number: number) => void,
) => {
  const ipParts = subnet.split('.');
  const subnetIps = Array.from({ length: 256 }, (_, index) => `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${index}`);

  const ips = [];

  for (const [index, ip] of subnetIps.entries()) {
    ips.push(
      // oxlint-disable-next-line no-await-in-loop -- sequential scan keeps progress and network load predictable
      await checkIPConnection(ip === subnet ? '' : ip, {
        path: CONNECTED_DEVICE_API_DEFAULT_PATH,
      }),

      setScanProgress(progressPercentage(index, currentProgress, maxProgress)),
    );
  }

  return ips;
};

export const findLocalNetworkConnectedDevices = async (setScanProgress: (number: number) => void) => {
  setScanProgress(0);

  const activeSubnets = await Promise.all(SUBNETS_IPS.map(async (ip) => checkIPConnection(ip)));

  const maxProgress = activeSubnets.filter(Boolean).length * 256;

  const activeIps = [];

  for (const [index, activeSubnet] of activeSubnets.filter(Boolean).entries()) {
    activeIps.push(
      // oxlint-disable-next-line no-await-in-loop -- subnets scanned one by one for progress
      await scanSubnetForConnectedDevices(activeSubnet ?? '', index * 256, maxProgress, setScanProgress),
    );
  }

  setScanProgress(100);

  return activeIps.flat().filter(Boolean) as string[];
};

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionRequestData, ConnectionResponseData, ConnectionType } from '../connections/connections.types';
import { connectionRequestDataToBinaryData, isConnectionResponseData } from '../connections/connections.utils';
import type { LightsAdjust } from '../lights/lights.types';
import { subscribeCustomEvent, unsubscribeCustomEvent } from '../utils/customEvent/customEvent';
import type { CustomEventCallback } from '../utils/customEvent/customEvent.types';
import { CONNECTED_DEVICE_GET_STATE_INTERVAL, CONNECTED_DEVICE_SEND_TIMEOUT } from './devices.config';
import type { DeviceCustomEventDispatch } from './devices.types';
import { mergePendingRequests } from './devices.utils';
import { getConnectedDeviceData, resolveConnectedDeviceApiUrl } from './devicesApi';
import { getDeviceBridgeInfo, hasDeviceBridge, sendDeviceBridgeData } from './devicesBridge';

const getDeviceData = async (url: string) => {
  if (!hasDeviceBridge(url)) {
    return getConnectedDeviceData(url);
  }

  const data = await getDeviceBridgeInfo(url);

  return isConnectionResponseData(data) ? data : undefined;
};

export const useConnectedDeviceData = ({
  url,
  updateInterval = CONNECTED_DEVICE_GET_STATE_INTERVAL,
}: {
  url: string;
  updateInterval?: number;
}) => {
  const isSendingReference = useRef(false);
  const pendingRequestsReference = useRef<ConnectionRequestData[] | undefined>(undefined);
  const [status, setStatus] = useState<ConnectionType>('PROCESSING');
  const [info, setInfo] = useState<ConnectionResponseData | undefined>();

  const applyResponse = useCallback((responseData: ConnectionResponseData | undefined) => {
    setStatus(responseData ? 'CONNECTED' : 'CLOSED');
    setInfo(responseData);
  }, []);

  const updateStatus = useCallback(async () => {
    setStatus('PROCESSING');
    applyResponse(await getDeviceData(url));
  }, [url, applyResponse]);

  const applyAdjust = useCallback((adjust: LightsAdjust) => {
    setInfo((current) => current && { ...current, data: { ...current.data, adjust } });
  }, []);

  const post = async (requests: ConnectionRequestData[]) => {
    const binaryData = connectionRequestDataToBinaryData(requests);

    return hasDeviceBridge(url)
      ? sendDeviceBridgeData(url, binaryData)
      : fetch(resolveConnectedDeviceApiUrl(url), {
          method: 'POST',
          signal: AbortSignal.timeout(CONNECTED_DEVICE_SEND_TIMEOUT),
          body: new Blob([binaryData as BlobPart]),
        }).then(() => true);
  };

  const postWithPending = async (requests: ConnectionRequestData[]): Promise<boolean> => {
    if (!(await post(requests))) return false;

    const pending = pendingRequestsReference.current;
    pendingRequestsReference.current = undefined;

    return pending ? postWithPending(pending) : true;
  };

  // One request at a time, newest state wins: the device cannot keep up with every intermediate change.
  const send = async (requests: ConnectionRequestData[]) => {
    if (isSendingReference.current) {
      pendingRequestsReference.current = mergePendingRequests(pendingRequestsReference.current ?? [], requests);
      return;
    }

    isSendingReference.current = true;
    setStatus('PROCESSING');

    let isSent = false;
    try {
      isSent = await postWithPending(requests);
    } catch (error) {
      console.warn('Device send error:', error);
    }

    isSendingReference.current = false;

    if (isSent) {
      setStatus('CONNECTED');
      return;
    }

    pendingRequestsReference.current = undefined;
    setStatus('CLOSED');
    setInfo(undefined);
  };

  useEffect(() => {
    const deviceSelectedEvent: CustomEventCallback<DeviceCustomEventDispatch> = {
      name: 'app:device:selected',
      callback: ({ detail }) => {
        if (detail === url || url?.length === 0) {
          void updateStatus();
        }
      },
    };

    void getDeviceData(url).then(applyResponse);
    subscribeCustomEvent<DeviceCustomEventDispatch>(deviceSelectedEvent);

    return () => {
      unsubscribeCustomEvent<DeviceCustomEventDispatch>(deviceSelectedEvent);
    };
  }, [url, applyResponse, updateStatus]);

  useEffect(() => {
    if (!updateInterval) {
      return;
    }

    const interval = setInterval(() => {
      if (status === 'CONNECTING' || status === 'PROCESSING') {
        return;
      }

      void updateStatus();
    }, updateInterval);

    return () => {
      clearInterval(interval);
    };
  }, [updateInterval, updateStatus, status]);

  return { status, updateStatus, info, send, applyAdjust };
};

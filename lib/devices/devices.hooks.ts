import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionRequestData, ConnectionResponseData, ConnectionType } from '../connections/connections.types';
import { connectionRequestDataToBinaryData, isConnectionResponseData } from '../connections/connections.utils';
import type { LightsAdjust } from '../lights/lights.types';
import { subscribeCustomEvent, unsubscribeCustomEvent } from '../utils/customEvent/customEvent';
import type { CustomEventCallback } from '../utils/customEvent/customEvent.types';
import { CONNECTED_DEVICE_GET_STATE_INTERVAL } from './devices.config';
import type { DeviceCustomEventDispatch } from './devices.types';
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
  const sendAbortControllerReference = useRef<AbortController | undefined>(undefined);
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

  const send = async (requests: ConnectionRequestData[]) => {
    sendAbortControllerReference.current?.abort();
    const abortController = new AbortController();
    sendAbortControllerReference.current = abortController;

    setStatus('PROCESSING');

    try {
      const binaryData = connectionRequestDataToBinaryData(requests);

      const isSent = hasDeviceBridge(url)
        ? await sendDeviceBridgeData(url, binaryData)
        : await fetch(resolveConnectedDeviceApiUrl(url), {
            method: 'POST',
            signal: abortController.signal,
            body: new Blob([binaryData as BlobPart]),
          }).then(() => true);

      if (isSent) {
        setStatus('CONNECTED');
        return;
      }
    } catch (error) {
      if (abortController.signal.aborted) return;
      console.warn('Device send error:', error);
    }

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

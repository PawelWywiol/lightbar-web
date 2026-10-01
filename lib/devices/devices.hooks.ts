import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConnectionRequestData, ConnectionResponseData, ConnectionType } from '../connections/connections.types';
import { connectionRequestDataToBinaryData } from '../connections/connections.utils';
import { subscribeCustomEvent, unsubscribeCustomEvent } from '../utils/customEvent/customEvent';
import type { CustomEventCallback } from '../utils/customEvent/customEvent.types';
import { CONNECTED_DEVICE_GET_STATE_INTERVAL } from './devices.config';
import type { DeviceCustomEventDispatch } from './devices.types';
import { getConnectedDeviceData, resolveConnectedDeviceApiUrl } from './devicesApi';

export const useConnectedDeviceData = ({
  url,
  updateInterval = CONNECTED_DEVICE_GET_STATE_INTERVAL,
}: {
  url: string;
  updateInterval?: number;
}) => {
  const sendAbortControllerReference = useRef<AbortController | undefined>(undefined);
  const [status, setStatus] = useState<ConnectionType>('CLOSED');
  const [info, setInfo] = useState<ConnectionResponseData | undefined>();

  const updateStatus = useCallback(async () => {
    setStatus('PROCESSING');

    const responseData = await getConnectedDeviceData(url);

    setStatus(responseData ? 'CONNECTED' : 'CLOSED');
    setInfo(responseData);
  }, [url]);

  const send = async (requests: ConnectionRequestData[]) => {
    sendAbortControllerReference.current?.abort();
    sendAbortControllerReference.current = new AbortController();

    setStatus('PROCESSING');

    try {
      const binaryData = connectionRequestDataToBinaryData(requests);

      await fetch(resolveConnectedDeviceApiUrl(url), {
        method: 'POST',
        signal: sendAbortControllerReference.current.signal,
        body: new Blob([binaryData as BlobPart]),
      });

      setStatus('CONNECTED');
      return;
    } catch (error) {
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

    void updateStatus();
    subscribeCustomEvent<DeviceCustomEventDispatch>(deviceSelectedEvent);

    return () => {
      unsubscribeCustomEvent<DeviceCustomEventDispatch>(deviceSelectedEvent);
    };
  }, [url, updateStatus]);

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

  return { status, updateStatus, info, send };
};

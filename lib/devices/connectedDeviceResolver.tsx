import { useEffect } from 'react';
import { subscribeCustomEvent, unsubscribeCustomEvent } from '../utils/customEvent/customEvent';
import type { CustomEventCallback } from '../utils/customEvent/customEvent.types';
import { saveLastSentScheme } from '../schemes/schemesStorage';
import { useConnectedDeviceData } from './devices.hooks';
import type { ConnectedDevice } from './devices.types';
import { convertColorToConnectionRequestData, convertLightsFrameToConnectionRequestData } from './devices.utils';
import type {
  SaveSchemeDeviceEvent,
  UpdateAdjustDeviceEvent,
  UpdateColorDeviceEvent,
  UpdateSchemeDeviceEvent,
} from './devicesEvents';

export const ConnectedDeviceResolver = ({
  device,
  onChange,
  selected,
}: {
  device: ConnectedDevice;
  onChange: ({ info, status }: ConnectedDevice) => void;
  selected: boolean;
}) => {
  const { info, status, send, applyAdjust } = useConnectedDeviceData(device);

  /* oxlint-disable react-hooks/exhaustive-deps -- callback deps cause infinite loop */
  useEffect(() => {
    onChange({ ...device, info, status });
  }, [info, status]);
  /* oxlint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    const editorColorUpdateEvent: CustomEventCallback<UpdateColorDeviceEvent> = {
      name: 'app:update:color',
      callback: ({ detail }) => {
        if (!detail) {
          return;
        }

        void send([convertColorToConnectionRequestData(detail.color)]);
      },
    };

    const editorSchemeUpdateEvent: CustomEventCallback<UpdateSchemeDeviceEvent> = {
      name: 'app:update:scheme',
      callback: ({ detail }) => {
        const frame = detail.scheme.frames[detail.frameIndex];
        if (!frame) {
          return;
        }

        void send([convertLightsFrameToConnectionRequestData(frame)]);
      },
    };

    const editorSchemeSaveEvent: CustomEventCallback<SaveSchemeDeviceEvent> = {
      name: 'app:save:scheme',
      callback: ({ detail }) => {
        const { scheme, adjust } = detail;
        saveLastSentScheme(detail);
        if (adjust) applyAdjust(adjust);
        void send([
          ...(adjust ? [{ type: 'adjust' as const, data: adjust }] : []),
          { type: 'head', data: { name: scheme.name } },
          ...scheme.frames.map((frame) => convertLightsFrameToConnectionRequestData(frame)),
        ]);
      },
    };

    const adjustUpdateEvent: CustomEventCallback<UpdateAdjustDeviceEvent> = {
      name: 'app:update:adjust',
      callback: ({ detail }) => {
        applyAdjust(detail);
        void send([{ type: 'adjust', data: detail }]);
      },
    };

    if (selected) {
      subscribeCustomEvent<UpdateAdjustDeviceEvent>(adjustUpdateEvent);
      subscribeCustomEvent<UpdateColorDeviceEvent>(editorColorUpdateEvent);
      subscribeCustomEvent<UpdateSchemeDeviceEvent>(editorSchemeUpdateEvent);
      subscribeCustomEvent<SaveSchemeDeviceEvent>(editorSchemeSaveEvent);
    }

    return () => {
      unsubscribeCustomEvent<UpdateAdjustDeviceEvent>(adjustUpdateEvent);
      unsubscribeCustomEvent<UpdateColorDeviceEvent>(editorColorUpdateEvent);
      unsubscribeCustomEvent<UpdateSchemeDeviceEvent>(editorSchemeUpdateEvent);
      unsubscribeCustomEvent<SaveSchemeDeviceEvent>(editorSchemeSaveEvent);
    };
  }, [info, selected, send, applyAdjust]);

  return null;
};

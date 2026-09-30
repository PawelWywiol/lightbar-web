import * as Sentry from '@sentry/react';
import { useCallback } from 'react';
import type { LightsFrame } from '../../lib/lights/lights.types';
import { useEditor } from './editor.provider';

export const useFrameUpdater = () => {
  const { lightsScheme, frameIndex, handleUpdate } = useEditor();

  return useCallback(
    (updater: (frame: LightsFrame) => void): boolean => {
      const updated = structuredClone(lightsScheme.scheme);
      const frame = updated.frames[frameIndex];
      if (!frame) {
        Sentry.captureMessage('Frame update failed: frame not found', {
          level: 'warning',
          extra: { frameIndex, framesCount: lightsScheme.scheme.frames.length },
        });
        return false;
      }
      updater(frame);
      handleUpdate(updated);
      return true;
    },
    [lightsScheme.scheme, frameIndex, handleUpdate],
  );
};

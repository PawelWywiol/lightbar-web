import { useEffect } from 'react';
import { resolveLightsSchemeColorIndexes } from '../../../lib/devices/devices.utils';
import type { UpdateSchemeDeviceEvent } from '../../../lib/devices/devicesEvents';
import { dispatchCustomEvent } from '../../../lib/utils/customEvent/customEvent';
import { useEditorColor } from './editorColor.provider';
import { useEditorFrame } from './editorFrame.provider';
import { useEditorScheme } from './editorScheme.provider';

/**
 * Syncs scheme to device when:
 * - Color dialog closes (finished picking color)
 * - Frame changes
 * - Layout changes
 * - Scheme colors change (via painting)
 */
export const useSchemeDeviceSync = () => {
  const { lightsScheme } = useEditorScheme();
  const { isColorDialogOpen } = useEditorColor();
  const { frameIndex, lightsLayout } = useEditorFrame();

  // Narrow dependency: only frame colors, not entire scheme
  const currentFrame = lightsScheme.scheme.frames[frameIndex];
  const frameColorsKey = currentFrame?.colors.join(',') ?? '';
  const frameType = currentFrame?.type;
  const frameTempo = currentFrame?.tempo;

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional - narrow deps to frame properties for perf (avoid triggering on scheme metadata changes)
  useEffect(() => {
    if (!isColorDialogOpen && currentFrame) {
      dispatchCustomEvent<UpdateSchemeDeviceEvent>({
        name: 'app:update:scheme',
        detail: {
          scheme: resolveLightsSchemeColorIndexes(lightsScheme.scheme, lightsLayout.value),
          frameIndex,
        },
      });
    }
  }, [isColorDialogOpen, frameColorsKey, frameType, frameTempo, frameIndex, lightsLayout.value]);
};

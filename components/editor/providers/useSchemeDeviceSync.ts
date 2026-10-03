import { useEffect } from 'react';
import type { UpdateSchemeDeviceEvent } from '../../../lib/devices/devicesEvents';
import { dispatchCustomEvent } from '../../../lib/utils/customEvent/customEvent';
import { useEditorColor } from './editorColor.provider';
import { useEditorGrid } from './editorGrid.provider';
import { useEditorScheme } from './editorScheme.provider';

export const useSchemeDeviceSync = () => {
  const { lightsScheme } = useEditorScheme();
  const { isColorDialogOpen } = useEditorColor();
  const { previewRow } = useEditorGrid();
  const previewFrame = lightsScheme.scheme.frames[previewRow];

  /* oxlint-disable react-hooks/exhaustive-deps -- device shows only the preview frame, skip other scheme changes */
  useEffect(() => {
    if (isColorDialogOpen || !previewFrame) return;
    dispatchCustomEvent<UpdateSchemeDeviceEvent>({
      name: 'app:update:scheme',
      detail: { scheme: lightsScheme.scheme, frameIndex: previewRow },
    });
  }, [isColorDialogOpen, previewFrame, previewRow]);
  /* oxlint-enable react-hooks/exhaustive-deps */
};

import type { ReactNode } from 'react';
import type { LightsSchemeData } from '../../../lib/lights/lights.types';
import { TooltipProvider } from '../../../lib/ui/tooltip/tooltip';
import { EditorColorProvider } from './editorColor.provider';
import { EditorGridProvider } from './editorGrid.provider';
import { EditorSchemeProvider } from './editorScheme.provider';
import { useSchemeDeviceSync } from './useSchemeDeviceSync';

export { useEditorColor } from './editorColor.provider';
export { useEditorGrid } from './editorGrid.provider';
export { useEditorScheme } from './editorScheme.provider';

// Inner component to use hooks after all providers are mounted
const EditorSyncEffects = ({ children }: { children: ReactNode }) => {
  useSchemeDeviceSync();
  return <>{children}</>;
};

export const EditorProviders = ({
  children,
  initialSchemeData,
  initialOnlineId,
}: {
  children: ReactNode;
  initialSchemeData?: LightsSchemeData | undefined;
  initialOnlineId?: string | undefined;
}) => (
  <TooltipProvider>
    <EditorSchemeProvider initialSchemeData={initialSchemeData} initialOnlineId={initialOnlineId}>
      <EditorColorProvider>
        <EditorGridProvider>
          <EditorSyncEffects>{children}</EditorSyncEffects>
        </EditorGridProvider>
      </EditorColorProvider>
    </EditorSchemeProvider>
  </TooltipProvider>
);

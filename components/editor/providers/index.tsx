import type { ReactNode } from 'react';
import type { LightsSchemeData } from '../../../lib/lights/lights.types';
import { EditorColorProvider } from './editorColor.provider';
import { EditorFrameProvider } from './editorFrame.provider';
import { EditorSchemeProvider } from './editorScheme.provider';
import { useSchemeDeviceSync } from './useSchemeDeviceSync';

export { useEditorColor } from './editorColor.provider';
export { useEditorFrame } from './editorFrame.provider';
export { useEditorScheme } from './editorScheme.provider';

// Inner component to use hooks after all providers are mounted
const EditorSyncEffects = ({ children }: { children: ReactNode }) => {
  useSchemeDeviceSync();
  return <>{children}</>;
};

export const EditorProviders = ({
  children,
  initialSchemeData,
}: {
  children: ReactNode;
  initialSchemeData?: LightsSchemeData | undefined;
}) => (
  <EditorSchemeProvider initialSchemeData={initialSchemeData}>
    <EditorColorProvider>
      <EditorFrameProvider>
        <EditorSyncEffects>{children}</EditorSyncEffects>
      </EditorFrameProvider>
    </EditorColorProvider>
  </EditorSchemeProvider>
);

import { EditorModeTools } from './components/editorModeTools';
import { EditorSchemePreview } from './components/editorSchemePreview';
import { LightsFrameShiftTools } from './components/lightsFrameShiftTools';
import { LightsSchemeStateTools } from './components/lightsSchemeStateTools';
import { SchemeGrid } from './components/schemeGrid/schemeGrid';
import type { EditorProps } from './editor.types';
import { EditorProviders } from './providers';

const toolbarClassName = 'shrink-0 w-sm max-w-full-gap mx-auto';

export const Editor = ({ lightsSchemeData, onlineId }: EditorProps) => (
  <EditorProviders initialSchemeData={lightsSchemeData} initialOnlineId={onlineId}>
    <div className="flex flex-col flex-1 min-h-0 w-full gap-2 py-2">
      <SchemeGrid />
      <div className={`${toolbarClassName} flex flex-col gap-2`}>
        <EditorSchemePreview />
        <LightsFrameShiftTools />
        <EditorModeTools />
        <LightsSchemeStateTools />
      </div>
    </div>
  </EditorProviders>
);

import { EditorModeTools } from './components/editorModeTools';
import { LightsFrameShiftTools } from './components/lightsFrameShiftTools';
import { LightsSchemeStateTools } from './components/lightsSchemeStateTools';
import { SchemeGrid } from './components/schemeGrid/schemeGrid';
import type { EditorProps } from './editor.types';
import { EditorProviders } from './providers';

const toolbarClassName = 'shrink-0 w-sm max-w-full-gap mx-auto';

export const Editor = ({ lightsSchemeData }: EditorProps) => (
  <EditorProviders initialSchemeData={lightsSchemeData}>
    <div className="flex flex-col flex-1 min-h-0 w-full gap-2 py-2">
      <div className={toolbarClassName}>
        <LightsFrameShiftTools />
      </div>
      <SchemeGrid />
      <div className={`${toolbarClassName} flex flex-col gap-2`}>
        <EditorModeTools />
        <LightsSchemeStateTools />
      </div>
    </div>
  </EditorProviders>
);

import { LightsFrameGrid } from './components/lightsFrameGrid/lightsFrameGrid';
import { LightsFrameShiftTools } from './components/lightsFrameShiftTools';
import { LightsFrameStateTools } from './components/lightsFrameStateTools';
import { LightsSchemeStateTools } from './components/lightsSchemeStateTools';
import { EditorProvider } from './editor.provider';

import type { EditorProps } from './editor.types';

export const Editor = ({ lightsSchemeData }: EditorProps) => {
  return (
    <EditorProvider initialSchemeData={lightsSchemeData}>
      <div className="m-auto w-sm max-w-full-gap flex flex-col gap-4 py-4 flex-1">
        <LightsFrameShiftTools />
        <LightsFrameGrid />
        <LightsFrameStateTools />
        <LightsSchemeStateTools />
      </div>
    </EditorProvider>
  );
};

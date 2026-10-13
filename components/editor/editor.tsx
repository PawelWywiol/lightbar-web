import { EditorModeTools } from './components/editorModeTools';
import { EditorSchemePreview } from './components/editorSchemePreview';
import { LightsSchemeStateTools } from './components/lightsSchemeStateTools';
import { SchemeGrid } from './components/schemeGrid/schemeGrid';
import type { EditorProps } from './editor.types';
import { EditorProviders } from './providers';

export const Editor = ({ lightsSchemeData, onlineId }: EditorProps) => (
  <EditorProviders initialSchemeData={lightsSchemeData} initialOnlineId={onlineId}>
    <div className="flex flex-col flex-1 min-h-0 w-full">
      <div className="shrink-0 w-full max-w-2xl mx-auto px-4 pt-3 pb-1.5">
        <LightsSchemeStateTools />
      </div>
      <SchemeGrid />
      <div className="shrink-0 w-full max-w-xl mx-auto flex flex-col gap-2.5 rounded-t-4xl border-t bg-card px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:mb-4 md:rounded-4xl md:border md:pb-3">
        <span aria-hidden="true" className="h-1 w-9 self-center rounded-full bg-track" />
        <EditorSchemePreview />
        <EditorModeTools />
      </div>
    </div>
  </EditorProviders>
);

import type { ReactNode } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';
import type { EditorMode } from '../editor.types';
import { useEditorScheme } from './editorScheme.provider';

interface EditorGridContextValue {
  mode: EditorMode;
  setMode: (mode: EditorMode) => void;
  activeRow: number;
  setActiveRow: (row: number) => void;
  previewRow: number;
  setPreviewRow: (row: number) => void;
}

const EditorGridContext = createContext<EditorGridContextValue | null>(null);

export const useEditorGrid = () => {
  const ctx = useContext(EditorGridContext);
  if (!ctx) throw new Error('useEditorGrid must be used within EditorGridProvider');
  return ctx;
};

export const EditorGridProvider = ({ children }: { children: ReactNode }) => {
  const { lightsScheme } = useEditorScheme();
  const [mode, setMode] = useState<EditorMode>('paint');
  const [activeRow, setActiveRow] = useState(0);
  const [previewRow, setPreviewRow] = useState(0);
  const lastRow = Math.max(0, lightsScheme.scheme.frames.length - 1);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      activeRow: Math.min(activeRow, lastRow),
      setActiveRow,
      previewRow: Math.min(previewRow, lastRow),
      setPreviewRow,
    }),
    [mode, activeRow, previewRow, lastRow],
  );

  return <EditorGridContext.Provider value={value}>{children}</EditorGridContext.Provider>;
};

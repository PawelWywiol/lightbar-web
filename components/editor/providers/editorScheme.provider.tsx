import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { SaveSchemeDeviceEvent } from '../../../lib/devices/devicesEvents';
import { DEFAULT_LIGHTS_SCHEME } from '../../../lib/lights/lights.config';
import type { LightsScheme, LightsSchemeData } from '../../../lib/lights/lights.types';
import { saveLocalScheme } from '../../../lib/schemes/schemesStorage';
import { dispatchCustomEvent } from '../../../lib/utils/customEvent/customEvent';
import { generateUid } from '../../../lib/utils/uid/uid';
import { EDITOR_MAX_HISTORY } from '../editor.config';
import { normalizeScheme } from '../editor.utils';

interface EditorSchemeContextValue {
  lightsScheme: LightsSchemeData;
  handleUpdate: (scheme: LightsScheme) => void;
  handleUndo: () => void;
  undoAvailable: boolean;
  handleRedo: () => void;
  redoAvailable: boolean;
  handleSave: () => void;
}

const EditorSchemeContext = createContext<EditorSchemeContextValue | null>(null);

const createInitialSchemeData = (initialSchemeData?: LightsSchemeData): LightsSchemeData => {
  const data = initialSchemeData ?? {
    scheme: DEFAULT_LIGHTS_SCHEME,
    uid: generateUid(),
    updatedAt: new Date().toISOString(),
  };
  return { ...data, scheme: normalizeScheme(data.scheme) };
};

export const useEditorScheme = () => {
  const ctx = useContext(EditorSchemeContext);
  if (!ctx) throw new Error('useEditorScheme must be used within EditorSchemeProvider');
  return ctx;
};

export const EditorSchemeProvider = ({
  children,
  initialSchemeData,
}: {
  children: ReactNode;
  initialSchemeData?: LightsSchemeData | undefined;
}) => {
  const [initialData] = useState(() => createInitialSchemeData(initialSchemeData));
  const [meta, setMeta] = useState({ uid: initialData.uid, updatedAt: initialData.updatedAt });
  const [history, setHistory] = useState<{ entries: LightsScheme[]; index: number }>(() => ({
    entries: [initialData.scheme],
    index: 0,
  }));

  const lightsScheme = useMemo<LightsSchemeData>(
    () => ({ ...meta, scheme: history.entries[history.index] ?? initialData.scheme }),
    [meta, history, initialData],
  );

  const handleUpdate = useCallback((newScheme: LightsScheme) => {
    setHistory((prev) => {
      const entries = [...prev.entries.slice(0, prev.index + 1), newScheme].slice(-EDITOR_MAX_HISTORY);
      return { entries, index: entries.length - 1 };
    });
    setMeta((prev) => ({ ...prev, updatedAt: new Date().toISOString() }));
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((prev) => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev));
  }, []);

  const handleRedo = useCallback(() => {
    setHistory((prev) => (prev.index < prev.entries.length - 1 ? { ...prev, index: prev.index + 1 } : prev));
  }, []);

  const handleSave = useCallback(() => {
    saveLocalScheme(lightsScheme);
    dispatchCustomEvent<SaveSchemeDeviceEvent>({
      name: 'app:save:scheme',
      detail: { uid: lightsScheme.uid, scheme: lightsScheme.scheme },
    });
  }, [lightsScheme]);

  const value = useMemo(
    () => ({
      lightsScheme,
      handleUpdate,
      handleUndo,
      undoAvailable: history.index > 0,
      handleRedo,
      redoAvailable: history.index < history.entries.length - 1,
      handleSave,
    }),
    [lightsScheme, handleUpdate, handleUndo, handleRedo, handleSave, history],
  );

  return <EditorSchemeContext.Provider value={value}>{children}</EditorSchemeContext.Provider>;
};

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { resolveLightsSchemeColorIndexes } from '../../../lib/devices/devices.utils';
import { DEFAULT_LIGHTS_SCHEME } from '../../../lib/lights/lights.config';
import type { LightsScheme, LightsSchemeData } from '../../../lib/lights/lights.types';
import { dispatchCustomEvent } from '../../../lib/utils/customEvent/customEvent';
import { generateUid } from '../../../lib/utils/uid/uid';
import { EDITOR_MAX_HISTORY } from '../editor.config';

interface EditorSchemeContextValue {
  lightsScheme: LightsSchemeData;
  handleUpdate: (scheme: LightsScheme) => void;
  handleUndo: () => void;
  undoAvailable: boolean;
  handleRedo: () => void;
  redoAvailable: boolean;
  handleSave: (layoutValue: number) => void;
}

const EditorSchemeContext = createContext<EditorSchemeContextValue | null>(null);

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
  const [lightsScheme, setLightsScheme] = useState<LightsSchemeData>(
    initialSchemeData ?? {
      scheme: DEFAULT_LIGHTS_SCHEME,
      uid: generateUid(),
      updatedAt: new Date().toISOString(),
    },
  );
  const [history, setHistory] = useState<LightsScheme[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const handleUpdate = useCallback(
    (newScheme: LightsScheme) => {
      setHistory((prev) => {
        const newHistory = [...prev];
        const newIndex = historyIndex + 1;
        if (newIndex < EDITOR_MAX_HISTORY) {
          newHistory.splice(newIndex);
        } else {
          newHistory.shift();
        }
        newHistory.push(newScheme);
        return newHistory;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, EDITOR_MAX_HISTORY - 1));
      setLightsScheme((prev) => ({
        ...prev,
        scheme: newScheme,
        updatedAt: new Date().toISOString(),
      }));
    },
    [historyIndex],
  );

  const handleUndo = useCallback(() => {
    const prev = history[historyIndex - 1];
    if (historyIndex > 0 && prev) {
      setHistoryIndex((i) => i - 1);
      setLightsScheme((s) => ({ ...s, scheme: prev }));
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    const next = history[historyIndex + 1];
    if (historyIndex < history.length - 1 && next) {
      setHistoryIndex((i) => i + 1);
      setLightsScheme((s) => ({ ...s, scheme: next }));
    }
  }, [history, historyIndex]);

  const handleSave = useCallback(
    (layoutValue: number) => {
      dispatchCustomEvent({
        name: 'app:save:scheme',
        detail: {
          uid: lightsScheme.uid,
          scheme: resolveLightsSchemeColorIndexes(lightsScheme.scheme, layoutValue),
        },
      });
    },
    [lightsScheme],
  );

  const value = useMemo(
    () => ({
      lightsScheme,
      handleUpdate,
      handleUndo,
      undoAvailable: historyIndex > 0,
      handleRedo,
      redoAvailable: historyIndex < history.length - 1,
      handleSave,
    }),
    [lightsScheme, handleUpdate, handleUndo, handleRedo, handleSave, historyIndex, history.length],
  );

  return <EditorSchemeContext.Provider value={value}>{children}</EditorSchemeContext.Provider>;
};

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DEFAULT_LIGHTS_LAYOUT_OPTION } from '../../../lib/lights/lights.config';
import type { LightsLayoutOption } from '../../../lib/lights/lights.types';
import { useEditorScheme } from './editorScheme.provider';

interface EditorFrameContextValue {
  frameIndex: number;
  setFrameIndex: Dispatch<SetStateAction<number>>;
  framesCount: number;
  nextFrame: () => void;
  nextFrameAvailable: boolean;
  previousFrame: () => void;
  previousFrameAvailable: boolean;
  lightsLayout: LightsLayoutOption;
  setLightsLayout: Dispatch<SetStateAction<LightsLayoutOption>>;
}

const EditorFrameContext = createContext<EditorFrameContextValue | null>(null);

export const useEditorFrame = () => {
  const ctx = useContext(EditorFrameContext);
  if (!ctx) throw new Error('useEditorFrame must be used within EditorFrameProvider');
  return ctx;
};

export const EditorFrameProvider = ({ children }: { children: ReactNode }) => {
  const { lightsScheme } = useEditorScheme();
  const [frameIndex, setFrameIndex] = useState(0);
  const [lightsLayout, setLightsLayout] = useState<LightsLayoutOption>(
    DEFAULT_LIGHTS_LAYOUT_OPTION,
  );

  const framesCount = lightsScheme.scheme.frames.length;

  const nextFrame = useCallback(
    () => setFrameIndex((prev) => (prev + 1 < framesCount ? prev + 1 : prev)),
    [framesCount],
  );

  const previousFrame = useCallback(() => setFrameIndex((prev) => (prev > 0 ? prev - 1 : 0)), []);

  const value = useMemo(
    () => ({
      frameIndex,
      setFrameIndex,
      framesCount,
      nextFrame,
      nextFrameAvailable: frameIndex < framesCount - 1,
      previousFrame,
      previousFrameAvailable: frameIndex > 0,
      lightsLayout,
      setLightsLayout,
    }),
    [frameIndex, framesCount, nextFrame, previousFrame, lightsLayout],
  );

  return <EditorFrameContext.Provider value={value}>{children}</EditorFrameContext.Provider>;
};

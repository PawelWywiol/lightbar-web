/**
 * Backward-compatible EditorProvider
 * Wraps the new split providers and composes useEditor hook
 */

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { LightsSchemeData } from '../../lib/lights/lights.types';
import { EditorProviders, useEditorColor, useEditorFrame, useEditorScheme } from './providers';

// Re-export split provider hooks for direct access
export { useEditorColor, useEditorFrame, useEditorScheme } from './providers';

/**
 * Backward-compatible useEditor hook
 * Composes all 3 provider contexts into unified interface
 */
export const useEditor = () => {
  const scheme = useEditorScheme();
  const color = useEditorColor();
  const frame = useEditorFrame();

  return useMemo(
    () => ({
      // Scheme
      lightsScheme: scheme.lightsScheme,
      handleUpdate: scheme.handleUpdate,
      handleUndo: scheme.handleUndo,
      undoAvailable: scheme.undoAvailable,
      handleRedo: scheme.handleRedo,
      redoAvailable: scheme.redoAvailable,
      handleSave: () => scheme.handleSave(frame.lightsLayout.value),
      // Color
      color: color.color,
      selectColor: color.selectColor,
      colorPalette: color.colorPalette,
      recentColors: color.recentColors,
      hueColors: color.hueColors,
      lightnessColors: color.lightnessColors,
      isColorDialogOpen: color.isColorDialogOpen,
      handleColorDialogOpenChange: color.handleColorDialogOpenChange,
      // Frame
      frameIndex: frame.frameIndex,
      setFrameIndex: frame.setFrameIndex,
      framesCount: frame.framesCount,
      nextFrame: frame.nextFrame,
      nextFrameAvailable: frame.nextFrameAvailable,
      previousFrame: frame.previousFrame,
      previousFrameAvailable: frame.previousFrameAvailable,
      lightsLayout: frame.lightsLayout,
      setLightsLayout: frame.setLightsLayout,
    }),
    [scheme, color, frame],
  );
};

/**
 * Backward-compatible EditorProvider
 * Wraps EditorProviders for existing consumers
 */
export const EditorProvider = ({
  children,
  initialSchemeData,
}: {
  children: ReactNode;
  initialSchemeData?: LightsSchemeData | undefined;
}) => <EditorProviders initialSchemeData={initialSchemeData}>{children}</EditorProviders>;

import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLightColor,
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
} from '../../../lib/lights/lights.config';
import type { LightsSchemeData } from '../../../lib/lights/lights.types';
import { paintCells } from '../editor.utils';
import { EditorProviders, useEditorColor, useEditorGrid, useEditorScheme } from './index';

const createFrame = (first: number, second: number) => ({
  type: DEFAULT_LIGHTS_FRAME_TYPE,
  tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
  colors: [createLightColor(first), createLightColor(second)],
});

const schemeData: LightsSchemeData = {
  uid: 'uid',
  updatedAt: '',
  scheme: { name: 'test', frames: [createFrame(1, 2), createFrame(3, 4), createFrame(5, 6)] },
};

type Editor = {
  scheme: ReturnType<typeof useEditorScheme>;
  grid: ReturnType<typeof useEditorGrid>;
  color: ReturnType<typeof useEditorColor>;
};

let editor: Editor;

const Probe = () => {
  const scheme = useEditorScheme();
  const grid = useEditorGrid();
  const color = useEditorColor();
  useEffect(() => {
    editor = { scheme, grid, color };
  });
  return null;
};

const listener = vi.fn();

beforeEach(() => {
  listener.mockReset();
  document.addEventListener('app:update:scheme', listener);
  render(
    <EditorProviders initialSchemeData={schemeData}>
      <Probe />
    </EditorProviders>,
  );
});

afterEach(() => {
  document.removeEventListener('app:update:scheme', listener);
});

const frameIndexes = () => listener.mock.calls.map(([event]) => (event as CustomEvent).detail.frameIndex);

describe('useSchemeDeviceSync', () => {
  it('dispatches once with frame 0 on mount', () => {
    expect(frameIndexes()).toEqual([0]);
  });

  it('dispatches with the new frame index when the preview row changes', () => {
    listener.mockReset();
    act(() => editor.grid.setPreviewRow(2));
    expect(frameIndexes()).toEqual([2]);
  });

  it('does not dispatch when a non-preview row changes', () => {
    listener.mockReset();
    act(() =>
      editor.scheme.handleUpdate(
        paintCells(editor.scheme.lightsScheme.scheme, [{ row: 1, column: 0 }], createLightColor(9)),
      ),
    );
    expect(listener).not.toHaveBeenCalled();
  });

  it('dispatches when the preview row colors change', () => {
    listener.mockReset();
    act(() =>
      editor.scheme.handleUpdate(
        paintCells(editor.scheme.lightsScheme.scheme, [{ row: 0, column: 0 }], createLightColor(9)),
      ),
    );
    expect(frameIndexes()).toEqual([0]);
  });

  it('does not dispatch when only the scheme name changes', () => {
    listener.mockReset();
    act(() => editor.scheme.handleUpdate({ ...editor.scheme.lightsScheme.scheme, name: 'renamed' }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not dispatch scheme updates while the color dialog is open', () => {
    act(() => editor.color.handleColorDialogOpenChange(true));
    listener.mockReset();
    act(() =>
      editor.scheme.handleUpdate(
        paintCells(editor.scheme.lightsScheme.scheme, [{ row: 0, column: 0 }], createLightColor(9)),
      ),
    );
    expect(listener).not.toHaveBeenCalled();
  });
});

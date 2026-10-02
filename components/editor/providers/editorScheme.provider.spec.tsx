import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SaveSchemeDeviceEvent } from '../../../lib/devices/devicesEvents';
import {
  createLightColor,
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
} from '../../../lib/lights/lights.config';
import type { LightsSchemeData } from '../../../lib/lights/lights.types';
import { EditorSchemeProvider, useEditorScheme } from './editorScheme.provider';

const schemeData: LightsSchemeData = {
  uid: 'uid',
  updatedAt: '',
  scheme: {
    name: 'test',
    frames: [
      {
        type: DEFAULT_LIGHTS_FRAME_TYPE,
        tempo: DEFAULT_LIGHTS_FRAME_TEMPO,
        colors: [createLightColor(1), createLightColor(2)],
      },
      { type: DEFAULT_LIGHTS_FRAME_TYPE, tempo: DEFAULT_LIGHTS_FRAME_TEMPO, colors: [createLightColor(3)] },
    ],
  },
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <EditorSchemeProvider initialSchemeData={schemeData}>{children}</EditorSchemeProvider>
);

describe('EditorSchemeProvider', () => {
  it('normalizes rows to the first row length', () => {
    const { result } = renderHook(() => useEditorScheme(), { wrapper });
    expect(result.current.lightsScheme.scheme.frames.map((frame) => frame.colors.length)).toEqual([2, 2]);
  });

  it('undo restores the scheme from before the first update and redo reapplies it', () => {
    const { result } = renderHook(() => useEditorScheme(), { wrapper });
    const initial = result.current.lightsScheme.scheme;
    expect(result.current.undoAvailable).toBe(false);

    act(() => result.current.handleUpdate({ ...initial, name: 'changed' }));
    expect(result.current.undoAvailable).toBe(true);

    act(() => result.current.handleUndo());
    expect(result.current.lightsScheme.scheme).toEqual(initial);
    expect(result.current.redoAvailable).toBe(true);

    act(() => result.current.handleRedo());
    expect(result.current.lightsScheme.scheme.name).toBe('changed');
  });

  it('saves the scheme without padding rows', () => {
    const listener = vi.fn();
    document.addEventListener('app:save:scheme', listener);
    const { result } = renderHook(() => useEditorScheme(), { wrapper });

    act(() => result.current.handleSave());

    const event = listener.mock.calls[0]?.[0] as CustomEvent<SaveSchemeDeviceEvent['detail']>;
    expect(event.detail.uid).toBe('uid');
    expect(event.detail.scheme.frames.map((frame) => frame.colors.length)).toEqual([2, 2]);
    document.removeEventListener('app:save:scheme', listener);
  });
});

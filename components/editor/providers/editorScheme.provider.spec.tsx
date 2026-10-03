import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { SaveSchemeDeviceEvent } from '../../../lib/devices/devicesEvents';
import {
  createLightColor,
  DEFAULT_LIGHTS_FRAME_TEMPO,
  DEFAULT_LIGHTS_FRAME_TYPE,
} from '../../../lib/lights/lights.config';
import type { LightsScheme, LightsSchemeData } from '../../../lib/lights/lights.types';
import { EDITOR_MAX_HISTORY } from '../editor.config';
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

  it('undoes three updates one step at a time', () => {
    const { result } = renderHook(() => useEditorScheme(), { wrapper });
    const initial = result.current.lightsScheme.scheme;
    const schemes: LightsScheme[] = [
      { ...initial, name: 'a' },
      { ...initial, name: 'b' },
      { ...initial, name: 'c' },
    ];
    schemes.forEach((scheme) => act(() => result.current.handleUpdate(scheme)));

    act(() => result.current.handleUndo());
    expect(result.current.lightsScheme.scheme).toEqual(schemes[1]);
    act(() => result.current.handleUndo());
    expect(result.current.lightsScheme.scheme).toEqual(schemes[0]);
    act(() => result.current.handleUndo());
    expect(result.current.lightsScheme.scheme).toEqual(initial);
    expect(result.current.undoAvailable).toBe(false);
  });

  it('drops redo after a new update', () => {
    const { result } = renderHook(() => useEditorScheme(), { wrapper });
    const initial = result.current.lightsScheme.scheme;

    act(() => result.current.handleUpdate({ ...initial, name: 'a' }));
    act(() => result.current.handleUndo());
    act(() => result.current.handleUpdate({ ...initial, name: 'b' }));
    expect(result.current.redoAvailable).toBe(false);

    act(() => result.current.handleRedo());
    expect(result.current.lightsScheme.scheme.name).toBe('b');
  });

  it('keeps at most EDITOR_MAX_HISTORY entries', () => {
    const { result } = renderHook(() => useEditorScheme(), { wrapper });
    const initial = result.current.lightsScheme.scheme;
    const total = EDITOR_MAX_HISTORY + 5;
    for (let i = 1; i <= total; i++) act(() => result.current.handleUpdate({ ...initial, name: `n${i}` }));

    for (let i = 0; i < EDITOR_MAX_HISTORY - 1; i++) act(() => result.current.handleUndo());
    expect(result.current.lightsScheme.scheme.name).toBe(`n${total - EDITOR_MAX_HISTORY + 1}`);
    expect(result.current.undoAvailable).toBe(false);
  });

  it('keeps history consistent for two updates in one batch', () => {
    const { result } = renderHook(() => useEditorScheme(), { wrapper });
    const initial = result.current.lightsScheme.scheme;

    act(() => {
      result.current.handleUpdate({ ...initial, name: 'a' });
      result.current.handleUpdate({ ...initial, name: 'b' });
    });
    act(() => result.current.handleUndo());
    expect(result.current.lightsScheme.scheme.name).toBe('a');
    act(() => result.current.handleUndo());
    expect(result.current.lightsScheme.scheme).toEqual(initial);
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

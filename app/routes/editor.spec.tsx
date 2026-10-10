import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LIGHTS_SCHEME } from '../../lib/lights/lights.config';
import type { LightColor } from '../../lib/lights/lights.types';
import { SCHEME_PRESETS } from '../../lib/schemes/schemePresets';
import { getLocalSchemes, saveLocalScheme } from '../../lib/schemes/schemesStorage';
import EditorPage from './editor';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <EditorPage />
    </MemoryRouter>,
  );

describe('EditorPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads local scheme from query', () => {
    saveLocalScheme({
      uid: 'saved',
      updatedAt: '2026-10-10T10:00:00.000Z',
      scheme: { name: 'Saved one', frames: [{ type: 0, tempo: 60, colors: [1] as LightColor[] }] },
    });

    renderAt('/editor?scheme=saved');

    expect(screen.getByDisplayValue('Saved one')).toBeTruthy();
  });

  it('starts new scheme for unknown uid', () => {
    renderAt('/editor?scheme=missing');

    expect(screen.getByDisplayValue(DEFAULT_LIGHTS_SCHEME.name)).toBeTruthy();
  });

  it('opens preset as new local copy', () => {
    const [preset] = SCHEME_PRESETS;
    renderAt(`/editor?preset=${preset?.uid ?? ''}`);

    expect(screen.getByDisplayValue(preset?.scheme.name ?? '')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const [saved] = getLocalSchemes();
    expect(saved?.scheme.name).toBe(preset?.scheme.name);
    expect(saved?.uid).not.toBe(preset?.uid);
  });
});

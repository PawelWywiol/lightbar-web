import { fireEvent, render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LIGHTS_SCHEME } from '../../lib/lights/lights.config';
import type { LightColor, LightsSchemeData } from '../../lib/lights/lights.types';
import { getOnlineScheme } from '../../lib/schemes/schemesApi';
import { getLocalSchemes, saveLocalScheme } from '../../lib/schemes/schemesStorage';
import EditorPage, { clientLoader } from './editor';

vi.mock('../../lib/schemes/schemesApi', () => ({ getOnlineScheme: vi.fn() }));

const schemeData = (uid: string, name: string): LightsSchemeData => ({
  uid,
  updatedAt: '2026-10-10T10:00:00.000Z',
  scheme: { name, frames: [{ type: 0, tempo: 60, colors: [1] as LightColor[] }] },
});

const renderAt = (path: string) => {
  const Stub = createRoutesStub([{ path: '/editor', Component: EditorPage, loader: clientLoader }]);
  render(<Stub initialEntries={[path]} />);
};

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

  it('loads local scheme from query', async () => {
    saveLocalScheme(schemeData('saved', 'Saved one'));

    renderAt('/editor?scheme=saved');

    expect(await screen.findByDisplayValue('Saved one')).toBeTruthy();
  });

  it('starts new scheme for unknown uid', async () => {
    renderAt('/editor?scheme=missing');

    expect(await screen.findByDisplayValue(DEFAULT_LIGHTS_SCHEME.name)).toBeTruthy();
  });

  it('opens online scheme as new local copy', async () => {
    vi.mocked(getOnlineScheme).mockResolvedValue(schemeData('online-1', 'Online one'));

    renderAt('/editor?online=online-1');
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(screen.getByDisplayValue('Online one')).toBeTruthy();
    const [saved] = getLocalSchemes();
    expect(saved?.scheme.name).toBe('Online one');
    expect(saved?.uid).not.toBe('online-1');
  });

  it('starts new scheme when online scheme cannot be loaded', async () => {
    vi.mocked(getOnlineScheme).mockRejectedValue(new Error('offline'));

    renderAt('/editor?online=online-1');

    expect(await screen.findByDisplayValue(DEFAULT_LIGHTS_SCHEME.name)).toBeTruthy();
  });
});

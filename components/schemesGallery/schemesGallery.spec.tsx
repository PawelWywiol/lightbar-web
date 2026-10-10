import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import type { LightColor, LightsSchemeData } from '../../lib/lights/lights.types';
import { SCHEME_PRESETS } from '../../lib/schemes/schemePresets';
import { getLocalSchemes, saveLocalScheme } from '../../lib/schemes/schemesStorage';
import { SchemesGallery } from './schemesGallery';

const schemeData = (uid: string, name: string, updatedAt: string): LightsSchemeData => ({
  uid,
  updatedAt,
  scheme: { name, frames: [{ type: 0, tempo: 60, colors: [1, 2] as LightColor[] }] },
});

const renderGallery = () =>
  render(
    <MemoryRouter>
      <SchemesGallery />
    </MemoryRouter>,
  );

const tile = (name: string) => screen.getByRole('heading', { name }).closest('li') as HTMLElement;

describe('SchemesGallery', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    saveLocalScheme(schemeData('a', 'First', '2026-10-10T10:00:00.000Z'));
    saveLocalScheme(schemeData('b', 'Second', '2026-10-10T11:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists local schemes newest first, then presets', () => {
    renderGallery();

    const names = screen.getAllByRole('heading').map((heading) => heading.textContent);
    expect(names).toEqual(['Second', 'First', ...SCHEME_PRESETS.map(({ scheme }) => scheme.name)]);
  });

  it('marks local schemes and links them to editor', () => {
    renderGallery();

    expect(within(tile('Second')).getByText(MESSAGES.schemes.local)).toBeTruthy();
    expect(within(tile('Second')).getByRole('link', { name: MESSAGES.schemes.open })).toHaveAttribute(
      'href',
      '/editor?scheme=b',
    );
  });

  it('shows presets read-only and opens them as copy', () => {
    const [preset] = SCHEME_PRESETS;
    renderGallery();
    const presetTile = tile(preset?.scheme.name ?? '');

    expect(within(presetTile).queryByText(MESSAGES.schemes.local)).toBeNull();
    expect(within(presetTile).queryByRole('button', { name: MESSAGES.common.delete })).toBeNull();
    expect(within(presetTile).getByRole('link', { name: MESSAGES.schemes.open })).toHaveAttribute(
      'href',
      `/editor?preset=${preset?.uid ?? ''}`,
    );
  });

  it('sends scheme to device', () => {
    const listener = vi.fn();
    document.addEventListener('app:save:scheme', listener);
    renderGallery();

    fireEvent.click(within(tile('Second')).getByRole('button', { name: MESSAGES.schemes.send }));

    const [[event]] = listener.mock.calls as [[CustomEvent<{ uid: string }>]];
    expect(event.detail.uid).toBe('b');
    document.removeEventListener('app:save:scheme', listener);
  });

  it('deletes local scheme', () => {
    renderGallery();

    fireEvent.click(within(tile('Second')).getByRole('button', { name: MESSAGES.common.delete }));

    expect(screen.queryByRole('heading', { name: 'Second' })).toBeNull();
    expect(getLocalSchemes().map(({ uid }) => uid)).toEqual(['a']);
  });
});

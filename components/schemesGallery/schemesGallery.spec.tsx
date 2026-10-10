import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import type { LightColor, LightsSchemeData } from '../../lib/lights/lights.types';
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

  it('lists local schemes newest first with local badge and editor links', () => {
    renderGallery();

    const links = screen.getAllByRole('link', { name: MESSAGES.schemes.open });
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual(['Second', 'First']);
    expect(screen.getAllByText(MESSAGES.schemes.local)).toHaveLength(2);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/editor?scheme=b', '/editor?scheme=a']);
  });

  it('sends scheme to device', () => {
    const listener = vi.fn();
    document.addEventListener('app:save:scheme', listener);
    renderGallery();

    fireEvent.click(screen.getAllByRole('button', { name: MESSAGES.schemes.send })[0] as HTMLElement);

    const [[event]] = listener.mock.calls as [[CustomEvent<{ uid: string }>]];
    expect(event.detail.uid).toBe('b');
    document.removeEventListener('app:save:scheme', listener);
  });

  it('deletes scheme', () => {
    renderGallery();

    fireEvent.click(screen.getAllByRole('button', { name: MESSAGES.common.delete })[0] as HTMLElement);

    expect(screen.queryByText('Second')).toBeNull();
    expect(getLocalSchemes().map(({ uid }) => uid)).toEqual(['a']);
  });

  it('shows empty state', () => {
    localStorage.clear();
    renderGallery();

    expect(screen.getByText(MESSAGES.schemes.empty)).toBeTruthy();
  });
});

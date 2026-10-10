import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import type { LightColor, LightsSchemeData } from '../../lib/lights/lights.types';
import { deleteOnlineScheme, getSession } from '../../lib/schemes/schemesAdminApi';
import { getOnlineSchemes } from '../../lib/schemes/schemesApi';
import { getLocalSchemes, saveLocalScheme } from '../../lib/schemes/schemesStorage';
import { SessionProvider } from '../../lib/session/sessionProvider';
import { SchemesGallery } from './schemesGallery';

const schemeData = (uid: string, name: string, updatedAt: string): LightsSchemeData => ({
  uid,
  updatedAt,
  scheme: { name, frames: [{ type: 0, tempo: 60, colors: [1, 2] as LightColor[] }] },
});

vi.mock('../../lib/schemes/schemesApi', () => ({ getOnlineSchemes: vi.fn() }));
vi.mock('../../lib/schemes/schemesAdminApi', () => ({ getSession: vi.fn(), deleteOnlineScheme: vi.fn() }));

const ONLINE = [schemeData('online-1', 'Online one', '2026-10-09T10:00:00.000Z')];

const renderGallery = () =>
  render(
    <MemoryRouter>
      <SessionProvider>
        <SchemesGallery />
      </SessionProvider>
    </MemoryRouter>,
  );

const tile = (name: string) => screen.getByRole('heading', { name }).closest('li') as HTMLElement;

describe('SchemesGallery', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.mocked(getOnlineSchemes).mockResolvedValue(ONLINE);
    vi.mocked(getSession).mockResolvedValue(undefined);
    saveLocalScheme(schemeData('a', 'First', '2026-10-10T10:00:00.000Z'));
    saveLocalScheme(schemeData('b', 'Second', '2026-10-10T11:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists local schemes newest first, then online schemes', async () => {
    renderGallery();

    await screen.findByRole('heading', { name: 'Online one' });
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual([
      'Second',
      'First',
      'Online one',
    ]);
  });

  it('marks local schemes and links them to editor', () => {
    renderGallery();

    expect(within(tile('Second')).getByText(MESSAGES.schemes.local)).toBeTruthy();
    expect(within(tile('Second')).getByRole('link', { name: MESSAGES.schemes.open })).toHaveAttribute(
      'href',
      '/editor?scheme=b',
    );
  });

  it('shows online schemes read-only and opens them as copy', async () => {
    renderGallery();
    await screen.findByRole('heading', { name: 'Online one' });
    const onlineTile = tile('Online one');

    expect(within(onlineTile).queryByText(MESSAGES.schemes.local)).toBeNull();
    expect(within(onlineTile).queryByRole('button', { name: MESSAGES.common.delete })).toBeNull();
    expect(within(onlineTile).getByRole('link', { name: MESSAGES.schemes.open })).toHaveAttribute(
      'href',
      '/editor?online=online-1',
    );
  });

  it('shows message when online schemes are unavailable', async () => {
    vi.mocked(getOnlineSchemes).mockRejectedValue(new Error('offline'));
    renderGallery();

    expect(await screen.findByText(MESSAGES.schemes.onlineUnavailable)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Second' })).toBeTruthy();
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

  it('deletes local scheme', async () => {
    renderGallery();
    await waitFor(() => expect(getOnlineSchemes).toHaveBeenCalled());

    fireEvent.click(within(tile('Second')).getByRole('button', { name: MESSAGES.common.delete }));

    expect(screen.queryByRole('heading', { name: 'Second' })).toBeNull();
    expect(getLocalSchemes().map(({ uid }) => uid)).toEqual(['a']);
  });

  it('lets owner delete own online scheme', async () => {
    vi.mocked(getSession).mockResolvedValue({ email: 'a@b.c', isAdmin: false, schemeIds: ['online-1'] });
    vi.mocked(deleteOnlineScheme).mockResolvedValue();
    renderGallery();
    await screen.findByRole('heading', { name: 'Online one' });

    fireEvent.click(await within(tile('Online one')).findByRole('button', { name: MESSAGES.common.delete }));

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Online one' })).toBeNull());
    expect(deleteOnlineScheme).toHaveBeenCalledWith('online-1');
    expect(within(tile('Second')).getByText(MESSAGES.schemes.local)).toBeTruthy();
  });

  it('keeps online scheme and shows message when delete fails', async () => {
    vi.mocked(getSession).mockResolvedValue({ email: 'a@b.c', isAdmin: true, schemeIds: [] });
    vi.mocked(deleteOnlineScheme).mockRejectedValue(new Error('500'));
    renderGallery();
    await screen.findByRole('heading', { name: 'Online one' });

    fireEvent.click(await within(tile('Online one')).findByRole('button', { name: MESSAGES.common.delete }));

    expect(await screen.findByText(MESSAGES.schemes.onlineDeleteFailed)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Online one' })).toBeTruthy();
  });
});

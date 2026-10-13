import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import type { LightColor, LightsSchemeData } from '../../lib/lights/lights.types';
import { deleteOnlineScheme, getSession } from '../../lib/schemes/schemesAdminApi';
import { getOnlineSchemes } from '../../lib/schemes/schemesApi';
import { getLocalSchemes, saveLocalScheme } from '../../lib/schemes/schemesStorage';
import { SessionProvider } from '../../lib/session/sessionProvider';
import { SchemesGallery, SchemesRails } from './schemesGallery';

const schemeData = (uid: string, name: string, updatedAt: string): LightsSchemeData => ({
  uid,
  updatedAt,
  scheme: {
    name,
    frames: [{ type: 0, shuffle: false, hueShift: 0, pixelShift: 0, tempo: 60, colors: [1, 2] as LightColor[] }],
  },
});

vi.mock('../../lib/schemes/schemesApi', () => ({ getOnlineSchemes: vi.fn() }));
vi.mock('../../lib/schemes/schemesAdminApi', () => ({ getSession: vi.fn(), deleteOnlineScheme: vi.fn() }));

const ONLINE = [schemeData('online-1', 'Online one', '2026-10-09T10:00:00.000Z')];

const EditorProbe = () => <output aria-label="editor">{useLocation().search}</output>;

const renderWithRouter = (ui: ReactElement) =>
  render(
    <MemoryRouter>
      <SessionProvider>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/editor" element={<EditorProbe />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );

const renderGallery = () => renderWithRouter(<SchemesGallery />);

const section = (title: string) => screen.getByRole('heading', { name: title }).closest('section') as HTMLElement;

const tile = (name: string) => screen.getByRole('heading', { name }).closest('li') as HTMLElement;

const openMenu = (name: string) =>
  fireEvent.keyDown(screen.getByRole('button', { name: `${MESSAGES.schemes.actions} ${name}` }), { key: 'Enter' });

const clickMenuItem = async (name: string, item: string) => {
  openMenu(name);
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
};

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

  it('lists local schemes then online schemes, each sorted by name', async () => {
    renderGallery();

    await screen.findByRole('heading', { name: 'Online one' });
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'First',
      'Second',
      'Online one',
    ]);
  });

  it('shows local schemes in own section and opens them in editor', async () => {
    renderGallery();

    expect(section(MESSAGES.schemes.mine)).toContainElement(tile('Second'));
    await clickMenuItem('Second', MESSAGES.schemes.open);

    expect(await screen.findByLabelText('editor')).toHaveTextContent('?scheme=b');
  });

  it('shows online schemes read-only and opens them as copy', async () => {
    renderGallery();
    await screen.findByRole('heading', { name: 'Online one' });

    expect(section(MESSAGES.schemes.library)).toContainElement(tile('Online one'));
    openMenu('Online one');
    await screen.findByRole('menuitem', { name: MESSAGES.schemes.open });
    expect(screen.queryByRole('menuitem', { name: MESSAGES.common.delete })).toBeNull();
    fireEvent.click(screen.getByRole('menuitem', { name: MESSAGES.schemes.open }));

    expect(await screen.findByLabelText('editor')).toHaveTextContent('?online=online-1');
  });

  it('shows message when online schemes are unavailable', async () => {
    vi.mocked(getOnlineSchemes).mockRejectedValue(new Error('offline'));
    renderGallery();

    expect(await screen.findByText(MESSAGES.schemes.onlineUnavailable)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Second' })).toBeTruthy();
  });

  it('sends scheme to device on tile click', () => {
    const listener = vi.fn();
    document.addEventListener('app:save:scheme', listener);
    renderGallery();

    fireEvent.click(screen.getByRole('button', { name: `${MESSAGES.schemes.play} Second` }));

    const [[event]] = listener.mock.calls as [[CustomEvent<{ uid: string }>]];
    expect(event.detail.uid).toBe('b');
    document.removeEventListener('app:save:scheme', listener);
  });

  it('deletes local scheme', async () => {
    renderGallery();
    await waitFor(() => expect(getOnlineSchemes).toHaveBeenCalled());

    await clickMenuItem('Second', MESSAGES.common.delete);

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Second' })).toBeNull());
    expect(getLocalSchemes().map(({ uid }) => uid)).toEqual(['a']);
  });

  it('lets owner delete own online scheme', async () => {
    vi.mocked(getSession).mockResolvedValue({ email: 'a@b.c', isAdmin: false, schemeIds: ['online-1'] });
    vi.mocked(deleteOnlineScheme).mockResolvedValue();
    renderGallery();
    await screen.findByRole('heading', { name: 'Online one' });
    await waitFor(() => expect(getSession).toHaveBeenCalled());

    await clickMenuItem('Online one', MESSAGES.common.delete);

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Online one' })).toBeNull());
    expect(deleteOnlineScheme).toHaveBeenCalledWith('online-1');
    expect(tile('Second')).toBeTruthy();
  });

  it('keeps online scheme and shows message when delete fails', async () => {
    vi.mocked(getSession).mockResolvedValue({ email: 'a@b.c', isAdmin: true, schemeIds: [] });
    vi.mocked(deleteOnlineScheme).mockRejectedValue(new Error('500'));
    renderGallery();
    await screen.findByRole('heading', { name: 'Online one' });
    await waitFor(() => expect(getSession).toHaveBeenCalled());

    await clickMenuItem('Online one', MESSAGES.common.delete);

    expect(await screen.findByText(MESSAGES.schemes.onlineDeleteFailed)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Online one' })).toBeTruthy();
  });
});

describe('SchemesRails', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.mocked(getOnlineSchemes).mockResolvedValue(ONLINE);
    vi.mocked(getSession).mockResolvedValue(undefined);
    saveLocalScheme(schemeData('b', 'Second', '2026-10-10T11:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a scheme to favorites and keeps it after reload', async () => {
    const { unmount } = renderWithRouter(<SchemesRails />);
    expect(screen.getByText(MESSAGES.schemes.favoritesEmpty)).toBeTruthy();

    await clickMenuItem('Second', MESSAGES.schemes.addFavorite);

    expect(within(section(MESSAGES.schemes.favorites)).getByRole('heading', { name: 'Second' })).toBeTruthy();
    unmount();
    renderWithRouter(<SchemesRails />);
    expect(within(section(MESSAGES.schemes.favorites)).getByRole('heading', { name: 'Second' })).toBeTruthy();
  });
});

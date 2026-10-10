import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../../lib/config/messages';
import type { LightColor, LightsSchemeData } from '../../../lib/lights/lights.types';
import {
  getSession,
  publishScheme,
  type Session,
  SessionExpiredError,
  updateOnlineScheme,
} from '../../../lib/schemes/schemesAdminApi';
import { SessionProvider } from '../../../lib/session/sessionProvider';
import { EditorProviders } from '../providers';
import { EditorPublishButton } from './editorPublishButton';

vi.mock('../../../lib/schemes/schemesAdminApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../lib/schemes/schemesAdminApi')>()),
  getSession: vi.fn(),
  publishScheme: vi.fn(),
  updateOnlineScheme: vi.fn(),
}));

const schemeData: LightsSchemeData = {
  uid: 'local-uid',
  updatedAt: '2026-10-10T10:00:00.000Z',
  scheme: { name: 'Mine', frames: [{ type: 0, tempo: 60, colors: [1] as LightColor[] }] },
};

const AUTHOR: Session = { email: 'a@b.c', isAdmin: false, schemeIds: ['own-online'] };

const renderButton = (onlineId?: string) =>
  render(
    <SessionProvider>
      <EditorProviders initialSchemeData={schemeData} initialOnlineId={onlineId}>
        <EditorPublishButton />
      </EditorProviders>
    </SessionProvider>,
  );

const publish = async () => fireEvent.click(await screen.findByRole('button', { name: MESSAGES.editor.publish }));

describe('EditorPublishButton', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockResolvedValue(AUTHOR);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('is hidden when logged out', async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    renderButton();

    await waitFor(() => expect(getSession).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: MESSAGES.editor.publish })).toBeNull();
  });

  it('creates new online scheme, then updates it on next publish', async () => {
    vi.mocked(publishScheme).mockResolvedValue('new-online');
    vi.mocked(getSession)
      .mockResolvedValueOnce(AUTHOR)
      .mockResolvedValue({ ...AUTHOR, schemeIds: ['new-online', 'own-online'] });
    renderButton();

    await publish();
    expect(await screen.findByText(MESSAGES.editor.published)).toBeTruthy();
    await publish();

    await waitFor(() => expect(updateOnlineScheme).toHaveBeenCalledWith('new-online', schemeData.scheme));
    expect(publishScheme).toHaveBeenCalledTimes(1);
  });

  it('updates own online source scheme', async () => {
    renderButton('own-online');

    await publish();

    await waitFor(() => expect(updateOnlineScheme).toHaveBeenCalledWith('own-online', schemeData.scheme));
    expect(publishScheme).not.toHaveBeenCalled();
  });

  it('publishes copy of foreign online scheme as new', async () => {
    vi.mocked(publishScheme).mockResolvedValue('copy');
    renderButton('preset-fire');

    await publish();

    await waitFor(() => expect(publishScheme).toHaveBeenCalledWith(schemeData.scheme));
    expect(updateOnlineScheme).not.toHaveBeenCalled();
  });

  it('reports expired session and failure', async () => {
    vi.mocked(publishScheme).mockRejectedValueOnce(new SessionExpiredError()).mockRejectedValueOnce(new Error('500'));
    renderButton();

    await publish();
    expect(await screen.findByText(MESSAGES.editor.sessionExpired)).toBeTruthy();
    await publish();
    expect(await screen.findByText(MESSAGES.editor.publishFailed)).toBeTruthy();
  });
});

import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { getSession } from '../schemes/schemesAdminApi';
import { canManageOnlineScheme, SessionProvider, useSession } from './sessionProvider';

vi.mock('../schemes/schemesAdminApi', () => ({ getSession: vi.fn() }));

const wrapper = ({ children }: { children: ReactNode }) => <SessionProvider>{children}</SessionProvider>;

describe('SessionProvider', () => {
  it('loads session on mount', async () => {
    vi.mocked(getSession).mockResolvedValue({ email: 'a@b.c', isAdmin: false, schemeIds: [] });

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.session?.email).toBe('a@b.c'));
  });

  it('stays logged out when session request fails', async () => {
    vi.mocked(getSession).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(getSession).toHaveBeenCalled());
    expect(result.current.session).toBeUndefined();
  });

  it('allows managing own schemes or any as admin', () => {
    const author = { email: 'a', isAdmin: false, schemeIds: ['mine'] };

    expect(canManageOnlineScheme(undefined, 'mine')).toBe(false);
    expect(canManageOnlineScheme(author, 'mine')).toBe(true);
    expect(canManageOnlineScheme(author, 'other')).toBe(false);
    expect(canManageOnlineScheme({ ...author, isAdmin: true }, 'other')).toBe(true);
  });
});

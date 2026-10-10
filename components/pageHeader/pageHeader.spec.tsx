import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { MESSAGES } from '../../lib/config/messages';
import { ConnectedDevicesProvider } from '../../lib/devices/devicesProvider';
import { getSession } from '../../lib/schemes/schemesAdminApi';
import { SessionProvider } from '../../lib/session/sessionProvider';
import { PageHeader } from './pageHeader';

vi.mock('../../lib/schemes/schemesAdminApi', () => ({ getSession: vi.fn() }));

const renderHeader = () => {
  const Stub = createRoutesStub([
    {
      path: '/',
      Component: () => (
        <SessionProvider>
          <ConnectedDevicesProvider>
            <PageHeader />
          </ConnectedDevicesProvider>
        </SessionProvider>
      ),
    },
  ]);

  render(<Stub initialEntries={['/']} />);
};

describe('PageHeader', () => {
  it('should render section with info', () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    renderHeader();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lightbar');
    expect(screen.getByRole('link', { name: 'Schemes' })).toHaveAttribute('href', '/schemes');
  });

  it('shows log in link when logged out', async () => {
    vi.mocked(getSession).mockResolvedValue(undefined);
    renderHeader();

    expect(await screen.findByRole('link', { name: MESSAGES.session.logIn })).toHaveAttribute(
      'href',
      '/api/admin/login',
    );
  });

  it('shows log out link with email when logged in', async () => {
    vi.mocked(getSession).mockResolvedValue({ email: 'a@b.c', isAdmin: false, schemeIds: [] });
    renderHeader();

    const logOut = await screen.findByRole('link', { name: `${MESSAGES.session.logOut} a@b.c` });
    expect(logOut).toHaveAttribute('href', '/cdn-cgi/access/logout');
  });
});

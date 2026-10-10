import { LogInIcon, LogOutIcon } from 'lucide-react';
import { Link } from 'react-router';
import { APP_NAME } from '../../lib/config/app';
import { MESSAGES } from '../../lib/config/messages';
import { useSession } from '../../lib/session/sessionProvider';

import { ConnectedDevicesDialog } from '../connectedDevice/connectedDevicesDialog';

const SessionLink = () => {
  const { session, logOut } = useSession();

  return session ? (
    <button
      type="button"
      aria-label={`${MESSAGES.session.logOut} ${session.email}`}
      title={session.email}
      onClick={() => void logOut()}
    >
      <LogOutIcon className="w-4 h-4" />
    </button>
  ) : (
    <a href="/api/admin/login" aria-label={MESSAGES.session.logIn} title={MESSAGES.session.logIn}>
      <LogInIcon className="w-4 h-4" />
    </a>
  );
};

export const PageHeader = () => (
  <header className="container p-4">
    <div className="flex justify-between items-center">
      <h1>
        <Link to="/">{APP_NAME}</Link>
      </h1>
      <nav>
        <ul className="flex flex-row justify-items-start items-center list-none gap-4">
          <li>
            <Link to="/editor">Editor</Link>
          </li>
          <li>
            <Link to="/schemes">{MESSAGES.schemes.title}</Link>
          </li>
          <li>
            <ConnectedDevicesDialog />
          </li>
          <li className="flex">
            <SessionLink />
          </li>
        </ul>
      </nav>
    </div>
  </header>
);

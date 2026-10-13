import { LogInIcon, LogOutIcon } from 'lucide-react';
import { Link } from 'react-router';
import { APP_NAME } from '../../lib/config/app';
import { useMessages } from '../../lib/i18n/i18n';
import { useSession } from '../../lib/session/sessionProvider';

import { ConnectedDevicesDialog } from '../connectedDevice/connectedDevicesDialog';

const SessionLink = () => {
  const { session, logOut } = useSession();
  const messages = useMessages();

  return session ? (
    <button
      type="button"
      aria-label={`${messages.session.logOut} ${session.email}`}
      title={session.email}
      onClick={() => void logOut()}
    >
      <LogOutIcon className="w-4 h-4" />
    </button>
  ) : (
    <a href="/api/admin/login" aria-label={messages.session.logIn} title={messages.session.logIn}>
      <LogInIcon className="w-4 h-4" />
    </a>
  );
};

export const PageHeader = () => {
  const messages = useMessages();

  return (
    <header className="container p-4">
      <div className="flex justify-between items-center">
        <h1>
          <Link to="/">{APP_NAME}</Link>
        </h1>
        <nav>
          <ul className="flex flex-row justify-items-start items-center list-none gap-4">
            <li>
              <Link to="/editor">{messages.page.editor}</Link>
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
};

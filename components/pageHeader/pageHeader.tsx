import { Link } from 'react-router';
import { APP_NAME } from '../../lib/config/app';

import { ConnectedDevicesDialog } from '../connectedDevice/connectedDevicesDialog';

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
            <ConnectedDevicesDialog />
          </li>
        </ul>
      </nav>
    </div>
  </header>
);

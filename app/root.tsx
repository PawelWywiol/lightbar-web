import * as Sentry from '@sentry/react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from 'react-router';
import { PageHeader } from '../components/pageHeader/pageHeader';
import { ConnectedDevicesProvider } from '../lib/devices/devicesProvider';

import '../lib/ui/tailwind-theme.css';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="relative dark">
        <ConnectedDevicesProvider>
          <PageHeader />
          <main className="flex-1 relative flex flex-col">{children}</main>
        </ConnectedDevicesProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

const App = () => <Outlet />;

export const ErrorBoundary = () => {
  const error = useRouteError();
  Sentry.captureException(error);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="text-gray-400 mb-4">An unexpected error occurred. Please try again.</p>
      <a href="/" className="text-blue-400 hover:underline">
        Go back home
      </a>
    </div>
  );
};

export default App;

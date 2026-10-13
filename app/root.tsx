import * as Sentry from '@sentry/react';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from 'react-router';
import { PageHeader } from '../components/pageHeader/pageHeader';
import { ConnectedDevicesProvider } from '../lib/devices/devicesProvider';
import { useDocumentLanguage, useMessages } from '../lib/i18n/i18n';
import { SessionProvider } from '../lib/session/sessionProvider';

import '../lib/ui/tailwind-theme.css';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  useDocumentLanguage();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="relative has-[[data-tab-bar]]:pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:has-[[data-tab-bar]]:pb-0">
        <SessionProvider>
          <ConnectedDevicesProvider>
            <PageHeader />
            <main className="flex-1 relative flex flex-col md:pl-56">{children}</main>
          </ConnectedDevicesProvider>
        </SessionProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

const App = () => <Outlet />;

export const ErrorBoundary = () => {
  const error = useRouteError();
  const messages = useMessages();
  Sentry.captureException(error);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">{messages.error.title}</h1>
      <p className="text-muted-foreground mb-4">{messages.error.description}</p>
      <a href="/" className="text-primary hover:underline">
        {messages.error.goHome}
      </a>
    </div>
  );
};

export default App;

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSession, type Session } from '../schemes/schemesAdminApi';

interface SessionContextValue {
  session?: Session | undefined;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({ refreshSession: async () => {} });

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | undefined>();

  const refreshSession = useCallback(async () => {
    setSession(await getSession().catch(() => undefined));
  }, []);

  useEffect(() => {
    let isActive = true;

    getSession()
      .catch(() => undefined)
      .then((result) => {
        if (isActive) setSession(result);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const value = useMemo(() => ({ session, refreshSession }), [session, refreshSession]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSession = () => useContext(SessionContext);

export const canManageOnlineScheme = (session: Session | undefined, id: string) =>
  !!session && (session.isAdmin || session.schemeIds.includes(id));

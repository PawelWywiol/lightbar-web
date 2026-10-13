import { HouseIcon, LayoutGridIcon, LogInIcon, LogOutIcon, PencilIcon, RectangleEllipsisIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSyncExternalStore } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { APP_NAME } from '../../lib/config/app';
import { useMessages } from '../../lib/i18n/i18n';
import { useSession } from '../../lib/session/sessionProvider';
import { cn } from '../../lib/ui/utils/cn';
import { ConnectedDevicesDialog } from '../connectedDevice/connectedDevicesDialog';

const noopSubscribe = () => () => undefined;

// SPA HTML is prerendered for '/'; links remount after hydration so the active state matches the real URL
const useIsHydrated = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

export const SessionLink = ({ className }: { className?: string }) => {
  const { session, logOut } = useSession();
  const messages = useMessages();
  const linkClassName = cn(
    'grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground',
    className,
  );

  return session ? (
    <button
      type="button"
      className={linkClassName}
      aria-label={`${messages.session.logOut} ${session.email}`}
      title={session.email}
      onClick={() => void logOut()}
    >
      <LogOutIcon className="w-4 h-4" />
    </button>
  ) : (
    <a
      href="/api/admin/login"
      className={linkClassName}
      aria-label={messages.session.logIn}
      title={messages.session.logIn}
    >
      <LogInIcon className="w-4 h-4" />
    </a>
  );
};

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
}

const useNavItems = (): NavItem[] => {
  const messages = useMessages();

  return [
    { to: '/', icon: <HouseIcon />, label: messages.page.home },
    { to: '/schemes', icon: <LayoutGridIcon />, label: messages.page.schemes },
    { to: '/editor', icon: <PencilIcon />, label: messages.page.editor },
  ];
};

const NavItemLink = ({ item, className }: { item: NavItem; className: (isActive: boolean) => string }) => {
  const isHydrated = useIsHydrated();

  return (
    <NavLink key={`${isHydrated}`} to={item.to} end className={({ isActive }) => className(isActive)}>
      {item.icon}
      {item.label}
    </NavLink>
  );
};

const tabClassName = 'flex flex-1 cursor-pointer flex-col items-center gap-1 text-2xs text-muted-foreground';

const TabBar = () => {
  const messages = useMessages();
  const isHydrated = useIsHydrated();
  const { pathname } = useLocation();
  const navItems = useNavItems();

  if (isHydrated && pathname === '/editor') return null;

  return (
    <nav data-tab-bar className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/85 backdrop-blur-lg md:hidden">
      <div className="grid grid-cols-4 px-2 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] [&_svg]:h-5 [&_svg]:w-5">
        {navItems.map((item) => (
          <NavItemLink
            key={item.to}
            item={item}
            className={(isActive) => cn(tabClassName, isActive && 'text-foreground')}
          />
        ))}
        <ConnectedDevicesDialog
          trigger={
            <button type="button" className={tabClassName}>
              <RectangleEllipsisIcon />
              {messages.device.triggerDialogLabel}
            </button>
          }
        />
      </div>
    </nav>
  );
};

const sideClassName =
  'flex h-10 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:h-5 [&_svg]:w-5';

const SideBar = () => {
  const messages = useMessages();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col gap-6 border-r bg-background/60 p-4 backdrop-blur-lg md:flex">
      <h1 className="px-3 pt-2 text-base font-extrabold tracking-tight">
        <Link to="/" className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-4 w-4 rounded-[5px] bg-[conic-gradient(#ff3d5a,#ffb02e,#3dff8a,#2ec5ff,#a24bff,#ff3d5a)]"
          />
          {APP_NAME}
        </Link>
      </h1>
      <nav className="flex flex-col gap-1">
        {useNavItems().map((item) => (
          <NavItemLink
            key={item.to}
            item={item}
            className={(isActive) => cn(sideClassName, isActive && 'bg-accent text-foreground')}
          />
        ))}
        <ConnectedDevicesDialog
          trigger={
            <button type="button" className={sideClassName}>
              <RectangleEllipsisIcon />
              {messages.device.triggerDialogLabel}
            </button>
          }
        />
      </nav>
      <SessionLink className="mt-auto ml-1" />
    </aside>
  );
};

export const PageHeader = () => (
  <>
    <SideBar />
    <TabBar />
  </>
);

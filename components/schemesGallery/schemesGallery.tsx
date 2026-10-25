import { EllipsisIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import type { SaveSchemeDeviceEvent } from '../../lib/devices/devicesEvents';
import { useMessages, usePlural } from '../../lib/i18n/i18n';
import { resolveSchemePeriod } from '../../lib/lights/lights.config';
import type { LightsSchemeData } from '../../lib/lights/lights.types';
import { canManageOnlineScheme, useSession } from '../../lib/session/sessionProvider';
import { DropDownMenuWrapper } from '../../lib/ui/dropdownMenu/dropdownMenu';
import { cn } from '../../lib/ui/utils/cn';
import { getLightsCount } from '../editor/editor.utils';
import { dispatchCustomEvent } from '../../lib/utils/customEvent/customEvent';
import { SchemePreview } from '../schemePreview/schemePreview';
import { useLastSentScheme, useSchemes } from './useSchemes';

const sendToDevice = ({ uid, scheme }: LightsSchemeData) => {
  dispatchCustomEvent<SaveSchemeDeviceEvent>({ name: 'app:save:scheme', detail: { uid, scheme } });
};

interface SchemeTileProps {
  schemeData: LightsSchemeData;
  editorUrl: string;
  isActive: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onDelete?: (() => void) | undefined;
  className?: string;
}

const SchemeTile = ({
  schemeData,
  editorUrl,
  isActive,
  isFavorite,
  onToggleFavorite,
  onDelete,
  className,
}: SchemeTileProps) => {
  const messages = useMessages();
  const plural = usePlural();
  const navigate = useNavigate();
  const { name, frames } = schemeData.scheme;
  const lengthLabel =
    resolveSchemePeriod(frames) === 1
      ? messages.schemes.anyLength
      : plural(getLightsCount(schemeData.scheme), messages.device.leds);

  return (
    <li className={cn('relative', className)}>
      <button
        type="button"
        aria-label={`${messages.schemes.play} ${name}`}
        aria-pressed={isActive}
        onClick={() => sendToDevice(schemeData)}
        className={cn(
          'flex w-full cursor-pointer flex-col gap-2.5 rounded-2xl border bg-card p-2.5 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive && 'border-primary shadow-[inset_0_0_0_1px] shadow-primary',
        )}
      >
        <SchemePreview frames={schemeData.scheme.frames} pitch={14} />
        <div className="flex flex-col pr-6">
          <h3 className="truncate text-13 font-bold">{name}</h3>
          <span className="truncate text-2xs text-muted-foreground">{lengthLabel}</span>
        </div>
      </button>
      <DropDownMenuWrapper
        trigger={
          <button
            type="button"
            aria-label={`${messages.schemes.actions} ${name}`}
            className="absolute right-1.5 bottom-1.5 grid h-7 w-7 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <EllipsisIcon className="h-4 w-4" />
          </button>
        }
        options={[
          { label: messages.schemes.open, onClick: () => void navigate(editorUrl) },
          {
            label: isFavorite ? messages.schemes.removeFavorite : messages.schemes.addFavorite,
            onClick: onToggleFavorite,
          },
          ...(onDelete ? [{ label: messages.common.delete, onClick: onDelete }] : []),
        ]}
      />
    </li>
  );
};

const Section = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <section className="flex flex-col gap-2">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-md font-bold">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const SectionLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="text-13 text-muted-foreground hover:text-foreground">
    {children}
  </Link>
);

const useTiles = () => {
  const schemes = useSchemes();
  const lastSent = useLastSentScheme();
  const { session } = useSession();

  const tileProps = (schemeData: LightsSchemeData, isLocal: boolean) => ({
    schemeData,
    isActive: lastSent?.uid === schemeData.uid,
    isFavorite: schemes.favoriteIds.includes(schemeData.uid),
    onToggleFavorite: () => schemes.toggleFavorite(schemeData.uid),
    editorUrl: isLocal
      ? `/editor?scheme=${encodeURIComponent(schemeData.uid)}`
      : `/editor?online=${encodeURIComponent(schemeData.uid)}`,
    onDelete: isLocal
      ? () => schemes.deleteLocal(schemeData.uid)
      : canManageOnlineScheme(session, schemeData.uid)
        ? () => void schemes.deleteOnline(schemeData.uid)
        : undefined,
  });

  const isLocal = (schemeData: LightsSchemeData) => schemes.localSchemes.some(({ uid }) => uid === schemeData.uid);

  return { ...schemes, lastSent, tileProps, isLocal };
};

const OnlineStatus = ({ isUnavailable, isDeleteFailed }: { isUnavailable: boolean; isDeleteFailed: boolean }) => {
  const messages = useMessages();

  return (
    <>
      {isDeleteFailed && (
        <p role="alert" className="text-13 text-muted-foreground">
          {messages.schemes.onlineDeleteFailed}
        </p>
      )}
      {isUnavailable && <p className="text-13 text-muted-foreground">{messages.schemes.onlineUnavailable}</p>}
    </>
  );
};

const railClassName =
  '-mx-4 flex list-none snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0';
const railTileClassName = 'w-33 flex-none snap-start';

export const SchemesRails = () => {
  const messages = useMessages();
  const tiles = useTiles();
  const { tileProps } = tiles;

  return (
    <div className="flex flex-col gap-4">
      <Section
        title={messages.schemes.favorites}
        action={<SectionLink to="/schemes">{messages.schemes.all} →</SectionLink>}
      >
        {tiles.favorites.length > 0 ? (
          <ul className={railClassName}>
            {tiles.favorites.map((schemeData) => (
              <SchemeTile
                key={schemeData.uid}
                {...tileProps(schemeData, tiles.isLocal(schemeData))}
                className={railTileClassName}
              />
            ))}
          </ul>
        ) : (
          <p className="text-13 text-muted-foreground">{messages.schemes.favoritesEmpty}</p>
        )}
      </Section>
      <Section
        title={messages.schemes.mine}
        action={<SectionLink to="/editor">+ {messages.schemes.create}</SectionLink>}
      >
        {tiles.localSchemes.length > 0 && (
          <ul className={railClassName}>
            {tiles.localSchemes.map((schemeData) => (
              <SchemeTile key={schemeData.uid} {...tileProps(schemeData, true)} className={railTileClassName} />
            ))}
          </ul>
        )}
      </Section>
      <Section
        title={messages.schemes.library}
        action={<SectionLink to="/schemes">{messages.schemes.all} →</SectionLink>}
      >
        <ul className={railClassName}>
          {tiles.onlineSchemes.map((schemeData) => (
            <SchemeTile key={schemeData.uid} {...tileProps(schemeData, false)} className={railTileClassName} />
          ))}
        </ul>
        <OnlineStatus isUnavailable={tiles.isOnlineUnavailable} isDeleteFailed={tiles.isOnlineDeleteFailed} />
      </Section>
    </div>
  );
};

const gridClassName = 'grid list-none grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

export const SchemesGallery = () => {
  const messages = useMessages();
  const tiles = useTiles();
  const { tileProps } = tiles;

  return (
    <div className="flex flex-col gap-6">
      <Section
        title={messages.schemes.mine}
        action={<SectionLink to="/editor">+ {messages.schemes.create}</SectionLink>}
      >
        {tiles.localSchemes.length > 0 && (
          <ul className={gridClassName}>
            {tiles.localSchemes.map((schemeData) => (
              <SchemeTile key={schemeData.uid} {...tileProps(schemeData, true)} />
            ))}
          </ul>
        )}
      </Section>
      <Section title={messages.schemes.library}>
        <ul className={gridClassName}>
          {tiles.onlineSchemes.map((schemeData) => (
            <SchemeTile key={schemeData.uid} {...tileProps(schemeData, false)} />
          ))}
        </ul>
        <OnlineStatus isUnavailable={tiles.isOnlineUnavailable} isDeleteFailed={tiles.isOnlineDeleteFailed} />
      </Section>
    </div>
  );
};

import { PencilIcon, SendIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { MESSAGES } from '../../lib/config/messages';
import type { SaveSchemeDeviceEvent } from '../../lib/devices/devicesEvents';
import type { LightsSchemeData } from '../../lib/lights/lights.types';
import { getOnlineSchemes } from '../../lib/schemes/schemesApi';
import { getLocalSchemes, removeLocalScheme } from '../../lib/schemes/schemesStorage';
import { Button } from '../../lib/ui/button/button';
import { Tooltip, TooltipProvider } from '../../lib/ui/tooltip/tooltip';
import { dispatchCustomEvent } from '../../lib/utils/customEvent/customEvent';
import { SchemePreview } from '../schemePreview/schemePreview';

const sendToDevice = ({ uid, scheme }: LightsSchemeData) => {
  dispatchCustomEvent<SaveSchemeDeviceEvent>({ name: 'app:save:scheme', detail: { uid, scheme } });
};

interface SchemeTileProps {
  schemeData: LightsSchemeData;
  editorUrl: string;
  onDelete?: (() => void) | undefined;
}

const SchemeTile = ({ schemeData, editorUrl, onDelete }: SchemeTileProps) => (
  <li className="flex flex-col gap-2 rounded-md border p-2">
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <h2 className="truncate">{schemeData.scheme.name}</h2>
        {onDelete && <span className="shrink-0 rounded-md border px-2 text-xs">{MESSAGES.schemes.local}</span>}
      </div>
      <div className="flex shrink-0 gap-1">
        <Tooltip content={MESSAGES.schemes.open}>
          <Button asChild aria-label={MESSAGES.schemes.open}>
            <Link to={editorUrl}>
              <PencilIcon />
            </Link>
          </Button>
        </Tooltip>
        <Tooltip content={MESSAGES.schemes.send}>
          <Button aria-label={MESSAGES.schemes.send} onClick={() => sendToDevice(schemeData)}>
            <SendIcon />
          </Button>
        </Tooltip>
        {onDelete && (
          <Tooltip content={MESSAGES.common.delete}>
            <Button aria-label={MESSAGES.common.delete} onClick={onDelete}>
              <Trash2Icon />
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
    <SchemePreview frames={schemeData.scheme.frames} />
  </li>
);

export const SchemesGallery = () => {
  const [schemes, setSchemes] = useState(getLocalSchemes);
  const [onlineSchemes, setOnlineSchemes] = useState<LightsSchemeData[]>([]);
  const [isOnlineUnavailable, setIsOnlineUnavailable] = useState(false);

  useEffect(() => {
    let isActive = true;

    getOnlineSchemes()
      .then((result) => {
        if (isActive) setOnlineSchemes(result);
      })
      .catch(() => {
        if (isActive) setIsOnlineUnavailable(true);
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleDelete = (uid: string) => {
    removeLocalScheme(uid);
    setSchemes(getLocalSchemes());
  };

  return (
    <TooltipProvider>
      <ul className="grid grid-cols-1 lg:grid-cols-3 gap-4 list-none">
        {schemes.map((schemeData) => (
          <SchemeTile
            key={schemeData.uid}
            schemeData={schemeData}
            editorUrl={`/editor?scheme=${encodeURIComponent(schemeData.uid)}`}
            onDelete={() => handleDelete(schemeData.uid)}
          />
        ))}
        {onlineSchemes.map((schemeData) => (
          <SchemeTile
            key={schemeData.uid}
            schemeData={schemeData}
            editorUrl={`/editor?online=${encodeURIComponent(schemeData.uid)}`}
          />
        ))}
      </ul>
      {isOnlineUnavailable && (
        <p className="mt-4 text-center text-muted-foreground">{MESSAGES.schemes.onlineUnavailable}</p>
      )}
    </TooltipProvider>
  );
};

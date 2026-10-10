import { useState } from 'react';
import { Link } from 'react-router';
import { MESSAGES } from '../../lib/config/messages';
import type { SaveSchemeDeviceEvent } from '../../lib/devices/devicesEvents';
import type { LightsSchemeData } from '../../lib/lights/lights.types';
import { getLocalSchemes, removeLocalScheme } from '../../lib/schemes/schemesStorage';
import { Button } from '../../lib/ui/button/button';
import { dispatchCustomEvent } from '../../lib/utils/customEvent/customEvent';
import { SchemePreview } from '../schemePreview/schemePreview';

const sendToDevice = ({ uid, scheme }: LightsSchemeData) => {
  dispatchCustomEvent<SaveSchemeDeviceEvent>({ name: 'app:save:scheme', detail: { uid, scheme } });
};

export const SchemesGallery = () => {
  const [schemes, setSchemes] = useState(getLocalSchemes);

  const handleDelete = (uid: string) => {
    removeLocalScheme(uid);
    setSchemes(getLocalSchemes());
  };

  if (schemes.length === 0) {
    return <p className="text-center text-muted-foreground">{MESSAGES.schemes.empty}</p>;
  }

  return (
    <ul className="grid grid-cols-1 lg:grid-cols-3 gap-4 list-none">
      {schemes.map((schemeData) => (
        <li key={schemeData.uid} className="flex flex-col gap-2 rounded-md border p-4">
          <div className="flex justify-between items-center gap-2">
            <h2 className="truncate">{schemeData.scheme.name}</h2>
            <span className="shrink-0 rounded-md border px-2 text-xs">{MESSAGES.schemes.local}</span>
          </div>
          <SchemePreview frames={schemeData.scheme.frames} />
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to={`/editor?scheme=${encodeURIComponent(schemeData.uid)}`}>{MESSAGES.schemes.open}</Link>
            </Button>
            <Button variant="outline" onClick={() => sendToDevice(schemeData)}>
              {MESSAGES.schemes.send}
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(schemeData.uid)}>
              {MESSAGES.common.delete}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
};

import { useEffect, useState } from 'react';
import type { SaveSchemeDeviceEvent } from '../../lib/devices/devicesEvents';
import { useConnectedDevices } from '../../lib/devices/devicesProvider';
import type { LightsSchemeData } from '../../lib/lights/lights.types';
import { deleteOnlineScheme } from '../../lib/schemes/schemesAdminApi';
import { getOnlineSchemes } from '../../lib/schemes/schemesApi';
import {
  getFavoriteSchemeIds,
  getLastSentScheme,
  getLocalSchemes,
  removeLocalScheme,
  toggleFavoriteScheme,
} from '../../lib/schemes/schemesStorage';
import { subscribeCustomEvent, unsubscribeCustomEvent } from '../../lib/utils/customEvent/customEvent';
import type { CustomEventCallback } from '../../lib/utils/customEvent/customEvent.types';

const byName = new Intl.Collator(undefined, { sensitivity: 'base' });

const sortByName = (schemes: LightsSchemeData[]) =>
  schemes.toSorted((a, b) => byName.compare(a.scheme.name, b.scheme.name));

export const useSchemes = () => {
  const [localSchemes, setLocalSchemes] = useState(getLocalSchemes);
  const [onlineSchemes, setOnlineSchemes] = useState<LightsSchemeData[]>([]);
  const [favoriteIds, setFavoriteIds] = useState(getFavoriteSchemeIds);
  const [isOnlineUnavailable, setIsOnlineUnavailable] = useState(false);
  const [isOnlineDeleteFailed, setIsOnlineDeleteFailed] = useState(false);

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

  const deleteLocal = (uid: string) => {
    removeLocalScheme(uid);
    setLocalSchemes(getLocalSchemes());
  };

  const deleteOnline = async (uid: string) => {
    setIsOnlineDeleteFailed(false);
    try {
      await deleteOnlineScheme(uid);
      setOnlineSchemes((current) => current.filter((schemeData) => schemeData.uid !== uid));
    } catch {
      setIsOnlineDeleteFailed(true);
    }
  };

  const favorites = sortByName(
    [...localSchemes, ...onlineSchemes].filter((schemeData) => favoriteIds.includes(schemeData.uid)),
  );

  return {
    localSchemes: sortByName(localSchemes),
    onlineSchemes: sortByName(onlineSchemes),
    favorites,
    favoriteIds,
    toggleFavorite: (uid: string) => setFavoriteIds(toggleFavoriteScheme(uid)),
    deleteLocal,
    deleteOnline,
    isOnlineUnavailable,
    isOnlineDeleteFailed,
  };
};

export const useLastSentScheme = () => {
  const [lastSent, setLastSent] = useState(getLastSentScheme);
  const { selectedDevice } = useConnectedDevices();

  useEffect(() => {
    if (!selectedDevice) return;
    const saveEvent: CustomEventCallback<SaveSchemeDeviceEvent> = {
      name: 'app:save:scheme',
      callback: ({ detail }) => setLastSent({ ...detail, updatedAt: new Date().toISOString() }),
    };
    subscribeCustomEvent(saveEvent);
    return () => unsubscribeCustomEvent(saveEvent);
  }, [selectedDevice]);

  return lastSent;
};

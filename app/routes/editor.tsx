import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Editor } from '../../components/editor/editor';
import type { LightsSchemeData } from '../../lib/lights/lights.types';
import { getSchemePreset } from '../../lib/schemes/schemePresets';
import { getLocalScheme } from '../../lib/schemes/schemesStorage';
import { generateUid } from '../../lib/utils/uid/uid';

const resolveSchemeData = (uid: string | null, presetUid: string | null): LightsSchemeData | undefined => {
  if (uid) {
    return getLocalScheme(uid);
  }

  const preset = presetUid ? getSchemePreset(presetUid) : undefined;

  return preset ? { ...preset, uid: generateUid(), updatedAt: new Date().toISOString() } : undefined;
};

const EditorPage = () => {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('scheme');
  const presetUid = searchParams.get('preset');
  const lightsSchemeData = useMemo(() => resolveSchemeData(uid, presetUid), [uid, presetUid]);

  return (
    <div className="relative flex flex-col flex-1 min-h-0 w-full">
      <Editor key={uid ?? presetUid ?? ''} lightsSchemeData={lightsSchemeData} />
    </div>
  );
};

export default EditorPage;

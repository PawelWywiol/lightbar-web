import { useLoaderData } from 'react-router';
import { Editor } from '../../components/editor/editor';
import type { LightsSchemeData } from '../../lib/lights/lights.types';
import { getOnlineScheme } from '../../lib/schemes/schemesApi';
import { getLocalScheme } from '../../lib/schemes/schemesStorage';
import { generateUid } from '../../lib/utils/uid/uid';

const loadOnlineCopy = async (id: string): Promise<LightsSchemeData | undefined> => {
  const online = await getOnlineScheme(id).catch(() => undefined);

  return online ? { ...online, uid: generateUid(), updatedAt: new Date().toISOString() } : undefined;
};

export const clientLoader = async ({ request }: { request: Request }) => {
  const searchParams = new URL(request.url).searchParams;
  const uid = searchParams.get('scheme');
  const onlineId = searchParams.get('online');

  if (uid) {
    return { key: uid, lightsSchemeData: getLocalScheme(uid), onlineId: undefined };
  }

  const lightsSchemeData = onlineId ? await loadOnlineCopy(onlineId) : undefined;

  return { key: onlineId ?? '', lightsSchemeData, onlineId: lightsSchemeData && onlineId ? onlineId : undefined };
};

const EditorPage = () => {
  const { key, lightsSchemeData, onlineId } = useLoaderData<typeof clientLoader>();

  return (
    <div className="relative flex flex-col flex-1 min-h-0 w-full">
      <Editor key={key} lightsSchemeData={lightsSchemeData} onlineId={onlineId} />
    </div>
  );
};

export default EditorPage;

import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Editor } from '../../components/editor/editor';
import { getLocalScheme } from '../../lib/schemes/schemesStorage';

const EditorPage = () => {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get('scheme');
  const lightsSchemeData = useMemo(() => (uid ? getLocalScheme(uid) : undefined), [uid]);

  return (
    <div className="relative flex flex-col flex-1 min-h-0 w-full">
      <Editor key={uid ?? ''} lightsSchemeData={lightsSchemeData} />
    </div>
  );
};

export default EditorPage;

import { SchemePreview } from '../../schemePreview/schemePreview';
import { useEditorScheme } from '../providers';

export const EditorSchemePreview = () => {
  const { lightsScheme } = useEditorScheme();
  return <SchemePreview frames={lightsScheme.scheme.frames} />;
};

import { CheckIcon, CircleAlertIcon, CloudUploadIcon } from 'lucide-react';
import { useState } from 'react';
import { MESSAGES } from '../../../lib/config/messages';
import { publishScheme, SessionExpiredError, updateOnlineScheme } from '../../../lib/schemes/schemesAdminApi';
import { canManageOnlineScheme, useSession } from '../../../lib/session/sessionProvider';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { useEditorScheme } from '../providers';

type PublishStatus = 'idle' | 'publishing' | 'published' | 'failed' | 'expired';

const STATUS_MESSAGE: Record<PublishStatus, string> = {
  idle: MESSAGES.editor.publish,
  publishing: MESSAGES.editor.publish,
  published: MESSAGES.editor.published,
  failed: MESSAGES.editor.publishFailed,
  expired: MESSAGES.editor.sessionExpired,
};

const StatusIcon = ({ status }: { status: PublishStatus }) => {
  if (status === 'published') return <CheckIcon />;
  if (status === 'failed' || status === 'expired') return <CircleAlertIcon />;
  return <CloudUploadIcon />;
};

export const EditorPublishButton = () => {
  const { session, refreshSession } = useSession();
  const { lightsScheme, onlineId, setOnlineId } = useEditorScheme();
  const [status, setStatus] = useState<PublishStatus>('idle');

  if (!session) {
    return null;
  }

  const handlePublish = async () => {
    setStatus('publishing');
    try {
      if (onlineId && canManageOnlineScheme(session, onlineId)) {
        await updateOnlineScheme(onlineId, lightsScheme.scheme);
      } else {
        setOnlineId(await publishScheme(lightsScheme.scheme));
      }
      await refreshSession();
      setStatus('published');
    } catch (error) {
      setStatus(error instanceof SessionExpiredError ? 'expired' : 'failed');
    }
  };

  return (
    <>
      <Tooltip content={STATUS_MESSAGE[status]}>
        <Button
          aria-label={MESSAGES.editor.publish}
          disabled={status === 'publishing'}
          onClick={() => void handlePublish()}
        >
          <StatusIcon status={status} />
        </Button>
      </Tooltip>
      <output className="sr-only">{status === 'idle' || status === 'publishing' ? '' : STATUS_MESSAGE[status]}</output>
    </>
  );
};

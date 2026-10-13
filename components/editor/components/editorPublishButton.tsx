import { CheckIcon, CircleAlertIcon, CloudUploadIcon } from 'lucide-react';
import { useState } from 'react';
import { useMessages } from '../../../lib/i18n/i18n';
import { publishScheme, SessionExpiredError, updateOnlineScheme } from '../../../lib/schemes/schemesAdminApi';
import { canManageOnlineScheme, useSession } from '../../../lib/session/sessionProvider';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';
import { useEditorScheme } from '../providers';

type PublishStatus = 'idle' | 'publishing' | 'published' | 'failed' | 'expired';

const STATUS_MESSAGE = {
  idle: 'publish',
  publishing: 'publish',
  published: 'published',
  failed: 'publishFailed',
  expired: 'sessionExpired',
} as const satisfies Record<PublishStatus, string>;

const StatusIcon = ({ status }: { status: PublishStatus }) => {
  if (status === 'published') return <CheckIcon />;
  if (status === 'failed' || status === 'expired') return <CircleAlertIcon />;
  return <CloudUploadIcon />;
};

export const EditorPublishButton = () => {
  const { session, refreshSession } = useSession();
  const { lightsScheme, onlineId, setOnlineId } = useEditorScheme();
  const [status, setStatus] = useState<PublishStatus>('idle');
  const messages = useMessages();
  const statusMessage = messages.editor[STATUS_MESSAGE[status]];

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
      <Tooltip content={statusMessage}>
        <Button
          aria-label={messages.editor.publish}
          disabled={status === 'publishing'}
          onClick={() => void handlePublish()}
        >
          <StatusIcon status={status} />
        </Button>
      </Tooltip>
      <output className="sr-only">{status === 'idle' || status === 'publishing' ? '' : statusMessage}</output>
    </>
  );
};

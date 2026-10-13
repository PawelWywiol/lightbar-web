import type { ComponentProps, ReactNode } from 'react';
import { Button } from '../../../lib/ui/button/button';
import { Tooltip } from '../../../lib/ui/tooltip/tooltip';

type EditorToolButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  tooltip: string;
  icon: ReactNode;
  label: string;
};

export const EditorToolButton = ({ tooltip, icon, label, ...props }: EditorToolButtonProps) => (
  <Tooltip content={tooltip}>
    <Button className="h-12 min-w-0 flex-col gap-0.5 rounded-xl px-1 text-2xs font-semibold" {...props}>
      {icon}
      <span className="max-w-full truncate">{label}</span>
    </Button>
  </Tooltip>
);

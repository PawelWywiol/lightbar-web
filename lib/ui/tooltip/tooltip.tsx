import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ComponentPropsWithoutRef, ComponentPropsWithRef, ElementRef, MouseEventHandler, ReactNode } from 'react';
import { cloneElement, forwardRef, isValidElement } from 'react';

import { cn } from '../utils/cn';

const TOOLTIP_DELAY_MS = 300;

export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <TooltipPrimitive.Provider delayDuration={TOOLTIP_DELAY_MS} disableHoverableContent>
    {children}
  </TooltipPrimitive.Provider>
);

const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={4}
      className={cn(
        'pointer-events-none z-50 max-w-xs rounded-md border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md',
        'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

type TooltipProps = Omit<ComponentPropsWithRef<typeof TooltipPrimitive.Trigger>, 'asChild' | 'content'> & {
  content: ReactNode;
};

type DisableableProps = { disabled?: boolean; onClick?: MouseEventHandler };

const asAriaDisabled = (node: ReactNode) => {
  if (!isValidElement<DisableableProps>(node) || node.props.disabled !== true) return node;
  return cloneElement(node, {
    disabled: false,
    'aria-disabled': true,
    onClick: (event) => event.preventDefault(),
  } as DisableableProps);
};

export const Tooltip = ({ content, children, ...triggerProps }: TooltipProps) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild {...triggerProps}>
      {asAriaDisabled(children)}
    </TooltipPrimitive.Trigger>
    <TooltipContent>{content}</TooltipContent>
  </TooltipPrimitive.Root>
);

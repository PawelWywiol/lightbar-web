import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'cva';
import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from '../utils/cn';

const buttonVariants = cva(
  cn(
    'cursor-pointer',
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap rounded-full text-sm font-bold transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:pointer-events-none disabled:opacity-40',
    'aria-disabled:cursor-not-allowed aria-disabled:opacity-40',
    'aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90',
    '[&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0',
  ),
  {
    variants: {
      variant: {
        default:
          'bg-secondary text-secondary-foreground hover:bg-accent aria-disabled:hover:bg-secondary aria-disabled:hover:text-secondary-foreground',
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 aria-disabled:hover:bg-primary',
        outline: 'border bg-transparent hover:bg-accent aria-disabled:hover:bg-transparent',
        ghost: 'hover:bg-accent aria-disabled:hover:bg-transparent aria-disabled:hover:text-inherit',
      },
      size: {
        default: 'h-10 min-w-10 px-4',
        sm: 'h-8 px-3.5 text-xs',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button };

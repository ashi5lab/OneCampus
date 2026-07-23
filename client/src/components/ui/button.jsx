import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

// shadcn/ui-style Button, wired to this project's own theme tokens
// (bg-accent, text-ink-900, etc. from styles/theme.css) instead of
// shadcn's default slate palette.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-ink hover:bg-accent-dark',
        secondary: 'bg-surface-muted text-ink-900 hover:bg-border',
        outline: 'border border-border bg-surface text-ink-900 hover:bg-surface-muted',
        ghost: 'text-ink-700 hover:bg-surface-muted hover:text-ink-900',
        destructive: 'bg-danger text-danger-ink hover:opacity-90',
        link: 'text-accent underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-lg px-6',
        icon: 'h-9 w-9 shrink-0'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export const Button = forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = 'Button';

export { buttonVariants };

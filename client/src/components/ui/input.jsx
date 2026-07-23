import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-lg border border-border-subtle bg-surface-muted px-3.5 py-2 text-sm text-ink-900',
      'placeholder:text-ink-500 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
Input.displayName = 'Input';

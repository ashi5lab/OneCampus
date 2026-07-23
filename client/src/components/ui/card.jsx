import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export const Card = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-lg border border-border bg-surface shadow-sm', className)} {...props} />
));
Card.displayName = 'Card';

export const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center justify-between gap-3 p-4', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-[15px] font-semibold text-ink-900', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

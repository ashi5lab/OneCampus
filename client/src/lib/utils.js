import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui's standard class-merging helper: lets components accept a
// `className` override without Tailwind's own specificity rules silently
// dropping half the classes.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

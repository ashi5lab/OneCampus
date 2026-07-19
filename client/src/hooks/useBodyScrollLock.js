import { useEffect } from 'react';

// Locks background scroll while active — used by every modal (mounted only
// while open, so the default `active=true` is enough) and the mobile nav
// drawer (which stays mounted and passes `isOpen` explicitly, since sliding
// it off-screen with a transform doesn't stop the page underneath from
// scrolling on its own).
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}

import { useEffect } from 'react';

// Locks background scroll while active — used by every modal (mounted only
// while open, so the default `active=true` is enough) and the mobile nav
// drawer (which stays mounted and passes `isOpen` explicitly, since sliding
// it off-screen with a transform doesn't stop the page underneath from
// scrolling on its own).
//
// A plain `overflow: hidden` on body isn't enough on iOS Safari — it's a
// long-standing WebKit quirk that touch-drags can still scroll the page
// behind a `position: fixed` overlay even with overflow hidden set. Pinning
// the body itself to `position: fixed` at its current scroll offset is what
// actually blocks it there (and works everywhere else too), so this stores
// the scroll position, restores it via a negative `top` while locked, and
// scrolls back to the real position on unlock.
export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const scrollY = window.scrollY;
    const { body } = document;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}

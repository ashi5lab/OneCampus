// iOS Safari ignores beforeinstallprompt entirely — there is no
// programmatic "install" API on that platform, only the manual Share ->
// Add to Home Screen flow, so detecting iOS is how we decide whether to
// show install instructions instead of an install button.
export function isIos() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports itself as "MacIntel" with no "iPad" in the UA string
  // — the reliable tell is touch support, which no real Mac has.
  const isIpadOs13Plus = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return (/iPad|iPhone|iPod/.test(ua) || isIpadOs13Plus) && !window.MSStream;
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

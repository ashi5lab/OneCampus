// The browser fires beforeinstallprompt once, early — often while the
// user is still on the marketing landing page, well before they've ever
// opened the login form. usePwaInstall's listener used to live inside
// InstallAppPrompt (only mounted once the login modal opens), so by the
// time it attached, the event had already fired and been lost for good —
// Chrome does not re-fire it on demand. Capturing it here, at module
// evaluation time (this file is imported once, immediately, from
// main.jsx), means it's caught regardless of what's mounted yet. Late
// subscribers (usePwaInstall, wherever it mounts) read the already-
// captured event via getDeferredInstallPrompt()/subscribeToInstallPrompt.
let deferredInstallPrompt = null;
let installed = false;
const installPromptListeners = new Set();

function notifyInstallPromptListeners() {
  installPromptListeners.forEach((cb) => cb());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    notifyInstallPromptListeners();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferredInstallPrompt = null;
    notifyInstallPromptListeners();
  });
}

export function getDeferredInstallPrompt() {
  return deferredInstallPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredInstallPrompt = null;
  notifyInstallPromptListeners();
}

export function isAppInstalledEvent() {
  return installed;
}

// Returns an unsubscribe function, matching the useEffect cleanup shape.
export function subscribeToInstallPrompt(callback) {
  installPromptListeners.add(callback);
  return () => installPromptListeners.delete(callback);
}

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

export function isMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIpadOs13Plus = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || isIpadOs13Plus) && !window.MSStream;
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

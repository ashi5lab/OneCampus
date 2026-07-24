import { useState, useEffect, useCallback } from 'react';
import {
  isIos,
  isStandalone,
  getDeferredInstallPrompt,
  clearDeferredInstallPrompt,
  subscribeToInstallPrompt
} from '../lib/pwa';

// The actual beforeinstallprompt/appinstalled listeners live in lib/pwa.js,
// registered once at module load (see its comment for why — this hook can
// mount long after the event already fired). This just mirrors that
// module-level state into React state so components re-render when it
// changes, and re-syncs on mount in case the event fired before this
// particular instance existed.
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(() => getDeferredInstallPrompt());
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const sync = () => {
      setDeferredPrompt(getDeferredInstallPrompt());
      if (isStandalone()) setInstalled(true);
    };
    sync(); // pick up an event that fired before this mount
    return subscribeToInstallPrompt(sync);
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      clearDeferredInstallPrompt();
      setInstalled(true);
    }
    return outcome;
  }, [deferredPrompt]);

  return {
    // Chrome/Android/desktop path — fires only when the browser itself has
    // decided the app is installable (HTTPS, manifest, service worker).
    canInstall: !!deferredPrompt && !installed,
    // No install prompt event exists on iOS at all — this is the signal to
    // show manual instructions instead of a button.
    isIosInstallable: isIos() && !installed,
    installed,
    promptInstall
  };
}

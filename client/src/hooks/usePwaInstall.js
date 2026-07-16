import { useState, useEffect, useCallback } from 'react';
import { isIos, isStandalone } from '../lib/pwa';

// Centralizes the beforeinstallprompt dance so every screen that wants an
// install affordance (landing page, login page, ...) shares one listener
// and one deferred-prompt reference instead of each re-registering its own.
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
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

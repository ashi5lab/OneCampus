import { useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { IosInstallModal } from './IosInstallModal';

// Persisted so a user who explicitly closes the popup (X or "Maybe
// Later") isn't asked again on every future visit to the login screen —
// clicking "Install" does NOT set this, so if they cancel the browser's
// own native install dialog (or it's iOS and they back out of the Safari
// instructions) they'll still be offered it again next time.
const DISMISS_KEY = 'onecampus.pwaInstallPopupDismissed';

// Auto-shown modal on the login screen (was previously a small inline
// button next to Sign In) — an actual popup invite to install the PWA,
// rather than something the user has to notice and click themselves.
export function InstallAppPopup() {
  const { canInstall, isIosInstallable, installed, promptInstall } = usePwaInstall();
  const [hidden, setHidden] = useState(() => typeof window !== 'undefined' && localStorage.getItem(DISMISS_KEY) === 'true');
  const [showIosHelp, setShowIosHelp] = useState(false);

  const visible = !hidden && !installed && (canInstall || isIosInstallable);
  useBodyScrollLock(visible);

  function dismissForever() {
    localStorage.setItem(DISMISS_KEY, 'true');
    setHidden(true);
  }

  async function handleInstallClick() {
    if (canInstall) {
      setHidden(true); // the browser's own native install dialog takes over from here
      await promptInstall();
    } else if (isIosInstallable) {
      setShowIosHelp(true);
    }
  }

  if (showIosHelp) return <IosInstallModal onClose={() => setShowIosHelp(false)} />;
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
        <button
          type="button"
          onClick={dismissForever}
          aria-label="Dismiss"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-surface-muted hover:text-ink-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center">
          <img src="/icon-192x192.png" alt="" className="mb-4 h-16 w-16 rounded-2xl shadow-md" />
          <div className="text-lg font-bold text-ink-900">Install OneCampus App</div>
          <p className="mt-1.5 text-[13px] text-ink-500">
            Add OneCampus to your home screen for quick access, offline support, and push notifications.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleInstallClick}
            className="w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90"
          >
            Install
          </button>
          <button
            type="button"
            onClick={dismissForever}
            className="w-full rounded-full py-2.5 text-sm font-semibold text-ink-500 hover:bg-surface-muted"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}

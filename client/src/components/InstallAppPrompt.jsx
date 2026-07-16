import { useState } from 'react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { IosInstallModal } from './IosInstallModal';

// Drop-in install affordance: an "Install App" button on Android/Chrome/
// desktop (real one-tap install via the browser's own prompt), or a "How
// to install on iPhone/iPad" help button that opens step-by-step
// instructions on iOS (which has no install-prompt API at all). Renders
// nothing once already installed, or on a platform/browser that offers
// neither path (e.g. Firefox desktop).
export function InstallAppPrompt({ className = '' }) {
  const { canInstall, isIosInstallable, installed, promptInstall } = usePwaInstall();
  const [showIosHelp, setShowIosHelp] = useState(false);

  if (installed || (!canInstall && !isIosInstallable)) return null;

  return (
    <div className={className}>
      {canInstall && (
        <button
          type="button"
          onClick={promptInstall}
          className="w-full rounded bg-accent py-2.5 text-sm font-semibold text-accent-ink hover:opacity-90"
        >
          Install OneCampus App
        </button>
      )}
      {isIosInstallable && (
        <button
          type="button"
          onClick={() => setShowIosHelp(true)}
          className="w-full rounded border border-border bg-surface py-2.5 text-sm font-semibold text-ink-700 hover:bg-surface-muted"
        >
          Install on iPhone/iPad — Help
        </button>
      )}

      {showIosHelp && <IosInstallModal onClose={() => setShowIosHelp(false)} />}
    </div>
  );
}

import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

// Illustrative mockup of Safari's share sheet, not a literal screenshot —
// good enough to point at "this icon, then this row" without depending on
// a real device capture that would go stale the moment Apple redesigns it.
function ShareSheetIllustration() {
  return (
    <svg viewBox="0 0 320 190" className="w-full rounded-lg border border-border" role="img" aria-label="Safari share sheet with Add to Home Screen highlighted">
      <rect width="320" height="190" fill="#F5F6F8" />
      <rect x="0" y="0" width="320" height="44" fill="#FFFFFF" />
      <rect x="90" y="14" width="140" height="18" rx="9" fill="#E5E8ED" />
      <circle cx="160" cy="23" r="4" fill="#8A93A3" />
      <rect x="0" y="44" width="320" height="1" fill="#E5E8ED" />

      <rect x="16" y="58" width="288" height="34" rx="8" fill="#FFFFFF" stroke="#E5A331" strokeWidth="2" />
      <path d="M32 68v14M25 75h14" stroke="#E5A331" strokeWidth="2.4" strokeLinecap="round" />
      <text x="48" y="79" fontFamily="sans-serif" fontSize="12" fill="#1C2230">Share</text>
      <text x="270" y="79" fontFamily="sans-serif" fontSize="10" fill="#8A93A3" textAnchor="end">tap this</text>

      <rect x="16" y="102" width="288" height="1" fill="#E5E8ED" />

      <rect x="16" y="112" width="288" height="34" rx="8" fill="#FFF7E8" stroke="#E5A331" strokeWidth="2" />
      <rect x="27" y="121" width="16" height="16" rx="3" fill="#E5A331" />
      <path d="M35 125v8M31 129h8" stroke="#1C2230" strokeWidth="1.8" strokeLinecap="round" />
      <text x="52" y="133" fontFamily="sans-serif" fontSize="12" fill="#1C2230" fontWeight="bold">Add to Home Screen</text>
      <text x="270" y="133" fontFamily="sans-serif" fontSize="10" fill="#B8860B" textAnchor="end">then this</text>

      <rect x="16" y="156" width="288" height="18" rx="4" fill="#FFFFFF" stroke="#E5E8ED" />
    </svg>
  );
}

export function IosInstallModal({ onClose }) {
  useBodyScrollLock();
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <div className="my-auto w-full max-w-[400px] rounded border-2 border-accent bg-surface p-6">
        <div className="mb-1 text-base font-bold text-ink-900">Install on iPhone or iPad</div>
        <div className="mb-4 text-[12px] text-ink-500">
          iOS doesn't offer a one-tap install button — a few taps in Safari does it.
        </div>

        <div className="mb-3 rounded bg-accent/10 px-3 py-2 text-[12.5px] font-semibold text-accent-dark">
          Open this page in Safari first — the Add to Home Screen option only appears there, not in Chrome or other browsers on iOS.
        </div>

        <ShareSheetIllustration />

        <ol className="mt-4 space-y-2 text-[13px] text-ink-700">
          <li className="flex gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">1</span>
            Tap the <strong>Share</strong> button in Safari's toolbar.
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">2</span>
            Scroll down and tap <strong>Add to Home Screen</strong>.
          </li>
          <li className="flex gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-ink-900 text-[11px] font-bold text-white">3</span>
            Tap <strong>Add</strong> in the top-right corner.
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded bg-ink-900 py-2.5 text-sm font-semibold text-white"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

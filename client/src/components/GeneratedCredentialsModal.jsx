import { useState } from 'react';

// Shown once, right after creating a learner/instructor/staff/guardian
// account whose username and/or password was generated server-side (see
// server/lib/credentials.js) — this is the only moment the plaintext
// password is ever available; it isn't retrievable again afterward.
export function GeneratedCredentialsModal({ username, password, onClose }) {
  const [copied, setCopied] = useState(false);

  function copyBoth() {
    navigator.clipboard?.writeText(`Username: ${username}\nPassword: ${password}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-[380px] rounded border-2 border-accent bg-surface p-6">
        <div className="mb-1 text-base font-bold text-ink-900">Account created</div>
        <div className="mb-4 text-[12px] text-ink-500">
          Save this password now — it won't be shown again.
        </div>

        <div className="mb-4 space-y-2 rounded border border-border bg-surface-muted p-3 text-[13px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-ink-500">Username</span>
            <span className="font-mono font-semibold text-ink-900">{username}</span>
          </div>
          {password && (
            <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
              <span className="text-ink-500">Password</span>
              <span className="font-mono font-semibold text-ink-900">{password}</span>
            </div>
          )}
        </div>

        {password && (
          <button
            onClick={copyBoth}
            className="mb-2 w-full rounded border border-border py-2 text-xs font-semibold text-ink-700 hover:bg-surface-muted"
          >
            {copied ? 'Copied!' : 'Copy username & password'}
          </button>
        )}
        <button
          onClick={onClose}
          className="w-full rounded bg-accent py-2.5 text-sm font-semibold text-accent-ink"
        >
          Done
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef } from 'react';

// Lightweight confirm dialog — renders as a fixed overlay.
// Usage: <ConfirmDialog message="..." onConfirm={fn} onCancel={fn} />
export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 shadow-xl">
        <p className="mb-5 text-sm text-ink-800">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-surface-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-full px-4 py-2 text-sm font-semibold text-white ${
              danger ? 'bg-danger hover:opacity-80' : 'bg-accent text-accent-ink hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

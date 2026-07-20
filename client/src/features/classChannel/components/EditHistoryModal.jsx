import { useEditHistory } from '../hooks/useClassChannel';

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Moderator-only — the caller has already been gated by canModerate before
// this ever opens (see MessagePost's "edited" label, which is a plain
// non-interactive span for anyone else). Shows every prior version,
// newest first, so a teacher/admin can see exactly what changed.
export function EditHistoryModal({ kind, id, onClose }) {
  const { data, isLoading, error } = useEditHistory(kind, id);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[80vh] w-full max-w-[420px] overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 sm:rounded-2xl">
        <div className="mb-1 flex items-start justify-between">
          <div className="text-[15px] font-bold text-ink-900">Edit history</div>
          <button onClick={onClose} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-700">
            ✕
          </button>
        </div>

        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="mt-0.5 flex-shrink-0">
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 018 0v3" />
          </svg>
          Only admins and teachers can see this — everyone else just sees an "edited" label.
        </div>

        {isLoading && <div className="py-6 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="py-6 text-center text-sm font-semibold text-danger">{error.message}</div>}

        {data && (
          <div className="space-y-3">
            <div className="border-l-2 border-accent pl-3">
              <div className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Current · {formatWhen(data.current.at)}</div>
              <div className="mt-1 text-[12.5px] text-ink-900" dangerouslySetInnerHTML={{ __html: data.current.body }} />
              <span className="mt-1 inline-block rounded-full bg-success/15 px-2 py-0.5 text-[9.5px] font-bold text-success">Latest</span>
            </div>
            {data.previous.map((v, i) => (
              <div key={i} className="border-l-2 border-border pl-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-ink-500">
                  {i === data.previous.length - 1 ? 'Original' : 'Edited'} · {formatWhen(v.edited_at)}
                </div>
                <div className="mt-1 text-[12px] text-ink-500 line-through decoration-danger" dangerouslySetInnerHTML={{ __html: v.body }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

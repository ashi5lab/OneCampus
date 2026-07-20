import { useActivities } from '../hooks/useActivities';

const TYPE_ICON_BG = {
  notice: { bg: '#FDF0D5', fg: '#92400E' },
  message: { bg: '#E0F5F5', fg: '#0F766E' },
  mention: { bg: '#EAE9FF', fg: '#4F46E5' },
  assignment: { bg: '#FBE7F6', fg: '#A21CAF' },
  exam: { bg: '#FCE7E8', fg: '#B91C1C' },
  attendance: { bg: '#E0EEFB', fg: '#1D4ED8' },
  score: { bg: '#DFF5E7', fg: '#15803D' },
  leave: { bg: '#E0EEFB', fg: '#1D4ED8' }
};

const TYPE_ICON_PATH = {
  notice: 'M4 4h16v12H4z M4 8h16 M9 4v4 M8 15h8',
  message: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  assignment: 'M9 4h9a1 1 0 011 1v14a1 1 0 01-1 1H6a1 1 0 01-1-1V8l4-4z M9 4v4H5 M8 13h8M8 17h5',
  exam: 'M9 11l2 2 4-4 M12 12m-9 0a9 9 0 1018 0a9 9 0 10-18 0',
  attendance: 'M5 13l4 4L19 7',
  score: 'M4 19h16M6 19V9l4-4 4 4v10M6 13h8',
  leave: 'M8 7V3M16 7V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z'
};

function TypeIcon({ type }) {
  const { bg, fg } = TYPE_ICON_BG[type] || { bg: '#F1F1F6', fg: '#6B6B78' };
  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold" style={{ background: bg, color: fg }}>
      {type === 'mention' ? (
        '@'
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d={TYPE_ICON_PATH[type] || 'M12 8v4l3 3'} />
        </svg>
      )}
    </div>
  );
}

function groupLabel(ts) {
  const date = new Date(ts);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

function relativeTime(ts) {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

// A single chronological feed of everything relevant to this user or their
// class(es) — see server/modules/activity for the fan-out query. Grouped
// by Today/Yesterday/Earlier so a return visit reads what's new at a
// glance, same idea as the Home tab's Activities preview card (of which
// this is the full view).
export function ActivitiesPage() {
  const { data: result, isLoading, error } = useActivities();
  const items = result?.data || [];

  const groups = items.reduce((acc, item) => {
    const label = groupLabel(item.ts);
    (acc[label] ||= []).push(item);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Activities</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Activities</h1>
      </div>

      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
      {!isLoading && items.length === 0 && (
        <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
          Nothing here yet.
        </div>
      )}

      {['Today', 'Yesterday', 'Earlier'].map((label) =>
        groups[label]?.length ? (
          <div key={label} className="mb-5">
            <div className="mb-2 text-[10.5px] font-bold uppercase tracking-wide text-ink-500">{label}</div>
            <div className="overflow-hidden rounded border border-border bg-surface">
              <div className="divide-y divide-surface-muted">
                {groups[label].map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 p-3.5">
                    <TypeIcon type={item.type} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold leading-snug text-ink-900">{item.title}</div>
                      {item.subtitle && <div className="mt-0.5 text-[11.5px] text-ink-500">{item.subtitle}</div>}
                      {item.actor && <div className="mt-0.5 text-[11px] text-ink-500">{item.actor}</div>}
                    </div>
                    <div className="flex-shrink-0 whitespace-nowrap text-[11px] text-ink-500">{relativeTime(item.ts)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

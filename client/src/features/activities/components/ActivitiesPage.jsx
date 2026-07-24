import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useActivities } from '../hooks/useActivities';
import { PageHeader } from '../../../components/PageHeader';

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
    <div
      className="relative z-10 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold ring-4 ring-surface"
      style={{ background: bg, color: fg }}
    >
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

// Every calendar day gets its own group, oldest activity included — not
// just Today/Yesterday/Earlier (the old three-bucket grouping dumped
// everything before yesterday into one undifferentiated "Earlier" pile).
// "This Week" gets a weekday name (e.g. "Monday"), anything older than
// that a full date, so scrolling back through history still reads at a
// glance which day you're looking at.
function dayKey(ts) {
  return new Date(ts).toDateString();
}

function dayLabel(ts) {
  const date = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday - startOfDate) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

function timeLabel(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getActivityLink(item) {
  switch (item.type) {
    case 'notice': return { to: '/app/notices' };
    case 'message': return { to: '/app/messages' };
    case 'mention': return { to: `/app/class/${item.cohort_id}`, state: { tab: 'chat', postId: item.id } };
    case 'assignment': return { to: `/app/class/${item.cohort_id}`, state: { tab: 'assignments' } };
    case 'exam': return { to: `/app/class/${item.cohort_id}`, state: { tab: 'exams' } };
    case 'attendance': return { to: '/app/attendance' };
    case 'score': return { to: '/app/profile' };
    case 'leave': return { to: '/app/leave' };
    default: return { to: '/app/activities' };
  }
}

// A single chronological feed of everything relevant to this user or their
// class(es) — see server/modules/activity for the fan-out query. Rendered
// as a day-by-day timeline (a connecting line through each day's icons),
// covering the full history the API returns, not just the last two days.
export function ActivitiesPage() {
  const queryClient = useQueryClient();
  const { data: result, isLoading, error } = useActivities();
  const items = result?.data || [];

  useEffect(() => {
    localStorage.setItem('activitiesLastViewed', Date.now().toString());
    if (result && result.recentCount > 0) {
      queryClient.setQueryData(['activities'], { ...result, recentCount: 0 });
    }
  }, [result, queryClient]);

  // Items arrive most-recent-first; group consecutive entries by calendar
  // day while preserving that order, so day sections themselves stay
  // newest-first too.
  const dayGroups = [];
  for (const item of items) {
    const key = dayKey(item.ts);
    const lastGroup = dayGroups[dayGroups.length - 1];
    if (lastGroup && lastGroup.key === key) {
      lastGroup.items.push(item);
    } else {
      dayGroups.push({ key, label: dayLabel(item.ts), items: [item] });
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Activities" title="Activities" />

      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
      {!isLoading && items.length === 0 && (
        <div className="rounded border border-border bg-surface p-8 text-center text-sm text-ink-500">
          Nothing here yet.
        </div>
      )}

      {dayGroups.map((group) => (
        <div key={group.key} className="mb-6">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">{group.label}</div>
          <div className="relative">
            {/* Connecting line running through every icon in this day's
                group — omitted entirely for a single-item day since there's
                nothing to connect. */}
            {group.items.length > 1 && (
              <div className="absolute bottom-4 left-[17px] top-4 w-px bg-border" aria-hidden="true" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const linkProps = getActivityLink(item);
                return (
                  <Link
                    to={linkProps.to}
                    state={linkProps.state}
                    key={`${item.type}-${item.id}`}
                    className="relative flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface-muted"
                  >
                    <TypeIcon type={item.type} />
                    <div className="min-w-0 flex-1 pt-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="text-[13.5px] font-semibold leading-snug text-ink-900">{item.title}</div>
                        <div className="flex-shrink-0 whitespace-nowrap text-[11.5px] text-ink-500">{timeLabel(item.ts)}</div>
                      </div>
                      {item.subtitle && <div className="mt-0.5 text-[12px] text-ink-500">{item.subtitle}</div>}
                      {item.actor && <div className="mt-0.5 text-[11px] text-ink-500">{item.actor}</div>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

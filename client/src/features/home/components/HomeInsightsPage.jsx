import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboardReport } from '../../reports/hooks/useReports';
import { useNotices } from '../../notices/hooks/useNotices';
import { useInbox } from '../../messages/hooks/useMessages';
import { useActivities } from '../../activities/hooks/useActivities';
import { useHomeCardPrefs } from '../../profile/hooks/useProfile';
import { getHomeCardsForRole, isCardVisible } from '../../../lib/homeCardKeys';

const ACTIVITY_DOT_COLOR = {
  notice: 'var(--accent)',
  message: '#1D4ED8',
  mention: 'var(--accent)',
  assignment: '#A21CAF',
  exam: '#B91C1C',
  attendance: '#1D4ED8',
  score: 'var(--success)',
  leave: '#92400E'
};

// The learner/instructor/staff Home tab — a personal insight feed instead
// of the admin/guardian "Your Modules" card grid (see DashboardPage.jsx's
// role branch). Which cards show is per-user, controlled from Settings →
// Home screen (see ProfilePage's HomeCardsCard and useHomeCardPrefs).
export function HomeInsightsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const { data: prefsRaw } = useHomeCardPrefs();
  const prefs = prefsRaw || {};
  const cards = getHomeCardsForRole(role);

  // For a learner, Attendance + Academic Scores sit side by side as a 2-up
  // row (matching the approved mock) — everything else stacks full-width.
  // Instructor/staff don't pair theirs, so they just fall through the
  // normal full-width loop below.
  const visibleKeys = cards.map((c) => c.key).filter((key) => isCardVisible(prefs, key));

  return (
    <div>
      <Greeting />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {visibleKeys.map((key) => (
          <HomeCard key={key} cardKey={key} role={role} />
        ))}
      </div>
    </div>
  );
}

function Greeting() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mb-5 flex items-center justify-between">
      <div>
        <div className="text-[13.5px] text-ink-500">{greeting}</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{user?.username}</h1>
      </div>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-ink">
        {(user?.username || '?').slice(0, 2).toUpperCase()}
      </div>
    </div>
  );
}

function HomeCard({ cardKey, role }) {
  if (cardKey === 'attendance') return <PrimaryStatCard role={role} />;
  if (cardKey === 'academic') return <SecondaryStatCard role={role} />;
  if (cardKey === 'notices') return <NoticesCard />;
  if (cardKey === 'messages') return <MessagesCard />;
  if (cardKey === 'activities') return <ActivitiesCard />;
  if (cardKey === 'pending') return <PendingCard role={role} />;
  return null;
}

function Card({ children, className = '' }) {
  return <div className={`rounded border border-border bg-surface p-4 ${className}`}>{children}</div>;
}

function CardHead({ label, to }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <span className="text-[11px] font-bold uppercase tracking-wide text-ink-500">{label}</span>
      {to && (
        <Link to={to} className="text-[11.5px] font-bold text-accent-dark hover:underline">
          View all &rsaquo;
        </Link>
      )}
    </div>
  );
}

// --- Learner cards ---

function AttendanceRingCard() {
  const { data } = useDashboardReport();
  const rate = data?.stats?.attendanceRate30d;

  return (
    <Card>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Attendance</div>
      {rate == null ? (
        <div className="py-6 text-center text-[12.5px] text-ink-500">No data yet</div>
      ) : (
        <>
          <div
            className="mx-auto my-1.5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(var(--accent) ${rate}%, var(--surface-muted) ${rate}% 100%)` }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-[13px] font-bold text-ink-900">
              {rate}%
            </div>
          </div>
          <div className="text-center text-[11px] text-ink-500">Last 30 days</div>
        </>
      )}
    </Card>
  );
}

function AcademicCard() {
  const { data } = useDashboardReport();
  const subjects = data?.academicByModule || [];

  return (
    <Card>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Academic scores</div>
      {subjects.length === 0 ? (
        <div className="py-6 text-center text-[12.5px] text-ink-500">No scores yet</div>
      ) : (
        <div className="mt-2 space-y-2">
          {subjects.map((s) => {
            const pct = s.max_score > 0 ? Math.round((s.score_obtained / s.max_score) * 100) : 0;
            return (
              <div key={s.module_name} className="flex items-center gap-2">
                <span className="w-14 flex-shrink-0 truncate text-[10.5px] text-ink-500">{s.module_name}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <span className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-8 flex-shrink-0 text-right font-mono text-[10.5px] font-bold text-ink-700">
                  {s.score_obtained}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// --- Instructor cards ---

function PrimaryStatCard({ role }) {
  const { data } = useDashboardReport();

  if (role === 'instructor') {
    const classes = data?.myClasses || [];
    return (
      <Card>
        <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">My classes</div>
        {classes.length === 0 ? (
          <div className="py-4 text-center text-[12.5px] text-ink-500">No classes assigned yet</div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {classes.slice(0, 6).map((c) => (
              <Link
                key={c.id}
                to={`/app/class/${c.id}`}
                className="rounded-full bg-surface-muted px-2.5 py-1 text-[11.5px] font-semibold text-ink-700 hover:bg-accent/10 hover:text-accent-dark"
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </Card>
    );
  }

  // staff
  const stats = data?.stats || {};
  return (
    <Card>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">This week</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <div>
          <div className="font-display text-xl font-bold text-ink-900">{stats.notices_posted ?? 0}</div>
          <div className="text-[10.5px] text-ink-500">Notices posted</div>
        </div>
        <div>
          <div className="font-display text-xl font-bold text-ink-900">{stats.messages_sent ?? 0}</div>
          <div className="text-[10.5px] text-ink-500">Messages sent</div>
        </div>
      </div>
    </Card>
  );
}

function SecondaryStatCard() {
  const { data } = useDashboardReport();
  const stats = data?.stats || {};
  return (
    <Card>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">This week</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <div>
          <div className="font-display text-xl font-bold text-ink-900">{stats.attendance_marked ?? 0}</div>
          <div className="text-[10.5px] text-ink-500">Attendance marked</div>
        </div>
        <div>
          <div className="font-display text-xl font-bold text-ink-900">{stats.scores_graded ?? 0}</div>
          <div className="text-[10.5px] text-ink-500">Scores graded</div>
        </div>
      </div>
    </Card>
  );
}

// --- Shared cards ---

function NoticesCard() {
  const { data: notices } = useNotices();
  const items = (notices || []).slice(0, 2);

  return (
    <Card>
      <CardHead label="Notices" to="/app/notices" />
      {items.length === 0 ? (
        <div className="py-2 text-[12.5px] text-ink-500">No notices yet.</div>
      ) : (
        <div className="divide-y divide-surface-muted">
          {items.map((n) => (
            <div key={n.id} className="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: '#92400E' }} />
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-ink-900">{n.title}</div>
                <div className="text-[11px] text-ink-500">{new Date(n.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function MessagesCard() {
  const { data: inbox } = useInbox();
  const latest = (inbox || [])[0];

  return (
    <Card>
      <CardHead label="Messages" to="/app/messages" />
      {!latest ? (
        <div className="py-2 text-[12.5px] text-ink-500">No messages yet.</div>
      ) : (
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-dark text-[10.5px] font-bold text-white">
            {latest.sender_username?.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[12.5px] font-semibold text-ink-900">{latest.sender_username}</span>
              {!latest.is_read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />}
            </div>
            <div className="truncate text-[11.5px] text-ink-700">{latest.subject || latest.body}</div>
          </div>
        </div>
      )}
    </Card>
  );
}

function ActivitiesCard() {
  const { data: result } = useActivities();
  const items = (result?.data || []).slice(0, 3);

  return (
    <Card>
      <CardHead label="Activities" to="/app/activities" />
      {items.length === 0 ? (
        <div className="py-2 text-[12.5px] text-ink-500">Nothing yet.</div>
      ) : (
        <div className="divide-y divide-surface-muted">
          {items.map((item) => (
            <div key={`${item.type}-${item.id}`} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ background: ACTIVITY_DOT_COLOR[item.type] || 'var(--ink-500)' }}
              />
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-900">{item.title}</span>
              <span className="flex-shrink-0 text-[10.5px] text-ink-500">{relativeTime(item.ts)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const PENDING_DOT = { assignment: 'var(--danger)', exam: 'var(--accent)', leave: '#92400E', grading: 'var(--danger)' };

function PendingCard({ role }) {
  const { data } = useDashboardReport();
  const items = data?.pendingActions || [];

  return (
    <Card>
      <div className="text-[11px] font-bold uppercase tracking-wide text-ink-500">Needs your attention</div>
      {items.length === 0 ? (
        <div className="py-2 text-[12.5px] text-ink-500">
          {role === 'learner' ? "You're all caught up." : 'Nothing pending right now.'}
        </div>
      ) : (
        <div className="mt-1 divide-y divide-surface-muted">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 py-2 first:pt-0 last:pb-0">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: PENDING_DOT[item.type] || 'var(--ink-500)' }} />
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-ink-900">{item.title}</div>
                {item.subtitle && <div className="text-[11px] text-ink-500">{item.subtitle}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function relativeTime(ts) {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

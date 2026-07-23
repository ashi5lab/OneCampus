import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboardReport } from '../../reports/hooks/useReports';
import { useNotices } from '../../notices/hooks/useNotices';
import { useInbox } from '../../messages/hooks/useMessages';
import { useActivities } from '../../activities/hooks/useActivities';
import { useMyTimetable } from '../../timetable/hooks/useTimetable';
import { useHomeCardPrefs } from '../../profile/hooks/useProfile';
import { getHomeCardsForRole, isCardVisible } from '../../../lib/homeCardKeys';
import { ProfileMenu } from '../../../components/ProfileMenu';
import { useMyProfile } from '../../profile/hooks/useProfile';

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

// The learner/instructor/staff Home tab — a professional dashboard layout
// with summary cards, today's schedule, recent activity, and calendar.
export function HomeInsightsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const { data: report } = useDashboardReport();
  const { data: notices } = useNotices();
  const { data: inbox } = useInbox();
  const { data: activities } = useActivities();
  const { data: timetable } = useMyTimetable();

  return (
    <div className="space-y-6">
      <Greeting />
      <SummaryCards role={role} report={report} inbox={inbox} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <TodaySchedule role={role} timetable={timetable} />
          <RecentMessages inbox={inbox} />
          <DueAssignments report={report} />
        </div>
        {/* Right Column */}
        <div className="space-y-6">
          <RecentActivity activities={activities} />
          <CalendarWidget />
          <NoticesSection notices={notices} />
        </div>
      </div>
      <QuickActions role={role} />
    </div>
  );
}

function Greeting() {
  const { user } = useAuth();
  const { data: me } = useMyProfile();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-ink-900">{greeting}, {me?.name || user?.username}! 👋</h1>
        <p className="mt-1 text-base text-ink-500">Here's what's happening in your classes today.</p>
      </div>
      <ProfileMenu />
    </div>
  );
}

// Summary Cards Row
function SummaryCards({ role, report, inbox }) {
  const stats = report?.stats || {};
  const pendingCount = report?.pendingActions?.length || 0;
  const unrereadCount = (inbox || []).filter(m => !m.is_read).length;

  const cards = [
    { label: 'Attendance This Week', value: `${stats.attendanceRate30d ?? 0}%`, icon: '📍', bgColor: 'bg-green-50', iconColor: 'text-green-600' },
    { label: 'Pending Assignments', value: pendingCount, icon: '📝', bgColor: 'bg-pink-50', iconColor: 'text-pink-600' },
    { label: 'Upcoming Exams', value: stats.upcomingExams ?? 0, icon: '📚', bgColor: 'bg-orange-50', iconColor: 'text-orange-600' },
    { label: 'Unread Messages', value: unrereadCount, icon: '💬', bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`rounded-lg border border-gray-200 ${card.bgColor} p-4`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-gray-600 mb-2">{card.label}</div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              {card.label.includes('Attendance') && <div className="text-xs text-gray-500 mt-1">Present • 13 / 15 days</div>}
              {card.label.includes('Assignments') && <div className="text-xs text-gray-500 mt-1">Due this week</div>}
              {card.label.includes('Exams') && <div className="text-xs text-gray-500 mt-1">Next: 5 days</div>}
              {card.label.includes('Messages') && <div className="text-xs text-gray-500 mt-1">New messages</div>}
            </div>
            <div className={`text-2xl ${card.iconColor}`}>{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Today's Schedule Section
function TodaySchedule({ role, timetable }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const todayClasses = timetable?.filter(t => new Date(t.start_time).toDateString() === new Date().toDateString()) || [];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Today's Schedule</h2>
        <Link to="/app/timetable" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View full timetable
        </Link>
      </div>

      {todayClasses.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No classes today</p>
      ) : (
        <div className="space-y-2">
          {todayClasses.slice(0, 5).map((cls, idx) => (
            <div key={idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0 text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {new Date(cls.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{cls.subject || 'Class'}</p>
                <p className="text-xs text-gray-500">{cls.room || 'Room'} • {cls.instructor || 'Instructor'}</p>
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-50 text-green-700">In Progress</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Recent Activity Section
function RecentActivity({ activities }) {
  const items = (activities?.data || []).slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-ink-900">Recent Activity</h2>
        <Link to="/app/activities" className="text-sm font-semibold text-accent hover:text-accent-dark">
          View all →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-center py-8 text-ink-500">No activities yet</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item, idx) => (
            <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-start gap-3">
              <span
                className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                style={{ background: ACTIVITY_DOT_COLOR[item.type] || 'var(--ink-500)' }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink-900 text-sm">{item.title}</p>
                <p className="text-xs text-ink-500 mt-0.5">{relativeTime(item.ts)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Calendar Widget
function CalendarWidget() {
  const today = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[today.getMonth()];
  const year = today.getFullYear();
  const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(year, today.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h3 className="text-lg font-semibold text-ink-900 mb-4">{month} {year}</h3>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-ink-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const isToday = day === today.getDate();
          return (
            <button
              key={idx}
              className={`py-2 text-sm rounded-lg transition-colors ${
                day === null
                  ? 'invisible'
                  : isToday
                  ? 'bg-accent text-white font-semibold'
                  : 'text-ink-900 hover:bg-surface-muted'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Notices Section
function NoticesSection({ notices }) {
  const items = (notices || []).slice(0, 3);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-ink-900">Notices</h2>
        <Link to="/app/notices" className="text-sm font-semibold text-accent hover:text-accent-dark">
          View all →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-center py-8 text-ink-500">No notices yet</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((notice) => (
            <div key={notice.id} className="py-3 first:pt-0 last:pb-0">
              <p className="font-medium text-ink-900 text-sm">{notice.title}</p>
              <p className="text-xs text-ink-500 mt-1">{new Date(notice.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Recent Messages Section
function RecentMessages({ inbox }) {
  const items = (inbox || []).slice(0, 3);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Recent Messages</h2>
        <Link to="/app/messages" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-center py-8 text-gray-500">No messages yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((msg) => (
            <div key={msg.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 transition-colors">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                {msg.sender_username?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 text-sm">{msg.sender_username}</p>
                  {!msg.is_read && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-600" />}
                </div>
                <p className="text-xs text-gray-500 truncate">{msg.subject || msg.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Due Assignments Section
function DueAssignments({ report }) {
  const items = report?.pendingActions?.filter(a => a.type === 'assignment') || [];

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-ink-900">Due Assignments</h2>
        <Link to="/app/assignments" className="text-sm font-semibold text-accent hover:text-accent-dark">
          View all →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-center py-8 text-ink-500">No pending assignments</p>
      ) : (
        <div className="divide-y divide-border">
          {items.slice(0, 3).map((item, idx) => (
            <div key={idx} className="py-3 first:pt-0 last:pb-0">
              <p className="font-medium text-ink-900 text-sm">{item.title}</p>
              {item.subtitle && <p className="text-xs text-danger mt-1">{item.subtitle}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Quick Actions
function QuickActions({ role }) {
  const actions = [
    { label: 'Mark Attendance', icon: '📋', to: '/app/attendance', roles: ['instructor', 'staff'] },
    { label: 'View Timetable', icon: '📅', to: '/app/timetable', roles: ['learner', 'instructor'] },
    { label: 'Submit Assignment', icon: '📝', to: '/app/assignments', roles: ['learner'] },
    { label: 'View Exams', icon: '📚', to: '/app/exams', roles: ['learner', 'instructor'] },
    { label: 'Check Results', icon: '📊', to: '/app/results', roles: ['learner'] },
    { label: 'Ask Doubt', icon: '❓', to: '/app/messages', roles: ['learner'] },
    { label: 'School Library', icon: '📚', to: '/app/library', roles: ['learner'] },
  ];

  const filtered = actions.filter(a => a.roles.includes(role));

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-ink-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {filtered.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-surface-muted hover:bg-accent/10 hover:text-accent transition-colors text-center"
          >
            <span className="text-2xl mb-2">{action.icon}</span>
            <span className="text-xs font-medium text-ink-900">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
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

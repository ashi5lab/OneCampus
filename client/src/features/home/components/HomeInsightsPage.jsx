import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboardReport } from '../../reports/hooks/useReports';
import { useNotices } from '../../notices/hooks/useNotices';
import { useInbox } from '../../messages/hooks/useMessages';
import { useActivities } from '../../activities/hooks/useActivities';
import { useMyTimetable } from '../../timetable/hooks/useTimetable';
import { useMyProfile } from '../../profile/hooks/useProfile';
import { NotificationBell } from '../../../components/NotificationBell';
import { ProfileMenu } from '../../../components/ProfileMenu';
import {
  Calendar,
  BookOpen,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

// Activity dot colors for timeline
const ACTIVITY_COLORS = {
  notice: '#F59E0B',
  message: '#3B82F6',
  mention: '#8B5CF6',
  assignment: '#EC4899',
  exam: '#EF4444',
  attendance: '#10B981',
  score: '#06B6D4',
  leave: '#F59E0B',
};

export function HomeInsightsPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === 'admin';
  const { data: report } = useDashboardReport();
  const { data: notices } = useNotices();
  const { data: inbox } = useInbox();
  const { data: activities } = useActivities();
  const { data: timetable } = useMyTimetable({ enabled: !isAdmin });
  const unreadMessages = (inbox || []).filter((m) => !m.is_read).length;

  const statCards = isAdmin
    ? [
        {
          icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
          label: 'Attendance Marked',
          value: report?.teacherActivity?.attendance_marked ?? 0,
          subtitle: 'Last 7 days',
          bgGradient: 'from-emerald-50 to-emerald-100',
          viewAllTo: '/app/attendance'
        },
        {
          icon: <BookOpen className="w-4 h-4 text-rose-600" />,
          label: 'Assignments Graded',
          value: report?.teacherActivity?.assignments_graded ?? 0,
          subtitle: 'Last 7 days',
          bgGradient: 'from-rose-50 to-rose-100',
          viewAllTo: '/app/assignments'
        },
        {
          icon: <AlertCircle className="w-4 h-4 text-orange-600" />,
          label: 'Notices Posted',
          value: report?.staffActivity?.notices_posted ?? 0,
          subtitle: 'Last 7 days',
          bgGradient: 'from-orange-50 to-orange-100',
          viewAllTo: '/app/notices'
        },
        {
          icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
          label: 'Unread Messages',
          value: unreadMessages,
          subtitle: 'New messages',
          bgGradient: 'from-blue-50 to-blue-100',
          viewAllTo: '/app/messages'
        }
      ]
    : [
        {
          icon: <CheckCircle className="w-4 h-4 text-emerald-600" />,
          label: 'Attendance This Week',
          value: `${report?.stats?.attendanceRate30d ?? 0}%`,
          subtitle: 'Present • 13 / 15 days',
          bgGradient: 'from-emerald-50 to-emerald-100',
          viewAllTo: '/app/attendance',
          sparkline: true
        },
        {
          icon: <BookOpen className="w-4 h-4 text-rose-600" />,
          label: 'Pending Assignments',
          value: report?.pendingActions?.filter(a => a.type === 'assignment').length || 0,
          subtitle: 'Due this week',
          bgGradient: 'from-rose-50 to-rose-100',
          viewAllTo: '/app/assignments'
        },
        {
          icon: <Calendar className="w-4 h-4 text-orange-600" />,
          label: 'Upcoming Exams',
          value: report?.stats?.upcomingExams ?? 0,
          subtitle: 'Next: 5 days',
          bgGradient: 'from-orange-50 to-orange-100',
          viewAllTo: '/app/exams'
        },
        {
          icon: <MessageSquare className="w-4 h-4 text-blue-600" />,
          label: 'Unread Messages',
          value: unreadMessages,
          subtitle: 'New messages',
          bgGradient: 'from-blue-50 to-blue-100',
          viewAllTo: '/app/messages'
        }
      ];

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-3">
        <Greeting />
        <div className="flex flex-shrink-0 items-center gap-1 md:hidden">
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-8">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Main content — mobile groups these differently than desktop
          (Schedule alone, then Activity+Calendar and Messages+Assignments
          paired side-by-side) to match the compact mobile design; desktop
          keeps its two-column layout below. */}
      <div className="lg:hidden space-y-4 mb-8">
        <TodayScheduleCard timetable={timetable} />
        <div className="grid grid-cols-2 gap-4">
          <RecentActivityCard activities={activities} compact />
          <CalendarWidget compact />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <RecentMessagesCard inbox={inbox} compact />
          <DueAssignmentsCard report={report} compact />
        </div>
        <NoticesCard notices={notices} />
      </div>

      <div className="hidden lg:block">
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="col-span-2 space-y-6">
            <TodayScheduleCard timetable={timetable} />
            <RecentMessagesCard inbox={inbox} />
          </div>
          <div className="space-y-6">
            <RecentActivityCard activities={activities} />
            <CalendarWidget />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          <DueAssignmentsCard report={report} />
          <NoticesCard notices={notices} />
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActionsCard role={role} />
    </div>
  );
}

// ============================================================================
// HEADER COMPONENTS
// ============================================================================

function Greeting() {
  const { user } = useAuth();
  const { data: me } = useMyProfile();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">
        {greeting}, {me?.name || user?.username}! 👋
      </h1>
      <p className="mt-1 text-sm text-gray-600">Here's what's happening in your classes today.</p>
    </div>
  );
}

// ============================================================================
// CARD COMPONENTS
// ============================================================================

function StatCard({ icon, label, value, subtitle, bgGradient, viewAllTo, sparkline }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-gradient-to-br ${bgGradient} p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="mb-2 flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-start gap-1.5 sm:gap-2">
          <div className="flex h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/70">{icon}</div>
          <p className="text-[11.5px] sm:text-[13px] font-semibold leading-tight text-gray-800">{label}</p>
        </div>
        {viewAllTo && (
          <Link to={viewAllTo} className="flex-shrink-0 text-[10.5px] sm:text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            View all
          </Link>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-600">{subtitle}</p>
        </div>
        {sparkline && <Sparkline />}
      </div>
    </div>
  );
}

// Decorative weekly-trend sparkline for the Attendance card — the report
// API doesn't expose a daily-attendance series, so this traces a fixed
// upward-trending sample path rather than real per-day data.
function Sparkline() {
  return (
    <svg width="64" height="28" viewBox="0 0 64 28" fill="none" className="flex-shrink-0">
      <polyline
        points="0,22 10,20 20,16 30,17 40,10 50,8 64,2"
        stroke="#059669"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TodayScheduleCard({ timetable }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const todayClasses = timetable?.filter(t => new Date(t.start_time).toDateString() === new Date().toDateString()) || [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Today's Schedule</h2>
          <p className="mt-0.5 text-xs text-gray-500">{today}</p>
        </div>
        <Link to="/app/timetable" className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          View all <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>
      </div>

      {todayClasses.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No classes today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todayClasses.slice(0, 5).map((cls, idx) => {
            const isFirst = idx === 0;
            return (
              <div key={idx} className="flex items-center gap-3 sm:gap-4 rounded-lg p-2.5 sm:p-3 hover:bg-gray-50 transition-colors">
                <div className="flex flex-shrink-0 flex-col items-center rounded-lg bg-indigo-50 px-2 py-1.5">
                  <span className="text-[11px] sm:text-xs font-bold text-indigo-600 whitespace-nowrap">
                    {new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm sm:text-base font-semibold text-gray-900">{cls.subject || 'Class'}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {cls.room || 'Room'} • {cls.instructor || 'Instructor'}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 inline-block rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-semibold ${
                    isFirst ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isFirst ? 'In Progress' : 'Upcoming'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentMessagesCard({ inbox, compact }) {
  const items = (inbox || []).slice(0, compact ? 2 : 3);

  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow ${compact ? 'p-4' : 'p-6'}`}>
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        <h2 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>Recent Messages</h2>
        <Link to="/app/messages" className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={`flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 ${compact ? 'h-16' : 'h-24'}`}>
          <p className="text-xs text-gray-500">No messages</p>
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {items.map((msg) => (
            <div key={msg.id} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-50 transition-colors">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-[11px] font-bold text-white">
                {msg.sender_username?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-gray-900">{msg.sender_username}</p>
                <p className="truncate text-[11px] text-gray-500">{msg.subject || msg.body}</p>
              </div>
              {!msg.is_read && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-600"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentActivityCard({ activities, compact }) {
  const items = (activities?.data || []).slice(0, compact ? 3 : 4);

  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow ${compact ? 'p-4' : 'p-6'}`}>
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        <h2 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>Recent Activity</h2>
        <Link to="/app/activities" className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={`flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 ${compact ? 'h-16' : 'h-24'}`}>
          <p className="text-xs text-gray-500">No activities</p>
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div
                className="mt-1 flex-shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: ACTIVITY_COLORS[item.type] || '#6B7280' }}
              ></div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-gray-900">{item.title}</p>
                <p className="text-[11px] text-gray-500">{relativeTime(item.ts)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarWidget({ compact }) {
  const today = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[today.getMonth()];
  const year = today.getFullYear();
  const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(year, today.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  const dayLabels = compact ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow ${compact ? 'p-4' : 'p-6'}`}>
      <h3 className={`font-semibold text-gray-900 ${compact ? 'mb-3 text-sm' : 'mb-4 text-lg'}`}>{month} {year}</h3>

      <div className={`grid grid-cols-7 gap-1 ${compact ? 'mb-1' : 'mb-3'}`}>
        {dayLabels.map((day, idx) => (
          <div key={idx} className={`text-center font-semibold text-gray-600 ${compact ? 'text-[9px] py-1' : 'text-xs py-2'}`}>
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isToday = day === today.getDate();
          return (
            <button
              key={idx}
              className={`rounded-lg font-medium transition-all ${compact ? 'py-1 text-[10px]' : 'py-1.5 text-xs'} ${
                day === null
                  ? 'invisible'
                  : isToday
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-bold shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
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

function DueAssignmentsCard({ report, compact }) {
  const items = report?.pendingActions?.filter(a => a.type === 'assignment')?.slice(0, compact ? 2 : 3) || [];

  return (
    <div className={`rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow ${compact ? 'p-4' : 'p-6'}`}>
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        <h2 className={`font-semibold text-gray-900 ${compact ? 'text-sm' : 'text-lg'}`}>Due Assignments</h2>
        <Link to="/app/assignments" className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={`flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 ${compact ? 'h-16' : 'h-24'}`}>
          <p className="text-xs text-gray-500">No pending assignments</p>
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {items.map((item, idx) => (
            <div key={idx} className={compact ? 'rounded-lg p-2 hover:bg-gray-50 transition-colors' : 'flex items-center justify-between rounded-lg p-3 hover:bg-gray-50 transition-colors'}>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-900">{item.title}</p>
                <p className="truncate text-[11px] text-gray-500">{item.subtitle}</p>
              </div>
              {!compact && (
                <span className="flex-shrink-0 inline-block rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                  Due {item.subtitle}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoticesCard({ notices }) {
  const items = (notices || []).slice(0, 3);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Notices</h2>
        <Link to="/app/notices" className="flex-shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No notices</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((notice) => (
            <div key={notice.id} className="rounded-lg p-3 hover:bg-gray-50 transition-colors border-l-4 border-yellow-400">
              <p className="text-sm font-medium text-gray-900">{notice.title}</p>
              <p className="text-xs text-gray-500 mt-1">{new Date(notice.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuickActionsCard({ role }) {
  const actions = [
    { label: 'Mark Attendance', icon: '📋', to: '/app/attendance', roles: ['instructor', 'staff'] },
    { label: 'View Timetable', icon: '📅', to: '/app/timetable', roles: ['learner', 'instructor'] },
    { label: 'Submit Assignment', icon: '📝', to: '/app/assignments', roles: ['learner'] },
    { label: 'View Exams', icon: '📚', to: '/app/exams', roles: ['learner', 'instructor'] },
    { label: 'Check Results', icon: '📊', to: '/app/results', roles: ['learner'] },
    { label: 'Ask Doubt', icon: '❓', to: '/app/messages', roles: ['learner'] },
    { label: 'School Library', icon: '📖', to: '/app/library', roles: ['learner'] },
    { label: 'Manage Classes', icon: '🏫', to: '/app/cohorts', roles: ['admin'] },
    { label: 'Manage Instructors', icon: '🧑‍🏫', to: '/app/instructors', roles: ['admin'] },
    { label: 'Manage Learners', icon: '🎓', to: '/app/learners', roles: ['admin'] },
    { label: 'Reports', icon: '📈', to: '/app/reports', roles: ['admin'] },
    { label: 'Broadcast', icon: '📣', to: '/app/broadcast', roles: ['admin'] },
    { label: 'Access Control', icon: '🔐', to: '/app/access-control', roles: ['admin'] },
    { label: 'Settings', icon: '⚙️', to: '/app/profile', roles: ['admin'] },
  ];

  const filtered = actions.filter(a => a.roles.includes(role));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-8 shadow-sm hover:shadow-md transition-shadow">
      <h2 className="mb-4 sm:mb-6 text-base sm:text-lg font-semibold text-gray-900">Quick Actions</h2>
      <div className="grid grid-cols-3 gap-3 sm:gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {filtered.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 px-2 py-4 sm:px-4 sm:py-6 text-center transition-all hover:border-indigo-300 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:shadow-md"
          >
            <span className="mb-1.5 sm:mb-2 text-2xl sm:text-3xl group-hover:scale-110 transition-transform">{action.icon}</span>
            <span className="text-[11px] sm:text-xs font-semibold text-gray-700 group-hover:text-indigo-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

function relativeTime(ts) {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

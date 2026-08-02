import { Link } from 'react-router-dom';
import { Card } from '../../../components/Card';
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
  UserX,
  ArrowRight,
  ClipboardList,
  PenTool,
  ScrollText,
  Plus,
  CheckSquare,
  ShieldAlert
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

// Activity dot colors for timeline
const ACTIVITY_COLORS = {
  notice: 'var(--chart-yellow)',
  message: 'var(--chart-blue)',
  mention: 'var(--chart-violet)',
  assignment: 'var(--chart-magenta)',
  exam: 'var(--chart-orange)',
  attendance: 'var(--chart-aqua)',
  score: 'var(--chart-aqua)',
  leave: 'var(--chart-yellow)',
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
  const navigate = useNavigate();

  // Today's attendance breakdown (admin payload only) — [{status, count}].
  const attendanceToday = report?.attendanceToday || [];
  const absentToday = attendanceToday.find((r) => r.status === 'absent')?.count ?? 0;
  const lateToday = attendanceToday.find((r) => r.status === 'late')?.count ?? 0;

  const statCards = isAdmin
    ? [
        {
          icon: <UserX className="w-5 h-5 text-danger stroke-[2.2]" />,
          label: 'Absentees Today',
          value: absentToday,
          subtitle: `${lateToday} late`,
          color: 'rose',
          viewAllTo: '/app/attendance/absentees'
        },
        {
          icon: <PenTool className="w-5 h-5 text-success stroke-[2.2]" />,
          label: 'Assignments Graded',
          value: report?.teacherActivity?.assignments_graded ?? 0,
          subtitle: 'Completed feedback rounds',
          color: 'emerald',
          viewAllTo: '/app/assignments'
        },
        {
          icon: <ScrollText className="w-5 h-5 text-warning stroke-[2.2]" />,
          label: 'Notices Posted',
          value: report?.staffActivity?.notices_posted ?? 0,
          subtitle: 'Announcements published',
          color: 'orange',
          viewAllTo: '/app/notices'
        },
        {
          icon: <MessageSquare className="w-5 h-5 text-info stroke-[2.2]" />,
          label: 'Unread Messages',
          value: unreadMessages,
          subtitle: 'Inbox communication logs',
          color: 'blue',
          viewAllTo: '/app/messages'
        }
      ]
    : [
        {
          icon: <ClipboardList className="w-5 h-5 text-success stroke-[2.2]" />,
          label: 'Attendance (30 days)',
          value: report?.stats?.attendanceRate30d != null ? `${report.stats.attendanceRate30d}%` : '—',
          subtitle: report?.stats?.marked_30d > 0
            ? `Present • ${report.stats.present_30d} / ${report.stats.marked_30d} days`
            : 'No attendance logged yet',
          color: 'emerald',
          viewAllTo: '/app/attendance',
          sparkline: true
        },
        {
          icon: <BookOpen className="w-5 h-5 text-danger stroke-[2.2]" />,
          label: 'Pending Assignments',
          value: report?.pendingActions?.filter(a => a.type === 'assignment').length || 0,
          subtitle: 'Due this week submissions',
          color: 'rose',
          viewAllTo: '/app/assignments'
        },
        {
          icon: <Calendar className="w-5 h-5 text-warning stroke-[2.2]" />,
          label: 'Upcoming Exams',
          value: report?.stats?.upcomingExams ?? 0,
          subtitle: 'Scheduled subjects assessments',
          color: 'orange',
          viewAllTo: '/app/exams'
        },
        {
          icon: <MessageSquare className="w-5 h-5 text-info stroke-[2.2]" />,
          label: 'Unread Messages',
          value: unreadMessages,
          subtitle: 'Direct messaging box',
          color: 'blue',
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

      {/* Floating Action Button for Teachers/Admins */}
      {(role === 'instructor' || role === 'admin') && (
        <div className="fixed bottom-20 right-6 z-50 md:bottom-8 md:right-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition-transform hover:scale-105 active:scale-95">
                <Plus className="h-7 w-7" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={12} className="w-48">
              <DropdownMenuItem onClick={() => navigate('/app/attendance')} className="flex items-center gap-2 py-2">
                <CheckSquare className="h-4 w-4 text-accent" />
                <span className="font-medium text-ink-900">Attendance</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/app/discipline')} className="flex items-center gap-2 py-2">
                <ShieldAlert className="h-4 w-4 text-danger" />
                <span className="font-medium text-ink-900">Discipline</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
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

  // prioritize profile display name (me.name or user.name) over username
  const displayName = me?.name || user?.name || user?.username;

  return (
    <div>
      <h1 className="text-3xl font-bold text-ink-900">
        {greeting}, {displayName}! 👋
      </h1>
      <p className="mt-1 text-sm text-ink-700">Here's what's happening in your classes today.</p>
    </div>
  );
}

// ============================================================================
// CARD COMPONENTS
// ============================================================================

// Full literal class strings (not template-interpolated) so Tailwind's
// content scanner can actually find and generate them.
const STAT_COLORS = {
  emerald: { iconBg: 'bg-success-light', value: 'text-success' },
  rose: { iconBg: 'bg-danger-light', value: 'text-danger' },
  orange: { iconBg: 'bg-warning-light', value: 'text-warning' },
  blue: { iconBg: 'bg-info-light', value: 'text-info' }
};

function StatCard({ icon, label, value, subtitle, color, viewAllTo, sparkline }) {
  const styles = STAT_COLORS[color] || STAT_COLORS.emerald;
  return (
    <Card padding="p-4 sm:p-6" className="hover:shadow-md transition-shadow">
      <div className="mb-2 flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-start gap-1.5 sm:gap-2">
          <div className={`flex h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 items-center justify-center rounded-lg ${styles.iconBg}`}>{icon}</div>
          <p className="text-[11.5px] sm:text-[13px] font-semibold leading-tight text-ink-900">{label}</p>
        </div>
        {viewAllTo && (
          <Link to={viewAllTo} className="flex-shrink-0 text-[10.5px] sm:text-xs font-semibold text-accent hover:text-accent-dark">
            View all
          </Link>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className={`text-2xl sm:text-3xl font-bold ${styles.value}`}>{value}</p>
          <p className="mt-1 text-xs text-ink-700">{subtitle}</p>
        </div>
        {sparkline && <Sparkline />}
      </div>
    </Card>
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
    <Card padding="p-4 sm:p-6" className="hover:shadow-md transition-shadow">
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-ink-900">Today's Schedule</h2>
          <p className="mt-0.5 text-xs text-ink-500">{today}</p>
        </div>
        <Link to="/app/timetable" className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-accent hover:text-accent-dark">
          View all <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Link>
      </div>

      {todayClasses.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border">
          <p className="text-sm text-ink-500">No classes today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todayClasses.slice(0, 5).map((cls, idx) => {
            const isFirst = idx === 0;
            return (
              <div key={idx} className="flex items-center gap-3 sm:gap-4 rounded-lg p-2.5 sm:p-3 hover:bg-surface-muted transition-colors">
                <div className="flex flex-shrink-0 flex-col items-center rounded-lg bg-accent-light px-2 py-1.5">
                  <span className="text-[11px] sm:text-xs font-bold text-accent whitespace-nowrap">
                    {new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm sm:text-base font-semibold text-ink-900">{cls.subject || 'Class'}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-500">
                    {cls.room || 'Room'} • {cls.instructor || 'Instructor'}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 inline-block rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-semibold ${
                    isFirst ? 'bg-success-light text-success' : 'bg-surface-muted text-ink-700'
                  }`}
                >
                  {isFirst ? 'In Progress' : 'Upcoming'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function RecentMessagesCard({ inbox, compact }) {
  const items = (inbox || []).slice(0, compact ? 2 : 3);

  return (
    <Card padding={compact ? 'p-4' : 'p-6'} className="hover:shadow-md transition-shadow">
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        <h2 className={`font-semibold text-ink-900 ${compact ? 'text-sm' : 'text-lg'}`}>Recent Messages</h2>
        <Link to="/app/messages" className="flex-shrink-0 text-xs font-semibold text-accent hover:text-accent-dark">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={`flex items-center justify-center rounded-lg border-2 border-dashed border-border ${compact ? 'h-16' : 'h-24'}`}>
          <p className="text-xs text-ink-500">No messages</p>
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {items.map((msg) => (
            <div key={msg.id} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-surface-muted transition-colors">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-[11px] font-bold text-white">
                {msg.sender_username?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-ink-900">{msg.sender_username}</p>
                <p className="truncate text-[11px] text-ink-500">{msg.subject || msg.body}</p>
              </div>
              {!msg.is_read && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-accent"></div>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentActivityCard({ activities, compact }) {
  const items = (activities?.data || []).slice(0, compact ? 3 : 4);

  return (
    <Card padding={compact ? 'p-4' : 'p-6'} className="hover:shadow-md transition-shadow">
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        <h2 className={`font-semibold text-ink-900 ${compact ? 'text-sm' : 'text-lg'}`}>Recent Activity</h2>
        <Link to="/app/activities" className="flex-shrink-0 text-xs font-semibold text-accent hover:text-accent-dark">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={`flex items-center justify-center rounded-lg border-2 border-dashed border-border ${compact ? 'h-16' : 'h-24'}`}>
          <p className="text-xs text-ink-500">No activities</p>
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div
                className="mt-1 flex-shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: ACTIVITY_COLORS[item.type] || 'var(--ink-300)' }}
              ></div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs font-medium text-ink-900">{item.title}</p>
                <p className="text-[11px] text-ink-500">{relativeTime(item.ts)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
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
    <Card padding={compact ? 'p-4' : 'p-6'} className="hover:shadow-md transition-shadow">
      <h3 className={`font-semibold text-ink-900 ${compact ? 'mb-3 text-sm' : 'mb-4 text-lg'}`}>{month} {year}</h3>

      <div className={`grid grid-cols-7 gap-1 ${compact ? 'mb-1' : 'mb-3'}`}>
        {dayLabels.map((day, idx) => (
          <div key={idx} className={`text-center font-semibold text-ink-700 ${compact ? 'text-[9px] py-1' : 'text-xs py-2'}`}>
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
                  ? 'bg-gradient-to-br from-accent to-accent-dark text-white font-bold shadow-sm'
                  : 'text-ink-700 hover:bg-surface-muted'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function DueAssignmentsCard({ report, compact }) {
  const items = report?.pendingActions?.filter(a => a.type === 'assignment')?.slice(0, compact ? 2 : 3) || [];

  return (
    <Card padding={compact ? 'p-4' : 'p-6'} className="hover:shadow-md transition-shadow">
      <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-3' : 'mb-4'}`}>
        <h2 className={`font-semibold text-ink-900 ${compact ? 'text-sm' : 'text-lg'}`}>Due Assignments</h2>
        <Link to="/app/assignments" className="flex-shrink-0 text-xs font-semibold text-accent hover:text-accent-dark">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className={`flex items-center justify-center rounded-lg border-2 border-dashed border-border ${compact ? 'h-16' : 'h-24'}`}>
          <p className="text-xs text-ink-500">No pending assignments</p>
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
          {items.map((item, idx) => (
            <div key={idx} className={compact ? 'rounded-lg p-2 hover:bg-surface-muted transition-colors' : 'flex items-center justify-between rounded-lg p-3 hover:bg-surface-muted transition-colors'}>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-ink-900">{item.title}</p>
                <p className="truncate text-[11px] text-ink-500">{item.subtitle}</p>
              </div>
              {!compact && (
                <span className="flex-shrink-0 inline-block rounded-full bg-danger-light px-2.5 py-1 text-xs font-semibold text-danger">
                  Due {item.subtitle}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NoticesCard({ notices }) {
  const items = (notices || []).slice(0, 3);

  return (
    <Card padding="p-4 sm:p-6" className="hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-semibold text-ink-900">Notices</h2>
        <Link to="/app/notices" className="flex-shrink-0 text-xs font-semibold text-accent hover:text-accent-dark">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border">
          <p className="text-sm text-ink-500">No notices</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((notice) => (
            <div key={notice.id} className="rounded-lg p-3 hover:bg-surface-muted transition-colors border-l-4 border-warning">
              <p className="text-sm font-medium text-ink-900">{notice.title}</p>
              <p className="text-xs text-ink-500 mt-1">{new Date(notice.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

import {
  CheckSquare as QuickCheckSquare,
  Clock as QuickClock,
  FileText as QuickFileText,
  FileSpreadsheet as QuickFileSpreadsheet,
  BarChart3 as QuickBarChart3,
  HelpCircle as QuickHelpCircle,
  Library as QuickLibrary,
  School as QuickSchool,
  UserCheck as QuickUserCheck,
  Users as QuickUsers,
  TrendingUp as QuickTrendingUp,
  Radio as QuickRadio,
  ShieldCheck as QuickShieldCheck,
  Settings as QuickSettings,
  Grid
} from 'lucide-react';

function QuickActionsCard({ role }) {
  const actions = [
    { label: 'Mark Attendance', icon: QuickCheckSquare, to: '/app/attendance', roles: ['instructor', 'staff'], color: 'text-success bg-success-light' },
    { label: 'View Timetable', icon: QuickClock, to: '/app/timetable', roles: ['learner', 'instructor'], color: 'text-accent bg-accent-light' },
    { label: 'Submit Assignment', icon: QuickFileText, to: '/app/assignments', roles: ['learner'], color: 'text-danger bg-danger-light' },
    { label: 'View Exams', icon: QuickFileSpreadsheet, to: '/app/exams', roles: ['learner', 'instructor'], color: 'text-warning bg-warning-light' },
    { label: 'Check Results', icon: QuickBarChart3, to: '/app/results', roles: ['learner'], color: 'text-info bg-info-light' },
    { label: 'Ask Doubt', icon: QuickHelpCircle, to: '/app/messages', roles: ['learner'], color: 'text-accent bg-accent-light' },
    { label: 'School Library', icon: QuickLibrary, to: '/app/library', roles: ['learner'], color: 'text-warning bg-warning-light' },
    { label: 'Manage Classes', icon: QuickSchool, to: '/app/cohorts', roles: ['admin'], color: 'text-accent bg-accent-light' },
    { label: 'Manage Instructors', icon: QuickUserCheck, to: '/app/instructors', roles: ['admin'], color: 'text-success bg-success-light' },
    { label: 'Manage Learners', icon: QuickUsers, to: '/app/learners', roles: ['admin'], color: 'text-danger bg-danger-light' },
    { label: 'Reports', icon: QuickTrendingUp, to: '/app/reports', roles: ['admin'], color: 'text-info bg-info-light' },
    { label: 'Broadcast', icon: QuickRadio, to: '/app/broadcast', roles: ['admin'], color: 'text-warning bg-warning-light' },
    { label: 'Access Control', icon: QuickShieldCheck, to: '/app/access-control', roles: ['admin'], color: 'text-accent bg-accent-light' },
    { label: 'Settings', icon: QuickSettings, to: '/app/profile', roles: ['admin'], color: 'text-ink-700 bg-surface-muted' },
  ];

  const filtered = actions.filter(a => a.roles.includes(role));

  return (
    <Card padding="p-6">
      <h2 className="mb-4 text-[15px] font-extrabold text-ink-900 tracking-tight flex items-center gap-2">
        <Grid className="h-4 w-4 text-ink-500" /> Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {filtered.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Link
              key={idx}
              to={action.to}
              className="group flex flex-col items-center justify-center rounded-xl border border-border-subtle bg-surface py-4 px-2 text-center transition-all duration-200 hover:border-accent-light hover:bg-accent-light/35 hover:shadow-sm"
            >
              <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-xl ${action.color} group-hover:scale-105 transition-transform duration-200`}>
                <Icon className="h-6 w-6 stroke-[2.2]" />
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-ink-700 group-hover:text-accent leading-tight">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </Card>
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

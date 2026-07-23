import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboardReport } from '../../reports/hooks/useReports';
import { useNotices } from '../../notices/hooks/useNotices';
import { useInbox } from '../../messages/hooks/useMessages';
import { useActivities } from '../../activities/hooks/useActivities';
import { useMyTimetable } from '../../timetable/hooks/useTimetable';
import { useMyProfile } from '../../profile/hooks/useProfile';
import {
  Calendar,
  Clock,
  BookOpen,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  TrendingUp,
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

  return (
    <div>
      <div className="mb-8">
        <Greeting />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {isAdmin ? (
          <>
            <StatCard
              icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
              label="Attendance Marked"
              value={report?.teacherActivity?.attendance_marked ?? 0}
              subtitle="Last 7 days"
              bgGradient="from-emerald-50 to-emerald-100"
            />
            <StatCard
              icon={<BookOpen className="w-6 h-6 text-rose-600" />}
              label="Assignments Graded"
              value={report?.teacherActivity?.assignments_graded ?? 0}
              subtitle="Last 7 days"
              bgGradient="from-rose-50 to-rose-100"
            />
            <StatCard
              icon={<AlertCircle className="w-6 h-6 text-orange-600" />}
              label="Notices Posted"
              value={report?.staffActivity?.notices_posted ?? 0}
              subtitle="Last 7 days"
              bgGradient="from-orange-50 to-orange-100"
            />
            <StatCard
              icon={<MessageSquare className="w-6 h-6 text-blue-600" />}
              label="Unread Messages"
              value={unreadMessages}
              subtitle="New messages"
              bgGradient="from-blue-50 to-blue-100"
            />
          </>
        ) : (
          <>
            <StatCard
              icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
              label="Attendance This Week"
              value={`${report?.stats?.attendanceRate30d ?? 0}%`}
              subtitle="Present • 13 / 15 days"
              trend="+2.5%"
              bgGradient="from-emerald-50 to-emerald-100"
            />
            <StatCard
              icon={<BookOpen className="w-6 h-6 text-rose-600" />}
              label="Pending Assignments"
              value={report?.pendingActions?.filter(a => a.type === 'assignment').length || 0}
              subtitle="Due this week"
              bgGradient="from-rose-50 to-rose-100"
            />
            <StatCard
              icon={<Calendar className="w-6 h-6 text-orange-600" />}
              label="Upcoming Exams"
              value={report?.stats?.upcomingExams ?? 0}
              subtitle="Next: 5 days"
              bgGradient="from-orange-50 to-orange-100"
            />
            <StatCard
              icon={<MessageSquare className="w-6 h-6 text-blue-600" />}
              label="Unread Messages"
              value={unreadMessages}
              subtitle="New messages"
              bgGradient="from-blue-50 to-blue-100"
            />
          </>
        )}
      </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Today's Schedule & Messages */}
          <div className="lg:col-span-2 space-y-6">
            <TodayScheduleCard timetable={timetable} />
            <RecentMessagesCard inbox={inbox} />
          </div>

          {/* Right Column - Activity & Calendar */}
          <div className="space-y-6">
            <RecentActivityCard activities={activities} />
            <CalendarWidget />
          </div>
        </div>

        {/* Bottom Row - Assignments & Notices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <DueAssignmentsCard report={report} />
          <NoticesCard notices={notices} />
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

function StatCard({ icon, label, value, subtitle, trend, bgGradient }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-gradient-to-br ${bgGradient} p-6 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs text-gray-600">{subtitle}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-600">{trend}</span>
            </div>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/60 backdrop-blur">
          {icon}
        </div>
      </div>
    </div>
  );
}

function TodayScheduleCard({ timetable }) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const todayClasses = timetable?.filter(t => new Date(t.start_time).toDateString() === new Date().toDateString()) || [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Today's Schedule</h2>
          <p className="mt-0.5 text-xs text-gray-500">{today}</p>
        </div>
        <Link to="/app/timetable" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {todayClasses.length === 0 ? (
        <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No classes today</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todayClasses.slice(0, 5).map((cls, idx) => (
            <div key={idx} className="flex items-center gap-4 rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col items-center">
                <span className="text-xs font-bold text-indigo-600">
                  {new Date(cls.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="mt-1 h-2 w-2 rounded-full bg-indigo-600"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{cls.subject || 'Class'}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {cls.room || 'Room'} • {cls.instructor || 'Instructor'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  In Progress
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentMessagesCard({ inbox }) {
  const items = (inbox || []).slice(0, 3);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Messages</h2>
        <Link to="/app/messages" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No messages</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((msg) => (
            <div key={msg.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50 transition-colors">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white">
                {msg.sender_username?.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{msg.sender_username}</p>
                <p className="truncate text-xs text-gray-500">{msg.subject || msg.body}</p>
              </div>
              {!msg.is_read && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-indigo-600"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentActivityCard({ activities }) {
  const items = (activities?.data || []).slice(0, 4);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <Link to="/app/activities" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No activities</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div
                className="mt-1 flex-shrink-0 w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ACTIVITY_COLORS[item.type] || '#6B7280' }}
              ></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">{relativeTime(item.ts)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarWidget() {
  const today = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[today.getMonth()];
  const year = today.getFullYear();
  const daysInMonth = new Date(year, today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(year, today.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{month} {year}</h3>

      <div className="mb-3 grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
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
              className={`py-1.5 text-xs rounded-lg font-medium transition-all ${
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

function DueAssignmentsCard({ report }) {
  const items = report?.pendingActions?.filter(a => a.type === 'assignment')?.slice(0, 3) || [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Due Assignments</h2>
        <Link to="/app/assignments" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View all
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-500">No pending assignments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between rounded-lg p-3 hover:bg-gray-50 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">{item.subtitle}</p>
              </div>
              <span className="inline-block rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                Due {item.subtitle}
              </span>
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
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Notices</h2>
        <Link to="/app/notices" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
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
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md transition-shadow">
      <h2 className="mb-6 text-lg font-semibold text-gray-900">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
        {filtered.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group flex flex-col items-center justify-center rounded-lg border-2 border-gray-200 px-4 py-6 text-center transition-all hover:border-indigo-300 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:shadow-md"
          >
            <span className="mb-2 text-3xl group-hover:scale-110 transition-transform">{action.icon}</span>
            <span className="text-xs font-semibold text-gray-700 group-hover:text-indigo-700">{action.label}</span>
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

import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, CheckCircle2, ClipboardList, CalendarDays,
  GraduationCap, Plus, CalendarCheck, ShieldAlert,
  Zap, ChevronRight, Bell, AlertCircle, Clock, XCircle
} from 'lucide-react';
import { TeacherHeader } from '../../../components/TeacherHeader';
import { Card } from '../../../components/Card';
import { FlatList, FlatRow } from '../../../components/FlatList';
import { SectionHeader } from '../../../components/SectionHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { useLearners } from '../../learners/hooks/useLearners';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useMyTimetable } from '../../timetable/hooks/useTimetable';
import { useCohortAttendanceLogs } from '../../attendance/hooks/useAttendance';
import { useAssignments } from '../../assignments/hooks/useAssignments';
import { useNotices } from '../../notices/hooks/useNotices';
import { useAgenda } from '../../calendar/hooks/useCalendar';

// ── helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// "09:00-09:45"  →  { start: "09:00 AM", end: "09:45 AM" }
function formatHour(hourStr) {
  function fmt(hm) {
    const [h, m] = hm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  }
  const [start, end] = (hourStr || '').split('-');
  return { start: start ? fmt(start) : '—', end: end ? fmt(end) : '' };
}

// Derives Completed / Next / Upcoming based on current wall-clock time vs slot
function slotStatus(hourStr) {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [startStr, endStr] = (hourStr || '').split('-');
  if (!startStr || !endStr) return 'Upcoming';
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  if (nowMins >= endMins) return 'Completed';
  if (nowMins >= startMins) return 'Next';
  return 'Upcoming';
}

const STATUS_STYLES = {
  Completed: 'bg-indigo-50 text-indigo-700',
  Next:      'bg-purple-100 text-purple-700',
  Upcoming:  'bg-gray-100 text-gray-600',
};

// ── component ─────────────────────────────────────────────────────────────────

export function TeacherDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const today = todayIso();
  const todayName = DAY_NAMES[new Date().getDay()];

  // ── real data ──
  const { data: learnersData } = useLearners();
  const { data: cohortsData }  = useCohorts();
  const { data: timetableData } = useMyTimetable();
  const { data: logsData }      = useCohortAttendanceLogs(today);
  const { data: assignmentsData } = useAssignments();
  const { data: noticesData }   = useNotices();

  // Upcoming events: today → 30 days out
  const until = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const { data: agendaData } = useAgenda(today, until);

  // ── derived values ──────────────────────────────────────────────────────────

  const studentCount = learnersData?.length ?? learnersData?.data?.length ?? '—';
  const classCount   = cohortsData?.length  ?? cohortsData?.data?.length  ?? '—';

  // Timetable: filter allocations for today, sort by start time
  const todaySchedule = useMemo(() => {
    const rows = timetableData?.data ?? timetableData ?? [];
    return rows
      .filter((a) => (a.schedule_data?.days || []).includes(todayName))
      .sort((a, b) => {
        const aStart = (a.schedule_data?.hour || '').split('-')[0] || '';
        const bStart = (b.schedule_data?.hour || '').split('-')[0] || '';
        return aStart.localeCompare(bStart);
      });
  }, [timetableData, todayName]);

  // Attendance glance: how many of today's classes have a complete (non-partial) log
  const logs = Array.isArray(logsData) ? logsData : (logsData?.data ?? []);
  const markedCount    = logs.filter((l) => !l.is_partial).length;
  const totalClasses   = todaySchedule.length || (typeof classCount === 'number' ? classCount : 0);
  const attendanceText = totalClasses > 0 ? `${markedCount}/${totalClasses}` : `${markedCount}`;

  let attendanceColor = 'text-gray-600 bg-gray-50';
  let AttendanceIcon = CheckCircle2;

  if (totalClasses > 0) {
    if (markedCount >= totalClasses) {
      attendanceColor = 'text-emerald-600 bg-emerald-50';
      AttendanceIcon = CheckCircle2;
    } else if (markedCount > 0) {
      attendanceColor = 'text-orange-600 bg-orange-50';
      AttendanceIcon = Clock;
    } else {
      attendanceColor = 'text-red-600 bg-red-50';
      AttendanceIcon = XCircle;
    }
  } else if (markedCount > 0) {
    attendanceColor = 'text-emerald-600 bg-emerald-50';
    AttendanceIcon = CheckCircle2;
  }

  // Assignments: count ones the instructor created that have ungraded submissions
  const assignments = assignmentsData?.assignments ?? [];
  const toGradeCount = assignments.filter((a) => (a.ungraded_count ?? 0) > 0).length;

  let assignmentsColor = 'text-emerald-600 bg-emerald-50';
  let AssignmentsIcon = CheckCircle2;

  if (toGradeCount > 0) {
    assignmentsColor = 'text-orange-600 bg-orange-50';
    AssignmentsIcon = ClipboardList;
  }

  // Notices: newest 3
  const notices = (noticesData?.data ?? noticesData ?? []).slice(0, 3);

  // Upcoming events: next 3
  const events = (agendaData?.data ?? agendaData ?? []).slice(0, 3);

  // ── render ──────────────────────────────────────────────────────────────────

  const glanceCards = [
    {
      icon: Users,
      value: String(typeof classCount === 'number' ? classCount : '—'),
      label: 'My Classes',
      color: 'text-indigo-600 bg-indigo-50',
      path: '/app/cohorts'
    },
    {
      icon: AttendanceIcon,
      value: attendanceText,
      label: 'Attendance Marked',
      color: attendanceColor
    },
    {
      icon: AssignmentsIcon,
      value: toGradeCount > 0 ? String(toGradeCount) : '0',
      label: 'Assignments To Grade',
      color: assignmentsColor
    },
    {
      icon: CalendarDays,
      value: String(todaySchedule.length),
      label: "Today's Classes",
      subtitle: todaySchedule.length > 0
        ? `Next: ${formatHour(todaySchedule.find(s => slotStatus(s.schedule_data?.hour) !== 'Completed')?.schedule_data?.hour || '').start}`
        : null,
      color: 'text-indigo-600 bg-indigo-50'
    },
  ];

  return (
    <div className="bg-[#f8f9fe] min-h-screen pb-24 font-body">
      <TeacherHeader
        showSearch={true}
        searchPlaceholder="Search students, class, apps .."
        headerStats={[
          {
            label: 'Students',
            value: typeof studentCount === 'number' ? studentCount.toLocaleString() : String(studentCount),
            icon: Users,
            color: 'bg-[#917bf6]'
          },
          {
            label: 'Classes',
            value: String(typeof classCount === 'number' ? classCount : '—'),
            icon: GraduationCap,
            color: 'bg-[#917bf6]'
          }
        ]}
      />

      <div className="px-4 relative z-20 space-y-6 pt-4">

        {/* Quick-action shortcut row. Mobile: flat, edge-to-edge rows (no
            per-row box) — see components/FlatList.jsx. Desktop keeps the
            side-by-side boxed-button treatment, which reads fine as
            multi-column content rather than a cramped stacked list. */}
        <div className="md:hidden -mx-4">
          <SectionHeader className="px-4">Quick actions</SectionHeader>
          <FlatList className="bg-white">
            <FlatRow
              onClick={() => navigate('/app/attendance')}
              icon={Zap}
              iconBg="#dcfce7"
              iconColor="#16a34a"
              title="Mark Attendance Now"
              subtitle="Quickly mark student attendance"
              chevron
            />
            <FlatRow
              onClick={() => navigate('/app/discipline/new')}
              icon={ShieldAlert}
              iconBg="#ffedd5"
              iconColor="#ea580c"
              title="Log Discipline"
              subtitle="Record student behavior"
              chevron
            />
          </FlatList>
        </div>

        <div className="hidden md:flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/attendance')}
            className="flex items-center gap-3 bg-[#e8f9ee] rounded-2xl px-4 py-3.5 shadow-sm border border-[#c3edcf] active:scale-[0.98] transition-transform text-left w-full"
          >
            <div className="w-10 h-10 rounded-xl bg-[#22c55e] flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[#166534] leading-tight">Mark Attendance Now</div>
              <div className="text-[11px] text-[#16a34a] mt-0.5 font-medium">Quickly mark student attendance</div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/app/discipline/new')}
            className="flex items-center gap-3 bg-[#fff7ed] rounded-2xl px-4 py-3.5 shadow-sm border border-[#fed7aa] active:scale-[0.98] transition-transform text-left w-full"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f97316] flex items-center justify-center flex-shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[#7c2d12] leading-tight">Log Discipline</div>
              <div className="text-[11px] text-[#ea580c] mt-0.5 font-medium">Record student behavior</div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#f97316] flex-shrink-0" />
          </button>
        </div>

        {/* Today at a glance. Mobile: flat rows. Desktop: horizontal-scroll
            stat tiles (unchanged) — a carousel of cards is a reasonable
            desktop treatment, not the "stack of boxed rows" pattern this
            redesign targets. */}
        <div>
          <div className="md:hidden -mx-4">
            <SectionHeader className="px-4">Today at a glance</SectionHeader>
            <FlatList className="bg-white">
              {glanceCards.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <FlatRow key={idx} to={card.path}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-semibold text-gray-900">{card.label}</div>
                      {card.subtitle && <div className="text-[11px] font-semibold text-indigo-600 mt-0.5">{card.subtitle}</div>}
                    </div>
                    <div className="text-[16px] font-bold text-gray-900">{card.value}</div>
                  </FlatRow>
                );
              })}
            </FlatList>
          </div>

          <h2 className="hidden md:block text-[15px] font-bold text-gray-900 mb-3">Today at a glance</h2>
          <div className="hidden md:flex gap-2.5 overflow-x-auto pb-2 scroll-smooth [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {glanceCards.map((card, idx) => {
              const Icon = card.icon;
              const CardWrapper = card.path ? Link : 'div';
              return (
                <CardWrapper
                  key={idx}
                  to={card.path}
                  className={`bg-white rounded-2xl p-4 shadow-sm min-w-[140px] flex-shrink-0 flex flex-col items-start justify-between border border-gray-100 block ${card.path ? 'cursor-pointer hover:border-indigo-200 transition-colors active:scale-[0.98]' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 flex-shrink-0 ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-gray-500 leading-tight">{card.label}</div>
                    {card.subtitle && <div className="text-[10px] font-semibold text-indigo-600 mt-1">{card.subtitle}</div>}
                    <div className="text-2xl font-bold text-gray-900 mt-1">{card.value}</div>
                  </div>
                </CardWrapper>
              );
            })}
          </div>
        </div>

        {/* Today's Schedule */}
        <Card padding="p-5" className="-mx-4 md:mx-0">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-bold text-gray-900">Today's Schedule</h2>
            <Link to="/app/timetable" className="text-xs font-semibold text-indigo-600">View Timetable</Link>
          </div>

          {todaySchedule.length === 0 ? (
            <div className="text-center py-6 text-[13px] text-gray-400">No classes scheduled for today.</div>
          ) : (
            <div className="space-y-0 relative">
              <div className="absolute left-[88px] top-4 bottom-8 w-px bg-indigo-200" />
              {todaySchedule.map((item, idx) => {
                const { start, end } = formatHour(item.schedule_data?.hour);
                const status = slotStatus(item.schedule_data?.hour);
                return (
                  <div key={item.id ?? idx} className="flex items-start gap-4 pb-6 relative z-10">
                    <div className="w-[72px] flex-shrink-0 text-right pt-2">
                      <div className="text-[12px] font-bold text-gray-900 leading-tight">{start}</div>
                      <div className="text-[10px] font-medium text-gray-500">{end}</div>
                    </div>
                    <div className="flex flex-col items-center pt-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${status !== 'Upcoming' ? 'bg-indigo-600' : 'bg-gray-300'}`} />
                    </div>
                    <div className={`flex-1 rounded-2xl p-4 border flex items-center justify-between ${status === 'Next' ? 'border-indigo-100 bg-[#fbfaff]' : 'border-gray-100 bg-white'}`}>
                      <div>
                        <div className="text-[14px] font-bold text-gray-900">{item.cohort_name || '—'}</div>
                        <div className="text-[12px] text-gray-500 mt-0.5">{item.module_name || '—'}</div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 ${STATUS_STYLES[status]}`}>
                        {status}
                        {status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent Notices */}
        <Card padding="p-5" className="-mx-4 md:mx-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-gray-900">Recent Notices</h2>
            <Link to="/app/notices" className="text-xs font-semibold text-indigo-600">View all</Link>
          </div>
          {notices.length === 0 ? (
            <div className="text-center py-6 text-[13px] text-gray-400">No notices yet.</div>
          ) : (
            <div className="space-y-4">
              {notices.map((notice, idx) => (
                <div key={notice.id ?? idx} className={`flex items-center gap-4 ${idx !== notices.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                  <div className="w-12 h-12 rounded-xl flex flex-shrink-0 items-center justify-center text-indigo-600 bg-indigo-50">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-gray-900 truncate">{notice.title}</div>
                    <div className="text-[11px] font-medium text-gray-500 mt-0.5">
                      {notice.audience || notice.audience_label || 'Whole School'} • {timeAgo(notice.created_at)}
                    </div>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 flex-shrink-0 ml-2" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Upcoming Events */}
        <Card padding="p-5" className="-mx-4 md:mx-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-gray-900">Upcoming Events</h2>
            <Link to="/app/calendar" className="text-xs font-semibold text-indigo-600">View calendar</Link>
          </div>
          {events.length === 0 ? (
            <div className="text-center py-6 text-[13px] text-gray-400">No upcoming events.</div>
          ) : (
            <div className="space-y-4">
              {events.map((event, idx) => {
                const d = new Date(event.date ?? event.start ?? event.start_date ?? today);
                const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                const day   = d.getDate();
                // Format display time if event has one
                const timeStr = event.start_time
                  ? formatHour(`${event.start_time}-${event.end_time || event.start_time}`).start
                  : event.time || null;
                return (
                  <div key={event.id ?? idx} className={`flex items-center gap-4 ${idx !== events.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col flex-shrink-0 items-center justify-center">
                      <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">{month}</span>
                      <span className="text-[16px] font-extrabold text-gray-900 leading-none mt-0.5">{day}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-gray-900 truncate">{event.title || event.name}</div>
                      <div className="text-[11px] font-medium text-gray-500 mt-0.5">{event.description || event.audience || ''}</div>
                    </div>
                    {timeStr && (
                      <div className="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                        {timeStr}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { ModuleBadge } from '../../../components/ModuleBadge';
import { ClassChatTab } from './ClassChatTab';

// The Class tab's main view for one cohort — quick-link cards into the
// existing Assignments/Exams/Timetable/Attendance pages (scoped to this
// class where those pages support it), plus a Teams-style Chat feed as the
// main content. Deliberately doesn't rebuild those pages' management UI
// inline — a teacher who can already add/grade/mark keeps using the same
// full-featured pages, just reached from here instead of only the sidebar.
export function ClassChannel({ cohort, showBack }) {
  const { can } = useAuth();
  const canMarkAttendance = can('attendance.mark');

  const quickLinks = [
    { key: 'assignments', label: 'Assignments', to: '/app/assignments' },
    { key: 'exams', label: 'Exams', to: '/app/exams' },
    { key: 'timetable', label: 'Timetable', to: `/app/timetable?cohort=${cohort.id}` },
    ...(canMarkAttendance ? [{ key: 'attendance', label: 'Attendance', to: '/app/attendance' }] : [])
  ];

  return (
    <div className="flex h-[calc(100vh-115px)] flex-col md:h-[calc(100vh-40px)] md:-mb-[60px]">
      <div className="flex-shrink-0">
        {showBack && (
          <Link to="/app/class" className="mb-4 hidden items-center gap-1 text-[12.5px] font-semibold text-ink-500 hover:text-ink-900 md:flex">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Your Classes
          </Link>
        )}

        <div className="mb-4 flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:items-baseline sm:gap-3">
            <h1 className="flex items-center gap-1.5 font-display text-2xl font-bold tracking-tight text-ink-900">
              {cohort.name}
              <div 
                className="flex items-center text-ink-400 sm:hidden"
                title={`${cohort.advisor_first_name ? `${cohort.advisor_first_name} ${cohort.advisor_last_name} · ` : ''}${cohort.learner_count} students`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </h1>
            <div className="hidden text-[13px] text-ink-500 sm:block sm:pb-1">
              {cohort.advisor_first_name ? `${cohort.advisor_first_name} ${cohort.advisor_last_name} · ` : ''}
              {cohort.learner_count} students
            </div>
          </div>

          <div className="flex flex-nowrap items-center gap-4 overflow-x-auto sm:gap-6">
            <div className="flex items-center gap-2 border-b-2 border-accent pb-1 text-[13px] font-bold text-accent-dark">
              <ModuleBadge moduleKey="messages" label="Chat" size={22} />
              Chat
            </div>
            {quickLinks.map((q) => (
              <Link key={q.key} to={q.to} className="flex flex-shrink-0 items-center gap-2 border-b-2 border-transparent pb-1 text-[13px] font-semibold text-ink-600 transition hover:border-border hover:text-ink-900">
                <ModuleBadge moduleKey={q.key} label={q.label} size={22} />
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ClassChatTab cohortId={cohort.id} />
      </div>
    </div>
  );
}

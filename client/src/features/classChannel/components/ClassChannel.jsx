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
    <div>
      {showBack && (
        <Link to="/app/class" className="mb-4 flex items-center gap-1 text-[12.5px] font-semibold text-ink-500 hover:text-ink-900">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Your Classes
        </Link>
      )}

      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{cohort.name}</h1>
        <div className="mt-0.5 text-[13px] text-ink-500">
          {cohort.advisor_first_name ? `${cohort.advisor_first_name} ${cohort.advisor_last_name} · ` : ''}
          {cohort.learner_count} students
        </div>
      </div>

      <div className={`mb-6 grid gap-2.5 ${quickLinks.length > 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {quickLinks.map((q) => (
          <Link key={q.key} to={q.to} className="rounded border border-border bg-surface p-3 transition hover:border-accent">
            <ModuleBadge moduleKey={q.key} label={q.label} size={26} />
            <div className="mt-2 text-[12px] font-semibold text-ink-900">{q.label}</div>
          </Link>
        ))}
      </div>

      <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">Class Chat</div>
      <ClassChatTab cohortId={cohort.id} />
    </div>
  );
}

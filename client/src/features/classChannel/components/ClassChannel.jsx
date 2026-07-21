import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { ClassChatTab } from './ClassChatTab';
import { ClassAssignmentsTab } from '../../assignments/components/ClassAssignmentsTab';
import { ClassExamsTab } from '../../onlineExams/components/ClassExamsTab';
import { ClassTimetableTab } from '../../timetable/components/ClassTimetableTab';
import { ClassAttendanceTab } from '../../attendance/components/ClassAttendanceTab';

// The Class tab's main view for one cohort — a Microsoft Teams-style
// channel: Chat/Assignments/Exams/Timetable/Attendance all live as tabs
// inside this one page, scoped to this cohort, instead of each being its
// own page you navigate away to. There's no "which class" picker inside any
// tab — you're already looking at one class, so each tab is just that
// class's slice of the feature. The full, class-selectable versions of
// these pages (for whoever's browsing the whole school, not one class)
// still exist at /app/assignments etc., reached from the More directory —
// see each Class*Tab component for the "manage across all classes" link
// privileged users get back to those.
const TAB_DEFS = [
  { key: 'chat', label: 'Chat' },
  { key: 'assignments', label: 'Assignments', gate: (can) => can('assignments.view') },
  { key: 'exams', label: 'Exams', gate: (can) => can('online_exams.view') },
  { key: 'timetable', label: 'Timetable', gate: (can) => can('timetable.view') },
  { key: 'attendance', label: 'Attendance', gate: (can, hasModule) => hasModule('attendance') && can('attendance.view') }
];

export function ClassChannel({ cohort, showBack }) {
  const { can } = useAuth();
  const { hasModule } = useConfig();
  const [tab, setTab] = useState('chat');

  const tabs = TAB_DEFS.filter((t) => !t.gate || t.gate(can, hasModule));
  const activeTab = tabs.some((t) => t.key === tab) ? tab : 'chat';

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

      {/* Horizontally scrollable, not wrapping — up to 5 tabs need to fit
          (or at least be reachable by a swipe) on the narrowest phone
          screens without pushing content down. */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-0.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              activeTab === t.key ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'chat' && <ClassChatTab cohortId={cohort.id} />}
      {activeTab === 'assignments' && <ClassAssignmentsTab cohortId={cohort.id} />}
      {activeTab === 'exams' && <ClassExamsTab cohortId={cohort.id} />}
      {activeTab === 'timetable' && <ClassTimetableTab cohortId={cohort.id} cohortTimeBlock={cohort.time_block} />}
      {activeTab === 'attendance' && <ClassAttendanceTab cohortId={cohort.id} />}
    </div>
  );
}

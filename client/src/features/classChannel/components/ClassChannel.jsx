import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { ModuleBadge } from '../../../components/ModuleBadge';
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
  { key: 'chat', label: 'Chat', moduleKey: 'messages' },
  { key: 'assignments', label: 'Assignments', moduleKey: 'assignments', gate: (can) => can('assignments.view') },
  { key: 'exams', label: 'Exams', moduleKey: 'exams', gate: (can) => can('online_exams.view') },
  { key: 'timetable', label: 'Timetable', moduleKey: 'timetable', gate: (can) => can('timetable.view') },
  { key: 'attendance', label: 'Attendance', moduleKey: 'attendance', gate: (can, hasModule) => hasModule('attendance') && can('attendance.view') }
];

export function ClassChannel({ cohort, showBack }) {
  const { can } = useAuth();
  const { hasModule } = useConfig();
  const [tab, setTab] = useState('chat');

  const tabs = TAB_DEFS.filter((t) => !t.gate || t.gate(can, hasModule));
  const activeTab = tabs.some((t) => t.key === tab) ? tab : 'chat';
  const isChat = activeTab === 'chat';

  return (
    // Chat gets the fixed-viewport-height flex treatment so its own scroll
    // container can fill the screen; the other tabs are ordinary tables/
    // forms that scroll with the page like every other management screen,
    // so they don't want to be squeezed into that same fixed height.
    <div className={isChat ? 'flex h-[calc(100vh-115px)] flex-col md:h-[calc(100vh-40px)] md:-mb-[60px]' : ''}>
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

          {/* Horizontally scrollable, not wrapping — up to 5 tabs need to
              fit (or at least be reachable by a swipe) on the narrowest
              phone screens. */}
          <div className="flex flex-nowrap items-center gap-4 overflow-x-auto sm:gap-6">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex flex-shrink-0 items-center gap-2 border-b-2 pb-1 text-[13px] font-semibold transition ${
                  activeTab === t.key
                    ? 'border-accent text-accent-dark'
                    : 'border-transparent text-ink-600 hover:border-border hover:text-ink-900'
                }`}
              >
                <ModuleBadge moduleKey={t.moduleKey} label={t.label} size={22} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isChat ? (
        <div className="min-h-0 flex-1">
          <ClassChatTab cohortId={cohort.id} />
        </div>
      ) : (
        <>
          {activeTab === 'assignments' && <ClassAssignmentsTab cohortId={cohort.id} />}
          {activeTab === 'exams' && <ClassExamsTab cohortId={cohort.id} />}
          {activeTab === 'timetable' && <ClassTimetableTab cohortId={cohort.id} cohortTimeBlock={cohort.time_block} />}
          {activeTab === 'attendance' && <ClassAttendanceTab cohortId={cohort.id} />}
        </>
      )}
    </div>
  );
}

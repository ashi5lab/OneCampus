import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { ModuleBadge } from '../../../components/ModuleBadge';
import { PageHeader } from '../../../components/PageHeader';
import { ClassChatTab } from './ClassChatTab';
import { ClassAssignmentsTab } from '../../assignments/components/ClassAssignmentsTab';
import { ClassExamsTab } from '../../onlineExams/components/ClassExamsTab';
import { ClassTimetableTab } from '../../timetable/components/ClassTimetableTab';
import { ClassAttendanceTab } from '../../attendance/components/ClassAttendanceTab';
import { ClassMembersTab } from './ClassMembersTab';

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
  { key: 'members', label: 'Members', moduleKey: 'cohorts' },
  { key: 'assignments', label: 'Assignments', moduleKey: 'assignments', gate: (can) => can('assignments.view') },
  { key: 'exams', label: 'Exams', moduleKey: 'exams', gate: (can) => can('online_exams.view') },
  { key: 'timetable', label: 'Timetable', moduleKey: 'timetable', gate: (can) => can('timetable.view') },
  { key: 'attendance', label: 'Attendance', moduleKey: 'attendance', gate: (can, hasModule) => hasModule('attendance') && can('attendance.view') }
];

export function ClassChannel({ cohort, showBack }) {
  const { can } = useAuth();
  const { hasModule } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab || 'chat');

  useEffect(() => {
    if (location.state?.tab) {
      setTab(location.state.tab);
    }
  }, [location.state?.tab]);

  const tabs = TAB_DEFS.filter((t) => !t.gate || t.gate(can, hasModule));
  const activeTab = tabs.some((t) => t.key === tab) ? tab : 'chat';
  const isChat = activeTab === 'chat';

  const subtitle = `${cohort.advisor_first_name ? `${cohort.advisor_first_name} ${cohort.advisor_last_name} · ` : ''}${cohort.learner_count} students`;

  return (
    // Chat gets the fixed-viewport-height flex treatment so its own scroll
    // container can fill the screen; the other tabs are ordinary tables/
    // forms that scroll with the page like every other management screen,
    // so they don't want to be squeezed into that same fixed height.
    <div className={isChat ? 'flex h-[calc(100dvh-185px)] flex-col md:h-[calc(100dvh-40px)] md:-mb-[60px]' : ''}>
      <div className="flex-shrink-0">
        <PageHeader
          title={cohort.name}
          subtitle={subtitle}
          back={showBack}
          onBack={() => navigate('/app/class')}
          tabs={
            // Horizontally scrollable, not wrapping — up to 5 tabs need to
            // fit (or at least be reachable by a swipe) on the narrowest
            // phone screens.
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
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
          }
        />
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
          {activeTab === 'members' && <ClassMembersTab cohortId={cohort.id} cohort={cohort} />}
        </>
      )}
    </div>
  );
}

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
import { ClassDocumentsTab } from './ClassDocumentsTab';

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
  { key: 'attendance', label: 'Attendance', moduleKey: 'attendance', gate: (can, hasModule) => hasModule('attendance') && can('attendance.view') },
  { key: 'documents', label: 'Documents', moduleKey: 'messages' }
];

export function ClassChannel({ cohort, showBack }) {
  const { can, user } = useAuth();
  const { hasModule } = useConfig();
  const navigate = useNavigate();
  // Admins reach this via the class-channels roster (/app/class-channels);
  // everyone else via their own fixed Class destination (/app/class) — see
  // Sidebar/BottomTabBar's identical role check. Back must return to
  // whichever list actually led here, not always the same one.
  const backTo = user?.role === 'admin' ? '/app/class-channels' : '/app/class';
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
    // The whole channel is a fixed-viewport-height flex column on every
    // tab: the title + tab strip stay pinned, and only each tab's own
    // content scrolls (the chat manages its own scroll internally; every
    // other tab gets the overflow-y-auto wrapper below). The page itself
    // never scrolls here — overscroll-contain on the inner scrollers keeps
    // a scroll that hits the top/bottom of the content from chaining out
    // to the document.
    //
    // The mobile height is derived from the real chrome around this
    // container rather than one magic constant, because that chrome varies
    // per device: env(safe-area-inset-top) (0 on most Androids, ~59px on
    // notched iPhones) + the layout's 20px top padding + the 48px bottom
    // tab bar + the bar's max(0.25rem, env(safe-area-inset-bottom)) safe-
    // area padding. A fixed offset tuned for one phone leaves a dead band
    // above the tab bar on every other one. The negative bottom margin
    // swallows the layout's scroll-clearance bottom padding (Layout.jsx's
    // inline paddingBottom), which this page doesn't need since it manages
    // its own height — without it the page scrolls by that padding's worth
    // even though the content already fits.
    <div className="flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_68px_-_max(0.25rem,env(safe-area-inset-bottom)))] flex-col mb-[calc(0px_-_max(4.5rem,3.75rem_+_env(safe-area-inset-bottom)))] md:h-[calc(100dvh-120px)] md:-mb-[60px]">
      <div className="flex-shrink-0">
        <PageHeader
          title={cohort.name}
          subtitle={subtitle}
          back={showBack}
          onBack={() => navigate(backTo)}
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-3">
          {activeTab === 'assignments' && <ClassAssignmentsTab cohortId={cohort.id} />}
          {activeTab === 'exams' && <ClassExamsTab cohortId={cohort.id} />}
          {activeTab === 'timetable' && <ClassTimetableTab cohortId={cohort.id} cohortTimeBlock={cohort.time_block} />}
          {activeTab === 'attendance' && <ClassAttendanceTab cohortId={cohort.id} />}
          {activeTab === 'members' && <ClassMembersTab cohortId={cohort.id} cohort={cohort} />}
          {activeTab === 'documents' && <ClassDocumentsTab cohortId={cohort.id} />}
        </div>
      )}
    </div>
  );
}

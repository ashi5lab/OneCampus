import { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { useAuth } from '../../../contexts/AuthContext';
import { InsightsOverviewTab } from './InsightsOverviewTab';
import { InsightsAttendanceTab } from './InsightsAttendanceTab';
import { InsightsAcademicsTab } from './InsightsAcademicsTab';
import { InsightsDisciplineTab } from './InsightsDisciplineTab';
import { InsightsLibraryTab } from './InsightsLibraryTab';
import { InsightsCommunityTab } from './InsightsCommunityTab';
import { PILLAR } from '../lib/insightsTheme';

// Own route (/app/reports/more) — the report "center" of the app: every
// module gets a real, filterable, exportable section here (not just a
// summary tile), organized into color-coded pillar tabs so it stays
// navigable instead of one endless scroll. Each tab embeds the module's
// actual detail table (discipline log, visitor log, PTM slots, library
// catalog, per-learner scores, ...) with its own search/filter/date-range
// controls, rather than only linking out to it.
export function InsightsPage() {
  const { can } = useAuth();
  const [tab, setTab] = useState('overview');

  const hasCommunityAccess = can('visitors.view') || can('notices.view') || can('ptm.view') || can('staff_attendance.view');

  const TABS = [
    { id: 'overview', label: 'Overview', Component: InsightsOverviewTab },
    { id: 'attendance', label: 'Attendance', color: PILLAR.attendance, Component: InsightsAttendanceTab },
    { id: 'academics', label: 'Academics & Exams', color: PILLAR.academics, Component: InsightsAcademicsTab },
    can('discipline.view') && { id: 'discipline', label: 'Discipline', Component: InsightsDisciplineTab },
    { id: 'library', label: 'Library & Certificates', color: PILLAR.library, Component: InsightsLibraryTab },
    hasCommunityAccess && { id: 'community', label: 'Community', color: PILLAR.community, Component: InsightsCommunityTab }
  ].filter(Boolean);

  const ActiveTab = TABS.find((t) => t.id === tab)?.Component || InsightsOverviewTab;

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Insights"
        subtitle="Every module's data, in one filterable, exportable report center"
        tabs={
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  tab === t.id ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
                }`}
              >
                {t.color && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: tab === t.id ? '#fff' : t.color }} />}
                {t.label}
              </button>
            ))}
          </div>
        }
      />
      <ActiveTab />
    </div>
  );
}

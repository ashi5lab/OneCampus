import { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { TodayTab } from './TodayTab';
import { DateRangeTab } from './DateRangeTab';
import { AcademicsTab } from './AcademicsTab';
import { AttendanceTrendsTab } from './AttendanceTrendsTab';

// "More" tab contents (the old tabs)
import { OverviewTab } from './OverviewTab';
import { AnalyticsTab } from './AnalyticsTab';
import { LibraryTab } from './LibraryTab';
import { CertificatesTab } from './CertificatesTab';

function MoreTab() {
  const [subTab, setSubTab] = useState('overview');
  
  const SUB_TABS = [
    { id: 'overview', label: 'General Overview', Component: OverviewTab },
    { id: 'analytics', label: 'Advanced Analytics', Component: AnalyticsTab },
    { id: 'library', label: 'Library', Component: LibraryTab },
    { id: 'certificates', label: 'Certificates', Component: CertificatesTab }
  ];
  
  const ActiveSubTab = SUB_TABS.find(t => t.id === subTab)?.Component || OverviewTab;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${
              subTab === t.id ? 'bg-ink-900 text-white' : 'bg-surface text-ink-700 hover:bg-surface-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <ActiveSubTab />
    </div>
  );
}

const TABS = [
  { value: 'today', label: 'Today', Component: TodayTab },
  { value: 'date-range', label: 'Date Range', Component: DateRangeTab },
  { value: 'academics', label: 'Academics', Component: AcademicsTab },
  { value: 'attendance', label: 'Attendance', Component: AttendanceTrendsTab },
  { value: 'more', label: 'More', Component: MoreTab }
];

export function ReportsPage() {
  const [tab, setTab] = useState('today');
  const ActiveTab = TABS.find((t) => t.value === tab)?.Component || TodayTab;

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Reports"
        tabs={
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  tab === t.value ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
                }`}
              >
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

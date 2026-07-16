import { useState } from 'react';
import { OverviewTab } from './OverviewTab';
import { AnalyticsTab } from './AnalyticsTab';
import { AttendanceTab } from './AttendanceTab';
import { AcademicPerformanceTab } from './AcademicPerformanceTab';
import { AssignmentsTab } from './AssignmentsTab';
import { OnlineExamsTab } from './OnlineExamsTab';
import { LibraryTab } from './LibraryTab';
import { CertificatesTab } from './CertificatesTab';

const TABS = [
  { value: 'overview', label: 'Overview', Component: OverviewTab },
  { value: 'analytics', label: 'Analytics', Component: AnalyticsTab },
  { value: 'attendance', label: 'Attendance', Component: AttendanceTab },
  { value: 'academic', label: 'Academic Performance', Component: AcademicPerformanceTab },
  { value: 'assignments', label: 'Assignments', Component: AssignmentsTab },
  { value: 'online-exams', label: 'Online Exams', Component: OnlineExamsTab },
  { value: 'library', label: 'Library', Component: LibraryTab },
  { value: 'certificates', label: 'Certificates', Component: CertificatesTab }
];

export function ReportsPage() {
  const [tab, setTab] = useState('overview');
  const ActiveTab = TABS.find((t) => t.value === tab)?.Component || OverviewTab;

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Reports</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Reports</h1>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
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

      <ActiveTab />
    </div>
  );
}

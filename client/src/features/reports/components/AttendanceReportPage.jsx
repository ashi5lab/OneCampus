import { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
import { ClassWiseAttendanceTab } from './ClassWiseAttendanceTab';
import { StudentWiseAttendanceTab } from './StudentWiseAttendanceTab';
import { AttendanceDateRangeTab } from './AttendanceDateRangeTab';

// Own route (/app/reports/attendance) instead of a nested ReportsPage tab.
// Previously all three sub-tabs (Class Wise / Student Wise / Date Range)
// rendered the exact same component regardless of which was selected —
// the `tab` state was set but never read. Each now has real, distinct
// content (see ClassWiseAttendanceTab / StudentWiseAttendanceTab /
// AttendanceDateRangeTab).
const TABS = [
  { id: 'class-wise', label: 'Class Wise', Component: ClassWiseAttendanceTab },
  { id: 'student-wise', label: 'Student Wise', Component: StudentWiseAttendanceTab },
  { id: 'date-range', label: 'Date Range', Component: AttendanceDateRangeTab }
];

export function AttendanceReportPage() {
  const [tab, setTab] = useState('class-wise');
  const ActiveTab = TABS.find((t) => t.id === tab)?.Component || ClassWiseAttendanceTab;

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Attendance"
        tabs={
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                  tab === t.id ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
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

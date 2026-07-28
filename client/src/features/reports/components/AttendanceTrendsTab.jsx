import { useState } from 'react';
import { AttendanceTab } from './AttendanceTab';

const TABS = [
  { id: 'class-wise', label: 'Class Wise' },
  { id: 'student-wise', label: 'Student Wise' },
  { id: 'date-range', label: 'Date Range' }
];

export function AttendanceTrendsTab() {
  const [tab, setTab] = useState('class-wise');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${
              tab === t.id ? 'bg-ink-900 text-white' : 'bg-surface text-ink-700 hover:bg-surface-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {/* We reuse the existing AttendanceTab which already has class filters and date range filters */}
        <AttendanceTab />
      </div>
    </div>
  );
}

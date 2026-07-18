import { useState } from 'react';
import { UploadPanel } from './UploadPanel';
import { JobsTable } from './JobsTable';

const TABS = [
  { value: 'learner', label: 'Students', fileLabel: 'students' },
  { value: 'instructor', label: 'Teachers', fileLabel: 'teachers' },
  { value: 'staff', label: 'Staff', fileLabel: 'staff' }
];

export function BulkUploadPage() {
  const [tab, setTab] = useState('learner');
  const activeTab = TABS.find((t) => t.value === tab);

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Management / Bulk Upload</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Bulk Upload</h1>
      </div>

      <div className="mb-5 flex gap-2">
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

      <UploadPanel entityType={activeTab.value} label={activeTab.label} fileLabel={activeTab.fileLabel} />
      <JobsTable entityType={activeTab.value} />
    </div>
  );
}

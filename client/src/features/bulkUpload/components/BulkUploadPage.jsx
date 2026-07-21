import { useState } from 'react';
import { PageHeader } from '../../../components/PageHeader';
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
      <PageHeader
        eyebrow="Management / Bulk Upload"
        title="Bulk Upload"
        tabs={
          <div className="flex gap-2">
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

      <UploadPanel entityType={activeTab.value} label={activeTab.label} fileLabel={activeTab.fileLabel} />
      <JobsTable entityType={activeTab.value} />
    </div>
  );
}

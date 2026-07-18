import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useBulkUploadJobs } from '../hooks/useBulkUpload';
import { JobErrorsModal } from './JobErrorsModal';

const STATUS_META = {
  processing: { variant: 'pending', label: 'Processing…' },
  completed: { variant: 'active', label: 'Completed' },
  completed_with_errors: { variant: 'pending', label: 'Completed with errors' },
  failed: { variant: 'inactive', label: 'Failed' }
};

export function JobsTable({ entityType }) {
  const { data: jobs, isLoading, error } = useBulkUploadJobs(entityType);
  const [viewingJobId, setViewingJobId] = useState(null);

  const columns = [
    { key: 'original_filename', header: 'File', render: (job) => job.original_filename || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (job) => {
        const meta = STATUS_META[job.status] || STATUS_META.processing;
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      }
    },
    {
      key: 'progress',
      header: 'Rows',
      render: (job) =>
        job.status === 'processing'
          ? `${job.success_count + job.failure_count} / ${job.total_rows} processed`
          : `${job.success_count} of ${job.total_rows} succeeded`
    },
    {
      key: 'failed',
      header: 'Failed',
      render: (job) =>
        job.failure_count > 0 ? (
          <button
            type="button"
            onClick={() => setViewingJobId(job.id)}
            className="font-semibold text-danger hover:opacity-80"
          >
            {job.failure_count} — view
          </button>
        ) : (
          <span className="text-ink-500">0</span>
        )
    },
    { key: 'created_by_username', header: 'Uploaded by', render: (job) => job.created_by_username || '—' },
    { key: 'created_at', header: 'Started', render: (job) => new Date(job.created_at).toLocaleString() }
  ];

  return (
    <div className="overflow-hidden rounded border border-border bg-surface">
      <div className="border-b border-surface-muted px-5 py-3 text-sm font-bold text-ink-900">Upload history</div>
      {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
      {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
      {jobs && (
        <DataTable columns={columns} rows={jobs} rowKey={(job) => job.id} emptyMessage="No uploads yet." />
      )}

      {viewingJobId && <JobErrorsModal jobId={viewingJobId} onClose={() => setViewingJobId(null)} />}
    </div>
  );
}

import { DataTable } from '../../../components/DataTable';
import { bulkUploadApi } from '../services/bulkUploadApi';
import { useBulkUploadJob } from '../hooks/useBulkUpload';

const columns = [
  { key: 'row', header: 'Row', render: (e) => e.row },
  { key: 'identifier', header: 'Name', render: (e) => e.data?.['First Name *'] ? `${e.data['First Name *']} ${e.data['Last Name *'] || ''}`.trim() : '—' },
  { key: 'error', header: 'Error', render: (e) => <span className="text-danger">{e.error}</span> }
];

export function JobErrorsModal({ jobId, onClose }) {
  const { data: job, isLoading } = useBulkUploadJob(jobId);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <div className="my-auto w-full max-w-[720px] rounded border border-border bg-surface p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-base font-bold text-ink-900">Failed rows</div>
            {job && (
              <div className="mt-1 text-[12.5px] text-ink-500">
                {job.original_filename} — {job.failure_count} of {job.total_rows} row{job.total_rows === 1 ? '' : 's'} failed
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-ink-700"
          >
            Close
          </button>
        </div>

        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}

        {job && (
          <>
            <div className="mb-4 max-h-[50vh] overflow-y-auto rounded border border-border">
              <DataTable columns={columns} rows={job.errors || []} rowKey={(e) => e.row} emptyMessage="No failed rows." pageSize={25} />
            </div>
            {job.errors?.length > 0 && (
              <button
                type="button"
                onClick={() => bulkUploadApi.downloadFailures(job.id)}
                className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink"
              >
                Download failed rows as Excel
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

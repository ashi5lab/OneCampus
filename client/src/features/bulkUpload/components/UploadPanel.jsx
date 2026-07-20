import { useRef, useState } from 'react';
import { bulkUploadApi } from '../services/bulkUploadApi';
import { useUploadBulkFile } from '../hooks/useBulkUpload';

const ACCEPT = '.xlsx,.xls,.csv';

// Upload is fire-and-forget on purpose: the POST only waits for the file to
// be read and validated (fast), not for every row to actually be inserted
// (that continues in the background — see server/lib/bulkUploadProcessor.js).
// This panel's job is just "hand off the file and say so" — the actual
// progress lives in JobsTable below it, which starts polling the moment a
// new job shows up.
export function UploadPanel({ entityType, label, fileLabel }) {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const uploadFile = useUploadBulkFile();

  async function handleDownloadTemplate(format) {
    setTemplateDownloading(true);
    try {
      await bulkUploadApi.downloadTemplate(entityType, format, fileLabel);
    } finally {
      setTemplateDownloading(false);
    }
  }

  function handleUpload() {
    if (!selectedFile) return;
    uploadFile.mutate(
      { entityType, file: selectedFile },
      {
        onSuccess: () => {
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    );
  }

  return (
    <div className="mb-6 rounded border border-border bg-surface p-5">
      <div className="mb-1 text-sm font-bold text-ink-900">Bulk upload {label}</div>
      <div className="mb-4 text-[12.5px] text-ink-500">
        Download the template, fill it in, and upload it below. Excel (.xlsx) and CSV are both accepted. A username
        and password are generated automatically for everyone — download them from the "Logins" column below once
        processing finishes.
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={templateDownloading}
          onClick={() => handleDownloadTemplate('xlsx')}
          className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-60"
        >
          Download Excel template
        </button>
        <button
          type="button"
          disabled={templateDownloading}
          onClick={() => handleDownloadTemplate('csv')}
          className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-60"
        >
          Download CSV template
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          className="text-[12.5px] text-ink-700 file:mr-3 file:rounded file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink-700 hover:file:bg-surface-muted"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || uploadFile.isPending}
          className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
        >
          {uploadFile.isPending ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {uploadFile.isSuccess && (
        <div className="mt-3 text-[12.5px] font-semibold text-success">
          File received — processing {uploadFile.data.total_rows} row{uploadFile.data.total_rows === 1 ? '' : 's'} in the background. Track progress below.
        </div>
      )}
      {uploadFile.isError && (
        <div className="mt-3 text-[12.5px] font-semibold text-danger">{uploadFile.error.message}</div>
      )}
    </div>
  );
}

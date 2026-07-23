import { useRef, useState } from 'react';
import { Upload, Download, Trash2, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { useClassDocuments, useUploadClassDocument, useDeleteClassDocument } from '../hooks/useClassChannel';

const FILE_ICON = { image: '🖼️', pdf: '📄', doc: '📝', xls: '📈', ppt: '📊', zip: '📦', file: '📎' };

function formatSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function uploaderName(doc) {
  const full = [doc.uploader_first_name, doc.uploader_last_name].filter(Boolean).join(' ');
  return full || doc.uploader_username || 'Unknown';
}

export function ClassDocumentsTab({ cohortId }) {
  const { user } = useAuth();
  const canManage = ['instructor', 'staff', 'admin'].includes(user?.role);

  const { data: documents, isLoading, error } = useClassDocuments(cohortId);
  const uploadDoc = useUploadClassDocument(cohortId);
  const deleteDoc = useDeleteClassDocument(cohortId);

  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-picked after an error
    if (file) uploadDoc.mutate(file);
  }

  const docs = documents || [];

  return (
    <div className="min-h-full bg-surface p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink-900">Documents</h2>
          <p className="mt-1 text-sm text-ink-500">Course materials and resources shared by instructors</p>
        </div>
        {canManage && (
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDoc.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink transition hover:bg-accent-dark disabled:opacity-60"
            >
              {uploadDoc.isPending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : <Upload className="h-4 w-4" strokeWidth={2} />}
              {uploadDoc.isPending ? 'Uploading…' : 'Upload Document'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,text/plain"
            />
            {uploadDoc.isError && (
              <span className="text-[11px] font-semibold text-danger">{uploadDoc.error?.message || 'Upload failed'}</span>
            )}
          </div>
        )}
      </div>

      {isLoading && <div className="rounded-lg border border-border bg-surface-muted p-8 text-center text-sm text-ink-500">Loading documents…</div>}

      {error && (
        <div className="rounded-lg border border-danger bg-danger-light p-4 text-sm font-semibold text-danger">{error.message}</div>
      )}

      {!isLoading && !error && docs.length === 0 && (
        <div className="rounded-lg border border-border bg-surface-muted p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-ink-300" strokeWidth={1.5} />
          <div className="mt-2 text-sm font-semibold text-ink-900">No documents yet</div>
          <div className="mt-1 text-xs text-ink-500">
            {canManage ? 'Upload course materials for your class using the button above.' : 'Documents shared by instructors will appear here'}
          </div>
        </div>
      )}

      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 sm:p-4 transition-colors hover:bg-surface-secondary"
            >
              <button
                type="button"
                onClick={() => setPreview({ url: doc.url, name: doc.name, size: doc.size_bytes, type: doc.file_type })}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                title="Preview"
              >
                <span className="flex-shrink-0 text-2xl">{FILE_ICON[doc.file_type] || FILE_ICON.file}</span>
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink-900">{doc.name}</span>
                  <span className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-ink-500">
                    {doc.size_bytes != null && <span>{formatSize(doc.size_bytes)}</span>}
                    <span className="hidden sm:inline">•</span>
                    <span>By {uploaderName(doc)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </span>
                </span>
              </button>

              <div className="flex flex-shrink-0 items-center gap-1.5">
                <a
                  href={doc.url}
                  download={doc.name}
                  target="_blank"
                  rel="noreferrer"
                  title="Download"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-accent transition hover:bg-accent-light"
                >
                  <Download className="h-4 w-4" strokeWidth={2} />
                </a>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete "${doc.name}"?`)) deleteDoc.mutate(doc.id);
                    }}
                    disabled={deleteDoc.isPending}
                    title="Delete"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-500 transition hover:border-danger hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && <AttachmentPreviewModal attachment={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

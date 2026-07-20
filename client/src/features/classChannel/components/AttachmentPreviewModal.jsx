// Office docs (doc/xls/ppt) have no native browser renderer, so they're
// rendered through Google's public viewer embed — the same "paste a public
// URL, get an inline preview" trick most apps without a document-conversion
// pipeline use. It only works because Cloudinary attachment URLs are public
// (see uploadAttachmentIfPresent in the classChannel controller) and it
// requires reaching a third-party service, so it's the one attachment kind
// that can't be previewed fully offline.
const OFFICE_TYPES = ['doc', 'xls', 'ppt'];

function previewKind(type) {
  if (type === 'image') return 'image';
  if (type === 'pdf') return 'pdf';
  if (OFFICE_TYPES.includes(type)) return 'office';
  return 'none';
}

export function AttachmentPreviewModal({ attachment, onClose }) {
  const { url, name, size, type } = attachment;
  const kind = previewKind(type);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-2xl border border-border bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-muted px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-ink-900">{name}</div>
            <div className="text-[10.5px] text-ink-500">{Math.round(size / 1024)} KB</div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <a
              href={url}
              download={name}
              target="_blank"
              rel="noreferrer"
              title="Download"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </a>
            <button onClick={onClose} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink-700">
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-surface-muted/40 p-3">
          {kind === 'image' && <img src={url} alt={name} className="mx-auto max-h-[75vh] w-auto max-w-full rounded-lg object-contain" />}
          {kind === 'pdf' && <iframe src={url} title={name} className="h-[75vh] w-full rounded-lg border border-border bg-white" />}
          {kind === 'office' && (
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`}
              title={name}
              className="h-[75vh] w-full rounded-lg border border-border bg-white"
            />
          )}
          {kind === 'none' && (
            <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-center">
              <span className="text-[12px] font-semibold text-ink-700">No in-app preview for this file type.</span>
              <span className="text-[11px] text-ink-500">Use the download button above to save it.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

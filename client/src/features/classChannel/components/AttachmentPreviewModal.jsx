import { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { pdfjs } from '../../../lib/pdfSetup';

// Attachments live in Cloudflare R2 as public URLs (see uploadBuffer in
// server/lib/storage.js). Images and PDFs render fully in-app — images via
// a plain <img>, PDFs via react-pdf (pdf.js) with the worker bundled
// locally, so neither needs a third-party viewer. Office docs (doc/xls/ppt)
// have no in-browser renderer, so they fall back to an "Open File" link.
const OFFICE_TYPES = ['doc', 'xls', 'ppt'];

function previewKind(type) {
  if (type === 'image') return 'image';
  if (type === 'pdf') return 'pdf';
  if (OFFICE_TYPES.includes(type)) return 'office';
  return 'none';
}

// Inline PDF viewer. Pages are laid out top-to-bottom and sized to the
// container width so they stay readable on a phone. If pdf.js can't load the
// file (e.g. the storage host doesn't send CORS headers), we surface the
// same "Open File" fallback used for office docs rather than a broken frame.
function PdfViewer({ url, onFail }) {
  const containerRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="mx-auto w-full max-w-[680px]">
      <Document
        file={url}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        onLoadError={onFail}
        onSourceError={onFail}
        loading={<div className="py-10 text-center text-[12px] text-ink-500">Loading PDF…</div>}
        error={<div className="py-10 text-center text-[12px] text-ink-500">Couldn't load this PDF.</div>}
      >
        {Array.from({ length: numPages }, (_, i) => (
          <div key={i} className="mb-3 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
            <Page pageNumber={i + 1} width={width ? Math.min(width, 680) : undefined} renderTextLayer renderAnnotationLayer />
          </div>
        ))}
      </Document>
    </div>
  );
}

function OpenFileFallback({ url }) {
  return (
    <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
      <span className="text-[13px] font-semibold text-ink-700">Preview not available inline</span>
      <span className="max-w-xs text-[11.5px] text-ink-500">
        To view this file, open it in your device's default application.
      </span>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 rounded bg-accent px-4 py-2 text-[12px] font-bold text-accent-ink hover:bg-accent-dark"
      >
        Open File
      </a>
    </div>
  );
}

export function AttachmentPreviewModal({ attachment, onClose }) {
  const { url, name, size, type } = attachment;
  const kind = previewKind(type);
  // Flips to true if react-pdf fails to render — then we show Open File.
  const [pdfFailed, setPdfFailed] = useState(false);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink-900/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-[720px] flex-col overflow-hidden rounded-t-2xl border border-border bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-muted px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-[13px] font-bold text-ink-900">{name}</div>
            {size != null && <div className="text-[10.5px] text-ink-500">{Math.round(size / 1024)} KB</div>}
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
          {kind === 'pdf' && !pdfFailed && <PdfViewer url={url} onFail={() => setPdfFailed(true)} />}
          {kind === 'pdf' && pdfFailed && <OpenFileFallback url={url} />}
          {kind === 'office' && <OpenFileFallback url={url} />}
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

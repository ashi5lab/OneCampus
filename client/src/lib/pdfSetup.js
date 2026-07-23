import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Bundle the pdf.js worker locally via Vite's `new URL(..., import.meta.url)`
// asset handling — no external CDN fetch at runtime, which keeps the PWA
// working offline and clear of any content-security constraints. Importing
// this module once (from AttachmentPreviewModal) is enough to configure the
// worker process-wide.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export { pdfjs };

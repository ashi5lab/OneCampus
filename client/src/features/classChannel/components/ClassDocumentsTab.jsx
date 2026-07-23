import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';

export function ClassDocumentsTab({ cohortId }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([
    {
      id: 1,
      name: 'Weekly Test Syllabus.pdf',
      type: 'PDF',
      size: '1.2 MB',
      uploadedBy: 'Sophia Brown',
      uploadedAt: '18 Jul 2026',
      uploadedById: 2,
    },
    {
      id: 2,
      name: 'Assignment Guidelines.docx',
      type: 'DOCX',
      size: '215 KB',
      uploadedBy: 'Sophia Brown',
      uploadedAt: '15 Jul 2026',
      uploadedById: 2,
    },
    {
      id: 3,
      name: 'Important Topics.pptx',
      type: 'PPTX',
      size: '3.4 MB',
      uploadedBy: 'Sophia Brown',
      uploadedAt: '10 Jul 2026',
      uploadedById: 2,
    },
  ]);

  const getFileIcon = (type) => {
    const icons = {
      PDF: '📄',
      DOCX: '📝',
      PPTX: '📊',
      XLS: '📈',
      ZIP: '📦',
      IMG: '🖼️',
    };
    return icons[type] || '📎';
  };

  return (
    <div className="bg-surface min-h-full p-4 sm:p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-ink-900">Documents</h2>
        <p className="mt-1 text-sm text-ink-500">Course materials and resources shared by instructors</p>
      </div>

      {documents.length === 0 ? (
        <div className="rounded border border-border bg-surface-muted p-8 text-center">
          <div className="text-5xl">📄</div>
          <div className="mt-2 text-sm font-semibold text-ink-900">No documents yet</div>
          <div className="mt-1 text-xs text-ink-500">Documents shared by instructors will appear here</div>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-4 rounded border border-border bg-surface p-4 hover:bg-surface-secondary transition-colors"
            >
              <div className="text-2xl flex-shrink-0">{getFileIcon(doc.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-ink-900 truncate">{doc.name}</div>
                <div className="mt-1 flex gap-4 text-xs text-ink-500">
                  <span>{doc.size}</span>
                  <span>•</span>
                  <span>Uploaded by {doc.uploadedBy}</span>
                  <span>•</span>
                  <span>{doc.uploadedAt}</span>
                </div>
              </div>
              <button
                className="flex-shrink-0 rounded border border-border bg-surface px-3 py-2 text-xs font-semibold text-accent hover:bg-accent-light transition-colors"
              >
                ↓ Download
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

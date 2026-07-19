import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { useLearners } from '../../learners/hooks/useLearners';
import { useCertificates, useIssueCertificate } from '../hooks/useCertificates';
import { certificatesApi } from '../services/certificatesApi';
import { CertificateFormModal } from './CertificateFormModal';

export function CertificatesPage() {
  const { t } = useConfig();
  const { can, user } = useAuth();
  const { data: certificates, isLoading, error } = useCertificates();
  // Skip this entirely for a role without learners.view — it would just
  // 403. A `learner` viewing this list is always looking at their own
  // (already row-scoped) certificates, so "You" is accurate; a `guardian`
  // is now also row-scoped (see lib/rowScope.js) but might be looking at
  // more than one linked child, so it falls back to the raw id rather
  // than guessing which child "You" would mean.
  const canSeeLearnerNames = can('learners.view');
  const { data: learners } = useLearners({ enabled: canSeeLearnerNames });
  const issueCertificate = useIssueCertificate();
  const [showForm, setShowForm] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  async function handleDownload(row) {
    setDownloadError(null);
    setDownloadingId(row.id);
    try {
      await certificatesApi.downloadPdf(row.id, row.certificate_no);
    } catch (err) {
      setDownloadError(err.message);
    } finally {
      setDownloadingId(null);
    }
  }

  const learnerName = (learnerId) => {
    if (!canSeeLearnerNames) return user?.role === 'learner' ? 'You' : `#${learnerId}`;
    const learner = (learners || []).find((l) => l.id === learnerId);
    return learner ? `${learner.first_name} ${learner.last_name}` : `#${learnerId}`;
  };

  const columns = [
    { key: 'certificate_no', header: 'Certificate No.', render: (row) => <span className="font-mono font-semibold">{row.certificate_no}</span> },
    { key: 'learner', header: t('learner'), render: (row) => learnerName(row.learner_id) },
    { key: 'type', header: 'Type', render: (row) => row.type },
    { key: 'issue_date', header: 'Issued', render: (row) => new Date(row.issue_date).toLocaleDateString() },
    {
      key: 'pdf',
      header: '',
      render: (row) => (
        <button
          onClick={() => handleDownload(row)}
          disabled={downloadingId === row.id}
          className="text-[11.5px] font-semibold text-accent disabled:opacity-60"
        >
          {downloadingId === row.id ? 'Downloading…' : 'Download PDF'}
        </button>
      )
    }
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            Management / Certificates
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Certificates</h1>
        </div>
        {can('certificates.issue') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Issue Certificate
          </button>
        )}
      </div>

      {downloadError && (
        <div className="mb-3 rounded border border-danger/30 bg-danger/10 px-4 py-2.5 text-[12.5px] font-semibold text-danger">
          Couldn't download PDF: {downloadError}
        </div>
      )}

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {certificates && <DataTable columns={columns} rows={certificates} rowKey={(row) => row.id} />}
      </div>

      {showForm && (
        <CertificateFormModal
          onClose={() => setShowForm(false)}
          submitting={issueCertificate.isPending}
          submitError={issueCertificate.error?.message}
          onSubmit={(values) =>
            issueCertificate.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}
    </div>
  );
}

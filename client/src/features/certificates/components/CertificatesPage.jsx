import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { useLearners } from '../../learners/hooks/useLearners';
import { useCertificates, useIssueCertificate } from '../hooks/useCertificates';
import { CertificateFormModal } from './CertificateFormModal';

export function CertificatesPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: certificates, isLoading, error } = useCertificates();
  const { data: learners } = useLearners();
  const issueCertificate = useIssueCertificate();
  const [showForm, setShowForm] = useState(false);

  const learnerName = (learnerId) => {
    const learner = (learners || []).find((l) => l.id === learnerId);
    return learner ? `${learner.first_name} ${learner.last_name}` : `#${learnerId}`;
  };

  const columns = [
    { key: 'certificate_no', header: 'Certificate No.', render: (row) => <span className="font-mono font-semibold">{row.certificate_no}</span> },
    { key: 'learner', header: t('learner'), render: (row) => learnerName(row.learner_id) },
    { key: 'type', header: 'Type', render: (row) => row.type },
    { key: 'issue_date', header: 'Issued', render: (row) => new Date(row.issue_date).toLocaleDateString() }
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
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Issue Certificate
          </button>
        )}
      </div>

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

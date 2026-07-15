import { DataTable } from '../../../components/DataTable';
import { StatCard } from '../../../components/StatCard';
import { useCertificatesReport } from '../hooks/useReports';

export function CertificatesTab() {
  const { data, isLoading, error } = useCertificatesReport();

  const columns = [
    { key: 'learner', header: 'Learner', render: (row) => `${row.first_name} ${row.last_name}` },
    { key: 'registry', header: 'Registry No', render: (row) => row.registry_no },
    { key: 'type', header: 'Type', render: (row) => row.type },
    { key: 'no', header: 'Certificate No', render: (row) => row.certificate_no },
    { key: 'issued', header: 'Issued', render: (row) => new Date(row.issue_date).toLocaleDateString() }
  ];

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {data.byType.map((row) => (
          <StatCard key={row.type} label={row.type} value={row.count} />
        ))}
      </div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-500">Recently Issued</div>
      <div className="overflow-hidden rounded border border-border bg-surface">
        <DataTable columns={columns} rows={data.recent} rowKey={(row) => row.id} emptyMessage="No certificates issued yet." />
      </div>
    </div>
  );
}

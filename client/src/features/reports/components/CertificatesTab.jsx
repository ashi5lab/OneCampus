import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { ExportCsvButton } from '../../../components/ExportCsvButton';
import { StatCard } from '../../../components/StatCard';
import { useCertificatesReport } from '../hooks/useReports';

export function CertificatesTab() {
  const { data, isLoading, error } = useCertificatesReport();
  const [search, setSearch] = useState('');

  const columns = [
    { key: 'learner', header: 'Learner', sortable: true, sortValue: (row) => `${row.first_name} ${row.last_name}`, render: (row) => `${row.first_name} ${row.last_name}` },
    { key: 'registry', header: 'Registry No', sortable: true, render: (row) => row.registry_no },
    { key: 'type', header: 'Type', sortable: true, render: (row) => row.type },
    { key: 'no', header: 'Certificate No', sortable: true, render: (row) => row.certificate_no },
    { key: 'issued', header: 'Issued', sortable: true, sortValue: (row) => row.issue_date, render: (row) => new Date(row.issue_date).toLocaleDateString() }
  ];

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;

  const recent = search
    ? data.recent.filter((r) => `${r.first_name} ${r.last_name} ${r.registry_no}`.toLowerCase().includes(search.toLowerCase()))
    : data.recent;

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {data.byType.map((row) => (
          <StatCard key={row.type} label={row.type} value={row.count} />
        ))}
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-wide text-ink-500">Recently Issued</div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search learner or registry no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-56"
          />
          <ExportCsvButton
            filename="certificates-issued"
            columns={[
              { header: 'Learner', value: (r) => `${r.first_name} ${r.last_name}` },
              { header: 'Registry No', value: (r) => r.registry_no },
              { header: 'Type', value: (r) => r.type },
              { header: 'Certificate No', value: (r) => r.certificate_no },
              { header: 'Issued', value: (r) => r.issue_date }
            ]}
            rows={recent}
          />
        </div>
      </div>
      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        <DataTable columns={columns} rows={recent} rowKey={(row) => row.id} emptyMessage="No certificates issued yet." />
      </div>
    </div>
  );
}

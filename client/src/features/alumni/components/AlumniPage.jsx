import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Avatar } from '../../../components/Avatar';
import { useLearners, useUpdateLearner } from '../../learners/hooks/useLearners';

// The alumni directory is just the learners list filtered to status=alumni —
// there's no dedicated alumni table (see MarkAlumniModal for the reasoning).
export function AlumniPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const canManage = can('learners.manage');
  const updateLearner = useUpdateLearner();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters = { status: 'alumni', search: search || undefined };
  const { data: alumni, isLoading, error } = useLearners({ filters });

  function restoreToActive(row) {
    if (!window.confirm(`Restore ${row.first_name} ${row.last_name} to active status?`)) return;
    updateLearner.mutate({
      id: row.id,
      payload: {
        registry_no: row.registry_no,
        first_name: row.first_name,
        last_name: row.last_name,
        cohort_id: row.cohort_id,
        status: 'active',
        meta: row.meta
      }
    });
  }

  const columns = [
    {
      key: 'name',
      header: t('learner'),
      render: (row) => (
        <Link to={`/app/learners/${row.id}`} className="flex items-center gap-2.5 hover:underline">
          <Avatar name={`${row.first_name} ${row.last_name}`} src={row.profile_picture_url} size={32} />
          <div>
            <div className="font-semibold">{row.first_name} {row.last_name}</div>
            <div className="font-mono text-[11.5px] text-ink-500">{row.registry_no}</div>
          </div>
        </Link>
      )
    },
    { key: 'cohort', header: `Last ${t('cohort')}`, render: (row) => row.cohort_name || '—' },
    { key: 'graduation_year', header: 'Graduation Year', render: (row) => row.meta?.graduation_year || '—' }
  ];

  if (canManage) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end">
          <button onClick={() => restoreToActive(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
            Restore to Active
          </button>
        </div>
      )
    });
  }

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">Management / Alumni</div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Alumni Directory</h1>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Total Alumni" value={isLoading ? '—' : alumni.length} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1">
          <div className="mb-1 text-xs font-semibold text-ink-700">Search</div>
          <input
            className="input"
            placeholder="Search by name or registry no…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">
            {error.message}
          </div>
        )}
        {alumni && (
          <DataTable columns={columns} rows={alumni} rowKey={(row) => row.id} emptyMessage="No alumni yet." mobileCompact />
        )}
      </div>
    </div>
  );
}

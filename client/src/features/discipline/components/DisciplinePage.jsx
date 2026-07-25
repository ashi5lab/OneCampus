import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { PageHeader } from '../../../components/PageHeader';
import { useDisciplineRecordsPage, useDeleteDisciplineRecord } from '../hooks/useDiscipline';
import { useCohorts } from '../../cohorts/hooks/useCohorts';

const SEVERITY_META = {
  positive: { variant: 'active', label: 'Positive' },
  minor: { variant: 'pending', label: 'Minor' },
  major: { variant: 'inactive', label: 'Major' }
};

export function DisciplinePage() {
  const { can, user } = useAuth();
  const navigate = useNavigate();
  const canLog = can('discipline.log');
  
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [severity, setSeverity] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  const [filters, setFilters] = useState({});

  const { data: cohorts } = useCohorts({ enabled: canLog || can('cohorts.view') });
  
  const { data: recordsData, isLoading, error } = useDisciplineRecordsPage({
    page,
    pageSize: 10,
    filters
  });
  
  const deleteRecord = useDeleteDisciplineRecord();

  function applyFilters() {
    setPage(1);
    setFilters({
      search: searchQuery,
      cohort_id: cohortId,
      severity,
      from_date: fromDate,
      to_date: toDate
    });
  }

  function resetFilters() {
    setSearchQuery('');
    setCohortId('');
    setSeverity('');
    setFromDate('');
    setToDate('');
    setPage(1);
    setFilters({});
  }

  const columns = [
    { key: 'incident_date', header: 'Date', render: (row) => new Date(row.incident_date).toLocaleDateString() },
    {
      key: 'learner',
      header: 'Student',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.learner_first_name} {row.learner_last_name}</div>
          <div className="font-mono text-[11px] text-ink-500">{row.learner_registry_no}</div>
        </div>
      )
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (row) => <Badge variant={SEVERITY_META[row.severity]?.variant || 'pending'}>{SEVERITY_META[row.severity]?.label || row.severity}</Badge>
    },
    { key: 'description', header: 'Description', render: (row) => row.description },
    { key: 'action_taken', header: 'Action Taken', render: (row) => row.action_taken || '—' },
    { key: 'reported_by', header: 'Reported by', render: (row) => row.reported_by_username || '—' }
  ];
  
  if (canLog) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => {
        const canManage = user.role === 'admin' || row.reported_by === user.id;
        if (!canManage) return null;
        return (
          <div className="flex justify-end gap-3">
            <button onClick={() => navigate(`/app/discipline/${row.id}/edit`)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
              Edit
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete this record?')) deleteRecord.mutate(row.id);
              }}
              className="text-xs font-semibold text-danger hover:opacity-80"
            >
              Delete
            </button>
          </div>
        );
      }
    });
  }

  return (
    <div>
      <PageHeader
        eyebrow={canLog ? 'Management / Discipline' : 'Discipline'}
        title={canLog ? 'Discipline' : 'My Behavior Record'}
        actions={
          canLog && (
            <button
              onClick={() => navigate('/app/discipline/new')}
              className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
            >
              + Log New Record
            </button>
          )
        }
      />

      <div className="bg-surface rounded-2xl shadow-sm border border-border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input type="text" className="input text-sm w-full" placeholder="Search student name or roll..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e?.key === 'Enter' && applyFilters()} />
          <select className="input text-sm w-full" value={cohortId} onChange={(e) => setCohortId(e.target.value)}>
            <option value="">All Classes</option>
            {cohorts?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input text-sm w-full" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="">All Severities</option>
            <option value="positive">Positive (+5 pts)</option>
            <option value="minor">Minor (-2 pts)</option>
            <option value="major">Major (-10 pts)</option>
          </select>
          <div className="flex items-center gap-2 lg:col-span-2 w-full">
            <input type="date" className="input text-sm w-full" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <span className="text-ink-500 text-sm font-medium">to</span>
            <input type="date" className="input text-sm w-full" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={resetFilters} className="px-4 py-2 text-sm font-bold text-ink-600 hover:bg-surface-muted rounded-full transition-colors border border-transparent hover:border-border">Clear search</button>
          <button onClick={applyFilters} className="px-4 py-2 text-sm font-bold bg-[#4b43c4] text-white rounded-full hover:bg-[#3a34a8] transition-colors shadow-sm">Search now</button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading records...</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {!isLoading && !error && (
          <DataTable
            columns={columns}
            rows={recordsData?.data || []}
            rowKey={(row) => row.id}
            emptyMessage="No discipline records found."
            serverPagination={{
              page,
              pageSize: 10,
              total: recordsData?.meta?.total || 0,
              onPageChange: setPage
            }}
            rowClassName={(row) => {
              if (row.severity === 'positive') return 'bg-emerald-50/50';
              if (row.severity === 'minor') return 'bg-orange-50/50';
              if (row.severity === 'major') return 'bg-red-50/50';
              return '';
            }}
          />
        )}
      </div>
    </div>
  );
}

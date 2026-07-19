import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { SearchSelect } from '../../../components/SearchSelect';
import { Avatar } from '../../../components/Avatar';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearners, useCreateLearner, useUpdateLearner, useDeleteLearner, useSetClassHead, useSetSchoolHead } from '../hooks/useLearners';
import { LearnerFormModal } from './LearnerFormModal';

const STATUS_VARIANT = { active: 'active', pending: 'pending', inactive: 'inactive', alumni: 'pending' };
const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' };

export function LearnersPage() {
  const { t } = useConfig();
  const { can, user, designation } = useAuth();
  const { data: cohorts } = useCohorts();
  const canManage = can('learners.manage');
  const canAssignSchoolHead = canManage && (user?.role === 'admin' || designation === 'principal');
  const setClassHead = useSetClassHead();
  const setSchoolHead = useSetSchoolHead();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');

  // Debounce the search box so every keystroke doesn't fire a request.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters = { search: search || undefined, cohort_id: cohortId || undefined, gender: gender || undefined, status: status || undefined };
  const { data: learners, isLoading, error } = useLearners({ filters });
  const createLearner = useCreateLearner();
  const updateLearner = useUpdateLearner();
  const deleteLearner = useDeleteLearner();

  const [showForm, setShowForm] = useState(false);
  const [editingLearner, setEditingLearner] = useState(null);

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
    { key: 'status', header: 'Status', render: (row) => (
      <Badge variant={STATUS_VARIANT[row.status] || 'active'}>{row.status}</Badge>
    ) },
    // Previously showed the raw cohort_id — getAll now joins onec_cohorts
    // and returns cohort_name for exactly this.
    { key: 'cohort', header: t('cohort'), render: (row) => row.cohort_name || '—' },
    { key: 'gender', header: 'Gender', render: (row) => GENDER_LABEL[row.meta?.gender] || '—' },
    {
      key: 'roles',
      header: 'Roles',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.meta?.is_school_head && (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10.5px] font-bold text-accent-dark">School Head</span>
          )}
          {row.meta?.is_class_head && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10.5px] font-bold text-ink-700">Class Head</span>
          )}
          {!row.meta?.is_school_head && !row.meta?.is_class_head && '—'}
        </div>
      )
    }
  ];

  if (canManage) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-3">
          <button
            onClick={() => setClassHead.mutate({ id: row.id, is_class_head: !row.meta?.is_class_head })}
            className="text-xs font-semibold text-ink-500 hover:text-ink-900"
          >
            {row.meta?.is_class_head ? 'Unset Class Head' : 'Make Class Head'}
          </button>
          {canAssignSchoolHead && (
            <button
              onClick={() => setSchoolHead.mutate({ id: row.id, is_school_head: !row.meta?.is_school_head })}
              className="text-xs font-semibold text-ink-500 hover:text-ink-900"
            >
              {row.meta?.is_school_head ? 'Unset School Head' : 'Make School Head'}
            </button>
          )}
          <button onClick={() => setEditingLearner(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">Edit</button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete ${row.first_name} ${row.last_name}?`)) {
                deleteLearner.mutate(row.id);
              }
            }}
            className="text-xs font-semibold text-danger hover:opacity-80"
          >
            Delete
          </button>
        </div>
      )
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
            Management / {t('learners')}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {t('learners')}
          </h1>
        </div>
        {can('learners.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add {t('learner')}
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label={`Total ${t('learners')}`} value={isLoading ? '—' : learners.length} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1">
          <div className="mb-1 text-xs font-semibold text-ink-700">Search</div>
          <input
            className="input"
            placeholder={`Search by name or registry no…`}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </label>
        <label className="w-[200px]">
          <div className="mb-1 text-xs font-semibold text-ink-700">{t('cohort')}</div>
          <SearchSelect
            options={(cohorts || []).map((c) => ({ value: c.id, label: c.name }))}
            value={cohortId}
            onChange={setCohortId}
            placeholder="All"
          />
        </label>
        <label className="w-[140px]">
          <div className="mb-1 text-xs font-semibold text-ink-700">Gender</div>
          <select className="input" value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="w-[140px]">
          <div className="mb-1 text-xs font-semibold text-ink-700">Status</div>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
            <option value="alumni">Alumni</option>
          </select>
        </label>
        {(searchInput || cohortId || gender || status) && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setCohortId('');
              setGender('');
              setStatus('');
            }}
            className="rounded border border-border px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-surface-muted"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">
            {error.message}
          </div>
        )}
        {learners && (
          <DataTable columns={columns} rows={learners} rowKey={(row) => row.id} emptyMessage="No matching learners." mobileCompact />
        )}
      </div>

      {showForm && (
        <LearnerFormModal
          onClose={() => setShowForm(false)}
          submitting={createLearner.isPending}
          submitError={createLearner.error?.message}
          onSubmit={(values) =>
            createLearner.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}

      {editingLearner && (
        <LearnerFormModal
          initialData={editingLearner}
          onClose={() => setEditingLearner(null)}
          submitting={updateLearner.isPending}
          submitError={updateLearner.error?.message}
          onSubmit={(values) =>
            updateLearner.mutate({ id: editingLearner.id, payload: values }, { onSuccess: () => setEditingLearner(null) })
          }
        />
      )}
    </div>
  );
}

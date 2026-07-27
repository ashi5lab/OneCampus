import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2, Award, GraduationCap } from 'lucide-react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { Avatar } from '../../../components/Avatar';
import { GeneratedCredentialsModal } from '../../../components/GeneratedCredentialsModal';
import { PageHeader } from '../../../components/PageHeader';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearnersPage, useCreateLearner, useUpdateLearner, useDeleteLearner, useSetClassHead, useSetSchoolHead } from '../hooks/useLearners';
import { LearnerForm } from './LearnerForm';
import toast from 'react-hot-toast';

const STATUS_VARIANT = { active: 'active', pending: 'pending', inactive: 'inactive' };
const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' };

export function LearnersPage() {
  const { t } = useConfig();
  const { can, user, designation } = useAuth();
  const { data: cohorts } = useCohorts();
  const canManage = can('learners.manage');
  const canAssignSchoolHead = canManage && (user?.role === 'admin' || designation === 'principal');
  const setClassHead = useSetClassHead();
  const setSchoolHead = useSetSchoolHead();

  const [search, setSearch] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState(null); // { key, dir }

  const filters = {
    search: search || undefined,
    cohort_id: cohortId || undefined,
    gender: gender || undefined,
    status: status || undefined,
    sort: sort?.key,
    order: sort?.dir
  };
  const hasActiveFilters = Boolean(search || cohortId || gender || status);
  // Back to page 1 whenever a filter changes — otherwise a filtered-down
  // result set can leave the view stuck on a now out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [search, cohortId, gender, status]);

  // 'All' is soft-capped at 200 server-side (see server/lib/pagination.js) —
  // sent through as an actual pageSize rather than switching response shape.
  const { data: result, isLoading, error } = useLearnersPage({ page, pageSize: pageSize === 'all' ? 200 : pageSize, filters });
  const learners = result?.data;
  const meta = result?.meta;
  const createLearner = useCreateLearner();
  const updateLearner = useUpdateLearner();
  const deleteLearner = useDeleteLearner();

  const [showForm, setShowForm] = useState(false);
  const [editingLearner, setEditingLearner] = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);

  const columns = [
    {
      key: 'name',
      header: t('learner'),
      sortable: true,
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
    { key: 'status', header: 'Status', sortable: true, mobileCompact: true, render: (row) => (
      <Badge variant={STATUS_VARIANT[row.status] || 'active'}>{row.status}</Badge>
    ) },
    // Previously showed the raw cohort_id — getAll now joins onec_cohorts
    // and returns cohort_name for exactly this.
    { key: 'cohort', header: t('cohort'), sortable: true, mobileCompact: true, render: (row) => row.cohort_name || '—' },
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

  // First-class actions prop (see DataTable.jsx) — renders inline buttons
  // on desktop and a kebab menu on mobile, so these are never dropped on
  // small screens the way a manually-added "actions" column used to be.
  function learnerActions(row) {
    return [
      {
        key: 'class-head',
        label: row.meta?.is_class_head ? 'Unset Class Head' : 'Make Class Head',
        icon: GraduationCap,
        hidden: !canManage,
        onClick: () => setClassHead.mutate({ id: row.id, is_class_head: !row.meta?.is_class_head })
      },
      {
        key: 'school-head',
        label: row.meta?.is_school_head ? 'Unset School Head' : 'Make School Head',
        icon: Award,
        hidden: !canAssignSchoolHead,
        onClick: () => setSchoolHead.mutate({ id: row.id, is_school_head: !row.meta?.is_school_head })
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: Pencil,
        hidden: !canManage,
        onClick: () => setEditingLearner(row)
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
        hidden: !canManage,
        confirm: `Are you sure you want to delete ${row.first_name} ${row.last_name}?`,
        onClick: () => deleteLearner.mutate(row.id)
      }
    ];
  }

  if (showForm || editingLearner) {
    return (
      <div className="py-4">
        {showForm && (
          <LearnerForm
            onClose={() => setShowForm(false)}
            submitting={createLearner.isPending}
            submitError={createLearner.error?.message}
            onSubmit={(values) =>
              createLearner.mutate(values, {
                onSuccess: (created) => {
                  setShowForm(false);
                  setNewCredentials({ username: created.username, password: created.password });
                  toast.success(`${t('learner')} added successfully!`);
                }
              })
            }
          />
        )}
        {editingLearner && (
          <LearnerForm
            initialData={editingLearner}
            onClose={() => setEditingLearner(null)}
            submitting={updateLearner.isPending}
            submitError={updateLearner.error?.message}
            onSubmit={(values) =>
              updateLearner.mutate({ id: editingLearner.id, payload: values }, { 
                onSuccess: () => {
                  setEditingLearner(null);
                  toast.success(`${t('learner')} updated successfully!`);
                } 
              })
            }
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow={`Management / ${t('learners')}`}
        title={t('learners')}
        actions={
          can('learners.manage') && (
            <button
              onClick={() => setShowForm(true)}
              className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
            >
              + Add {t('learner')}
            </button>
          )
        }
      />

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label={`Total ${t('learners')}`} value={isLoading ? '—' : meta?.total ?? 0} />
      </div>

      <div className="overflow-hidden bg-surface md:rounded border-0 md:border border-border -mx-4 md:mx-0">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">
            {error.message}
          </div>
        )}
        {learners && (
          <DataTable
            columns={columns}
            rows={learners}
            rowKey={(row) => row.id}
            emptyMessage="No matching learners."
            mobileCompact
            actions={learnerActions}
            sort={sort}
            onSortChange={(key) => setSort((prev) => {
              if (!prev || prev.key !== key) return { key, dir: 'asc' };
              if (prev.dir === 'asc') return { key, dir: 'desc' };
              return null;
            })}
            filters={{
              search: { value: search, onChange: setSearch, placeholder: 'Search by name or registry no…' },
              fields: [
                {
                  key: 'cohort',
                  type: 'select',
                  label: t('cohort'),
                  value: cohortId,
                  onChange: setCohortId,
                  options: (cohorts || []).map((c) => ({ value: c.id, label: c.name }))
                },
                {
                  key: 'gender',
                  type: 'select',
                  label: 'Gender',
                  value: gender,
                  onChange: setGender,
                  options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]
                },
                {
                  key: 'status',
                  type: 'select',
                  label: 'Status',
                  value: status,
                  onChange: setStatus,
                  options: [
                    { value: 'active', label: 'Active' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'inactive', label: 'Inactive' }
                  ]
                }
              ],
              hasActiveFilters,
              onClear: () => { setSearch(''); setCohortId(''); setGender(''); setStatus(''); }
            }}
            serverPagination={{
              page,
              pageSize: pageSize === 'all' ? 200 : pageSize,
              total: meta?.total ?? 0,
              onPageChange: setPage,
              onPageSizeChange: (size) => { setPageSize(size); setPage(1); }
            }}
          />
        )}
      </div>

      {newCredentials && (
        <GeneratedCredentialsModal
          username={newCredentials.username}
          password={newCredentials.password}
          onClose={() => setNewCredentials(null)}
        />
      )}
    </div>
  );
}

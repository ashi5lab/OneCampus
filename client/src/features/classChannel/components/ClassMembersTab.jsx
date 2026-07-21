import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/DataTable';
import { useClassMembersPaginated, useRemoveClassTeacher, useAddClassTeacher } from '../hooks/useClassMembers';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

function AddTeacherModal({ cohortId, onClose }) {
  useBodyScrollLock();
  const { data: instructors, isLoading } = useInstructors();
  const [selectedId, setSelectedId] = useState('');
  const addTeacher = useAddClassTeacher(cohortId);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedId) return;
    await addTeacher.mutateAsync(Number(selectedId));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40">
      <form onSubmit={handleSubmit} className="w-[420px] rounded border-2 border-accent bg-surface p-6">
        <div className="mb-4 text-base font-bold text-ink-900">Add Teacher</div>
        <div className="mb-4">
          <label className="mb-1 block text-xs font-semibold text-ink-700">Select Teacher</label>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="w-full rounded border border-border bg-surface px-3 py-2 text-sm focus:border-accent focus:outline-none"
            disabled={isLoading || addTeacher.isPending}
            required
          >
            <option value="">-- Select Teacher --</option>
            {instructors?.data?.map((inst) => (
              <option key={inst.id} value={inst.id}>
                {inst.first_name} {inst.last_name} ({inst.registry_no || inst.email || 'Instructor'})
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700"
            disabled={addTeacher.isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
            disabled={!selectedId || addTeacher.isPending}
          >
            {addTeacher.isPending ? 'Adding...' : 'Add Teacher'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ClassMembersTab({ cohortId, cohort }) {
  const { can, user } = useAuth();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('students');
  const [search, setSearch] = useState('');
  const limit = 25;

  const { data, isLoading, error } = useClassMembersPaginated(cohortId, { page, limit, filter, search });
  const removeTeacher = useRemoveClassTeacher(cohortId);
  const [showAddTeacher, setShowAddTeacher] = useState(false);

  // Class tutor (advisor), staff or admin can add/remove teachers
  const isClassTutor = cohort.advisor_id === user.id;
  const canModerate = isClassTutor || can('cohorts.manage');

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => {
        const link = row.role === 'learner' ? `/app/learners/${row.role_id}` : `/app/instructors/${row.role_id}`;
        return (
          <Link to={link} className="font-semibold text-accent-dark hover:underline">
            {row.first_name} {row.last_name}
          </Link>
        );
      }
    },
    {
      key: 'role',
      header: 'Role',
      render: (row) => (
        <span className="capitalize">{row.role}</span>
      )
    },
    {
      key: 'actions',
      header: '',
      render: (row) => {
        if (!canModerate || row.role !== 'instructor') return null;
        if (row.role_id === cohort.advisor_id) return <span className="text-[11px] text-ink-400">Class Tutor</span>;
        
        return (
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (window.confirm(`Remove ${row.first_name} from this class?`)) {
                  removeTeacher.mutate(row.role_id);
                }
              }}
              className="text-xs font-semibold text-danger hover:opacity-80"
              disabled={removeTeacher.isPending}
            >
              Remove
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-2 mr-2">
            <button
              onClick={() => { setFilter('students'); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                filter === 'students' ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700 hover:bg-surface-muted'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => { setFilter('teachers'); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                filter === 'teachers' ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700 hover:bg-surface-muted'
              }`}
            >
              Teachers
            </button>
            <button
              onClick={() => { setFilter('all'); setPage(1); }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                filter === 'all' ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700 hover:bg-surface-muted'
              }`}
            >
              All
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-48 rounded border border-border bg-surface px-3 py-1.5 text-xs focus:border-accent focus:outline-none"
          />
        </div>
        
        {canModerate && (
          <button
            onClick={() => setShowAddTeacher(true)}
            className="flex-shrink-0 rounded-full bg-accent px-4 py-2 text-[13.5px] font-semibold text-accent-ink transition hover:brightness-110 active:scale-[0.98]"
          >
            + Add Teacher
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message || 'Error loading members'}</div>}
        {data && (
          <DataTable 
            columns={columns} 
            rows={data.data} 
            rowKey={(r) => `${r.role}-${r.id}`}
            pagination={{
              page: data.meta.page,
              limit: data.meta.limit,
              total: data.meta.total,
              onPageChange: setPage
            }}
          />
        )}
      </div>
      
      {showAddTeacher && <AddTeacherModal cohortId={cohortId} onClose={() => setShowAddTeacher(false)} />}
    </div>
  );
}

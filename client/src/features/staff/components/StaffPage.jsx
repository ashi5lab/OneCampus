import { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Avatar } from '../../../components/Avatar';
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff, useSetStaffDesignation } from '../hooks/useStaff';
import { StaffFormModal } from './StaffFormModal';
import { DesignationPicker } from '../../../components/DesignationPicker';
import { idCardsApi } from '../../idCards/services/idCardsApi';

const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' };

// Rendered as a tab inside TeachersPage (see
// client/src/features/teachers/components/TeachersPage.jsx), not its own
// top-level route — mirrors how Online Exams lives inside the Exams page.
export function StaffPage() {
  const { can } = useAuth();

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters = { search: search || undefined, gender: gender || undefined };
  const { data: staff, isLoading, error } = useStaff({ filters });
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const setDesignation = useSetStaffDesignation();

  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const columns = [
    {
      key: 'name',
      header: 'Staff Member',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={`${row.first_name} ${row.last_name}`} src={row.profile_picture_url} size={32} />
          <div>
            <div className="font-semibold">{row.first_name} {row.last_name}</div>
            <div className="font-mono text-[11.5px] text-ink-500">{row.staff_id}</div>
          </div>
        </div>
      )
    },
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
    { key: 'gender', header: 'Gender', render: (row) => GENDER_LABEL[row.meta?.gender] || '—' }
  ];

  if (can('staff.manage')) {
    columns.push({
      key: 'designation',
      header: 'Designation',
      render: (row) => (
        <DesignationPicker
          value={row.meta?.designation}
          disabled={setDesignation.isPending}
          onChange={(designation) => setDesignation.mutate({ id: row.id, designation })}
        />
      )
    });
  }

  if (can('staff.manage')) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => idCardsApi.downloadStaffCard(row.id, row.staff_id)}
            className="text-xs font-semibold text-ink-500 hover:text-ink-900"
          >
            ID Card
          </button>
          <button onClick={() => setEditingStaff(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">Edit</button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete ${row.first_name} ${row.last_name}?`)) {
                deleteStaff.mutate(row.id);
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
      {can('staff.manage') && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add Staff Member
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Total Staff" value={isLoading ? '—' : staff.length} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[200px] flex-1">
          <div className="mb-1 text-xs font-semibold text-ink-700">Search</div>
          <input
            className="input"
            placeholder="Search by name or staff ID…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
        {(searchInput || gender) && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setGender('');
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
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {staff && (
          <DataTable columns={columns} rows={staff} rowKey={(row) => row.id} emptyMessage="No matching staff members." />
        )}
      </div>

      {showForm && (
        <StaffFormModal
          onClose={() => setShowForm(false)}
          submitting={createStaff.isPending}
          submitError={createStaff.error?.message}
          onSubmit={(values) =>
            createStaff.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}

      {editingStaff && (
        <StaffFormModal
          initialData={editingStaff}
          onClose={() => setEditingStaff(null)}
          submitting={updateStaff.isPending}
          submitError={updateStaff.error?.message}
          onSubmit={(values) =>
            updateStaff.mutate({ id: editingStaff.id, payload: values }, { onSuccess: () => setEditingStaff(null) })
          }
        />
      )}
    </div>
  );
}

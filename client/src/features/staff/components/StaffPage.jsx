import { useState, useEffect } from 'react';
import { Pencil, Trash2, IdCard } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Avatar } from '../../../components/Avatar';
import { GeneratedCredentialsModal } from '../../../components/GeneratedCredentialsModal';
import { useStaffPage, useCreateStaff, useUpdateStaff, useDeleteStaff, useSetStaffDesignation } from '../hooks/useStaff';
import { StaffForm } from './StaffForm';
import { DesignationPicker } from '../../../components/DesignationPicker';
import { idCardsApi } from '../../idCards/services/idCardsApi';
import toast from 'react-hot-toast';

const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' };

// Rendered as a tab inside TeachersPage (see
// client/src/features/teachers/components/TeachersPage.jsx), not its own
// top-level route — mirrors how Online Exams lives inside the Exams page.
export function StaffPage() {
  const { can } = useAuth();

  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState(null);

  const filters = { search: search || undefined, gender: gender || undefined, sort: sort?.key, order: sort?.dir };
  const hasActiveFilters = Boolean(search || gender);
  // Back to page 1 whenever a filter changes — otherwise a filtered-down
  // result set can leave the view stuck on a now out-of-range page.
  useEffect(() => {
    setPage(1);
  }, [search, gender]);

  const { data: result, isLoading, error } = useStaffPage({ page, pageSize: pageSize === 'all' ? 200 : pageSize, filters });
  const staff = result?.data;
  const meta = result?.meta;
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const deleteStaff = useDeleteStaff();
  const setDesignation = useSetStaffDesignation();

  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);

  const columns = [
    {
      key: 'name',
      header: 'Staff Member',
      sortable: true,
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
    { key: 'phone', header: 'Phone', mobileCompact: true, render: (row) => row.phone || '—' },
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

  function staffActions(row) {
    return [
      { key: 'id-card', label: 'ID Card', icon: IdCard, hidden: !can('staff.manage'), onClick: () => idCardsApi.downloadStaffCard(row.id, row.staff_id) },
      { key: 'edit', label: 'Edit', icon: Pencil, hidden: !can('staff.manage'), onClick: () => setEditingStaff(row) },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
        hidden: !can('staff.manage'),
        confirm: `Are you sure you want to delete ${row.first_name} ${row.last_name}?`,
        onClick: () => deleteStaff.mutate(row.id)
      }
    ];
  }

  if (showForm || editingStaff) {
    return (
      <div className="py-4">
        {showForm && (
          <StaffForm
            onClose={() => setShowForm(false)}
            submitting={createStaff.isPending}
            submitError={createStaff.error?.message}
            onSubmit={(values) =>
              createStaff.mutate(values, {
                onSuccess: (created) => {
                  setShowForm(false);
                  setNewCredentials({ username: created.username, password: created.password });
                  toast.success('Staff member added successfully!');
                }
              })
            }
          />
        )}
        {editingStaff && (
          <StaffForm
            initialData={editingStaff}
            onClose={() => setEditingStaff(null)}
            submitting={updateStaff.isPending}
            submitError={updateStaff.error?.message}
            onSubmit={(values) =>
              updateStaff.mutate({ id: editingStaff.id, payload: values }, { 
                onSuccess: () => {
                  setEditingStaff(null);
                  toast.success('Staff member updated successfully!');
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
      {can('staff.manage') && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add Staff Member
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label="Total Staff" value={isLoading ? '—' : meta?.total ?? 0} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {staff && (
          <DataTable
            columns={columns}
            rows={staff}
            rowKey={(row) => row.id}
            emptyMessage="No matching staff members."
            mobileCompact
            actions={staffActions}
            sort={sort}
            onSortChange={(key) => setSort((prev) => {
              if (!prev || prev.key !== key) return { key, dir: 'asc' };
              if (prev.dir === 'asc') return { key, dir: 'desc' };
              return null;
            })}
            filters={{
              search: { value: search, onChange: setSearch, placeholder: 'Search by name or staff ID…' },
              fields: [
                {
                  key: 'gender',
                  type: 'select',
                  label: 'Gender',
                  value: gender,
                  onChange: setGender,
                  options: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]
                }
              ],
              hasActiveFilters,
              onClear: () => { setSearch(''); setGender(''); }
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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Avatar } from '../../../components/Avatar';
import { GeneratedCredentialsModal } from '../../../components/GeneratedCredentialsModal';
import { useInstructors, useInstructorsPage, useCreateInstructor, useUpdateInstructor, useDeleteInstructor, useSetInstructorDesignation } from '../hooks/useInstructors';
import { useModules } from '../../modules/hooks/useModules';
import { useInstructorModules } from '../hooks/useInstructorModules';
import { InstructorForm } from './InstructorForm';
import { InstructorModulesModal } from './InstructorModulesModal';
import { StaffPage } from '../../staff/components/StaffPage';
import toast from 'react-hot-toast';
import { DesignationPicker } from '../../../components/DesignationPicker';
import { PageHeader } from '../../../components/PageHeader';

const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' };

// Same URL (/app/instructors) and permission gates as before "Staff"/
// "Teacher Subjects" existed — only adds tabs, and only for callers who can
// actually see them (staff.view / instructor_modules.view), so most roles
// see exactly what they saw before.
export function InstructorsPage() {
  const { t } = useConfig();
  const { can } = useAuth();
  const showStaffTab = can('staff.view');
  const showTeacherSubjectsTab = can('instructor_modules.view');
  const tabs = [
    { value: 'teachers', label: t('instructors') },
    ...(showStaffTab ? [{ value: 'staff', label: 'Staff' }] : []),
    ...(showTeacherSubjectsTab ? [{ value: 'teacherSubjects', label: `${t('instructor')} ${t('topics')}` }] : [])
  ];
  const [tab, setTab] = useState('teachers');

  return (
    <div>
      <PageHeader
        eyebrow={`Management / ${t('instructors')}`}
        title={t('instructors')}
        tabs={
          tabs.length > 1 && (
            <div className="flex gap-2">
              {tabs.map((tabOption) => (
                <button
                  key={tabOption.value}
                  onClick={() => setTab(tabOption.value)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                    tab === tabOption.value ? 'bg-ink-900 text-white' : 'border border-border bg-surface text-ink-700'
                  }`}
                >
                  {tabOption.label}
                </button>
              ))}
            </div>
          )
        }
      />

      {tab === 'staff' && showStaffTab && <StaffPage />}
      {tab === 'teacherSubjects' && showTeacherSubjectsTab && <TeacherSubjectsTab />}
      {(tab === 'teachers' || (tab === 'staff' && !showStaffTab) || (tab === 'teacherSubjects' && !showTeacherSubjectsTab)) && <TeachersTab />}
    </div>
  );
}

// Roster of every teacher with their currently assigned subjects — "Manage"
// opens InstructorModulesModal to add/remove onec_instructor_modules links
// for that one teacher, same relationship InstructorFormModal seeds at
// creation time.
function TeacherSubjectsTab() {
  const { t } = useConfig();
  const { can } = useAuth();
  const { data: instructors, isLoading: instructorsLoading, error: instructorsError } = useInstructors();
  const { data: modules, error: modulesError } = useModules();
  const { data: links, isLoading: linksLoading, error: linksError } = useInstructorModules();
  const [managingInstructor, setManagingInstructor] = useState(null);

  const isLoading = instructorsLoading || linksLoading;
  const error = instructorsError || modulesError || linksError;
  const moduleNameById = new Map((modules || []).map((module) => [module.id, module.name]));

  const columns = [
    {
      key: 'name',
      header: t('instructor'),
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
    {
      key: 'subjects',
      header: t('topics'),
      render: (row) => {
        const names = (links || [])
          .filter((link) => link.instructor_id === row.id)
          .map((link) => moduleNameById.get(link.module_id))
          .filter(Boolean);
        if (names.length === 0) return <span className="text-ink-500">—</span>;
        return (
          <div className="flex flex-wrap gap-1.5">
            {names.map((name) => (
              <span key={name} className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-700">
                {name}
              </span>
            ))}
          </div>
        );
      }
    }
  ];

  function subjectActions(row) {
    return [{ key: 'manage', label: 'Manage', hidden: !can('instructor_modules.manage'), onClick: () => setManagingInstructor(row) }];
  }

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {instructors && (
          <DataTable columns={columns} rows={instructors} rowKey={(row) => row.id} emptyMessage={`No ${t('instructors').toLowerCase()} yet.`} actions={subjectActions} />
        )}
      </div>

      {managingInstructor && (
        <InstructorModulesModal instructor={managingInstructor} onClose={() => setManagingInstructor(null)} />
      )}
    </div>
  );
}

function TeachersTab() {
  const { t } = useConfig();
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

  const { data: result, isLoading, error } = useInstructorsPage({ page, pageSize: pageSize === 'all' ? 200 : pageSize, filters });
  const instructors = result?.data;
  const meta = result?.meta;
  const createInstructor = useCreateInstructor();
  const updateInstructor = useUpdateInstructor();
  const deleteInstructor = useDeleteInstructor();
  const setDesignation = useSetInstructorDesignation();

  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [newCredentials, setNewCredentials] = useState(null);

  const columns = [
    {
      key: 'name',
      header: t('instructor'),
      sortable: true,
      render: (row) => (
        <Link to={`/app/instructors/${row.id}`} className="flex items-center gap-2.5 hover:underline">
          <Avatar name={`${row.first_name} ${row.last_name}`} src={row.profile_picture_url} size={32} />
          <div>
            <div className="font-semibold">{row.first_name} {row.last_name}</div>
            <div className="font-mono text-[11.5px] text-ink-500">{row.staff_id}</div>
          </div>
        </Link>
      )
    },
    { key: 'phone', header: 'Phone', mobileCompact: true, render: (row) => row.phone || '—' },
    { key: 'gender', header: 'Gender', render: (row) => GENDER_LABEL[row.meta?.gender] || '—' }
  ];

  if (can('instructors.manage')) {
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

  function instructorActions(row) {
    return [
      { key: 'edit', label: 'Edit', icon: Pencil, hidden: !can('instructors.manage'), onClick: () => setEditingInstructor(row) },
      {
        key: 'delete',
        label: 'Delete',
        icon: Trash2,
        variant: 'danger',
        hidden: !can('instructors.manage'),
        confirm: `Are you sure you want to delete ${row.first_name} ${row.last_name}?`,
        onClick: () => deleteInstructor.mutate(row.id)
      }
    ];
  }

  if (showForm || editingInstructor) {
    return (
      <div className="py-4">
        {showForm && (
          <InstructorForm
            onClose={() => setShowForm(false)}
            submitting={createInstructor.isPending}
            submitError={createInstructor.error?.message}
            onSubmit={(values) =>
              createInstructor.mutate(values, {
                onSuccess: (created) => {
                  setShowForm(false);
                  setNewCredentials({ username: created.username, password: created.password });
                  toast.success(`${t('instructor')} added successfully!`);
                }
              })
            }
          />
        )}
        {editingInstructor && (
          <InstructorForm
            initialData={editingInstructor}
            onClose={() => setEditingInstructor(null)}
            submitting={updateInstructor.isPending}
            submitError={updateInstructor.error?.message}
            onSubmit={(values) =>
              updateInstructor.mutate({ id: editingInstructor.id, payload: values }, { 
                onSuccess: () => {
                  setEditingInstructor(null);
                  toast.success(`${t('instructor')} updated successfully!`);
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
      {can('instructors.manage') && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add {t('instructor')}
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label={`Total ${t('instructors')}`} value={isLoading ? '—' : meta?.total ?? 0} />
      </div>

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && (
          <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>
        )}
        {instructors && (
          <DataTable
            columns={columns}
            rows={instructors}
            rowKey={(row) => row.id}
            emptyMessage="No matching instructors."
            mobileCompact
            actions={instructorActions}
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

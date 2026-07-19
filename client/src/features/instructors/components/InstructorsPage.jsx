import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { StatCard } from '../../../components/StatCard';
import { DataTable } from '../../../components/DataTable';
import { Avatar } from '../../../components/Avatar';
import { useInstructors, useCreateInstructor, useUpdateInstructor, useDeleteInstructor, useSetInstructorDesignation } from '../hooks/useInstructors';
import { useModules } from '../../modules/hooks/useModules';
import { useInstructorModules } from '../hooks/useInstructorModules';
import { InstructorFormModal } from './InstructorFormModal';
import { InstructorModulesModal } from './InstructorModulesModal';
import { StaffPage } from '../../staff/components/StaffPage';
import { DesignationPicker } from '../../../components/DesignationPicker';

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
      {tabs.length > 1 && (
        <div className="mb-5 flex gap-2">
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
      )}

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

  if (can('instructor_modules.manage')) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end">
          <button onClick={() => setManagingInstructor(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
            Manage
          </button>
        </div>
      )
    });
  }

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {instructors && (
          <DataTable columns={columns} rows={instructors} rowKey={(row) => row.id} emptyMessage={`No ${t('instructors').toLowerCase()} yet.`} />
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

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters = { search: search || undefined, gender: gender || undefined };
  const { data: instructors, isLoading, error } = useInstructors({ filters });
  const createInstructor = useCreateInstructor();
  const updateInstructor = useUpdateInstructor();
  const deleteInstructor = useDeleteInstructor();
  const setDesignation = useSetInstructorDesignation();

  const [showForm, setShowForm] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);

  const columns = [
    {
      key: 'name',
      header: t('instructor'),
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
    { key: 'phone', header: 'Phone', render: (row) => row.phone || '—' },
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

  if (can('instructors.manage')) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditingInstructor(row)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">Edit</button>
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete ${row.first_name} ${row.last_name}?`)) {
                deleteInstructor.mutate(row.id);
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
            Management / {t('instructors')}
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">
            {t('instructors')}
          </h1>
        </div>
        {can('instructors.manage') && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Add {t('instructor')}
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard label={`Total ${t('instructors')}`} value={isLoading ? '—' : instructors.length} />
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
        {instructors && (
          <DataTable columns={columns} rows={instructors} rowKey={(row) => row.id} emptyMessage="No matching instructors." />
        )}
      </div>

      {showForm && (
        <InstructorFormModal
          onClose={() => setShowForm(false)}
          submitting={createInstructor.isPending}
          submitError={createInstructor.error?.message}
          onSubmit={(values) =>
            createInstructor.mutate(values, { onSuccess: () => setShowForm(false) })
          }
        />
      )}

      {editingInstructor && (
        <InstructorFormModal
          initialData={editingInstructor}
          onClose={() => setEditingInstructor(null)}
          submitting={updateInstructor.isPending}
          submitError={updateInstructor.error?.message}
          onSubmit={(values) =>
            updateInstructor.mutate({ id: editingInstructor.id, payload: values }, { onSuccess: () => setEditingInstructor(null) })
          }
        />
      )}
    </div>
  );
}

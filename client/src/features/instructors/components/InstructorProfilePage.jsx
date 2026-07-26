import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Users, Calendar, Grid, BookOpen, MoreHorizontal, ChevronRight, FileText, Download, ClipboardList, GraduationCap } from 'lucide-react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { PageHeader } from '../../../components/PageHeader';
import { Avatar } from '../../../components/Avatar';
import { Badge } from '../../../components/Badge';
import { DataTable } from '../../../components/DataTable';
import { ProfilePictureUploader } from '../../profile/components/ProfilePictureUploader';
import { useInstructorProfile, useUpdateInstructor, useDeleteInstructor } from '../hooks/useInstructors';
import { useModules } from '../../modules/hooks/useModules';
import { useInstructorModules } from '../hooks/useInstructorModules';
import { InstructorForm } from './InstructorForm';
import { idCardsApi } from '../../idCards/services/idCardsApi';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import toast from 'react-hot-toast';

const GENDER_LABEL = { male: 'Male', female: 'Female', other: 'Other' };

const TABS = [
  { key: 'overview', label: 'Overview', icon: Grid },
  { key: 'classes', label: 'My Classes', icon: GraduationCap },
  { key: 'attendance', label: 'Attendance', icon: Calendar },
  { key: 'more', label: 'More', icon: MoreHorizontal }
];

export function InstructorProfilePage() {
  const { id } = useParams();
  const instructorId = Number(id);
  const navigate = useNavigate();
  const { t } = useConfig();
  const { profile: ownProfile, can } = useAuth();
  const { data, isLoading, error } = useInstructorProfile(instructorId);
  const { data: modules } = useModules();
  const { data: moduleLinks } = useInstructorModules();
  const updateInstructor = useUpdateInstructor();
  const deleteInstructor = useDeleteInstructor();
  const [tab, setTab] = useState('overview');
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isOwnProfile = ownProfile?.instructorId === instructorId;
  const canManage = can('instructors.manage');

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) {
    return (
      <div className="rounded border border-border bg-surface p-8 text-center text-sm font-semibold text-danger">
        {error.message}
      </div>
    );
  }

  const { instructor, stats, recentAttendance, myClasses = [] } = data;
  const moduleNameById = new Map((modules || []).map((m) => [m.id, m.name]));
  const subjectNames = (moduleLinks || [])
    .filter((link) => link.instructor_id === instructorId)
    .map((link) => moduleNameById.get(link.module_id))
    .filter(Boolean);

  function handleDelete() {
    deleteInstructor.mutate(instructorId, { onSuccess: () => navigate('/app/instructors') });
  }

  return (
    <div className="pb-10 space-y-6">
      <PageHeader title="Teacher Profile" />

      {showEdit ? (
        <div className="py-4 bg-surface rounded-2xl shadow-sm border border-border p-6">
          <InstructorForm
            initialData={instructor}
            onClose={() => setShowEdit(false)}
            submitting={updateInstructor.isPending}
            submitError={updateInstructor.error?.message}
            onSubmit={(values) =>
              updateInstructor.mutate({ id: instructorId, payload: values }, {
                onSuccess: () => {
                  setShowEdit(false);
                  toast.success(`${t('instructor')} updated successfully!`);
                }
              })
            }
          />
        </div>
      ) : (
        <>
          <div className="bg-[#4b43c4] rounded-[24px] shadow-sm overflow-hidden text-white mb-6 bg-gradient-to-br from-[#4b43c4] to-[#3a34a8] relative">
            {canManage && (
              <button
                onClick={() => setShowEdit(true)}
                className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-full text-xs font-bold transition-colors shadow-sm z-10"
              >
                <User className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="relative shrink-0 mt-4 md:mt-0">
                    <ProfilePictureUploader
                      name={`${instructor.first_name} ${instructor.last_name}`}
                      pictureUrl={instructor.profile_picture_url}
                      invalidateKey={['instructors', instructorId, 'profile']}
                      readOnly={!isOwnProfile}
                      containerClassName="w-24 h-24 md:w-[104px] md:h-[104px] rounded-full border-[3px] border-white shadow-md flex items-center justify-center bg-white/10"
                    />
                  </div>
                  <div className="text-center md:text-left pt-2">
                    <h1 className="text-2xl md:text-[28px] font-extrabold flex flex-wrap items-center justify-center md:justify-start gap-2 md:gap-3 mb-1">
                      {instructor.first_name} {instructor.last_name}
                    </h1>
                    <p className="text-indigo-100/90 text-[13px] font-medium leading-relaxed">
                      Staff ID: {instructor.staff_id}
                    </p>
                    {instructor.phone && (
                      <p className="text-indigo-100/90 text-[13px] font-medium leading-relaxed mb-2">
                        {instructor.phone}
                      </p>
                    )}
                    {instructor.meta?.designation && (
                      <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide capitalize">
                        {instructor.meta.designation.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid inside banner */}
              <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8 pt-8 border-t border-white/10 relative">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white text-[#4b43c4] flex items-center justify-center shrink-0 shadow-sm">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-indigo-100/90 font-medium mb-0.5">My Classes</p>
                    <p className="text-xl font-extrabold leading-none mb-1">{myClasses.length}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 relative">
                  <div className="hidden lg:block absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 w-px h-12 bg-white/10"></div>
                  <div className="w-12 h-12 rounded-full bg-white text-[#4b43c4] flex items-center justify-center shrink-0 shadow-sm">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-indigo-100/90 font-medium mb-0.5">Assignments Created</p>
                    <p className="text-xl font-extrabold leading-none mb-1">{stats.assignmentsCreated}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 relative">
                  <div className="hidden lg:block absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 w-px h-12 bg-white/10"></div>
                  <div className="w-12 h-12 rounded-full bg-white text-[#4b43c4] flex items-center justify-center shrink-0 shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-indigo-100/90 font-medium mb-0.5">Exams Created</p>
                    <p className="text-xl font-extrabold leading-none mb-1">{stats.examsCreated}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 relative">
                  <div className="hidden lg:block absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 w-px h-12 bg-white/10"></div>
                  <div className="w-12 h-12 rounded-full bg-white text-[#4b43c4] flex items-center justify-center shrink-0 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>
                  </div>
                  <div>
                    <p className="text-[11px] text-indigo-100/90 font-medium mb-0.5">Attendance Marked</p>
                    <p className="text-xl font-extrabold leading-none mb-1">{stats.attendanceMarked}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Layout (Grid on Desktop, Stacked on Mobile) */}
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 min-w-0 space-y-6">
              {/* Tab Bar */}
              <div className="flex flex-wrap items-center gap-1 pb-1">
                {TABS.map((tabOption) => {
                  const Icon = tabOption.icon;
                  const isActive = tab === tabOption.key;
                  return (
                    <button
                      key={tabOption.key}
                      onClick={() => setTab(tabOption.key)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-transparent text-ink-500 hover:bg-surface-muted hover:text-ink-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-ink-400'}`} />
                      {tabOption.label}
                    </button>
                  );
                })}
              </div>

              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-extrabold text-ink-900">Subjects Taught</h2>
                    </div>
                    {subjectNames.length === 0 ? (
                      <div className="rounded-xl bg-surface-muted p-4 text-[13px] text-ink-500 text-center">
                        No subjects assigned yet.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {subjectNames.map((name) => (
                          <span key={name} className="rounded-full bg-surface-muted px-2.5 py-1 text-[12px] font-semibold text-ink-700">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-extrabold text-ink-900">My Classes</h2>
                      <button onClick={() => setTab('classes')} className="text-xs font-bold text-indigo-600 flex items-center hover:underline">
                        View all <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                    {myClasses.length === 0 ? (
                      <div className="rounded-xl bg-surface-muted p-4 text-[13px] text-ink-500 text-center">
                        Not a member of any class yet.
                      </div>
                    ) : (
                      <div className="divide-y divide-border/50">
                        {myClasses.slice(0, 5).map((cls) => (
                          <div key={cls.id} className="flex items-center justify-between py-3">
                            <div>
                              <div className="text-sm font-semibold text-ink-800">{cls.name}</div>
                              <div className="text-xs text-ink-500 mt-0.5">
                                Students: {cls.student_count} {cls.subject_names ? `· Subject: ${cls.subject_names}` : ''}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-ink-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-extrabold text-ink-900">Personal Details</h2>
                    </div>
                    <div className="divide-y divide-border/50 text-sm">
                      <div className="flex justify-between items-center py-3">
                        <span className="text-ink-500 font-medium">Gender</span>
                        <span className="font-bold text-ink-900">{GENDER_LABEL[instructor.meta?.gender] || '—'}</span>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <span className="text-ink-500 font-medium">Phone</span>
                        <span className="font-bold text-ink-900">{instructor.phone || '—'}</span>
                      </div>
                      {instructor.email && (
                        <div className="flex justify-between items-center py-3">
                          <span className="text-ink-500 font-medium">Email</span>
                          <span className="font-bold text-ink-900">{instructor.email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'classes' && (
                <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                  <h3 className="mb-3 text-sm font-extrabold text-ink-900">My Classes</h3>
                  <p className="mb-4 text-xs text-ink-500">
                    Classes this {t('instructor')} is a member of. Attendance/assignment/exam permissions may extend to other classes as well.
                  </p>
                  {myClasses.length === 0 ? (
                    <div className="rounded-xl bg-surface-muted p-6 text-center text-[13px] text-ink-500">
                      Not a member of any class yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {myClasses.map((cls) => (
                        <div key={cls.id} className="rounded-xl border border-border p-4">
                          <div className="text-sm font-bold text-ink-900">{cls.name}</div>
                          <div className="mt-1 text-xs text-ink-500">Students: {cls.student_count}</div>
                          <div className="mt-1 text-xs text-ink-500">Subject: {cls.subject_names || '—'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'attendance' && (
                <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                  <h3 className="mb-3 text-sm font-extrabold text-ink-900">Recent Activity</h3>
                  <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
                    <DataTable
                      columns={[
                        { key: 'date', header: 'Date', render: (row) => new Date(row.date).toLocaleDateString() },
                        { key: 'learner', header: t('learner'), render: (row) => `${row.first_name} ${row.last_name}` },
                        {
                          key: 'status',
                          header: 'Status',
                          render: (row) => <Badge variant={row.status === 'present' ? 'active' : row.status === 'absent' ? 'inactive' : 'pending'}>{row.status}</Badge>
                        }
                      ]}
                      rows={recentAttendance}
                      rowKey={(row) => row.id}
                      emptyMessage="No attendance marked yet."
                    />
                  </div>
                </div>
              )}

              {tab === 'more' && (
                <div className="space-y-4">
                  <button onClick={() => idCardsApi.downloadInstructorCard(instructorId, instructor.staff_id)} className="w-full bg-surface rounded-xl shadow-sm border border-border p-4 flex items-center justify-between hover:bg-surface-muted transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center"><User className="w-5 h-5" /></div>
                      <div><p className="font-bold text-ink-900">Download ID Card</p><p className="text-xs text-ink-500">Get a PDF copy of the staff ID</p></div>
                    </div>
                    <Download className="w-5 h-5 text-ink-400" />
                  </button>
                  {canManage && (
                    <button onClick={() => setConfirmDelete(true)} className="w-full bg-red-50 rounded-xl border border-red-100 p-4 flex items-center justify-between hover:bg-red-100 transition-colors text-left">
                      <div className="flex items-center gap-3 text-red-700">
                        <div className="w-10 h-10 rounded-full bg-white text-red-600 flex items-center justify-center shadow-sm"><User className="w-5 h-5" /></div>
                        <div><p className="font-bold">Delete Profile</p><p className="text-xs opacity-80">Permanently remove this record</p></div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Column / Sidebar */}
            <div className={`w-full xl:w-[320px] shrink-0 flex-col gap-5 ${tab === 'overview' ? 'flex' : 'hidden xl:flex'}`}>
              <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-indigo-500" /> Contact
                </h3>
                <div className="divide-y divide-border/50 text-sm">
                  <div className="flex justify-between items-center py-3">
                    <span className="text-ink-500 font-medium">Phone</span>
                    <span className="font-bold text-ink-900">{instructor.phone || '—'}</span>
                  </div>
                  {instructor.email && (
                    <div className="flex justify-between items-center py-3">
                      <span className="text-ink-500 font-medium">Email</span>
                      <span className="font-bold text-ink-900 truncate max-w-[160px]">{instructor.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-surface rounded-2xl shadow-sm border border-border p-5">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-ink-900 flex items-center gap-2 mb-4">
                  <BookOpen className="w-4 h-4 text-indigo-500" /> Quick Links
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setTab('classes')} className="bg-surface-muted hover:bg-indigo-50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-colors border border-transparent hover:border-indigo-100">
                    <GraduationCap className="w-5 h-5 text-indigo-500" />
                    <span className="text-xs font-bold text-ink-700">My Classes</span>
                  </button>
                  <button onClick={() => navigate('/app/timetable')} className="bg-surface-muted hover:bg-indigo-50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-colors border border-transparent hover:border-indigo-100">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <span className="text-xs font-bold text-ink-700">Time Table</span>
                  </button>
                  <button onClick={() => navigate('/app/assignments')} className="bg-surface-muted hover:bg-indigo-50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-colors border border-transparent hover:border-indigo-100">
                    <ClipboardList className="w-5 h-5 text-emerald-500" />
                    <span className="text-xs font-bold text-ink-700">Assignments</span>
                  </button>
                  <button onClick={() => navigate('/app/exams')} className="bg-surface-muted hover:bg-indigo-50 rounded-xl p-3 flex flex-col items-center justify-center gap-2 text-center transition-colors border border-transparent hover:border-indigo-100">
                    <FileText className="w-5 h-5 text-orange-500" />
                    <span className="text-xs font-bold text-ink-700">Exams</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`Delete ${instructor.first_name} ${instructor.last_name}? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

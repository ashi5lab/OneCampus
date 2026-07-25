import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useModules } from '../../modules/hooks/useModules';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useAllUsers } from '../../profile/hooks/useProfile';
import { useAssignment, useCreateAssignment, useUpdateAssignment } from '../hooks/useAssignments';
import { PageHeader } from '../../../components/PageHeader';
import { Spinner } from '../../../components/Spinner';
import { SearchSelect } from '../../../components/SearchSelect';
import { MultiSearchSelect } from '../../../components/MultiSearchSelect';
import { UserSearchSelect } from '../../../components/UserSearchSelect';
import { showToast } from '../../../lib/toast';

// ─── Zod schema ──────────────────────────────────────────────────────────────
const schema = z.object({
  title:        z.string().min(1, 'Title is required'),
  description:  z.string().optional(),
  module_id:    z.coerce.number({ invalid_type_error: 'Choose a subject' }).int().positive('Choose a subject'),
  due_date:     z.string().min(1, 'Due date is required'),
  target_type:  z.enum(['class', 'specific_students']),
  cohort_ids:   z.array(z.coerce.number()).optional(),
  student_user_ids: z.array(z.coerce.number()).optional(),
  eval_type:    z.enum(['marks', 'grades']),
  max_score:    z.coerce.number().optional(),
  passing_marks: z.coerce.number().optional(),
  pass_grade:   z.string().optional(),
  instructions: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.target_type === 'class' && (!d.cohort_ids || d.cohort_ids.length === 0)) {
    ctx.addIssue({ path: ['cohort_ids'], code: 'custom', message: 'Select at least one class' });
  }
  if (d.target_type === 'specific_students' && (!d.student_user_ids || d.student_user_ids.length === 0)) {
    ctx.addIssue({ path: ['student_user_ids'], code: 'custom', message: 'Select at least one student' });
  }
  if (d.eval_type === 'marks' && !d.max_score) {
    ctx.addIssue({ path: ['max_score'], code: 'custom', message: 'Max marks is required' });
  }
});

// ─── Small helpers ────────────────────────────────────────────────────────────
function Field({ label, error, children, hint }) {
  return (
    <div className="mb-4">
      {label && <label className="mb-1 block text-sm font-semibold text-ink-700">{label}</label>}
      {hint && <p className="mb-1 text-xs text-ink-500">{hint}</p>}
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error.message}</p>}
    </div>
  );
}

const GRADE_OPTIONS = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'].map(g => ({ value: g, label: g }));

// ─── Page ─────────────────────────────────────────────────────────────────────
export function AssignmentFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useConfig();
  const { user } = useAuth();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useAssignment(id);
  const { data: modulesData } = useModules();
  const { data: cohortsData } = useCohorts();
  const { data: allUsersData } = useAllUsers();

  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      module_id: '',
      due_date: '',
      target_type: 'class',
      cohort_ids: [],
      student_user_ids: [],
      eval_type: 'marks',
      max_score: 100,
      passing_marks: '',
      pass_grade: '',
      instructions: '',
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (isEdit && existing) {
      reset({
        title: existing.title ?? '',
        description: existing.description ?? '',
        module_id: existing.module_id ?? '',
        due_date: existing.due_date ? existing.due_date.slice(0, 10) : '',
        target_type: existing.target_type ?? 'class',
        cohort_ids: existing.cohort_ids ?? [],
        student_user_ids: existing.student_user_ids ?? [],
        eval_type: existing.eval_type ?? 'marks',
        max_score: existing.max_score ?? 100,
        passing_marks: existing.passing_marks ?? '',
        pass_grade: existing.pass_grade ?? '',
        instructions: existing.instructions ?? '',
      });
    }
  }, [isEdit, existing, reset]);

  const targetType = watch('target_type');
  const evalType = watch('eval_type');

  const moduleOptions = (modulesData?.data ?? []).map(m => ({ value: m.id, label: m.name }));
  const cohortOptions = (cohortsData?.data ?? []).map(c => ({ value: c.id, label: c.name }));
  const allUsers = allUsersData?.data ?? [];
  const learnerOptions = allUsers
    .filter(u => u.role === 'learner')
    .map(u => ({
      value: u.id,
      label: u.name || u.username,
    }));

  async function onSubmit(values, asDraft = false) {
    const payload = { ...values };
    if (asDraft) payload.draft = true;
    if (payload.target_type === 'class') delete payload.student_user_ids;
    if (payload.target_type === 'specific_students') delete payload.cohort_ids;

    if (isEdit) {
      updateAssignment.mutate(
        { id, payload },
        {
          onSuccess: () => {
            showToast.success('Assignment updated.');
            navigate(`/app/assignments/${id}`);
          },
          onError: e => showToast.error(e.message),
        }
      );
    } else {
      createAssignment.mutate(payload, {
        onSuccess: (res) => {
          const newId = res.id ?? res.assignment?.id;
          navigate(asDraft ? `/app/assignments/${newId}` : `/app/assignments/${newId}/success`);
        },
        onError: e => showToast.error(e.message),
      });
    }
  }

  const isPending = createAssignment.isPending || updateAssignment.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div>
        <PageHeader back title="Edit Assignment" />
        <div className="p-8 text-center text-sm text-ink-500">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        back
        onBack={() => navigate(-1)}
        eyebrow="Assignments"
        title={isEdit ? 'Edit Assignment' : 'New Assignment'}
      />

      <form
        onSubmit={handleSubmit(v => onSubmit(v, false))}
        className="mx-auto max-w-2xl space-y-0 pb-12"
      >
        {/* ── Section: Basics ─────────────────────────────────── */}
        <section className="mb-6 rounded border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-500">Basics</h2>

          <Field label="Assignment Title" error={errors.title}>
            <input
              className="input"
              placeholder="e.g. Chapter 5 Problem Set"
              {...register('title')}
            />
          </Field>

          <Field label="Subject" error={errors.module_id}>
            <Controller
              name="module_id"
              control={control}
              render={({ field }) => (
                <SearchSelect
                  options={moduleOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select subject…"
                />
              )}
            />
          </Field>

          <Field label="Due Date" error={errors.due_date}>
            <input type="date" className="input" {...register('due_date')} />
          </Field>

          <Field label="Description" error={errors.description}>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Brief description (optional)"
              {...register('description')}
            />
          </Field>
        </section>

        {/* ── Section: Target ─────────────────────────────────── */}
        <section className="mb-6 rounded border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-500">Target Audience</h2>

          <Field label="Assign to" error={errors.target_type}>
            <Controller
              name="target_type"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  {[
                    { value: 'class', label: 'Class(es)' },
                    { value: 'specific_students', label: 'Specific Students' },
                  ].map(opt => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        value={opt.value}
                        checked={field.value === opt.value}
                        onChange={() => field.onChange(opt.value)}
                        className="accent-accent"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            />
          </Field>

          {targetType === 'class' && (
            <Field label="Classes" error={errors.cohort_ids}>
              <Controller
                name="cohort_ids"
                control={control}
                render={({ field }) => (
                  <MultiSearchSelect
                    options={cohortOptions}
                    values={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Search and select classes…"
                  />
                )}
              />
            </Field>
          )}

          {targetType === 'specific_students' && (
            <Field
              label="Students"
              error={errors.student_user_ids}
              hint="Search and select individual students. Class is not applicable."
            >
              <Controller
                name="student_user_ids"
                control={control}
                render={({ field }) => (
                  <MultiSearchSelect
                    options={learnerOptions}
                    values={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Search students by name…"
                  />
                )}
              />
            </Field>
          )}
        </section>

        {/* ── Section: Evaluation ─────────────────────────────── */}
        <section className="mb-6 rounded border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-500">Evaluation</h2>

          <Field label="Evaluation Type" error={errors.eval_type}>
            <Controller
              name="eval_type"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  {[
                    { value: 'marks', label: 'Marks' },
                    { value: 'grades', label: 'Grades' },
                  ].map(opt => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                      <input
                        type="radio"
                        value={opt.value}
                        checked={field.value === opt.value}
                        onChange={() => field.onChange(opt.value)}
                        className="accent-accent"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            />
          </Field>

          {evalType === 'marks' && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Max Marks" error={errors.max_score}>
                <input type="number" className="input" min={1} {...register('max_score')} />
              </Field>
              <Field label="Passing Marks" error={errors.passing_marks}>
                <input type="number" className="input" min={0} {...register('passing_marks')} />
              </Field>
            </div>
          )}

          {evalType === 'grades' && (
            <Field label="Pass Grade" error={errors.pass_grade}>
              <Controller
                name="pass_grade"
                control={control}
                render={({ field }) => (
                  <SearchSelect
                    options={GRADE_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Minimum passing grade…"
                  />
                )}
              />
            </Field>
          )}
        </section>

        {/* ── Section: Instructions ───────────────────────────── */}
        <section className="mb-6 rounded border border-border bg-surface p-6">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-500">Instructions</h2>
          <Field label="Instructions" error={errors.instructions}>
            <textarea
              className="input resize-none"
              rows={5}
              placeholder="Detailed instructions for students (optional)"
              {...register('instructions')}
            />
          </Field>
        </section>

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          {!isEdit && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleSubmit(v => onSubmit(v, true))}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-surface-muted disabled:opacity-50"
            >
              {isPending && <Spinner size="sm" />}
              Save as Draft
            </button>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink disabled:opacity-50"
          >
            {isPending && <Spinner size="sm" />}
            {isEdit ? 'Save Changes' : 'Create Assignment'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm font-semibold text-ink-500 hover:text-ink-900"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

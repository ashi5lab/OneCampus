import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useConfig } from '../../../contexts/ConfigContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useModules } from '../../modules/hooks/useModules';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useLearners } from '../../learners/hooks/useLearners';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import { useExam, useCreateExam, useUpdateExam } from '../hooks/useExams';
import { PageHeader } from '../../../components/PageHeader';
import { Spinner } from '../../../components/Spinner';
import { SearchSelect } from '../../../components/SearchSelect';
import { MultiSearchSelect } from '../../../components/MultiSearchSelect';
import { MultiUserSearchSelect, UserSearchSelect } from '../../../components/UserSearchSelect';
import { showToast } from '../../../lib/toast';

const schema = z.object({
  title:        z.string().min(1, 'Exam name is required'),
  description:  z.string().optional(),
  module_id:    z.coerce.number({ invalid_type_error: 'Choose a subject' }).int().positive('Choose a subject'),
  exam_date:    z.string().min(1, 'Exam date is required'),
  taken_by:     z.coerce.number().int().optional().nullable(),
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

const GRADE_OPTIONS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'].map(g => ({ value: g, label: g }));

export function ExamFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useConfig();
  const { user } = useAuth();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useExam(id);
  const { data: modulesData } = useModules();
  const { data: cohortsData } = useCohorts();
  const { data: learnersData } = useLearners();
  const { data: instructorsData } = useInstructors();

  const createExam = useCreateExam();
  const updateExam = useUpdateExam();

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      module_id: '',
      exam_date: '',
      taken_by: user?.userId ?? null,
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

  useEffect(() => {
    if (isEdit && existing) {
      reset({
        title: existing.title ?? '',
        description: existing.description ?? '',
        module_id: existing.module_id ?? '',
        exam_date: existing.exam_date ? existing.exam_date.slice(0, 10) : '',
        taken_by: existing.taken_by ?? user?.userId ?? null,
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
  }, [isEdit, existing, reset, user?.userId]);

  const targetType = watch('target_type');
  const evalType = watch('eval_type');

  const moduleOptions = (modulesData?.data ?? modulesData ?? []).map(m => ({ value: m.id, label: m.name }));
  const cohortOptions = (cohortsData?.data ?? cohortsData ?? []).map(c => ({ value: c.id, label: c.name }));

  const allStudents = (learnersData?.data ?? learnersData ?? []).map(l => ({
    id: l.user_id,
    name: `${l.first_name} ${l.last_name}`,
    cohort_name: l.cohort_name,
    role: 'learner'
  }));

  const allInstructors = (instructorsData?.data ?? instructorsData ?? []).map(i => ({
    id: i.user_id,
    name: `${i.first_name} ${i.last_name}`,
    role: 'instructor'
  }));

  async function onSubmit(values, asDraft = false) {
    const payload = { ...values };
    if (asDraft) payload.draft = true;
    if (payload.target_type === 'class') delete payload.student_user_ids;
    if (payload.target_type === 'specific_students') delete payload.cohort_ids;

    if (isEdit) {
      updateExam.mutate(
        { id, payload },
        {
          onSuccess: () => {
            showToast.success('Exam updated.');
            navigate(`/app/exams/${id}`);
          },
          onError: e => showToast.error(e.message),
        }
      );
    } else {
      createExam.mutate(payload, {
        onSuccess: (res) => {
          const newId = res.id ?? res.exam?.id;
          navigate(asDraft ? `/app/exams/${newId}` : `/app/exams/${newId}/success`);
        },
        onError: e => showToast.error(e.message),
      });
    }
  }

  const isPending = createExam.isPending || updateExam.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div>
        <PageHeader back title="Edit Exam" />
        <div className="p-8 text-center text-sm text-ink-500">Loading…</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        back
        onBack={() => navigate(-1)}
        eyebrow="Exams"
        title={isEdit ? 'Edit Exam' : 'New Exam'}
      />

      <form
        onSubmit={handleSubmit(v => onSubmit(v, false))}
        className="pb-12 space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* ── Left Column ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Section: Basics ─────────────────────────────────── */}
            <section className="rounded border border-border bg-surface p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-500">Basics</h2>

              <Field label="Exam Name" error={errors.title}>
                <input
                  className="input"
                  placeholder="e.g. Mid-Term Mathematics"
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

              <Field label="Date" error={errors.exam_date}>
                <input type="date" className="input" {...register('exam_date')} />
              </Field>

              <Field label="Taken By" error={errors.taken_by}>
                <Controller
                  name="taken_by"
                  control={control}
                  render={({ field }) => (
                    <UserSearchSelect
                      users={allInstructors}
                      roles={['instructor']}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Search instructor…"
                    />
                  )}
                />
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

            {/* ── Section: Instructions ───────────────────────────── */}
            <section className="rounded border border-border bg-surface p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-500">Instructions</h2>
              <Field label="Instructions" error={errors.instructions}>
                <textarea
                  className="input resize-none"
                  rows={6}
                  placeholder="Detailed instructions for students (optional)"
                  {...register('instructions')}
                />
              </Field>
            </section>
          </div>

          {/* ── Right Column ────────────────────────────────────── */}
          <div className="space-y-6">
            {/* ── Section: Target ─────────────────────────────────── */}
            <section className="rounded border border-border bg-surface p-6">
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
                      <MultiUserSearchSelect
                        users={allStudents}
                        roles={['learner']}
                        values={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Search students by name…"
                        showRole={false}
                      />
                    )}
                  />
                </Field>
              )}
            </section>

            {/* ── Section: Evaluation ─────────────────────────────── */}
            <section className="rounded border border-border bg-surface p-6">
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
          </div>
        </div>

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 pt-4">
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
            {isEdit ? 'Save Changes' : 'Create Exam'}
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

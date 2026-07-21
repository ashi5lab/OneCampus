import { useState } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useModules } from '../../modules/hooks/useModules';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { SearchSelect } from '../../../components/SearchSelect';

import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';
function emptyQuestion(type = 'text') {
  return { question_text: '', question_type: type, options: ['', ''], correct_option: 0, max_score: 1 };
}

// Not react-hook-form here — the nested, variable-length question/option
// arrays are simpler to manage as plain state than as RHF field arrays,
// and this form has no other fields worth RHF's validation wiring.
export function ExamFormModal({ onClose, onSubmit, submitting, submitError, initialData = null, questionsLocked = false }) {
  useBodyScrollLock();
  const { t } = useConfig();
  const { data: modules } = useModules();
  const { data: cohorts } = useCohorts();
  // Not just !!initialData — a create prefilled with only a cohort_id (see
  // ClassExamsTab, opened from within a class) is still a create.
  const isEdit = !!initialData?.id;

  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [moduleId, setModuleId] = useState(initialData?.module_id || '');
  const [cohortId, setCohortId] = useState(initialData?.cohort_id || '');
  const [gradingType, setGradingType] = useState(initialData?.grading_type || 'manual');
  const [durationMinutes, setDurationMinutes] = useState(initialData?.duration_minutes || 60);
  const [questions, setQuestions] = useState(
    initialData?.questions?.length
      ? initialData.questions.map((q) => ({
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options?.length ? q.options : ['', ''],
          correct_option: q.correct_option ?? 0,
          max_score: Number(q.max_score)
        }))
      : [emptyQuestion()]
  );
  const [formError, setFormError] = useState('');

  function updateQuestion(index, patch) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex, oIndex, value) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q))
    );
  }

  function addOption(qIndex) {
    setQuestions((prev) => prev.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ''] } : q)));
  }

  function removeOption(qIndex, oIndex) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex
          ? {
              ...q,
              options: q.options.filter((_, j) => j !== oIndex),
              correct_option: q.correct_option >= oIndex ? Math.max(0, q.correct_option - 1) : q.correct_option
            }
          : q
      )
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, emptyQuestion(gradingType === 'auto' ? 'mcq' : 'text')]);
  }

  // Auto-graded exams require every question to be MCQ (enforced server-side
  // too, see the zod .refine() in server/modules/onlineExams/controller.js) —
  // force existing questions over rather than just disabling their type
  // picker, otherwise a question left at the 'text' default becomes stuck
  // there since the picker is disabled once grading type is 'auto'.
  function handleGradingTypeChange(next) {
    setGradingType(next);
    if (next === 'auto') {
      setQuestions((prev) => prev.map((q) => (q.question_type === 'mcq' ? q : { ...q, question_type: 'mcq' })));
    }
  }

  function removeQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !moduleId || !cohortId) {
      setFormError('Title, subject and class are required.');
      return;
    }
    if (questions.length === 0) {
      setFormError('Add at least one question.');
      return;
    }
    for (const q of questions) {
      if (!q.question_text.trim()) {
        setFormError('Every question needs text.');
        return;
      }
      if (q.question_type === 'mcq' && q.options.filter((o) => o.trim()).length < 2) {
        setFormError('MCQ questions need at least two options.');
        return;
      }
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      module_id: Number(moduleId),
      cohort_id: Number(cohortId),
      grading_type: gradingType,
      duration_minutes: Number(durationMinutes),
      questions: questions.map((q) => ({
        question_text: q.question_text.trim(),
        question_type: q.question_type,
        options: q.question_type === 'mcq' ? q.options.filter((o) => o.trim()) : undefined,
        correct_option: q.question_type === 'mcq' ? Number(q.correct_option) : undefined,
        max_score: Number(q.max_score) || 1
      }))
    });
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-ink-900/40 p-4">
      <form onSubmit={handleSubmit} className="my-8 w-full max-w-[640px] rounded border-2 border-accent bg-surface p-6">
        <div className="mb-4 text-base font-bold text-ink-900">{isEdit ? 'Edit' : 'Create'} Online Exam</div>

        <Field label="Title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mid-term Science Exam" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('topic')}>
            <SearchSelect
              options={(modules || []).map((m) => ({ value: m.id, label: m.name }))}
              value={moduleId}
              onChange={setModuleId}
              placeholder={`Search ${t('topic').toLowerCase()}…`}
            />
          </Field>
          <Field label={t('cohort')}>
            <SearchSelect
              options={(cohorts || []).map((c) => ({ value: c.id, label: c.name }))}
              value={cohortId}
              onChange={setCohortId}
              placeholder={`Search ${t('cohort').toLowerCase()}…`}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grading Type">
            <select
              className="input"
              value={gradingType}
              onChange={(e) => handleGradingTypeChange(e.target.value)}
              disabled={questionsLocked}
            >
              <option value="manual">Manual valuation</option>
              <option value="auto">Automatic (MCQ only)</option>
            </select>
          </Field>
          <Field label="Duration (minutes)">
            <input
              type="number"
              className="input"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Description (optional)">
          <textarea rows={2} className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        {questionsLocked && (
          <div className="mb-3 rounded bg-accent/15 p-2.5 text-[11.5px] font-semibold text-accent-dark">
            Questions are locked — learners have already submitted this exam. Delete and recreate it to change questions.
          </div>
        )}

        {!questionsLocked && (
          <div className="mb-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wide text-ink-500">Questions</div>
              <button type="button" onClick={addQuestion} className="text-xs font-semibold text-accent-dark hover:underline">
                + Add Question
              </button>
            </div>
            <div className="space-y-3">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="rounded border border-border bg-surface-muted p-3">
                  <div className="mb-2 flex items-start gap-2">
                    <textarea
                      rows={2}
                      className="input flex-1"
                      placeholder={`Question ${qIndex + 1}`}
                      value={q.question_text}
                      onChange={(e) => updateQuestion(qIndex, { question_text: e.target.value })}
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-xs font-semibold text-danger hover:opacity-80"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mb-2 flex gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                      <select
                        className="input"
                        value={q.question_type}
                        onChange={(e) => updateQuestion(qIndex, { question_type: e.target.value })}
                        disabled={gradingType === 'auto'}
                      >
                        <option value="text">Text answer</option>
                        <option value="mcq">Multiple choice</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                      Points
                      <input
                        type="number"
                        className="input w-20"
                        value={q.max_score}
                        onChange={(e) => updateQuestion(qIndex, { max_score: e.target.value })}
                      />
                    </label>
                  </div>

                  {q.question_type === 'mcq' && (
                    <div className="space-y-1.5 pl-1">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={Number(q.correct_option) === oIndex}
                            onChange={() => updateQuestion(qIndex, { correct_option: oIndex })}
                          />
                          <input
                            className="input flex-1"
                            placeholder={`Option ${oIndex + 1}`}
                            value={opt}
                            onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          />
                          {q.options.length > 2 && (
                            <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-xs text-danger">
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(qIndex)} className="text-[11px] font-semibold text-accent-dark hover:underline">
                        + Add option
                      </button>
                      <div className="text-[11px] text-ink-500">Select the radio button next to the correct answer.</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(formError || submitError) && (
          <div className="mb-3 text-xs font-semibold text-danger">{formError || submitError}</div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-border px-3.5 py-2 text-xs font-semibold text-ink-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-accent px-3.5 py-2 text-xs font-semibold text-accent-ink disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-xs font-semibold text-ink-700">{label}</div>
      {children}
    </label>
  );
}

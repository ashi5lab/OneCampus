import { useState, useEffect } from 'react';
import { useConfig } from '../../../contexts/ConfigContext';
import { useModules } from '../../modules/hooks/useModules';
import { useCohorts } from '../../cohorts/hooks/useCohorts';
import { useInstructors } from '../../instructors/hooks/useInstructors';
import { useAuth } from '../../../contexts/AuthContext';
import { SearchSelect } from '../../../components/SearchSelect';

export function CreateExamPage({ onSubmit, submitting, submitError, onCancel, initialCohortId }) {
  const { t } = useConfig();
  const { user } = useAuth();
  const { data: modules } = useModules();
  const { data: cohorts } = useCohorts();
  const { data: instructors } = useInstructors();

  const [examType, setExamType] = useState('online'); // 'online' or 'offline'

  // Fields for both
  const [title, setTitle] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [cohortId, setCohortId] = useState('');
useEffect(() => {
  if (initialCohortId) {
    setCohortId(initialCohortId);
  }
}, [initialCohortId]);

  // Offline fields
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);
  const [examTakenBy, setExamTakenBy] = useState(user?.userId || '');
  const [durationMinutes, setDurationMinutes] = useState(100);
  const [maxScore, setMaxScore] = useState(100);
  const [passingScore, setPassingScore] = useState(40);

  // Online fields
  const [description, setDescription] = useState('');
  const [gradingType, setGradingType] = useState('manual');
  const [onlineDurationMinutes, setOnlineDurationMinutes] = useState(60);
  const [questions, setQuestions] = useState([
    { question_text: '', question_type: 'text', options: ['', ''], correct_option: 0, max_score: 1 }
  ]);

  const [localError, setLocalError] = useState('');

  // Online Exam Question Helpers
  function addQuestion() {
    setQuestions((prev) => [...prev, { question_text: '', question_type: gradingType === 'auto' ? 'mcq' : 'text', options: ['', ''], correct_option: 0, max_score: 1 }]);
  }

  function removeQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateQuestion(index, patch) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function updateOption(qIndex, oIndex, val) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? val : o)) } : q))
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

  function handleGradingTypeChange(next) {
    setGradingType(next);
    if (next === 'auto') {
      setQuestions((prev) => prev.map((q) => (q.question_type === 'mcq' ? q : { ...q, question_type: 'mcq' })));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    setLocalError('');

    if (!title.trim() || !moduleId || !cohortId) {
      setLocalError('Title, subject, and class are required.');
      return;
    }

    if (examType === 'offline') {
      if (!evalDate) {
        setLocalError('Exam date is required.');
        return;
      }
      onSubmit({
        examType: 'offline',
        title: title.trim(),
        module_id: Number(moduleId),
        cohort_id: Number(cohortId),
        eval_date: evalDate,
        exam_taken_by: Number(examTakenBy),
        duration_minutes: Number(durationMinutes),
        max_score: Number(maxScore),
        passing_score: Number(passingScore),
        // Offline exams still require at least one question according to the API schema.
        // Provide a minimal placeholder question to satisfy validation.
        questions: [
          {
            question_text: 'Placeholder',
            question_type: 'text',
            options: [],
            correct_option: 0,
            max_score: 1
          }
        ]
      });
    } else {
      if (questions.length === 0) {
        setLocalError('Add at least one question.');
        return;
      }
      for (const q of questions) {
        if (!q.question_text.trim()) {
          setLocalError('Every question needs text.');
          return;
        }
        if (q.question_type === 'mcq' && q.options.filter((o) => o.trim()).length < 2) {
          setLocalError('MCQ questions need at least two options.');
          return;
        }
      }
      onSubmit({
        examType: 'online',
        title: title.trim(),
        description: description.trim() || undefined,
        module_id: Number(moduleId),
        cohort_id: Number(cohortId),
        grading_type: gradingType,
        duration_minutes: Number(onlineDurationMinutes),
        questions: questions.map((q) => ({
          question_text: q.question_text.trim(),
          question_type: q.question_type,
          options: q.question_type === 'mcq' ? q.options.filter((o) => o.trim()) : undefined,
          correct_option: q.question_type === 'mcq' ? Number(q.correct_option) : undefined,
          max_score: Number(q.max_score) || 1
        }))
      });
    }
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-ink-900">Create New Exam</h2>
          <p className="text-xs text-ink-500 mt-1">Configure your online or offline classroom evaluation</p>
        </div>
        <div className="flex gap-1.5 border border-border rounded-full p-1 bg-surface-muted">
          <button
            type="button"
            onClick={() => setExamType('online')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${examType === 'online' ? 'bg-accent text-accent-ink' : 'text-ink-700'
              }`}
          >
            Online Exam
          </button>
          <button
            type="button"
            onClick={() => setExamType('offline')}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${examType === 'offline' ? 'bg-accent text-accent-ink' : 'text-ink-700'
              }`}
          >
            Offline Exam
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">Exam Title</div>
          <input
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Science Term 1 Final"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">{t('topic')}</div>
            <SearchSelect
              options={(modules || []).map((m) => ({ value: m.id, label: m.name }))}
              value={moduleId}
              onChange={setModuleId}
              placeholder={`Search ${t('topic').toLowerCase()}…`}
            />
          </label>
          <label className="block">
            <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">{t('cohort')}</div>
            <SearchSelect
              options={(cohorts || []).map((c) => ({ value: c.id, label: c.name }))}
              value={cohortId}
              onChange={setCohortId}
              placeholder={`Search ${t('cohort').toLowerCase()}…`}
            />
          </label>
        </div>

        {examType === 'offline' ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">Exam Date</div>
                <input
                  type="date"
                  className="input w-full"
                  value={evalDate}
                  onChange={(e) => setEvalDate(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">Exam Taken By</div>
                <SearchSelect
                  options={(instructors || []).map((i) => ({ value: i.user_id, label: `${i.first_name} ${i.last_name}` }))}
                  value={examTakenBy}
                  onChange={setExamTakenBy}
                  placeholder="Select instructor..."
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <label className="block">
                <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">Duration (mins)</div>
                <input
                  type="number"
                  className="input w-full"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">Total Marks</div>
                <input
                  type="number"
                  className="input w-full"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                />
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">Pass Marks</div>
                <input
                  type="number"
                  className="input w-full"
                  value={passingScore}
                  onChange={(e) => setPassingScore(e.target.value)}
                />
              </label>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">Grading Type</div>
                <select
                  className="input w-full"
                  value={gradingType}
                  onChange={(e) => handleGradingTypeChange(e.target.value)}
                >
                  <option value="manual">Manual valuation</option>
                  <option value="auto">Automatic (MCQ only)</option>
                </select>
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">Duration (minutes)</div>
                <input
                  type="number"
                  className="input w-full"
                  value={onlineDurationMinutes}
                  onChange={(e) => setOnlineDurationMinutes(e.target.value)}
                />
              </label>
            </div>

            <label className="block">
              <div className="mb-1 text-xs font-bold text-ink-700 uppercase tracking-wide">Description (optional)</div>
              <textarea
                rows={2}
                className="input w-full"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions or exam details..."
              />
            </label>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-ink-500">Questions</div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  + Add Question
                </button>
              </div>

              <div className="space-y-4">
                {questions.map((q, qIndex) => (
                  <div key={qIndex} className="rounded-xl border border-border bg-surface-muted p-4 space-y-3">
                    <div className="flex items-start gap-3">
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
                          className="text-xs font-bold text-danger hover:opacity-85"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-semibold text-ink-700">
                        Type
                        <select
                          className="input py-1"
                          value={q.question_type}
                          onChange={(e) => updateQuestion(qIndex, { question_type: e.target.value })}
                          disabled={gradingType === 'auto'}
                        >
                          <option value="text">Text answer</option>
                          <option value="mcq">Multiple choice</option>
                        </select>
                      </label>
                      <label className="flex items-center gap-2 text-xs font-semibold text-ink-700">
                        Points
                        <input
                          type="number"
                          className="input w-20 py-1"
                          value={q.max_score}
                          onChange={(e) => updateQuestion(qIndex, { max_score: Number(e.target.value) })}
                        />
                      </label>
                    </div>

                    {q.question_type === 'mcq' && (
                      <div className="space-y-2 pl-2">
                        {q.options.map((opt, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={q.correct_option === oIndex}
                              onChange={() => updateQuestion(qIndex, { correct_option: oIndex })}
                            />
                            <input
                              className="input flex-1 py-1"
                              placeholder={`Option ${oIndex + 1}`}
                              value={opt}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(qIndex, oIndex)}
                                className="text-sm font-bold text-danger px-1"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => addOption(qIndex)}
                            className="text-[11px] font-bold text-accent hover:underline"
                          >
                            + Add Option
                          </button>
                          <span className="text-[10px] text-ink-400">Select correct option radio</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {(localError || submitError) && (
          <div className="rounded-lg bg-danger/10 p-3 text-xs font-bold text-danger">
            {localError || submitError}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-5 py-2.5 text-xs font-bold text-ink-700 bg-surface"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-accent px-5 py-2.5 text-xs font-bold text-accent-ink disabled:opacity-60"
          >
            {submitting ? 'Saving Exam...' : 'Create Exam'}
          </button>
        </div>
      </form>
    </div>
  );
}

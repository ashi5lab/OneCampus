import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { DataTable } from '../../../components/DataTable';
import { Badge } from '../../../components/Badge';
import { useOnlineExams, useOnlineExam, useCreateOnlineExam, useUpdateOnlineExam, useDeleteOnlineExam } from '../hooks/useOnlineExams';
import { useMarkActivityContextViewed } from '../../activities/hooks/useActivities';
import { ExamFormModal } from './ExamFormModal';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

const STATUS_LABEL = { in_progress: 'In progress', submitted: 'Submitted', graded: 'Graded' };

// The Class channel's Exams tab — online exams only, filtered to this one
// cohort (offline/paper Evaluations aren't cohort-scoped the same way — a
// "Term 1 Exams" schedule spans the whole school, not one class — so that
// half of the full Exams page stays a More-only, school-wide view).
export function ClassExamsTab({ cohortId }) {
  const { can } = useAuth();
  const { t } = useConfig();
  const { data: exams, isLoading, error } = useOnlineExams();
  const createExam = useCreateOnlineExam();
  const updateExam = useUpdateOnlineExam();
  const deleteExam = useDeleteOnlineExam();
  const isManager = can('online_exams.manage');
  
  useMarkActivityContextViewed(`exams_${cohortId}`);

  const [showForm, setShowForm] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);

  const scoped = useMemo(() => (exams || []).filter((e) => e.cohort_id === cohortId), [exams, cohortId]);

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <Link to={`/app/online-exams/${row.id}`} className="font-semibold text-accent-dark hover:underline">
          {row.title}
        </Link>
      )
    },
    { key: 'module', header: t('topic'), render: (row) => row.module_name },
    { key: 'questions', header: 'Questions', render: (row) => row.question_count },
    {
      key: 'status',
      header: isManager ? 'Published' : 'Your Status',
      render: (row) =>
        isManager ? (
          <Badge variant={row.published ? 'active' : 'pending'}>{row.published ? 'Published' : 'Draft'}</Badge>
        ) : row.my_status ? (
          <Badge variant={row.my_status === 'in_progress' ? 'pending' : 'active'}>{STATUS_LABEL[row.my_status]}</Badge>
        ) : (
          <Badge variant="inactive">Not started</Badge>
        )
    }
  ];
  if (isManager) {
    columns.push({
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-3">
          <button onClick={() => setEditingExamId(row.id)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
            Edit
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${row.title}"?`)) deleteExam.mutate(row.id);
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
      {isManager && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="rounded-full bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink"
          >
            + Create Exam
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded border border-border bg-surface">
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}
        {!isLoading && !error && <DataTable columns={columns} rows={scoped} rowKey={(row) => row.id} emptyMessage="No exams yet." />}
      </div>

      {isManager && (
        <Link to="/app/exams" className="mt-3 inline-block text-xs font-semibold text-ink-500 hover:text-ink-900">
          Manage exams across all classes &rarr;
        </Link>
      )}

      {showForm && (
        <ExamFormModal
          initialData={{ cohort_id: cohortId }}
          onClose={() => setShowForm(false)}
          submitting={createExam.isPending}
          submitError={createExam.error?.message}
          onSubmit={(values) => createExam.mutate(values, { onSuccess: () => setShowForm(false) })}
        />
      )}

      {editingExamId && (
        <EditExamModal examId={editingExamId} onClose={() => setEditingExamId(null)} updateExam={updateExam} />
      )}
    </div>
  );
}

// Same as OnlineExamsPage's — editing needs the full detail fetch
// (including each question's text/options/correct answer) before the form
// can prefill, which the row itself doesn't carry.
function EditExamModal({ examId, onClose, updateExam }) {
  useBodyScrollLock();
  const { data: exam, isLoading } = useOnlineExam(examId);

  if (isLoading || !exam) {
    return (
      <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4">
        <div className="rounded border-2 border-accent bg-surface p-6 text-sm text-ink-500">Loading…</div>
      </div>
    );
  }

  return (
    <ExamFormModal
      initialData={exam}
      onClose={onClose}
      submitting={updateExam.isPending}
      submitError={updateExam.error?.message}
      onSubmit={(values) =>
        updateExam.mutate(
          { id: examId, payload: values },
          {
            onSuccess: (updated) => {
              if (updated.questionsLocked) {
                window.alert('Learners have already started this exam, so only the title/subject/class/duration were updated — the questions were left as-is.');
              }
              onClose();
            }
          }
        )
      }
    />
  );
}

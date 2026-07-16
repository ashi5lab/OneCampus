import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { Badge } from '../../../components/Badge';
import { useOnlineExam, usePublishOnlineExam } from '../hooks/useOnlineExams';
import { ExamSubmissionsRoster } from './ExamSubmissionsRoster';
import { ExamTaker } from './ExamTaker';

export function OnlineExamDetailPage() {
  const { id } = useParams();
  const examId = Number(id);
  const { can } = useAuth();
  const { t } = useConfig();
  const { data: exam, isLoading, error } = useOnlineExam(examId);
  const publishExam = usePublishOnlineExam();

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;
  if (!exam) return <div className="p-8 text-center text-sm text-ink-500">Exam not found.</div>;

  const isManager = can('online_exams.manage');
  const isGrader = can('online_exams.grade');

  return (
    <div>
      <div className="mb-6">
        <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-ink-500">
          <Link to="/app/exams" className="hover:underline">
            Exams
          </Link>{' '}
          / {exam.title}
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">{exam.title}</h1>
            <div className="mt-1 text-[13px] text-ink-500">
              {t('topic')}: {exam.module_name} &middot; {t('cohort')}: {exam.cohort_name} &middot; {exam.duration_minutes} min
              &middot; {exam.grading_type === 'auto' ? 'Automatic (MCQ)' : 'Manual valuation'} &middot; {exam.max_score} pts
            </div>
          </div>
          {isManager && (
            <div className="flex items-center gap-2">
              <Badge variant={exam.published ? 'active' : 'pending'}>{exam.published ? 'Published' : 'Draft'}</Badge>
              <button
                onClick={() => publishExam.mutate({ id: examId, published: !exam.published })}
                disabled={publishExam.isPending}
                className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-ink-700 disabled:opacity-60"
              >
                {exam.published ? 'Unpublish Results' : 'Publish Results'}
              </button>
            </div>
          )}
        </div>
        {exam.description && <p className="mt-2 text-[13.5px] text-ink-700">{exam.description}</p>}
      </div>

      {isGrader ? <ExamSubmissionsRoster exam={exam} /> : <ExamTaker exam={exam} />}
    </div>
  );
}

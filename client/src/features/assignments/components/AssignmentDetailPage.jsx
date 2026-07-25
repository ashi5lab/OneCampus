import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfig } from '../../../contexts/ConfigContext';
import { PageHeader } from '../../../components/PageHeader';
import { DataTable } from '../../../components/DataTable';
import { SearchSelect } from '../../../components/SearchSelect';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { Spinner } from '../../../components/Spinner';
import {
  useAssignment,
  useTogglePublish,
  useCompleteValuation,
  useValuationStudents,
  useUpsertGrade,
} from '../hooks/useAssignments';
import { assignmentsApi } from '../services/assignmentsApi';
import { AssignmentStatusBadge, PublishBadge } from './AssignmentStatusBadge';
import { SubmissionForm } from './SubmissionForm';
import { showToast } from '../../../lib/toast';

const GRADE_OPTIONS = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'].map(g => ({
  value: g,
  label: g,
}));

// ─── Valuation Row Input ──────────────────────────────────────────────────────
function EvalInput({ assignment, student, onChange }) {
  const [value, setValue] = useState(
    assignment.eval_type === 'marks'
      ? (student.score_obtained ?? '')
      : (student.grade_value ?? '')
  );
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (v) => {
    if (v === '' || v === null || v === undefined) return;
    setSaving(true);
    try {
      await onChange(v);
    } finally {
      setSaving(false);
    }
  }, [onChange]);

  if (assignment.eval_type === 'marks') {
    return (
      <input
        type="number"
        min={0}
        max={assignment.max_score}
        className="input w-24 text-sm"
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => save(value)}
        disabled={saving}
        placeholder="—"
      />
    );
  }
  return (
    <SearchSelect
      options={GRADE_OPTIONS}
      value={value}
      onChange={v => { setValue(v); save(v); }}
      placeholder="—"
    />
  );
}

// ─── Valuation Table ──────────────────────────────────────────────────────────
function ValuationTab({ assignment, selectedCohortId }) {
  const { can } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params = {
    cohort_id: selectedCohortId || undefined,
    search: search || undefined,
    page,
    page_size: pageSize,
  };

  const { data, isLoading } = useValuationStudents(assignment.id, params);
  const upsertGrade = useUpsertGrade(assignment.id);

  const students = data?.students ?? [];
  const total = data?.total ?? 0;

  function handleGrade(student, val) {
    return new Promise((resolve, reject) => {
      const payload = {
        learner_id: student.learner_id,
        ...(assignment.eval_type === 'marks'
          ? { score_obtained: Number(val) }
          : { grade_value: val }),
      };
      upsertGrade.mutate(payload, {
        onSuccess: resolve,
        onError: (e) => { showToast.error(e.message); reject(e); },
      });
    });
  }

  const columns = [
    {
      key: 'roll',
      header: '#',
      render: (row) => <span className="text-xs text-ink-500">{row.roll_no}</span>,
    },
    {
      key: 'name',
      header: 'Student',
      render: (row) => (
        <div>
          <div className="font-semibold text-ink-900">{row.name}</div>
          <div className="text-xs text-ink-500">
            {row.registry_no ?? row.learner_user_id}
          </div>
        </div>
      ),
    },
    {
      key: 'grade',
      header: assignment.eval_type === 'marks' ? `Marks (/${assignment.max_score})` : 'Grade',
      render: (row) =>
        can('assignments.grade') ? (
          <EvalInput
            key={row.learner_id}
            assignment={assignment}
            student={row}
            onChange={(v) => handleGrade(row, v)}
          />
        ) : (
          <span className="text-sm">
            {assignment.eval_type === 'marks'
              ? (row.score_obtained ?? '—')
              : (row.grade_value ?? '—')}
          </span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
            row.submission_status === 'graded'
              ? 'bg-green-100 text-green-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {row.submission_status === 'graded' ? 'Graded' : 'Pending'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-3">
        <input
          type="search"
          placeholder="Search by name or reg no…"
          className="input w-full max-w-xs"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      <DataTable
        columns={columns}
        rows={students}
        rowKey={r => r.learner_id}
        emptyMessage="No students found."
        isLoading={isLoading}
        serverPagination={{ page, pageSize, total, onPageChange: setPage }}
      />
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab({ assignment }) {
  const { t } = useConfig();
  return (
    <div className="space-y-4">
      {assignment.description && (
        <div>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Description</h3>
          <p className="text-sm text-ink-700">{assignment.description}</p>
        </div>
      )}
      {assignment.instructions && (
        <div>
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-500">Instructions</h3>
          <p className="whitespace-pre-wrap text-sm text-ink-700">{assignment.instructions}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <InfoCell label="Subject" value={assignment.module_name ?? '—'} />
        <InfoCell label={t('cohort')} value={assignment.class_names ?? '—'} />
        <InfoCell label="Due Date" value={assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'} />
        <InfoCell label="Eval Type" value={assignment.eval_type === 'marks' ? 'Marks' : 'Grades'} />
        {assignment.eval_type === 'marks' && (
          <>
            <InfoCell label="Max Marks" value={assignment.max_score ?? '—'} />
            <InfoCell label="Passing Marks" value={assignment.passing_marks ?? '—'} />
          </>
        )}
        {assignment.eval_type === 'grades' && (
          <InfoCell label="Pass Grade" value={assignment.pass_grade ?? '—'} />
        )}
        <InfoCell label="Created By" value={assignment.created_by_name ?? '—'} />
        <InfoCell
          label="Students Graded"
          value={`${assignment.total_graded ?? 0} / ${assignment.total_students ?? 0}`}
        />
      </div>
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────
const ACTION_LABELS = {
  'assignment.created':             'Assignment created',
  'assignment.updated':             'Assignment updated',
  'assignment.deleted':             'Assignment deleted',
  'assignment.duplicated':          'Assignment duplicated',
  'assignment.graded':              'Student graded',
  'assignment.submitted':           'Submission received',
  'assignment.publish_toggled':     'Publish status changed',
  'assignment.valuation_completed': 'Valuation completed',
};

function ActivityTab({ assignmentId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['assignments', assignmentId, 'activity'],
    queryFn: () => assignmentsApi.getActivity ? assignmentsApi.getActivity(assignmentId) : Promise.resolve({ activity: [] }),
    enabled: !!assignmentId,
  });

  const activity = data?.activity ?? [];

  if (isLoading) {
    return <div className="flex justify-center p-8"><Spinner /></div>;
  }
  if (activity.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-500">No activity recorded yet.</p>;
  }

  return (
    <ol className="relative border-l border-border pl-5">
      {activity.map(entry => {
        const name = entry.first_name
          ? `${entry.first_name} ${entry.last_name ?? ''}`.trim()
          : (entry.username ?? 'System');
        const label = ACTION_LABELS[entry.action] ?? entry.action;
        const time = new Date(entry.created_at).toLocaleString();
        return (
          <li key={entry.id} className="mb-5">
            <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-border bg-accent" />
            <p className="text-sm font-semibold text-ink-900">{label}</p>
            <p className="text-xs text-ink-500">
              {name} &middot; {time}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function AssignmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();

  const { data: assignment, isLoading, error } = useAssignment(id);
  const togglePublish = useTogglePublish();
  const completeValuation = useCompleteValuation();

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { message, onConfirm, label, danger }

  if (isLoading) return <div className="p-8 text-center text-sm text-ink-500">Loading…</div>;
  if (error) return <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>;
  if (!assignment) return <div className="p-8 text-center text-sm text-ink-500">Assignment not found.</div>;

  const cohortOptions = (assignment.cohort_ids ?? []).map((cid, i) => ({
    value: String(cid),
    label: (assignment.class_names ?? '').split(', ')[i] ?? `Class ${cid}`,
  }));

  const isGrader = can('assignments.grade');
  const isManager = can('assignments.manage');

  function handlePublishToggle() {
    const next = !assignment.publish_marks;
    setConfirmAction({
      message: next ? 'Publish marks? Students will be able to see their results.' : 'Unpublish marks? Students will no longer see their results.',
      label: next ? 'Publish' : 'Unpublish',
      danger: false,
      onConfirm: () => {
        setConfirmAction(null);
        togglePublish.mutate(
          { id: assignment.id, publish: next },
          {
            onSuccess: () => showToast.success(next ? 'Marks published.' : 'Marks unpublished.'),
            onError: e => showToast.error(e.message),
          }
        );
      },
    });
  }

  function handleCompleteValuation() {
    setConfirmAction({
      message: 'Mark valuation complete? Marks will be published to students.',
      label: 'Complete',
      danger: false,
      onConfirm: () => {
        setConfirmAction(null);
        completeValuation.mutate(assignment.id, {
          onSuccess: () => showToast.success('Valuation completed and marks published!'),
          onError: e => showToast.error(e.message),
        });
      },
    });
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(isGrader ? [{ key: 'students', label: 'Students' }] : []),
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div>
      <PageHeader
        back
        onBack={() => navigate('/app/assignments')}
        eyebrow={
          <Link to="/app/assignments" className="hover:underline">
            Assignments
          </Link>
        }
        title={assignment.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AssignmentStatusBadge status={assignment.status} />
            <PublishBadge published={assignment.publish_marks} />
            {isManager && (
              <button
                onClick={() => navigate(`/app/assignments/${assignment.id}/edit`)}
                className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-surface-muted"
              >
                Edit
              </button>
            )}
            {isGrader && assignment.status !== 'completed' && (
              <button
                onClick={handleCompleteValuation}
                disabled={completeValuation.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {completeValuation.isPending && <Spinner size="xs" />}
                Complete Valuation
              </button>
            )}
            {isManager && (
              <button
                onClick={handlePublishToggle}
                disabled={togglePublish.isPending}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                  assignment.publish_marks
                    ? 'border border-border bg-surface text-ink-700 hover:bg-surface-muted'
                    : 'bg-accent text-accent-ink hover:opacity-90'
                }`}
              >
                {togglePublish.isPending && <Spinner size="xs" />}
                {assignment.publish_marks ? 'Unpublish' : 'Publish Marks'}
              </button>
            )}
          </div>
        }
      />

      {/* Class selector for multi-class grading */}
      {isGrader && cohortOptions.length > 1 && activeTab === 'students' && (
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-700">Viewing class:</span>
          <div className="w-52">
            <SearchSelect
              options={[{ value: '', label: 'All Classes' }, ...cohortOptions]}
              value={selectedCohortId}
              onChange={setSelectedCohortId}
              placeholder="Select class…"
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 border-b border-border">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-accent text-accent-dark'
                  : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="rounded border border-border bg-surface p-5">
        {activeTab === 'overview' && <OverviewTab assignment={assignment} />}
        {activeTab === 'students' && isGrader && (
          <ValuationTab assignment={assignment} selectedCohortId={selectedCohortId} />
        )}
        {activeTab === 'activity' && <ActivityTab assignmentId={assignment.id} />}
      </div>

      {/* Learner self-view */}
      {!isGrader && (
        <div className="mt-6">
          <SubmissionForm assignment={assignment} />
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          confirmLabel={confirmAction.label}
          danger={confirmAction.danger}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

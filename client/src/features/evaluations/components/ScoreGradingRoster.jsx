import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useConfig } from '../../../contexts/ConfigContext';
import { PageHeader } from '../../../components/PageHeader';
import { useLearners } from '../../learners/hooks/useLearners';
import { useScores, useRecordScore } from '../hooks/useEvaluations';
import { SearchSelect } from '../../../components/SearchSelect';
import { Pagination } from '../../../components/Pagination';

// Only ever mounted for roles with evaluations.grade (see ScoreEntryPage's
// dispatcher) — safe to fetch the full learner roster here.
//
// All learners tenant-wide are shown, not just those in a particular
// cohort — evaluation schedules link to a module, not a cohort, and there's
// no cohort<->module enrollment relationship in the schema yet to filter by.
export function ScoreGradingRoster() {
  const { scheduleId } = useParams();
  const { t } = useConfig();
  const { data: learners } = useLearners();
  const { data: existingScores, isLoading } = useScores(scheduleId);
  const recordScore = useRecordScore(scheduleId);

  const [values, setValues] = useState({});
  const [saveError, setSaveError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const scoreByLearner = useMemo(() => {
    const map = {};
    for (const score of existingScores || []) map[score.learner_id] = score;
    return map;
  }, [existingScores]);

  useEffect(() => {
    const next = {};
    for (const learner of learners || []) {
      next[learner.id] = scoreByLearner[learner.id]?.score_obtained ?? '';
    }
    setValues(next);
  }, [learners, scoreByLearner]);

  const filteredLearners = useMemo(() => {
    if (!learners) return [];
    if (!searchTerm) return learners;
    const lower = searchTerm.toLowerCase();
    return learners.filter((l) => 
      l.first_name.toLowerCase().includes(lower) || 
      l.last_name.toLowerCase().includes(lower) || 
      l.registry_no.toLowerCase().includes(lower)
    );
  }, [learners, searchTerm]);

  const paginatedLearners = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLearners.slice(start, start + itemsPerPage);
  }, [filteredLearners, currentPage]);

  async function handleSaveAll() {
    setSaveError(null);
    const toSave = (learners || []).filter((l) => values[l.id] !== '' && values[l.id] !== undefined);
    try {
      await Promise.all(
        toSave.map((learner) =>
          recordScore.mutateAsync({
            learner_id: learner.id,
            score_obtained: Number(values[learner.id])
          })
        )
      );
      setSavedAt(new Date());
    } catch (err) {
      setSaveError(err.message || 'Failed to save scores');
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <Link to="/app/exams" className="hover:underline">Exams</Link> / Scores
          </>
        }
        title="Record Scores"
        actions={
          <button
            onClick={handleSaveAll}
            disabled={recordScore.isPending || !learners?.length}
            className="rounded bg-accent px-4 py-2.5 text-[13.5px] font-semibold text-accent-ink disabled:opacity-60"
          >
            {recordScore.isPending ? 'Saving…' : 'Save All'}
          </button>
        }
      />
      {savedAt && <div className="mb-3 text-xs font-semibold text-success">Saved</div>}
      {saveError && <div className="mb-3 text-xs font-semibold text-danger">{saveError}</div>}

      <div className="overflow-hidden rounded border border-border bg-surface">
        <div className="border-b border-border p-4">
          <input
            type="text"
            className="input w-full max-w-sm"
            placeholder={`Search ${t('learners').toLowerCase()} by name or ID...`}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {!isLoading && filteredLearners.length === 0 && (
          <div className="p-8 text-center text-sm text-ink-500">No {t('learners').toLowerCase()} found.</div>
        )}
        {!isLoading && filteredLearners.length > 0 && (
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-surface-muted bg-surface-muted px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500">
                  {t('learner')}
                </th>
                <th className="border-b border-surface-muted bg-surface-muted px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLearners.map((learner) => (
                <tr key={learner.id}>
                  <td className="border-b border-surface-muted px-5 py-2.5 text-[13.5px] last:border-b-0">
                    <div className="font-semibold text-ink-900">{learner.first_name} {learner.last_name}</div>
                    <div className="font-mono text-[11.5px] text-ink-500">{learner.registry_no}</div>
                  </td>
                  <td className="border-b border-surface-muted px-5 py-2.5 last:border-b-0">
                    <input
                      type="number"
                      step="0.01"
                      className="input w-24"
                      value={values[learner.id] ?? ''}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [learner.id]: e.target.value }))
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && filteredLearners.length > 0 && (
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredLearners.length / itemsPerPage)}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

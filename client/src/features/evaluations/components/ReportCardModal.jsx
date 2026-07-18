import { useReportCard } from '../hooks/useEvaluations';
import { evaluationsApi } from '../services/evaluationsApi';

const RESULT_META = {
  pass: { label: 'Pass', className: 'text-success' },
  fail: { label: 'Fail', className: 'text-danger' },
  incomplete: { label: 'Incomplete', className: 'text-ink-500' }
};

export function ReportCardModal({ evaluationId, learnerId, onClose }) {
  const { data: card, isLoading, error } = useReportCard(evaluationId, learnerId);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
      <div className="my-auto w-full max-w-[560px] rounded border border-border bg-surface p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-base font-bold text-ink-900">Report Card</div>
            {card && (
              <div className="mt-1 text-[12.5px] text-ink-500">
                {card.evaluation.name} — {card.evaluation.time_block}
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded border border-border px-3 py-1.5 text-xs font-semibold text-ink-700">
            Close
          </button>
        </div>

        {isLoading && <div className="p-8 text-center text-sm text-ink-500">Loading…</div>}
        {error && <div className="p-8 text-center text-sm font-semibold text-danger">{error.message}</div>}

        {card && (
          <>
            <div className="mb-4 text-[13px] text-ink-700">
              <span className="font-semibold">{card.learner.first_name} {card.learner.last_name}</span>
              {' — '}
              <span className="font-mono">{card.learner.registry_no}</span>
              {card.learner.cohort_name && <span> · {card.learner.cohort_name}</span>}
            </div>

            <div className="mb-4 overflow-hidden rounded border border-border">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-surface-muted">
                    <th className="px-3 py-2 text-left font-bold uppercase tracking-wide text-ink-500">Subject</th>
                    <th className="px-3 py-2 text-right font-bold uppercase tracking-wide text-ink-500">Score</th>
                    <th className="px-3 py-2 text-right font-bold uppercase tracking-wide text-ink-500">%</th>
                    <th className="px-3 py-2 text-right font-bold uppercase tracking-wide text-ink-500">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {card.subjects.map((subj) => (
                    <tr key={subj.module_id} className="border-t border-surface-muted">
                      <td className="px-3 py-2 text-ink-900">{subj.module_name}</td>
                      <td className="px-3 py-2 text-right text-ink-900">
                        {subj.score_obtained === null ? '—' : `${subj.score_obtained} / ${subj.max_score}`}
                      </td>
                      <td className="px-3 py-2 text-right text-ink-900">{subj.percentage === null ? '—' : `${subj.percentage}%`}</td>
                      <td className="px-3 py-2 text-right font-semibold text-ink-900">{subj.grade || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 text-[12.5px] sm:grid-cols-4">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-500">Total</div>
                <div className="font-semibold text-ink-900">{card.summary.total_obtained} / {card.summary.total_max}</div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-500">Overall</div>
                <div className="font-semibold text-ink-900">
                  {card.summary.overall_percentage !== null ? `${card.summary.overall_percentage}% (${card.summary.overall_grade})` : '—'}
                </div>
              </div>
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-500">Result</div>
                <div className={`font-semibold ${RESULT_META[card.summary.result].className}`}>{RESULT_META[card.summary.result].label}</div>
              </div>
              {card.rank && (
                <div>
                  <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-500">Class Rank</div>
                  <div className="font-semibold text-ink-900">{card.rank.rank} of {card.rank.pool_size}</div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                evaluationsApi.downloadReportCardPdf(
                  evaluationId,
                  learnerId,
                  `report-card-${card.learner.registry_no}-${card.evaluation.id}.pdf`
                )
              }
              className="rounded bg-accent px-4 py-2 text-xs font-semibold text-accent-ink"
            >
              Download PDF
            </button>
          </>
        )}
      </div>
    </div>
  );
}

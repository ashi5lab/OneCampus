// Aggregates onec_evaluation_schedules + onec_learner_scores into a single
// report card for one learner within one evaluation (e.g. "Term 1 Exams")
// — shared by evaluations/controller.js's JSON and PDF endpoints so the two
// representations can never compute different numbers for the same data.

// Fixed default scale (percentage of max_score → letter grade), not yet
// tenant-configurable — a reasonable v1 default. Making this a per-tenant
// setting is a small, self-contained follow-up if a school needs a
// different scale, not a reason to hold this up.
const GRADE_BANDS = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A' },
  { min: 70, grade: 'B+' },
  { min: 60, grade: 'B' },
  { min: 50, grade: 'C' },
  { min: 40, grade: 'D' },
  { min: -Infinity, grade: 'F' }
];

function gradeForPercentage(pct) {
  return GRADE_BANDS.find((band) => pct >= band.min).grade;
}

// Builds the full report card, or null if the evaluation/learner doesn't
// exist. `req.db` must already be tenant-scoped (see middleware/tenantDb.js).
async function buildReportCard(req, evaluationId, learnerId) {
  const evalResult = await req.db.query('SELECT * FROM onec_evaluations WHERE id = $1', [evaluationId]);
  if (evalResult.rows.length === 0) return null;
  const evaluation = evalResult.rows[0];

  const learnerResult = await req.db.query(
    `SELECT l.id, l.first_name, l.last_name, l.registry_no, l.cohort_id, c.name AS cohort_name
     FROM onec_learners l LEFT JOIN onec_cohorts c ON l.cohort_id = c.id
     WHERE l.id = $1`,
    [learnerId]
  );
  if (learnerResult.rows.length === 0) return null;
  const learner = learnerResult.rows[0];

  const schedulesResult = await req.db.query(
    `SELECT es.id, es.module_id, m.name AS module_name, es.eval_date, es.max_score, es.passing_score
     FROM onec_evaluation_schedules es
     JOIN onec_modules m ON es.module_id = m.id
     WHERE es.evaluation_id = $1
     ORDER BY m.name ASC`,
    [evaluationId]
  );
  const schedules = schedulesResult.rows;
  const scheduleIds = schedules.map((s) => s.id);

  const scoresResult = scheduleIds.length
    ? await req.db.query(
        `SELECT eval_schedule_id, score_obtained, remarks FROM onec_learner_scores
         WHERE learner_id = $1 AND eval_schedule_id = ANY($2::int[])`,
        [learnerId, scheduleIds]
      )
    : { rows: [] };
  const scoreBySchedule = new Map(scoresResult.rows.map((s) => [s.eval_schedule_id, s]));

  let totalObtained = 0;
  let totalMax = 0;
  let subjectsGraded = 0;
  let allPassed = true;

  const subjects = schedules.map((sch) => {
    const score = scoreBySchedule.get(sch.id);
    const maxScore = Number(sch.max_score);
    const passingScore = Number(sch.passing_score);
    if (!score) {
      allPassed = false;
      return {
        module_id: sch.module_id,
        module_name: sch.module_name,
        eval_date: sch.eval_date,
        max_score: maxScore,
        passing_score: passingScore,
        score_obtained: null,
        remarks: null,
        percentage: null,
        grade: null,
        passed: null
      };
    }
    const scoreObtained = Number(score.score_obtained);
    const percentage = maxScore > 0 ? (scoreObtained / maxScore) * 100 : 0;
    const passed = scoreObtained >= passingScore;
    totalObtained += scoreObtained;
    totalMax += maxScore;
    subjectsGraded += 1;
    if (!passed) allPassed = false;

    return {
      module_id: sch.module_id,
      module_name: sch.module_name,
      eval_date: sch.eval_date,
      max_score: maxScore,
      passing_score: passingScore,
      score_obtained: scoreObtained,
      remarks: score.remarks,
      percentage: Math.round(percentage * 100) / 100,
      grade: gradeForPercentage(percentage),
      passed
    };
  });

  const overallPercentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
  // 'incomplete' beats 'pass'/'fail' — a report card isn't final until
  // every scheduled subject has a score recorded, and calling a
  // half-graded card a "Fail" would be actively misleading.
  const result = subjectsGraded === 0 ? 'incomplete' : subjectsGraded < schedules.length ? 'incomplete' : allPassed ? 'pass' : 'fail';

  const summary = {
    subjects_total: schedules.length,
    subjects_graded: subjectsGraded,
    total_obtained: totalObtained,
    total_max: totalMax,
    overall_percentage: totalMax > 0 ? Math.round(overallPercentage * 100) / 100 : null,
    overall_grade: subjectsGraded > 0 ? gradeForPercentage(overallPercentage) : null,
    result
  };

  // Rank among cohort-mates who have at least one score recorded for this
  // same evaluation — see server/modules/evaluations/README.md for why a
  // missing schedule score counts as 0 toward a peer's total (an honest v1
  // simplification: accurate once grading is finalized, not meant to be
  // read mid-term).
  let rank = null;
  if (learner.cohort_id && scheduleIds.length > 0) {
    const rankResult = await req.db.query(
      `SELECT rank, pool_size FROM (
         SELECT l.id AS learner_id,
                RANK() OVER (ORDER BY COALESCE(totals.total_obtained, 0) DESC) AS rank,
                COUNT(*) OVER () AS pool_size
         FROM onec_learners l
         LEFT JOIN LATERAL (
           SELECT SUM(ls.score_obtained) AS total_obtained
           FROM onec_learner_scores ls
           WHERE ls.learner_id = l.id AND ls.eval_schedule_id = ANY($1::int[])
         ) totals ON true
         WHERE l.cohort_id = $2
           AND EXISTS (
             SELECT 1 FROM onec_learner_scores ls2
             WHERE ls2.learner_id = l.id AND ls2.eval_schedule_id = ANY($1::int[])
           )
       ) ranked
       WHERE learner_id = $3`,
      [scheduleIds, learner.cohort_id, learnerId]
    );
    if (rankResult.rows.length > 0) {
      rank = { rank: rankResult.rows[0].rank, pool_size: rankResult.rows[0].pool_size };
    }
  }

  return {
    evaluation: { id: evaluation.id, name: evaluation.name, type: evaluation.type, time_block: evaluation.time_block },
    learner: {
      id: learner.id,
      first_name: learner.first_name,
      last_name: learner.last_name,
      registry_no: learner.registry_no,
      cohort_name: learner.cohort_name
    },
    subjects,
    summary,
    rank
  };
}

module.exports = { buildReportCard, gradeForPercentage };

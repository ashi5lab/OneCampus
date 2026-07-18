const { hasPermission } = require('../../lib/permissions');
const { getScopedLearnerIds } = require('../../lib/rowScope');
const { renderIdCardPdf } = require('../../lib/idCard');

// GET /id-cards/learner/:id/pdf — same self-or-permission shape as
// certificates.getPdf: a learner gets their own, a guardian their linked
// child's (via getScopedLearnerIds), anyone with id_cards.generate gets
// anyone's. A 404 (not 403) for someone else's id, same reasoning as
// certificates — the id alone shouldn't confirm whose it is.
async function learnerCard(req, res) {
  try {
    const { id } = req.params;
    const learnerId = Number(id);

    const canGenerateAny = await hasPermission(req, 'id_cards.generate');
    if (!canGenerateAny) {
      const scopedLearnerIds = await getScopedLearnerIds(req);
      if (scopedLearnerIds === null || !scopedLearnerIds.includes(learnerId)) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    const result = await req.db.query(
      `SELECT l.first_name, l.last_name, l.registry_no, c.name AS cohort_name, u.profile_picture_url
       FROM onec_learners l
       LEFT JOIN onec_cohorts c ON l.cohort_id = c.id
       LEFT JOIN onec_users u ON l.user_id = u.id
       WHERE l.id = $1`,
      [learnerId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const learner = result.rows[0];

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="id-card-${learner.registry_no}.pdf"`);
    await renderIdCardPdf(res, {
      orgName: req.tenantConfig.org_name || 'OneCampus',
      name: `${learner.first_name} ${learner.last_name}`,
      subtitle: learner.cohort_name || 'Student',
      idLabel: 'Reg. No',
      idNumber: learner.registry_no,
      photoUrl: learner.profile_picture_url
    });
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
}

function staffLikeCard(table, roleLabel) {
  return async function (req, res) {
    try {
      const { id } = req.params;

      const canGenerateAny = await hasPermission(req, 'id_cards.generate');
      const result = await req.db.query(
        `SELECT p.first_name, p.last_name, p.staff_id, p.user_id, u.profile_picture_url
         FROM ${table} p
         LEFT JOIN onec_users u ON p.user_id = u.id
         WHERE p.id = $1`,
        [id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const person = result.rows[0];

      const isSelf = person.user_id && person.user_id === req.user.userId;
      if (!canGenerateAny && !isSelf) return res.status(404).json({ error: 'Not found' });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="id-card-${person.staff_id}.pdf"`);
      await renderIdCardPdf(res, {
        orgName: req.tenantConfig.org_name || 'OneCampus',
        name: `${person.first_name} ${person.last_name}`,
        subtitle: roleLabel,
        idLabel: 'Staff ID',
        idNumber: person.staff_id,
        photoUrl: person.profile_picture_url
      });
    } catch (err) {
      console.error(err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    }
  };
}

module.exports = {
  learnerCard,
  instructorCard: staffLikeCard('onec_instructors', 'Instructor'),
  staffCard: staffLikeCard('onec_staff', 'Staff')
};

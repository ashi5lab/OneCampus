const { z } = require('zod');
const PDFDocument = require('pdfkit');
const { logAudit } = require('../../lib/audit');
const { getScopedLearnerIds } = require('../../lib/rowScope');

const CERTIFICATE_TYPE_LABELS = {
  transfer_certificate: 'Transfer Certificate',
  conduct: 'Conduct Certificate',
  degree: 'Degree Certificate'
};

const issueSchema = z.object({
  learner_id: z.number().int(),
  type: z.enum(['transfer_certificate', 'conduct', 'degree']),
  certificate_no: z.string().min(1, "Certificate number is required"),
  issue_date: z.string().min(1, "Issue date is required"),
  data: z.record(z.any()).optional().default({})
});

// Certificates are immutable official records once issued — intentionally
// no update/delete endpoints. If a certificate was issued in error, the
// correct fix is issuing a new one, not silently editing history.

async function getAll(req, res) {
  try {
    // Row-level self-scoping for learner/guardian roles (see lib/rowScope.js)
    // — forces the filter regardless of the ?learner_id= query param, so a
    // learner or guardian can't request someone else's certificates by id.
    const scopedLearnerIds = await getScopedLearnerIds(req);

    let query = 'SELECT * FROM onec_certificates';
    const params = [];
    if (scopedLearnerIds !== null) {
      params.push(scopedLearnerIds);
      query += ` WHERE learner_id = ANY($${params.length})`;
    } else if (req.query.learner_id) {
      params.push(req.query.learner_id);
      query += ` WHERE learner_id = $${params.length}`;
    }
    query += ' ORDER BY issue_date DESC, id DESC';

    const result = await req.db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT * FROM onec_certificates WHERE id = $1', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    // A learner/guardian fetching a certificate by id that isn't theirs gets
    // the same 404 as a nonexistent one — a plain 403 would confirm the id
    // belongs to *someone*, leaking more than necessary.
    const scopedLearnerIds = await getScopedLearnerIds(req);
    if (scopedLearnerIds !== null && !scopedLearnerIds.includes(result.rows[0].learner_id)) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Renders the certificate row (plus its learner and the tenant's org name)
// as a downloadable PDF. Same row-level scoping as getById (404, not 403,
// for a certificate that isn't the caller's) — this is a read of the same
// record, just a different representation.
async function getPdf(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT * FROM onec_certificates WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const cert = result.rows[0];

    const scopedLearnerIds = await getScopedLearnerIds(req);
    if (scopedLearnerIds !== null && !scopedLearnerIds.includes(cert.learner_id)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const learnerResult = await req.db.query(
      'SELECT first_name, last_name, registry_no FROM onec_learners WHERE id = $1',
      [cert.learner_id]
    );
    const learner = learnerResult.rows[0];
    const orgName = req.tenantConfig.org_name || 'OneCampus';
    const typeLabel = CERTIFICATE_TYPE_LABELS[cert.type] || cert.type;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${cert.certificate_no}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 72 });
    doc.pipe(res);

    doc.fontSize(20).text(orgName, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).text(typeLabel, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12);
    doc.text(`Certificate No: ${cert.certificate_no}`);
    doc.text(`Issue Date: ${new Date(cert.issue_date).toLocaleDateString()}`);
    doc.moveDown();

    const learnerName = learner ? `${learner.first_name} ${learner.last_name}` : `Learner #${cert.learner_id}`;
    const registrySuffix = learner?.registry_no ? ` (Registry No: ${learner.registry_no})` : '';
    doc.text(`This is to certify that ${learnerName}${registrySuffix} is associated with ${orgName}.`);

    if (cert.data && Object.keys(cert.data).length > 0) {
      doc.moveDown();
      doc.fontSize(11).text('Additional Details:', { underline: true });
      for (const [key, value] of Object.entries(cert.data)) {
        doc.fontSize(11).text(`${key}: ${value}`);
      }
    }

    doc.moveDown(3);
    doc.fontSize(12).text('_______________________', { align: 'right' });
    doc.text('Authorized Signatory', { align: 'right' });

    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
}

async function issue(req, res) {
  try {
    const parsed = issueSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { learner_id, type, certificate_no, issue_date, data } = parsed.data;
    const issued_by = req.user.userId;

    const result = await req.db.query(
      `INSERT INTO onec_certificates (learner_id, type, certificate_no, issue_date, issued_by, data)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [learner_id, type, certificate_no, issue_date, issued_by, data]
    );

    logAudit(req, 'certificate.issued', {
      certificate_id: result.rows[0].id, learner_id, type, certificate_no
    });

    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Certificate number must be unique' });
    if (err.code === '23503') return res.status(400).json({ error: 'Learner does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { getAll, getById, getPdf, issue };

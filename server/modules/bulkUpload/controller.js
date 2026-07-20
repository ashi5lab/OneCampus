const multer = require('multer');
const { parsePagination } = require('../../lib/pagination');
const { ENTITY_FIELDS } = require('../../lib/bulkUploadFields');
const { templateAsXlsxBuffer, templateAsCsvBuffer, failuresAsXlsxBuffer, credentialsAsXlsxBuffer } = require('../../lib/bulkUploadTemplates');
const { MAX_DATA_ROWS, parseUploadedFile, buildHeaderKeyMap, getMissingRequiredHeaders, processJob } = require('../../lib/bulkUploadProcessor');
const { logAudit } = require('../../lib/audit');

const ENTITY_TYPES = ['learner', 'instructor', 'staff'];
const EXT_RE = /\.(xlsx|xls|csv)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB is generous for a few thousand text rows
  fileFilter: (req, file, cb) => {
    if (!EXT_RE.test(file.originalname || '')) return cb(new Error('Only .xlsx, .xls, or .csv files are allowed'));
    cb(null, true);
  }
});

function requireValidEntityType(req, res, next) {
  if (!ENTITY_TYPES.includes(req.params.entityType)) {
    return res.status(400).json({ error: `Unknown entity type — must be one of: ${ENTITY_TYPES.join(', ')}` });
  }
  next();
}

// GET /bulk-upload/template/:entityType?format=xlsx|csv (default xlsx)
function downloadTemplate(req, res) {
  const { entityType } = req.params;
  const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
  const fields = ENTITY_FIELDS[entityType];

  if (format === 'csv') {
    const buffer = templateAsCsvBuffer(entityType);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${fields.sampleFileName}_template.csv"`);
    return res.send(buffer);
  }

  const buffer = templateAsXlsxBuffer(entityType);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fields.sampleFileName}_template.xlsx"`);
  res.send(buffer);
}

// POST /bulk-upload/:entityType/upload (multipart, field "file")
// Parses and validates the file's shape synchronously (fast — it's just
// reading bytes already in memory), creates the job row, and responds
// immediately with 202 + the job id. The actual per-row DB work — the slow
// part, one INSERT-or-more per row — runs afterward via processJob(),
// intentionally not awaited: the admin doesn't wait on a few hundred rows
// of sequential inserts, they poll GET /bulk-upload/jobs/:id (or watch the
// jobs list) instead. See processJob's own comment for why that background
// work uses its own DB connection instead of req.db.
async function uploadFile(req, res) {
  try {
    const { entityType } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file provided (field name: "file")' });

    let parsed;
    try {
      parsed = parseUploadedFile(req.file.buffer);
    } catch (err) {
      return res.status(400).json({ error: `Could not read this file — is it a valid .xlsx/.xls/.csv? (${err.message})` });
    }

    if (parsed.headers.length === 0) {
      return res.status(400).json({ error: 'The file appears to be empty' });
    }

    const headerKeyMap = buildHeaderKeyMap(entityType, parsed.headers);
    const missingRequired = getMissingRequiredHeaders(entityType, headerKeyMap);
    if (missingRequired.length > 0) {
      return res.status(400).json({
        error: `The file is missing required column(s): ${missingRequired.join(', ')}. Download the template to see the expected columns.`
      });
    }

    if (parsed.rows.length === 0) {
      return res.status(400).json({ error: 'No data rows found below the header row' });
    }
    if (parsed.rows.length > MAX_DATA_ROWS) {
      return res.status(400).json({ error: `This file has ${parsed.rows.length} rows — bulk upload is capped at ${MAX_DATA_ROWS} rows per file. Split it into smaller files.` });
    }

    const jobResult = await req.db.query(
      `INSERT INTO onec_bulk_upload_jobs (entity_type, original_filename, status, total_rows, created_by)
       VALUES ($1, $2, 'processing', $3, $4) RETURNING *`,
      [entityType, req.file.originalname, parsed.rows.length, req.user.userId]
    );
    const job = jobResult.rows[0];

    logAudit(req, 'bulk_upload.started', { job_id: job.id, entity_type: entityType, total_rows: parsed.rows.length });

    // Captured into plain variables before the response ends and req/req.db
    // become unsafe to rely on for anything slow — see processJob's comment.
    const schemaName = req.tenantSchema;
    const tenant = { prefix: req.tenantConfig.prefix, domain: req.tenantConfig.domain };
    processJob({ jobId: job.id, entityType, schemaName, headerKeyMap, rawRows: parsed.rows, tenant }).catch((err) => {
      console.error('Unhandled error kicking off bulk upload job:', err);
    });

    res.status(202).json({ data: job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /bulk-upload/jobs?entity_type=
async function listJobs(req, res) {
  try {
    const { pagination, error } = parsePagination(req.query);
    if (error) return res.status(400).json({ error: 'Invalid pagination parameters', details: error });

    const { entity_type } = req.query;
    const conditions = [];
    const params = [];
    if (entity_type) {
      params.push(entity_type);
      conditions.push(`j.entity_type = $${params.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const baseQuery = `FROM onec_bulk_upload_jobs j LEFT JOIN onec_users u ON j.created_by = u.id ${whereClause}`;

    if (!pagination) {
      const result = await req.db.query(
        `SELECT j.id, j.entity_type, j.original_filename, j.status, j.total_rows, j.success_count, j.failure_count, j.created_at, j.completed_at, u.username AS created_by_username
         ${baseQuery} ORDER BY j.id DESC`,
        params
      );
      return res.json({ data: result.rows });
    }

    const pageParams = [...params, pagination.limit, pagination.offset];
    const [rows, count] = await Promise.all([
      req.db.query(
        `SELECT j.id, j.entity_type, j.original_filename, j.status, j.total_rows, j.success_count, j.failure_count, j.created_at, j.completed_at, u.username AS created_by_username
         ${baseQuery} ORDER BY j.id DESC LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
        pageParams
      ),
      req.db.query(`SELECT COUNT(*)::int AS total ${baseQuery}`, params)
    ]);
    res.json({ data: rows.rows, meta: { total: count.rows[0].total, page: pagination.page, pageSize: pagination.pageSize } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /bulk-upload/jobs/:id — polled by the frontend while status is
// 'processing'; includes the full `errors` array (listJobs deliberately
// omits it to keep the list endpoint light).
async function getJob(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query(
      `SELECT j.*, u.username AS created_by_username
       FROM onec_bulk_upload_jobs j LEFT JOIN onec_users u ON j.created_by = u.id
       WHERE j.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /bulk-upload/jobs/:id/failures.xlsx
async function downloadFailures(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT entity_type, errors FROM onec_bulk_upload_jobs WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const { entity_type, errors } = result.rows[0];
    if (!errors || errors.length === 0) return res.status(400).json({ error: 'This job has no failed rows' });

    const buffer = failuresAsXlsxBuffer(entity_type, errors);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bulk_upload_${id}_failures.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /bulk-upload/jobs/:id/credentials.xlsx — the one place to retrieve
// the plaintext passwords generated for this job's successful rows; not
// stored/shown anywhere else after this.
async function downloadCredentials(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('SELECT entity_type, credentials FROM onec_bulk_upload_jobs WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const { entity_type, credentials } = result.rows[0];
    if (!credentials || credentials.length === 0) return res.status(400).json({ error: 'This job has no successfully created rows' });

    const buffer = credentialsAsXlsxBuffer(entity_type, credentials);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bulk_upload_${id}_credentials.xlsx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  upload,
  requireValidEntityType,
  downloadTemplate,
  uploadFile,
  listJobs,
  getJob,
  downloadFailures,
  downloadCredentials
};

const { z } = require('zod');
const multer = require('multer');
const { getMyCohorts } = require('../../lib/myCohorts');
const { canAccessCohort, canModerateCohort } = require('../../lib/cohortAccess');
const { sanitizeMessageBody } = require('../../lib/richText');
const { isConfigured, uploadBuffer } = require('../../lib/storage');
const { logAudit } = require('../../lib/audit');
const { emitToCohort } = require('../../lib/socket');

// Deliberately broader than profile pictures (documents/spreadsheets/zips,
// not just images) since a class chat attachment is "whatever a teacher or
// student needs to share for class", but still a fixed allow-list rather
// than "any file" — matches the ALLOWED_MIME_TYPES pattern in
// modules/profile/controller.js.
const ALLOWED_ATTACHMENT_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet|presentationml\.presentation)|vnd\.ms-excel|vnd\.ms-powerpoint|zip)|text\/plain)$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => cb(null, ALLOWED_ATTACHMENT_TYPES.test(file.mimetype))
});

const postSchema = z.object({ body: z.string().max(20000).optional().default('') });
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😠'];
const reactionSchema = z.object({ emoji: z.enum(REACTION_EMOJIS) });

function attachmentTypeLabel(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype === 'application/pdf') return 'pdf';
  if (mimetype.includes('word')) return 'doc';
  if (mimetype.includes('sheet') || mimetype === 'application/vnd.ms-excel') return 'xls';
  if (mimetype.includes('presentation') || mimetype === 'application/vnd.ms-powerpoint') return 'ppt';
  if (mimetype === 'application/zip') return 'zip';
  return 'file';
}

// Uploads req.file (if present) to R2 and returns the four
// attachment_* columns to persist, or null fields if there's no file.
async function uploadAttachmentIfPresent(req, cohortId) {
  if (!req.file) return { attachment_url: null, attachment_name: null, attachment_size: null, attachment_type: null };
  if (!isConfigured) throw Object.assign(new Error('File attachments are not configured for this deployment'), { status: 503 });

  const resourceType = req.file.mimetype.startsWith('image/') ? 'image' : 'raw';
  const result = await uploadBuffer(req.file.buffer, {
    folder: `onecampus/${req.tenantSchema}/class-chat/${cohortId}`,
    resourceType,
    mimetype: req.file.mimetype
  });
  return {
    attachment_url: result.secure_url,
    attachment_name: req.file.originalname,
    attachment_size: req.file.size,
    attachment_type: attachmentTypeLabel(req.file.mimetype)
  };
}

// Backs the Class tab's picker — every cohort this caller belongs to (see
// getMyCohorts). Empty for staff/admin, who have no cohort-membership
// relationship in the schema; their Class tab shows an empty state instead.
async function listMyCohorts(req, res) {
  try {
    const cohorts = await getMyCohorts(req);
    res.json({ data: cohorts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// The class roster for the @mention picker — every learner in the cohort
// plus every instructor attached to it (advisor + co-teachers, same set
// getMyCohorts uses to decide instructor membership).
async function listMembers(req, res) {
  try {
    const cohortId = Number(req.params.cohortId);
    if (!(await canAccessCohort(req, cohortId))) {
      return res.status(403).json({ error: 'Not a member of this class' });
    }

    const [learners, instructors] = await Promise.all([
      req.db.query(
        `SELECT u.id, l.first_name, l.last_name, u.username, u.role
         FROM onec_learners l JOIN onec_users u ON l.user_id = u.id
         WHERE l.cohort_id = $1 AND u.is_active = true ORDER BY l.first_name`,
        [cohortId]
      ),
      req.db.query(
        `SELECT u.id, i.first_name, i.last_name, u.username, u.role
         FROM onec_instructors i JOIN onec_users u ON i.user_id = u.id
         WHERE u.is_active = true AND u.id IN (
           SELECT advisor_id FROM onec_cohorts WHERE id = $1
           UNION
           SELECT i2.user_id FROM onec_instructor_cohorts ic
             JOIN onec_instructors i2 ON ic.instructor_id = i2.id WHERE ic.cohort_id = $1
         ) ORDER BY i.first_name`,
        [cohortId]
      )
    ]);
    res.json({ data: [...instructors.rows, ...learners.rows] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Posts + their replies + reaction summaries in one round trip — channel
// volume is small enough that N+1 separate endpoints would just be extra
// round trips for no benefit. Soft-deleted messages (deleted_at IS NOT
// NULL) are excluded entirely rather than shown as tombstones, per "hide
// from screen" — the row itself, and its edit history, are preserved for
// moderator/audit tooling, just never rendered in the normal chat view.
async function listPosts(req, res) {
  try {
    const cohortId = Number(req.params.cohortId);
    if (!(await canAccessCohort(req, cohortId))) {
      return res.status(403).json({ error: 'Not a member of this class' });
    }
    const userId = req.user.userId;

    // A message's author can be a learner, instructor, staff member, or
    // (rarely) an admin — each keeps first/last name in a different table
    // (or none, for admin), hence the three-way LEFT JOIN + COALESCE rather
    // than a single join. Same pattern repeated for reply authors below.
    const result = await req.db.query(
      `SELECT p.id, p.body, p.created_at, p.author_id, p.is_edited, p.pinned_at,
              p.attachment_url, p.attachment_name, p.attachment_size, p.attachment_type,
              u.username AS author_username, u.role AS author_role, u.profile_picture_url AS author_profile_picture_url,
              COALESCE(l.first_name, i.first_name, s.first_name) AS author_first_name,
              COALESCE(l.last_name, i.last_name, s.last_name) AS author_last_name,
              COALESCE(
                (SELECT json_agg(json_build_object('emoji', t.emoji, 'count', t.cnt) ORDER BY t.emoji)
                 FROM (
                   SELECT emoji, COUNT(*) AS cnt FROM onec_class_message_reactions
                   WHERE message_type = 'post' AND message_id = p.id GROUP BY emoji
                 ) t),
                '[]'
              ) AS reactions,
              (SELECT emoji FROM onec_class_message_reactions
               WHERE message_type = 'post' AND message_id = p.id AND user_id = $2) AS my_reaction,
              COALESCE(
                (SELECT json_agg(json_build_object(
                    'id', r.id, 'body', r.body, 'created_at', r.created_at, 'is_edited', r.is_edited,
                    'attachment_url', r.attachment_url, 'attachment_name', r.attachment_name,
                    'attachment_size', r.attachment_size, 'attachment_type', r.attachment_type,
                    'author_id', r.author_id, 'author_username', ru.username, 'author_role', ru.role,
                    'author_profile_picture_url', ru.profile_picture_url,
                    'author_first_name', COALESCE(rl.first_name, ri.first_name, rs.first_name),
                    'author_last_name', COALESCE(rl.last_name, ri.last_name, rs.last_name)
                  ) ORDER BY r.created_at ASC)
                 FROM onec_class_post_replies r
                 JOIN onec_users ru ON r.author_id = ru.id
                 LEFT JOIN onec_learners rl ON rl.user_id = r.author_id
                 LEFT JOIN onec_instructors ri ON ri.user_id = r.author_id
                 LEFT JOIN onec_staff rs ON rs.user_id = r.author_id
                 WHERE r.post_id = p.id AND r.deleted_at IS NULL),
                '[]'
              ) AS replies
       FROM onec_class_posts p
       JOIN onec_users u ON p.author_id = u.id
       LEFT JOIN onec_learners l ON l.user_id = p.author_id
       LEFT JOIN onec_instructors i ON i.user_id = p.author_id
       LEFT JOIN onec_staff s ON s.user_id = p.author_id
       WHERE p.cohort_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at ASC`,
      [cohortId, userId]
    );
    res.json({ data: result.rows, canModerate: await canModerateCohort(req, cohortId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createPost(req, res) {
  try {
    const cohortId = Number(req.params.cohortId);
    if (!(await canAccessCohort(req, cohortId))) {
      return res.status(403).json({ error: 'Not a member of this class' });
    }

    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const body = sanitizeMessageBody(parsed.data.body);
    if (!body && !req.file) return res.status(400).json({ error: 'Message or attachment is required' });

    const attachment = await uploadAttachmentIfPresent(req, cohortId);

    const result = await req.db.query(
      `WITH ins AS (
         INSERT INTO onec_class_posts (cohort_id, author_id, body, attachment_url, attachment_name, attachment_size, attachment_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
       )
       SELECT ins.*, u.username AS author_username, u.role AS author_role, u.profile_picture_url AS author_profile_picture_url,
              COALESCE(l.first_name, i.first_name, s.first_name) AS author_first_name,
              COALESCE(l.last_name, i.last_name, s.last_name) AS author_last_name
       FROM ins
       JOIN onec_users u ON ins.author_id = u.id
       LEFT JOIN onec_learners l ON l.user_id = ins.author_id
       LEFT JOIN onec_instructors i ON i.user_id = ins.author_id
       LEFT JOIN onec_staff s ON s.user_id = ins.author_id`,
      [cohortId, req.user.userId, body, attachment.attachment_url, attachment.attachment_name, attachment.attachment_size, attachment.attachment_type]
    );
    const newPost = { ...result.rows[0], replies: [], reactions: [], my_reaction: null };
    res.status(201).json({ data: newPost });
    
    // Broadcast real-time event to room
    emitToCohort(req.tenantConfig.domain, cohortId, 'new_post', newPost);
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === '23503') return res.status(400).json({ error: 'Class does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createReply(req, res) {
  try {
    const postId = Number(req.params.postId);
    const postResult = await req.db.query('SELECT cohort_id FROM onec_class_posts WHERE id = $1 AND deleted_at IS NULL', [postId]);
    if (postResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const cohortId = postResult.rows[0].cohort_id;
    if (!(await canAccessCohort(req, cohortId))) {
      return res.status(403).json({ error: 'Not a member of this class' });
    }

    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const body = sanitizeMessageBody(parsed.data.body);
    if (!body && !req.file) return res.status(400).json({ error: 'Message or attachment is required' });

    const attachment = await uploadAttachmentIfPresent(req, cohortId);

    const result = await req.db.query(
      `WITH ins AS (
         INSERT INTO onec_class_post_replies (post_id, author_id, body, attachment_url, attachment_name, attachment_size, attachment_type)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
       )
       SELECT ins.*, u.username AS author_username, u.role AS author_role, u.profile_picture_url AS author_profile_picture_url,
              COALESCE(l.first_name, i.first_name, s.first_name) AS author_first_name,
              COALESCE(l.last_name, i.last_name, s.last_name) AS author_last_name
       FROM ins
       JOIN onec_users u ON ins.author_id = u.id
       LEFT JOIN onec_learners l ON l.user_id = ins.author_id
       LEFT JOIN onec_instructors i ON i.user_id = ins.author_id
       LEFT JOIN onec_staff s ON s.user_id = ins.author_id`,
      [postId, req.user.userId, body, attachment.attachment_url, attachment.attachment_name, attachment.attachment_size, attachment.attachment_type]
    );
    const newReply = result.rows[0];
    res.status(201).json({ data: newReply });
    
    // Broadcast real-time event to room
    emitToCohort(req.tenantConfig.domain, cohortId, 'new_reply', { ...newReply, post_id: postId });
  } catch (err) {
    console.error(err);
    if (err.status) return res.status(err.status).json({ error: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Edit (author-only) + edit history (moderator-only) ---

const TABLE_BY_TYPE = { post: 'onec_class_posts', reply: 'onec_class_post_replies' };

async function editMessage(messageType, req, res) {
  try {
    const table = TABLE_BY_TYPE[messageType];
    const id = Number(req.params.id);
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const nextBody = sanitizeMessageBody(parsed.data.body);
    if (!nextBody) return res.status(400).json({ error: 'Message body is required' });

    const cohortColumn = messageType === 'post'
      ? `SELECT cohort_id, body, author_id FROM ${table} WHERE id = $1 AND deleted_at IS NULL`
      : `SELECT p.cohort_id, r.body, r.author_id FROM ${table} r JOIN onec_class_posts p ON r.post_id = p.id WHERE r.id = $1 AND r.deleted_at IS NULL`;
    const existing = await req.db.query(cohortColumn, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = existing.rows[0];
    if (row.author_id !== req.user.userId) return res.status(403).json({ error: 'You can only edit your own message' });
    if (!(await canAccessCohort(req, row.cohort_id))) return res.status(403).json({ error: 'Not a member of this class' });

    await req.db.query(
      `INSERT INTO onec_class_message_edits (message_type, message_id, previous_body, edited_by) VALUES ($1, $2, $3, $4)`,
      [messageType, id, row.body, req.user.userId]
    );
    const result = await req.db.query(
      `UPDATE ${table} SET body = $1, is_edited = true WHERE id = $2 RETURNING *`,
      [nextBody, id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getEditHistory(messageType, req, res) {
  try {
    const table = TABLE_BY_TYPE[messageType];
    const id = Number(req.params.id);

    const cohortQuery = messageType === 'post'
      ? `SELECT cohort_id, body, created_at FROM ${table} WHERE id = $1`
      : `SELECT p.cohort_id, r.body, r.created_at FROM ${table} r JOIN onec_class_posts p ON r.post_id = p.id WHERE r.id = $1`;
    const existing = await req.db.query(cohortQuery, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = existing.rows[0];
    if (!(await canModerateCohort(req, row.cohort_id))) return res.status(403).json({ error: 'Not authorized to view edit history' });

    const versions = await req.db.query(
      `SELECT previous_body AS body, edited_at FROM onec_class_message_edits
       WHERE message_type = $1 AND message_id = $2 ORDER BY edited_at DESC`,
      [messageType, id]
    );
    res.json({ data: { current: { body: row.body, at: row.created_at }, previous: versions.rows } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Soft delete (author or moderator) ---

async function deleteMessage(messageType, req, res) {
  try {
    const table = TABLE_BY_TYPE[messageType];
    const id = Number(req.params.id);

    const cohortQuery = messageType === 'post'
      ? `SELECT cohort_id, author_id, body FROM ${table} WHERE id = $1 AND deleted_at IS NULL`
      : `SELECT p.cohort_id, r.author_id, r.body FROM ${table} r JOIN onec_class_posts p ON r.post_id = p.id WHERE r.id = $1 AND r.deleted_at IS NULL`;
    const existing = await req.db.query(cohortQuery, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const row = existing.rows[0];

    const isAuthor = row.author_id === req.user.userId;
    const isModerator = await canModerateCohort(req, row.cohort_id);
    if (!isAuthor && !isModerator) return res.status(403).json({ error: 'Not authorized to remove this message' });

    // Soft delete only — the row (and any edit history already recorded
    // against it) stays in the database for future moderation/audit
    // tooling, it's just excluded from every normal list query from here on.
    await req.db.query(`UPDATE ${table} SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 WHERE id = $2`, [req.user.userId, id]);

    logAudit(req, `class_${messageType}.removed`, {
      [`${messageType}_id`]: id,
      removed_by_role: req.user.role,
      was_own_message: isAuthor
    });
    res.json({ data: { removed: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Reactions ---

// One reaction per user per message — sending the same emoji again toggles
// it off; sending a different one replaces it. Applies to posts only (not
// replies), matching the approved mock.
async function setReaction(req, res) {
  try {
    const postId = Number(req.params.postId);
    const parsed = reactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const postResult = await req.db.query('SELECT cohort_id FROM onec_class_posts WHERE id = $1 AND deleted_at IS NULL', [postId]);
    if (postResult.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    if (!(await canAccessCohort(req, postResult.rows[0].cohort_id))) {
      return res.status(403).json({ error: 'Not a member of this class' });
    }

    const existing = await req.db.query(
      `SELECT emoji FROM onec_class_message_reactions WHERE message_type = 'post' AND message_id = $1 AND user_id = $2`,
      [postId, req.user.userId]
    );

    if (existing.rows.length > 0 && existing.rows[0].emoji === parsed.data.emoji) {
      await req.db.query(
        `DELETE FROM onec_class_message_reactions WHERE message_type = 'post' AND message_id = $1 AND user_id = $2`,
        [postId, req.user.userId]
      );
      return res.json({ data: { emoji: null } });
    }

    await req.db.query(
      `INSERT INTO onec_class_message_reactions (message_type, message_id, user_id, emoji) VALUES ('post', $1, $2, $3)
       ON CONFLICT (message_type, message_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji, created_at = CURRENT_TIMESTAMP`,
      [postId, req.user.userId, parsed.data.emoji]
    );
    res.json({ data: { emoji: parsed.data.emoji } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Pin (moderator-only, one pinned post per cohort) ---

async function pinPost(req, res) {
  try {
    const cohortId = Number(req.params.cohortId);
    const postSchemaPin = z.object({ postId: z.number().int() });
    const parsed = postSchemaPin.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    if (!(await canModerateCohort(req, cohortId))) return res.status(403).json({ error: 'Not authorized to pin messages' });

    const postCheck = await req.db.query('SELECT id FROM onec_class_posts WHERE id = $1 AND cohort_id = $2 AND deleted_at IS NULL', [parsed.data.postId, cohortId]);
    if (postCheck.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await req.db.query('UPDATE onec_class_posts SET pinned_at = NULL, pinned_by = NULL WHERE cohort_id = $1 AND pinned_at IS NOT NULL', [cohortId]);
    await req.db.query('UPDATE onec_class_posts SET pinned_at = CURRENT_TIMESTAMP, pinned_by = $1 WHERE id = $2', [req.user.userId, parsed.data.postId]);

    logAudit(req, 'class_post.pinned', { post_id: parsed.data.postId, cohort_id: cohortId });
    res.json({ data: { pinned: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function unpinPost(req, res) {
  try {
    const cohortId = Number(req.params.cohortId);
    if (!(await canModerateCohort(req, cohortId))) return res.status(403).json({ error: 'Not authorized to pin messages' });

    await req.db.query('UPDATE onec_class_posts SET pinned_at = NULL, pinned_by = NULL WHERE cohort_id = $1 AND pinned_at IS NOT NULL', [cohortId]);
    res.json({ data: { pinned: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  upload,
  listMyCohorts,
  listMembers,
  listPosts,
  createPost,
  createReply,
  editPost: (req, res) => editMessage('post', req, res),
  editReply: (req, res) => editMessage('reply', req, res),
  getPostEditHistory: (req, res) => getEditHistory('post', req, res),
  getReplyEditHistory: (req, res) => getEditHistory('reply', req, res),
  deletePost: (req, res) => deleteMessage('post', req, res),
  deleteReply: (req, res) => deleteMessage('reply', req, res),
  setReaction,
  pinPost,
  unpinPost
};

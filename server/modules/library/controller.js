const { z } = require('zod');
const { logAudit } = require('../../lib/audit');

const bookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  total_copies: z.number().int().min(1).default(1)
});

const issueLoanSchema = z.object({
  book_id: z.number().int(),
  borrower_id: z.number().int(),
  due_date: z.string() // YYYY-MM-DD
});

// --- Books ---

async function listBooks(req, res) {
  try {
    const result = await req.db.query('SELECT * FROM onec_library_books ORDER BY title ASC');
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createBook(req, res) {
  try {
    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { title, author, isbn, category, total_copies } = parsed.data;
    const result = await req.db.query(
      `INSERT INTO onec_library_books (title, author, isbn, category, total_copies, available_copies)
       VALUES ($1, $2, $3, $4, $5, $5) RETURNING *`,
      [title, author ?? null, isbn ?? null, category ?? null, total_copies]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Adjusts available_copies by the delta in total_copies rather than
// overwriting it outright — otherwise editing a book's copy count would
// silently clobber copies that are currently out on loan.
async function updateBook(req, res) {
  try {
    const { id } = req.params;
    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });

    const { title, author, isbn, category, total_copies } = parsed.data;

    const current = await req.db.query(
      'SELECT total_copies, available_copies FROM onec_library_books WHERE id = $1',
      [id]
    );
    if (current.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    const delta = total_copies - current.rows[0].total_copies;
    const newAvailable = Math.max(0, current.rows[0].available_copies + delta);

    const result = await req.db.query(
      `UPDATE onec_library_books SET title = $1, author = $2, isbn = $3, category = $4, total_copies = $5, available_copies = $6
       WHERE id = $7 RETURNING *`,
      [title, author ?? null, isbn ?? null, category ?? null, total_copies, newAvailable, id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteBook(req, res) {
  try {
    const { id } = req.params;
    const result = await req.db.query('DELETE FROM onec_library_books WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    logAudit(req, 'library.book_deleted', { book_id: result.rows[0].id, title: result.rows[0].title });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Cannot delete a book with existing loan history' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Recipient picker for the "issue to" field — every active user in the
// tenant, mirroring server/modules/messages' recipient list. Manager-only
// (unlike messages' recipients, which everyone can see) since only a
// manager issues loans.
async function listBorrowers(req, res) {
  try {
    const result = await req.db.query(
      'SELECT id, username, role FROM onec_users WHERE is_active = true ORDER BY role, username'
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// --- Loans ---

async function listLoans(req, res) {
  try {
    const role = req.user.role;
    const isManager = role === 'admin' || role === 'staff';

    let query = `SELECT l.*, b.title AS book_title, u.username AS borrower_username, u.role AS borrower_role
                 FROM onec_library_loans l
                 JOIN onec_library_books b ON l.book_id = b.id
                 JOIN onec_users u ON l.borrower_id = u.id`;
    const params = [];

    if (!isManager) {
      params.push(req.user.userId);
      query += ' WHERE l.borrower_id = $1';
    }
    query += ' ORDER BY l.borrowed_date DESC';

    const result = await req.db.query(query, params);
    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function issueLoan(req, res) {
  try {
    const parsed = issueLoanSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.format() });
    const { book_id, borrower_id, due_date } = parsed.data;

    await req.db.query('BEGIN');
    try {
      const bookResult = await req.db.query(
        'SELECT available_copies FROM onec_library_books WHERE id = $1 FOR UPDATE',
        [book_id]
      );
      if (bookResult.rows.length === 0) {
        await req.db.query('ROLLBACK');
        return res.status(400).json({ error: 'Book does not exist' });
      }
      if (bookResult.rows[0].available_copies < 1) {
        await req.db.query('ROLLBACK');
        return res.status(400).json({ error: 'No copies available' });
      }

      await req.db.query('UPDATE onec_library_books SET available_copies = available_copies - 1 WHERE id = $1', [book_id]);
      const loanResult = await req.db.query(
        'INSERT INTO onec_library_loans (book_id, borrower_id, due_date, issued_by) VALUES ($1, $2, $3, $4) RETURNING *',
        [book_id, borrower_id, due_date, req.user.userId]
      );

      await req.db.query('COMMIT');
      logAudit(req, 'library.loan_issued', { loan_id: loanResult.rows[0].id, book_id, borrower_id });
      res.status(201).json({ data: loanResult.rows[0] });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    if (err.code === '23503') return res.status(400).json({ error: 'Book or borrower does not exist' });
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function returnLoan(req, res) {
  try {
    const { id } = req.params;

    await req.db.query('BEGIN');
    try {
      const loanResult = await req.db.query(
        'UPDATE onec_library_loans SET returned_date = CURRENT_DATE WHERE id = $1 AND returned_date IS NULL RETURNING *',
        [id]
      );
      if (loanResult.rows.length === 0) {
        await req.db.query('ROLLBACK');
        return res.status(400).json({ error: 'Loan not found or already returned' });
      }

      await req.db.query('UPDATE onec_library_books SET available_copies = available_copies + 1 WHERE id = $1', [
        loanResult.rows[0].book_id
      ]);
      await req.db.query('COMMIT');

      logAudit(req, 'library.loan_returned', { loan_id: loanResult.rows[0].id, book_id: loanResult.rows[0].book_id });
      res.json({ data: loanResult.rows[0] });
    } catch (err) {
      await req.db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { listBooks, createBook, updateBook, deleteBook, listBorrowers, listLoans, issueLoan, returnLoan };

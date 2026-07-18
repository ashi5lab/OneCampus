// Overdue library fines, v1 scope: a flat per-day rate, computed on read —
// not a fees/billing/payments system (no invoicing, no payment collection,
// no "mark as paid"). This only calculates how much is owed and lets staff
// waive some or all of it; actually collecting it happens outside the app,
// same as it would with a paper ledger.
const FINE_RATE_PER_DAY = 5; // per calendar day overdue — not tenant-configurable in v1, and currency-agnostic (interpret in whatever unit the tenant already uses; nothing else in this app assumes a currency)

function parseDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function todayDateOnly() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

// `loan` needs due_date/returned_date as plain 'YYYY-MM-DD' strings (::text
// cast in the query — node-postgres otherwise parses DATE columns into JS
// Date objects, breaking the string-based parseDateOnly above) and
// fine_waived_amount as returned by pg (a numeric-as-string).
//
// Still-outstanding loans measure overdue-ness against today, so the fine
// keeps growing each day it's not returned; once returned_date is set, the
// fine is naturally frozen at that date forever after — no background job
// needed to "close out" the calculation.
function computeFine(loan) {
  const dueMs = parseDateOnly(loan.due_date);
  const referenceMs = loan.returned_date ? parseDateOnly(loan.returned_date) : todayDateOnly();
  const daysOverdue = Math.max(0, Math.round((referenceMs - dueMs) / (24 * 60 * 60 * 1000)));
  const rawFine = daysOverdue * FINE_RATE_PER_DAY;
  const waived = Number(loan.fine_waived_amount) || 0;
  const netFine = Math.max(0, rawFine - waived);

  return {
    days_overdue: daysOverdue,
    fine_amount: rawFine,
    fine_waived_amount: waived,
    net_fine_amount: netFine
  };
}

module.exports = { FINE_RATE_PER_DAY, computeFine };

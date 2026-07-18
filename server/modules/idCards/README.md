# ID Cards Module

**Purpose**: Printable photo ID cards (PDF) for students, teachers, and staff — CR80 card size (3.375in x 2.125in), rendered on demand from the existing roster + profile picture data. No new table — nothing is stored, same "computed, not stored" approach as `server/modules/evaluations`'s report cards.

**API Endpoints**:
- `GET /api/v1/id-cards/learner/:id/pdf`
- `GET /api/v1/id-cards/instructor/:id/pdf`
- `GET /api/v1/id-cards/staff/:id/pdf`

**Permissions**: No route-level `requirePermission` — each handler allows either `id_cards.generate` (admin/staff by default — generate anyone's card) **or** the caller requesting their own card (a learner their own, via `lib/rowScope.js`'s `getScopedLearnerIds` — which also covers a guardian requesting their linked child's; an instructor/staff their own, via a direct `user_id` match). A request for someone else's card without `id_cards.generate` gets a 404, not 403 — same reasoning as `certificates.getPdf`: the id alone shouldn't confirm whose card it is.

**Business Rules**:
- Missing/broken profile picture never fails the card — it just renders a blank photo box instead. A card without a photo is still useful; a missing photo isn't a good reason to block printing one.
- The photo is fetched from its Cloudinary URL at render time (`fetch()`, Node's built-in) into a Buffer — `pdfkit`'s `doc.image()` needs actual bytes, not a remote URL.
- One card per PDF, one person at a time — no bulk "print a whole cohort's cards as one sheet" yet. A real print run would want that; it's a natural follow-up, not built here.
- No barcode/QR code on the card — deliberately out of scope alongside the (currently excluded) biometric/QR attendance feature this would otherwise pair with. Adding one later is a small, self-contained change to `server/lib/idCard.js`.

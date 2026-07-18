const PDFDocument = require('pdfkit');

// CR80 — the standard plastic ID card size (3.375in x 2.125in, in points
// at 72dpi) — so a generated card prints at real ID-badge size instead of
// a stray corner of an A4 sheet.
const CARD_WIDTH = 243;
const CARD_HEIGHT = 153;

// Fetches the photo (already-uploaded Cloudinary URL — see server/lib/
// cloudinary.js) as a Buffer for pdfkit's doc.image(), which needs actual
// bytes, not a remote URL. Returns null on any failure (no photo on file,
// network hiccup, unsupported format) — a card without a photo is still a
// useful card; failing the whole PDF over a missing/broken image isn't.
async function fetchPhotoBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

// Renders one ID card as a PDF onto `res` (caller sets headers first).
// `subtitle` is role/class-appropriate context (e.g. a cohort name for a
// learner, "Instructor" for a teacher) — kept generic so this one renderer
// serves all three person types instead of three near-identical copies.
async function renderIdCardPdf(res, { orgName, name, subtitle, idLabel, idNumber, photoUrl }) {
  const photoBuffer = await fetchPhotoBuffer(photoUrl);

  const doc = new PDFDocument({ size: [CARD_WIDTH, CARD_HEIGHT], margin: 0 });
  doc.pipe(res);

  // Header band
  doc.rect(0, 0, CARD_WIDTH, 28).fill('#1C2230');
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text(orgName, 10, 9, { width: CARD_WIDTH - 20 });

  const photoSize = 60;
  const photoX = 12;
  const photoY = 40;
  if (photoBuffer) {
    try {
      doc.image(photoBuffer, photoX, photoY, { width: photoSize, height: photoSize, fit: [photoSize, photoSize] });
    } catch {
      // Corrupt/unsupported image bytes — fall through to the placeholder box.
      doc.rect(photoX, photoY, photoSize, photoSize).stroke('#D7DBE3');
    }
  } else {
    doc.rect(photoX, photoY, photoSize, photoSize).stroke('#D7DBE3');
  }

  const textX = photoX + photoSize + 12;
  const textWidth = CARD_WIDTH - textX - 10;
  doc.fillColor('#1C2230').fontSize(11).font('Helvetica-Bold').text(name, textX, photoY, { width: textWidth });
  doc.fillColor('#6B7488').fontSize(8.5).font('Helvetica').text(subtitle || '', textX, photoY + 16, { width: textWidth });
  doc.fillColor('#1C2230').fontSize(8.5).font('Helvetica-Bold').text(`${idLabel}: `, textX, photoY + 36, { continued: true, width: textWidth });
  doc.font('Helvetica').text(idNumber);

  doc.fontSize(6.5).fillColor('#6B7488').text('This card is the property of the issuing institution.', 10, CARD_HEIGHT - 14, {
    width: CARD_WIDTH - 20,
    align: 'center'
  });

  doc.end();
}

module.exports = { renderIdCardPdf, CARD_WIDTH, CARD_HEIGHT };

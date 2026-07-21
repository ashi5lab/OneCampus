const sanitizeHtml = require('sanitize-html');

// The fixed 5-color palette from the approved Class chat mock — formatting
// is deliberately closed-ended (pick from these, not an open color picker),
// so this list is also the server-side allow-list; anything else gets
// stripped rather than trusting whatever a client sends.
const ALLOWED_TEXT_COLORS = ['#191924', '#B91C1C', '#15803D', '#1D4ED8', '#A21CAF'];
const FONT_SIZE_PATTERN = /^(0\.8|0\.9|1(\.0|\.1|\.2|\.3|\.4|\.5)?)em$/;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

// The Class chat composer sets these colors via the DOM style API (see
// MessageComposer.jsx's wrapSelectionWithStyle), and the browser re-
// serializes them as `rgb(r, g, b)` in the actual style attribute rather
// than preserving the original hex string — both forms need to be allowed
// or every colored message would come back through the sanitizer with its
// color silently stripped.
const ALLOWED_COLOR_PATTERNS = ALLOWED_TEXT_COLORS.flatMap((hex) => [
  new RegExp(`^${hex}$`, 'i'),
  new RegExp(`^${hexToRgb(hex).replace(/[()]/g, '\\$&')}$`, 'i')
]);

const SANITIZE_OPTIONS = {
  allowedTags: ['b', 'strong', 'i', 'em', 'u', 'span', 'br'],
  allowedAttributes: { span: ['class', 'style', 'data-user-id'] },
  allowedClasses: { span: ['mention'] },
  allowedStyles: {
    span: {
      color: ALLOWED_COLOR_PATTERNS,
      'font-size': [FONT_SIZE_PATTERN]
    }
  },
  // A mention span's data-user-id must be a plain integer — this is the one
  // attribute besides style/class we allow through, so it gets its own
  // narrow validation rather than trusting sanitize-html's generic pass.
  exclusiveFilter: (frame) =>
    frame.tag === 'span' && frame.attribs['data-user-id'] !== undefined && !/^(\d+|all)$/.test(frame.attribs['data-user-id']),
  disallowedTagsMode: 'discard'
};

// The one security boundary for chat message bodies — client-side
// formatting is a convenience, this is what actually stops stored XSS.
// Called on every create/edit before the body ever reaches the database.
function sanitizeMessageBody(html) {
  return sanitizeHtml(html || '', SANITIZE_OPTIONS).trim();
}

// Strips tags for contexts that need plain text — the Activities feed's
// title preview and Home card previews, which truncate/display body text
// without wanting to render (or leak) markup.
function stripHtml(html) {
  return sanitizeHtml(html || '', { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}

module.exports = { sanitizeMessageBody, stripHtml, ALLOWED_TEXT_COLORS };

// Lightweight, purpose-built markup for the Class chat composer — not real
// Markdown. The composer is a plain <textarea> (not contentEditable) for
// reliability/testability; toolbar buttons wrap the current selection with
// these delimiters, and markupToHtml() converts the finished draft to the
// sanitized-HTML shape the backend actually stores (see
// server/lib/richText.js for the matching allow-list). Delimiters were
// picked to be unlikely to appear in normal typed text.
//
//   **bold**   *italic*   __underline__
//   [[c:#HEX]]colored[[/c]]   [[s:1.2]]bigger[[/s]]
//   [[@:123:Firstname Lastname]] — mention (self-contained, no closing tag)

const WRAP_TOKENS = [
  { open: '**', close: '**', tag: 'b' },
  { open: '__', close: '__', tag: 'u' },
  { open: '*', close: '*', tag: 'i' }
];

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function markupToHtml(markup) {
  let i = 0;
  const len = markup.length;

  function parseUntil(stopAt) {
    let out = '';
    while (i < len) {
      if (stopAt && markup.startsWith(stopAt, i)) return out;

      if (markup.startsWith('[[@:', i)) {
        const end = markup.indexOf(']]', i);
        const inner = end !== -1 ? markup.slice(i + 4, end) : '';
        const sep = inner.indexOf(':');
        if (end !== -1 && sep !== -1) {
          const userId = inner.slice(0, sep).replace(/\D/g, '');
          const name = inner.slice(sep + 1);
          out += `<span class="mention" data-user-id="${userId}">@${escapeHtml(name)}</span>`;
          i = end + 2;
          continue;
        }
      }

      if (markup.startsWith('[[c:', i)) {
        const headerEnd = markup.indexOf(']]', i);
        if (headerEnd !== -1) {
          const color = markup.slice(i + 4, headerEnd);
          i = headerEnd + 2;
          const inner = parseUntil('[[/c]]');
          if (markup.startsWith('[[/c]]', i)) i += 6;
          out += `<span style="color:${escapeHtml(color)}">${inner}</span>`;
          continue;
        }
      }

      if (markup.startsWith('[[s:', i)) {
        const headerEnd = markup.indexOf(']]', i);
        if (headerEnd !== -1) {
          const size = markup.slice(i + 4, headerEnd);
          i = headerEnd + 2;
          const inner = parseUntil('[[/s]]');
          if (markup.startsWith('[[/s]]', i)) i += 6;
          out += `<span style="font-size:${escapeHtml(size)}em">${inner}</span>`;
          continue;
        }
      }

      let matchedWrap = false;
      for (const { open, close, tag } of WRAP_TOKENS) {
        if (markup.startsWith(open, i)) {
          const searchFrom = i + open.length;
          const closeIdx = markup.indexOf(close, searchFrom);
          if (closeIdx !== -1) {
            i = searchFrom;
            const inner = parseUntil(close);
            if (markup.startsWith(close, i)) i += close.length;
            out += `<${tag}>${inner}</${tag}>`;
            matchedWrap = true;
            break;
          }
        }
      }
      if (matchedWrap) continue;

      if (markup[i] === '\n') {
        out += '<br>';
        i += 1;
        continue;
      }

      out += escapeHtml(markup[i]);
      i += 1;
    }
    return out;
  }

  return parseUntil(null);
}

// Wraps the textarea's current selection with the given delimiters —
// returns the new value plus where the selection should land afterward, or
// null if nothing is selected (formatting buttons apply to a selection,
// same as most rich text toolbars; there's no "typing style" mode here).
export function wrapSelection(el, open, close) {
  const { selectionStart: start, selectionEnd: end, value } = el;
  if (start === end) return null;
  const selected = value.slice(start, end);
  return {
    value: value.slice(0, start) + open + selected + close + value.slice(end),
    selectionStart: start + open.length,
    selectionEnd: start + open.length + selected.length
  };
}

// Inserts a mention token at the cursor, replacing the partially-typed
// "@query" that triggered the autocomplete.
export function insertMention(el, queryStart, userId, name) {
  const { selectionEnd: caret, value } = el;
  const token = `[[@:${userId}:${name}]] `;
  const nextValue = value.slice(0, queryStart) + token + value.slice(caret);
  const cursor = queryStart + token.length;
  return { value: nextValue, selectionStart: cursor, selectionEnd: cursor };
}

// Finds an in-progress "@query" ending at the caret, if any — used to
// decide whether to show/update the mention dropdown on every keystroke.
export function activeMentionQuery(value, caret) {
  const uptoCaret = value.slice(0, caret);
  const at = uptoCaret.lastIndexOf('@');
  if (at === -1) return null;
  const between = uptoCaret.slice(at + 1);
  if (/[\s[\]]/.test(between)) return null; // whitespace/bracket ends the mention attempt
  return { start: at, query: between };
}

import { useEffect, useRef, useState } from 'react';
import { activeMentionQuery } from '../../../lib/mentionQuery';

const COLORS = [
  { hex: '#191924', label: 'Default' },
  { hex: '#B91C1C', label: 'Red' },
  { hex: '#15803D', label: 'Green' },
  { hex: '#1D4ED8', label: 'Blue' },
  { hex: '#A21CAF', label: 'Purple' }
];
const SIZE_STEPS = [0.85, 1, 1.15, 1.3, 1.45];

function memberInitials(m) {
  if (m.id === 'all') return '@';
  return `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}`.toUpperCase();
}

// Everything before the caret, as plain text — used to detect an
// in-progress "@query" (see lib/mentionQuery.js). Reading it via a Range
// rather than tracking a mirrored string means it stays correct regardless
// of how many formatted spans/mention chips sit earlier in the message.
function textBeforeCaret(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return '';
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return '';
  const preRange = document.createRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.endContainer, range.endOffset);
  return preRange.toString();
}

// Wraps the current (non-collapsed) selection in a <span style="...">,
// producing exactly the shape server/lib/richText.js's sanitizer expects —
// there's no intermediate markup language to convert on submit, the editor's
// own DOM already is the message body.
function wrapSelectionWithStyle(styleProp, styleValue) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const span = document.createElement('span');
  span.style[styleProp] = styleValue;
  span.appendChild(range.extractContents());
  range.insertNode(span);
  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(newRange);
  return true;
}

// Replaces the just-typed "@query" (assumed to be plain text immediately
// before the caret, true for normal typing) with a mention chip, matching
// the exact <span class="mention" data-user-id="…"> shape the sanitizer
// allows.
function insertMentionNode(removeLen, userId, name) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.startContainer.nodeType === Node.TEXT_NODE && range.startOffset >= removeLen) {
    range.setStart(range.startContainer, range.startOffset - removeLen);
  }
  range.deleteContents();
  const span = document.createElement('span');
  span.className = 'mention';
  span.setAttribute('data-user-id', String(userId));
  span.textContent = `@${name}`;
  range.insertNode(span);
  const space = document.createTextNode(' ');
  span.after(space);
  const after = document.createRange();
  after.setStartAfter(space);
  after.collapse(true);
  sel.removeAllRanges();
  sel.addRange(after);
}

// Shared by "new post", "reply", and "edit" — a real contentEditable rich
// text box (not a plain textarea) so formatting shows live as you type,
// matching how Teams' own compose box works: Bold/Italic/Underline go
// through the browser's native execCommand (which produces <b>/<i>/<u> —
// already in the sanitizer's allow-list), and color/font-size wrap the
// current selection in a styled <span> directly, since execCommand's
// color/size commands emit legacy <font> tags the sanitizer doesn't allow.
// The editor's innerHTML on submit IS the sanitized-HTML-shaped message
// body — no separate markup-to-HTML conversion step.
export function MessageComposer({
  members = [],
  initialHtml = '',
  placeholder = 'Type a message…',
  onSubmit,
  onCancel,
  submitLabel = 'Send',
  showAttach = true,
  autoFocus = false
}) {
  const [file, setFile] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!initialHtml);
  const [mention, setMention] = useState(null); // { start, query }
  const [mentionHi, setMentionHi] = useState(0);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = initialHtml || '';
    setIsEmpty(el.textContent.trim().length === 0);
    if (autoFocus) {
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const combinedMembers = [
    { id: 'all', first_name: 'All', last_name: 'Members', username: 'Notify everyone in the class' },
    ...members
  ];

  const filteredMembers = mention
    ? combinedMembers
        .filter((m) => {
          const q = mention.query.toLowerCase();
          if (m.id === 'all') return 'all'.includes(q) || 'everyone'.includes(q);
          return (
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
            m.username.toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
    : [];

  function syncEmpty() {
    const el = editorRef.current;
    if (!el) return;
    const empty = el.textContent.trim().length === 0;
    if (empty && el.innerHTML !== '') {
      el.innerHTML = ''; // clears a leftover stray <br>
      // Chromium remembers the last active inline style at the caret after
      // you delete through a styled run, and silently re-applies it (as a
      // legacy <font> tag, regardless of how the style was first set) to
      // whatever gets typed next — even though the DOM is now empty.
      // removeFormat only drops that cached "typing style" if the
      // selection is actually collapsed inside the (now-empty) editor when
      // it runs — rewriting innerHTML alone leaves the old selection
      // dangling, so the caret has to be explicitly re-planted first.
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('removeFormat');
    }
    setIsEmpty(empty);
  }

  function handleInput() {
    const el = editorRef.current;
    if (!el) return;
    syncEmpty();
    const before = textBeforeCaret(el);
    setMention(activeMentionQuery(before, before.length));
    setMentionHi(0);
  }

  function pickMention(member) {
    if (!mention) return;
    editorRef.current?.focus();
    insertMentionNode(mention.query.length + 1, member.id, `${member.first_name} ${member.last_name}`);
    setMention(null);
    syncEmpty();
  }

  function handleKeyDown(e) {
    if (mention && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionHi((i) => (i + 1) % filteredMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionHi((i) => (i - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pickMention(filteredMembers[mentionHi]);
        return;
      }
      if (e.key === 'Escape') {
        setMention(null);
        return;
      }
    }
    // Enter always inserts a line break here — only the send button submits
    // (chat-in-a-textarea muscle memory expects Enter to send, but a rich
    // composer with multi-line messages reads better the other way, and
    // this was an explicit ask). insertLineBreak (not the browser's default
    // paragraph-splitting behavior) so it produces a plain <br>, which is
    // already in the sanitizer's allow-list — a <div> would just get
    // stripped, silently merging the lines back together.
    if (e.key === 'Enter') {
      e.preventDefault();
      document.execCommand('insertLineBreak');
      syncEmpty();
    }
  }

  function fmt(cmd) {
    editorRef.current?.focus();
    document.execCommand(cmd);
    syncEmpty();
  }

  function applyColor(hex) {
    editorRef.current?.focus();
    if (wrapSelectionWithStyle('color', hex)) syncEmpty();
  }

  function applySize(dir) {
    const nextIndex = Math.min(SIZE_STEPS.length - 1, Math.max(0, sizeIndex + dir));
    setSizeIndex(nextIndex);
    editorRef.current?.focus();
    if (wrapSelectionWithStyle('fontSize', `${SIZE_STEPS[nextIndex]}em`)) syncEmpty();
  }

  function handleFileChange(e) {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
    e.target.value = '';
  }

  async function handleSubmit() {
    if (submitting) return;
    const el = editorRef.current;
    if (!el) return;
    if (isEmpty && !file) return;
    setSubmitting(true);
    try {
      await onSubmit({ html: el.innerHTML, file });
      el.innerHTML = '';
      setIsEmpty(true);
      setFile(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="compose-wrap">
      {file && (
        <div className="mb-1.5 flex w-max items-center gap-2 rounded-lg border border-border bg-surface-muted px-2.5 py-1.5 text-[11px]">
          <span className="max-w-[160px] truncate font-semibold text-ink-900">{file.name}</span>
          <span className="text-ink-500">{Math.round(file.size / 1024)} KB</span>
          <button type="button" onClick={() => setFile(null)} className="font-bold text-ink-500 hover:text-danger">
            ✕
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-2">
        {mention && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1.5 w-full max-w-[280px] overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <div className="border-b border-surface-muted px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
              Mention someone
            </div>
            {filteredMembers.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickMention(m)}
                className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left ${idx === mentionHi ? 'bg-accent/10' : ''}`}
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[9.5px] font-bold text-white">
                  {memberInitials(m)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold text-ink-900">
                    {m.first_name} {m.last_name}
                  </span>
                  <span className="block text-[10px] text-ink-500">{m.username}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setShowToolbar((v) => !v)}
          title="Formatting"
          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${showToolbar ? 'bg-accent/15 text-accent-dark' : 'text-ink-500 hover:bg-surface-muted'}`}
        >
          Aa
        </button>

        {showAttach && (
          <>
            <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach a file"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-surface-muted"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          </>
        )}

        <div
          ref={editorRef}
          contentEditable
          data-placeholder={placeholder}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="rich-editor input max-h-36 min-h-[44px] flex-1 overflow-y-auto !rounded-2xl py-2.5 text-[13.5px] leading-relaxed"
        />

        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-shrink-0 text-[11.5px] font-semibold text-ink-500 hover:text-ink-900">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (isEmpty && !file)}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink disabled:opacity-50"
          aria-label={submitLabel}
        >
          {submitLabel === 'Send' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      </div>

      {/* Below the input, not above — a formatting toolbar sitting right
          above the box collided with the browser's native selection
          popup (copy/cut/paste), which also renders just above selected
          text. Below leaves that space clear. */}
      {showToolbar && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1.5">
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('bold')} className="fmt-toolbar-btn font-bold" title="Bold">B</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('italic')} className="fmt-toolbar-btn italic" title="Italic">I</button>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('underline')} className="fmt-toolbar-btn underline" title="Underline">U</button>
          <span className="mx-1 h-4 w-px bg-border" />
          {COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyColor(c.hex)}
              className="h-4 w-4 rounded-full ring-1 ring-border"
              style={{ background: c.hex }}
            />
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applySize(-1)} className="fmt-toolbar-btn" title="Smaller">A−</button>
          <span className="text-[10.5px] font-semibold text-ink-500">{Math.round(SIZE_STEPS[sizeIndex] * 100)}%</span>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => applySize(1)} className="fmt-toolbar-btn" title="Bigger">A+</button>
        </div>
      )}
    </div>
  );
}

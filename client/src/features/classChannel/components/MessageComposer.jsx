import { useRef, useState } from 'react';
import { wrapSelection, insertMention, activeMentionQuery } from '../../../lib/richTextMarkup';

const COLORS = [
  { hex: '#191924', label: 'Default' },
  { hex: '#B91C1C', label: 'Red' },
  { hex: '#15803D', label: 'Green' },
  { hex: '#1D4ED8', label: 'Blue' },
  { hex: '#A21CAF', label: 'Purple' }
];
const SIZE_STEPS = [0.85, 1, 1.15, 1.3, 1.45];

function memberInitials(m) {
  return `${m.first_name?.[0] || ''}${m.last_name?.[0] || ''}`.toUpperCase();
}

// Shared by "new post", "reply", and "edit" — a plain <textarea> (not
// contentEditable) driving a small custom markup language that the
// toolbar wraps the current selection with, converted to sanitized HTML on
// submit (see lib/richTextMarkup.js). A textarea was chosen over a rich
// contentEditable box specifically for reliability: selection/formatting
// state on a textarea is just string + index math, with none of
// contentEditable's cross-browser Range/Selection quirks.
export function MessageComposer({
  members = [],
  initialText = '',
  placeholder = 'Message this class…',
  onSubmit,
  onCancel,
  submitLabel = 'Send',
  showAttach = true,
  autoFocus = false
}) {
  const [text, setText] = useState(initialText);
  const [file, setFile] = useState(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [sizeIndex, setSizeIndex] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [mention, setMention] = useState(null); // { start, query }
  const [mentionHi, setMentionHi] = useState(0);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const filteredMembers = mention
    ? members
        .filter((m) => {
          const q = mention.query.toLowerCase();
          return (
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
            m.username.toLowerCase().includes(q)
          );
        })
        .slice(0, 6)
    : [];

  function applyResult(result) {
    if (!result) return;
    setText(result.value);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(result.selectionStart, result.selectionEnd);
      }
    });
  }

  function handleInput(e) {
    const value = e.target.value;
    setText(value);
    const caret = e.target.selectionStart;
    const active = activeMentionQuery(value, caret);
    setMention(active);
    setMentionHi(0);
  }

  function pickMention(member) {
    const el = textareaRef.current;
    if (!el || !mention) return;
    const result = insertMention(el, mention.start, member.id, `${member.first_name} ${member.last_name}`);
    setMention(null);
    applyResult(result);
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function fmt(kind) {
    const el = textareaRef.current;
    if (!el) return;
    if (kind === 'bold') applyResult(wrapSelection(el, '**', '**'));
    else if (kind === 'italic') applyResult(wrapSelection(el, '*', '*'));
    else if (kind === 'underline') applyResult(wrapSelection(el, '__', '__'));
  }

  function applyColor(hex) {
    const el = textareaRef.current;
    if (!el) return;
    applyResult(wrapSelection(el, `[[c:${hex}]]`, '[[/c]]'));
  }

  function applySize(dir) {
    const nextIndex = Math.min(SIZE_STEPS.length - 1, Math.max(0, sizeIndex + dir));
    setSizeIndex(nextIndex);
    const el = textareaRef.current;
    if (!el) return;
    applyResult(wrapSelection(el, `[[s:${SIZE_STEPS[nextIndex]}]]`, '[[/s]]'));
  }

  function handleFileChange(e) {
    const picked = e.target.files?.[0];
    if (picked) setFile(picked);
    e.target.value = '';
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!text.trim() && !file) return;
    setSubmitting(true);
    try {
      await onSubmit({ text: text.trim(), file });
      setText('');
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

      {showToolbar && (
        <div className="mb-1.5 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface p-1.5">
          <button type="button" onClick={() => fmt('bold')} className="fmt-toolbar-btn font-bold" title="Bold">B</button>
          <button type="button" onClick={() => fmt('italic')} className="fmt-toolbar-btn italic" title="Italic">I</button>
          <button type="button" onClick={() => fmt('underline')} className="fmt-toolbar-btn underline" title="Underline">U</button>
          <span className="mx-1 h-4 w-px bg-border" />
          {COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              onClick={() => applyColor(c.hex)}
              className="h-4 w-4 rounded-full ring-1 ring-border"
              style={{ background: c.hex }}
            />
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          <button type="button" onClick={() => applySize(-1)} className="fmt-toolbar-btn" title="Smaller">A−</button>
          <span className="text-[10.5px] font-semibold text-ink-500">{Math.round(SIZE_STEPS[sizeIndex] * 100)}%</span>
          <button type="button" onClick={() => applySize(1)} className="fmt-toolbar-btn" title="Bigger">A+</button>
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
                <path strokeLinecap="round" d="M21 15V6a2 2 0 00-2-2H8L2 12l6 8h11a2 2 0 002-2v-3" />
                <path strokeLinecap="round" d="M7 8l4 4-4 4" />
              </svg>
            </button>
          </>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          autoFocus={autoFocus}
          className="input max-h-24 min-h-[36px] flex-1 !rounded-2xl py-2 text-[12.5px] leading-relaxed"
        />

        {onCancel && (
          <button type="button" onClick={onCancel} className="flex-shrink-0 text-[11.5px] font-semibold text-ink-500 hover:text-ink-900">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (!text.trim() && !file)}
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
    </div>
  );
}

// Finds an in-progress "@query" ending at the given caret offset within a
// plain-text string, if any — used by the Class chat composer to decide
// whether to show/update the @mention dropdown on every keystroke. Works
// against plain text regardless of whether that text came from a textarea
// value or a contentEditable's "text before caret" (see
// features/classChannel/components/MessageComposer.jsx).
export function activeMentionQuery(text, caret) {
  const uptoCaret = text.slice(0, caret);
  const at = uptoCaret.lastIndexOf('@');
  if (at === -1) return null;
  const between = uptoCaret.slice(at + 1);
  if (/[\s[\]]/.test(between)) return null; // whitespace/bracket ends the mention attempt
  return { start: at, query: between };
}

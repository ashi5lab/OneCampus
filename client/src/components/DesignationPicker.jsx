const LABELS = { principal: 'Principal', vice_principal: 'Vice Principal' };

// Inline "None / Principal / Vice Principal" select used on both the
// Teachers and Staff tables — each designation has a single tenant-wide
// holder (see server/lib/designation.js), so picking one here clears it
// from wherever it currently sits, including the other roster.
export function DesignationPicker({ value, onChange, disabled = false }) {
  return (
    <select
      className="rounded border border-border bg-surface px-2 py-1 text-[12px] font-semibold text-ink-700"
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">—</option>
      <option value="principal">{LABELS.principal}</option>
      <option value="vice_principal">{LABELS.vice_principal}</option>
    </select>
  );
}

export function designationLabel(value) {
  return LABELS[value] || '—';
}

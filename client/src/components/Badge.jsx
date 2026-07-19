const VARIANT_CLASSES = {
  active: 'text-success',
  pending: 'text-accent-dark',
  inactive: 'text-danger'
};

const DOT_CLASSES = {
  active: 'bg-success',
  pending: 'bg-accent',
  inactive: 'bg-danger'
};

// Status indicator: a small colored dot + colored text, not a filled pill —
// matches the redesign mock's minimal treatment for Active/Present/Absent
// etc. Role/tag badges (e.g. "School Head") are hand-rolled with their own
// filled-pill style where they're used, not this component.
export function Badge({ variant = 'active', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.active}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[variant] || DOT_CLASSES.active}`} />
      {children}
    </span>
  );
}

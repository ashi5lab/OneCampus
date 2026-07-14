const VARIANT_CLASSES = {
  active: 'bg-success/15 text-success',
  pending: 'bg-accent/20 text-accent-dark',
  inactive: 'bg-danger/15 text-danger'
};

export function Badge({ variant = 'active', children }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold ${
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.active
      }`}
    >
      {children}
    </span>
  );
}

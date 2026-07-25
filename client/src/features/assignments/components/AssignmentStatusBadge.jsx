const STATUS_MAP = {
  draft:               { label: 'Draft',               cls: 'bg-ink-100 text-ink-600' },
  created:             { label: 'Created',             cls: 'bg-blue-100 text-blue-700' },
  grading_in_progress: { label: 'Grading In Progress', cls: 'bg-amber-100 text-amber-700' },
  completed:           { label: 'Completed',           cls: 'bg-green-100 text-green-700' },
};

export function AssignmentStatusBadge({ status }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: 'bg-ink-100 text-ink-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
}

export function PublishBadge({ published }) {
  return published ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      Published
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-500">
      Unpublished
    </span>
  );
}

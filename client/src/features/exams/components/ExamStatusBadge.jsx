const STATUS_MAP = {
  draft:               { label: 'Draft',              cls: 'bg-ink-100 text-ink-600' },
  created:             { label: 'Scheduled',          cls: 'bg-blue-100 text-blue-700' },
  grading_in_progress: { label: 'Grading',            cls: 'bg-amber-100 text-amber-700' },
  completed:           { label: 'Completed',          cls: 'bg-green-100 text-green-700' },
};

export function ExamStatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, cls: 'bg-ink-100 text-ink-600' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export function ExamPublishBadge({ published }) {
  return published ? (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      Published
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-ink-500">
      Unpublished
    </span>
  );
}

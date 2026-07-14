export function AttendanceBar({ percent }) {
  const hasValue = percent !== null && percent !== undefined;
  return (
    <div>
      <span>{hasValue ? `${percent}%` : '—'}</span>
      <div className="mt-1 h-[5px] w-[70px] overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-success"
          style={{ width: `${hasValue ? percent : 0}%` }}
        />
      </div>
    </div>
  );
}

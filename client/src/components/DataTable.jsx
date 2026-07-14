// Generic table chrome (per OneCampus_App_Specification.md Part 15 — table
// density/style is shared across all three themes). Callers supply columns
// with a render function per cell; this component owns none of the data.
export function DataTable({ columns, rows, rowKey, emptyMessage = 'No records found.' }) {
  if (rows.length === 0) {
    return <div className="p-8 text-center text-sm text-ink-500">{emptyMessage}</div>;
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key}
              className="border-b border-surface-muted bg-surface-muted px-5 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-ink-500"
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((col) => (
              <td
                key={col.key}
                className="border-b border-surface-muted px-5 py-3 align-middle text-[13.5px] text-ink-900 last:border-b-0"
              >
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

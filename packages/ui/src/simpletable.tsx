import { useMemo, useState, type ReactNode } from "react";

export interface SimpleColumn<R> { key: keyof R & string; label: string; numeric?: boolean; render?: (row: R) => ReactNode }

/** A small sortable table in the plain `.jp-table` markup. For a handful of static rows; use DataTable for anything editable or large. */
export function SimpleTable<R extends Record<string, string | number>>({ columns, rows, maxHeight, testId }: { columns: SimpleColumn<R>[]; rows: R[]; maxHeight?: string; testId?: string }) {
  const [sort, setSort] = useState<{ key: keyof R & string; dir: "ascending" | "descending" } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const m = sort.dir === "ascending" ? 1 : -1;
    return [...rows].sort((a, b) => { const x = a[sort.key], y = b[sort.key]; return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * m; });
  }, [rows, sort]);
  return (
    <div className="jp-table-wrap" style={maxHeight ? { maxHeight } : undefined} data-testid={testId}>
      <table className="jp-table">
        <thead><tr>{columns.map((c) => (
          <th key={c.key} className={c.numeric ? "jp-num" : undefined} aria-sort={sort?.key === c.key ? sort.dir : undefined} scope="col">
            <button type="button" data-testid={testId ? `${testId}-sort-${c.key}` : undefined} onClick={() => setSort((s) => ({ key: c.key, dir: s?.key === c.key && s.dir === "ascending" ? "descending" : "ascending" }))}>{c.label}</button>
          </th>))}</tr></thead>
        <tbody>{sorted.map((r, i) => <tr key={i} data-testid={testId ? `${testId}-row` : undefined}>{columns.map((c) => <td key={c.key} className={c.numeric ? "jp-num" : undefined}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

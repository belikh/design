// A plan as a grid: one row per person, lane or resource, one column per day or time slot, and at most one block in each cell.
// It is the shape of a staff roster, a lane rotation, a room booking sheet or an availability sheet. The row header and the column
// header stay in view while the grid scrolls. Cells are buttons when `onSelect` is given; the arrow keys move between them.
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "./Icon.tsx";
import type { Status } from "./kit.tsx";
import "./styles/planner.css";

export type PlanBlock = {
  /** Short mono code shown first: "E", "PVS", "OFF". */ code: string;
  /** Text after the code: a time range, a lane, a name. Hidden when the planner is `compact`. */ label?: string;
  /** Categorical colour 1 to 8 (`--adm-c1..c8`) for the leading bar. It names a kind and never a status. */ series?: number;
  /** A status on this block. Always give `note` with it, so the status is not carried by colour alone. */ tone?: Status;
  /** What the tone means here: "Rest 9 h 30 min, minimum is 10 h". Shown as the tooltip and read out. */ note?: string;
  /** A block that is the absence of work (off, leave, break): no bar, muted text. */ quiet?: boolean;
  /** Not final yet (a draft, an offer, a pending change): dashed outline. */ pending?: boolean;
};
export type PlanColumn = { id: string; label: string; /** Second line of the header: a date, a count. */ sub?: string; /** Adjacent columns with the same group share a header cell above them. */ group?: string; /** The current day or slot. */ now?: boolean; /** A column outside the working set (weekend, closed hours). */ muted?: boolean };
export type PlanRow = { id: string; /** Plain name, used in the cell's accessible name. */ name: string; /** Shown in the row header instead of `name`. */ label?: ReactNode; /** Second line of the row header. */ sub?: ReactNode };
export type PlanSummary = { label: string; cell: (col: PlanColumn) => ReactNode };

const TONE_ICON: Record<Status, string> = { ok: "success", info: "info", warn: "alert", danger: "alert" };
const TONE_WORD: Record<Status, string> = { ok: "OK", info: "Note", warn: "Warning", danger: "Problem" };

/** One block on its own, for a list, a drawer or a legend. */
export function PlanChip({ block, compact }: { block: PlanBlock; compact?: boolean }) {
  return (
    <span className={`adm-planblock${block.quiet ? " is-quiet" : ""}${block.pending ? " is-pending" : ""}`} data-series={block.quiet ? undefined : block.series} data-tone={block.tone} title={block.note}>
      <b>{block.code}</b>
      {!compact && block.label && <span>{block.label}</span>}
      {block.tone && <><Icon name={TONE_ICON[block.tone]} size={12} /><span className="adm-sr">{TONE_WORD[block.tone]}{block.note ? `: ${block.note}` : ""}</span></>}
    </span>
  );
}

/** The key to the codes and colours used in a planner. */
export function PlanLegend({ items, label = "Key" }: { items: { block: PlanBlock; text: string }[]; label?: string }) {
  return <ul className="adm-planlegend" aria-label={label}>{items.map((i) => <li key={i.block.code + i.text}><PlanChip block={i.block} compact /><span>{i.text}</span></li>)}</ul>;
}

export function Planner({ columns, rows, cell, onSelect, selected, summary = [], ariaLabel, rowHeader = "", compact, maxHeight, emptyLabel = "Empty" }: {
  columns: PlanColumn[]; rows: PlanRow[];
  /** The block in a cell, or nothing for an empty cell. */ cell: (row: PlanRow, col: PlanColumn) => PlanBlock | null | undefined;
  /** Makes every cell a button. Called for empty cells too, so a block can be added. */ onSelect?: (row: PlanRow, col: PlanColumn) => void;
  selected?: { row: string; col: string } | null;
  /** Rows under the grid, one value per column: a coverage count, a demand figure, a gap. */ summary?: PlanSummary[];
  ariaLabel: string; /** Heading of the row header column: "Staff", "Lane". */ rowHeader?: string;
  /** Show only the code in each block, for many narrow columns. */ compact?: boolean;
  /** CSS max-height of the scroll area, e.g. "70dvh". The headers stay in view. */ maxHeight?: string;
  /** Accessible name of an empty cell. */ emptyLabel?: string;
}) {
  const ref = useRef<HTMLTableElement>(null);
  const groups: { label: string; span: number }[] = [];
  for (const c of columns) { const g = c.group ?? ""; const last = groups[groups.length - 1]; if (last && last.label === g) last.span++; else groups.push({ label: g, span: 1 }); }
  const hasGroups = columns.some((c) => c.group);
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
    const to = e.key === "ArrowRight" ? [r, c + 1] : e.key === "ArrowLeft" ? [r, c - 1] : e.key === "ArrowDown" ? [r + 1, c] : e.key === "ArrowUp" ? [r - 1, c] : e.key === "Home" ? [r, 0] : e.key === "End" ? [r, columns.length - 1] : null;
    if (!to) return;
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl" && (e.key === "ArrowRight" || e.key === "ArrowLeft");
    const tc = rtl ? c - (to[1] - c) : to[1];
    const el = ref.current?.querySelector<HTMLButtonElement>(`[data-cell="${to[0]}:${tc}"]`);
    if (el) { e.preventDefault(); el.focus(); }
  };
  const sel = selected ?? null; const first = sel ? null : "0:0";
  return (
    <div className="adm-planner-wrap" style={maxHeight ? { maxHeight } : undefined}>
      <table ref={ref} className={`adm-planner${compact ? " adm-planner--compact" : ""}`} aria-label={ariaLabel}>
        <thead>
          {hasGroups && <tr className="adm-planner__groups"><td />{groups.map((g, i) => <th key={i} colSpan={g.span} scope="colgroup">{g.label}</th>)}</tr>}
          <tr>
            <th scope="col" className="adm-planner__corner">{rowHeader}</th>
            {columns.map((c) => <th key={c.id} scope="col" className={`${c.now ? "is-now" : ""}${c.muted ? " is-muted" : ""}`} aria-current={c.now ? "date" : undefined}><span>{c.label}</span>{c.sub && <> <small>{c.sub}</small></>}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={r.id}>
              <th scope="row"><span className="adm-planner__name">{r.label ?? r.name}</span>{r.sub && <small>{r.sub}</small>}</th>
              {columns.map((c, ci) => {
                const b = cell(r, c); const on = sel?.row === r.id && sel.col === c.id; const key = `${ri}:${ci}`;
                const inner = b ? <PlanChip block={b} compact={compact} /> : <span className="adm-planner__none" aria-hidden>·</span>;
                return (
                  <td key={c.id} className={`${c.now ? "is-now" : ""}${c.muted ? " is-muted" : ""}`}>
                    {onSelect
                      ? <button type="button" data-cell={key} tabIndex={on || key === first ? 0 : -1} aria-pressed={on} aria-label={`${r.name}, ${c.label}${c.sub ? ` ${c.sub}` : ""}: ${b ? `${b.code}${b.label ? ` ${b.label}` : ""}${b.note ? `. ${b.note}` : ""}` : emptyLabel}`} onClick={() => onSelect(r, c)} onKeyDown={(e) => onKey(e, ri, ci)}>{inner}</button>
                      : inner}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {summary.length > 0 && (
          <tfoot>{summary.map((s) => <tr key={s.label}><th scope="row">{s.label}</th>{columns.map((c) => <td key={c.id} className={`${c.now ? "is-now" : ""}${c.muted ? " is-muted" : ""}`}>{s.cell(c)}</td>)}</tr>)}</tfoot>
        )}
      </table>
    </div>
  );
}

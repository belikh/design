export type Edit = { text: string; start: number; end: number };
/** Wrap the selection (or insert a placeholder) with before/after markers; used by the Markdown toolbar. */
export function wrap(text: string, start: number, end: number, before: string, after = before, placeholder = "text"): Edit {
  const sel = text.slice(start, end) || placeholder; const out = text.slice(0, start) + before + sel + after + text.slice(end);
  return { text: out, start: start + before.length, end: start + before.length + sel.length };
}
/** Prefix every selected line (headings, lists, quotes). Toggles off if all lines already have the prefix. */
export function prefixLines(text: string, start: number, end: number, prefix: string): Edit {
  const ls = text.lastIndexOf("\n", start - 1) + 1; const le = text.indexOf("\n", end); const e = le < 0 ? text.length : le; const block = text.slice(ls, e).split("\n");
  const all = block.every((l) => l.startsWith(prefix)); const next = block.map((l) => (all ? l.slice(prefix.length) : prefix + l)).join("\n");
  return { text: text.slice(0, ls) + next + text.slice(e), start: ls, end: ls + next.length };
}
export const stats = (t: string) => { const words = (t.match(/\S+/g) ?? []).length; return { words, chars: t.length, minutes: Math.max(1, Math.round(words / 220)) }; };
export const headings = (md: string) => md.split("\n").flatMap((l) => { const m = /^(#{1,3})\s+(.*)/.exec(l); return m ? [{ level: m[1].length, text: m[2], id: m[2].toLowerCase().replace(/[^\w]+/g, "-") }] : []; });

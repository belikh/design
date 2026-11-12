import { runSql, type Row, type SqlResult } from "../../tools/lib/sql.ts";

const regions = ["North", "South", "East", "West"], products = ["Hub", "Sensor", "Gateway", "Camera"], status = ["paid", "paid", "paid", "refunded", "pending"];
export const TABLES: Record<string, Row[]> = {
  orders: Array.from({ length: 96 }, (_, i) => ({ id: i + 1, region: regions[(i * 7) % 4], product: products[(i * 5 + (i >> 2)) % 4], month: ["Jul", "Aug", "Sep", "Oct", "Nov"][i % 5], amount: 40 + ((i * 37) % 260) + (i % 4) * 15, status: status[(i * 3) % 5] })),
  devices: Array.from({ length: 24 }, (_, i) => ({ id: i + 1, name: `dev-${String(i + 1).padStart(2, "0")}`, site: ["Hobart", "Perth", "Cairns"][i % 3], online: i % 7 !== 0, battery: 30 + ((i * 17) % 70) })),
};
export type CellKind = "text" | "query" | "chart";
export type NbCell = { id: string; kind: CellKind; source: string; from?: string; x?: string; y?: string; result?: SqlResult; error?: string; ranAt?: number };
export const SEED_CELLS: NbCell[] = [
  { id: "c1", kind: "text", source: "# Q4 order review\nA quick look at **order volume** by region.\n- Data: the `orders` table (96 rows)\n- Run the query, then chart it" },
  { id: "c2", kind: "query", source: "select region, count(*) as orders, round(sum(amount), 2) as revenue\nfrom orders\nwhere status = 'paid'\ngroup by region\norder by revenue desc" },
  { id: "c3", kind: "chart", source: "Revenue by region", from: "c2", x: "region", y: "revenue" },
];
export const runCell = (c: NbCell): NbCell => {
  try { return { ...c, result: runSql(c.source, TABLES), error: undefined, ranAt: Date.now() }; } catch (e) { return { ...c, result: undefined, error: (e as Error).message, ranAt: Date.now() }; }
};
/** Inline markdown subset: **bold**, `code`. Returns tokens so the page can render without innerHTML. */
export type Inline = { t: "b" | "c" | "s"; v: string };
export function inline(s: string): Inline[] {
  const out: Inline[] = []; const re = /\*\*(.+?)\*\*|`(.+?)`/g; let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) { if (m.index > last) out.push({ t: "s", v: s.slice(last, m.index) }); out.push(m[1] ? { t: "b", v: m[1] } : { t: "c", v: m[2] }); last = m.index + m[0].length; }
  if (last < s.length) out.push({ t: "s", v: s.slice(last) });
  return out;
}
export type Block = { k: "h1" | "h2" | "p" | "li"; text: string };
export function blocks(src: string): Block[] {
  return src.split("\n").filter((l) => l.trim()).map((l) => (l.startsWith("## ") ? { k: "h2" as const, text: l.slice(3) } : l.startsWith("# ") ? { k: "h1" as const, text: l.slice(2) } : /^[-*] /.test(l) ? { k: "li" as const, text: l.slice(2) } : { k: "p" as const, text: l }));
}

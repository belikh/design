// Visual query builder → SQL text (then executed by the same SQL engine as the console).
export type Cond = { col: string; op: string; value: string };
export type Spec = { table: string; cols: string[]; conds: Cond[]; join: "and" | "or"; groupBy: string; aggFn: string; aggCol: string; orderBy: string; desc: boolean; limit: number };
const q = (v: string) => (v.trim() !== "" && !Number.isNaN(Number(v)) ? v.trim() : `'${v.replace(/'/g, "''")}'`);
export function buildSql(s: Spec): string {
  const where = s.conds.filter((c) => c.col && (c.op === "is null" || c.op === "is not null" || c.value !== "")).map((c) => (c.op === "is null" || c.op === "is not null" ? `${c.col} ${c.op}` : c.op === "in" ? `${c.col} in (${c.value.split(",").map((x) => q(x.trim())).join(", ")})` : c.op === "like" ? `${c.col} like ${q(c.value.includes("%") ? c.value : `%${c.value}%`)}` : `${c.col} ${c.op} ${q(c.value)}`));
  let select: string;
  if (s.groupBy) select = [s.groupBy, ...(s.aggFn ? [`${s.aggFn}(${s.aggFn === "count" && !s.aggCol ? "*" : s.aggCol || "*"}) as ${s.aggFn}_${(s.aggCol || "all").replace(/\W/g, "")}`] : ["count(*) as count_all"])].join(", ");
  else if (s.aggFn) select = `${s.aggFn}(${s.aggCol || "*"}) as ${s.aggFn}_${(s.aggCol || "all").replace(/\W/g, "")}`;
  else select = s.cols.length ? s.cols.join(", ") : "*";
  return [`select ${select}`, `from ${s.table}`, where.length ? `where ${where.join(` ${s.join} `)}` : "", s.groupBy ? `group by ${s.groupBy}` : "", s.orderBy ? `order by ${s.orderBy}${s.desc ? " desc" : ""}` : "", s.limit ? `limit ${s.limit}` : ""].filter(Boolean).join("\n");
}

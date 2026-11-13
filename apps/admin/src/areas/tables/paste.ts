// Bulk paste: parse spreadsheet text, map columns to fields and validate every cell before import.
export type FieldDef = { key: string; label: string; required?: boolean; type?: "text" | "int" | "number" | "date" | "enum" | "email"; options?: string[]; min?: number; max?: number; unique?: boolean; pattern?: RegExp; patternMsg?: string };
export type Parsed = { values: string[]; errors: (string | null)[] };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
/** Map each field to a pasted column index by header name (or by position when there is no header row). Returns -1 when missing. */
export function mapColumns(first: string[], fields: FieldDef[]): { map: number[]; hasHeader: boolean } {
  const hits = fields.map((f) => first.findIndex((h) => norm(h) === norm(f.label) || norm(h) === norm(f.key)));
  const hasHeader = hits.filter((i) => i >= 0).length >= Math.max(2, Math.ceil(fields.length / 2));
  return hasHeader ? { map: hits, hasHeader } : { map: fields.map((_, i) => (i < first.length ? i : -1)), hasHeader };
}
export function validateCell(f: FieldDef, raw: string, seen: Set<string>, existing: Set<string>): string | null {
  const v = raw.trim();
  if (!v) return f.required ? "Required" : null;
  switch (f.type) {
    case "int": if (!/^-?\d+$/.test(v)) return "Whole number expected"; break;
    case "number": if (!Number.isFinite(Number(v.replace(/[$,]/g, "")))) return "Number expected"; break;
    case "date": if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) return "Use YYYY-MM-DD"; break;
    case "email": if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "Invalid email"; break;
    case "enum": if (!f.options?.some((o) => o.toLowerCase() === v.toLowerCase())) return `One of: ${f.options?.join(", ")}`; break;
  }
  if (f.type === "int" || f.type === "number") { const n = Number(v.replace(/[$,]/g, "")); if (f.min !== undefined && n < f.min) return `Minimum ${f.min}`; if (f.max !== undefined && n > f.max) return `Maximum ${f.max}`; }
  if (f.pattern && !f.pattern.test(v)) return f.patternMsg ?? "Wrong format";
  if (f.unique) { const k = v.toLowerCase(); if (existing.has(k)) return "Already exists"; if (seen.has(k)) return "Duplicate in paste"; }
  return null;
}
export function validateRows(rows: string[][], map: number[], fields: FieldDef[], existing: Set<string> = new Set()): Parsed[] {
  const seen = new Map<string, Set<string>>(fields.filter((f) => f.unique).map((f) => [f.key, new Set<string>()]));
  return rows.map((row) => { const values = fields.map((_, i) => (map[i] >= 0 ? row[map[i]] ?? "" : "")); const errors = fields.map((f, i) => { const e = validateCell(f, values[i], seen.get(f.key) ?? new Set(), f.unique ? existing : new Set()); if (f.unique && values[i].trim()) seen.get(f.key)!.add(values[i].trim().toLowerCase()); return e; }); return { values, errors }; });
}
export const isValid = (p: Parsed) => p.errors.every((e) => !e);

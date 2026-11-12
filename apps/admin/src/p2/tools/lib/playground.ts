export type Seg = { text: string; match?: number };
export type RegexResult = { segments: Seg[]; matches: { index: number; text: string; groups: (string | undefined)[]; named: Record<string, string> }[]; error?: string; truncated?: boolean };
export const MAX_TEXT = 20000, MAX_PATTERN = 500, MAX_MATCHES = 500;
/** Run a regex against text and split the text into matched/unmatched segments for highlighting. Inputs are size-limited. */
export function runRegex(pattern: string, flags: string, text: string): RegexResult {
  if (pattern === "") return { segments: [{ text }], matches: [] };
  if (pattern.length > MAX_PATTERN) return { segments: [{ text }], matches: [], error: `Pattern is too long (max ${MAX_PATTERN} characters)` };
  if (text.length > MAX_TEXT) return { segments: [{ text }], matches: [], error: `Test text is too long (max ${MAX_TEXT} characters)` };
  let re: RegExp; try { re = new RegExp(pattern, [...new Set((flags + "g").split(""))].join("")); } catch (e) { return { segments: [{ text }], matches: [], error: e instanceof Error ? e.message.replace(/^Invalid regular expression: /, "") : "Invalid pattern" }; }
  const matches: RegexResult["matches"] = []; const segments: Seg[] = []; let last = 0, truncated = false;
  for (const m of text.matchAll(re)) {
    if (matches.length >= MAX_MATCHES) { truncated = true; break; } const i = m.index ?? 0; if (i > last) segments.push({ text: text.slice(last, i) });
    if (m[0] === "") { matches.push({ index: i, text: "", groups: m.slice(1), named: { ...(m.groups ?? {}) } }); continue; }
    segments.push({ text: m[0], match: matches.length }); matches.push({ index: i, text: m[0], groups: m.slice(1), named: { ...(m.groups ?? {}) } }); last = i + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) }); return { segments, matches, truncated };
}
export function regexReplace(pattern: string, flags: string, text: string, repl: string): string | null { try { return text.replace(new RegExp(pattern, flags), repl); } catch { return null; } }
export const REGEX_PRESETS: { name: string; pattern: string; flags: string; text: string }[] = [
  { name: "Email addresses", pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.]+", flags: "g", text: "Contact ava@example.com or noah.smith@jupiter.au.\nNot an email: ava@ or @example.com" },
  { name: "ISO dates (named groups)", pattern: "(?<y>\\d{4})-(?<m>\\d{2})-(?<d>\\d{2})", flags: "g", text: "Released 2026-11-12, patched 2026-11-18, next 2027-01-05." },
  { name: "IPv4 addresses", pattern: "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b", flags: "g", text: "gateway 10.1.1.1, nas 10.1.10.30, bad 999.1.1" },
  { name: "Log levels", pattern: "^(ERROR|WARN).*$", flags: "gm", text: "INFO  started\nWARN  disk at 83%\nERROR pxe-boot timed out\nDEBUG tick" },
];
export const SAMPLE_JSON = JSON.stringify({ store: { book: [{ title: "Sayings of the Century", category: "reference", price: 8.95 }, { title: "Moby Dick", category: "fiction", price: 12.99, isbn: "0-553-21311-3" }, { title: "The Lord of the Rings", category: "fiction", price: 22.99 }], bicycle: { color: "red", price: 19.95 } }, expensive: 10 }, null, 2);

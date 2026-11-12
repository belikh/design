// Pure text/format helpers: masks and validators, generators, markdown editing helpers, mention/slash tokens.
import { sha256, b64decode, b64encodeNoPad } from "./sha.ts";

/* ---------- masks ---------- */
/** Apply a mask: # = digit, A = letter, * = letter or digit, anything else is a literal. Returns formatted text and the raw characters. */
export function applyMask(input: string, mask: string): { text: string; raw: string; complete: boolean } {
  const chars = input.replace(/[^A-Za-z0-9]/g, ""); let ci = 0, text = "", raw = "";
  for (const m of mask) {
    if (m === "#" || m === "A" || m === "*") {
      let c: string | undefined; while (ci < chars.length) { const x = chars[ci++]; if (m === "#" ? /\d/.test(x) : m === "A" ? /[A-Za-z]/.test(x) : true) { c = x; break; } }
      if (c === undefined) break; text += m === "A" ? c.toUpperCase() : c; raw += c;
    } else if (ci < chars.length) text += m; else break;
  }
  return { text, raw, complete: raw.length === [...mask].filter((x) => "#A*".includes(x)).length };
}
export function luhn(digits: string): boolean { const d = digits.replace(/\D/g, ""); if (d.length < 12) return false; let sum = 0; for (let i = 0; i < d.length; i++) { let n = Number(d[d.length - 1 - i]); if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; } return sum % 10 === 0; }
export function cardBrand(d: string): "visa" | "mastercard" | "amex" | "unknown" { const s = d.replace(/\D/g, ""); if (/^4/.test(s)) return "visa"; if (/^(5[1-5]|2[2-7])/.test(s)) return "mastercard"; if (/^3[47]/.test(s)) return "amex"; return "unknown"; }
export function formatCard(v: string): string { const d = v.replace(/\D/g, "").slice(0, cardBrand(v) === "amex" ? 15 : 16); return cardBrand(v) === "amex" ? [d.slice(0, 4), d.slice(4, 10), d.slice(10)].filter(Boolean).join(" ") : (d.match(/.{1,4}/g) ?? []).join(" "); }
export function ibanValid(v: string): boolean { const s = v.replace(/\s/g, "").toUpperCase(); if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false; const r = s.slice(4) + s.slice(0, 4); let rem = 0; for (const ch of r) { const n = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55); for (const dgt of n) rem = (rem * 10 + Number(dgt)) % 97; } return rem === 1; }
export const formatIban = (v: string) => (v.replace(/\s/g, "").toUpperCase().match(/.{1,4}/g) ?? []).join(" ");
export const formatBsb = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 6); return d.length > 3 ? `${d.slice(0, 3)}-${d.slice(3)}` : d; };
export const bsbValid = (v: string) => /^\d{3}-\d{3}$/.test(formatBsb(v)) && formatBsb(v).length === 7;
export function abnValid(v: string): boolean { const d = v.replace(/\D/g, ""); if (d.length !== 11) return false; const w = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]; const n = d.split("").map(Number); n[0] -= 1; return n.reduce((a, x, i) => a + x * w[i], 0) % 89 === 0; }
export const formatAbn = (v: string) => { const d = v.replace(/\D/g, "").slice(0, 11); return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 11)].filter(Boolean).join(" "); };

/* ---------- generators ---------- */
function rnd(n: number): number { const c = (globalThis as { crypto?: Crypto }).crypto; if (c?.getRandomValues) { const a = new Uint32Array(1); const lim = Math.floor(2 ** 32 / n) * n; let x: number; do { c.getRandomValues(a); x = a[0]; } while (x >= lim); return x % n; } return Math.floor(Math.random() * n); }
export type PwOptions = { length: number; upper: boolean; lower: boolean; digits: boolean; symbols: boolean; avoidAmbiguous: boolean };
export function generatePassword(o: PwOptions, pick: (n: number) => number = rnd): string {
  const amb = /[O0Il1|`'"]/g; const sets = [o.upper && "ABCDEFGHIJKLMNOPQRSTUVWXYZ", o.lower && "abcdefghijklmnopqrstuvwxyz", o.digits && "0123456789", o.symbols && "!@#$%^&*()-_=+[]{};:,.?"].filter(Boolean).map((s) => (o.avoidAmbiguous ? (s as string).replace(amb, "") : (s as string)));
  if (!sets.length) return ""; const all = sets.join(""); const out: string[] = sets.map((s) => s[pick(s.length)]); while (out.length < o.length) out.push(all[pick(all.length)]);
  for (let i = out.length - 1; i > 0; i--) { const j = pick(i + 1); [out[i], out[j]] = [out[j], out[i]]; } return out.slice(0, Math.max(o.length, sets.length)).join("");
}
export const entropyBits = (pw: string) => { if (!pw) return 0; let pool = 0; if (/[a-z]/.test(pw)) pool += 26; if (/[A-Z]/.test(pw)) pool += 26; if (/\d/.test(pw)) pool += 10; if (/[^A-Za-z0-9]/.test(pw)) pool += 28; return Math.round(pw.length * Math.log2(pool || 1)); };
export function recoveryCodes(n = 10, pick: (k: number) => number = rnd): string[] { const A = "abcdefghjkmnpqrstuvwxyz23456789"; return Array.from({ length: n }, () => { const g = () => Array.from({ length: 4 }, () => A[pick(A.length)]).join(""); return `${g()}-${g()}`; }); }
export function randomBase32(len = 16, pick: (k: number) => number = rnd): string { const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; return Array.from({ length: len }, () => A[pick(32)]).join(""); }
export const otpauthUri = (issuer: string, account: string, secret: string) => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
export function generateApiKey(prefix = "jp_live", pick: (k: number) => number = rnd): string { const A = "abcdef0123456789"; return `${prefix}_${Array.from({ length: 32 }, () => A[pick(16)]).join("")}`; }
export const maskSecret = (s: string, keep = 4) => (s.length <= keep ? "•".repeat(s.length) : s.slice(0, s.indexOf("_", 3) + 1 || 0) + "•".repeat(Math.max(8, s.length - keep - (s.indexOf("_", 3) + 1))) + s.slice(-keep));

/* ---------- username / slug ---------- */
export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
export const TAKEN = ["admin", "root", "jupiter", "ava", "noah", "support", "api", "www", "billing", "status"];
export type Availability = { ok: boolean; reason?: string; suggestions: string[] };
export function checkUsername(name: string, taken: string[] = TAKEN): Availability {
  const s = name.trim().toLowerCase(); if (s.length < 3) return { ok: false, reason: "At least 3 characters", suggestions: [] }; if (!/^[a-z][a-z0-9_-]*$/.test(s)) return { ok: false, reason: "Start with a letter; use a-z, 0-9, - and _", suggestions: [] };
  if (taken.includes(s)) return { ok: false, reason: `“${s}” is taken`, suggestions: [`${s}1`, `${s}-au`, `${s}${(s.length * 7) % 90 + 10}`].filter((x) => !taken.includes(x)) }; return { ok: true, suggestions: [] };
}

/* ---------- markdown editing ---------- */
export type Sel = { start: number; end: number };
/** Wrap the selection with a prefix/suffix, or unwrap if already wrapped. Returns new text and selection. */
export function wrapSelection(text: string, sel: Sel, before: string, after = before): { text: string; sel: Sel } {
  const s = text.slice(sel.start, sel.end);
  if (text.slice(sel.start - before.length, sel.start) === before && text.slice(sel.end, sel.end + after.length) === after) return { text: text.slice(0, sel.start - before.length) + s + text.slice(sel.end + after.length), sel: { start: sel.start - before.length, end: sel.end - before.length } };
  return { text: text.slice(0, sel.start) + before + s + after + text.slice(sel.end), sel: { start: sel.start + before.length, end: sel.end + before.length } };
}
export function prefixLines(text: string, sel: Sel, prefix: string | ((i: number) => string)): { text: string; sel: Sel } {
  const a = text.lastIndexOf("\n", sel.start - 1) + 1; const bIdx = text.indexOf("\n", sel.end); const b = bIdx < 0 ? text.length : bIdx; const lines = text.slice(a, b).split("\n");
  const all = lines.every((l, i) => l.startsWith(typeof prefix === "string" ? prefix : prefix(i))); const out = lines.map((l, i) => { const p = typeof prefix === "string" ? prefix : prefix(i); return all ? l.slice(p.length) : p + l; }).join("\n");
  return { text: text.slice(0, a) + out + text.slice(b), sel: { start: a, end: a + out.length } };
}
export function sanitizeHtml(html: string): string {
  const allowed = new Set(["B", "STRONG", "I", "EM", "U", "S", "CODE", "PRE", "P", "BR", "UL", "OL", "LI", "H1", "H2", "H3", "A", "TABLE", "THEAD", "TBODY", "TR", "TH", "TD", "BLOCKQUOTE", "SPAN", "DIV", "HR"]);
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const walk = (node: Element) => { for (const c of [...node.children]) { if (!allowed.has(c.tagName)) { c.replaceWith(...[...c.childNodes]); continue; } for (const a of [...c.attributes]) { const keep = (c.tagName === "A" && a.name === "href" && /^(https?:|mailto:|#|\/)/i.test(a.value)) || (c.tagName === "SPAN" && a.name === "data-var") || (a.name === "contenteditable"); if (!keep) c.removeAttribute(a.name); } walk(c); } };
  walk(doc.body); return doc.body.innerHTML;
}
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const inl = (n: Node): string => [...n.childNodes].map((c) => {
    if (c.nodeType === 3) return c.textContent ?? ""; const e = c as Element; const t = e.tagName; const inner = inl(e);
    if (t === "B" || t === "STRONG") return `**${inner}**`; if (t === "I" || t === "EM") return `*${inner}*`; if (t === "S") return `~~${inner}~~`; if (t === "CODE") return `\`${inner}\``; if (t === "A") return `[${inner}](${e.getAttribute("href") ?? ""})`; if (t === "BR") return "\n"; if (t === "SPAN" && e.getAttribute("data-var")) return `{{${e.getAttribute("data-var")}}}`; return inner;
  }).join("");
  const blocks = [...doc.body.childNodes].map((c) => {
    if (c.nodeType === 3) return (c.textContent ?? "").trim(); const e = c as Element; const t = e.tagName;
    if (/^H[1-3]$/.test(t)) return `${"#".repeat(Number(t[1]))} ${inl(e)}`; if (t === "UL") return [...e.children].map((li) => `- ${inl(li)}`).join("\n"); if (t === "OL") return [...e.children].map((li, i) => `${i + 1}. ${inl(li)}`).join("\n");
    if (t === "BLOCKQUOTE") return `> ${inl(e)}`; if (t === "PRE") return "```\n" + (e.textContent ?? "") + "\n```"; if (t === "HR") return "---";
    if (t === "TABLE") { const rows = [...e.querySelectorAll("tr")].map((r) => [...r.children].map((x) => inl(x).trim())); if (!rows.length) return ""; return [`| ${rows[0].join(" | ")} |`, `| ${rows[0].map(() => "---").join(" | ")} |`, ...rows.slice(1).map((r) => `| ${r.join(" | ")} |`)].join("\n"); }
    return inl(e);
  });
  return blocks.filter((b) => b !== "").join("\n\n");
}
/** Find the active `@mention` or `/command` token at the caret. */
export function activeToken(text: string, caret: number): { trigger: "@" | "/"; query: string; start: number } | null {
  const before = text.slice(0, caret); const m = /(^|\s)([@/])([\w-]*)$/.exec(before); if (!m) return null;
  const start = caret - m[3].length - 1; if (m[2] === "/" && before.slice(0, start).trim() !== "" && !/\n\s*$/.test(before.slice(0, start)) && start !== 0) return { trigger: "/", query: m[3], start };
  return { trigger: m[2] as "@" | "/", query: m[3], start };
}
export function insertToken(text: string, tok: { start: number; query: string }, insert: string): { text: string; caret: number } { const end = tok.start + 1 + tok.query.length; const t = text.slice(0, tok.start) + insert + text.slice(end); return { text: t, caret: tok.start + insert.length }; }

/* ---------- ssh keys ---------- */
export type SshInfo = { type: string; bits?: number; fingerprint: string; comment: string; valid: boolean; error?: string };
const SSH_TYPES: Record<string, string> = { "ssh-ed25519": "ED25519", "ssh-rsa": "RSA", "ecdsa-sha2-nistp256": "ECDSA", "ecdsa-sha2-nistp384": "ECDSA", "ecdsa-sha2-nistp521": "ECDSA", "sk-ssh-ed25519@openssh.com": "ED25519-SK" };
export function parseSshKey(line: string): SshInfo {
  const parts = line.trim().split(/\s+/); const bad = (error: string): SshInfo => ({ type: parts[0] ?? "", fingerprint: "", comment: "", valid: false, error });
  if (parts.length < 2) return bad("Expected: <type> <base64> [comment]"); if (!SSH_TYPES[parts[0]]) return bad(`Unsupported key type “${parts[0]}”`);
  let blob: Uint8Array; try { blob = b64decode(parts[1]); } catch { return bad("The key data is not valid base64"); }
  const len = (blob[0] << 24) | (blob[1] << 16) | (blob[2] << 8) | blob[3]; const inner = new TextDecoder().decode(blob.slice(4, 4 + len)); if (inner !== parts[0]) return bad("The key data does not match its declared type");
  let bits: number | undefined; if (parts[0] === "ssh-ed25519") bits = 256; else if (parts[0] === "ssh-rsa") { let o = 4 + len; const el = (blob[o] << 24) | (blob[o + 1] << 16) | (blob[o + 2] << 8) | blob[o + 3]; o += 4 + el; const nl = (blob[o] << 24) | (blob[o + 1] << 16) | (blob[o + 2] << 8) | blob[o + 3]; bits = (nl - (blob[o + 4] === 0 ? 1 : 0)) * 8; }
  return { type: SSH_TYPES[parts[0]], bits, fingerprint: `SHA256:${b64encodeNoPad(sha256(blob))}`, comment: parts.slice(2).join(" "), valid: true };
}
/** Build a syntactically valid ssh-ed25519 public key line from 32 bytes (demo keys). */
export function demoEd25519(seed: number, comment: string): string { const type = new TextEncoder().encode("ssh-ed25519"); const key = Uint8Array.from({ length: 32 }, (_, i) => (seed * 31 + i * 17 + (i * i) % 7) & 255); const blob = [0, 0, 0, type.length, ...type, 0, 0, 0, 32, ...key]; return `ssh-ed25519 ${btoa(String.fromCharCode(...blob))} ${comment}`; }

/**
 * asciicast v2 (https://docs.asciinema.org/manual/asciicast/v2/): one JSON header line, then one JSON array per event,
 * `[seconds_since_start, code, data]`. `o` is output, `i` is input; `m` (marker) and `r` (resize) are kept but not rendered.
 * Times are held in integer milliseconds in memory and written as seconds with millisecond precision.
 */
export type Ev = { t: number; k: string; s: string };
export type CastHeader = { width: number; height: number; timestamp?: number; title?: string; env?: Record<string, string> };
export type Recording = { id: string; host: string; user: string; started: string; width: number; height: number; timestamp: number; title: string; events: Ev[] };

export const duration = (r: { events: Ev[] }) => (r.events.length ? r.events[r.events.length - 1].t : 0);

export function encodeCast(r: Recording): string {
  const header = { version: 2, width: r.width, height: r.height, timestamp: r.timestamp, title: r.title, env: { SHELL: "/bin/bash", TERM: "xterm-256color" } };
  return [JSON.stringify(header), ...r.events.map((e) => JSON.stringify([Math.round(e.t) / 1000, e.k, e.s]))].join("\n") + "\n";
}

export type DecodeResult = { ok: true; header: CastHeader; events: Ev[] } | { ok: false; error: string };

export function decodeCast(text: string): DecodeResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return { ok: false, error: "The file is empty." };
  let h: unknown;
  try { h = JSON.parse(lines[0]); } catch { return { ok: false, error: "Line 1 is not valid JSON: an asciicast file starts with a JSON header." }; }
  if (typeof h !== "object" || h === null || Array.isArray(h)) return { ok: false, error: "Line 1 must be a JSON object (the header)." };
  const hd = h as Record<string, unknown>;
  if (hd.version !== 2) return { ok: false, error: `Unsupported asciicast version ${String(hd.version)}; only version 2 is supported.` };
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : d);
  const header: CastHeader = { width: num(hd.width, 80), height: num(hd.height, 24), timestamp: typeof hd.timestamp === "number" ? hd.timestamp : undefined, title: typeof hd.title === "string" ? hd.title : undefined, env: typeof hd.env === "object" && hd.env ? (hd.env as Record<string, string>) : undefined };
  const events: Ev[] = [];
  let last = 0;
  for (let i = 1; i < lines.length; i++) {
    let e: unknown;
    try { e = JSON.parse(lines[i]); } catch { return { ok: false, error: `Line ${i + 1} is not valid JSON.` }; }
    if (!Array.isArray(e) || e.length < 3 || typeof e[0] !== "number" || typeof e[1] !== "string" || typeof e[2] !== "string") return { ok: false, error: `Line ${i + 1} must be [time, "o"|"i", "data"].` };
    if (!Number.isFinite(e[0]) || e[0] < 0) return { ok: false, error: `Line ${i + 1} has an invalid time.` };
    const t = Math.round(e[0] * 1000);
    if (t < last) return { ok: false, error: `Line ${i + 1}: time goes backwards (${e[0]}s).` };
    last = t; events.push({ t, k: e[1], s: e[2] });
  }
  return { ok: true, header, events };
}

export type Summary = { durationMs: number; events: number; keystrokes: number; outputBytes: number; castBytes: number; longestPauseMs: number };
const bytes = (s: string) => new TextEncoder().encode(s).length;

export function summarize(r: Recording): Summary {
  let keystrokes = 0, outputBytes = 0, longest = 0, prev = 0;
  for (const e of r.events) {
    if (e.k === "i") keystrokes += [...e.s].length; else if (e.k === "o") outputBytes += bytes(e.s);
    longest = Math.max(longest, e.t - prev); prev = e.t;
  }
  return { durationMs: duration(r), events: r.events.length, keystrokes, outputBytes, castBytes: bytes(encodeCast(r)), longestPauseMs: longest };
}

export const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${(n / 1024).toFixed(1)} kB` : `${n} B`);
export const fmtClock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

/** Collects events with times relative to the first call to `start`. `now` is injectable so tests are deterministic. */
export class Recorder {
  readonly events: Ev[] = [];
  private now: () => number; private t0: number;
  constructor(now: () => number = Date.now) { this.now = now; this.t0 = now(); }
  add(k: "o" | "i", s: string): void {
    if (!s) return;
    this.events.push({ t: Math.max(0, this.now() - this.t0), k, s });
  }
}

/** Build a Recording from header info + events. */
export function makeRecording(p: { id: string; host: string; user: string; started: string; timestamp: number; events: Ev[]; width?: number; height?: number; title?: string }): Recording {
  return { id: p.id, host: p.host, user: p.user, started: p.started, width: p.width ?? 80, height: p.height ?? 24, timestamp: p.timestamp, title: p.title ?? `${p.user}@${p.host}`, events: p.events };
}

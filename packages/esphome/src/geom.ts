/** Geometry shared by the SVG preview and the generated lambda, so the preview matches the device. */
export const FONT_SIZES = [12, 14, 16, 20, 28, 40] as const;
/** Largest available font that fits `px`; falls back to the smallest. */
export const fontFor = (px: number): 12 | 14 | 16 | 20 | 28 | 40 => ([...FONT_SIZES].reverse().find((s) => s <= px) ?? 12) as 12 | 14 | 16 | 20 | 28 | 40;
/** Monospace advance: JetBrains Mono is 0.6 em wide. */
export const textW = (chars: number, size: number) => Math.round(chars * size * 0.6);

export interface DropRow { y: number; hw: number; fill: boolean }
/** Scanlines of a water-drop: apex at `top`, bulb radius `r`, filled from the bottom up to `level` (0..1). */
export function dropRows(top: number, r: number, level: number): DropRow[] {
  const cyc = top + Math.floor(1.9 * r), bot = cyc + r, fillTo = bot - Math.floor(level * (bot - top));
  const rows: DropRow[] = [];
  for (let y = top; y <= bot; y++) {
    const hw = y < cyc ? Math.trunc(((y - top) / (cyc - top)) * r * 0.95) : Math.trunc(Math.sqrt(Math.max(0, r * r - (y - cyc) * (y - cyc))));
    rows.push({ y, hw, fill: y >= fillTo && y > top + 2 });
  }
  return rows;
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Minimal strftime for previews: %H %M %S %a %d %b %Y. */
export function strftime(fmt: string, secondsSince: number): string {
  const d = new Date(Date.UTC(2026, 10, 12, 16, 52, 0) + secondsSince * 1000);
  return fmt.replace(/%([HMSadbY%])/g, (_, c: string) => ({ H: pad(d.getUTCHours()), M: pad(d.getUTCMinutes()), S: pad(d.getUTCSeconds()), a: DAYS[d.getUTCDay()], d: pad(d.getUTCDate()), b: MONTHS[d.getUTCMonth()], Y: String(d.getUTCFullYear()), "%": "%" })[c] ?? "");
}

/** printf-style preview: %d, %f, %.Nf, %+.Nf, %%. */
export function printf(fmt: string, args: number[]): string {
  let i = 0;
  return fmt.replace(/%(\+)?(?:\.(\d+))?([dfu%])/g, (_m, plus: string | undefined, prec: string | undefined, c: string) => {
    if (c === "%") return "%";
    const v = args[i++] ?? 0;
    const s = c === "f" ? v.toFixed(prec === undefined ? 6 : Number(prec)) : String(Math.round(v));
    return plus && v >= 0 ? `+${s}` : s;
  });
}
/** The conversion specs in a format string, in order ("d" or "f"). */
export const specs = (fmt: string): ("d" | "f")[] => [...fmt.matchAll(/%(?:\+)?(?:\.\d+)?([dfu])/g)].map((m) => (m[1] === "f" ? "f" : "d"));

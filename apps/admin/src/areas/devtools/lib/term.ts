/**
 * A very small terminal emulator, enough to replay what a shell prints: printable text, \r \n \b \t, form feed,
 * and the CSI sequences `J` (erase display), `K` (erase line), `H` (home / position), `A B C D` (cursor moves). Colour (`m`) and other
 * sequences are swallowed. This is not a full VT100: no scroll regions, alternate screen or wide characters.
 */
const MAX_LINES = 2000;

export class Screen {
  private lines: string[] = [""];
  private row = 0;
  private col = 0;
  private esc: string | null = null; // pending escape sequence text

  write(data: string): void {
    for (const ch of data) this.put(ch);
  }
  text(): string { return this.lines.join("\n"); }

  private put(ch: string): void {
    if (this.esc !== null) { this.escape(ch); return; }
    switch (ch) {
      case "\x1b": this.esc = ""; return;
      case "\r": this.col = 0; return;
      case "\n": this.newline(); return;
      case "\b": this.col = Math.max(0, this.col - 1); return;
      case "\t": { const n = 8 - (this.col % 8); this.setCh(" ".repeat(n)); return; }
      case "\f": this.clear(); return;
      case "\x07": return;
      default: if (ch >= " " && ch !== "\x7f") this.setCh(ch);
    }
  }
  private escape(ch: string): void {
    const e = this.esc!;
    if (e === "") { if (ch === "[" || ch === "]") this.esc = ch; else this.esc = null; return; }
    if (e[0] === "]") { if (ch === "\x07") this.esc = null; else this.esc = e + ch; if (this.esc && this.esc.length > 256) this.esc = null; return; }
    if (ch >= "@" && ch <= "~") { this.csi(e.slice(1), ch); this.esc = null; } else this.esc = e + ch;
  }
  private csi(params: string, fin: string): void {
    const n = params.split(";").map((x) => parseInt(x, 10));
    const a = Number.isFinite(n[0]) ? n[0] : undefined;
    switch (fin) {
      case "J": if (a === 2 || a === 3) this.clear(); else if (a === 1) { this.lines.splice(0, this.row, ...[]); this.row = 0; } else { this.lines[this.row] = this.lines[this.row].slice(0, this.col); this.lines.length = this.row + 1; } break;
      case "K": { const l = this.lines[this.row]; this.lines[this.row] = a === 2 ? "" : a === 1 ? " ".repeat(this.col) + l.slice(this.col) : l.slice(0, this.col); break; }
      case "H": case "f": { const r = Math.max(1, a ?? 1) - 1, c = Math.max(1, Number.isFinite(n[1]) ? n[1] : 1) - 1; if (r === 0 && c === 0 && this.lines.length === 1) { this.col = 0; this.row = 0; } else { while (this.lines.length <= r) this.lines.push(""); this.row = r; this.col = c; } break; }
      case "A": this.row = Math.max(0, this.row - (a ?? 1)); break;
      case "B": this.row = Math.min(this.lines.length - 1, this.row + (a ?? 1)); break;
      case "C": this.col += a ?? 1; break;
      case "D": this.col = Math.max(0, this.col - (a ?? 1)); break;
      default: break;
    }
  }
  private setCh(s: string): void {
    const l = this.lines[this.row];
    this.lines[this.row] = l.slice(0, this.col).padEnd(this.col, " ") + s + l.slice(this.col + s.length);
    this.col += s.length;
  }
  private newline(): void {
    this.row++; this.col = 0;
    while (this.lines.length <= this.row) this.lines.push("");
    if (this.lines.length > MAX_LINES) { this.lines.shift(); this.row--; }
  }
  private clear(): void { this.lines = [""]; this.row = 0; this.col = 0; }
}

/** Screen text after feeding every output chunk up to and including time `at` (ms). */
export function renderAt(events: { t: number; k: string; s: string }[], at: number): string {
  const s = new Screen();
  for (const e of events) { if (e.t > at) break; if (e.k === "o") s.write(e.s); }
  return s.text();
}

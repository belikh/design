/**
 * The simulated shell as a terminal program: `feed()` takes raw keystrokes (what a real terminal would send) and returns the bytes a
 * terminal would display. Handles line editing (typing, Backspace), history (Up/Down), Tab completion, Ctrl+C, Ctrl+L, Ctrl+U, Ctrl+D.
 * Cursor movement inside the line (Left/Right) is not supported: the cursor is always at the end of the line.
 */
import { complete, fsFor, initState, prompt, run, type Host, type ShellState } from "./shell.ts";

const CLEAR = "\x1b[2J\x1b[H";
const crlf = (s: string) => s.replace(/\r?\n/g, "\r\n");

export class SimShell {
  private host: Host; private fs; private st: ShellState; private buf = ""; private hIdx = -1; private draft = ""; private esc = ""; private closed = false; private lastTab = false;
  constructor(host: Host) { this.host = host; this.fs = fsFor(host); this.st = initState(host); }

  start(): string { return `Connected to ${this.host.name} (${this.host.os}). Recording. Type help.\r\n${prompt(this.host, this.st)}`; }
  get state() { return this.st; }
  private p() { return prompt(this.host, this.st); }
  private replace(next: string) { this.buf = next; return `\r\x1b[K${this.p()}${next}`; }

  feed(data: string): { out: string; closed: boolean } {
    let out = "";
    for (const ch of data) { if (this.closed) break; out += this.key(ch); }
    return { out, closed: this.closed };
  }

  private key(ch: string): string {
    if (this.esc) {
      this.esc += ch;
      if (this.esc === "\x1b[" || /^\x1b\[[0-9;]*$/.test(this.esc)) return ""; // still collecting parameters
      const seq = this.esc; this.esc = "";
      if (seq === "\x1b[A") return this.history(-1);
      if (seq === "\x1b[B") return this.history(1);
      return "";
    }
    const wasTab = this.lastTab; this.lastTab = ch === "\t";
    switch (ch) {
      case "\x1b": this.esc = "\x1b"; return "";
      case "\r": case "\n": return this.enter();
      case "\x7f": case "\b": if (!this.buf) return ""; this.buf = this.buf.slice(0, -1); return "\b \b";
      case "\t": return this.tab(wasTab);
      case "\x03": this.buf = ""; this.hIdx = -1; return `^C\r\n${this.p()}`;
      case "\x0c": return `${CLEAR}${this.p()}${this.buf}`;
      case "\x15": return this.replace("");
      case "\x04": if (this.buf) return ""; this.closed = true; return "logout\r\n";
      default: if (ch >= " " && ch !== "\x7f") { this.buf += ch; return ch; } return "";
    }
  }
  private history(dir: -1 | 1): string {
    const h = this.st.history; if (!h.length) return "";
    if (dir === -1) { if (this.hIdx === -1) { this.draft = this.buf; this.hIdx = h.length - 1; } else if (this.hIdx > 0) this.hIdx--; else return ""; return this.replace(h[this.hIdx]); }
    if (this.hIdx === -1) return ""; if (this.hIdx < h.length - 1) { this.hIdx++; return this.replace(h[this.hIdx]); }
    this.hIdx = -1; return this.replace(this.draft);
  }
  private tab(_again: boolean): string {
    const r = complete(this.fs, this.st, this.buf);
    if (!r.options.length) { if (r.buf === this.buf) return ""; const add = r.buf.slice(this.buf.length); this.buf = r.buf; return add; }
    if (r.buf !== this.buf) { const add = r.buf.slice(this.buf.length); this.buf = r.buf; return add; }
    return `\r\n${r.options.join("  ")}\r\n${this.p()}${this.buf}`;
  }
  private enter(): string {
    const line = this.buf; this.buf = ""; this.hIdx = -1;
    let out = "\r\n";
    const hist = line.trim() && this.st.history[this.st.history.length - 1] !== line ? [...this.st.history, line] : this.st.history;
    const r = run(this.host, this.fs, { ...this.st, history: hist }, line);
    this.st = r.state;
    if (r.clear) out += CLEAR; else if (r.out) out += crlf(r.out) + "\r\n";
    if (r.exit) { this.closed = true; return out + "logout\r\n"; }
    return out + this.p();
  }
}

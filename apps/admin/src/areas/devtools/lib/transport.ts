/**
 * Transports for the remote shell page.
 *
 *  - `SimTransport` runs the sandboxed, simulated shell (see simshell.ts). It never touches a real machine.
 *  - `WebSocketTransport` talks to a URL the user types in. It is the ONLY code in this folder that can reach the network and it does so
 *    only when `connect()` is called, which the UI does only after the user types a URL and presses Connect.
 *
 * WebSocket wire protocol (the simplest thing a pty bridge can speak): every message is a UTF-8 text frame carrying raw terminal bytes.
 * Frames from the page are keystrokes (Enter = "\r", Ctrl+C = "\x03", arrows = "\x1b[A" ...); frames from the server are program output
 * (ANSI escapes allowed; the page renders a subset, see term.ts). Binary frames are decoded as UTF-8. There is no resize message and no
 * authentication handshake: put authentication in front of the bridge (a reverse proxy, a one-time token path) rather than in this page.
 * No credentials are stored, and a URL that embeds credentials (`wss://user:pass@host`) is refused.
 */
import { SimShell } from "./simshell.ts";
import type { Host } from "./shell.ts";

export interface ShellTransport {
  readonly label: string;
  /** Open the connection. Subscribe with onData/onClose BEFORE calling. Rejects if it cannot connect. */
  connect(): Promise<void>;
  /** Send raw terminal input (keystrokes) to the remote side. */
  send(data: string): void;
  /** Receive raw terminal output. Returns an unsubscribe function. */
  onData(cb: (data: string) => void): () => void;
  /** Called once when the connection ends, from either side. Returns an unsubscribe function. */
  onClose(cb: (reason?: string) => void): () => void;
  close(): void;
}

abstract class Base {
  protected data = new Set<(d: string) => void>();
  protected closers = new Set<(r?: string) => void>();
  protected closed = false;
  onData(cb: (d: string) => void) { this.data.add(cb); return () => { this.data.delete(cb); }; }
  onClose(cb: (r?: string) => void) { this.closers.add(cb); return () => { this.closers.delete(cb); }; }
  protected emit(d: string) { this.data.forEach((f) => f(d)); }
  protected finish(reason?: string) { if (this.closed) return; this.closed = true; this.closers.forEach((f) => f(reason)); }
}

export class SimTransport extends Base implements ShellTransport {
  readonly label: string;
  private sh: SimShell;
  constructor(host: Host) { super(); this.sh = new SimShell(host); this.label = `${host.user}@${host.name} (simulated)`; }
  async connect() { this.emit(this.sh.start()); }
  send(data: string) {
    if (this.closed) return;
    const r = this.sh.feed(data);
    if (r.out) this.emit(r.out);
    if (r.closed) this.finish("logout");
  }
  close() { this.finish("closed by user"); }
}

/** Accepts only ws:// and wss:// URLs without embedded credentials. */
export function checkWsUrl(raw: string): { ok: true; url: string; insecure: boolean } | { ok: false; error: string } {
  const s = raw.trim();
  if (!s) return { ok: false, error: "Enter a WebSocket URL." };
  let u: URL;
  try { u = new URL(s); } catch { return { ok: false, error: "That is not a valid URL." }; }
  if (u.protocol !== "ws:" && u.protocol !== "wss:") return { ok: false, error: "Use a ws:// or wss:// URL." };
  if (u.username || u.password) return { ok: false, error: "Remove the user name and password from the URL; credentials are not accepted here." };
  return { ok: true, url: u.toString(), insecure: u.protocol === "ws:" };
}

type WSLike = { binaryType: string; readyState: number; send(d: string): void; close(): void; onopen: (() => void) | null; onmessage: ((e: { data: unknown }) => void) | null; onerror: (() => void) | null; onclose: ((e: { code?: number; reason?: string }) => void) | null };
export type WSFactory = (url: string) => WSLike;

export class WebSocketTransport extends Base implements ShellTransport {
  readonly label: string;
  private ws: WSLike | null = null; private url: string; private make: WSFactory;
  constructor(url: string, make: WSFactory = (u) => new WebSocket(u) as unknown as WSLike) { super(); this.url = url; this.make = make; this.label = url; }
  connect(): Promise<void> {
    const chk = checkWsUrl(this.url);
    if (!chk.ok) return Promise.reject(new Error(chk.error));
    return new Promise<void>((resolve, reject) => {
      let opened = false; let ws: WSLike;
      try { ws = this.make(chk.url); } catch (e) { reject(e instanceof Error ? e : new Error(String(e))); return; }
      this.ws = ws; ws.binaryType = "arraybuffer";
      const dec = new TextDecoder();
      ws.onopen = () => { opened = true; resolve(); };
      ws.onmessage = (e) => { const d = e.data; this.emit(typeof d === "string" ? d : ArrayBuffer.isView(d) || Object.prototype.toString.call(d) === "[object ArrayBuffer]" ? dec.decode(d as ArrayBuffer) : String(d)); };
      ws.onerror = () => { if (!opened) reject(new Error("Could not connect. Check the URL, that the server is running, and that it allows this origin.")); };
      ws.onclose = (e) => { if (!opened) reject(new Error(`Connection closed before it opened${e?.code ? ` (code ${e.code})` : ""}.`)); this.finish(e?.reason || (e?.code ? `closed (code ${e.code})` : "closed")); };
    });
  }
  send(data: string) { if (this.ws && this.ws.readyState === 1) this.ws.send(data); }
  close() { this.finish("closed by user"); try { this.ws?.close(); } catch { /* already closed */ } }
}

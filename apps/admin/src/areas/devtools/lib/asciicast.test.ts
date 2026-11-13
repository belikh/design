import { describe, it, expect } from "vitest";
import { Recorder, decodeCast, duration, encodeCast, makeRecording, summarize } from "./asciicast.ts";
import { SEED_RECORDINGS } from "./sessions.ts";
import { SimTransport, WebSocketTransport, checkWsUrl } from "./transport.ts";
import { HOSTS } from "./shell.ts";
import { keyToBytes } from "./keys.ts";

const rec = makeRecording({ id: "r", host: "h", user: "u", started: "2026-01-01 00:00:00", timestamp: 1767225600, events: [{ t: 0, k: "o", s: "$ " }, { t: 1234, k: "i", s: "é" }, { t: 1300, k: "o", s: "é\r\n\x1b[2J" }] });

describe("asciicast v2", () => {
  it("encodes a header line and event lines", () => {
    const lines = encodeCast(rec).trimEnd().split("\n"); expect(JSON.parse(lines[0])).toMatchObject({ version: 2, width: 80, height: 24, timestamp: 1767225600, title: "u@h" });
    expect(JSON.parse(lines[2])).toEqual([1.234, "i", "é"]); expect(lines).toHaveLength(4);
  });
  it("round-trips, including seed recordings", () => {
    for (const r of [rec, ...SEED_RECORDINGS]) { const d = decodeCast(encodeCast(r)); if (!d.ok) throw new Error(d.error); expect(d.events).toEqual(r.events); expect(d.header.width).toBe(80); }
  });
  it("rejects malformed input with a line number", () => {
    const bad = (s: string) => { const r = decodeCast(s); return r.ok ? "" : r.error; };
    expect(bad("")).toMatch(/empty/); expect(bad("{")).toMatch(/Line 1/); expect(bad('{"version":3}')).toMatch(/version 3/); expect(bad("[1]")).toMatch(/object/);
    const h = '{"version":2,"width":80,"height":24}\n'; expect(bad(h + '[1,"o"]')).toMatch(/Line 2/); expect(bad(h + '[2,"o","a"]\n[1,"o","b"]')).toMatch(/Line 3.*backwards/); expect(bad(h + '[-1,"o","a"]')).toMatch(/invalid time/); expect(bad(h + "zzz")).toMatch(/Line 2 is not valid JSON/);
    expect(decodeCast(h + "\n[0,\"m\",\"mark\"]\n")).toMatchObject({ ok: true });
  });
  it("summarises size and time", () => {
    const s = summarize(rec); expect(s).toMatchObject({ durationMs: 1300, events: 3, keystrokes: 1, longestPauseMs: 1234 }); expect(s.outputBytes).toBe(2 + 2 + 2 + 4); expect(s.castBytes).toBe(new TextEncoder().encode(encodeCast(rec)).length); expect(duration(rec)).toBe(1300);
  });
  it("Recorder timestamps relative to its start", () => {
    let c = 1000; const r = new Recorder(() => c); c = 1250; r.add("o", "a"); c = 1900; r.add("i", "b"); r.add("o", ""); expect(r.events).toEqual([{ t: 250, k: "o", s: "a" }, { t: 900, k: "i", s: "b" }]);
  });
});

describe("transports", () => {
  it("SimTransport emits a banner, echoes input and closes on exit", async () => {
    const t = new SimTransport(HOSTS[1]); let out = ""; let closed: string | undefined; t.onData((d) => (out += d)); t.onClose((r) => (closed = r)); await t.connect(); expect(out).toContain("root@nas:~$ ");
    t.send("whoami\r"); expect(out).toContain("root\r\n"); t.send("exit\r"); expect(closed).toBe("logout"); const n = out.length; t.send("x"); expect(out.length).toBe(n);
  });
  it("checkWsUrl accepts only ws(s) without credentials", () => {
    expect(checkWsUrl("wss://a.example/pty")).toMatchObject({ ok: true, insecure: false }); expect(checkWsUrl("ws://127.0.0.1:8080")).toMatchObject({ ok: true, insecure: true });
    for (const u of ["", "http://x", "not a url", "wss://u:p@x", "wss://u@x"]) expect(checkWsUrl(u).ok).toBe(false);
  });
  it("WebSocketTransport never opens a socket until connect(), and forwards frames", async () => {
    const made: string[] = []; const sent: string[] = [];
    const ws = { binaryType: "", readyState: 0, send: (d: string) => void sent.push(d), close: () => ws.onclose?.({ code: 1000 }), onopen: null as null | (() => void), onmessage: null as null | ((e: { data: unknown }) => void), onerror: null, onclose: null as null | ((e: { code?: number }) => void) };
    const t = new WebSocketTransport("wss://x.example/pty", (u) => { made.push(u); return ws; }); expect(made).toEqual([]);
    let got = ""; let closed = ""; t.onData((d) => (got += d)); t.onClose((r) => (closed = r ?? "")); const p = t.connect(); expect(made).toEqual(["wss://x.example/pty"]); ws.readyState = 1; ws.onopen!(); await p;
    t.send("ls\r"); expect(sent).toEqual(["ls\r"]); ws.onmessage!({ data: "hi" }); ws.onmessage!({ data: new TextEncoder().encode("é").buffer }); expect(got).toBe("hié"); t.close(); expect(closed).toBe("closed by user");
  });
  it("WebSocketTransport rejects on error and on invalid URLs without creating a socket", async () => {
    let made = 0; const ws = { binaryType: "", readyState: 0, send: () => {}, close: () => {}, onopen: null, onmessage: null, onerror: null as null | (() => void), onclose: null };
    const t = new WebSocketTransport("ws://x", () => { made++; return ws; }); const p = t.connect(); ws.onerror!(); await expect(p).rejects.toThrow(/Could not connect/);
    await expect(new WebSocketTransport("http://x", () => { made++; return ws; }).connect()).rejects.toThrow(/ws:\/\//); expect(made).toBe(1);
  });
});

describe("keys", () => {
  it("maps keys to terminal bytes", () => {
    expect(keyToBytes({ key: "c", ctrlKey: true })).toBe("\x03"); expect(keyToBytes({ key: "l", ctrlKey: true })).toBe("\x0c"); expect(keyToBytes({ key: "Enter" })).toBe("\r"); expect(keyToBytes({ key: "ArrowUp" })).toBe("\x1b[A");
    expect(keyToBytes({ key: "a" })).toBe("a"); expect(keyToBytes({ key: "F5" })).toBeNull(); expect(keyToBytes({ key: "r", metaKey: true })).toBeNull(); expect(keyToBytes({ key: "Shift" })).toBeNull();
  });
});

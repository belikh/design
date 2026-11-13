import { useEffect, useMemo, useRef, useState } from "react";
import { Field, TextInput, TextArea, Checkbox, Slider } from "@belikh/jupiter-ui/inputs.tsx";
import { Btn, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Icon, Graphic } from "@belikh/jupiter-ui/Icon.tsx";
import { chunkPlan, countFiles, folderTree, humanSize, type FNode } from "./logic-data.ts";
import "./in2.css";

/* ---------- folder upload ---------- */
const IGNORE = /(^|\/)(\.DS_Store|node_modules|\.git|Thumbs\.db)(\/|$)/;
export const SAMPLE_FOLDER = [["site/index.html", 4200], ["site/css/app.css", 18100], ["site/css/tokens.css", 6400], ["site/js/app.js", 90300], ["site/img/logo.svg", 9700], ["site/img/hero.png", 840000], ["site/.DS_Store", 6148], ["site/node_modules/left-pad/index.js", 1200]].map(([path, size]) => ({ path: path as string, size: size as number }));
function Tree({ n, depth = 0 }: { n: FNode; depth?: number }) { return <ul className="in2-tree" style={{ paddingInlineStart: depth ? 18 : 0 }}>{n.children.map((c) => <li key={c.name}><Icon name="folder" size={14} /> <b>{c.name}</b> <span className="in2-note">{countFiles(c)} files · {humanSize(c.bytes)}</span><Tree n={c} depth={depth + 1} /></li>)}{n.files > 0 && <li className="in2-note">{n.files} file{n.files > 1 ? "s" : ""} here</li>}</ul>; }
export function FolderUpload() {
  const [files, setFiles] = useState<{ path: string; size: number }[]>([]); const [skip, setSkip] = useState(true); const kept = skip ? files.filter((f) => !IGNORE.test(f.path)) : files; const tree = useMemo(() => folderTree(kept), [kept]); const dropped = files.length - kept.length;
  const supported = typeof document !== "undefined" && "webkitdirectory" in document.createElement("input");
  return (
    <div className="in2-stack">
      <div className="in2-row"><label className="jp-btn jp-btn--secondary" style={{ cursor: "pointer" }}><Icon name="folder" size={16} />Choose a folder<input type="file" hidden multiple {...({ webkitdirectory: "" } as Record<string, string>)} onChange={(e) => setFiles([...(e.target.files ?? [])].map((f) => ({ path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name, size: f.size })))} /></label><Btn onClick={() => setFiles(SAMPLE_FOLDER)}>Use a sample folder</Btn>{files.length > 0 && <Btn variant="ghost" onClick={() => setFiles([])}>Clear</Btn>}</div>
      {!supported && <span className="in2-note">This browser can’t pick folders; use the sample.</span>}
      <Checkbox checked={skip} onChange={setSkip} label="Skip junk (.DS_Store, node_modules, .git, Thumbs.db)" />
      {files.length > 0 ? <div className="in2-box" aria-live="polite"><b>{kept.length} files, {humanSize(kept.reduce((a, f) => a + f.size, 0))}</b>{dropped > 0 && <span className="in2-note"> · {dropped} skipped</span>}<Tree n={tree} /></div> : <span className="in2-note">Nothing chosen yet.</span>}
    </div>
  );
}

/* ---------- URL import (no network: simulated fetch) ---------- */
export function checkImportUrl(raw: string): { ok: boolean; error?: string; host?: string; name?: string } {
  let u: URL; try { u = new URL(raw.trim()); } catch { return { ok: false, error: "That isn’t a valid URL" }; }
  if (u.protocol !== "https:") return { ok: false, error: "Only https:// links can be imported" };
  const h = u.hostname; if (h === "localhost" || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.endsWith(".local") || h.endsWith(".internal")) return { ok: false, error: "Private and local addresses are blocked" };
  const name = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "") || "download"; return { ok: true, host: h, name };
}
export function UrlImport({ stepMs = 220 }: { stepMs?: number }) {
  const [url, setUrl] = useState("https://example.com/files/q3-report.pdf"); const [st, setSt] = useState<"idle" | "running" | "done" | "error">("idle"); const [p, setP] = useState(0); const [res, setRes] = useState<{ name: string; size: number } | null>(null); const [err, setErr] = useState(""); const chk = checkImportUrl(url);
  const timer = useRef(0); useEffect(() => () => clearInterval(timer.current), []);
  const go = () => { if (!chk.ok) return; setSt("running"); setP(0); setErr(""); let x = 0; timer.current = window.setInterval(() => { x += 8 + Math.random() * 22; if (x >= 100) { clearInterval(timer.current); if (/missing|404/.test(url)) { setSt("error"); setErr("The server answered 404 Not Found"); } else { setP(100); setSt("done"); setRes({ name: chk.name!, size: 20000 + ([...url].reduce((a, c) => a + c.charCodeAt(0), 0) % 900) * 1000 }); } } else setP(x); }, stepMs); };
  return (
    <div className="in2-stack">
      <Field label="Import from URL" error={url && !chk.ok ? chk.error : undefined} hint={chk.ok ? `Will fetch ${chk.name} from ${chk.host} (simulated: no network request is made)` : undefined}>{(id, d) => <div className="in2-row" style={{ flexWrap: "nowrap" }}><TextInput id={id} aria-describedby={d} value={url} onChange={(v) => { setUrl(v); setSt("idle"); }} state={url && !chk.ok ? "error" : undefined} /><Btn variant="primary" disabled={!chk.ok || st === "running"} onClick={go}>Import</Btn></div>}</Field>
      {st === "running" && <div><div className="in2-prog" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100} aria-label="Import progress"><i style={{ width: `${p}%` }} /></div><span className="in2-note">Downloading… {Math.round(p)}%</span></div>}
      {st === "done" && res && <Alert s="ok" title="Imported">{res.name} · {humanSize(res.size)}</Alert>}{st === "error" && <Alert s="danger" title="Import failed">{err}. <button type="button" className="adm-link" onClick={go}>Retry</button></Alert>}
      <span className="in2-note">Try a URL containing “missing” to see an error, or http:// and localhost to see them blocked.</span>
    </div>
  );
}

/* ---------- camera capture ---------- */
export function CameraCapture() {
  const supported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia; const video = useRef<HTMLVideoElement>(null); const [stream, setStream] = useState<MediaStream | null>(null); const [shot, setShot] = useState<string | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (video.current && stream) video.current.srcObject = stream; return () => stream?.getTracks().forEach((t) => t.stop()); }, [stream]);
  const open = async () => { setErr(""); try { setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })); } catch (e) { setErr((e as Error).name === "NotAllowedError" ? "Camera permission was denied. You can allow it in the browser’s site settings, or choose a photo instead." : (e as Error).name === "NotFoundError" ? "No camera was found. Choose a photo instead." : (e as Error).message); } };
  const snap = () => { const v = video.current; if (!v) return; const c = document.createElement("canvas"); c.width = v.videoWidth || 640; c.height = v.videoHeight || 480; c.getContext("2d")?.drawImage(v, 0, 0); setShot(c.toDataURL("image/jpeg", 0.85)); stream?.getTracks().forEach((t) => t.stop()); setStream(null); };
  return (
    <div className="in2-stack">
      <div className="in2-row">{supported && !stream && <Btn icon="camera" onClick={() => void open()}>Open camera</Btn>}<label className="jp-btn jp-btn--secondary" style={{ cursor: "pointer" }}><Icon name="image" size={16} />{supported ? "Choose a photo" : "Take or choose a photo"}<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setShot(URL.createObjectURL(f)); }} /></label>{!supported && <span className="in2-note">Live camera isn’t available here, so the file picker opens the camera on phones.</span>}</div>
      {err && <span className="in2-bad" role="alert">{err}</span>}
      {stream && <div className="in2-stack"><video ref={video} autoPlay playsInline muted aria-label="Camera preview" style={{ maxWidth: "100%", borderRadius: 8, background: "var(--jp-surface)" }} /><div className="in2-row"><Btn variant="primary" onClick={snap}>Capture</Btn><Btn onClick={() => { stream.getTracks().forEach((t) => t.stop()); setStream(null); }}>Cancel</Btn></div></div>}
      {shot && <div className="in2-stack"><img src={shot} alt="Captured" style={{ maxWidth: 320, borderRadius: 8, border: "1px solid var(--jp-border)" }} /><div className="in2-row"><Btn sm onClick={() => setShot(null)}>Retake</Btn><Badge s="ok">captured</Badge></div></div>}
      <span className="in2-note">The camera only starts when you press the button, and stops after capture.</span>
    </div>
  );
}

/* ---------- barcode / QR scan ---------- */
export function ean13Valid(code: string): boolean { if (!/^\d{13}$/.test(code)) return false; const d = code.split("").map(Number); const s = d.slice(0, 12).reduce((a, x, i) => a + x * (i % 2 ? 3 : 1), 0); return (10 - (s % 10)) % 10 === d[12]; }
export function classifyScan(v: string): { kind: string; ok: boolean; note: string } { const t = v.trim(); if (/^https?:\/\//.test(t)) return { kind: "URL", ok: true, note: new URL(t).hostname }; if (/^otpauth:\/\//.test(t)) return { kind: "Authenticator setup", ok: true, note: "otpauth URI" }; if (/^\d{13}$/.test(t)) return { kind: "EAN-13", ok: ean13Valid(t), note: ean13Valid(t) ? "Checksum valid" : "Checksum failed" }; if (/^\d{12}$/.test(t)) return { kind: "UPC-A", ok: ean13Valid("0" + t), note: ean13Valid("0" + t) ? "Checksum valid" : "Checksum failed" }; if (/^[A-Z0-9-]{6,20}$/.test(t)) return { kind: "Code", ok: true, note: "Alphanumeric code" }; return { kind: "Text", ok: t.length > 0, note: `${t.length} characters` }; }
type BD = { detect: (s: CanvasImageSource) => Promise<{ rawValue: string; format: string }[]> };
export function ScanField() {
  const Det = (globalThis as unknown as { BarcodeDetector?: new (o?: { formats: string[] }) => BD }).BarcodeDetector; const [manual, setManual] = useState("5901234123457"); const [results, setResults] = useState<{ v: string; format: string }[]>([]); const [err, setErr] = useState("");
  const video = useRef<HTMLVideoElement>(null); const [stream, setStream] = useState<MediaStream | null>(null);
  useEffect(() => { if (!stream || !Det) return; if (video.current) video.current.srcObject = stream; const det = new Det(); let stop = false; const loop = async () => { while (!stop) { try { if (video.current && video.current.readyState >= 2) { const r = await det.detect(video.current); if (r[0]) { setResults((x) => (x.some((y) => y.v === r[0].rawValue) ? x : [{ v: r[0].rawValue, format: r[0].format }, ...x])); } } } catch { /* ignore frame errors */ } await new Promise((r) => setTimeout(r, 250)); } }; void loop(); return () => { stop = true; stream.getTracks().forEach((t) => t.stop()); }; }, [stream, Det]);
  const scanImage = async (f: File) => { if (!Det) return; try { const bmp = await createImageBitmap(f); const r = await new Det().detect(bmp); if (!r.length) setErr("No barcode or QR code found in that image."); else { setErr(""); setResults((x) => [...r.map((y) => ({ v: y.rawValue, format: y.format })), ...x]); } } catch (e) { setErr((e as Error).message); } };
  const c = classifyScan(manual);
  return (
    <div className="in2-stack">
      <div className="in2-row">{Det ? <>{!stream ? <Btn icon="camera" onClick={async () => { setErr(""); try { setStream(await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })); } catch (e) { setErr((e as Error).name === "NotAllowedError" ? "Camera permission denied." : (e as Error).message); } }}>Scan with camera</Btn> : <Btn onClick={() => { stream.getTracks().forEach((t) => t.stop()); setStream(null); }}>Stop scanning</Btn>}<label className="jp-btn jp-btn--secondary" style={{ cursor: "pointer" }}>Scan an image<input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && void scanImage(e.target.files[0])} /></label></> : <span className="in2-note" role="status">This browser has no barcode detector, so type or paste the code below (a hardware scanner types it for you).</span>}</div>
      {stream && <video ref={video} autoPlay playsInline muted aria-label="Scanner preview" style={{ maxWidth: 360, borderRadius: 8 }} />}{err && <span className="in2-bad" role="alert">{err}</span>}
      <Field label="Code" hint="Hardware scanners type here and press Enter" error={manual && !c.ok ? c.note : undefined}>{(id, d) => <div className="in2-row" style={{ flexWrap: "nowrap" }}><TextInput id={id} aria-describedby={d} className="in2-mono" value={manual} onChange={setManual} onKeyDown={(e) => { if (e.key === "Enter" && c.ok) setResults((x) => [{ v: manual.trim(), format: c.kind }, ...x.filter((y) => y.v !== manual.trim())]); }} state={manual && !c.ok ? "error" : c.ok ? "success" : undefined} /><Btn disabled={!c.ok} onClick={() => setResults((x) => [{ v: manual.trim(), format: c.kind }, ...x.filter((y) => y.v !== manual.trim())])}>Add</Btn></div>}</Field>
      <span className="in2-note" aria-live="polite">Detected: <b>{c.kind}</b> · {c.note}</span>
      <ul className="adm-list in2-box" style={{ padding: 0 }} aria-label="Scanned codes">{results.map((r) => <li key={r.v}><Icon name="tag" size={14} /><code className="in2-mono" style={{ flex: 1 }}>{r.v}</code><Badge>{r.format}</Badge><Btn sm variant="ghost" aria-label={`Remove ${r.v}`} onClick={() => setResults(results.filter((x) => x.v !== r.v))}>×</Btn></li>)}{!results.length && <li className="in2-note">Nothing scanned yet.</li>}</ul>
    </div>
  );
}

/* ---------- chunked, resumable upload (simulated transport, real chunk planning) ---------- */
type CState = "pending" | "up" | "done" | "fail";
export function ChunkedUpload({ tickMs = 140, chunkMB = 8, failChunk = 3 }: { tickMs?: number; chunkMB?: number; failChunk?: number }) {
  const [name, setName] = useState("backup-2026-11.tar.zst"); const [size, setSize] = useState(120 * 1024 * 1024); const [chunk, setChunk] = useState(chunkMB); const plan = useMemo(() => chunkPlan(size, chunk * 1024 * 1024), [size, chunk]);
  const [states, setStates] = useState<CState[]>([]); const [prog, setProg] = useState<number[]>([]); const [running, setRunning] = useState(false); const failed = useRef(new Set<number>()); const t0 = useRef(0);
  useEffect(() => { setStates(plan.map(() => "pending")); setProg(plan.map(() => 0)); setRunning(false); failed.current = new Set(); }, [plan]);
  useEffect(() => {
    if (!running) return; const id = window.setInterval(() => {
      setProg((p) => { const next = [...p]; setStates((st) => { const s = [...st]; let active = s.filter((x) => x === "up").length; for (let i = 0; i < s.length && active < 2; i++) if (s[i] === "pending") { s[i] = "up"; active++; } for (let i = 0; i < s.length; i++) if (s[i] === "up") { next[i] = Math.min(100, next[i] + 18 + Math.random() * 12); if (i === failChunk && !failed.current.has(i) && next[i] > 55) { failed.current.add(i); s[i] = "fail"; next[i] = 0; } else if (next[i] >= 100) s[i] = "done"; } if (!s.some((x) => x === "pending" || x === "up")) setRunning(false); return s; }); return next; });
    }, tickMs); return () => clearInterval(id);
  }, [running, tickMs, failChunk]);
  const done = states.filter((s) => s === "done").length; const bytesDone = plan.reduce((a, c, i) => a + (states[i] === "done" ? c.size : (c.size * (prog[i] ?? 0)) / 100 * (states[i] === "up" ? 1 : 0)), 0); const pct = Math.min(100, (bytesDone / size) * 100); const bad = states.filter((s) => s === "fail").length; const complete = done === plan.length;
  const elapsed = t0.current ? (Date.now() - t0.current) / 1000 : 0; void elapsed;
  return (
    <div className="in2-stack">
      <div className="in2-row"><label className="jp-btn jp-btn--secondary" style={{ cursor: "pointer" }}><Icon name="upload" size={16} />Choose a large file<input type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setName(f.name); setSize(f.size || 1); } }} /></label><Btn onClick={() => { setName("sample-video.mp4"); setSize(480 * 1024 * 1024); }}>Use a simulated 480 MB file</Btn></div>
      <div className="in2-box"><b className="in2-mono">{name}</b> <span className="in2-note">{humanSize(size)} · {plan.length} chunks of {chunk} MB · 2 uploading at a time</span></div>
      <Slider label="Chunk size" value={chunk} min={1} max={32} onChange={setChunk} fmt={(v) => `${v} MB`} />
      <div className="in2-chunks" role="img" aria-label={`${done} of ${plan.length} chunks uploaded`}>{plan.map((c, i) => <i key={c.index} className={states[i] === "done" ? "is-done" : states[i] === "up" ? "is-up" : states[i] === "fail" ? "is-fail" : ""} title={`Chunk ${i + 1}: ${humanSize(c.size)} (${states[i]})`} />)}</div>
      <div className={`in2-prog ${complete ? "is-ok" : bad ? "is-bad" : ""}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress"><i style={{ width: `${pct}%` }} /></div>
      <div className="in2-row" aria-live="polite"><span className="in2-mono">{Math.round(pct)}%</span><span className="in2-note">{humanSize(bytesDone)} of {humanSize(size)} · {done}/{plan.length} chunks</span>{bad > 0 && <span className="in2-bad" role="alert">Chunk {states.findIndex((s) => s === "fail") + 1} failed (network error). Resume to retry just that chunk.</span>}{complete && <Badge s="ok">complete</Badge>}</div>
      <div className="in2-row">{!running && !complete && <Btn variant="primary" onClick={() => { if (!t0.current) t0.current = Date.now(); setStates((s) => s.map((x) => (x === "fail" ? "pending" : x))); setRunning(true); }}>{done || bad ? "Resume" : "Start upload"}</Btn>}{running && <Btn onClick={() => { setRunning(false); setStates((s) => s.map((x) => (x === "up" ? "pending" : x))); setProg((p) => p.map((x, i) => (states[i] === "up" ? 0 : x))); }}>Pause</Btn>}<Btn variant="ghost" onClick={() => { setStates(plan.map(() => "pending")); setProg(plan.map(() => 0)); setRunning(false); failed.current = new Set(); }}>Reset</Btn></div>
      <span className="in2-note">Chunks are planned from the real file size; transport is simulated, and chunk {failChunk + 1} fails once to show retry. A real endpoint would store the finished chunk list so an interrupted upload resumes.</span>
    </div>
  );
}

/* ---------- image focal point, alt text, redaction, SVG on light/dark ---------- */
const luminance = (rgb: number[]) => { const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrastRatio = (a: number[], b: number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
export function altTextIssues(alt: string, decorative: boolean, filename = ""): { level: "error" | "warn" | "ok"; msg: string }[] {
  if (decorative) return alt.trim() ? [{ level: "warn", msg: "Marked decorative: the alt text will be ignored (alt=\"\")" }] : [{ level: "ok", msg: "Decorative image: screen readers will skip it" }];
  const out: { level: "error" | "warn" | "ok"; msg: string }[] = []; const t = alt.trim();
  if (!t) return [{ level: "error", msg: "Describe the image, or mark it decorative" }];
  if (/^(image|picture|photo|graphic|screenshot)( of| showing)?\b/i.test(t)) out.push({ level: "warn", msg: "Screen readers already say “image”: start with the content" });
  if (filename && (t.toLowerCase() === filename.toLowerCase() || /\.(png|jpe?g|svg|gif|webp)$/i.test(t))) out.push({ level: "error", msg: "That looks like a file name, not a description" });
  if (t.length > 125) out.push({ level: "warn", msg: `${t.length} characters: aim for under 125, and put long detail in the page text` }); if (t.length < 8) out.push({ level: "warn", msg: "Very short: say what matters about it" });
  return out.length ? out : [{ level: "ok", msg: `${t.length} characters, reads well` }];
}
const SAMPLE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300"><rect width="480" height="300" fill="#dfe6ef"/><circle cx="360" cy="80" r="40" fill="#f2b544"/><path d="M0 240 L120 120 L200 200 L300 90 L480 240 V300 H0Z" fill="#4b6a8a"/><path d="M0 270 Q120 230 240 262 T480 250 V300 H0Z" fill="#2e4a63"/><rect x="40" y="40" width="150" height="26" rx="4" fill="#fff" opacity=".9"/><text x="52" y="59" font-family="monospace" font-size="14" fill="#16171d">user: ava@example.com</text></svg>')}`;
export function ImageTools({ src: initial = SAMPLE_SVG }: { src?: string }) {
  const [src, setSrc] = useState(initial); const [name, setName] = useState("sample.svg"); const [focal, setFocal] = useState<[number, number]>([75, 28]); const [alt, setAlt] = useState("Blue mountains under a yellow sun"); const [deco, setDeco] = useState(false);
  const [boxes, setBoxes] = useState<{ x: number; y: number; w: number; h: number }[]>([{ x: 8, y: 11, w: 40, h: 11 }]); const [drag, setDrag] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null); const [mode, setMode] = useState<"focal" | "redact">("focal"); const wrap = useRef<HTMLDivElement>(null);
  const pos = (e: React.PointerEvent) => { const b = wrap.current!.getBoundingClientRect(); return { x: Math.min(100, Math.max(0, ((e.clientX - b.left) / b.width) * 100)), y: Math.min(100, Math.max(0, ((e.clientY - b.top) / b.height) * 100)) }; };
  const issues = altTextIssues(alt, deco, name); const crops: [string, number, number][] = [["16:9", 160, 90], ["1:1", 100, 100], ["9:16", 70, 124], ["4:3", 120, 90]];
  const sv = (scheme: "light" | "dark") => <div className="in2-theme" data-theme={scheme}><span style={{ color: "var(--jp-text)" }}><Graphic id="spot-koala" size={72} /></span><span style={{ color: "var(--jp-accent-text, var(--jp-text))" }}><Graphic id="icon-home" size={32} /></span><span className="in2-note">{scheme} theme</span></div>;
  return (
    <div className="in2-stack">
      <div className="in2-row"><label className="jp-btn jp-btn--secondary" style={{ cursor: "pointer" }}><Icon name="image" size={16} />Use my own image<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSrc(URL.createObjectURL(f)); setName(f.name); setBoxes([]); } }} /></label><Btn variant={mode === "focal" ? "primary" : "secondary"} aria-pressed={mode === "focal"} onClick={() => setMode("focal")}>Focal point</Btn><Btn variant={mode === "redact" ? "primary" : "secondary"} aria-pressed={mode === "redact"} onClick={() => setMode("redact")}>Redact</Btn></div>
      <div ref={wrap} className="in2-img" role="img" aria-label="Image editor canvas" style={{ cursor: mode === "focal" ? "crosshair" : "cell", maxWidth: 480 }}
        onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); const p = pos(e); if (mode === "focal") setFocal([Math.round(p.x), Math.round(p.y)]); else setDrag({ x: p.x, y: p.y, cx: p.x, cy: p.y }); }}
        onPointerMove={(e) => { const p = pos(e); if (mode === "focal" && e.buttons === 1) setFocal([Math.round(p.x), Math.round(p.y)]); else if (drag) setDrag({ ...drag, cx: p.x, cy: p.y }); }} onPointerUp={() => { if (drag) { const w = Math.abs(drag.cx - drag.x), h = Math.abs(drag.cy - drag.y); if (w > 1.5 && h > 1.5) setBoxes([...boxes, { x: Math.min(drag.x, drag.cx), y: Math.min(drag.y, drag.cy), w, h }]); setDrag(null); } }}>
        <img src={src} alt={deco ? "" : alt} draggable={false} />{boxes.map((b, i) => <div key={i} className="in2-redact" style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }} />)}{drag && <div className="in2-redact" style={{ left: `${Math.min(drag.x, drag.cx)}%`, top: `${Math.min(drag.y, drag.cy)}%`, width: `${Math.abs(drag.cx - drag.x)}%`, height: `${Math.abs(drag.cy - drag.y)}%`, opacity: 0.5 }} />}{mode === "focal" && <div className="in2-focal" style={{ left: `${focal[0]}%`, top: `${focal[1]}%` }} />}
      </div>
      <span className="in2-note" aria-live="polite">{mode === "focal" ? `Focal point ${focal[0]}% / ${focal[1]}%: crops keep this spot in view. Click or drag on the image.` : `${boxes.length} redaction${boxes.length === 1 ? "" : "s"}. Drag to draw a box. Boxes are overlays only: this demo does not export a flattened image.`}</span>
      {boxes.length > 0 && <div className="in2-row">{boxes.map((_, i) => <button key={i} type="button" className="in2-pill" onClick={() => setBoxes(boxes.filter((_, j) => j !== i))}>Box {i + 1} ×</button>)}<Btn sm variant="ghost" onClick={() => setBoxes([])}>Clear all</Btn></div>}
      <div><div className="jp-label">Crops with the focal point</div><div className="in2-crops">{crops.map(([l, w, h]) => <div key={l}><span style={{ width: w, height: h }}><img src={src} alt="" style={{ objectPosition: `${focal[0]}% ${focal[1]}%` }} /></span><small className="in2-note">{l}</small></div>)}</div></div>
      <Field label="Alt text" hint="Describe what matters about the image, not its file name" error={issues.find((i) => i.level === "error")?.msg}>{(id, d) => <TextArea id={id} aria-describedby={d} value={alt} rows={2} disabled={deco} onChange={setAlt} />}</Field>
      <Checkbox checked={deco} onChange={setDeco} label="This image is decorative (no alt text needed)" /><ul className="in2-stack" style={{ margin: 0, paddingInlineStart: 18 }} aria-live="polite">{issues.map((i, k) => <li key={k} className={i.level === "error" ? "in2-bad" : i.level === "warn" ? "in2-warn" : "in2-ok"}>{i.msg}</li>)}</ul>
      <div><div className="jp-label">Line graphics on light and dark</div><div className="in2-grid">{sv("light")}{sv("dark")}</div><span className="in2-note">The same single-stroke SVGs use currentColor, so they follow each theme. </span></div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Alert, Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox, Field, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { qrEncode, QR_MAX_BYTES } from "./qr.ts";
import { totp } from "./sha.ts";
import { otpauthUri, randomBase32, recoveryCodes } from "./logic-text.ts";
import "./in2.css";

/** Scannable QR code. Always dark-on-light (a fixed light scope) so phone scanners read it in either theme. */
export function QrSvg({ text, size = 180, label }: { text: string; size?: number; label?: string }) {
  const m = useMemo(() => { try { return qrEncode(text); } catch { return null; } }, [text]); if (!m) return <span className="in2-bad" role="alert">Too long for a QR code (max {QR_MAX_BYTES} bytes)</span>;
  const n = m.length, q = 2; const d = m.flatMap((row, y) => row.map((on, x) => (on ? `M${x + q},${y + q}h1v1h-1z` : ""))).join("");
  return <div className="in2-qr" data-theme="light"><svg width={size} height={size} viewBox={`0 0 ${n + q * 2} ${n + q * 2}`} role="img" aria-label={label ?? "QR code"} shapeRendering="crispEdges"><rect width="100%" height="100%" fill="var(--jp-bg)" /><path d={d} fill="var(--jp-text)" /></svg></div>;
}

/* ---------- TOTP authenticator setup + recovery codes ---------- */
export function TotpSetup({ account = "ava@example.com", issuer = "Jupiter", seed, now = () => Date.now() }: { account?: string; issuer?: string; seed?: string; now?: () => number }) {
  const secret = useMemo(() => seed ?? randomBase32(16), [seed]); const uri = useMemo(() => otpauthUri(issuer, account, secret), [issuer, account, secret]);
  const [code, setCode] = useState(""); const [status, setStatus] = useState<"idle" | "bad" | "ok">("idle"); const [demo, setDemo] = useState(false); const [tick, setTick] = useState(0); const [codes, setCodes] = useState<string[]>([]); const [saved, setSaved] = useState(false);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  const t = now() / 1000; const cur = totp(secret, t); const left = 30 - (Math.floor(t) % 30); void tick;
  const verify = () => { const ok = [-1, 0, 1].some((w) => totp(secret, t + w * 30) === code.trim()); setStatus(ok ? "ok" : "bad"); if (ok) setCodes(recoveryCodes(10)); };
  const grouped = secret.match(/.{1,4}/g)!.join(" ");
  if (status === "ok") return (
    <div className="in2-stack"><Alert s="ok" title="Authenticator app connected">Codes from your app will now be required at sign-in.</Alert>
      <div><b>Recovery codes</b><p className="in2-note">Each works once if you lose your phone. They are shown only now.</p><div className="in2-box in2-mono" style={{ columns: 2 }} aria-label="Recovery codes">{codes.map((c) => <div key={c}>{c}</div>)}</div></div>
      <div className="in2-row"><Btn sm icon="copy" onClick={() => void navigator.clipboard?.writeText(codes.join("\n"))}>Copy</Btn><Btn sm icon="download" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([codes.join("\n") + "\n"], { type: "text/plain" })); a.download = "recovery-codes.txt"; a.click(); }}>Download .txt</Btn></div>
      <Checkbox checked={saved} onChange={setSaved} label="I have stored these codes somewhere safe" /><Btn variant="primary" disabled={!saved}>Done</Btn></div>
  );
  return (
    <div className="in2-stack">
      <div className="in2-row" style={{ alignItems: "flex-start", gap: 20 }}><QrSvg text={uri} label={`Authenticator setup QR for ${account}`} /><div className="in2-stack" style={{ flex: 1, minWidth: 200 }}><b>1. Scan with an authenticator app</b><span className="in2-note">Or enter the setup key by hand:</span><code className="in2-mono in2-box" aria-label="Setup key">{grouped}</code><span className="in2-note">Account {account} · SHA-1 · 6 digits · 30 s</span></div></div>
      <Field label="2. Enter the 6-digit code" error={status === "bad" ? "That code isn’t right. Check the time on your phone and try the next code." : undefined}>{(id, d) => <div className="in2-row"><TextInput id={id} aria-describedby={d} inputMode="numeric" autoComplete="one-time-code" style={{ maxWidth: 160 }} value={code} onChange={(v) => { setCode(v.replace(/\D/g, "").slice(0, 6)); setStatus("idle"); }} state={status === "bad" ? "error" : undefined} /><Btn variant="primary" disabled={code.length !== 6} onClick={verify}>Verify</Btn></div>}</Field>
      <Checkbox checked={demo} onChange={setDemo} label="Demo: show the current code (so you can test without a phone)" />{demo && <div className="in2-note" role="status">Current code <b className="in2-mono">{cur}</b>, changes in {left}s</div>}
    </div>
  );
}

/* ---------- passkey enrolment (simulated by default; real WebAuthn on request) ---------- */
type Passkey = { id: string; name: string; created: string; real: boolean };
export function PasskeyEnrol({ onChange }: { onChange?: (p: Passkey[]) => void }) {
  const supported = typeof window !== "undefined" && "PublicKeyCredential" in window; const [real, setReal] = useState(false); const [name, setName] = useState("My laptop"); const [state, setState] = useState<"idle" | "waiting" | "error">("idle"); const [err, setErr] = useState(""); const [keys, setKeys] = useState<Passkey[]>([{ id: "k1", name: "Pixel 9", created: "2026-09-02", real: false }]);
  const update = (k: Passkey[]) => { setKeys(k); onChange?.(k); };
  const enrol = async () => {
    setState("waiting"); setErr("");
    try {
      if (real && supported) { const challenge = crypto.getRandomValues(new Uint8Array(32)); const cred = await navigator.credentials.create({ publicKey: { challenge, rp: { name: "Jupiter admin (demo)" }, user: { id: new TextEncoder().encode("demo-user"), name: "ava@example.com", displayName: "Ava" }, pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }], authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" }, timeout: 60000 } }); if (!cred) throw new Error("No credential was created"); }
      else await new Promise((r) => setTimeout(r, 900));
      update([...keys, { id: `k${Date.now()}`, name: name.trim() || "Passkey", created: "2026-11-12", real: real && supported }]); setState("idle");
    } catch (e) { setState("error"); setErr((e as Error).name === "NotAllowedError" ? "The request was cancelled or timed out." : (e as Error).message); }
  };
  return (
    <div className="in2-stack">
      <Field label="Name this passkey" hint="So you can tell your devices apart">{(id) => <TextInput id={id} value={name} onChange={setName} maxLength={40} />}</Field>
      <Checkbox checked={real && supported} disabled={!supported} onChange={setReal} label={supported ? "Use my browser’s real passkey prompt (stores nothing on a server)" : "Real passkeys are not available in this browser"} />
      <div className="in2-row"><Btn variant="primary" icon="key" disabled={state === "waiting"} onClick={() => void enrol()}>{state === "waiting" ? "Waiting for your device…" : real && supported ? "Create passkey" : "Create passkey (simulated)"}</Btn>{state === "waiting" && <span className="adm-spin" style={{ width: 14, height: 14 }} aria-label="Waiting" />}</div>
      {state === "error" && <span className="in2-bad" role="alert">{err}</span>}
      <ul className="adm-list in2-box" style={{ padding: 0 }} aria-label="Registered passkeys">{keys.map((k) => <li key={k.id}><Icon name="key" size={16} /><div className="adm-list__main"><b>{k.name}</b><span className="in2-note">Added {k.created}</span></div>{k.real ? <Badge s="ok">real</Badge> : <Badge>simulated</Badge>}<Btn sm variant="ghost" onClick={() => update(keys.filter((x) => x.id !== k.id))}>Remove</Btn></li>)}{!keys.length && <li className="in2-note">No passkeys yet.</li>}</ul>
    </div>
  );
}

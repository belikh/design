import { useEffect, useRef, useState } from "react";
import { Alert, Btn } from "@belikh/jupiter-ui/kit.tsx";
import { Checkbox } from "@belikh/jupiter-ui/inputs.tsx";
import { challenge, holdProgress, scrolledToEnd, slideValue } from "./confirm.ts";
import { Note, Row, Stack, useReducedMotion } from "./ui.tsx";

/* ---------------- C057 CAPTCHA / human check placeholder ---------------- */
export function HumanCheck() {
  const [state, setState] = useState<"idle" | "checking" | "challenge" | "passed" | "failed">("idle"); const [seed, setSeed] = useState(1); const [ans, setAns] = useState(""); const [token, setToken] = useState("");
  const c = challenge(seed); const t = useRef<number>(0); useEffect(() => () => window.clearTimeout(t.current), []);
  const begin = () => { setState("checking"); t.current = window.setTimeout(() => setState("challenge"), 600); };
  const pass = () => { setToken(`local-placeholder-${(seed * 7919).toString(16)}`); setState("passed"); };
  return (
    <Stack>
      <Alert s="warn" title="Placeholder only">This local widget demonstrates the states of a human check. It runs entirely in your browser, verifies nothing server-side and does not stop bots. In production, replace it with a real, server-verified service.</Alert>
      <div className="lab-captcha" role="group" aria-label="Human check (placeholder)">
        {state === "idle" && <Btn onClick={begin}>I am not a robot</Btn>}
        {state === "checking" && <span role="status" className="lab-note">Checking…</span>}
        {(state === "challenge" || state === "failed") && <form onSubmit={(e) => { e.preventDefault(); if (ans.trim() === c.a) pass(); else { setState("failed"); setSeed(seed + 1); setAns(""); } }}>
          <label className="lab-field"><span className="jp-label">{c.q}</span><input className="jp-input lab-narrow" inputMode="numeric" value={ans} onChange={(e) => setAns(e.target.value)} aria-invalid={state === "failed"} autoComplete="off" /></label>
          {state === "failed" && <span className="lab-bad" role="alert">That was not right. Here is a new question.</span>}
          <Row><Btn variant="primary" type="submit" disabled={!ans.trim()}>Verify</Btn><Btn sm variant="ghost" type="button" onClick={() => { setSeed(seed + 1); setAns(""); setState("challenge"); }}>New question</Btn></Row></form>}
        {state === "passed" && <p className="lab-ok" role="status">Verified (placeholder). Token <code>{token}</code></p>}
      </div>
      <Row><Btn variant="primary" disabled={state !== "passed"}>Submit form</Btn>{state === "passed" && <Btn sm variant="ghost" onClick={() => { setState("idle"); setAns(""); setToken(""); }}>Reset</Btn>}</Row>
      <Note>The question is text, so it works with screen readers and keyboards. A real service needs a token your server checks.</Note>
    </Stack>
  );
}

/* ---------------- C071 scroll-to-accept ---------------- */
const TERMS = Array.from({ length: 14 }, (_, i) => `${i + 1}. ${["The service is provided as is, and availability is a best effort.", "You are responsible for the credentials issued to you and for activity under them.", "Data you store remains yours; we process it only to run the service.", "We may change these terms with 30 days' notice shown on the dashboard.", "Either party may end the agreement, and exports remain available for 60 days."][i % 5]}`);
export function ScrollToAccept() {
  const ref = useRef<HTMLDivElement>(null); const [done, setDone] = useState(false); const [pct, setPct] = useState(0); const [ok, setOk] = useState(false); const [accepted, setAccepted] = useState(false);
  const check = () => { const el = ref.current; if (!el) return; setPct(Math.min(100, Math.round(((el.scrollTop + el.clientHeight) / Math.max(1, el.scrollHeight)) * 100))); if (scrolledToEnd(el)) setDone(true); };
  useEffect(check, []);
  return (
    <Stack>
      <div ref={ref} className="lab-terms" tabIndex={0} role="region" aria-label="Terms of service (scroll to the end to accept)" onScroll={check}>{TERMS.map((t) => <p key={t}>{t}</p>)}<p><b>End of terms.</b></p></div>
      <div className="lab-progress" role="progressbar" aria-label="Read progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={done ? 100 : pct}><i style={{ inlineSize: `${done ? 100 : pct}%` }} /></div>
      <Checkbox checked={ok} onChange={setOk} disabled={!done} label={done ? "I have read and accept the terms" : "Scroll to the end of the terms to enable this"} />
      <Row><Btn variant="primary" disabled={!done || !ok} onClick={() => setAccepted(true)}>Accept and continue</Btn>{accepted && <span className="lab-ok" role="status">Accepted.</span>}</Row>
      <Note>The terms area can take keyboard focus: use the arrow keys, Page Down or End to read.</Note>
    </Stack>
  );
}

/* ---------------- C071 hold-to-confirm ---------------- */
export function HoldToConfirm({ ms = 1500, label = "Hold to delete the archive", onConfirm }: { ms?: number; label?: string; onConfirm?: () => void }) {
  const [p, setP] = useState(0); const [done, setDone] = useState(false); const start = useRef(0); const timer = useRef<number>(0); const [typed, setTyped] = useState(""); const reduce = useReducedMotion();
  const stop = () => { window.clearInterval(timer.current); timer.current = 0; if (!done) setP(0); };
  const begin = () => { if (done || timer.current) return; start.current = Date.now(); timer.current = window.setInterval(() => { const v = holdProgress(Date.now() - start.current, ms); setP(v); if (v >= 1) { window.clearInterval(timer.current); timer.current = 0; setDone(true); onConfirm?.(); } }, 30); };
  useEffect(() => () => window.clearInterval(timer.current), []);
  const finish = () => { setDone(true); setP(1); onConfirm?.(); };
  return (
    <Stack>
      <button type="button" className={`lab-hold ${done ? "is-done" : ""}`} disabled={done} aria-describedby="hold-help" onPointerDown={begin} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop} onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); begin(); } }} onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") stop(); }} onBlur={stop}>
        <span className="lab-hold__fill" style={{ inlineSize: `${p * 100}%`, transition: reduce ? "none" : undefined }} aria-hidden /><span className="lab-hold__text">{done ? "Confirmed" : p > 0 ? `Keep holding… ${Math.round(p * 100)}%` : label}</span>
      </button>
      <p id="hold-help" className="lab-note">Press and hold for {(ms / 1000).toFixed(1)} seconds (pointer, or Space/Enter on the keyboard). Releasing early cancels.</p>
      {!done && <label className="lab-field"><span className="jp-label">Or, if holding is difficult, type DELETE</span><input className="jp-input lab-narrow" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" /></label>}
      {!done && typed === "DELETE" && <Btn onClick={finish}>Confirm deletion</Btn>}
      <p role="status" className="lab-ok">{done ? "Archive deleted (simulated)." : ""}</p>
      {done && <Btn sm variant="ghost" onClick={() => { setDone(false); setP(0); setTyped(""); }}>Reset demo</Btn>}
    </Stack>
  );
}

/* ---------------- C071 slide-to-confirm ---------------- */
export function SlideToConfirm({ label = "Slide to send payment", onConfirm }: { label?: string; onConfirm?: () => void }) {
  const [v, setV] = useState(0); const [done, setDone] = useState(false); const track = useRef<HTMLDivElement>(null); const reduce = useReducedMotion(); const THUMB = 48;
  const set = (n: number) => { const x = Math.max(0, Math.min(100, n)); if (x >= 100) { setV(100); setDone(true); onConfirm?.(); } else setV(x); };
  const drag = (e: React.PointerEvent) => { if (done) return; e.preventDefault(); const el = track.current!; const move = (ev: PointerEvent) => { const r = el.getBoundingClientRect(); set(slideValue(ev.clientX - r.left - THUMB / 2, r.width, THUMB)); }; const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); setV((x) => (x >= 100 ? 100 : 0)); }; window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); };
  return (
    <Stack>
      <div ref={track} className={`lab-slide ${done ? "is-done" : ""}`}>
        <span className="lab-slide__label" aria-hidden>{done ? "Payment sent" : label}</span>
        <div role="slider" tabIndex={done ? -1 : 0} aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)} aria-valuetext={done ? "Confirmed" : `${Math.round(v)} percent. Press End to confirm.`} aria-disabled={done} className="lab-slide__thumb" style={{ insetInlineStart: `calc(${v / 100} * (100% - ${THUMB}px))`, transition: reduce || v === 0 ? undefined : "none" }} onPointerDown={drag}
          onKeyDown={(e) => { if (done) return; if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); set(v + 10); } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); set(v - 10); } else if (e.key === "End" || e.key === "Enter") { e.preventDefault(); set(100); } else if (e.key === "Home") { e.preventDefault(); set(0); } }}>{done ? "✓" : "›"}</div>
      </div>
      <p role="status" className="lab-ok">{done ? "Confirmed. Payment of $240.00 sent (simulated)." : ""}</p>
      <Note>Drag the handle all the way across, or focus it and press the right arrow repeatedly or End.</Note>
      {done && <Btn sm variant="ghost" onClick={() => { setDone(false); setV(0); }}>Reset demo</Btn>}
    </Stack>
  );
}

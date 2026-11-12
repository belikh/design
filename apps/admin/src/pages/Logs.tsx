import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, Panel, Btn, Drawer, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Switch, TextInput, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { logs as seed, logLevels, services, type LogLine } from "../data/fixtures.ts";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";

const cls = { debug: "jp-log-dim", info: "jp-log-info", warn: "jp-log-warn", error: "jp-log-danger" } as const;
export function Logs() {
  const [lines, setLines] = useState<LogLine[]>(() => [...seed].reverse()); const [lv, setLv] = useState<Set<string>>(new Set(logLevels)); const [svc, setSvc] = useState("all"); const [q, setQ] = useState(""); const [useRe, setUseRe] = useState(false);
  const [tail, setTail] = useState(true); const [wrap, setWrap] = useState(false); const [ctx, setCtx] = useState<number | null>(null); const box = useRef<HTMLDivElement>(null); const [stick, setStick] = useState(true);
  useEffect(() => { if (!tail) return; let n = 0; const t = setInterval(() => { n++; const s = services[n % services.length]; setLines((l) => [...l.slice(-800), { t: new Date().toISOString().slice(11, 19), level: n % 7 === 0 ? "error" : n % 3 === 0 ? "warn" : "info", svc: s.name, msg: n % 7 === 0 ? "upstream returned 502" : `heartbeat ok (${n})` }]); }, 1100); return () => clearInterval(t); }, [tail]);
  const re = useMemo(() => { if (!q) return null; try { return new RegExp(useRe ? q : q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"); } catch { return null; } }, [q, useRe]); const bad = useRe && !!q && !re;
  const view = useMemo(() => lines.map((l, i) => ({ l, i })).filter(({ l }) => lv.has(l.level) && (svc === "all" || l.svc === svc) && (!re || (re.lastIndex = 0, re.test(l.msg + " " + l.svc)))), [lines, lv, svc, re]);
  useEffect(() => { if (stick && box.current) box.current.scrollTop = box.current.scrollHeight; }, [view.length, stick]);
  const hi = (t: string) => { if (!re) return t; const out: React.ReactNode[] = []; let last = 0; t.replace(re, (m, off: number) => { out.push(t.slice(last, off), <mark key={off} className="adm-mark">{m}</mark>); last = off + m.length; return m; }); out.push(t.slice(last)); return out; };
  return (
    <>
      <PageHeader title="Log viewer" desc="Live tail, level and service filters, regex search with highlighting, and line context." crumbs={["Tools", "Logs"]} status={tail ? <Badge s="ok">live</Badge> : <Badge>paused</Badge>}
        actions={<><Switch checked={tail} onChange={setTail} label="Live tail" /><Switch checked={wrap} onChange={setWrap} label="Wrap" /><Btn icon="download" onClick={() => navigator.clipboard?.writeText(view.map(({ l }) => `${l.t} ${l.level} ${l.svc} ${l.msg}`).join("\n"))}>Copy {view.length}</Btn></>} />
      <Panel flush>
        <div className="adm-dt__bar">
          <div className="adm-row" role="group" aria-label="Levels">{logLevels.map((l) => <button key={l} className={`adm-pill ${lv.has(l) ? "is-on" : ""}`} aria-pressed={lv.has(l)} onClick={() => setLv((s) => { const n = new Set(s); n.has(l) ? n.delete(l) : n.add(l); return n; })}>{l} <small>{lines.filter((x) => x.level === l).length}</small></button>)}</div>
          <div style={{ width: 170 }}><Select value={svc} onChange={setSvc} aria-label="Service" options={["all", ...services.map((s) => s.name)]} /></div>
          <div style={{ width: 280 }}><TextInput value={q} onChange={setQ} placeholder={useRe ? "regex…" : "search…"} aria-label="Search logs" state={bad ? "error" : undefined} prefix={<Icon name="search" size={14} />} suffix={<label className="adm-check" title="Regular expression"><input type="checkbox" checked={useRe} onChange={(e) => setUseRe(e.target.checked)} /><span>.*</span></label>} /></div>
          <span className="adm-spacer" /><span className="jp-muted adm-num">{view.length} / {lines.length} lines</span>
        </div>
        <div className="adm-logbox" ref={box} onScroll={(e) => { const el = e.currentTarget; setStick(el.scrollHeight - el.scrollTop - el.clientHeight < 24); }} role="log" aria-live="off" tabIndex={0}>
          {view.map(({ l, i }) => <div key={i} className={`adm-logline ${wrap ? "is-wrap" : ""}`} onClick={() => setCtx(i)}><span className="jp-log-dim">{l.t}</span><span className={cls[l.level]}>{l.level.toUpperCase().padEnd(5)}</span><span className="jp-log-info">{l.svc}</span><span>{hi(l.msg)}</span></div>)}
          {!view.length && <div className="adm-tablemsg jp-muted">No lines match the filters.</div>}
        </div>
        {!stick && <div style={{ padding: 8, textAlign: "center", borderTop: "1px solid var(--jp-border)" }}><Btn sm onClick={() => { setStick(true); if (box.current) box.current.scrollTop = box.current.scrollHeight; }}>Jump to latest ↓</Btn></div>}
      </Panel>
      <Drawer open={ctx !== null} onClose={() => setCtx(null)} title="Line context">{ctx !== null && <div className="adm-logbox" style={{ maxHeight: "none", border: "1px solid var(--jp-border)" }}>{lines.slice(Math.max(0, ctx - 4), ctx + 5).map((l, k) => <div key={k} className={`adm-logline is-wrap ${Math.max(0, ctx - 4) + k === ctx ? "is-cur" : ""}`}><span className="jp-log-dim">{l.t}</span><span className={cls[l.level]}>{l.level.toUpperCase().padEnd(5)}</span><span className="jp-log-info">{l.svc}</span><span>{l.msg}</span></div>)}</div>}</Drawer>
    </>
  );
}

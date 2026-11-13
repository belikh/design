import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_TOKENS, checkContrast } from "@belikh/jupiter-tokens";
import { PageHeader, Panel, Btn, Badge, Spinner } from "@belikh/jupiter-ui/kit.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { AREA_ROUTES } from "../../registry.ts";
import { ROUTES } from "../../../routes.ts";
import { runSql } from "../lib/sql.ts";
import { jq } from "../lib/jq.ts";
import { parseCron } from "../lib/cron.ts";
import { parseYaml } from "../lib/yaml.ts";
import { TABLES } from "../lib/data.ts";
import "../tools.css";

type Status = "pass" | "warn" | "fail" | "info";
type Result = { status: Status; detail: string; ms: number };
type Check = { id: string; group: string; name: string; run: () => Promise<{ status: Status; detail: string }> | { status: Status; detail: string } };
const nav = navigator as Navigator & { locks?: unknown; deviceMemory?: number };
export const CHECKS: Check[] = [
  { id: "ls", group: "Browser", name: "localStorage works", run: () => { try { localStorage.setItem("pt-diag", "1"); const ok = localStorage.getItem("pt-diag") === "1"; localStorage.removeItem("pt-diag"); return ok ? { status: "pass", detail: "Read and write succeeded" } : { status: "fail", detail: "Value did not round-trip" }; } catch (e) { return { status: "fail", detail: `Blocked: ${e instanceof Error ? e.message : "error"}` }; } } },
  { id: "bc", group: "Browser", name: "BroadcastChannel (cross-tab sync)", run: () => (typeof BroadcastChannel !== "undefined" ? { status: "pass", detail: "Available: kiosk and dashboards can sync across tabs" } : { status: "warn", detail: "Missing: warehouse tabs will not sync" }) },
  { id: "locks", group: "Browser", name: "Web Locks (leader election)", run: () => (nav.locks ? { status: "pass", detail: "Available" } : { status: "warn", detail: "Missing: every tab runs its own simulation clock" }) },
  { id: "clip", group: "Browser", name: "Clipboard API", run: () => (navigator.clipboard ? { status: "pass", detail: window.isSecureContext ? "Available in a secure context" : "Present, but this page is not a secure context" } : { status: "warn", detail: "Missing: copy buttons will not work" }) },
  { id: "fs", group: "Browser", name: "Fullscreen API", run: () => (document.fullscreenEnabled ? { status: "pass", detail: "Available (kiosk wall mode, chart fullscreen)" } : { status: "warn", detail: "Unavailable here" }) },
  { id: "obs", group: "Browser", name: "ResizeObserver and IntersectionObserver", run: () => (typeof ResizeObserver !== "undefined" && typeof IntersectionObserver !== "undefined" ? { status: "pass", detail: "Both available" } : { status: "fail", detail: "Charts and the anchor nav need these" }) },
  { id: "cookies", group: "Browser", name: "Cookies enabled", run: () => ({ status: navigator.cookieEnabled ? "pass" : "info", detail: navigator.cookieEnabled ? "Enabled" : "Disabled (the app does not need cookies)" }) },
  { id: "online", group: "Browser", name: "Network status", run: () => ({ status: navigator.onLine ? "pass" : "warn", detail: navigator.onLine ? "Online" : "Offline: the app works, but links to external sites will not" }) },
  { id: "mix", group: "Rendering", name: "CSS color-mix()", run: () => (typeof CSS !== "undefined" && CSS.supports?.("color", "color-mix(in oklab, red, blue)") ? { status: "pass", detail: "Supported (chart palette, tints)" } : { status: "fail", detail: "Unsupported: chart colours and tints will fall back" }) },
  { id: "has", group: "Rendering", name: "CSS :has() and oklch()", run: () => { const a = typeof CSS !== "undefined" && CSS.supports?.("selector(:has(a))"); const b = typeof CSS !== "undefined" && CSS.supports?.("color", "oklch(0.7 0.1 200)"); return a && b ? { status: "pass", detail: "Both supported" } : { status: "warn", detail: `:has ${a ? "yes" : "no"}, oklch ${b ? "yes" : "no"}` }; } },
  { id: "tokens", group: "Design system", name: "Design tokens are loaded", run: () => { const v = getComputedStyle(document.documentElement).getPropertyValue("--jp-accent").trim(); return v ? { status: "pass", detail: `--jp-accent = ${v}` } : { status: "fail", detail: "--jp-accent is empty: the token stylesheet did not load" }; } },
  { id: "contrast", group: "Design system", name: "Palette meets WCAG AA (light and dark)", run: () => { const bad = (["light", "dark"] as const).flatMap((s) => checkContrast(DEFAULT_TOKENS.color[s]).filter((r) => !r.pass).map((r) => `${s}:${r.fg}/${r.bg}`)); return bad.length ? { status: "fail", detail: `Failing pairs: ${bad.join(", ")}` } : { status: "pass", detail: `All pairs pass (tokens v${DEFAULT_TOKENS.version})` }; } },
  { id: "font", group: "Design system", name: "SGI Text font loaded", run: () => { const ok = document.fonts?.check?.('14px "SGI Text"'); return ok ? { status: "pass", detail: "Loaded" } : { status: "info", detail: "Not available: the system font fallback is in use (the SGI files are proprietary and not bundled)" }; } },
  { id: "routes", group: "App", name: "Route registry is consistent", run: () => { const paths = ROUTES.map((r) => r.path.split("?")[0]); const dup = paths.filter((p, i) => paths.indexOf(p) !== i); return dup.length ? { status: "fail", detail: `Duplicate paths: ${[...new Set(dup)].join(", ")}` } : { status: "pass", detail: `${ROUTES.length} routes (${AREA_ROUTES.length} from P2 areas), no duplicates` }; } },
  { id: "engines", group: "App", name: "Tool engines (SQL, jq, cron, YAML)", run: () => { try { const a = runSql("select count(*) as n from orders", TABLES).rows[0].n; const b = jq(".a | map(. * 2) | add", { a: [1, 2, 3] })[0]; const c = parseCron("*/15 * * * *").min.length; const d = (parseYaml("a: 1\nb: [x, y]") as { b: string[] }).b.length; return a === TABLES.orders.length && b === 12 && c === 4 && d === 2 ? { status: "pass", detail: "All four returned the expected results" } : { status: "fail", detail: `Unexpected: ${a}, ${b}, ${c}, ${d}` }; } catch (e) { return { status: "fail", detail: e instanceof Error ? e.message : "error" }; } } },
  { id: "timer", group: "Performance", name: "Timer accuracy", run: () => new Promise((res) => { const t = performance.now(); setTimeout(() => { const d = performance.now() - t - 100; res(d < 60 ? { status: "pass", detail: `setTimeout(100) drifted by ${d.toFixed(1)} ms` } : { status: "warn", detail: `Drift ${d.toFixed(0)} ms: the tab is throttled or busy` }); }, 100); }) },
  { id: "dom", group: "Performance", name: "Render budget", run: () => { const t = performance.now(); const el = document.createElement("div"); for (let i = 0; i < 2000; i++) { const c = document.createElement("span"); c.textContent = String(i); el.appendChild(c); } document.body.appendChild(el); void el.offsetHeight; el.remove(); const ms = performance.now() - t; return ms < 80 ? { status: "pass", detail: `2,000 nodes built and laid out in ${ms.toFixed(1)} ms` } : { status: "warn", detail: `Slow: ${ms.toFixed(0)} ms for 2,000 nodes` }; } },
  { id: "viewport", group: "Layout", name: "Viewport", run: () => ({ status: window.innerWidth >= 360 ? "pass" : "warn", detail: `${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x${window.innerWidth < 360 ? " (narrower than the 360px target)" : ""}` }) },
];
export function Diagnostics() {
  const [res, setRes] = useState<Record<string, Result>>({}); const [running, setRunning] = useState(false);
  const runOne = useCallback(async (c: Check) => { const t = performance.now(); let r: { status: Status; detail: string }; try { r = await c.run(); } catch (e) { r = { status: "fail", detail: e instanceof Error ? e.message : "threw" }; } setRes((x) => ({ ...x, [c.id]: { ...r, ms: Math.round((performance.now() - t) * 10) / 10 } })); }, []);
  const runAll = useCallback(async () => { setRunning(true); setRes({}); for (const c of CHECKS) await runOne(c); setRunning(false); }, [runOne]);
  useEffect(() => { void runAll(); }, [runAll]);
  const vals = Object.values(res); const n = (s: Status) => vals.filter((v) => v.status === s).length; const groups = useMemo(() => [...new Set(CHECKS.map((c) => c.group))], []);
  const report = () => JSON.stringify({ at: new Date().toISOString(), ua: navigator.userAgent, results: CHECKS.map((c) => ({ id: c.id, name: c.name, ...res[c.id] })) }, null, 2);
  return (
    <>
      <PageHeader title="Diagnostics and self-test" crumbs={["Tools", "Diagnostics"]} desc="Checks this browser and the app: the features the template relies on, the design tokens, the route registry and the tool engines. Run it when something behaves oddly."
        status={running ? <Badge s="info"><Spinner size={10} /> running</Badge> : n("fail") ? <Badge s="danger">{n("fail")} failing</Badge> : n("warn") ? <Badge s="warn">{n("warn")} warning{n("warn") > 1 ? "s" : ""}</Badge> : <Badge s="ok">all good</Badge>}
        actions={<><Btn icon="refresh" disabled={running} onClick={() => void runAll()}>Run again</Btn><Btn icon="copy" disabled={running} onClick={() => navigator.clipboard?.writeText(report())}>Copy report</Btn></>} />
      <div className="adm-grid adm-grid--4"><StatTile label="Passed" value={String(n("pass"))} sub={`of ${CHECKS.length}`} /><StatTile label="Warnings" value={String(n("warn"))} sub="degraded features" /><StatTile label="Failed" value={String(n("fail"))} sub="need attention" /><StatTile label="Info" value={String(n("info"))} sub="notes" /></div>
      {groups.map((g) => (
        <Panel key={g} title={g} className="adm-section" flush>
          <ul className="adm-list">{CHECKS.filter((c) => c.group === g).map((c) => { const r = res[c.id]; return (
            <li key={c.id}><span style={{ width: 70 }}>{r ? <Badge s={r.status === "pass" ? "ok" : r.status === "warn" ? "warn" : r.status === "fail" ? "danger" : "info"}>{r.status}</Badge> : <Spinner size={14} />}</span><div className="adm-list__main"><b>{c.name}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{r?.detail ?? "running…"}</span></div><span className="jp-muted adm-num">{r ? `${r.ms} ms` : ""}</span><Btn sm variant="ghost" onClick={() => void runOne(c)}>Re-run</Btn></li>); })}</ul>
        </Panel>))}
    </>
  );
}

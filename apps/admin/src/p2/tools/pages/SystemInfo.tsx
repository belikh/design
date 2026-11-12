import { useEffect, useMemo, useState } from "react";
import { version as reactVersion } from "react";
import { DEFAULT_TOKENS } from "@belikh/jupiter-tokens";
import { PageHeader, Panel, Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { ROUTES } from "../../../routes.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import "../tools.css";

type Nav = Navigator & { deviceMemory?: number; connection?: { effectiveType?: string; downlink?: number }; userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] } };
const n = navigator as Nav;
function browser(ua: string) { const m = /(Firefox|Edg|Chrome|Chromium|Safari)\/([\d.]+)/.exec(ua); return m ? `${m[1] === "Edg" ? "Edge" : m[1]} ${m[2].split(".")[0]}` : "Unknown"; }
const LIBS = [["React", reactVersion, "MIT"], ["React Router", "7", "MIT"], ["Vite", "8", "MIT"], ["TypeScript", "7", "Apache-2.0"], ["Vitest + Testing Library", "5", "MIT"], ["JetBrains Mono", "—", "SIL OFL 1.1"], ["SGI Text / SGI Alt", "—", "Proprietary (Bitstream): not redistributed"]];
export function SystemInfo() {
  const { theme, density, contrast, lang } = usePrefs(); const [est, setEst] = useState<{ usage?: number; quota?: number }>({}); const [vp, setVp] = useState(`${innerWidth}×${innerHeight}`);
  useEffect(() => { navigator.storage?.estimate?.().then(setEst).catch(() => undefined); const h = () => setVp(`${innerWidth}×${innerHeight}`); window.addEventListener("resize", h); return () => window.removeEventListener("resize", h); }, []);
  const keys = useMemo(() => { try { return Object.keys(localStorage).filter((k) => k.startsWith("jp-") || k.startsWith("pt-") || k.startsWith("adm-")).map((k) => ({ k, size: (localStorage.getItem(k) ?? "").length })); } catch { return []; } }, []);
  const mq = (q: string) => (typeof matchMedia === "function" ? matchMedia(q).matches : false);
  const app: [string, string][] = [["Application", "Jupiter admin template"], ["Design tokens", `${DEFAULT_TOKENS.name} ${DEFAULT_TOKENS.version}`], ["React", reactVersion], ["Mode", import.meta.env.MODE], ["Routes", String(ROUTES.length)], ["Theme / density", `${theme} / ${density}`], ["Contrast / language", `${contrast} / ${lang}`]];
  const env: [string, string][] = [["Browser", browser(navigator.userAgent)], ["Platform", n.userAgentData?.platform ?? navigator.platform ?? "—"], ["Languages", (navigator.languages ?? [navigator.language]).join(", ")], ["Time zone", Intl.DateTimeFormat().resolvedOptions().timeZone], ["Viewport", `${vp} @${devicePixelRatio}x`], ["Screen", `${screen.width}×${screen.height}`], ["Colour scheme", mq("(prefers-color-scheme: dark)") ? "dark" : "light"], ["Reduced motion", mq("(prefers-reduced-motion: reduce)") ? "yes" : "no"], ["Touch points", String(navigator.maxTouchPoints ?? 0)], ["CPU threads", String(navigator.hardwareConcurrency ?? "—")], ["Device memory", n.deviceMemory ? `${n.deviceMemory} GB` : "—"], ["Connection", n.connection?.effectiveType ? `${n.connection.effectiveType}, ${n.connection.downlink} Mbps` : "—"], ["Online", navigator.onLine ? "yes" : "no"]];
  const bundle = () => [...app, ...env].map(([k, v]) => `${k}: ${v}`).join("\n") + `\nUser agent: ${navigator.userAgent}`;
  const mb = (b?: number) => (b === undefined ? "—" : b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`);
  return (
    <>
      <PageHeader title="System info and about" crumbs={["Tools", "System info"]} desc="What this app is running on, what it stores in your browser, and the open-source licences it relies on. Copy the support bundle when reporting a problem." actions={<Btn icon="copy" onClick={() => navigator.clipboard?.writeText(bundle())}>Copy support bundle</Btn>} />
      <div className="adm-grid adm-grid--2">
        <Panel title="Application"><dl className="adm-dl" style={{ gridTemplateColumns: "140px 1fr" }}>{app.map(([k, v]) => <><dt key={k}>{k}</dt><dd key={k + "v"} className="adm-num">{v}</dd></>)}</dl></Panel>
        <Panel title="Environment"><dl className="adm-dl" style={{ gridTemplateColumns: "140px 1fr" }}>{env.map(([k, v]) => <><dt key={k}>{k}</dt><dd key={k + "v"} className="adm-num">{v}</dd></>)}</dl></Panel>
        <Panel title="Storage" actions={<Badge>{mb(est.usage)} of {mb(est.quota)}</Badge>}>
          {keys.length ? <table className="jp-table"><thead><tr><th>Key</th><th className="jp-num">Characters</th></tr></thead><tbody>{keys.map((k) => <tr key={k.k}><td className="adm-num">{k.k}</td><td className="jp-num">{k.size.toLocaleString()}</td></tr>)}</tbody></table> : <p className="jp-muted">Nothing stored yet.</p>}
          <div style={{ marginTop: 8 }}><Btn sm onClick={() => { keys.filter((k) => k.k.startsWith("pt-")).forEach((k) => localStorage.removeItem(k.k)); location.reload(); }}>Clear tools data</Btn></div>
        </Panel>
        <Panel title="Open-source and font licences" flush><table className="jp-table"><thead><tr><th>Component</th><th>Version</th><th>Licence</th></tr></thead><tbody>{LIBS.map(([a, b, c]) => <tr key={a}><td>{a}</td><td className="adm-num">{b}</td><td>{c}</td></tr>)}</tbody></table></Panel>
      </div>
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import type { Route } from "../../routes.ts";

/** A valid, unique DOM id for a nav group (group names may contain spaces and punctuation). */
export const navId = (g: string) => `nav-${g.replace(/\W+/g, "-")}-${[...g].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36)}`;
const KEY = "adm-nav-open";
const OPEN_BY_DEFAULT = ["Foundations", "Build", "Ship", "Dashboards"];
const read = (): Record<string, boolean> => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, boolean>; } catch { return {}; } };

/** Sidebar navigation built for ~120 routes: collapsible groups (remembered), a filter box, active-route auto-expand, arrow-key movement. */
export function SideNav({ routes, t, rail }: { routes: Route[]; t: (s: string) => string; rail?: boolean }) {
  const loc = useLocation(); const [q, setQ] = useState(""); const [open, setOpen] = useState<Record<string, boolean>>(read); const root = useRef<HTMLElement>(null);
  const groups = useMemo(() => { const m = new Map<string, Route[]>(); for (const r of routes) m.set(r.group, [...(m.get(r.group) ?? []), r]); return [...m.entries()]; }, [routes]);
  const activeGroup = routes.filter((r) => loc.pathname === r.path.split("?")[0]).map((r) => r.group)[0];
  const isOpen = (g: string) => (g === activeGroup ? open[g] !== false : open[g] ?? OPEN_BY_DEFAULT.includes(g));
  const toggle = (g: string) => setOpen((o) => { const n = { ...o, [g]: !isOpen(g) }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  useEffect(() => { /* a newly navigated group opens (unless the user collapsed it on purpose) */ }, [activeGroup]);
  const s = q.trim().toLowerCase(); const match = (r: Route) => !s || `${t(r.label)} ${r.label} ${r.keywords ?? ""} ${r.group}`.toLowerCase().includes(s);
  const key = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    const items = [...(root.current?.querySelectorAll<HTMLElement>("input.adm-navfilter, button.adm-nav__toggle, a.adm-navlink") ?? [])]; const i = items.indexOf(document.activeElement as HTMLElement); if (i < 0) return;
    e.preventDefault(); const n = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))); items[n].focus();
  };
  const shown = groups.map(([g, rs]) => [g, rs.filter(match)] as const).filter(([, rs]) => rs.length);
  return (
    <nav className="adm-nav" ref={root} onKeyDown={key} aria-label="Pages">
      {!rail && <div className="adm-navfilterwrap"><Icon name="search" size={14} /><input className="adm-navfilter" type="search" placeholder="Filter pages…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter pages" /></div>}
      {shown.map(([g, rs]) => {
        const expanded = rail || !!s || isOpen(g);
        return (
          <div key={g} className="adm-navgroup">
            {!rail && <button type="button" className="adm-nav__h adm-nav__toggle" aria-expanded={expanded} aria-controls={navId(g)} onClick={() => !s && toggle(g)}><Icon name={expanded ? "chevron-down" : "chevron-right"} size={12} />{t(g)}<span className="adm-count">{rs.length}</span></button>}
            {expanded && <div id={navId(g)} role="group" aria-label={t(g)}>{rs.map((r) => <NavLink key={r.path} to={r.path} viewTransition end title={t(r.label)} className={({ isActive }) => `adm-navlink${isActive && !r.path.includes("?") ? " active" : ""}`}><Icon name={r.icon} size={18} /><span>{t(r.label)}</span></NavLink>)}</div>}
          </div>
        );
      })}
      {!shown.length && <p className="jp-muted" style={{ padding: "8px 12px" }}>No pages match “{q}”.</p>}
    </nav>
  );
}

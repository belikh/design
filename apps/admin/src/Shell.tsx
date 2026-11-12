import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "./routes.ts";
import { useDs } from "./docs/store.tsx";
import { P2_ROUTES } from "./p2/registry.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { Icon } from "@belikh/jupiter-ui/Icon.tsx";
import { Avatar, Badge, Btn, CrumbSiblings, Kbd, Menu, Modal } from "@belikh/jupiter-ui/kit.tsx";
import { UnsavedGuardHost } from "@belikh/jupiter-ui/forms.tsx";
import { useSelectionContext } from "@belikh/jupiter-ui/selection.ts";
import { recordVisit, useRecent, usePinned, togglePin } from "./shell/recents.ts";
import { clearUndo, inTextField, redo, undo, useUndoState } from "@belikh/jupiter-ui/undo.ts";
import { ErrorBoundary } from "@belikh/jupiter-ui/ErrorBoundary.tsx";
import { LANGS } from "@belikh/jupiter-ui/i18n.ts";
import { SideNav } from "./p2/chrome/nav.tsx";
import { Banners, ConsentBar, EnvBadge, HelpPanel, ShortcutSheet, StatusBar, WorkspaceMenu } from "./p2/chrome/shellparts.tsx";
import { useShortcut } from "./p2/chrome/shortcuts.ts";
import { system } from "./p2/chrome/system.ts";
import { applyTouchMode, touchModeSaved } from "./p2/chrome/PagesScale.tsx";

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState(""); const [hi, setHi] = useState(0); const nav = useNavigate(); const { setTheme, setDensity, toast } = usePrefs();
  const inputRef = useRef<HTMLInputElement>(null); const sel = useSelectionContext(); const recent = useRecent(); const pinned = usePinned(); const here0 = useLocation().pathname; const us = useUndoState();
  const items = useMemo(() => {
    const here = (sel?.actions ?? []).map((a) => ({ label: a.label, hint: `${sel!.count} selected`, icon: "check", run: a.run, text: `${a.label} ${a.text ?? ""} selected selection` }));
    const byPath = (p: string) => ROUTES.find((r) => r.path === p);
    const pins = pinned.map(byPath).filter(Boolean).map((r) => ({ label: r!.label, hint: "Pinned", icon: "pin", run: () => nav(r!.path), text: `${r!.label} pinned` }));
    const recs = recent.filter((p) => p !== here0 && !pinned.includes(p)).slice(0, 5).map(byPath).filter(Boolean).map((r) => ({ label: r!.label, hint: "Recent", icon: "clock", run: () => nav(r!.path), text: `${r!.label} recent` }));
    const hist = [...(us.canUndo ? [{ label: `Undo: ${us.undoLabel}`, hint: "Ctrl+Z", icon: "undo", run: () => void undo(), text: "undo revert last change" }] : []), ...(us.canRedo ? [{ label: `Redo: ${us.redoLabel}`, hint: "Ctrl+Shift+Z", icon: "redo", run: () => void redo(), text: "redo reapply change" }] : [])];
    const cur = byPath(here0); const pinAct = cur ? [{ label: pinned.includes(here0) ? "Unpin this page" : "Pin this page", hint: "Action", icon: "pin", run: () => togglePin(here0), text: "pin unpin favourite page" }] : [];
    const create = [{ label: "Create: new item (wizard)", hint: "Create", icon: "plus", run: () => nav("/new"), text: "create new add wizard" }, { label: "Create: task on the board", hint: "Create", icon: "plus", run: () => nav("/board"), text: "create new task card board" }, { label: "Create: edit a record", hint: "Create", icon: "plus", run: () => nav("/edit"), text: "create new record form" }];
    const go = ROUTES.map((r) => ({ label: r.label, hint: r.group, icon: r.icon, run: () => nav(r.path), text: `${r.label} ${r.keywords ?? ""} ${r.group}` }));
    const act = [
      { label: "Switch to dark theme", hint: "Action", icon: "moon", run: () => setTheme("dark"), text: "dark theme" },
      { label: "Switch to light theme", hint: "Action", icon: "sun", run: () => setTheme("light"), text: "light theme" },
      { label: "Compact density", hint: "Action", icon: "sliders", run: () => setDensity("compact"), text: "density compact" },
      { label: "Comfortable density", hint: "Action", icon: "sliders", run: () => setDensity("comfortable"), text: "density comfortable" },
      { label: "Show a toast", hint: "Action", icon: "bell", run: () => toast({ kind: "ok", title: "Hello from the palette" }), text: "toast notification" },
      { label: "Start the product tour", hint: "Action", icon: "flag", run: () => nav("/chrome/onboarding?tour=1"), text: "product tour onboarding walkthrough" },
      { label: "View the app as a viewer", hint: "Action", icon: "eye", run: () => system.setRole("viewer"), text: "view as role viewer permissions" },
      { label: "Back to admin role", hint: "Action", icon: "user", run: () => system.setRole("admin"), text: "view as role admin permissions" },
      { label: "Turn read-only mode on", hint: "Action", icon: "lock", run: () => system.setReadOnly(true), text: "read only readonly mode" },
      { label: "Turn read-only mode off", hint: "Action", icon: "unlock", run: () => system.setReadOnly(false), text: "read only readonly mode off" },
    ];
    const s = q.trim().toLowerCase(); const score = (i: { label: string; text: string }) => (i.label.toLowerCase().startsWith(s) ? 0 : i.label.toLowerCase().includes(s) ? 1 : 2);
    return [...here, ...hist, ...(s ? [] : [...pins, ...recs]), ...go, ...pinAct, ...create, ...act].filter((i) => !s || `${i.label} ${i.text}`.toLowerCase().includes(s)).sort((a, b) => (s ? score(a) - score(b) : 0));
  }, [q, nav, setTheme, setDensity, toast, sel, recent, pinned, here0, us]);
  useEffect(() => { if (open) { setQ(""); setHi(0); setTimeout(() => inputRef.current?.focus(), 0); } }, [open]);
  const run = (i: number) => { items[i]?.run(); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Command palette" size="md">
      <div className="adm-input"><span className="adm-input__add"><Icon name="search" size={16} /></span>
        <input ref={inputRef} className="jp-input" placeholder="Jump to a page or run an action…" value={q} aria-label="Command" onChange={(e) => { setQ(e.target.value); setHi(0); }}
          onKeyDown={(e) => { if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(items.length - 1, h + 1)); } else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); } else if (e.key === "Enter") run(hi); }} /></div>
      <ul className="adm-combo__list" style={{ position: "static", boxShadow: "none", border: 0, maxHeight: 360, overflow: "auto", marginTop: 8 }} role="listbox" aria-label="Results">
        {items.slice(0, 40).map((it, i) => <li key={`${it.hint}:${it.label}`} role="option" aria-selected={i === hi} className={i === hi ? "is-hi" : ""} onMouseEnter={() => setHi(i)} onClick={() => run(i)}><span className="adm-row"><Icon name={it.icon} size={16} />{it.label}<span className="adm-spacer" /><small style={{ opacity: .7 }}>{it.hint}</small></span></li>)}
        {!items.length && <li className="jp-muted adm-combo__none">No results</li>}
      </ul>
    </Modal>
  );
}

const crumbSiblings = (crumb: string) => ROUTES.filter((r) => r.group === crumb).map((r) => ({ label: r.label, path: r.path }));
export function Shell() {
  const { theme, setTheme, density, setDensity, lang, setLang, t, resolvedTheme } = usePrefs(); const { tokens, isCustom } = useDs();
  const [rail, setRail] = useState(false); const [navOpen, setNavOpen] = useState(false); const [pal, setPal] = useState(false); const [keys, setKeys] = useState(false); const [help, setHelp] = useState(false); const loc = useLocation();
  const [sideW, setSideW] = useState(() => { try { return Math.min(420, Math.max(200, Number(localStorage.getItem("jp-side-w")) || 260)); } catch { return 260; } });
  const setW = useCallback((w: number) => { const v = Math.min(420, Math.max(200, Math.round(w))); setSideW(v); try { localStorage.setItem("jp-side-w", String(v)); } catch { /* ignore */ } }, []);
  const [drag, setDrag] = useState(false); const pinned = usePinned(); const nav = useNavigate();
  useEffect(() => { if (ROUTES.some((r) => r.path === loc.pathname)) recordVisit(loc.pathname); clearUndo(); setNavOpen(false); }, [loc.pathname]);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (!(e.ctrlKey || e.metaKey) || e.altKey || inTextField(e.target)) return; const k = e.key.toLowerCase(); if (k === "z" && !e.shiftKey) { e.preventDefault(); void undo(); } else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); void redo(); } }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, []);
  // Back/forward restore scroll position per history entry
  useEffect(() => { const el = document.querySelector<HTMLElement>(".adm-main"); if (!el) return; const k = `jp-scroll:${loc.key}`; let y = 0; try { y = Number(sessionStorage.getItem(k)) || 0; } catch { /* ignore */ } requestAnimationFrame(() => { el.scrollTop = y; }); const save = () => { try { sessionStorage.setItem(k, String(el.scrollTop)); } catch { /* ignore */ } }; el.addEventListener("scroll", save, { passive: true }); return () => el.removeEventListener("scroll", save); }, [loc.key]);
  useEffect(() => { applyTouchMode(touchModeSaved()); }, []);
  const togglePal = useCallback(() => setPal((p) => !p), []); const toggleKeys = useCallback(() => setKeys((k) => !k), []); const toggleHelp = useCallback(() => setHelp((h) => !h), []); const toggleRail = useCallback(() => setRail((r) => !r), []);
  useShortcut("pal", "mod+k", "Command palette", togglePal); useShortcut("keys", "?", "Keyboard shortcuts", toggleKeys); useShortcut("help", "f1", "Help for this page", toggleHelp); useShortcut("rail", "alt+b", "Collapse or expand the sidebar", toggleRail);
  if (P2_ROUTES.some((r) => r.bare && r.path === loc.pathname) || ["/kiosk", "/wh/kiosk", "/wh/lobby"].includes(loc.pathname) || loc.pathname.startsWith("/auth") || loc.pathname.startsWith("/wh/ticket") || loc.pathname.startsWith("/wh/portal") || loc.pathname.startsWith("/wh/forklift")) return <Outlet />;
  return (
    <CrumbSiblings.Provider value={crumbSiblings}>
    <div className={`adm-shell ${rail ? "is-rail" : ""} ${navOpen ? "is-nav-open" : ""}`} style={rail ? undefined : ({ "--adm-side": `${sideW}px` } as React.CSSProperties)}>
      <aside className="adm-side" aria-label="Primary">
        <Link className="adm-brand" to="/" data-testid="brand-home-link" aria-label="jupiter /ds, home"><span className="adm-brand__mark" aria-hidden="true" /><span>jupiter <span className="jp-muted">/ds</span></span></Link>
        {pinned.length > 0 && <nav className="adm-pinned-nav" aria-label="Pinned pages"><span className="jp-label">Pinned</span>{pinned.map((p) => ROUTES.find((r) => r.path === p)).filter(Boolean).map((r) => <NavLink key={r!.path} to={r!.path} title={r!.label}><Icon name={r!.icon} size={16} /><span>{r!.label}</span></NavLink>)}</nav>}
        <SideNav routes={ROUTES} t={t} rail={rail} />
        {!rail && <div className="adm-sidestatus jp-mono" data-testid="status-line"><div>theme <b>{resolvedTheme}</b>{theme === "auto" ? " (os)" : ""}</div><div>tokens <b>{isCustom ? "custom" : "default"}</b></div><div>build step <b>none</b></div></div>}
        {!rail && <div className="adm-resize-side" role="separator" aria-orientation="vertical" aria-label="Resize sidebar" aria-valuenow={sideW} aria-valuemin={200} aria-valuemax={420} tabIndex={0} data-drag={drag || undefined}
          onKeyDown={(e) => { if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setW(sideW + (e.key === "ArrowRight" ? 16 : -16) * (document.dir === "rtl" ? -1 : 1)); } }}
          onDoubleClick={() => setW(260)}
          onPointerDown={(e) => { e.preventDefault(); setDrag(true); const mv = (ev: PointerEvent) => setW(document.dir === "rtl" ? innerWidth - ev.clientX : ev.clientX); const up = () => { setDrag(false); document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); }; document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); }} />}
      </aside>
      <header className="adm-top">
        <Btn variant="ghost" sm aria-label="Toggle sidebar" aria-expanded={navOpen || undefined} onClick={() => (window.matchMedia?.("(max-width: 860px)").matches ? setNavOpen((o) => !o) : setRail(!rail))}><Icon name="menu" size={18} /></Btn>
        <span className="jp-badge adm-hide-sm" data-testid="version-badge">v{tokens.version}</span>
        {isCustom && <Link to="/editor" className="jp-badge jp-badge--warn adm-hide-sm" data-testid="custom-tokens-badge">custom tokens</Link>}
        <button className="adm-search" onClick={() => setPal(true)} aria-label="Open command palette"><Icon name="search" size={16} /><span>{t("Search or jump to…")}</span><Kbd>⌘K</Kbd></button>
        <span className="adm-spacer" />
        <Menu label="Create" icon="plus" items={[{ label: "New item (wizard)", onSelect: () => nav("/new") }, { label: "Task on the board", onSelect: () => nav("/board") }, { label: "Edit a record", onSelect: () => nav("/edit") }, "sep", { label: "Command palette…", onSelect: () => setPal(true), hint: "Ctrl+K" }]} />
        <WorkspaceMenu />
        <EnvBadge />
        <Btn variant="ghost" sm aria-label="Keyboard shortcuts" onClick={() => setKeys(true)}><Icon name="help" size={18} /></Btn>
        <Menu label="Display" icon="sliders" items={[
          ...(["auto", "light", "dark"] as const).map((v) => ({ label: `${theme === v ? "✓ " : ""}Theme: ${v[0].toUpperCase()}${v.slice(1)}`, onSelect: () => setTheme(v) })), "sep" as const,
          ...(["comfortable", "compact"] as const).map((v) => ({ label: `${density === v ? "✓ " : ""}Density: ${v[0].toUpperCase()}${v.slice(1)}`, onSelect: () => setDensity(v) })), "sep" as const,
          ...LANGS.map((l) => ({ label: `${lang === l.code ? "✓ " : ""}Language: ${l.label}`, onSelect: () => setLang(l.code) })),
        ]} />
        <NavLink to="/notifications" className="adm-x adm-bell" aria-label="Notifications, 3 unread"><Icon name="bell" size={20} /><b>3</b></NavLink>
        <Menu label={<span className="adm-row"><Avatar name="Ava Nguyen" size={22} s="ok" /> Ava</span>} items={[{ label: "Profile", onSelect: () => (location.href = "/profile") }, { label: "Settings", onSelect: () => (location.href = "/settings") }, "sep", { label: t("Sign out"), onSelect: () => (location.href = "/auth/sign-in"), danger: true }]} />
      </header>
      <Banners />
      <main className="adm-main" id="main"><ErrorBoundary resetKey={loc.pathname}><Outlet /></ErrorBoundary><footer className="adm-foot jp-mono jp-muted">jupiter.au · design system · generated from jupiter.tokens.json</footer></main>
      <StatusBar />
      <ConsentBar />
      <UnsavedGuardHost />
      <CommandPalette open={pal} onClose={() => setPal(false)} />
      <HelpPanel open={help} onClose={() => setHelp(false)} />
      <ShortcutSheet open={keys} onClose={() => setKeys(false)} />
    </div>
    </CrumbSiblings.Provider>
  );
}

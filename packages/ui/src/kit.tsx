import { Fragment, createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Icon, Spot } from "./Icon.tsx";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/tabs.css";
import "./styles/overlays.css";

export type Status = "ok" | "warn" | "danger" | "info";

export function Btn({ variant = "secondary", sm, icon, children, ...rest }: { variant?: "primary" | "secondary" | "ghost"; sm?: boolean; icon?: string; children?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`jp-btn jp-btn--${variant} ${sm ? "jp-btn--sm" : ""} ${rest.className ?? ""}`}>
      {icon && <Icon name={icon} size={sm ? 14 : 16} />}
      {children}
    </button>
  );
}
export const Badge = ({ s, children, pill, testId }: { s?: Status; children: ReactNode; pill?: boolean; testId?: string }) => (
  <span className={`jp-badge ${s ? `jp-badge--${s}` : ""} ${pill ? "jp-badge--pill" : ""}`} data-testid={testId}>{children}</span>
);
export const Dot = ({ s = "ok" }: { s?: Status | "off" }) => <span className={`adm-dot adm-dot--${s}`} aria-hidden />;

export function Panel({ title, actions, children, flush, className = "", id, testId }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; className?: string; id?: string; testId?: string }) {
  return (
    <section className={`jp-panel ${className}`} id={id} data-testid={testId}>
      {(title || actions) && (
        <div className="jp-panel__bar">
          <h2 className="jp-panel__title">{title}</h2>
          <div className="adm-row">{actions}</div>
        </div>
      )}
      <div className={`jp-panel__body ${flush ? "jp-panel__body--flush" : ""}`}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, desc, status, actions, tabs, crumbs, eyebrow, children }: { title: ReactNode; desc?: ReactNode; status?: ReactNode; actions?: ReactNode; tabs?: ReactNode; crumbs?: string[]; /** Small mono label above the title (the section the page belongs to). */ eyebrow?: string; /** Longer introduction under the title. */ children?: ReactNode }) {
  return (
    <header className="adm-pagehead">
      {eyebrow && <p className="jp-eyebrow">{eyebrow}</p>}
      {!eyebrow && crumbs && <Breadcrumbs items={crumbs} />}
      <div className="adm-pagehead__row">
        <div>
          <h1 className="jp-display" data-testid="page-title">{title} {status}</h1>
          {desc && <p className="jp-muted">{desc}</p>}
        </div>
        <div className="adm-row">{actions}</div>
      </div>
      {children && <div className="jp-prose jp-muted">{children}</div>}
      {tabs}
    </header>
  );
}

/**
 * The one thing on a page that needs attention now, shown large: an eyebrow, a big title, a body and an action.
 * `tone` colours the leading bar and means status only (ok, warn, danger, info); omit it for the accent colour.
 */
export function Spotlight({ eyebrow, title, tone, actions, children, label }: { eyebrow?: string; title: ReactNode; tone?: Status; actions?: ReactNode; children?: ReactNode; /** Accessible name for the region. Defaults to the eyebrow. */ label?: string }) {
  return (
    <section className="adm-spotlight" data-tone={tone} aria-label={label ?? eyebrow}>
      <div className="adm-spotlight__lead">
        {eyebrow && <span className="jp-eyebrow">{eyebrow}</span>}
        <b className="adm-spotlight__title">{title}</b>
      </div>
      {children && <div className="adm-spotlight__body">{children}</div>}
      {actions && <div className="adm-spotlight__actions">{actions}</div>}
    </section>
  );
}

/**
 * A settings group: the title and an explanation on the left, the controls on the right (stacked on a phone).
 * Put several in a column, separated by a rule, instead of one long form. Give each an `id` for SettingsRail.
 */
export function SettingsSection({ id, title, desc, children }: { id?: string; title: ReactNode; desc?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="adm-setsec">
      <div className="adm-setsec__intro"><h2>{title}</h2>{desc && <p className="jp-muted">{desc}</p>}</div>
      <div className="adm-setsec__body">{children}</div>
    </section>
  );
}

/** A sticky list of links to the SettingsSection ids on a page. The current section is marked with aria-current. */
export function SettingsRail({ items, label = "Sections" }: { items: { id: string; label: string }[]; label?: string }) {
  const [now, setNow] = useState(items[0]?.id);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const seen = new Map<string, number>();
    const io = new IntersectionObserver((es) => { for (const e of es) seen.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : Infinity); const top = [...seen].filter(([, y]) => y !== Infinity).sort((a, b) => a[1] - b[1])[0]; if (top) setNow(top[0]); }, { rootMargin: "0px 0px -60% 0px" });
    for (const i of items) { const el = document.getElementById(i.id); if (el) io.observe(el); }
    return () => io.disconnect();
  }, [items]);
  return <nav className="adm-setrail" aria-label={label}>{items.map((i) => <a key={i.id} href={`#${i.id}`} aria-current={now === i.id ? "true" : undefined} onClick={() => setNow(i.id)}>{i.label}</a>)}</nav>;
}

/** A titled block of a page: optional mono kicker above an h2, then the content. */
export function Section({ id, title, kicker, children }: { id?: string; title: ReactNode; kicker?: string; children: ReactNode }) {
  return (
    <section id={id} className="adm-block">
      <div className="adm-block__head">
        {kicker && <span className="jp-label">{kicker}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

/** The design system's note: info, warn or danger, each with a text prefix so it reads without colour. */
export function Callout({ variant = "info", title, children, testId }: { variant?: "info" | "warn" | "danger"; title: string; children: ReactNode; testId?: string }) {
  return (
    <div className={variant === "info" ? "jp-callout" : `jp-callout jp-callout--${variant}`} role="note" data-testid={testId}>
      <p className="jp-callout__title">{title}</p>
      <p>{children}</p>
    </div>
  );
}

/** Mono key / value list. */
export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return <dl className="adm-facts">{items.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>;
}

/** The app supplies how to find the pages that sit under a breadcrumb (usually a nav group). Without a provider, crumbs are plain text. */
export type CrumbSibling = { label: string; path: string };
export const CrumbSiblings = createContext<(crumb: string) => CrumbSibling[]>(() => []);
/** Breadcrumbs. A crumb that names a nav group (e.g. "Records") opens a menu of its sibling pages. */
export function Breadcrumbs({ items }: { items: string[] }) {
  const siblings = useContext(CrumbSiblings);
  return (
    <nav aria-label="Breadcrumb" className="adm-crumbs">
      {items.map((x, i) => {
        const sibs = i < items.length - 1 ? siblings(x) : [];
        return <span key={x}>{i > 0 && <span aria-hidden className="jp-muted"> / </span>}
          {i === items.length - 1 ? <span aria-current="page">{x}</span> : sibs.length ? <Menu label={x} items={sibs.slice(0, 14).map((r) => ({ label: r.label, onSelect: () => { location.assign(r.path); } }))} /> : <a href="#" onClick={(e) => e.preventDefault()}>{x}</a>}</span>;
      })}
    </nav>
  );
}

/** Tabs: variant line | pill | vertical. Arrow keys move focus. */
export function Tabs({ tabs, value, onChange, variant = "line" }: { tabs: { id: string; label: ReactNode; count?: number }[]; value: string; onChange: (id: string) => void; variant?: "line" | "pill" | "vertical" }) {
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const n = e.key === "ArrowRight" || e.key === "ArrowDown" ? i + 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? i - 1 : null;
    if (n === null) return;
    const t = tabs[(n + tabs.length) % tabs.length]; onChange(t.id);
    requestAnimationFrame(() => document.getElementById(`tab-${t.id}`)?.focus());
  };
  return (
    <div role="tablist" className={`adm-tabs adm-tabs--${variant}`}>
      {tabs.map((t, i) => (
        <button key={t.id} id={`tab-${t.id}`} role="tab" aria-selected={value === t.id} tabIndex={value === t.id ? 0 : -1} onKeyDown={(e) => onKey(e, i)} onClick={() => onChange(t.id)}>
          {t.label}{t.count !== undefined && <span className="adm-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function useEsc(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h);
  }, [open, close]);
}

/**
 * Native <dialog>: gets the top layer, an inert page behind it, a focus trap, focus restore and a ::backdrop for free.
 * Falls back to a plain open <dialog> where showModal() isn't available (old browsers, jsdom).
 */
function Dlg({ onClose, className, label, children }: { onClose: () => void; className: string; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const d = ref.current!; if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", "");
    return () => { try { d.close?.(); } catch { /* already closed */ } };
  }, []);
  return (
    <dialog ref={ref} className={className} role="dialog" aria-label={label} aria-modal="true" onCancel={(e) => { e.preventDefault(); onClose(); }}
      onMouseDown={(e) => { if (e.target !== e.currentTarget) return; const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); }}>
      {children}
    </dialog>
  );
}

export function Modal({ open, onClose, title, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" }) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <Dlg onClose={onClose} className={`adm-modal adm-modal--${size}`} label={title}>
      <div className="adm-modal__head"><h3>{title}</h3><button className="adm-x" aria-label="Close" onClick={onClose}>×</button></div>
      <div className="adm-modal__body">{children}</div>
      {footer && <div className="adm-modal__foot">{footer}</div>}
    </Dlg>
  );
}

export function Drawer({ open, onClose, title, children, footer, side = "right" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; side?: "left" | "right" | "bottom" }) {
  useEsc(open, onClose);
  if (!open) return null;
  return (
    <Dlg onClose={onClose} className={`adm-drawer adm-drawer--${side}`} label={title}>
      <div className="adm-modal__head"><h3>{title}</h3><button className="adm-x" aria-label="Close" onClick={onClose}>×</button></div>
      <div className="adm-modal__body">{children}</div>
      {footer && <div className="adm-modal__foot">{footer}</div>}
    </Dlg>
  );
}

/** Destructive confirm that requires typing a phrase. */
export function ConfirmDelete({ open, onClose, onConfirm, what }: { open: boolean; onClose: () => void; onConfirm: () => void; what: string }) {
  const [v, setV] = useState("");
  useEffect(() => { if (!open) setV(""); }, [open]);
  return (
    <Modal open={open} onClose={onClose} size="sm" title={`Delete ${what}?`}
      footer={<><Btn onClick={onClose}>Cancel</Btn><Btn variant="primary" className="adm-danger" disabled={v !== what} onClick={onConfirm}>Delete permanently</Btn></>}>
      <p>This cannot be undone. Type <code>{what}</code> to confirm.</p>
      <input className="jp-input" style={{ marginTop: 12 }} value={v} onChange={(e) => setV(e.target.value)} aria-label="Confirmation" autoFocus />
    </Modal>
  );
}

export function Tip({ text, kbd, children }: { text: string; /** Keyboard shortcut shown after the text, e.g. "Ctrl+K". */ kbd?: string; children: ReactNode }) {
  const id = useId();
  return <span className="adm-tip" aria-describedby={id}>{children}<span role="tooltip" id={id} className="adm-tip__bubble">{text}{kbd && <kbd className="adm-kbd adm-tip__kbd">{kbd}</kbd>}</span></span>;
}

export function Menu({ label, items, icon, ariaLabel }: { label: ReactNode; icon?: string; /** Accessible name when `label` is only an icon. */ ariaLabel?: string; items: ({ label: string; onSelect: () => void; danger?: boolean; /** Shortcut shown on the right, e.g. "Ctrl+N". */ hint?: string } | "sep")[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null); const btnRef = useRef<HTMLDivElement>(null); const listRef = useRef<HTMLDivElement>(null);
  const native = typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;
  // CSS anchor positioning places the list next to its button with no JS (and flips at the viewport edge); the JS below is the fallback.
  const anchored = native && typeof CSS !== "undefined" && CSS.supports?.("anchor-name: --a") && CSS.supports?.("position-area: bottom"); const aid = useId().replace(/[^a-zA-Z0-9]/g, "");
  /** Popover API: the list lives in the top layer, so table and panel overflow can't clip it. Positioned from the button; flips up near the bottom. */
  useLayoutEffect(() => {
    const l = listRef.current, b = btnRef.current; if (!open || !native || !l || !b) return;
    try { l.showPopover(); } catch { return; }
    if (anchored) return () => { try { l.hidePopover(); } catch { /* closed */ } };
    const r = b.getBoundingClientRect(); const h = l.offsetHeight; const up = r.bottom + 4 + h > innerHeight && r.top - 4 - h > 0;
    l.style.top = `${up ? r.top - 4 - h : r.bottom + 4}px`; const rtl = getComputedStyle(b).direction === "rtl";
    l.style.left = rtl ? `${Math.max(4, r.left)}px` : `${Math.max(4, r.right - l.offsetWidth)}px`;
    return () => { try { l.hidePopover(); } catch { /* closed */ } };
  }, [open, native, anchored]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h); document.addEventListener("keydown", k);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("keydown", k); };
  }, [open]);
  return (
    <div className="adm-menu" ref={(el) => { ref.current = el; btnRef.current = el; }} style={anchored ? ({ anchorName: `--m${aid}` } as React.CSSProperties) : undefined}>
      <Btn sm variant="secondary" icon={icon} aria-label={ariaLabel} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>{label}</Btn>
      {open && (
        <div role="menu" ref={listRef} className={`adm-menu__list ${native ? "is-popover" : ""} ${anchored ? "is-anchored" : ""}`} style={anchored ? ({ positionAnchor: `--m${aid}` } as React.CSSProperties) : undefined} {...(native ? { popover: "manual" as const } : {})}>
          {items.map((it, i) => it === "sep" ? <hr key={i} /> : (
            <button key={it.label} role="menuitem" className={it.danger ? "is-danger" : ""} onClick={() => { it.onSelect(); setOpen(false); }}>{it.hint ? <span className="adm-menu__item"><span>{it.label}</span><kbd className="adm-kbd">{it.hint}</kbd></span> : it.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Progressive disclosure: hide advanced fields behind a labelled toggle (native <details>, keyboard and screen-reader friendly). */
export function Disclosure({ label = "Advanced options", defaultOpen, children }: { label?: string; defaultOpen?: boolean; children: ReactNode }) {
  return <details className="adm-disclosure" open={defaultOpen}><summary>{label}</summary><div className="adm-disclosure__body">{children}</div></details>;
}

/** Page-shaped loading placeholder (header, stat tiles, a table), so lazy routes don't shift the layout when they arrive. */
export function PageSkeleton() {
  return (
    <div className="adm-pageskel" data-testid="route-loading" role="status" aria-label="Loading page" aria-busy="true">
      <Skeleton w="28%" /><Skeleton w="46%" />
      <div className="adm-pageskel__tiles">{[0, 1, 2, 3].map((i) => <div key={i} className="adm-pageskel__tile"><Skeleton w="50%" /><Skeleton w="70%" /></div>)}</div>
      <div className="adm-pageskel__table">{[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} w={`${96 - (i % 3) * 8}%`} />)}</div>
    </div>
  );
}

export function Accordion({ items, multi }: { items: { id: string; title: ReactNode; body: ReactNode }[]; multi?: boolean }) {
  const [open, setOpen] = useState<string[]>([items[0]?.id]);
  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : multi ? [...o, id] : [id]));
  return (
    <div className="adm-acc">
      {items.map((it) => (
        <div key={it.id} className="adm-acc__item">
          <button aria-expanded={open.includes(it.id)} onClick={() => toggle(it.id)}><span>{it.title}</span><Icon name="chevron-down" size={16} className={open.includes(it.id) ? "is-open" : ""} /></button>
          {open.includes(it.id) && <div className="adm-acc__body">{it.body}</div>}
        </div>
      ))}
    </div>
  );
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((p) => p === 1 || p === pages || Math.abs(p - page) <= 1);
  return (
    <nav className="adm-pager" aria-label="Pagination">
      <Btn sm variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page"><Icon name="chevron-left" size={14} /></Btn>
      {nums.map((p, i) => (
        <span key={p}>{i > 0 && p - nums[i - 1] > 1 && <span className="jp-muted">…</span>}
          <button aria-current={p === page ? "page" : undefined} className={p === page ? "is-active" : ""} onClick={() => onChange(p)}>{p}</button></span>
      ))}
      <Btn sm variant="ghost" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page"><Icon name="chevron-right" size={14} /></Btn>
    </nav>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="adm-steps" aria-label="Progress">
      {steps.map((s, i) => (
        <li key={s} className={i < current ? "is-done" : i === current ? "is-current" : ""} aria-current={i === current ? "step" : undefined}>
          <span className="adm-steps__n">{i < current ? <Icon name="check" size={12} /> : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  );
}

export const Skeleton = ({ w = "100%", h = 14, r = 4 }: { w?: number | string; h?: number; r?: number }) => <span className="adm-skel" style={{ width: w, height: h, borderRadius: r }} aria-hidden />;
export const Spinner = ({ size = 16 }: { size?: number }) => <span className="adm-spin" style={{ width: size, height: size }} role="status" aria-label="Loading" />;

export function EmptyState({ spot = "koala", title, children, action }: { spot?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="adm-empty">
      <Spot name={spot} size={140} />
      <h3>{title}</h3>
      {children && <p className="jp-muted">{children}</p>}
      {action}
    </div>
  );
}

export function Alert({ s = "info", title, children, onClose }: { s?: Status; title: string; children?: ReactNode; onClose?: () => void }) {
  return (
    <div className={`adm-alert adm-alert--${s}`} role={s === "danger" ? "alert" : "status"}>
      <Icon name={s === "ok" ? "success" : s === "info" ? "info" : "alert"} size={18} />
      <div><strong>{title}</strong>{children && <p>{children}</p>}</div>
      {onClose && <button className="adm-x" aria-label="Dismiss" onClick={onClose}>×</button>}
    </div>
  );
}

export const Avatar = ({ name, size = 28, s }: { name: string; size?: number; s?: Status | "off" }) => {
  const ini = name.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <span className="adm-avatar" style={{ width: size, height: size, fontSize: size * 0.4, ["--h" as string]: hue }} title={name}>{ini}{s && <i className={`adm-dot adm-dot--${s}`} />}</span>;
};
export const AvatarStack = ({ names, max = 3 }: { names: string[]; max?: number }) => (
  <span className="adm-avstack">{names.slice(0, max).map((n) => <Avatar key={n} name={n} size={24} />)}{names.length > max && <span className="adm-avatar adm-avatar--more">+{names.length - max}</span>}</span>
);

export const Kbd = ({ children }: { children: ReactNode }) => <kbd className="adm-kbd">{children}</kbd>;

export function CodeBlock({ code, label = "code", testId, maxHeight }: { code: string; label?: string; testId?: string; /** CSS max-height of the scroll area, e.g. "18rem". */ maxHeight?: string }) {
  const [c, setC] = useState(false);
  return (
    <div className="jp-code" data-testid={testId}>
      <div className="jp-code__bar"><span>{label}</span><button type="button" className="jp-code__copy" data-testid={testId ? `${testId}-copy` : undefined} onClick={() => { void navigator.clipboard?.writeText(code); setC(true); setTimeout(() => setC(false), 1200); }}>{c ? "copied" : "copy"}</button></div>
      <pre className="adm-pre" style={maxHeight ? { maxHeight } : undefined}>{code}</pre>
    </div>
  );
}

export const Delta = ({ v, suffix = "%", invert }: { v: number; suffix?: string; invert?: boolean }) => {
  const good = invert ? v < 0 : v >= 0;
  return <span className={good ? "jp-delta--up" : "jp-delta--down"}>{Math.abs(v).toFixed(1)}{suffix}</span>;
};

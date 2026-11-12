import { tr, LANGS, type Lang } from "./i18n.ts";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "auto" | "light" | "dark";
export type Density = "comfortable" | "compact";
type Toast = { id: number; kind: "ok" | "warn" | "danger" | "info"; title: string; body?: string; undo?: () => void; /** How many identical toasts were folded into this one. */ count?: number };
type Ctx = {
  theme: Theme; setTheme: (t: Theme) => void;
  /** The theme actually shown: `theme`, or the OS preference when `theme` is "auto". */
  resolvedTheme: "light" | "dark";
  density: Density; setDensity: (d: Density) => void;
  contrast: "normal" | "high"; setContrast: (c: "normal" | "high") => void;
  /** How inline edits commit: when focus leaves ("blur") or only with Save / Enter ("explicit"). Every Editable defaults to this. */
  editCommit: "blur" | "explicit"; setEditCommit: (m: "blur" | "explicit") => void;
  lang: Lang; setLang: (l: Lang) => void; t: (s: string) => string;
  toast: (t: Omit<Toast, "id">) => void;
};
const C = createContext<Ctx | null>(null);
/** Like usePrefs but returns null outside a provider (lets shared components degrade to defaults). */
export const usePrefsOptional = () => useContext(C);
export const usePrefs = () => { const c = useContext(C); if (!c) throw new Error("PrefsProvider missing"); return c; };

const osQuery = () => window.matchMedia("(prefers-color-scheme: dark)");
const subscribeOs = (cb: () => void) => { const m = osQuery(); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); };
const osDark = () => osQuery().matches;
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeS] = useState<Theme>(() => (new URLSearchParams(location.search).get("theme") as Theme) || (read("jp-theme") as Theme) || "auto");
  const [density, setDensityS] = useState<Density>(() => (read("jp-density") as Density) || "comfortable");
  const [editCommit, setEditCommitS] = useState<"blur" | "explicit">(() => (read("jp-edit-commit") as "blur" | "explicit") || "blur");
  const [contrast, setContrastS] = useState<"normal" | "high">(() => (read("jp-contrast") as "normal" | "high") || "normal");
  const [lang, setLangS] = useState<Lang>(() => (new URLSearchParams(location.search).get("lang") as Lang) || (read("jp-lang") as Lang) || "en");
  const osIsDark = useSyncExternalStore(subscribeOs, osDark, () => false);
  const resolvedTheme: "light" | "dark" = theme === "auto" ? (osIsDark ? "dark" : "light") : theme;
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const el = document.documentElement;
    if (theme === "auto") el.removeAttribute("data-theme"); else el.setAttribute("data-theme", theme);
    if (density === "compact") el.setAttribute("data-density", "compact"); else el.removeAttribute("data-density");
    if (contrast === "high") el.setAttribute("data-contrast", "high"); else el.removeAttribute("data-contrast");
    const L = LANGS.find((x) => x.code === lang)!; el.setAttribute("lang", L.code); el.setAttribute("dir", L.dir);
  }, [theme, density, contrast, lang]);

  const setTheme = useCallback((t: Theme) => { setThemeS(t); write("jp-theme", t); }, []);
  const setDensity = useCallback((d: Density) => { setDensityS(d); write("jp-density", d); }, []);
  const setEditCommit = useCallback((m: "blur" | "explicit") => { setEditCommitS(m); write("jp-edit-commit", m); }, []);
  const setContrast = useCallback((c: "normal" | "high") => { setContrastS(c); write("jp-contrast", c); }, []);
  const setLang = useCallback((l: Lang) => { setLangS(l); write("jp-lang", l); }, []);
  const t = useCallback((x: string) => tr(lang, x), [lang]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const dismiss = useCallback((id: number) => { clearTimeout(timers.current.get(id)); timers.current.delete(id); setToasts((x) => x.filter((y) => y.id !== id)); }, []);
  /** Identical toasts fold into one with a count; errors stay until dismissed; at most 5 are shown (oldest non-error goes first). */
  const toast = useCallback((t: Omit<Toast, "id">) => {
    const arm = (id: number) => { clearTimeout(timers.current.get(id)); if (t.kind !== "danger") timers.current.set(id, setTimeout(() => dismiss(id), t.undo ? 7000 : 4000)); };
    setToasts((x) => {
      const same = !t.undo ? x.find((y) => !y.undo && y.kind === t.kind && y.title === t.title && y.body === t.body) : undefined;
      if (same) { arm(same.id); return x.map((y) => (y.id === same.id ? { ...y, count: (y.count ?? 1) + 1 } : y)); }
      const id = Date.now() + Math.random(); arm(id); let next = [...x, { ...t, id }];
      while (next.length > 5) { const i = next.findIndex((y) => y.kind !== "danger"); const drop = next[i < 0 ? 0 : i]; clearTimeout(timers.current.get(drop.id)); next = next.filter((y) => y !== drop); }
      return next;
    });
  }, [dismiss]);
  const value = useMemo(() => ({ theme, setTheme, resolvedTheme, density, setDensity, editCommit, setEditCommit, contrast, setContrast, lang, setLang, t, toast }), [theme, resolvedTheme, density, setTheme, setDensity, editCommit, setEditCommit, contrast, setContrast, lang, setLang, t, toast]);

  return (
    <C.Provider value={value}>
      {children}
      <div className="adm-toasts" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`adm-toast adm-toast--${t.kind}`} role="status">
            <div><strong>{t.title}</strong>{(t.count ?? 1) > 1 && <span className="adm-toast__count" aria-label={`${t.count} times`}> ×{t.count}</span>}{t.body && <p className="jp-muted">{t.body}</p>}</div>
            {t.undo && <button className="jp-btn jp-btn--ghost jp-btn--sm" onClick={() => { t.undo!(); dismiss(t.id); }}>Undo</button>}
            <button className="adm-x" aria-label="Dismiss" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </C.Provider>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_TOKENS, cloneTokens, generateTokensCSS, isTokens, type Tokens } from "@belikh/jupiter-tokens";
import { usePrefs, type Theme } from "@belikh/jupiter-ui/store.tsx";

/**
 * The live token editor's state. Tokens live here; the colour theme does NOT: it is the single `theme` preference in
 * PrefsProvider (stored as `jp-theme`), re-exported below as `mode` so the docs pages and the Display menu always agree.
 */
export type ThemeMode = Theme;

interface DsState {
  tokens: Tokens;
  setTokens: (updater: (draft: Tokens) => void) => void;
  replaceTokens: (t: Tokens) => void;
  resetTokens: () => void;
  isCustom: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  resolved: "light" | "dark";
}

const DsContext = createContext<DsState | null>(null);
export const TOKENS_KEY = "jp-tokens";

function loadTokens(): Tokens {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    if (raw) { const parsed: unknown = JSON.parse(raw); if (isTokens(parsed)) return parsed; }
  } catch { /* ignore corrupt storage */ }
  return cloneTokens(DEFAULT_TOKENS);
}

export function DsProvider({ children }: { children: ReactNode }) {
  const { theme, setTheme, resolvedTheme } = usePrefs();
  const [tokens, setTokensState] = useState<Tokens>(loadTokens);
  const isCustom = useMemo(() => JSON.stringify(tokens) !== JSON.stringify(DEFAULT_TOKENS), [tokens]);

  useEffect(() => { try { localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens)); } catch { /* ignore */ } }, [tokens]);

  const setTokens = useCallback((updater: (draft: Tokens) => void) => {
    setTokensState((prev) => { const next = cloneTokens(prev); updater(next); return next; });
  }, []);

  const value = useMemo<DsState>(() => ({
    tokens, setTokens, isCustom, mode: theme, setMode: setTheme, resolved: resolvedTheme,
    replaceTokens: (t) => setTokensState(cloneTokens(t)),
    resetTokens: () => { try { localStorage.removeItem(TOKENS_KEY); } catch { /* ignore */ } setTokensState(cloneTokens(DEFAULT_TOKENS)); },
  }), [tokens, setTokens, isCustom, theme, setTheme, resolvedTheme]);

  return <DsContext.Provider value={value}>{isCustom && <LiveStyles tokens={tokens} />}{children}</DsContext.Provider>;
}

/**
 * The whole site is styled by the CSS it ships, so a token edit restyles everything: the generated custom properties are
 * re-emitted into the `jp` layer after the static tokens.css (same layer, later source wins). Rendered only while the tokens
 * differ from the defaults, so a normal visit adds no style element. This element is the one place `--jp-*` is defined at runtime.
 */
function LiveStyles({ tokens }: { tokens: Tokens }) {
  const css = useMemo(() => `@layer jp {\n${generateTokensCSS(tokens, { bare: true })}\n}`, [tokens]);
  return <style id="jupiter-live" data-testid="jupiter-live-css">{css}</style>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDs(): DsState {
  const ctx = useContext(DsContext);
  if (!ctx) throw new Error("useDs must be used inside <DsProvider>");
  return ctx;
}

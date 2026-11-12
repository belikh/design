// Small helpers shared by the docs pages. Everything visual comes from @belikh/jupiter-ui and the tokens CSS.
import type { ReactNode } from "react";

/** A bordered box rendered in a forced theme, to show the same markup in light and dark. */
export function ThemeBox({ theme, testId, children }: { theme: "light" | "dark"; testId?: string; children: ReactNode }) {
  return <div data-theme={theme} className="adm-themebox" data-testid={testId}>{children}</div>;
}

import { useCallback } from "react";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

/** Copy generated output to the clipboard and say so with the shared toast. */
export function useCopy() {
  const { toast } = usePrefs();
  return useCallback(async (label: string, content: string) => {
    try { await navigator.clipboard.writeText(content); toast({ kind: "ok", title: `Copied ${label}` }); }
    catch { toast({ kind: "danger", title: `Couldn't copy ${label}` }); }
  }, [toast]);
}

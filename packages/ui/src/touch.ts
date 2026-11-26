// Touch mode: <html data-touch="true"> makes controls at least 44px (styles/touch.css). A person's own choice is kept; without one, the device decides.
const KEY = "adm-touch";
/** Turn touch mode on or off and remember the choice. */
export const applyTouchMode = (on: boolean) => { document.documentElement.dataset.touch = String(on); try { localStorage.setItem(KEY, String(on)); } catch { /* ignore */ } };
/** The remembered choice, false when there is none. */
export const touchModeSaved = () => { try { return localStorage.getItem(KEY) === "true"; } catch { return false; } };
/** Call once at start: uses the remembered choice, or turns touch mode on when the main pointer is a finger (a phone or a tablet). Returns the result. */
export function initTouchMode(): boolean {
  let saved: string | null = null; try { saved = localStorage.getItem(KEY); } catch { /* ignore */ }
  const on = saved !== null ? saved === "true" : typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  document.documentElement.dataset.touch = String(on); return on;
}

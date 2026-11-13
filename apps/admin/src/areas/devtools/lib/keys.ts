/** Map a keyboard event to the bytes a terminal would send. Returns null for keys the terminal does not handle (let the browser have them). */
export type KeyLike = { key: string; ctrlKey?: boolean; altKey?: boolean; metaKey?: boolean };
export function keyToBytes(e: KeyLike): string | null {
  if (e.metaKey) return null;
  if (e.ctrlKey && !e.altKey) { const k = e.key.toLowerCase(); return k.length === 1 && k >= "a" && k <= "z" ? String.fromCharCode(k.charCodeAt(0) - 96) : null; }
  switch (e.key) {
    case "Enter": return "\r";
    case "Backspace": return "\x7f";
    case "Tab": return "\t";
    case "ArrowUp": return "\x1b[A";
    case "ArrowDown": return "\x1b[B";
    case "ArrowRight": return "\x1b[C";
    case "ArrowLeft": return "\x1b[D";
    default: return e.key.length === 1 && !e.altKey ? e.key : null;
  }
}

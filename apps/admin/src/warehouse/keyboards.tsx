import { Icon } from "@belikh/jupiter-ui/Icon.tsx";

const ROWS = [["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"], ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"], ["A", "S", "D", "F", "G", "H", "J", "K", "L"], ["Z", "X", "C", "V", "B", "N", "M"]];
/** On-screen alphanumeric keyboard sized for touch (>= 72px keys). */
export function Keyboard({ onKey, space }: { onKey: (k: string) => void; space?: boolean }) {
  return (
    <div className="wh-keys" role="group" aria-label="On-screen keyboard">
      {ROWS.map((r, i) => (
        <div key={i} className="wh-keys__row">
          {r.map((k) => <button key={k} type="button" className="wh-key" onClick={() => onKey(k)}>{k}</button>)}
          {i === 3 && <button type="button" className="wh-key wh-key--wide" aria-label="Backspace" onClick={() => onKey("⌫")}><Icon name="arrow-left" size={26} /></button>}
        </div>
      ))}
      <div className="wh-keys__row">
        <button type="button" className="wh-key wh-key--wide" onClick={() => onKey("CLEAR")}>Clear</button>
        {space && <button type="button" className="wh-key wh-key--wide" style={{ flex: 5, maxWidth: 520 }} onClick={() => onKey(" ")}>Space</button>}
        {!space && <button type="button" className="wh-key wh-key--wide" style={{ flex: 5, maxWidth: 520 }} onClick={() => onKey("-")}>–</button>}
      </div>
    </div>
  );
}
export function NumPad({ onKey }: { onKey: (k: string) => void }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "CLEAR", "0", "⌫"];
  return (
    <div className="wh-keys wh-keys--num" role="group" aria-label="Number pad" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
      {keys.map((k) => <button key={k} type="button" className="wh-key" aria-label={k === "⌫" ? "Backspace" : k === "CLEAR" ? "Clear" : k} onClick={() => onKey(k)}>{k === "CLEAR" ? "C" : k}</button>)}
    </div>
  );
}
export const applyKey = (v: string, k: string, max = 24) => (k === "⌫" ? v.slice(0, -1) : k === "CLEAR" ? "" : v.length >= max ? v : v + k);

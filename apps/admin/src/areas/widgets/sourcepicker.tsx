import { useState } from "react";
import { Select } from "@belikh/jupiter-ui/inputs.tsx";
import { fmtClock } from "./audio.ts";
import { useShelf } from "./shelf.ts";

export type Picked = { blob: Blob; name: string; seconds: number };
/** Pick media from a file chooser, a drop, or the C043 recordings on the shelf. The file input is the keyboard route; dropping is an extra. */
export function SourcePicker({ kind, onPick, current }: { kind: "audio" | "video"; onPick: (p: Picked) => void; current?: string }) {
  const shelf = useShelf().filter((i) => i.kind === kind); const [over, setOver] = useState(false);
  return (
    <div className={`lab-drop ${over ? "is-over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer?.files?.[0]; if (f) onPick({ blob: f, name: f.name, seconds: 0 }); }}>
      <label className="jp-btn jp-btn--sm jp-btn--secondary lab-filebtn">Choose {kind} file<input type="file" accept={`${kind}/*`} className="lab-sr" aria-label={`Choose ${kind} file`} onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick({ blob: f, name: f.name, seconds: 0 }); e.target.value = ""; }} /></label>
      <span className="lab-note">or drop a {kind} file here</span>
      {shelf.length > 0 && <label className="lab-field"><span className="jp-label">Or use a recording</span><Select value="" aria-label={`Use a ${kind} recording`} onChange={(v) => { const it = shelf.find((s) => String(s.id) === v); if (it) onPick({ blob: it.blob, name: it.name, seconds: it.seconds }); }} options={[{ value: "", label: "Choose a recording" }, ...shelf.map((s) => ({ value: String(s.id), label: `${s.name} (${fmtClock(s.seconds)})` }))]} /></label>}
      <span className="lab-note" role="status">{current ? `Loaded: ${current}` : `No ${kind} loaded`}</span>
    </div>
  );
}

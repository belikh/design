import { useState } from "react";
import { Panel, Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import type { Store } from "./lib.tsx";
import { bestChannel, type Radio } from "./network.data.ts";
import { channels20, channelPlan, isDfs, rankBlocks, blockLabel, supportedWidths, type Band, type Width } from "./network.spectrum.ts";
import type { NetworkSnapshot } from "./network.source.ts";

const BANDS: Band[] = ["2.4 GHz", "5 GHz", "6 GHz"];
/** Airtime-by-channel chart for one band, with DFS marking and the recommended block outlined, plus the ranked blocks as a table. */
export function Spectrum({ radios, spectrum, readOnly }: { radios: Store<Radio>; spectrum: NetworkSnapshot["spectrum"]; readOnly: boolean }) {
  const { toast } = usePrefs(); const [band, setBand] = useState<Band>("2.4 GHz"); const [width, setWidth] = useState<Width>(80); const [dfs, setDfs] = useState<"avoid" | "allow">("avoid");
  const util = spectrum[band], has = Object.keys(util).length > 0; const w: Width = band === "2.4 GHz" ? 20 : supportedWidths(band).includes(width) ? width : 20;
  const chans = channels20(band); const mine = new Set(radios.rows.filter((r) => r.band === band).flatMap((r) => channelPlan(band, (band === "2.4 GHz" ? 20 : r.width) as Width).find((b) => b.channels.includes(r.channel))?.channels ?? [r.channel]));
  const ranked = band === "2.4 GHz" ? [] : rankBlocks(band, w, util, dfs === "allow"); const best = ranked[0]; const best24 = bestChannel(util);
  const bandRadios = radios.rows.filter((r) => r.band === band);
  const H = 150, bw = 20, W = Math.max(520, chans.length * bw + 20), hi = best ? new Set(best.channels) : new Set<number>(); const every = chans.length > 30 ? 2 : 1;
  const apply = () => {
    if (readOnly || !bandRadios.length) return; const before = bandRadios.map((r) => ({ id: r.id, channel: r.channel, width: r.width }));
    if (band === "2.4 GHz") bandRadios.forEach((r) => radios.patch(r.id, { channel: best24.channel })); else if (best) bandRadios.forEach((r) => radios.patch(r.id, { channel: best.primary, width: w }));
    const to = band === "2.4 GHz" ? `channel ${best24.channel}` : `channel ${best?.primary} at ${w} MHz`;
    toast({ kind: "ok", title: `${band} moved to ${to}`, body: `${bandRadios.length} radio${bandRadios.length > 1 ? "s" : ""}`, undo: () => before.forEach((b) => radios.patch(b.id, { channel: b.channel, width: b.width })) });
  };
  const summary = band === "2.4 GHz" ? `Quietest of 1, 6, 11 is channel ${best24.channel}.` : best ? `Quietest ${w} MHz block is ${blockLabel(best)} at ${best.load}% airtime${best.dfs ? " (DFS)" : ""}.` : "No block available.";
  return (
    <Panel title="Spectrum (neighbour airtime)" actions={<>
      <Segmented label="Band" value={band} onChange={setBand} options={BANDS.map((b) => ({ value: b, label: b }))} />
      {band !== "2.4 GHz" && <Segmented label="Channel width" value={String(w) as `${Width}`} onChange={(v) => setWidth(Number(v) as Width)} options={supportedWidths(band).map((x) => ({ value: String(x) as `${Width}`, label: `${x} MHz` }))} />}
      {band === "5 GHz" && <Segmented label="DFS channels" value={dfs} onChange={setDfs} options={[{ value: "avoid", label: "Avoid DFS" }, { value: "allow", label: "Allow DFS" }]} />}
      <Btn sm variant="primary" disabled={readOnly || !bandRadios.length || !has || (band !== "2.4 GHz" && !best)} onClick={apply}>{band === "2.4 GHz" ? `Use channel ${best24.channel}` : best ? `Use channel ${best.primary} at ${w} MHz` : "No block"}</Btn></>}>
      {!has ? <p className="hg-muted">No spectrum scan for {band}. The UniFi Integration API does not expose scans; switch to sample data to see the chart.</p> : <>
        <svg className="hg-svg" viewBox={`0 0 ${W} ${H + 44}`} role="img" aria-label={`${band} airtime by 20 MHz channel. ${summary}${band === "5 GHz" ? " Channels 52 to 144 are DFS." : ""}`}>
          {chans.map((c, i) => { const u = util[c] ?? 0, h = (u / 100) * H, x = 10 + i * bw, d = isDfs(band, c); return (
            <g key={c}><rect className={`hg-ch${mine.has(c) ? " is-mine" : ""}${d ? " is-dfs" : ""}${band === "2.4 GHz" && ![1, 6, 11].includes(c) ? " is-minor" : ""}`} x={x + 2} y={H - h} width={bw - 4} height={h} rx={2} />
              {i % every === 0 && <text className="hg-dim" x={x + bw / 2} y={H + 14} textAnchor="middle">{c}</text>}</g>); })}
          {band !== "2.4 GHz" && best && <rect className="hg-pick" x={10 + chans.indexOf(best.channels[0]) * bw} y={4} width={best.channels.length * bw} height={H + 6} rx={4} />}
          {band === "5 GHz" && <g><line className="hg-dfsline" x1={10 + chans.indexOf(52) * bw + 2} x2={10 + (chans.indexOf(144) + 1) * bw - 2} y1={H + 26} y2={H + 26} /><text className="hg-dim" x={10 + (chans.indexOf(52) + chans.indexOf(144) + 1) * bw / 2} y={H + 40} textAnchor="middle">DFS (radar detection, 52 to 144)</text></g>}
        </svg>
        <p className="hg-muted">{summary} Highlighted bars are your radios{band !== "2.4 GHz" ? ", the outline is the recommended block, dashed bars are DFS channels" : ""}.{band === "6 GHz" ? " 6 GHz has no DFS; standard-power outdoor use needs AFC." : ""}</p>
        {band !== "2.4 GHz" && <div className="hg-wrap"><table className="hg-table"><caption className="hg-muted">Quietest {w} MHz blocks{dfs === "avoid" && band === "5 GHz" ? " (DFS skipped)" : ""}</caption><thead><tr><th scope="col">Channels</th><th scope="col">Primary</th><th scope="col">Airtime</th><th scope="col">DFS</th></tr></thead>
          <tbody>{ranked.slice(0, 6).map((b) => <tr key={b.primary}><td>{blockLabel(b)}</td><td className="hg-num">{b.primary}</td><td className="hg-num">{b.load}%</td><td>{b.dfs ? <Badge s="warn">DFS</Badge> : <span className="hg-muted">no</span>}</td></tr>)}</tbody></table></div>}</>}
    </Panel>
  );
}

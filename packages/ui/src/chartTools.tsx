import { useState, type RefObject } from "react";
import { Menu } from "./kit.tsx";
import { Icon } from "./Icon.tsx";

const PROPS = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity", "fill-opacity", "stroke-opacity", "font-family", "font-size", "font-weight", "text-anchor", "dominant-baseline"];
/** Copy resolved CSS (incl. var() colours) onto a cloned SVG so the export renders standalone, outside the page's stylesheet. */
function inline(src: Element, dst: Element) {
  const cs = getComputedStyle(src); const st = (dst as SVGElement).style;
  for (const p of PROPS) { const v = cs.getPropertyValue(p); if (v) st.setProperty(p, v); }
  [...src.children].forEach((c, i) => dst.children[i] && inline(c, dst.children[i]));
}
export function svgString(svg: SVGSVGElement): { xml: string; w: number; h: number } {
  const r = svg.getBoundingClientRect(); const clone = svg.cloneNode(true) as SVGSVGElement;
  inline(svg, clone); clone.setAttribute("xmlns", "http://www.w3.org/2000/svg"); clone.setAttribute("width", String(r.width)); clone.setAttribute("height", String(r.height));
  const bg = getComputedStyle(document.body).backgroundColor; const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect"); rect.setAttribute("width", "100%"); rect.setAttribute("height", "100%"); rect.setAttribute("fill", bg); clone.insertBefore(rect, clone.firstChild);
  return { xml: new XMLSerializer().serializeToString(clone), w: r.width, h: r.height };
}
export function download(name: string, blob: Blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
export const exportSvg = (svg: SVGSVGElement, name: string) => download(`${name}.svg`, new Blob([svgString(svg).xml], { type: "image/svg+xml" }));
export function exportPng(svg: SVGSVGElement, name: string, scale = 2) {
  const { xml, w, h } = svgString(svg); const img = new Image();
  img.onload = () => { const c = document.createElement("canvas"); c.width = w * scale; c.height = h * scale; const ctx = c.getContext("2d")!; ctx.scale(scale, scale); ctx.drawImage(img, 0, 0); c.toBlob((b) => b && download(`${name}.png`, b)); };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}
export function toCsv(labels: string[], series: { name: string; data: number[] }[]) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [["label", ...series.map((s) => s.name)].map(esc).join(","), ...labels.map((l, i) => [l, ...series.map((s) => s.data[i])].map(esc).join(","))].join("\n");
}
export const exportCsv = (labels: string[], series: { name: string; data: number[] }[], name: string) => download(`${name}.csv`, new Blob([toCsv(labels, series)], { type: "text/csv" }));

/** Accessible data-table equivalent of a chart (screen-reader and keyboard friendly). */
export function ChartTable({ labels, series, caption }: { labels: string[]; series: { name: string; data: number[] }[]; caption: string }) {
  return (
    <div className="adm-dt__wrap" style={{ maxHeight: 280, overflow: "auto" }}>
      <table className="jp-table"><caption className="adm-sr">{caption}</caption><thead><tr><th scope="col">Label</th>{series.map((s) => <th scope="col" key={s.name} className="jp-num">{s.name}</th>)}</tr></thead>
        <tbody>{labels.map((l, i) => <tr key={i}><th scope="row">{l}</th>{series.map((s) => <td key={s.name} className="jp-num">{s.data[i]}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

/** Small toolbar: export menu (SVG / PNG / CSV), table toggle, fullscreen. */
export function ChartTools({ plot, name, labels, series, table, onTable }: { plot: RefObject<HTMLElement | null>; name: string; labels: string[]; series: { name: string; data: number[] }[]; table: boolean; onTable: (v: boolean) => void }) {
  const [fs, setFs] = useState(false);
  const svg = () => plot.current?.querySelector("svg") as SVGSVGElement | null;
  return (
    <div className="adm-ctools">
      <button className="adm-x" aria-pressed={table} aria-label={table ? "Show chart" : "Show data table"} title={table ? "Show chart" : "Show data table"} onClick={() => onTable(!table)}><Icon name="menu" size={15} /></button>
      <button className="adm-x" aria-label="Toggle fullscreen" title="Fullscreen" onClick={() => { const el = plot.current?.closest(".adm-chart") as HTMLElement | null; if (!el) return; if (document.fullscreenElement) { void document.exitFullscreen(); setFs(false); } else { void el.requestFullscreen?.(); setFs(true); } }}><Icon name={fs ? "minus" : "plus"} size={15} /></button>
      <Menu label="Export" icon="download" items={[{ label: "Download SVG", onSelect: () => { const s = svg(); if (s) exportSvg(s, name); } }, { label: "Download PNG", onSelect: () => { const s = svg(); if (s) exportPng(s, name); } }, { label: "Download CSV", onSelect: () => exportCsv(labels, series, name) }, "sep", { label: "Copy CSV", onSelect: () => navigator.clipboard?.writeText(toCsv(labels, series)) }]} />
    </div>
  );
}

/** Generic tabular data behind a chart: header + rows. Used by every P2 chart for export and the accessible table view. */
export type ChartTableData = { head: string[]; rows: (string | number)[][] };
export function tableToCsv(t: ChartTableData) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [t.head.map(esc).join(","), ...t.rows.map((r) => r.map(esc).join(","))].join("\n");
}
export function GenericTable({ table, caption }: { table: ChartTableData; caption: string }) {
  return (
    <div className="adm-dt__wrap" style={{ maxHeight: 300, overflow: "auto" }}>
      <table className="jp-table"><caption className="adm-sr">{caption}</caption>
        <thead><tr>{table.head.map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
        <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => (j === 0 ? <th scope="row" key={j}>{c}</th> : <td key={j} className={typeof c === "number" ? "jp-num" : undefined}>{c}</td>))}</tr>)}</tbody></table>
    </div>
  );
}

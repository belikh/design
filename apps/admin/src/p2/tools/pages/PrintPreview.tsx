import { useMemo, useState } from "react";
import { PageHeader, Btn, Badge, Alert } from "@belikh/jupiter-ui/kit.tsx";
import { Field, Select, Segmented, Slider, Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { PAGE_SIZES, paginate, type Block } from "../lib/paginate.ts";
import { orders, services } from "../../../data/fixtures.ts";
import "../tools.css";

const REGIONS = ["Brisbane", "Sydney", "Melbourne", "Perth", "Adelaide", "Hobart", "Darwin"];
type Content = Block & { render: () => React.ReactNode };
const money = (v: number) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
export function buildBlocks(): Content[] {
  const regions = REGIONS.map((r) => { const os = orders.filter((o) => o.region === r); return [r, os.length, os.reduce((a, o) => a + o.amount, 0)] as const; });
  const H = (id: string, t: string): Content => ({ id, h: 11, keepWithNext: true, render: () => <h2>{t}</h2> });
  const T = (id: string, head: string[], rows: (string | number)[][]): Content => ({ id, h: 9 + rows.length * 7.2, render: () => <table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} style={{ textAlign: j ? "end" : "start" }}>{c}</td>)}</tr>)}</tbody></table> });
  return [
    { id: "title", h: 28, render: () => <><h1>Quarterly service report</h1><div style={{ color: "#555" }}>Jupiter infrastructure · Q4 2026 · prepared 12 November 2026</div></> },
    H("h-sum", "1. Summary"), { id: "p-sum", h: 30, render: () => <p>Availability held at 99.94% across the quarter. Two incidents affected the media archive and one PXE outage remains open. Revenue grew 12.4% against the previous period, and median latency stayed under 190 ms. This document is paginated automatically: headings stay with the content that follows them, and tables never split mid-row.</p> },
    H("h-svc", "2. Service health"), T("t-svc", ["Service", "Region", "Status", "p95 (ms)", "Uptime"], services.map((s) => [s.name, s.region, s.status, s.latency, `${s.uptime.toFixed(2)}%`])),
    H("h-rev", "3. Revenue by region"), T("t-rev", ["Region", "Orders", "Revenue"], regions.map(([r, n, v]) => [r, n, money(v)])),
    H("h-ord", "4. Largest orders"), T("t-ord", ["Order", "Customer", "Status", "Amount"], [...orders].sort((a, b) => b.amount - a.amount).slice(0, 12).map((o) => [o.id, o.customer, o.status, money(o.amount)])),
    H("h-next", "5. Next steps"), { id: "p-next", h: 34, render: () => <ul style={{ margin: 0, paddingInlineStart: "5mm" }}><li>Restore the PXE boot server and add a second target.</li><li>Move the media archive to the new ZFS pool.</li><li>Automate the certificate renewal failover test.</li><li>Review the dock timeslot rules with warehouse staff.</li></ul> },
  ];
}
export function PrintPreview() {
  const [size, setSize] = useState<keyof typeof PAGE_SIZES>("A4"); const [orient, setOrient] = useState<"portrait" | "landscape">("portrait"); const [margin, setMargin] = useState(15); const [zoom, setZoom] = useState(55); const [hf, setHf] = useState(true);
  const dims = PAGE_SIZES[size]; const w = orient === "portrait" ? dims.w : dims.h, h = orient === "portrait" ? dims.h : dims.w; const headFoot = hf ? 12 : 0;
  const blocks = useMemo(() => buildBlocks(), []); const pageH = h - margin * 2 - headFoot * 2 - 4; const pages = useMemo(() => paginate(blocks, pageH * 0.94), [blocks, pageH]);
  const MM = 3.7795; const sc = zoom / 100;
  return (
    <>
      <style>{`@page { size: ${size} ${orient}; margin: 0; }`}</style>
      <div className="pt-controls">
        <PageHeader title="Print and PDF preview" crumbs={["Tools", "Print preview"]} desc="See exactly how a report paginates before printing: choose a paper size, orientation and margins, then print or save as PDF from your browser’s print dialog." status={<Badge>{pages.length} page{pages.length === 1 ? "" : "s"}</Badge>} actions={<Btn variant="primary" icon="download" onClick={() => window.print()}>Print / Save as PDF</Btn>} />
        <div className="pt-print-controls">
          <Field label="Paper">{(id) => <Select id={id} value={size} onChange={(v) => setSize(v as keyof typeof PAGE_SIZES)} options={Object.keys(PAGE_SIZES)} />}</Field>
          <Field label="Orientation">{() => <Segmented label="Orientation" value={orient} onChange={setOrient} options={[{ value: "portrait", label: "Portrait" }, { value: "landscape", label: "Landscape" }]} />}</Field>
          <Field label={`Margins (${margin} mm)`}>{() => <div style={{ width: 230 }}><Slider label="Margins" value={margin} onChange={setMargin} min={8} max={30} fmt={(v) => `${v}mm`} /></div>}</Field>
          <Field label={`Preview zoom`}>{() => <div style={{ width: 230 }}><Slider label="Zoom" value={zoom} onChange={setZoom} min={30} max={100} step={5} fmt={(v) => `${v}%`} /></div>}</Field>
          <Switch checked={hf} onChange={setHf} label="Header and footer" />
        </div>
        <Alert s="info" title="Use the browser print dialog">Set margins to “None” and turn off its own headers and footers; this page controls them.</Alert>
      </div>
      <div className="pt-pages" style={{ marginTop: 16 }} aria-label="Pages">
        {pages.map((p, i) => (
          <div key={i} className="pt-page-wrap" style={{ width: `${w * MM * sc}px`, height: `${h * MM * sc}px` }}>
            <div className="pt-page" style={{ width: `${w}mm`, height: `${h}mm`, transform: `scale(${sc})`, transformOrigin: "top left" }} aria-label={`Page ${i + 1} of ${pages.length}`}>
              {hf && <div className="pt-page__head"><span>Quarterly service report</span><span>Jupiter · Confidential</span></div>}
              <div style={{ position: "absolute", inset: `${margin + headFoot}mm ${margin}mm ${margin + headFoot}mm`, display: "flex", flexDirection: "column", gap: "2.5mm" }}>{p.blocks.map((b) => <div key={b.id}>{(b as Content).render()}</div>)}</div>
              {hf && <div className="pt-page__foot"><span>12 November 2026</span><span>Page {i + 1} of {pages.length}</span></div>}
            </div>
          </div>))}
      </div>
    </>
  );
}

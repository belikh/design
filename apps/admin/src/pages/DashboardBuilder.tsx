import { useEffect, useState } from "react";
import { PageHeader, Btn, Panel, Menu, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { LineChart, Donut, StatTile, Gauge, Heatmap, BarChart, UptimeBars, Spark } from "@belikh/jupiter-ui/Charts.tsx";
import { Switch } from "@belikh/jupiter-ui/inputs.tsx";
import { days, heat, series, services } from "../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";

type W = { id: string; type: string; span: 3 | 4 | 6 | 8 | 12 };
const CATALOG: Record<string, { label: string; render: () => React.ReactNode }> = {
  revenue: { label: "Revenue line", render: () => <LineChart area smooth height={170} labels={days(14)} series={[{ name: "Revenue", data: series(14, 400, 80, 3) }]} /> },
  stat: { label: "KPI tile", render: () => <StatTile label="Orders" value="960" delta={4.1} spark={series(14, 30, 8, 2)} sub="vs prev" /> },
  donut: { label: "Status donut", render: () => <div className="adm-row" style={{ justifyContent: "center" }}><Donut size={150} parts={[{ label: "ok", value: 8 }, { label: "warn", value: 1 }, { label: "down", value: 1 }]} center={<><b>10</b><span>services</span></>} /></div> },
  gauge: { label: "CPU gauge", render: () => <div className="adm-row" style={{ justifyContent: "center" }}><Gauge value={58} label="CPU" size={170} /></div> },
  heat: { label: "Traffic heatmap", render: () => <Heatmap rows={heat.rows} cols={heat.cols} data={heat.data} /> },
  bars: { label: "Bars", render: () => <BarChart height={170} labels={["Mon", "Tue", "Wed", "Thu", "Fri"]} series={[{ name: "Deploys", data: [4, 7, 3, 9, 5] }]} /> },
  uptime: { label: "Uptime", render: () => <div className="adm-stack">{services.slice(0, 4).map((s) => <div key={s.name}><div className="adm-row" style={{ justifyContent: "space-between" }}><span className="adm-num">{s.name}</span><Spark data={s.spark} w={50} h={14} /></div><UptimeBars days={s.days.slice(-30)} /></div>)}</div> },
};
const DEF: W[] = [{ id: "a", type: "stat", span: 3 }, { id: "b", type: "stat", span: 3 }, { id: "c", type: "gauge", span: 3 }, { id: "d", type: "donut", span: 3 }, { id: "e", type: "revenue", span: 8 }, { id: "f", type: "uptime", span: 4 }];
export function DashboardBuilder() {
  const { toast } = usePrefs(); const [edit, setEdit] = useState(true);
  const [ws, setWs] = useState<W[]>(() => { try { return JSON.parse(localStorage.getItem("adm-layout") || "") as W[]; } catch { return DEF; } });
  const [drag, setDrag] = useState<string | null>(null);
  useEffect(() => { try { localStorage.setItem("adm-layout", JSON.stringify(ws)); } catch { /* ignore */ } }, [ws]);
  const drop = (to: string) => { if (!drag || drag === to) return; setWs((x) => { const a = [...x]; const i = a.findIndex((w) => w.id === drag), j = a.findIndex((w) => w.id === to); const [m] = a.splice(i, 1); a.splice(j, 0, m); return a; }); setDrag(null); };
  const sizes: W["span"][] = [3, 4, 6, 8, 12];
  return (
    <>
      <PageHeader title="Customisable dashboard" crumbs={["Tools", "Dashboard"]} desc="Edit mode: drag widgets to reorder, resize with S/M/L, add and remove. Layout is saved in this browser." status={<Badge s={edit ? "warn" : "ok"}>{edit ? "editing" : "viewing"}</Badge>}
        actions={<><Switch checked={edit} onChange={setEdit} label="Edit layout" />{edit && <><Menu label="Add widget" icon="plus" items={Object.entries(CATALOG).map(([k, v]) => ({ label: v.label, onSelect: () => setWs((x) => [...x, { id: `${k}-${Date.now()}`, type: k, span: 4 }]) }))} /><Btn onClick={() => { setWs(DEF); toast({ kind: "info", title: "Layout reset" }); }}>Reset</Btn></>}</>} />
      <div className="adm-wgrid">
        {ws.map((w) => (
          <div key={w.id} className={`adm-widget ${edit ? "is-edit" : ""}`} style={{ gridColumn: `span ${w.span}` }} draggable={edit} onDragStart={() => setDrag(w.id)} onDragOver={(e) => edit && e.preventDefault()} onDrop={() => drop(w.id)} onDragEnd={() => setDrag(null)}>
            {edit && <div className="adm-widget__bar"><span className="adm-x" aria-hidden style={{ cursor: "grab" }}>⠿</span><b>{CATALOG[w.type].label}</b><span className="adm-spacer" /><button className="adm-x" aria-label={`Move ${CATALOG[w.type].label} earlier`} disabled={ws[0]?.id === w.id} onClick={() => setWs((x) => { const i = x.findIndex((y) => y.id === w.id); if (i <= 0) return x; const n = [...x]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}>↑</button><button className="adm-x" aria-label={`Move ${CATALOG[w.type].label} later`} disabled={ws[ws.length - 1]?.id === w.id} onClick={() => setWs((x) => { const i = x.findIndex((y) => y.id === w.id); if (i < 0 || i >= x.length - 1) return x; const n = [...x]; [n[i + 1], n[i]] = [n[i], n[i + 1]]; return n; })}>↓</button>{(["S", "M", "L", "XL", "Full"] as const).map((l, i) => <button key={l} className={`adm-x ${w.span === sizes[i] ? "is-on" : ""}`} aria-label={`Size ${l}`} onClick={() => setWs((x) => x.map((y) => (y.id === w.id ? { ...y, span: sizes[i] } : y)))}>{l}</button>)}<button className="adm-x" aria-label="Remove widget" onClick={() => setWs((x) => x.filter((y) => y.id !== w.id))}>×</button></div>}
            <Panel>{CATALOG[w.type].render()}</Panel>
          </div>))}
      </div>
    </>
  );
}

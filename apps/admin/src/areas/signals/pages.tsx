import { useState } from "react";
import { PageHeader } from "@belikh/jupiter-ui/kit.tsx";
import * as D from "./data.ts";
import { P } from "./shared.tsx";
import { BudgetVariance, CashBridge, Candlestick, ControlChart, DepthChart, ErrorBars, InvoiceAgeing } from "./fin.tsx";
import { ParallelCoords, PolarArea, Radar, TagCloud, WordCloud } from "./polarcharts.tsx";
import { BatterySoc, LoadCurve, StackedSources, SunPath, TempHumidity, WindRose } from "./env.tsx";
import { Constellation, ImageHistogram, Spectrogram, VideoMarkers, Waterfall, Waveform } from "./sig.tsx";
import { CapacityForecast, ContourPlot, PoolLayout, SmartTrend, SurfacePlot, demoField } from "./surf.tsx";
import { AsciiPreview, CrossFilter, LassoScatter, PatternBars, ScaleSwitch, SyncedCharts, TrendFig } from "./feat.tsx";

const G = ({ children, cols }: { children: React.ReactNode; cols?: 1 }) => <div className={`lab-grid${cols ? " lab-grid--1" : ""}`}>{children}</div>;
const crumbs = (s: string) => ["Charts (domain)", s];
const labels60 = Array.from({ length: 60 }, (_, i) => `h${i + 1}`);

export function FinancePage() {
  return (
    <>
      <PageHeader title="Markets, quality and finance" crumbs={crumbs("Finance")} desc="Candlestick and OHLC, order-book depth, control charts and error bars; budget variance, invoice ageing and a cash-flow bridge. Every chart has a data table, an inspector slider and exports." />
      <G><P id="D060" title="Candlestick / OHLC"><Candlestick candles={D.candles} /></P><P id="D060" title="Depth chart"><DepthChart bids={D.bids} asks={D.asks} /></P></G>
      <G><P id="D060" title="Control chart (mean ± 3σ)"><ControlChart values={D.controlData} baseline={26} /></P><P id="D060" title="Error bars"><ErrorBars groups={D.errorGroups} /></P></G>
      <G><P id="D066" title="Budget variance"><BudgetVariance rows={D.budget} /></P><P id="D066" title="Invoice ageing"><InvoiceAgeing invoices={D.invoices} asOf={D.AS_OF} /></P></G>
      <G cols={1}><P id="D066" title="Cash-flow bridge"><CashBridge steps={D.bridge} /></P></G>
    </>
  );
}

export function PolarPage() {
  const [tag, setTag] = useState<string | null>(null);
  return (
    <>
      <PageHeader title="Polar, parallel and word clouds" crumbs={crumbs("Polar")} desc="Radar, polar area and parallel coordinates; a packed word cloud and an accessible tag cloud." />
      <G><P id="D061" title="Radar / spider"><Radar axes={D.radarAxes} series={D.radarSeries} /></P><P id="D061" title="Polar area"><PolarArea labels={D.MONTHS} values={D.polarMonths} /></P></G>
      <G cols={1}><P id="D061" title="Parallel coordinates"><ParallelCoords dims={D.parallelDims} rows={D.parallelRows} groups={D.parallelGroups} invert={[false, true, false, true, true]} /></P></G>
      <G><P id="D062" title="Word cloud"><WordCloud words={D.words} /></P><P id="D062" title="Tag cloud"><TagCloud words={D.words.slice(0, 30)} onPick={setTag} />{tag && <p className="lab-note">Parent page received filter: {tag}</p>}</P></G>
    </>
  );
}

export function EnergyPage() {
  return (
    <>
      <PageHeader title="Energy and environment" crumbs={crumbs("Energy")} desc="Load curve with tariff bands, stacked supply sources, battery state of charge, comfort-band climate, wind rose and sun path." />
      <G><P id="D063" title="Energy load curve with tariff bands"><LoadCurve load={D.load} bands={D.tariff} /></P><P id="D063" title="Stacked sources"><StackedSources sources={D.sources} /></P></G>
      <G cols={1}><P id="D063" title="Battery state of charge"><BatterySoc netKw={D.batteryNet} /></P></G>
      <G cols={1}><P id="D064" title="Temperature and humidity with comfort band"><TempHumidity data={D.weather} band={D.comfort} /></P></G>
      <G><P id="D064" title="Wind rose"><WindRose samples={D.windSamples} edges={D.windEdges} /></P><P id="D064" title="Sun path"><SunPath lat={52} /></P></G>
    </>
  );
}

export function SignalPage() {
  return (
    <>
      <PageHeader title="Signals and media" crumbs={crumbs("Signals")} desc="Spectrogram, waterfall and constellation for Wi-Fi sensing work; audio waveform, image histogram and video timeline markers." />
      <G><P id="D065" title="Spectrogram"><Spectrogram signal={D.rfSignal} sampleRate={D.SR} /></P><P id="D065" title="Waterfall plot"><Waterfall signal={D.rfSignal} /></P></G>
      <G><P id="D065" title="Constellation scatter"><Constellation symbols={D.rxSymbols} /></P><P id="D067" title="Image histogram"><ImageHistogram pixels={D.pixels} /></P></G>
      <G cols={1}><P id="D067" title="Audio waveform"><Waveform samples={D.audio} /></P><P id="D067" title="Video timeline markers"><VideoMarkers duration={D.videoDuration} markers={D.videoMarkers} /></P></G>
    </>
  );
}

export function SurfacePage() {
  const field = demoField(D.fieldN);
  return (
    <>
      <PageHeader title="Surfaces and storage" crumbs={crumbs("Surfaces")} desc="Contour (marching squares) and isometric surface plots; storage pool layout, SMART trends and a capacity forecast." />
      <G><P id="D068" title="Contour plot"><ContourPlot field={field} /></P><P id="D068" title="Surface plot"><SurfacePlot field={demoField(26)} /></P></G>
      <G><P id="D069" title="Storage pool layout"><PoolLayout disks={D.disks} /></P><P id="D069" title="Capacity forecast"><CapacityForecast usage={D.usageTb} capacity={D.capacityTb} /></P></G>
      <G cols={1}><P id="D069" title="SMART trend"><SmartTrend attrs={D.smartSeries} labels={D.smartDays} /></P></G>
    </>
  );
}

const UPDATED = new Date(Date.UTC(2026, 10, 12, 14, 28)), NOW = new Date(Date.UTC(2026, 10, 12, 14, 35));
export function FeaturesPage() {
  const [updated, setUpdated] = useState(UPDATED), [now, setNow] = useState(NOW);
  return (
    <>
      <PageHeader title="Chart features" crumbs={crumbs("Features")} desc="Every option comes from one hook, useChartInteractions: drag-to-zoom with keyboard and a range control, a crosshair shared across a group of charts, lasso (pointer or keyboard), threshold bands, ghost series, log and percent toggles, last-updated stamp and query inspector. The same hook drives ControlChart and TempHumidity, which the finance and energy pages also use." />
      <G>
        <P id="D074" title="Threshold bands, alert markers, zoom, lasso and scales"><TrendFig title="Request latency" labels={labels60} values={D.demoSeries} bands={D.demoBands} unit=" ms" /></P>
        <P id="D074" title="Ghost series for the compare period"><TrendFig title="Requests vs previous period" labels={labels60} values={D.demoSeries} prev={D.demoPrev} /></P>
      </G>
      <G cols={1}><P id="D074" title="Synced crosshair and zoom"><SyncedCharts labels={labels60} a={D.demoSeries} b={D.demoPrev.map((v) => +(v / 40).toFixed(2))} /></P></G>
      <G cols={1}><P id="D074" title="Drill-down and cross-filtering"><CrossFilter rows={D.demoRows} /></P></G>
      <G><P id="D074" title="Lasso select"><LassoScatter rows={D.demoRows} /></P><P id="D074" title="Linear / log and absolute / percent"><ScaleSwitch /></P></G>
      <G><P id="D074" title="Last-updated stamp and query inspector"><TrendFig title="Orders per hour" labels={labels60} values={D.demoSeries} height={180} meta={{ updated, now, query: D.demoQuery, rows: D.demoRows.length, ms: 184, cached: updated !== UPDATED, onRefresh: () => { const t = new Date(NOW.getTime() + 1000); setUpdated(t); setNow(t); } }} /></P>
        <P id="D074" title="Pattern fills for print"><PatternBars /></P></G>
      <G><P id="D074" title="Same hook on the finance page chart: ControlChart"><ControlChart values={D.controlData} baseline={26} /></P><P id="D074" title="Same hook on the energy page chart: TempHumidity"><TempHumidity data={D.weather} band={D.comfort} /></P></G>
      <G cols={1}><P id="D074" title="ASCII rendering for TUIs"><AsciiPreview values={D.demoSeries} /></P></G>
    </>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { createCollection, useCollection } from "@belikh/jupiter-ui/mock.ts";
import { Editable } from "@belikh/jupiter-ui/editable.tsx";
import { Btn, Badge, EmptyState, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { ProgressBar } from "@belikh/jupiter-ui/Charts.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { DASHES, nextIndex } from "./lib.ts";
import { Widget } from "./Widgets.tsx";
import "./p3a.css";

type Slide = { id: string; rev: number; dash: string; seconds: number; on: boolean; order: number };
const seed = (): Slide[] => [{ id: "S1", rev: 1, dash: "ops", seconds: 20, on: true, order: 1 }, { id: "S2", rev: 1, dash: "sales", seconds: 15, on: true, order: 2 }, { id: "S3", rev: 1, dash: "net", seconds: 30, on: true, order: 3 }, { id: "S4", rev: 1, dash: "support", seconds: 10, on: false, order: 4 }];
export const slides = createCollection<Slide>(seed, { latency: 20, jitter: 10 });
const DASH_OPTS = DASHES.map((d) => ({ value: d.id, label: d.title }));
const byOrder = (a: Slide, b: Slide) => a.order - b.order;

/** A020 editor: order, dwell time and on/off for each dashboard in the rotation. */
export function PlaylistEditor() {
  const { rows, save } = useCollection(slides); const { toast } = usePrefs(); const list = useMemo(() => [...rows].sort(byOrder), [rows]); const [n, setN] = useState(0);
  const total = list.filter((s) => s.on).reduce((a, s) => a + s.seconds, 0);
  const swap = async (i: number, d: -1 | 1) => { const a = list[i], b = list[i + d]; if (!b) return; await save(a, "order", b.order); await save(b, "order", a.order); };
  const add = async () => { await slides.create({ rev: 1, dash: DASHES[n % DASHES.length].id, seconds: 15, on: true, order: Math.max(0, ...list.map((s) => s.order)) + 1 }); setN(n + 1); toast({ kind: "ok", title: "Dashboard added to the rotation" }); };
  const remove = async (s: Slide) => { const copy = { ...s }; await slides.remove(s.id); toast({ kind: "info", title: "Removed from rotation", undo: () => { void slides.create(copy); } }); };
  return (
    <>
      <PageHeader title="TV playlist" crumbs={["Embeds", "TV playlist"]} desc="Rotate dashboards on a wall display. Set how long each stays on screen, reorder them, and open the player on the TV."
        status={<Badge s={total ? "ok" : "warn"}>{total ? `${total} s per loop` : "Nothing scheduled"}</Badge>}
        actions={<><Btn onClick={add} icon="plus">Add dashboard</Btn><Link className="jp-btn jp-btn--primary" to="/p3/playlist/tv">Start TV player</Link></>} />
      <Panel title="Rotation" flush>
        {list.length === 0 ? <EmptyState title="The playlist is empty" action={<Btn variant="primary" onClick={add}>Add a dashboard</Btn>}>Add at least one dashboard to start the TV player.</EmptyState> :
          <ol className="p3a-playlist">{list.map((s, i) => (
            <li key={s.id} className={s.on ? "" : "is-off"}>
              <span className="p3a-num" aria-hidden>{i + 1}</span>
              <div className="p3a-grow"><Editable label={`Dashboard for slide ${i + 1}`} value={s.dash} editor={{ type: "select", options: DASH_OPTS }} onSave={(v) => save(s, "dash", String(v))} /></div>
              <Editable label={`Seconds on screen for slide ${i + 1}`} value={s.seconds} editor={{ type: "number", min: 5, max: 300, unit: "s" }} onSave={(v) => save(s, "seconds", Number(v))} validate={(v) => (Number(v) < 5 ? "Show each dashboard for at least 5 seconds" : null)} />
              <Editable label={`Include slide ${i + 1}`} value={s.on} editor={{ type: "boolean", onLabel: "In rotation", offLabel: "Skipped" }} onSave={(v) => save(s, "on", Boolean(v))} />
              <span className="adm-row"><Btn sm variant="ghost" aria-label={`Move slide ${i + 1} up`} disabled={i === 0} onClick={() => void swap(i, -1)}>Up</Btn><Btn sm variant="ghost" aria-label={`Move slide ${i + 1} down`} disabled={i === list.length - 1} onClick={() => void swap(i, 1)}>Down</Btn><Btn sm variant="ghost" aria-label={`Remove slide ${i + 1}`} onClick={() => void remove(s)}>Remove</Btn></span>
            </li>))}</ol>}
      </Panel>
    </>
  );
}

/** The TV player (bare route). Space pauses, arrows step. Fullscreen button uses the Fullscreen API when present. */
export function TvPlayer() {
  const { rows } = useCollection(slides); const active = useMemo(() => [...rows].filter((s) => s.on).sort(byOrder), [rows]);
  const [i, setI] = useState(0); const [paused, setPaused] = useState(false); const [left, setLeft] = useState(0); const root = useRef<HTMLDivElement>(null);
  const idx = active.length ? i % active.length : 0; const cur = active[idx]; const curId = cur?.id;
  useEffect(() => { setLeft(0); }, [idx, curId]);
  useEffect(() => { if (paused || !cur) return; const t = setInterval(() => setLeft((l) => l + 1), 1000); return () => clearInterval(t); }, [paused, cur]);
  const go = useCallback((d: 1 | -1) => setI((v) => nextIndex(v % Math.max(1, active.length), active.length, d)), [active.length]);
  useEffect(() => { if (cur && left >= cur.seconds) go(1); }, [left, cur, go]);
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); else if (e.key === " " && (e.target as HTMLElement).tagName !== "BUTTON") { e.preventDefault(); setPaused((p) => !p); } };
  const full = () => { try { void root.current?.requestFullscreen?.(); } catch { /* not supported */ } };
  if (!cur) return <div className="p3a-tv"><EmptyState title="Nothing to show">Switch at least one dashboard on in the <Link to="/p3/playlist">playlist</Link>.</EmptyState></div>;
  const dash = DASHES.find((d) => d.id === cur.dash)!;
  return (
    <div className="p3a-tv" ref={root} onKeyDown={onKey}>
      <header><h1>{dash.title}</h1><span className="jp-muted">Slide {idx + 1} of {active.length}</span></header>
      <div className="p3a-tv__grid" data-count={dash.widgets.length}>{dash.widgets.map((w) => <Widget key={w} id={w} />)}</div>
      <footer>
        <ProgressBar value={Math.min(left, cur.seconds)} max={cur.seconds} label={`Next slide in ${Math.max(0, cur.seconds - left)} seconds`} />
        <div className="adm-row"><Btn aria-label="Previous slide" onClick={() => go(-1)}>Previous</Btn><Btn variant="primary" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "Resume" : "Pause"}</Btn><Btn aria-label="Next slide" onClick={() => go(1)}>Next</Btn><Btn variant="ghost" onClick={full}>Full screen</Btn><Link className="jp-btn jp-btn--ghost" to="/p3/playlist">Exit</Link></div>
      </footer>
    </div>
  );
}

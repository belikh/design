import { useId, useState } from "react";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";
import { LIKERT, likertMean, nextRating, npsCategory, npsScore } from "./feedback.ts";
import { Note, Row, Stack } from "./ui.tsx";

const STAR = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z";
const HEART = "M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6C20.5 15 12 20.5 12 20.5z";
/** Star or heart rating as a radio group (arrow keys, Home/End, clear). */
export function RatingInput({ label, icon = "star", max = 5, value, onChange, readOnly }: { label: string; icon?: "star" | "heart"; max?: number; value?: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  const [inner, setInner] = useState(0); const v = value ?? inner; const set = (n: number) => { setInner(n); onChange?.(n); }; const [hover, setHover] = useState(0); const shown = hover || v;
  return (
    <div className="p3-rating" role="radiogroup" aria-label={label} aria-readonly={readOnly || undefined} onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" role="radio" aria-checked={v === n} aria-label={`${n} ${icon}${n === 1 ? "" : "s"}`} tabIndex={v === n || (!v && n === 1) ? 0 : -1} disabled={readOnly} className={`p3-rating__i p3-rating__i--${icon} ${n <= shown ? "is-on" : ""}`} onMouseEnter={() => setHover(n)} onClick={() => set(v === n ? 0 : n)}
          onKeyDown={(e) => { const nx = nextRating(v || 1, e.key, max); if (nx !== null) { e.preventDefault(); set(nx); (e.currentTarget.parentElement?.querySelectorAll("button")[nx - 1] as HTMLElement | undefined)?.focus(); } }}>
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden><path d={icon === "star" ? STAR : HEART} /></svg>
        </button>))}
      <span className="p3-note" aria-live="polite">{v ? `${v} of ${max}` : "No rating"}</span>
      {v > 0 && !readOnly && <Btn sm variant="ghost" onClick={() => set(0)}>Clear</Btn>}
    </div>
  );
}
export function NpsInput() {
  const [v, setV] = useState<number | null>(null); const [why, setWhy] = useState(""); const [sent, setSent] = useState(false); const sample = [10, 9, 9, 8, 7, 10, 6, 9, 4, 10, 8, 9]; const all = v === null ? sample : [...sample, v]; const s = npsScore(all);
  const name = useId();
  return (
    <Stack>
      <fieldset className="p3-fieldset"><legend className="jp-label">How likely are you to recommend us to a colleague?</legend>
        <div className="p3-nps" role="radiogroup" aria-label="Likelihood to recommend, 0 to 10">{Array.from({ length: 11 }, (_, n) => <label key={n} className={`p3-nps__n p3-nps__n--${npsCategory(n)} ${v === n ? "is-on" : ""}`}><input type="radio" name={name} value={n} checked={v === n} onChange={() => { setV(n); setSent(false); }} /><span>{n}</span></label>)}</div>
        <div className="p3-nps__ends"><span>Not at all likely</span><span>Extremely likely</span></div>
      </fieldset>
      {v !== null && <label className="p3-field"><span className="jp-label">{v >= 9 ? "What do you like most?" : v >= 7 ? "What would make it a 10?" : "What went wrong?"}</span><textarea className="jp-input" rows={2} value={why} onChange={(e) => setWhy(e.target.value)} /></label>}
      <Row><Btn variant="primary" disabled={v === null || sent} onClick={() => setSent(true)}>Send feedback</Btn>{sent && <span className="p3-ok" role="status">Thanks: you are a {npsCategory(v!)}.</span>}</Row>
      <p className="p3-note" aria-live="polite">Sample of {all.length} responses: NPS <b>{s.score}</b> ({s.promoters} promoters, {s.passives} passives, {s.detractors} detractors).</p>
    </Stack>
  );
}
const STATEMENTS = ["The dashboard is easy to navigate", "I find the search results relevant", "Loading times are acceptable"];
export function LikertScale() {
  const [a, setA] = useState<(number | undefined)[]>([undefined, undefined, undefined]); const mean = likertMean(a); const base = useId();
  return (
    <Stack>
      <div className="p3-likert" role="group" aria-label="Likert survey">
        {STATEMENTS.map((st, i) => (
          <fieldset key={st} className="p3-likert__q"><legend>{st}</legend>
            <div className="p3-likert__opts">{LIKERT.map((l, k) => <label key={l} className={a[i] === k ? "is-on" : ""}><input type="radio" name={`${base}-${i}`} checked={a[i] === k} onChange={() => setA((x) => x.map((y, j) => (j === i ? k : y)))} /><span>{l}</span></label>)}</div>
          </fieldset>))}
      </div>
      <p className="p3-note" aria-live="polite">{mean === null ? "Answer a statement to see the mean." : `Mean score ${mean.toFixed(1)} of 5 across ${a.filter((x) => x !== undefined).length} answers.`}</p>
    </Stack>
  );
}
export const EMOJI = ["👍", "❤️", "🎉", "😄", "😮", "🙏"]; const MORE = ["🔥", "👀", "🚀", "✅", "🤔", "😢", "💯", "👏"];
export function EmojiReactions({ label = "Reactions" }: { label?: string }) {
  const [counts, setCounts] = useState<Record<string, number>>({ "👍": 4, "🎉": 2 }); const [mine, setMine] = useState<Set<string>>(new Set(["👍"])); const [more, setMore] = useState(false);
  const toggle = (e: string) => { const on = mine.has(e); setMine((m) => { const n = new Set(m); on ? n.delete(e) : n.add(e); return n; }); setCounts((c) => ({ ...c, [e]: Math.max(0, (c[e] ?? 0) + (on ? -1 : 1)) })); };
  const shown = Object.keys(counts).filter((e) => counts[e] > 0 || mine.has(e));
  return (
    <Stack>
      <div className="p3-react" role="group" aria-label={label}>
        {shown.map((e) => <button key={e} type="button" className="p3-react__b" aria-pressed={mine.has(e)} aria-label={`${e} ${counts[e]} reaction${counts[e] === 1 ? "" : "s"}${mine.has(e) ? ", including you" : ""}`} onClick={() => toggle(e)}><span aria-hidden>{e}</span> {counts[e]}</button>)}
        <button type="button" className="p3-react__b p3-react__add" aria-expanded={more} aria-label="Add reaction" onClick={() => setMore(!more)}>+</button>
      </div>
      {more && <div className="p3-react p3-react--pick" role="group" aria-label="Choose a reaction">{[...EMOJI, ...MORE].map((e) => <button key={e} type="button" className="p3-react__b" aria-label={`React with ${e}`} onClick={() => { if (!mine.has(e)) toggle(e); setMore(false); }}><span aria-hidden>{e}</span></button>)}</div>}
      <Note>Click a reaction to add or remove yours. Counts update immediately.</Note>
    </Stack>
  );
}

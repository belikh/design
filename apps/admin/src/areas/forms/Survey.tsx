import { useMemo, useState } from "react";
import { Badge, Btn, EmptyState, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented } from "@belikh/jupiter-ui/inputs.tsx";
import { BarChart, Donut, StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { C } from "@belikh/jupiter-ui/Charts.tsx";
import { QUESTIONS, avg, completion, makeResponses, nps, ratingDist, tally, type Response } from "./lib.ts";
import "./p3a.css";

type Seg = "All" | Response["segment"];
const ALL = makeResponses(120);
export function SurveyResults() {
  const [seg, setSeg] = useState<Seg>("All"); const [q, setQ] = useState("");
  const rs = useMemo(() => (seg === "All" ? ALL : ALL.filter((r) => r.segment === seg)), [seg]);
  const n = nps(rs); const comments = rs.filter((r) => typeof r.answers.say === "string" && String(r.answers.say).toLowerCase().includes(q.toLowerCase()));
  const exportCsv = () => { const head = ["id", "segment", "date", ...QUESTIONS.map((x) => x.id)]; const lines = rs.map((r) => [r.id, r.segment, r.at, ...QUESTIONS.map((x) => { const a = r.answers[x.id]; return `"${Array.isArray(a) ? a.join("; ") : (a ?? "")}"`; })].join(",")); const url = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = "survey-responses.csv"; a.click(); URL.revokeObjectURL(url); };
  return (
    <>
      <PageHeader title="Survey results" crumbs={["Forms", "Survey results"]} desc="Customer satisfaction survey, 1 to 11 November 2026." status={<Badge s="info">{rs.length} responses</Badge>} actions={<Btn onClick={exportCsv} icon="download">Export CSV</Btn>} />
      <div className="adm-stack">
        <Segmented label="Respondent group" value={seg} onChange={setSeg} options={(["All", "Customer", "Partner", "Staff"] as Seg[]).map((v) => ({ value: v, label: v }))} />
        {rs.length === 0 ? <EmptyState title="No responses in this group" /> : (<>
          <div className="adm-grid adm-grid--4">
            <StatTile label="Responses" value={String(rs.length)} sub={seg === "All" ? "all groups" : seg} />
            <StatTile label="Completion" value={`${completion(rs)}%`} sub="answered every required question" />
            <StatTile label="Net promoter score" value={String(n.score)} sub={`${n.promoters} promoters, ${n.detractors} detractors`} />
            <StatTile label="Onboarding ease" value={avg(rs, "ease").toFixed(1)} sub="average of 5" />
          </div>
          <div className="adm-grid adm-grid--2">
            {QUESTIONS.filter((x) => x.kind !== "text").map((x) => (
              <Panel key={x.id} title={x.title}>
                {x.kind === "nps" && <><Donut size={150} parts={[{ label: "Promoters (9-10)", value: n.promoters }, { label: "Passives (7-8)", value: n.passives }, { label: "Detractors (0-6)", value: n.detractors }]} center={String(n.score)} /><p className="jp-muted">Answered by {n.n} of {rs.length}.</p></>}
                {x.kind === "rating" && <BarChart labels={["1", "2", "3", "4", "5"]} series={[{ name: "Responses", data: ratingDist(rs, x.id, 1, 5), color: C(0) }]} height={170} tools={false} title={x.title} />}
                {(x.kind === "choice" || x.kind === "multi") && <BarChart horizontal labels={x.options!} series={[{ name: "Responses", data: tally(rs, x.id, x.options!), color: C(1) }]} height={30 + x.options!.length * 34} tools={false} title={x.title} />}
              </Panel>))}
          </div>
          <Panel title={`Comments (${comments.length})`} actions={<input className="jp-input p3a-search" type="search" aria-label="Search comments" placeholder="Search comments" value={q} onChange={(e) => setQ(e.target.value)} />}>
            {comments.length === 0 ? <p className="jp-muted">No comments match.</p> : <ul className="p3a-comments">{comments.slice(0, 12).map((r) => <li key={r.id}><q>{String(r.answers.say)}</q><small className="jp-muted">{r.segment}, {r.at}</small></li>)}</ul>}
          </Panel>
        </>)}
      </div>
    </>
  );
}

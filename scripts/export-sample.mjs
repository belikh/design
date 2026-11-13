#!/usr/bin/env node
// One sample dataset for every non-web target.
//
// Loads the SAME fixtures the web dashboards render (service health, billing, documents, network; the data
// files are located by name, so moving their folder does not break this), flattens them into
// examples/data/sample.json and then derives from that JSON:
//   examples/data/sample.rs                       plain Rust consts for the TUI example, Slint and GTK demos
//   packages/latex/templates/report-generated.tex   the dashboard as a jupiter-report (status, metrics, alerts, network, billing)
//   packages/latex/templates/invoice-generated.tex  the newest invoice, via the web's own invoiceTex()
// `node scripts/export-sample.mjs --check` exits 1 when a committed output is stale (CI runs it).
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");

function find(name) {
  const hits = [];
  const walk = (d) => { for (const e of readdirSync(d)) { if (e === "node_modules" || e === "dist") continue; const p = join(d, e); statSync(p).isDirectory() ? walk(p) : e === name && hits.push(p); } };
  walk(join(root, "apps/admin/src"));
  if (hits.length !== 1) throw new Error(`expected exactly one ${name} under apps/admin/src, found ${hits.length}`);
  return "/" + relative(root, hits[0]);
}

const vite = await createServer({ root, configFile: false, logLevel: "error", appType: "custom", server: { middlewareMode: true, hmr: false, watch: null }, esbuild: { jsx: "automatic" }, optimizeDeps: { noDiscovery: true, include: [] } });
const load = (n) => vite.ssrLoadModule(find(n));
const healthPath = find("service-health.data.ts");
const [health, billing, docs, net, lib] = await Promise.all([load("service-health.data.ts"), load("billing.data.ts"), load("documents.data.ts"), load("network.data.ts"), vite.ssrLoadModule(healthPath.replace(/[^/]+$/, "lib.ts"))]);
await vite.close();

const STEP_MIN = 15;
const lastDay = (s) => s.days.filter((d) => d !== "none").at(-1);
const status = (s) => (lastDay(s) === "down" ? "danger" : lastDay(s) === "warn" ? "warn" : "ok");
const services = health.SERVICES.map((s) => {
  const b = health.errorBudget(s.days, s.slo);
  return { id: s.id, name: s.name, tier: s.tier, owner: health.PEOPLE.find((p) => p.id === s.owner)?.name ?? s.owner, slo: +(s.slo * 100).toFixed(2), uptime: +(health.uptime(s.days) * 100).toFixed(3), p95: s.p95, status: status(s), budget_used_pct: Math.round(Math.min(b.burn, 9.99) * 100) };
});
const metrics = health.SERVICES.flatMap((s) => ["latency", "errors", "cpu"].map((m) => {
  const all = health.METRIC_HISTORY[s.id]?.[m]; if (!all) return null;
  const points = all.filter((_, i) => i % 4 === 3).slice(-24);
  return { svc: s.id, metric: m, unit: health.UNIT[m], points, last: all.at(-1), max: Math.max(...all), mean: +(all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) };
}).filter(Boolean));
const incidents = health.INCIDENTS.map((i) => ({ id: i.id, title: i.title, svc: health.SERVICES.find((s) => s.id === i.svc)?.name ?? i.svc, sev: i.sev, state: i.end ? "resolved" : "open", duration: health.incidentDuration(i), kind: "incident" }));
const rules = health.RULES.map((r) => {
  const series = health.METRIC_HISTORY[r.svc]?.[r.metric] ?? []; const f = health.evaluateRule(r, series, STEP_MIN);
  const firing = f.length > 0 && f.at(-1).to === series.length - 1;
  return { id: r.id, title: `${r.name} (${r.metric} ${r.op} ${r.threshold}${health.UNIT[r.metric]} for ${r.forMin} min)`, svc: health.SERVICES.find((s) => s.id === r.svc)?.name ?? r.svc, sev: r.sev, state: !r.enabled ? "disabled" : firing ? "firing" : "ok", duration: `${f.length} firing${f.length === 1 ? "" : "s"} in 24 h`, kind: "rule" };
});
const invList = billing.INVOICES.map((i) => { const t = billing.totals(i.items); return { number: i.number, client: i.client, issued: i.issued, due: i.due, status: billing.effectiveStatus(i), subtotal: billing.money(t.subtotal), tax: billing.money(t.tax), total: billing.money(t.total), total_cents: Math.round(t.total * 100) }; });
const newest = [...billing.INVOICES].sort((a, b) => b.issued.localeCompare(a.issued))[0];
const invoice = { ...invList.find((i) => i.number === newest.number), lines: newest.items.map((l) => ({ desc: l.desc, qty: l.qty, unit: billing.money(l.unit), amount: billing.money(l.qty * l.unit) })) };
const head = (txt, n = 18) => txt.split("\n").slice(0, n).join("\n");
const tplSrc = (t) => head(readFileSync(join(root, "packages/latex", t.source), "utf8"));
const documents = [
  ...docs.TEMPLATES.map((t) => ({ name: t.name, kind: "Template", detail: `${t.cls}${t.options.length ? " [" + t.options.join(", ") + "]" : ""}`, source: tplSrc(t) })),
  ...docs.LETTERS.map((l) => ({ name: l.subject, kind: `Letter (${l.kind})`, detail: `to ${l.to}, ${l.status}`, source: head(docs.letterTex(l)) })),
  ...docs.PDFS.map((p) => { const t = docs.TEMPLATES.find((x) => x.id === p.template); return { name: p.name, kind: "PDF", detail: `${p.pages} page${p.pages === 1 ? "" : "s"}, ${p.kb} kB, built ${p.at}`, source: `% ${p.name}: compiled from the ${p.template} template (sha ${p.sha})\n` + (t ? tplSrc(t) : "") }; }),
];
const devs = net.DEVICES();
const topology = [];
const walk = (parentId, parentIdx, depth) => { for (const d of devs.filter((x) => (x.uplink || "") === parentId)) { const idx = topology.length; topology.push({ name: d.name, kind: d.kind, status: d.status, depth, parent: parentIdx }); walk(d.id, idx, depth + 1); } };
walk("", -1, 0);
const network = {
  topology,
  vlans: net.VLANS().map((v) => ({ vid: v.vid, name: v.name, subnet: v.subnet, purpose: v.purpose, isolated: v.isolated })),
  devices: net.DEVICES().map((d) => ({ name: d.name, kind: d.kind, ip: d.ip, status: d.status, uptime_days: d.uptimeDays })),
  firewall: net.RULES().map((r) => ({ name: r.name, action: r.action, proto: r.proto, port: r.port, enabled: r.enabled, hits: r.hits })),
};
const sample = { as_of: lib.isoDate(lib.NOW), services, metrics, alerts: [...incidents, ...rules], invoices: invList, invoice, documents, network, settings: { density: "comfortable", theme: "light", show_resolved: true } };
const json = JSON.stringify(sample, null, 1) + "\n";

// ---------- Rust ----------
const q = (s) => JSON.stringify(String(s));
const f = (n) => (Number.isInteger(n) ? `${n}.0` : String(n));
const arr = (xs, fn) => `&[\n${xs.map((x) => "    " + fn(x) + ",").join("\n")}\n]`;
const rs = `// Generated by scripts/export-sample.mjs from the web fixtures (see examples/data/sample.json). Do not edit by hand.
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Service { pub name: &'static str, pub tier: u8, pub owner: &'static str, pub slo: f32, pub uptime: f32, pub p95: u32, pub status: &'static str, pub budget_used_pct: u32 }
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Series { pub svc: &'static str, pub metric: &'static str, pub unit: &'static str, pub points: &'static [f32], pub last: f32, pub max: f32, pub mean: f32 }
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Alert { pub id: &'static str, pub title: &'static str, pub svc: &'static str, pub sev: u8, pub state: &'static str, pub duration: &'static str, pub kind: &'static str }
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Invoice { pub number: &'static str, pub client: &'static str, pub issued: &'static str, pub due: &'static str, pub status: &'static str, pub subtotal: &'static str, pub tax: &'static str, pub total: &'static str, pub total_cents: i64 }
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Line { pub desc: &'static str, pub qty: f32, pub unit: &'static str, pub amount: &'static str }
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Doc { pub name: &'static str, pub kind: &'static str, pub detail: &'static str, pub source: &'static str }
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Node { pub name: &'static str, pub kind: &'static str, pub status: &'static str, pub depth: u8, pub parent: i32 }
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Vlan { pub vid: u16, pub name: &'static str, pub subnet: &'static str, pub purpose: &'static str, pub isolated: bool }
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Device { pub name: &'static str, pub kind: &'static str, pub ip: &'static str, pub status: &'static str, pub uptime_days: u32 }
#[allow(dead_code)] #[derive(Clone, Copy, Debug)] pub struct Fw { pub name: &'static str, pub action: &'static str, pub proto: &'static str, pub port: &'static str, pub enabled: bool, pub hits: u32 }
#[allow(dead_code)] pub const AS_OF: &str = ${q(sample.as_of)};
#[allow(dead_code)] pub const SERVICES: &[Service] = ${arr(services, (s) => `Service { name: ${q(s.name)}, tier: ${s.tier}, owner: ${q(s.owner)}, slo: ${f(s.slo)}, uptime: ${f(s.uptime)}, p95: ${s.p95}, status: ${q(s.status)}, budget_used_pct: ${s.budget_used_pct} }`)};
#[allow(dead_code)] pub const METRICS: &[Series] = ${arr(metrics, (m) => `Series { svc: ${q(m.svc)}, metric: ${q(m.metric)}, unit: ${q(m.unit)}, points: &[${m.points.map(f).join(", ")}], last: ${f(m.last)}, max: ${f(m.max)}, mean: ${f(m.mean)} }`)};
#[allow(dead_code)] pub const ALERTS: &[Alert] = ${arr(sample.alerts, (a) => `Alert { id: ${q(a.id)}, title: ${q(a.title)}, svc: ${q(a.svc)}, sev: ${a.sev}, state: ${q(a.state)}, duration: ${q(a.duration)}, kind: ${q(a.kind)} }`)};
#[allow(dead_code)] pub const INVOICES: &[Invoice] = ${arr(invList, (i) => `Invoice { number: ${q(i.number)}, client: ${q(i.client)}, issued: ${q(i.issued)}, due: ${q(i.due)}, status: ${q(i.status)}, subtotal: ${q(i.subtotal)}, tax: ${q(i.tax)}, total: ${q(i.total)}, total_cents: ${i.total_cents} }`)};
#[allow(dead_code)] pub const INVOICE_LINES: &[Line] = ${arr(invoice.lines, (l) => `Line { desc: ${q(l.desc)}, qty: ${f(l.qty)}, unit: ${q(l.unit)}, amount: ${q(l.amount)} }`)};
#[allow(dead_code)] pub const DOCUMENTS: &[Doc] = ${arr(documents, (d) => `Doc { name: ${q(d.name)}, kind: ${q(d.kind)}, detail: ${q(d.detail)}, source: ${q(d.source)} }`)};
#[allow(dead_code)] pub const TOPOLOGY: &[Node] = ${arr(topology, (n) => `Node { name: ${q(n.name)}, kind: ${q(n.kind)}, status: ${q(n.status)}, depth: ${n.depth}, parent: ${n.parent} }`)};
#[allow(dead_code)] pub const VLANS: &[Vlan] = ${arr(network.vlans, (v) => `Vlan { vid: ${v.vid}, name: ${q(v.name)}, subnet: ${q(v.subnet)}, purpose: ${q(v.purpose)}, isolated: ${v.isolated} }`)};
#[allow(dead_code)] pub const DEVICES: &[Device] = ${arr(network.devices, (d) => `Device { name: ${q(d.name)}, kind: ${q(d.kind)}, ip: ${q(d.ip)}, status: ${q(d.status)}, uptime_days: ${d.uptime_days} }`)};
#[allow(dead_code)] pub const FIREWALL: &[Fw] = ${arr(network.firewall, (r) => `Fw { name: ${q(r.name)}, action: ${q(r.action)}, proto: ${q(r.proto)}, port: ${q(r.port)}, enabled: ${r.enabled}, hits: ${r.hits} }`)};
`;

// ---------- LaTeX (derived from the JSON, not from the TS objects, so the two cannot drift) ----------
const tex = docs.texEscape; const S = JSON.parse(json);
const svcName = (id) => S.services.find((s) => s.id === id)?.name ?? id;
const badge = (st) => `\\jpbadge[${st === "ok" || st === "resolved" || st === "online" ? "ok" : st === "warn" || st === "updating" || st === "disabled" ? "warn" : st === "info" ? "info" : "danger"}]{${tex(st === "danger" ? "down" : st)}}`;
const spark = (pts, color) => { const w = 3.2, h = 0.7, mx = Math.max(...pts, 1), mn = Math.min(...pts); const sc = (v) => ((v - mn) / Math.max(mx - mn, 1e-9) * h).toFixed(3); return `\\begin{tikzpicture}[baseline=0pt]\\draw[${color},line width=0.6pt] ${pts.map((v, i) => `(${(i / (pts.length - 1) * w).toFixed(3)},${sc(v)})`).join(" -- ")};\\end{tikzpicture}`; };
function topoTikz(nodes) {
  const col = (st) => (st === "online" ? "jpOk" : st === "updating" ? "jpWarn" : "jpDanger");
  const nd = nodes.map((n, i) => `\\node[draw=${col(n.status)},fill=${col(n.status)}!10,rounded corners=2pt,inner sep=3pt,font=\\footnotesize,anchor=west] (n${i}) at (${(n.depth * 4.6).toFixed(1)},${(-i * 0.85).toFixed(2)}) {${tex(n.name)} \\jpmuted{(${n.kind})}};`);
  const ed = nodes.map((n, i) => (n.parent >= 0 ? `\\draw[jpTextMuted,line width=0.5pt] (n${n.parent}.south west) ++(0.3,0) |- (n${i}.west);` : "")).filter(Boolean);
  return `\\begin{tikzpicture}[x=1cm,y=1cm]\n${nd.join("\n")}\n${ed.join("\n")}\n\\end{tikzpicture}`;
}
const sevTxt = (n) => health.sevLabel(n);
const open = S.alerts.filter((a) => a.kind === "incident" && a.state === "open").length;
const firing = S.alerts.filter((a) => a.state === "firing").length;
const unpaid = S.invoices.filter((i) => i.status === "sent" || i.status === "overdue");
const report = `% Generated by scripts/export-sample.mjs from the same fixtures as the web dashboards. Do not edit by hand.
\\documentclass{jupiter-report}
\\title{Service and infrastructure report}
\\subtitle{Status, metrics, alerts, network and billing}
\\author{Jupiter design system}
\\reportdate{${tex(fmtLong(S.as_of))}}
\\reportversion{sample data}
\\reportstatus{Generated}
\\begin{document}
\\maketitle
\\tableofcontents
\\clearpage
\\section{Summary}
${S.services.length} services are tracked. ${S.services.filter((s) => s.status === "ok").length} are healthy, ${S.services.filter((s) => s.status === "warn").length} degraded and ${S.services.filter((s) => s.status === "danger").length} down. ${open} incident${open === 1 ? " is" : "s are"} open and ${firing} alert rule${firing === 1 ? " is" : "s are"} firing.
\\begin{jpcallout}[${open || firing ? "warn" : "ok"}]{Attention}${open} open incident${open === 1 ? "" : "s"}; ${unpaid.length} unpaid invoice${unpaid.length === 1 ? "" : "s"}.\\end{jpcallout}
\\section{Service status}
\\begin{jpwide}\\small
\\begin{tabular}{@{}llrrrrl@{}}\\toprule
Service & Owner & SLO & Uptime & p95 (ms) & Budget used & Status\\\\\\midrule
${S.services.map((s) => `${tex(s.name)} & ${tex(s.owner)} & ${s.slo}\\% & ${s.uptime}\\% & ${s.p95 || "--"} & ${s.budget_used_pct}\\% & ${badge(s.status)}\\\\`).join("\n")}
\\bottomrule
\\end{tabular}
\\captionof{table}{Availability over the 90-day window.}
\\end{jpwide}
\\clearpage
\\section{Metrics}
Last 24 hours, hourly samples. Each trend is scaled to its own minimum and maximum.
\\begin{jpwide}\\small
\\begin{tabular}{@{}lllrrrr@{}}\\toprule
Service & Metric & Trend & Last & Mean & Max & Unit\\\\\\midrule
${S.metrics.filter((m) => m.max > 0).map((m) => `${tex(svcName(m.svc))} & ${m.metric} & ${spark(m.points, m.metric === "errors" ? "jpDanger" : "jpAccent")} & ${m.last} & ${m.mean} & ${m.max} & ${tex(m.unit)}\\\\`).join("\n")}
\\bottomrule
\\end{tabular}
\\captionof{table}{Latency, error rate and CPU per service.}
\\end{jpwide}
\\section{Alerts}
\\subsection{Incidents}
\\begin{jpwide}\\small
\\begin{tabular}{@{}llllr@{}}\\toprule
ID & Incident & Severity & State & Duration\\\\\\midrule
${S.alerts.filter((a) => a.kind === "incident").map((a) => `${tex(a.id)} & ${tex(a.title)} & ${tex(sevTxt(a.sev))} & ${badge(a.state === "open" ? "danger" : a.state)} & ${tex(a.duration)}\\\\`).join("\n")}
\\bottomrule
\\end{tabular}
\\end{jpwide}
\\subsection{Alert rules}
\\begin{jpwide}\\small
\\begin{tabular}{@{}lllr@{}}\\toprule
Rule & Service & State & History\\\\\\midrule
${S.alerts.filter((a) => a.kind === "rule").map((a) => `${tex(a.title)} & ${tex(a.svc)} & ${badge(a.state === "firing" ? "danger" : a.state)} & ${tex(a.duration)}\\\\`).join("\n")}
\\bottomrule
\\end{tabular}
\\end{jpwide}
\\section{Network}
\\subsection{VLANs}
\\begin{jpwide}\\small
\\begin{tabular}{@{}rllll@{}}\\toprule
VLAN & Name & Subnet & Purpose & Isolated\\\\\\midrule
${S.network.vlans.map((v) => `${v.vid} & ${tex(v.name)} & \\jpinline{${tex(v.subnet)}} & ${tex(v.purpose)} & ${v.isolated ? "yes" : "no"}\\\\`).join("\n")}
\\bottomrule
\\end{tabular}
\\end{jpwide}
\\subsection{Topology}
Drawn from each device's uplink. Node colour is the device status.
\\begin{jpwide}
\\jpfit{${topoTikz(S.network.topology)}}
\\end{jpwide}
\\subsection{Devices}
\\begin{jpwide}\\small
\\begin{tabular}{@{}lllrl@{}}\\toprule
Device & Kind & Address & Uptime (d) & Status\\\\\\midrule
${S.network.devices.map((d) => `${tex(d.name)} & ${d.kind} & \\jpinline{${tex(d.ip)}} & ${d.uptime_days} & ${badge(d.status === "offline" ? "danger" : d.status)}\\\\`).join("\n")}
\\bottomrule
\\end{tabular}
\\end{jpwide}
\\subsection{Firewall}
\\begin{jpwide}\\small
\\begin{tabular}{@{}llllrl@{}}\\toprule
Rule & Action & Protocol & Port & Hits & Enabled\\\\\\midrule
${S.network.firewall.map((r) => `${tex(r.name)} & ${r.action} & ${r.proto} & ${tex(r.port)} & ${r.hits} & ${r.enabled ? "yes" : "no"}\\\\`).join("\n")}
\\bottomrule
\\end{tabular}
\\end{jpwide}
\\section{Billing}
\\begin{jpwide}\\small
\\begin{tabular}{@{}lllllr@{}}\\toprule
Invoice & Client & Issued & Due & Status & Total (incl. GST)\\\\\\midrule
${S.invoices.map((i) => `${tex(i.number)} & ${tex(i.client)} & ${i.issued} & ${i.due} & ${badge(i.status === "overdue" ? "danger" : i.status === "paid" ? "ok" : "warn")} & ${tex(i.total)}\\\\`).join("\n")}
\\bottomrule
\\end{tabular}
\\end{jpwide}
\\end{document}
`;
function fmtLong(iso) { return new Date(iso + "T00:00:00Z").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }); }
const invoiceTexSrc = `% Generated by scripts/export-sample.mjs using the web's invoiceTex() for ${newest.number}. Do not edit by hand.\n` + docs.invoiceTex(newest) + "\n";

const outputs = [["examples/data/sample.json", json], ["examples/data/sample.rs", rs], ["packages/latex/templates/report-generated.tex", report], ["packages/latex/templates/invoice-generated.tex", invoiceTexSrc]];
let stale = 0;
for (const [p, body] of outputs) {
  const abs = join(root, p); const cur = existsSync(abs) ? readFileSync(abs, "utf8") : null;
  if (check) { if (cur !== body) { console.error(`stale: ${p} (run: npm run export:sample)`); stale++; } } else { writeFileSync(abs, body); console.log("wrote", p); }
}
process.exit(stale ? 1 : 0);

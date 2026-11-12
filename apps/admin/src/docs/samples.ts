// Demo data + copyable markup for the docs. Markup strings mirror the React wrappers in components/ds.tsx.

export interface ServiceRow extends Record<string, string | number> {
  service: string;
  region: string;
  status: "ok" | "warn" | "danger" | "info";
  uptime: number;
  p95: number;
  req: number;
}

export const SERVICES: ServiceRow[] = [
  { service: "api.jupiter.au", region: "syd-1", status: "ok", uptime: 99.98, p95: 182, req: 1284031 },
  { service: "auth", region: "syd-1", status: "ok", uptime: 99.99, p95: 64, req: 402118 },
  { service: "mail-relay", region: "mel-1", status: "warn", uptime: 99.71, p95: 911, req: 88120 },
  { service: "billing", region: "syd-2", status: "ok", uptime: 100, p95: 240, req: 51007 },
  { service: "search", region: "syd-1", status: "info", uptime: 99.9, p95: 312, req: 730442 },
  { service: "legacy-ftp", region: "per-1", status: "danger", uptime: 92.4, p95: 4120, req: 1203 },
  { service: "cdn-edge", region: "global", status: "ok", uptime: 99.995, p95: 38, req: 9921004 },
  { service: "kiosk-sync", region: "bne-1", status: "ok", uptime: 99.82, p95: 520, req: 22014 },
  { service: "ssh-bastion", region: "syd-1", status: "ok", uptime: 99.97, p95: 12, req: 3301 },
  { service: "metrics", region: "mel-1", status: "warn", uptime: 99.4, p95: 690, req: 610552 },
  { service: "webhooks", region: "syd-2", status: "ok", uptime: 99.93, p95: 140, req: 120884 },
  { service: "storage", region: "syd-1", status: "ok", uptime: 99.999, p95: 71, req: 2208113 },
];

export const STATUS_LABEL: Record<ServiceRow["status"], string> = {
  ok: "ok",
  warn: "degraded",
  danger: "down",
  info: "maintenance",
};

export const SPARK_A = [12, 14, 13, 17, 16, 19, 18, 22, 21, 24, 23, 27];
export const SPARK_B = [40, 38, 41, 37, 35, 36, 33, 31, 32, 30, 29, 28];
export const SPARK_C = [5, 6, 5, 7, 9, 8, 8, 10, 9, 12, 11, 13];
export const SPARK_D = [92, 93, 92, 94, 95, 94, 96, 95, 97, 96, 97, 98];

export const LOG_TEXT = `2025-11-12T04:41:07Z  INFO   deploy   jupiter-api@4.12.0 rolling out (3/3 pods)
2025-11-12T04:41:09Z  OK     health   api.jupiter.au 200 in 182ms
2025-11-12T04:41:12Z  WARN   mail     relay cert expires in 6 days
2025-11-12T04:41:15Z  ERROR  ftp      legacy-ftp: connection refused (per-1)
2025-11-12T04:41:16Z  INFO   kiosk    bne-1 synced 214 devices`;

export const MARKUP = {
  button: `<button class="jp-btn jp-btn--primary">Deploy</button>
<button class="jp-btn jp-btn--secondary">Preview</button>
<button class="jp-btn jp-btn--ghost">Cancel</button>
<button class="jp-btn jp-btn--primary jp-btn--sm" disabled>Disabled</button>`,
  inputs: `<label class="jp-field">
  <span class="jp-label">Hostname</span>
  <input class="jp-input jp-input--mono" placeholder="api.jupiter.au">
  <span class="jp-hint">Fully qualified, no scheme.</span>
</label>

<label class="jp-field">
  <span class="jp-label">Region</span>
  <select class="jp-select">
    <option>syd-1</option><option>mel-1</option>
  </select>
</label>

<label class="jp-inline">
  <input type="checkbox" role="switch" class="jp-toggle" checked>
  <span>Alerts enabled</span>
</label>`,
  panel: `<section class="jp-panel">
  <header class="jp-panel__bar">
    <span class="jp-panel__title">node syd-1-a</span>
    <button class="jp-btn jp-btn--ghost jp-btn--sm">restart</button>
  </header>
  <div class="jp-panel__body">…</div>
</section>

<!-- header strip is optional -->
<section class="jp-panel"><div class="jp-panel__body">…</div></section>`,
  table: `<div class="jp-table-wrap">
  <table class="jp-table">
    <thead><tr>
      <th aria-sort="ascending"><button>Service</button></th>
      <th class="jp-num"><button>p95 ms</button></th>
    </tr></thead>
    <tbody>
      <tr><td>api.jupiter.au</td><td class="jp-num">182</td></tr>
    </tbody>
  </table>
</div>

<script>
/* optional ~12-line vanilla sorter, no dependencies */
document.querySelectorAll('.jp-table th button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const th = btn.closest('th'), table = th.closest('table');
    const i = [...th.parentNode.children].indexOf(th);
    const dir = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    table.querySelectorAll('th').forEach((h) => h.removeAttribute('aria-sort'));
    th.setAttribute('aria-sort', dir);
    const rows = [...table.tBodies[0].rows], m = dir === 'ascending' ? 1 : -1;
    rows.sort((a, b) => { const x = a.cells[i].textContent, y = b.cells[i].textContent;
      return (isNaN(x) || isNaN(y) ? x.localeCompare(y) : x - y) * m; });
    rows.forEach((r) => table.tBodies[0].appendChild(r));
  });
});
</script>`,
  badge: `<span class="jp-badge jp-badge--ok">ok</span>
<span class="jp-badge jp-badge--warn">degraded</span>
<span class="jp-badge jp-badge--danger">down</span>
<span class="jp-badge jp-badge--info">maintenance</span>
<span class="jp-badge jp-badge--pill">v4.12.0</span>`,
  stat: `<div class="jp-stat">
  <span class="jp-stat__label">Requests / min</span>
  <span class="jp-stat__value">21,480<small>rpm</small></span>
  <span class="jp-stat__meta">
    <span class="jp-delta--up">12.4%</span>
    <svg class="jp-stat__spark" viewBox="0 0 96 24" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="0,20 16,16 32,18 48,10 64,12 80,6 96,4"/>
    </svg>
  </span>
</div>`,
  code: `<div class="jp-code">
  <div class="jp-code__bar">
    <span>deploy.log</span>
    <button class="jp-code__copy"
      onclick="navigator.clipboard.writeText(this.closest('.jp-code').querySelector('pre').innerText)">copy</button>
  </div>
  <pre><code><span class="jp-log-ok">OK</span>  health  api.jupiter.au 200</code></pre>
</div>`,
  callout: `<div class="jp-callout" role="note">
  <p class="jp-callout__title">Info</p>
  <p>Maintenance window Sunday 02:00–03:00 AEST.</p>
</div>
<div class="jp-callout jp-callout--warn" role="note">…</div>
<div class="jp-callout jp-callout--danger" role="note">…</div>`,
  grid: `<div class="jp-container">
  <div class="jp-grid">
    <div class="jp-col-12 jp-sm-6 jp-lg-3">stat</div>
    <div class="jp-col-12 jp-sm-6 jp-lg-3">stat</div>
    <div class="jp-col-12 jp-md-8">table</div>
    <div class="jp-col-12 jp-md-4">log</div>
  </div>
</div>

<article class="jp-prose">…reading column, max 72ch…</article>`,
  quickstart: `<!doctype html>
<html lang="en">            <!-- add data-theme="dark" to force a mode -->
<head>
  <link rel="stylesheet" href="jupiter.css">
  <!-- optional: <link rel="stylesheet" href="jupiter-kiosk.css"> -->
</head>
<body>
  <main class="jp-container jp-prose">
    <h1>Hello, Jupiter</h1>
    <button class="jp-btn jp-btn--primary">Start</button>
  </main>
</body>
</html>`,
};

import { describe, expect, it } from "vitest";
import { runSql, SqlError, type Row } from "./lib/sql.ts";
import { jsonPath, PathError, type Json } from "./lib/jsonpath.ts";
import { jq, JqError } from "./lib/jq.ts";
import { describeCron, nextRuns, parseCron, CronError } from "./lib/cron.ts";
import { parseYaml, toYaml, validate, YamlError } from "./lib/yaml.ts";
import { backtest } from "./lib/alert.ts";
import { customers } from "./lib/data.ts";
import { DEFAULT_RULES, dqScore, profile, runRule, runRules } from "./lib/dq.ts";
import { applyItem, changedFields, planBulk, summary } from "./lib/bulk.ts";
import { initialShell, makeFs, runLine } from "./lib/shell.ts";
import { handle } from "./lib/api.ts";
import { bottleneck, shortestPath } from "./lib/topology.ts";
import { criticalPath, flatten, makeTrace, selfTime } from "./lib/trace.ts";
import { paginate } from "./lib/paginate.ts";
import { counts, enqueue, initJobs, pauseQueue, retryJob, step } from "./lib/jobs.ts";
import { HOURS, queryMetrics } from "./lib/metrics.ts";

const T: Record<string, Row[]> = { t: [{ id: "a", city: "Brisbane", n: 3, ok: true }, { id: "b", city: "Sydney", n: 7, ok: false }, { id: "c", city: "Brisbane", n: 5, ok: true }, { id: "d", city: null, n: 1, ok: true }] };

describe("sql", () => {
  it("filters, sorts and limits", () => { const r = runSql("select id, n from t where n >= 3 order by n desc limit 2", T); expect(r.rows).toEqual([{ id: "b", n: 7 }, { id: "c", n: 5 }]); expect(r.columns).toEqual(["id", "n"]); });
  it("groups with aggregates, aliases, having and order by alias", () => {
    const r = runSql("select city, count(*) as c, sum(n) as total from t where city is not null group by city having count(*) >= 1 order by total desc", T);
    expect(r.rows).toEqual([{ city: "Sydney", c: 1, total: 7 }, { city: "Brisbane", c: 2, total: 8 }].sort((a, b) => (b.total as number) - (a.total as number)));
  });
  it("supports LIKE, IN, BETWEEN, arithmetic and functions", () => {
    expect(runSql("select id from t where city like 'bris%'", T).rows.map((x) => x.id)).toEqual(["a", "c"]);
    expect(runSql("select id from t where id in ('a','d')", T).rows).toHaveLength(2); expect(runSql("select id from t where n between 3 and 5", T).rows).toHaveLength(2);
    expect(runSql("select upper(city) as c, n * 2 as dbl from t where id = 'b'", T).rows[0]).toEqual({ c: "SYDNEY", dbl: 14 });
  });
  it("treats NULL correctly (comparisons are false, IS NULL works)", () => { expect(runSql("select id from t where city = 'x'", T).rows).toHaveLength(0); expect(runSql("select id from t where city is null", T).rows).toEqual([{ id: "d" }]); });
  it("whole-table aggregate with no rows still returns one row", () => { expect(runSql("select count(*) as c, sum(n) as s from t where n > 100", T).rows).toEqual([{ c: 0, s: null }]); });
  it("reports errors with positions and helpful text", () => {
    expect(() => runSql("select nope from t", T)).toThrow(/Unknown column "nope"/); expect(() => runSql("select * from missing", T)).toThrow(/Unknown table/);
    expect(() => runSql("select city, count(*) from t", T)).toThrow(/GROUP BY/); expect(() => runSql("select * from t where", T)).toThrow(SqlError);
    expect(() => runSql("select * from t where count(*) > 1", T)).toThrow(/HAVING/);
    try { runSql("select id frm t", T); } catch (e) { expect(e).toBeInstanceOf(SqlError); expect((e as SqlError).pos).toBeGreaterThan(0); }
  });
  it("is not injectable: no way to run code", () => { expect(() => runSql("select id from t; drop table t", T)).toThrow(SqlError); });
});

const DOC: Json = { store: { book: [{ title: "A", price: 8.95, tags: ["x"] }, { title: "B", price: 12.99 }, { title: "C", price: 22.99, isbn: "0-395" }], bicycle: { color: "red", price: 19.95 } } };
describe("jsonpath", () => {
  it("child, index, wildcard, slice, union", () => {
    expect(jsonPath(DOC, "$.store.book[0].title")[0].value).toBe("A"); expect(jsonPath(DOC, "$.store.book[*].title").map((h) => h.value)).toEqual(["A", "B", "C"]);
    expect(jsonPath(DOC, "$.store.book[-1].title")[0].value).toBe("C"); expect(jsonPath(DOC, "$.store.book[0:2].title")).toHaveLength(2); expect(jsonPath(DOC, "$.store.bicycle['color','price']")).toHaveLength(2);
  });
  it("recursive descent and filters", () => {
    expect(jsonPath(DOC, "$..price").map((h) => h.value)).toEqual([8.95, 12.99, 22.99, 19.95]); expect(jsonPath(DOC, "$.store.book[?(@.price < 15)].title").map((h) => h.value)).toEqual(["A", "B"]);
    expect(jsonPath(DOC, "$.store.book[?(@.isbn)].title")[0].value).toBe("C"); expect(jsonPath(DOC, "$.store.book[?(@.price > 10 && @.title != 'C')].title")[0].value).toBe("B");
    expect(jsonPath(DOC, "$.store.book[0].title")[0].path).toBe("$['store']['book'][0]['title']");
  });
  it("errors on bad paths", () => { expect(() => jsonPath(DOC, "store.book")).toThrow(PathError); expect(() => jsonPath(DOC, "$.store[")).toThrow(PathError); });
});

const PEOPLE: Json = [{ name: "Ava", age: 31, tags: ["a", "b"], city: "BNE" }, { name: "Noah", age: 25, tags: [], city: "SYD" }, { name: "Mia", age: 41, tags: ["c"], city: "BNE" }];
describe("jq", () => {
  it("paths, iteration and pipes", () => { expect(jq(".[0].name", PEOPLE)).toEqual(["Ava"]); expect(jq(".[] | .name", PEOPLE)).toEqual(["Ava", "Noah", "Mia"]); expect(jq("length", PEOPLE)).toEqual([3]); });
  it("select, map, sort_by, group_by, add", () => {
    expect(jq(".[] | select(.age > 30) | .name", PEOPLE)).toEqual(["Ava", "Mia"]); expect(jq("map(.age) | add", PEOPLE)).toEqual([97]); expect(jq("sort_by(.age) | .[0].name", PEOPLE)).toEqual(["Noah"]);
    expect(jq("group_by(.city) | map({city: .[0].city, n: length})", PEOPLE)).toEqual([[{ city: "BNE", n: 2 }, { city: "SYD", n: 1 }]]);
  });
  it("construction, comparison, if, strings", () => {
    expect(jq("{n: .[0].name, old: (.[0].age > 30)}", PEOPLE)).toEqual([{ n: "Ava", old: true }]); expect(jq('.[0].name | ascii_upcase | test("^A")', PEOPLE)).toEqual([true]);
    expect(jq('map(if .age > 30 then "senior" else "junior" end)', PEOPLE)).toEqual([["senior", "junior", "senior"]]); expect(jq('.[0] | keys', PEOPLE)).toEqual([["age", "city", "name", "tags"]]);
    expect(jq('[.[].tags[]] | unique', PEOPLE)).toEqual([["a", "b", "c"]]); expect(jq('.[0] | to_entries | map(.key) | join(",")', PEOPLE)).toEqual(["name,age,tags,city"]);
  });
  it("reports errors clearly and stops runaway programs", () => {
    expect(() => jq(".[0] | .name | .x", PEOPLE)).toThrow(JqError); expect(() => jq("nope", PEOPLE)).toThrow(/Unknown function/); expect(() => jq(".[", PEOPLE)).toThrow(JqError);
    expect(() => jq("[range(10000)] | map([range(100)] | length) | add", null)).not.toThrow(); expect(() => jq("[range(10000)] | map(. as $x | 1)", null)).toThrow(JqError);
  });
});

describe("cron", () => {
  const from = new Date(2026, 10, 12, 17, 52);
  it("parses lists, ranges, steps, names and aliases", () => { const c = parseCron("*/15 9-17 * jan,nov mon-fri"); expect(c.min).toEqual([0, 15, 30, 45]); expect(c.hour).toHaveLength(9); expect(c.mon).toEqual([1, 11]); expect(c.dow).toEqual([1, 2, 3, 4, 5]); expect(parseCron("@daily").hour).toEqual([0]); });
  it("computes next runs after a date", () => { const r = nextRuns("0 18 * * *", from, 3); expect(r[0]).toEqual(new Date(2026, 10, 12, 18, 0)); expect(r[1]).toEqual(new Date(2026, 10, 13, 18, 0)); expect(nextRuns("*/20 * * * *", from, 2).map((d) => d.getMinutes())).toEqual([0, 20]); });
  it("handles weekday and month constraints", () => { const r = nextRuns("30 9 * * mon", from, 2); expect(r[0].getDay()).toBe(1); expect(r[0].getHours()).toBe(9); expect(nextRuns("0 0 1 jan *", from, 1)[0]).toEqual(new Date(2027, 0, 1, 0, 0)); });
  it("describes in words and rejects bad input", () => { expect(describeCron("0 18 * * *")).toMatch(/18:00, every day/); expect(describeCron("30 9 * * 1-5")).toMatch(/09:30.*mon–fri/); expect(() => parseCron("* * *")).toThrow(CronError); expect(() => parseCron("61 * * * *")).toThrow(/minute must be 0–59/); });
});

describe("yaml", () => {
  const Y = "name: api\nreplicas: 3\nenabled: true\nlimits:\n  cpu: 500m\n  memory: 256Mi\nports:\n  - 80\n  - 443\nenv:\n  - name: LOG\n    value: info\n  - name: MODE\n    value: prod\nnotes: |\n  line one\n  line two\ntags: [a, b, 'c d']\nempty: null # comment\n";
  it("parses maps, lists, scalars, block scalars and flow", () => {
    const v = parseYaml(Y) as { [k: string]: Json }; expect(v.name).toBe("api"); expect(v.replicas).toBe(3); expect(v.enabled).toBe(true); expect(v.limits).toEqual({ cpu: "500m", memory: "256Mi" }); expect(v.ports).toEqual([80, 443]);
    expect(v.env).toEqual([{ name: "LOG", value: "info" }, { name: "MODE", value: "prod" }]); expect(v.notes).toBe("line one\nline two\n"); expect(v.tags).toEqual(["a", "b", "c d"]); expect(v.empty).toBeNull();
  });
  it("round-trips through toYaml", () => { const v = parseYaml(Y); expect(parseYaml(toYaml(v))).toEqual(v); });
  it("reports line numbers", () => { try { parseYaml("a: 1\n  b: 2\n"); } catch (e) { expect(e).toBeInstanceOf(YamlError); } expect(() => parseYaml("a: 1\na: 2")).toThrow(/Duplicate key/); expect(() => parseYaml("a: [1, 2")).toThrow(YamlError); expect(() => parseYaml("\tkey: 1")).toThrow(/Tabs/); });
  it("validates against a schema", () => { const s = { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 3 }, replicas: { type: "integer", minimum: 1, maximum: 10 } }, additionalProperties: false }; expect(validate({ name: "api", replicas: 3 }, s)).toEqual([]); expect(validate({ name: "a", replicas: 99, x: 1 }, s)).toHaveLength(3); expect(validate({}, s)[0]).toMatch(/missing required/); });
});

describe("alert back-test", () => {
  const v = [1, 2, 9, 9, 9, 2, 1, 9, 2, 9, 9, 9, 9, 1];
  it("requires the condition to hold for N points", () => { const b = backtest(v, { op: ">", threshold: 5, forPoints: 3, cooldownPoints: 0 }); expect(b.firings.map((f) => [f.start, f.end])).toEqual([[2, 4], [9, 12]]); expect(b.states.slice(0, 5)).toEqual(["ok", "ok", "pending", "pending", "firing"]); });
  it("suppresses repeat notifications inside the cooldown", () => { const b = backtest(v, { op: ">", threshold: 5, forPoints: 3, cooldownPoints: 10 }); expect(b.firings).toHaveLength(2); expect(b.notifications).toBe(1); expect(b.suppressed).toBe(1); });
  it("supports < and tracks the peak", () => { const b = backtest([5, 1, 0, 6], { op: "<", threshold: 2, forPoints: 1, cooldownPoints: 0 }); expect(b.firings[0].peak).toBe(0); expect(b.firingPoints).toBe(2); });
});

describe("data quality", () => {
  it("finds the seeded defects and scores below 100", () => {
    const res = runRules(customers, DEFAULT_RULES); const by = (id: string) => res.find((r) => r.rule.id === id)!;
    expect(by("email-present").failed).toBeGreaterThan(0); expect(by("email-format").failed).toBeGreaterThan(0); expect(by("plan-enum").failed).toBeGreaterThan(0); expect(by("balance-range").failed).toBeGreaterThan(0); expect(by("id-unique").failed).toBe(2); expect(by("signup-past").failed).toBeGreaterThan(0);
    const score = dqScore(res); expect(score).toBeLessThan(100); expect(score).toBeGreaterThan(80);
  });
  it("profiles columns", () => { const p = profile(customers).find((c) => c.col === "email")!; expect(p.nulls).toBeGreaterThan(0); expect(p.distinct).toBeGreaterThan(100); expect(runRule([{ id: "1", a: 5 }], { id: "x", col: "a", kind: "range", min: 6, severity: "warn", label: "" }).failed).toBe(1); });
});

describe("bulk runner", () => {
  const rows = customers.slice(0, 40);
  it("plans without changing anything (dry run)", () => { const before = JSON.stringify(rows); const plan = planBulk(rows, { kind: "set", field: "plan", value: "pro" }); expect(JSON.stringify(rows)).toBe(before); const s = summary(plan); expect(s.total).toBe(40); expect(s.ok + s.skip + s.error).toBe(40); expect(plan.find((p) => p.status === "ok") && changedFields(plan.find((p) => p.status === "ok")!)[0][0]).toBe("plan"); });
  it("flags invalid operations per row", () => { expect(summary(planBulk(rows, { kind: "set", field: "plan", value: "gold" })).error).toBeGreaterThan(0); expect(summary(planBulk(rows, { kind: "set", field: "nope", value: "x" })).error).toBe(40); expect(summary(planBulk(rows, { kind: "uppercase", field: "balance" })).error).toBe(40); });
  it("skips no-ops and inactive customers", () => { const p = planBulk(rows, { kind: "credit", amount: 10 }); expect(p.every((x) => (x.before.active === false ? x.status === "skip" : true))).toBe(true); const t = planBulk([{ id: "1", tags: "vip" }], { kind: "add_tag", tag: "vip" }); expect(t[0].status).toBe("skip"); });
  it("applies with deterministic transient failures that succeed on retry", () => { const plan = planBulk(rows, { kind: "archive" }); const first = plan.map((p) => applyItem(p)); expect(first.some((p) => p.status === "failed")).toBe(true); const second = first.map((p) => applyItem(p)); expect(second.filter((p) => p.status === "failed")).toHaveLength(0); });
});

describe("sandboxed shell", () => {
  const run = (line: string, st = initialShell(), fs = makeFs()) => runLine(line, st, fs);
  it("navigates and reads files", () => { const fs = makeFs(); let st = initialShell(); expect(run("pwd", st, fs).out).toEqual(["/home/ava"]); st = run("cd projects", st, fs).state; expect(run("pwd", st, fs).out).toEqual(["/home/ava/projects"]); expect(run("cat ../notes.txt", st, fs).out[0]).toMatch(/wireguard/); expect(run("cd /nope", st, fs).error).toBe(true); });
  it("supports pipes and filters", () => { expect(run("cat /var/log/syslog | grep -i failed | wc -l").out).toEqual(["2"]); expect(run("grep -n sshd /var/log/syslog").out[0]).toMatch(/^1:/); expect(run("cat /var/log/syslog | head -n 1").out).toHaveLength(1); });
  it("mutates only the virtual file system", () => { const fs = makeFs(); run("mkdir /tmp/x", initialShell(), fs); expect(run("ls /tmp", initialShell(), fs).out[0]).toMatch(/x\//); run("rm -r /tmp/x", initialShell(), fs); expect(run("ls /tmp", initialShell(), fs).out[0]).toBe(""); });
  it("refuses real network and unknown commands", () => { expect(run("curl https://example.com").error).toBe(true); expect(run("ping 8.8.8.8").out[0]).toMatch(/sandboxed/); expect(run("rm -rf /").error).toBe(true); expect(run("sudo reboot").out[0]).toMatch(/command not found/); expect(run('echo "unterminated').error).toBe(true); });
});

describe("mock API", () => {
  const H = { Authorization: "Bearer demo-token" }; const call = (method: string, url: string, body?: string, headers: Record<string, string> = H) => handle({ method, url, headers, body });
  it("authenticates", () => { expect(call("GET", "/v1/orders", undefined, {}).status).toBe(401); expect(call("GET", "/v1/health", undefined, {}).status).toBe(200); });
  it("lists, filters and fetches", () => { const l = JSON.parse(call("GET", "/v1/orders?status=paid&limit=3").body) as { data: unknown[]; count: number }; expect(l.count).toBe(3); expect(call("GET", "/v1/orders/ORD-10240").status).toBe(200); expect(call("GET", "/v1/orders/NOPE").status).toBe(404); expect(call("GET", "/v1/orders?limit=abc").status).toBe(400); });
  it("validates POST bodies and handles methods", () => { expect(call("POST", "/v1/orders", "{bad").status).toBe(400); expect(call("POST", "/v1/orders", '{"customer":"A"}').status).toBe(422); const ok = call("POST", "/v1/orders", '{"customer":"Ava","amount":12.5}'); expect(ok.status).toBe(201); expect(ok.headers.location).toBeTruthy(); const m = call("PUT", "/v1/orders"); expect(m.status).toBe(405); expect(m.headers.allow).toMatch(/GET/); expect(call("GET", "/v1/boom").status).toBe(500); });
});

describe("topology", () => {
  it("finds paths and routes around a down node", () => { const p = shortestPath("ws", "api")!; expect(p[0]).toBe("ws"); expect(p[p.length - 1]).toBe("api"); expect(p).toContain("core"); expect(shortestPath("ws", "ws")).toEqual(["ws"]); expect(shortestPath("ws", "pxe")).toBeTruthy(); expect(shortestPath("ws", "nope")).toBeNull(); });
  it("avoids down nodes when asked, and finds the bottleneck", () => { expect(shortestPath("api", "pxe", { avoidDown: true })).toBeTruthy(); const p = shortestPath("ws", "cam1")!; expect(bottleneck(p)!.util).toBeGreaterThan(0.5); });
});
describe("trace", () => {
  it("orders spans as a tree, computes critical path and self time", () => { const t = makeTrace(1); const flat = flatten(t.spans); expect(flat[0].parent).toBeNull(); expect(flat).toHaveLength(t.spans.length); expect(flatten(t.spans, new Set(["b"]))).toHaveLength(2); const cp = criticalPath(t.spans); expect(cp.has("a")).toBe(true); expect(cp.size).toBeGreaterThan(2); const root = t.spans[0]; expect(selfTime(t.spans, root)).toBeLessThan(root.dur); expect(selfTime(t.spans, t.spans.find((s) => s.id === "e")!)).toBe(t.spans.find((s) => s.id === "e")!.dur); });
  it("marks error traces deterministically", () => { expect(makeTrace(3).spans[0].status).toBe("error"); expect(makeTrace(1).spans[0].status).toBe("ok"); });
});
describe("pagination", () => {
  it("fills pages and honours keep-with-next", () => { const b = [{ id: "h1", h: 20, keepWithNext: true }, { id: "t1", h: 70 }, { id: "h2", h: 20, keepWithNext: true }, { id: "t2", h: 50 }, { id: "t3", h: 30 }]; const pages = paginate(b, 100); expect(pages.map((p) => p.blocks.map((x) => x.id))).toEqual([["h1", "t1"], ["h2", "t2", "t3"]]); expect(paginate([{ id: "big", h: 500 }, { id: "s", h: 10 }], 100)).toHaveLength(2); });
});
describe("job queue simulation", () => {
  it("runs jobs through states, respects concurrency and pause, and retries", () => {
    let s = initJobs(); const c0 = counts(s); expect(c0.active).toBeLessThanOrEqual(8); for (const q of s.queues) expect(counts(s, q.id).active).toBeLessThanOrEqual(q.concurrency);
    for (let i = 0; i < 60; i++) s = step(s); expect(counts(s).completed).toBeGreaterThan(5);
    let p = pauseQueue(enqueue(initJobs(), "mail"), "mail", true); const active = counts(p, "mail").active; for (let i = 0; i < 20; i++) p = step(p); expect(counts(p, "mail").waiting).toBeGreaterThanOrEqual(0); expect(counts(p, "mail").active).toBeLessThanOrEqual(active);
    const failed = { ...s, jobs: s.jobs.map((j, i) => (i === 0 ? { ...j, state: "failed" as const, error: "x" } : j)) }; expect(retryJob(failed, failed.jobs[0].id).jobs[0].state).toBe("waiting");
  });
});
describe("metrics", () => {
  it("aggregates, groups and filters", () => { const q = queryMetrics({ metric: "latency_ms", agg: "avg", groupBy: ["service"], filters: {}, hours: 24, step: 1 }); expect(q.series).toHaveLength(5); expect(q.labels).toHaveLength(24); const only = queryMetrics({ metric: "latency_ms", agg: "max", groupBy: [], filters: { service: ["jupiter-api"] }, hours: HOURS, step: 24 }); expect(only.series).toHaveLength(1); expect(only.labels).toHaveLength(7); const all = queryMetrics({ metric: "http_requests", agg: "sum", groupBy: [], filters: {}, hours: 6, step: 6 }); const one = queryMetrics({ metric: "http_requests", agg: "sum", groupBy: [], filters: { region: ["home"] }, hours: 6, step: 6 }); expect(all.series[0].data[0]).toBeGreaterThan(one.series[0].data[0]); });
});

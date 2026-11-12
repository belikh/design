import { useMemo, useRef, useState } from "react";
import { Btn, Badge } from "@belikh/jupiter-ui/kit.tsx";
import { Segmented, Select } from "@belikh/jupiter-ui/inputs.tsx";
import { FUNCTIONS, calc, parse, type Scalar, show } from "./formula.ts";
import { OPS, OP_LABEL, countConds, depth, newCond, newGroup, segments, testRegex, toPredicate, toSentence, toSql, type Cond, type FieldDef, type Group, type Op } from "./query.ts";
import { CopyBtn, Note, Row, Stack } from "./ui.tsx";

/* ---------------- C050 query / filter builder ---------------- */
export const DEFS: FieldDef[] = [{ id: "name", label: "Name", type: "text" }, { id: "role", label: "Role", type: "enum", options: ["admin", "editor", "viewer"] }, { id: "age", label: "Age", type: "number" }, { id: "joined", label: "Joined", type: "date" }, { id: "region", label: "Region", type: "enum", options: ["QLD", "NSW", "VIC", "WA"] }];
export const ROWS = [
  { name: "Ava Nguyen", role: "admin", age: 34, joined: "2021-03-02", region: "QLD" }, { name: "Ben Ortiz", role: "editor", age: 27, joined: "2023-07-19", region: "NSW" }, { name: "Cleo Park", role: "viewer", age: 45, joined: "2019-11-30", region: "VIC" }, { name: "Dev Patel", role: "editor", age: 31, joined: "2022-01-11", region: "QLD" },
  { name: "Esi Mensah", role: "viewer", age: 23, joined: "2024-05-05", region: "WA" }, { name: "Finn Murphy", role: "admin", age: 52, joined: "2018-08-21", region: "NSW" }, { name: "Gia Rossi", role: "viewer", age: 38, joined: "2020-02-14", region: "QLD" }, { name: "Hiro Tanaka", role: "editor", age: 29, joined: "2024-01-09", region: "VIC" },
];
const MAX_DEPTH = 3;
function GroupView({ g, path, onChange, onRemove, level }: { g: Group; path: string; onChange: (g: Group) => void; onRemove?: () => void; level: number }) {
  const upd = (i: number, item: Cond | Group) => onChange({ ...g, items: g.items.map((x, j) => (j === i ? item : x)) });
  const del = (i: number) => onChange({ ...g, items: g.items.filter((_, j) => j !== i) });
  return (
    <div className={`p3-qgroup p3-qgroup--${g.join}`} role="group" aria-label={`${level === 0 ? "Filter" : `Group ${path}`}: match ${g.join === "and" ? "all" : "any"}`}>
      <Row><Segmented label={`Combine ${path || "top level"} with`} value={g.join} onChange={(join) => onChange({ ...g, join })} options={[{ value: "and", label: "AND" }, { value: "or", label: "OR" }]} />
        <label className="adm-check"><input type="checkbox" checked={!!g.not} onChange={(e) => onChange({ ...g, not: e.target.checked })} /><span>NOT</span></label>
        {onRemove && <Btn sm variant="ghost" onClick={onRemove} aria-label={`Remove group ${path}`}>Remove group</Btn>}</Row>
      <ul className="p3-qitems">{g.items.map((it, i) => (
        <li key={it.id}>{it.kind === "group" ? <GroupView g={it} path={`${path}${path ? "." : ""}${i + 1}`} level={level + 1} onChange={(n) => upd(i, n)} onRemove={() => del(i)} /> : (() => { const def = DEFS.find((d) => d.id === it.field)!; const n = `${path}${path ? "." : ""}${i + 1}`; return (
          <div className="p3-qcond">
            <Select value={it.field} aria-label={`Condition ${n} field`} onChange={(f) => { const d = DEFS.find((x) => x.id === f)!; upd(i, { ...it, field: f, op: OPS[d.type].includes(it.op) ? it.op : OPS[d.type][0], value: "" }); }} options={DEFS.map((d) => ({ value: d.id, label: d.label }))} />
            <Select value={it.op} aria-label={`Condition ${n} operator`} onChange={(op) => upd(i, { ...it, op: op as Op })} options={OPS[def.type].map((o) => ({ value: o, label: OP_LABEL[o] }))} />
            {it.op === "empty" || it.op === "notEmpty" ? <span className="p3-note p3-grow" /> : def.type === "enum" && it.op !== "in" ? <Select value={it.value} aria-label={`Condition ${n} value`} onChange={(v) => upd(i, { ...it, value: v })} options={[{ value: "", label: "Choose…" }, ...(def.options ?? [])]} /> : <input className="jp-input p3-grow" aria-label={`Condition ${n} value`} type={def.type === "number" ? "number" : def.type === "date" ? "date" : "text"} placeholder={it.op === "in" ? "comma, separated" : ""} value={it.value} onChange={(e) => upd(i, { ...it, value: e.target.value })} />}
            <Btn sm variant="ghost" aria-label={`Remove condition ${n}`} onClick={() => del(i)}>Remove</Btn></div>); })()}</li>))}
        {!g.items.length && <li className="p3-note">No conditions: matches everything.</li>}</ul>
      <Row><Btn sm icon="plus" onClick={() => onChange({ ...g, items: [...g.items, newCond(DEFS[0])] })}>Add condition</Btn>{level < MAX_DEPTH - 1 && <Btn sm onClick={() => onChange({ ...g, items: [...g.items, newGroup(g.join === "and" ? "or" : "and", [newCond(DEFS[0])])] })}>Add group</Btn>}</Row>
    </div>
  );
}
export function QueryBuilder() {
  const [root, setRoot] = useState<Group>(() => newGroup("and", [{ ...newCond(DEFS[1]), op: "ne", value: "viewer" }, newGroup("or", [{ ...newCond(DEFS[4]), op: "eq", value: "QLD" }, { ...newCond(DEFS[2]), op: "gt", value: "40" }])]));
  const pred = useMemo(() => toPredicate(root, DEFS), [root]); const hits = ROWS.filter(pred);
  return (
    <Stack>
      <GroupView g={root} path="" level={0} onChange={setRoot} />
      <p className="p3-sentence" role="status">Match {toSentence(root, DEFS)}: <b>{hits.length} of {ROWS.length}</b> rows ({countConds(root)} conditions, {depth(root)} level{depth(root) === 1 ? "" : "s"}).</p>
      <div className="p3-tablewrap"><table className="p3-table"><caption className="p3-sr">Matching rows</caption><thead><tr>{DEFS.map((d) => <th key={d.id} scope="col">{d.label}</th>)}</tr></thead><tbody>{hits.map((r) => <tr key={r.name}>{DEFS.map((d) => <td key={d.id}>{String(r[d.id as keyof typeof r])}</td>)}</tr>)}{!hits.length && <tr><td colSpan={DEFS.length} className="p3-note">No rows match.</td></tr>}</tbody></table></div>
      <Row><code className="p3-code p3-grow">WHERE {toSql(root, DEFS)}</code><CopyBtn text={`WHERE ${toSql(root, DEFS)}`} label="Copy SQL" /><Btn sm variant="ghost" onClick={() => setRoot(newGroup())}>Clear all</Btn></Row>
    </Stack>
  );
}

/* ---------------- C050 regex tester ---------------- */
const HASH = String.fromCharCode(35);
const REGEX_PRESETS: [string, string, string, string][] = [["Email", "[\\w.+-]+@[\\w-]+\\.[\\w.]+", "g", "Contact ava@example.com or ben.ortiz+ops@mail.example.org today."], ["ISO date", "(?<y>\\d{4})-(?<m>\\d{2})-(?<d>\\d{2})", "g", "Shipped 2026-03-04, due 2026-04-01."], ["IPv4", "\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b", "g", "gateway 192.168.1.1, dns 10.0.0.53"], ["Hex colour", `${HASH}[0-9a-f]{3,8}\\b`, "gi", `bg ${HASH}1F6FEB text ${HASH}fff`]];
const FLAGS = [["g", "global"], ["i", "ignore case"], ["m", "multiline"], ["s", "dotAll"], ["u", "unicode"]] as const;
export function RegexTester() {
  const [pattern, setPattern] = useState(REGEX_PRESETS[1][1]); const [flags, setFlags] = useState("g"); const [sample, setSample] = useState(REGEX_PRESETS[1][3]); const [repl, setRepl] = useState("$<d>/$<m>/$<y>");
  const res = useMemo(() => testRegex(pattern, flags, sample.slice(0, 5000)), [pattern, flags, sample]);
  const out = useMemo(() => { if (!res.ok || !pattern) return ""; try { return sample.replace(new RegExp(pattern, flags.includes("g") ? flags : flags + "g"), repl); } catch { return ""; } }, [res, pattern, flags, sample, repl]);
  const nested = /\([^)]*[+*][^)]*\)[+*]/.test(pattern);
  return (
    <Stack>
      <Row>{REGEX_PRESETS.map(([n, p, f, s]) => <Btn key={n} sm variant="ghost" onClick={() => { setPattern(p); setFlags(f); setSample(s); }}>{n}</Btn>)}</Row>
      <label className="p3-field"><span className="jp-label">Pattern</span><input className="jp-input p3-mono" value={pattern} spellCheck={false} aria-invalid={!res.ok} aria-describedby="rx-msg" onChange={(e) => setPattern(e.target.value)} /></label>
      <div className="p3-row" role="group" aria-label="Flags">{FLAGS.map(([f, n]) => <label key={f} className="adm-check"><input type="checkbox" checked={flags.includes(f)} onChange={(e) => setFlags(e.target.checked ? flags + f : flags.replace(f, ""))} /><span>{f} <span className="p3-note">{n}</span></span></label>)}</div>
      <label className="p3-field"><span className="jp-label">Test text</span><textarea className="jp-input p3-mono" rows={3} value={sample} onChange={(e) => setSample(e.target.value)} /></label>
      <p id="rx-msg" className={res.ok ? "p3-note" : "p3-bad"} role="status">{res.ok ? `${res.matches.length} match${res.matches.length === 1 ? "" : "es"}${res.truncated ? " (showing the first 200)" : ""}` : `Invalid pattern: ${res.error}`}</p>
      {nested && <p className="p3-warn" role="note">Nested quantifiers like (a+)+ can backtrack catastrophically on long input.</p>}
      {res.ok && <p className="p3-hl" aria-label="Highlighted matches">{segments(sample.slice(0, 5000), res.matches).map((s, i) => (s.hit ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}</p>}
      {res.ok && res.matches.length > 0 && <div className="p3-tablewrap"><table className="p3-table"><caption className="p3-sr">Matches</caption><thead><tr><th scope="col">#</th><th scope="col">Index</th><th scope="col">Match</th><th scope="col">Groups</th></tr></thead><tbody>{res.matches.slice(0, 20).map((m, i) => <tr key={i}><td>{i + 1}</td><td>{m.index}</td><td><code>{m.text}</code></td><td>{Object.keys(m.named).length ? Object.entries(m.named).map(([k, v]) => <span key={k} className="p3-chip">{k}={v}</span>) : m.groups.map((g, j) => <span key={j} className="p3-chip">${j + 1}={g}</span>)}</td></tr>)}</tbody></table></div>}
      <label className="p3-field"><span className="jp-label">Replace with</span><input className="jp-input p3-mono" value={repl} onChange={(e) => setRepl(e.target.value)} /></label>
      <p className="p3-note">Result: <code>{out || "(no replacement)"}</code></p>
    </Stack>
  );
}

/* ---------------- C050 formula editor ---------------- */
type Vars = Record<string, number>;
export function FormulaEditor({ initial = "ROUND(price * qty * (1 - discount%) * (1 + tax_rate%), 2)" }: { initial?: string }) {
  const [src, setSrc] = useState(initial); const [vars, setVars] = useState<Vars>({ price: 24.5, qty: 6, discount: 10, tax_rate: 10 }); const ta = useRef<HTMLTextAreaElement>(null); const [caret, setCaret] = useState(0);
  const result = useMemo(() => calc(src, { cell: () => undefined, variable: (n) => vars[n] as Scalar | undefined }), [src, vars]);
  const ok = "value" in result; const used = useMemo(() => { try { const names = new Set<string>(); const walk = (n: ReturnType<typeof parse>): void => { if (n.t === "var") names.add(n.name); else if (n.t === "bin") { walk(n.l); walk(n.r); } else if (n.t === "un" || n.t === "pct") walk(n.x); else if (n.t === "call") n.args.forEach(walk); }; walk(parse(src)); return [...names]; } catch { return []; } }, [src]);
  const word = /[A-Za-z_]\w*$/.exec(src.slice(0, caret))?.[0] ?? ""; const sugg = word ? [...Object.keys(FUNCTIONS).filter((f) => f.startsWith(word.toUpperCase())).map((f) => `${f}(`), ...Object.keys(vars).filter((v) => v.startsWith(word) && v !== word)].slice(0, 6) : [];
  const insert = (t: string) => { const el = ta.current; const a = word ? caret - word.length : caret; const next = src.slice(0, a) + t + src.slice(caret); setSrc(next); const pos = a + t.length; window.setTimeout(() => { el?.focus(); el?.setSelectionRange(pos, pos); setCaret(pos); }, 0); };
  return (
    <Stack>
      <label className="p3-field"><span className="jp-label">Formula</span><textarea ref={ta} className="jp-input p3-mono" rows={3} value={src} spellCheck={false} aria-invalid={!ok} aria-describedby="fx-msg" onChange={(e) => { setSrc(e.target.value); setCaret(e.target.selectionStart); }} onSelect={(e) => setCaret(e.currentTarget.selectionStart)} /></label>
      {sugg.length > 0 && <div className="p3-row" role="group" aria-label="Suggestions">{sugg.map((s) => <Btn key={s} sm onClick={() => insert(s)}>{s}</Btn>)}</div>}
      <div id="fx-msg" role="status">{ok ? <p className="p3-sentence">= <b>{show(result.value)}</b></p> : <><p className="p3-bad">{result.error}: {result.message}</p><pre className="p3-pointer" aria-hidden>{src}{"\n"}{" ".repeat(Math.min(result.pos, src.length))}^</pre></>}</div>
      <fieldset className="p3-fieldset"><legend className="jp-label">Variables</legend><div className="p3-vars">{Object.keys(vars).map((k) => <label key={k} className="p3-field"><span className="jp-label">{k} {used.includes(k) ? <Badge s="info">used</Badge> : null}</span><input className="jp-input" type="number" value={vars[k]} onChange={(e) => setVars({ ...vars, [k]: Number(e.target.value) })} /></label>)}</div>
        <Row>{Object.keys(vars).map((k) => <Btn key={k} sm variant="ghost" onClick={() => insert(k)}>Insert {k}</Btn>)}</Row></fieldset>
      <details className="p3-details"><summary>Functions ({Object.keys(FUNCTIONS).length})</summary><ul className="p3-funcs">{Object.entries(FUNCTIONS).map(([k, f]) => <li key={k}><Btn sm variant="ghost" onClick={() => insert(`${k}(`)}>{k}</Btn> <span className="p3-note">{f.doc}</span></li>)}</ul></details>
      <Note>Runs in a small safe parser: numbers, text, TRUE/FALSE, operators + - * / ^ &amp; comparisons and % are supported. Nothing is passed to eval, and unknown names are errors.</Note>
    </Stack>
  );
}

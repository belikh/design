import { useEffect, useMemo, useRef, useState } from "react";
import "./views.css";
import { PageHeader, Panel, Badge, Btn, Avatar, Tabs, Menu, Modal, EmptyState, ConfirmDelete, Alert, Dot, type Status } from "@belikh/jupiter-ui/kit.tsx";
import { DiffViewer } from "@belikh/jupiter-ui/extra.tsx";
import { Segmented, TextInput, Select, Checkbox, Slider, Radio, Field, TextArea } from "@belikh/jupiter-ui/inputs.tsx";
import { Icon, Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { orders as ordersFx } from "../../data/fixtures.ts";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { ago, NOW0, useStored, when } from "./shared.tsx";
import { favStore, useFavs } from "./favs.ts";
import { getWs, useWs, wsActions, type TrashItem } from "./workspace.ts";
import { lbSeed, people, tagSeed, tiles, versionSeed } from "./data.ts";
import { childrenOf, deleteTag, descendants, findDuplicateGroups, mergeContacts, mergeTags, moveTag, ranked, renameTag, restoreVersion, type Contact, type Tag } from "./logic.ts";

const KIND_ICON: Record<TrashItem["kind"], string> = { file: "file", contact: "user", note: "book", ticket: "tag", task: "check" };

/* ============ A044 Trash, archive and restore ============ */
export function Trash() {
  const { toast } = usePrefs(); const ws = useWs(); const [tab, setTab] = useState("trash"); const [q, setQ] = useState(""); const [kind, setKind] = useState("all"); const [sel, setSel] = useState<Set<string>>(new Set()); const [purge, setPurge] = useState<string[] | null>(null); const [empty, setEmpty] = useState(false);
  const list = ws.trash.filter((t) => (kind === "all" || t.kind === kind) && t.label.toLowerCase().includes(q.toLowerCase()));
  const daysLeft = (t: TrashItem) => Math.max(0, 30 - Math.floor((NOW0 - t.deletedAt) / 1440));
  const restore = (ids: string[]) => { const items = ws.trash.filter((t) => ids.includes(t.id)); const msgs = ids.map((id) => wsActions.restore(id)); setSel(new Set()); toast({ kind: "ok", title: ids.length === 1 ? msgs[0] : `Restored ${ids.length} items`, undo: () => { items.forEach((i) => { if (i.kind === "file") wsActions.deleteNode((i.payload as { id: string }).id); if (i.kind === "contact") wsActions.deleteContact((i.payload as Contact).id); }); wsActions.undoTrash(items); } }); };
  const doPurge = (ids: string[]) => { const items = ws.trash.filter((t) => ids.includes(t.id)); wsActions.purge(ids); setSel(new Set()); setPurge(null); toast({ kind: "danger", title: `${ids.length} permanently deleted`, undo: () => wsActions.undoTrash(items) }); };
  return (
    <>
      <PageHeader title="Trash and archive" crumbs={["Views", "Trash"]} desc="Deleted items stay here for 30 days. Files you delete in the file manager and contacts you delete in Contacts really come back."
        tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "trash", label: "Trash", count: ws.trash.length }, { id: "archive", label: "Archive", count: ws.archive.length }]} />} actions={tab === "trash" ? <Btn className="adm-danger" variant="primary" disabled={!ws.trash.length} onClick={() => setEmpty(true)}>Empty trash…</Btn> : undefined} />
      {tab === "trash" ? <Panel flush>
        <div className="vw-trash__bar"><div style={{ width: 200 }}><TextInput value={q} onChange={setQ} placeholder="Search trash…" aria-label="Search trash" prefix={<Icon name="search" size={14} />} /></div><Select value={kind} onChange={setKind} aria-label="Kind" options={["all", "file", "contact", "note", "ticket", "task"]} /><span className="adm-spacer" />
          {sel.size > 0 && <><b>{sel.size} selected</b><Btn sm variant="primary" onClick={() => restore([...sel])}>Restore</Btn><Btn sm className="adm-danger" variant="primary" onClick={() => setPurge([...sel])}>Delete forever…</Btn></>}</div>
        {list.length === 0 ? <EmptyState spot="empty" title={ws.trash.length ? "Nothing matches" : "Trash is empty"}>{ws.trash.length ? "Adjust the search or filter." : "Deleted items will appear here."}</EmptyState> : <table className="jp-table"><thead><tr><th style={{ width: 36 }}><Checkbox checked={sel.size === list.length} indeterminate={sel.size > 0 && sel.size < list.length} onChange={(v) => setSel(v ? new Set(list.map((t) => t.id)) : new Set())} label={<span className="adm-sr">Select all</span>} /></th><th>Item</th><th>Kind</th><th>Deleted by</th><th>When</th><th className="jp-num">Purged in</th><th /></tr></thead><tbody>{list.map((t) => <tr key={t.id}><td><Checkbox checked={sel.has(t.id)} onChange={(v) => setSel((s) => { const n = new Set(s); v ? n.add(t.id) : n.delete(t.id); return n; })} label={<span className="adm-sr">Select {t.label}</span>} /></td><td><Icon name={KIND_ICON[t.kind]} size={15} /> <b>{t.label}</b></td><td><Badge>{t.kind}</Badge></td><td>{t.by}</td><td>{ago(t.deletedAt)}</td><td className="jp-num"><span style={{ color: daysLeft(t) < 7 ? "var(--jp-danger)" : undefined }}>{daysLeft(t)} d</span></td><td style={{ textAlign: "end" }}><Btn sm onClick={() => restore([t.id])}>Restore</Btn> <Btn sm variant="ghost" onClick={() => setPurge([t.id])}>Delete</Btn></td></tr>)}</tbody></table>}</Panel>
        : <Panel flush>{ws.archive.length ? <ul className="adm-list">{ws.archive.map((a) => <li key={a.id}><Icon name="folder" size={16} /><div className="adm-list__main"><b>{a.name}</b><span className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }}>{a.id} · {a.type}</span></div><Btn sm onClick={() => { wsActions.unarchive(a.id); toast({ kind: "ok", title: `${a.name} unarchived`, undo: () => wsActions.archiveAsset(a.id) }); }}>Unarchive</Btn></li>)}</ul> : <EmptyState spot="empty" title="Nothing archived">Archive assets from the Asset register and they appear here.</EmptyState>}</Panel>}
      <ConfirmDelete open={!!purge} what={purge && purge.length === 1 ? (ws.trash.find((t) => t.id === purge[0])?.label ?? "item") : `${purge?.length ?? 0} items`} onClose={() => setPurge(null)} onConfirm={() => purge && doPurge(purge)} />
      <ConfirmDelete open={empty} what="empty trash" onClose={() => setEmpty(false)} onConfirm={() => { doPurge(ws.trash.map((t) => t.id)); setEmpty(false); }} />
    </>
  );
}

/* ============ A045 Version history with restore + A052 Entity history across systems ============ */
const SYSTEMS = { git: "Git", ha: "Home Assistant", unifi: "UniFi", billing: "Billing", warehouse: "Warehouse" } as const;
type SysEv = { at: number; sys: keyof typeof SYSTEMS; text: string; who: string; kind: Status };
const SYS_EVENTS: SysEv[] = [[30, "git", "Merged PR #214: dock queue ranking", "Noah Smith", "ok"], [95, "unifi", "Firmware 8.4.1 applied to USW-24", "System", "info"], [210, "warehouse", "Dock 8 blocked: leveller repair", "Zoe Taylor", "warn"], [400, "ha", "Automation “Dock lights” fired 14 times", "System", "info"], [880, "billing", "Invoice INV-0042 paid ($3,091.55)", "System", "ok"], [1500, "git", "Tag v1.1.0 created", "Ava Nguyen", "ok"], [2300, "unifi", "New client 10.1.1.57 on IoT VLAN", "System", "info"], [3100, "warehouse", "SLA breach: truck H108 waited 61 min", "System", "danger"], [4200, "billing", "Refund issued ORD-10199 ($182.00)", "Zoe Chen", "warn"], [6000, "ha", "Presence sensor battery low (Garage)", "System", "warn"]].map(([m, sys, text, who, kind]) => ({ at: NOW0 - (m as number), sys: sys as SysEv["sys"], text: text as string, who: who as string, kind: kind as Status }));
export function History() {
  const { toast } = usePrefs(); const [tab, setTab] = useState("versions"); const [vs, setVs] = useStored("vw-versions", versionSeed); const [selId, setSelId] = useState(versionSeed[2].id); const [mode, setMode] = useState<"unified" | "split">("unified"); const [confirm, setConfirm] = useState(false);
  const [sys, setSys] = useState<string[]>([]); const [q, setQ] = useState("");
  const sel = vs.find((v) => v.id === selId) ?? vs[vs.length - 1]; const head = vs[vs.length - 1]; const prev = vs.find((v) => v.n === sel.n - 1);
  const evs = SYS_EVENTS.filter((e) => (!sys.length || sys.includes(e.sys)) && e.text.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader title="History" crumbs={["Views", "History"]} desc="Document versions with diffs and non-destructive restore, and a merged timeline of what happened to one entity across several systems." tabs={<Tabs value={tab} onChange={setTab} tabs={[{ id: "versions", label: "Version history", count: vs.length }, { id: "entity", label: "Entity history (cross-system)" }]} />} />
      {tab === "versions" && <div className="adm-grid adm-grid--12" style={{ gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)" }}>
        <Panel title="Versions" flush><ul className="adm-list">{[...vs].reverse().map((v) => <li key={v.id} onClick={() => setSelId(v.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSelId(v.id)} style={{ cursor: "pointer", background: sel.id === v.id ? "color-mix(in oklab, var(--jp-accent) 12%, transparent)" : undefined }}><Avatar name={v.by} size={26} /><div className="adm-list__main"><span><b>v{v.n}</b> {v.id === head.id && <Badge s="ok">current</Badge>} {v.restoredFrom && <Badge s="info">restored v{v.restoredFrom}</Badge>}</span><span style={{ fontSize: "var(--jp-fs-xs)" }}>{v.note}</span><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{v.by} · {v.at}</span></div></li>)}</ul></Panel>
        <Panel title={`v${sel.n} ${prev ? `vs v${prev.n}` : "(first version)"}`} actions={<><Segmented label="Diff mode" value={mode} onChange={setMode} options={[{ value: "unified", label: "Unified" }, { value: "split", label: "Split" }]} /><Btn variant="primary" disabled={sel.id === head.id} onClick={() => setConfirm(true)}>Restore this version</Btn></>}>
          <DiffViewer mode={mode} labels={[prev ? `v${prev.n}` : "empty", `v${sel.n}`]} before={prev?.body ?? ""} after={sel.body} /></Panel></div>}
      {tab === "entity" && <><div className="adm-row" style={{ marginBottom: 12 }}><b>jupiter-api</b><span className="jp-muted">across</span>{(Object.keys(SYSTEMS) as (keyof typeof SYSTEMS)[]).map((k) => <button key={k} className={`adm-pill ${sys.includes(k) ? "is-on" : ""}`} aria-pressed={sys.includes(k)} onClick={() => setSys((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}>{SYSTEMS[k]}</button>)}<div style={{ width: 200 }}><TextInput value={q} onChange={setQ} placeholder="Search events…" aria-label="Search events" /></div></div>
        <Panel>{evs.length ? <ol className="vw-timeline">{evs.map((e, i) => <li key={i} style={{ ["--vw-c" as string]: `var(--jp-${e.kind === "danger" ? "danger" : e.kind === "warn" ? "warn" : e.kind === "ok" ? "ok" : "info"})` }}><div className="adm-row"><Badge>{SYSTEMS[e.sys]}</Badge><b>{e.text}</b></div><div className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{e.who} · {ago(e.at)} · {when(e.at)}</div></li>)}</ol> : <EmptyState spot="no-results" title="No events">Adjust the system filter or search.</EmptyState>}</Panel></>}
      <Modal open={confirm} onClose={() => setConfirm(false)} title={`Restore v${sel.n}?`} size="sm" footer={<><Btn onClick={() => setConfirm(false)}>Cancel</Btn><Btn variant="primary" onClick={() => { const old = vs; setVs(restoreVersion(vs, sel.id, "Ava Nguyen", "2026-11-12 16:52")); setConfirm(false); toast({ kind: "ok", title: `Restored v${sel.n} as a new version`, undo: () => setVs(old) }); }}>Restore</Btn></>}><p>This creates a new version with the content of v{sel.n}. History is never rewritten.</p></Modal>
    </>
  );
}

/* ============ A046 Favourites, recents, pinned ============ */
const PAGES = [["/orders", "Orders", "database"], ["/analytics", "Analytics", "chart"], ["/wh/dock", "Dock board", "rack"], ["/ha", "Home Assistant panel", "home"], ["/logs", "Log viewer", "terminal"], ["/board", "Kanban board", "tag"], ["/views/slo", "SLO and error budget", "pulse"], ["/views/tickets", "Tickets", "tag"]] as const;
export function Favourites() {
  const f = useFavs(); const [q, setQ] = useState("");
  const isFav = (p: string) => f.favs.some((x) => x.path === p);
  const pinned = f.favs.filter((x) => f.pinned.includes(x.path)); const rest = f.favs.filter((x) => !f.pinned.includes(x.path));
  return (
    <>
      <PageHeader title="Favourites and recents" crumbs={["Views", "Favourites"]} desc="Star pages to favourite them, pin the ones you need most, and pick up where you left off. Stored in this browser." actions={<Btn variant="ghost" onClick={() => favStore.reset()}>Reset</Btn>} />
      <div className="adm-grid adm-grid--3">
        <Panel title={`Pinned (${pinned.length})`} flush>{pinned.length ? <ul className="adm-list">{pinned.map((p) => <li key={p.path}><Icon name="pin" size={15} /><a href={p.path} style={{ flex: 1 }}>{p.title}</a><Btn sm variant="ghost" onClick={() => favStore.togglePin(p.path)}>Unpin</Btn></li>)}</ul> : <EmptyState spot="empty" title="Nothing pinned">Pin a favourite to keep it on top.</EmptyState>}</Panel>
        <Panel title={`Favourites (${rest.length})`} flush>{rest.length ? <ul className="adm-list">{rest.map((p) => <li key={p.path}><Icon name={p.icon} size={15} /><a href={p.path} style={{ flex: 1 }}>{p.title}</a><Btn sm variant="ghost" onClick={() => favStore.togglePin(p.path)}>Pin</Btn><button className="adm-x" aria-label={`Remove ${p.title} from favourites`} onClick={() => favStore.toggleFav(p)}>×</button></li>)}</ul> : <EmptyState spot="empty" title="No other favourites">Star a page below.</EmptyState>}</Panel>
        <Panel title="Recents" actions={<Btn sm variant="ghost" onClick={() => favStore.clearRecents()}>Clear</Btn>} flush>{f.recents.length ? <ul className="adm-list">{f.recents.map((r) => <li key={r.path}><Icon name={r.icon} size={15} /><a href={r.path} style={{ flex: 1 }}>{r.title}</a><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{r.at < 100 ? "earlier" : ago(r.at / 60000)}</span></li>)}</ul> : <EmptyState spot="empty" title="No recents">Visit a page to see it here.</EmptyState>}</Panel>
      </div>
      <Panel className="adm-section" title="All pages"><div style={{ maxWidth: 300, marginBottom: 8 }}><TextInput value={q} onChange={setQ} placeholder="Filter pages…" aria-label="Filter pages" /></div><div className="adm-row">{PAGES.filter(([, t]) => t.toLowerCase().includes(q.toLowerCase())).map(([p, t, i]) => <button key={p} className={`adm-pill ${isFav(p) ? "is-on" : ""}`} aria-pressed={isFav(p)} onClick={() => favStore.toggleFav({ path: p, title: t, icon: i })}>{isFav(p) ? "★" : "☆"} {t}</button>)}</div></Panel>
    </>
  );
}

/* ============ A047 Duplicate detection and merge ============ */
export function Duplicates() {
  const { toast } = usePrefs(); const ws = useWs(); const [thr, setThr] = useState(86); const [dismissed, setDismissed] = useStored<string[]>("vw-dup-dismissed", []); const [prim, setPrim] = useState<Record<string, string>>({});
  const groups = useMemo(() => findDuplicateGroups(ws.contacts, thr / 100).filter((g) => !dismissed.includes([...g.ids].sort().join("|"))), [ws.contacts, thr, dismissed]);
  const FIELDS = ["name", "email", "phone", "company", "stage", "notes"] as const;
  const merge = (ids: string[], primaryId: string) => { const old = ws.contacts; const p = ws.contacts.find((c) => c.id === primaryId)!; const others = ws.contacts.filter((c) => ids.includes(c.id) && c.id !== primaryId); const merged = mergeContacts(p, others); wsActions.setContacts(ws.contacts.filter((c) => !others.some((o) => o.id === c.id)).map((c) => (c.id === primaryId ? merged : c))); toast({ kind: "ok", title: `Merged ${ids.length} contacts into ${merged.name}`, undo: () => wsActions.setContacts(old) }); };
  return (
    <>
      <PageHeader title="Duplicates" crumbs={["Views", "Duplicates"]} desc="Likely duplicate contacts, scored by email, phone and fuzzy name plus company. Pick the record to keep; blanks are filled from the others, and notes are joined." actions={<div style={{ width: 280 }}><Slider label="Match threshold" value={thr} onChange={setThr} min={70} max={99} fmt={(v) => `${v}% similar`} /></div>} />
      {groups.length === 0 ? <EmptyState spot="done" title="No duplicates found">{dismissed.length ? `${dismissed.length} dismissed.` : "Lower the threshold to see weaker matches."}{dismissed.length > 0 && <> <button className="adm-link" onClick={() => setDismissed([])}>Show dismissed</button></>}</EmptyState>
        : <div className="adm-stack">{groups.map((g) => { const key = [...g.ids].sort().join("|"); const cs = g.ids.map((id) => ws.contacts.find((c) => c.id === id)!).filter(Boolean); const pid = prim[key] ?? cs[0].id; return (
          <Panel key={key} title={`${cs.length} possible duplicates · ${Math.round(g.score * 100)}% match`} actions={<div className="adm-row">{g.reasons.map((r) => <Badge key={r} s="info">{r}</Badge>)}<Btn sm variant="ghost" onClick={() => setDismissed([...dismissed, key])}>Not duplicates</Btn><Btn sm variant="primary" onClick={() => merge(g.ids, pid)}>Merge into selected</Btn></div>}>
            <div className="vw-dup">{cs.map((c) => <div key={c.id} className={`vw-dup__card ${pid === c.id ? "is-primary" : ""}`}><Radio name={key} value={c.id} current={pid} onChange={(v) => setPrim({ ...prim, [key]: v })} label={<b>Keep this one</b>} /><dl className="adm-dl" style={{ gridTemplateColumns: "70px 1fr", marginTop: 8, fontSize: "var(--jp-fs-sm)" }}>{FIELDS.map((k) => { const differs = cs.some((o) => (o[k] ?? "") !== (c[k] ?? "")); return <><dt key={`${k}d`}>{k}</dt><dd key={k}>{differs ? <span className="vw-diffcell">{c[k] || "—"}</span> : (c[k] || "—")}</dd></>; })}</dl></div>)}</div></Panel>); })}</div>}
    </>
  );
}

/* ============ A048 Tag and taxonomy manager ============ */
export function Taxonomy() {
  const { toast } = usePrefs(); const [tags, setTags] = useStored<Tag[]>("vw-tags", tagSeed); const [sel, setSel] = useState<string>("b"); const [name, setName] = useState(""); const [err, setErr] = useState(""); const [mergeTo, setMergeTo] = useState(""); const [q, setQ] = useState(""); const [del, setDel] = useState(false);
  const cur = tags.find((t) => t.id === sel); useEffect(() => { setName(cur?.name ?? ""); setErr(""); setMergeTo(""); }, [sel, cur?.name]);
  const apply = (r: { tags: Tag[]; error?: string }, msg: string) => { if (r.error) { setErr(r.error); return; } const old = tags; setTags(r.tags); setErr(""); toast({ kind: "ok", title: msg, undo: () => setTags(old) }); };
  const total = (id: string): number => (tags.find((t) => t.id === id)?.uses ?? 0) + childrenOf(tags, id).reduce((a, c) => a + total(c.id), 0);
  const Node = ({ t, depth }: { t: Tag; depth: number }) => { const hit = !!q && t.name.toLowerCase().includes(q.toLowerCase()); return (<><li onClick={() => setSel(t.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setSel(t.id)} aria-selected={sel === t.id} style={{ paddingInlineStart: 16 + depth * 22, cursor: "pointer", background: sel === t.id ? "color-mix(in oklab, var(--jp-accent) 12%, transparent)" : undefined }}><Icon name="tag" size={14} /><span style={{ flex: 1, ...(hit ? { background: "color-mix(in oklab, var(--jp-warn) 35%, transparent)" } : {}) }}>{t.name}</span><Badge pill>{t.uses}</Badge><span className="jp-muted adm-num" style={{ fontSize: "var(--jp-fs-xs)" }} title="including children">Σ {total(t.id)}</span></li>{childrenOf(tags, t.id).map((c) => <Node key={c.id} t={c} depth={depth + 1} />)}</>); };
  const roots = childrenOf(tags, null); const similar = tags.filter((a, i) => tags.some((b, j) => j !== i && a.name.toLowerCase().replace(/[^a-z]/g, "") === b.name.toLowerCase().replace(/[^a-z]/g, "")) && a.uses < 3);
  return (
    <>
      <PageHeader title="Taxonomy" crumbs={["Views", "Taxonomy"]} desc="A nested tag tree with usage counts. Rename (no sibling clashes), move (no cycles), merge, add children, delete subtrees." actions={<div style={{ width: 200 }}><TextInput value={q} onChange={setQ} placeholder="Find a tag…" aria-label="Find tag" /></div>} />
      {similar.length > 0 && <div style={{ marginBottom: 12 }}><Alert s="info" title="Possible duplicate tags">{similar.map((s) => `“${s.name}”`).join(", ")} look like another tag. Select one and merge it.</Alert></div>}
      <div className="adm-grid adm-grid--21">
        <Panel title="Tags" flush actions={<Btn sm icon="plus" onClick={() => { const id = `t${Date.now()}`; setTags([...tags, { id, name: "New tag", parent: sel || null, uses: 0 }]); setSel(id); }}>Add child</Btn>}><ul className="adm-list" role="tree">{roots.map((t) => <Node key={t.id} t={t} depth={0} />)}</ul></Panel>
        <Panel title={cur ? `Edit “${cur.name}”` : "Edit"}>{cur ? <div className="adm-stack">
          <Field label="Name" error={err && err.includes("name") || err.includes("sibling") || err.includes("required") ? err : undefined}>{(id) => <div className="adm-row"><div style={{ flex: 1 }}><TextInput id={id} value={name} onChange={setName} /></div><Btn variant="primary" onClick={() => apply(renameTag(tags, cur.id, name), "Renamed")}>Rename</Btn></div>}</Field>
          <Field label="Parent" error={err.includes("under itself") ? err : undefined}>{(id) => <Select id={id} value={cur.parent ?? ""} onChange={(v) => apply(moveTag(tags, cur.id, v || null), "Moved")} options={[{ value: "", label: "(top level)" }, ...tags.filter((t) => t.id !== cur.id && !descendants(tags, cur.id).includes(t.id)).map((t) => ({ value: t.id, label: t.name }))]} />}</Field>
          <Field label="Merge into" hint="Usage counts add up; children move to the target" error={err.includes("Pick") || err.includes("merge") ? err : undefined}>{(id) => <div className="adm-row"><div style={{ flex: 1 }}><Select id={id} value={mergeTo} onChange={setMergeTo} options={[{ value: "", label: "Choose…" }, ...tags.filter((t) => t.id !== cur.id).map((t) => ({ value: t.id, label: t.name }))]} /></div><Btn disabled={!mergeTo} onClick={() => { apply(mergeTags(tags, cur.id, mergeTo), "Merged"); setSel(mergeTo); }}>Merge</Btn></div>}</Field>
          <div className="adm-row"><span className="jp-muted">{cur.uses} uses · {descendants(tags, cur.id).length} descendants</span><span className="adm-spacer" /><Btn className="adm-danger" variant="primary" onClick={() => setDel(true)}>Delete…</Btn></div></div> : <p className="jp-muted">Select a tag.</p>}</Panel>
      </div>
      <ConfirmDelete open={del} what={cur?.name ?? ""} onClose={() => setDel(false)} onConfirm={() => { if (cur) apply({ tags: deleteTag(tags, cur.id) }, `Deleted ${cur.name} and its children`); setDel(false); setSel(""); }} />
    </>
  );
}

/* ============ A049 Saved searches and smart collections ============ */
type Saved = { id: string; name: string; q: string; status: string; min: number; smart: boolean };
export function SavedSearches() {
  const { toast } = usePrefs(); const [saved, setSaved] = useStored<Saved[]>("vw-saved", [{ id: "s1", name: "Failed orders", q: "", status: "failed", min: 0, smart: true }, { id: "s2", name: "Big pending", q: "", status: "pending", min: 1000, smart: true }, { id: "s3", name: "Ava's orders", q: "ava", status: "all", min: 0, smart: false }]);
  const [q, setQ] = useState(""); const [status, setStatus] = useState("all"); const [min, setMin] = useState(0); const [active, setActive] = useState<string | null>(null); const [nm, setNm] = useState("");
  const run = (s: { q: string; status: string; min: number }) => ordersFx.filter((o) => (s.status === "all" || o.status === s.status) && o.amount >= s.min && (o.customer + o.id).toLowerCase().includes(s.q.toLowerCase()));
  const res = run({ q, status, min }); const apply = (s: Saved) => { setQ(s.q); setStatus(s.status); setMin(s.min); setActive(s.id); };
  return (
    <>
      <PageHeader title="Saved searches" crumbs={["Views", "Saved"]} desc="Save a query as a search, or as a smart collection whose count stays live. Click one to run it." />
      <div className="adm-grid adm-grid--12" style={{ gridTemplateColumns: "minmax(0, 320px) minmax(0, 1fr)" }}>
        <Panel title="Saved" flush><ul className="adm-list">{saved.map((s) => <li key={s.id} onClick={() => apply(s)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && apply(s)} style={{ cursor: "pointer", background: active === s.id ? "color-mix(in oklab, var(--jp-accent) 12%, transparent)" : undefined }}><Icon name={s.smart ? "sparkle" : "search"} size={15} /><div className="adm-list__main"><b>{s.name}</b><span className="jp-muted" style={{ fontSize: "var(--jp-fs-xs)" }}>{[s.q && `“${s.q}”`, s.status !== "all" && s.status, s.min && `≥ $${s.min}`].filter(Boolean).join(" · ") || "everything"}</span></div>{s.smart && <Badge s="info">{run(s).length}</Badge>}<Menu label="•••" items={[{ label: s.smart ? "Make a plain search" : "Make smart collection", onSelect: () => setSaved(saved.map((x) => (x.id === s.id ? { ...x, smart: !x.smart } : x))) }, { label: "Copy link", onSelect: () => { void navigator.clipboard?.writeText(`${location.origin}/p2/views/saved-searches?q=${encodeURIComponent(s.q)}&status=${s.status}`); toast({ kind: "ok", title: "Link copied" }); } }, { label: "Delete", danger: true, onSelect: () => { const old = saved; setSaved(saved.filter((x) => x.id !== s.id)); toast({ kind: "warn", title: `Deleted “${s.name}”`, undo: () => setSaved(old) }); } }]} /></li>)}</ul></Panel>
        <div className="adm-stack"><Panel title="Query"><div className="adm-row"><div style={{ width: 200 }}><TextInput value={q} onChange={(v) => { setQ(v); setActive(null); }} placeholder="Customer or order id…" aria-label="Query" prefix={<Icon name="search" size={14} />} /></div><Select value={status} onChange={(v) => { setStatus(v); setActive(null); }} aria-label="Status" options={["all", "paid", "pending", "refunded", "failed"]} /><Select value={String(min)} onChange={(v) => { setMin(Number(v)); setActive(null); }} aria-label="Minimum amount" options={[{ value: "0", label: "any amount" }, { value: "500", label: "≥ $500" }, { value: "1000", label: "≥ $1,000" }]} />
          <span className="adm-spacer" /><div style={{ width: 180 }}><TextInput value={nm} onChange={setNm} placeholder="Name to save…" aria-label="Save as" /></div><Btn variant="primary" disabled={!nm.trim()} onClick={() => { const s: Saved = { id: `s${Date.now()}`, name: nm.trim(), q, status, min, smart: false }; setSaved([...saved, s]); setNm(""); setActive(s.id); toast({ kind: "ok", title: `Saved “${s.name}”` }); }}>Save search</Btn></div></Panel>
          <Panel title={`${res.length} results`} flush>{res.length ? <table className="jp-table"><thead><tr><th>Order</th><th>Customer</th><th>Status</th><th className="jp-num">Amount</th></tr></thead><tbody>{res.slice(0, 10).map((o) => <tr key={o.id}><td className="adm-num">{o.id}</td><td>{o.customer}</td><td><Badge s={o.status === "paid" ? "ok" : o.status === "failed" ? "danger" : "warn"}>{o.status}</Badge></td><td className="jp-num">${o.amount.toFixed(2)}</td></tr>)}</tbody></table> : <EmptyState spot="no-results" title="No results">Loosen the query.</EmptyState>}</Panel></div>
      </div>
    </>
  );
}

/* ============ A050 Leaderboard ============ */
export function Leaderboard() {
  const [period, setPeriod] = useState<"week" | "month" | "all">("month"); const [q, setQ] = useState("");
  const rows = useMemo(() => ranked(lbSeed.map((r, i) => ({ ...r, score: period === "all" ? r.score * 4 + i * 3 : period === "week" ? Math.round(r.score / 4) : r.score, prev: period === "all" ? r.prev * 4 : period === "week" ? Math.round(r.prev / 4) : r.prev }))), [period]);
  const max = Math.max(...rows.map((r) => r.score)); const shown = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())); const top = rows.slice(0, 3);
  return (
    <>
      <PageHeader title="Leaderboard" crumbs={["Views", "Leaderboard"]} desc="Ranks with ties handled and movement since the previous period. “Me” is highlighted." actions={<><div style={{ width: 180 }}><TextInput value={q} onChange={setQ} placeholder="Find a person…" aria-label="Find person" /></div><Segmented label="Period" value={period} onChange={setPeriod} options={[{ value: "week", label: "Week" }, { value: "month", label: "Month" }, { value: "all", label: "All time" }]} /></>} />
      <div className="vw-podium" aria-label="Top three">{[top[1], top[0], top[2]].map((r, i) => r && <div key={r.id} className={i === 1 ? "p1" : "p2"}><Avatar name={r.name} size={i === 1 ? 52 : 40} /><div><b>{r.name.split(" ")[0]}</b></div><div className="vw-rank adm-num">{r.rank}</div><span className="jp-muted adm-num">{r.score}</span></div>)}</div>
      <Panel flush>{shown.length ? shown.map((r) => (
        <div key={r.id} className="vw-lb" style={r.name === people[0] ? { background: "color-mix(in oklab, var(--jp-accent) 10%, transparent)" } : undefined}><span className="vw-rank adm-num">{r.rank}</span><div><div className="adm-row"><Avatar name={r.name} size={24} /><b>{r.name}</b>{r.name === people[0] && <Badge s="info">me</Badge>}</div><div className="vw-lb__bar" style={{ width: `${(r.score / max) * 100}%`, marginTop: 4 }} /></div><b className="adm-num">{r.score}</b><span className={r.delta > 0 ? "jp-delta--up" : r.delta < 0 ? "jp-delta--down" : "jp-muted"} title="Places gained or lost vs previous period">{r.delta === 0 ? "—" : Math.abs(r.delta)}</span></div>)) : <EmptyState spot="no-results" title="No one matches">Try another name.</EmptyState>}</Panel>
    </>
  );
}

/* ============ A051 Live tile wall ============ */
export function TileWall() {
  const { toast } = usePrefs(); const [cols, setCols] = useState("auto"); const [alerts, setAlerts] = useState<Set<string>>(new Set(["t4"])); const [big, setBig] = useState<string | null>(null); const [tick, setTick] = useState(0); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const i = setInterval(() => setTick((t) => t + 1), 1000); return () => clearInterval(i); }, []);
  const clock = new Date(Date.UTC(2026, 10, 12, 16, 52, tick % 60)).toISOString().slice(11, 19); const order = [...tiles].sort((a, b) => Number(alerts.has(b.id)) - Number(alerts.has(a.id)));
  const T = ({ t }: { t: (typeof tiles)[0] }) => { const al = alerts.has(t.id); return (
    <div className={`vw-tile ${al ? "is-alert" : ""} ${t.st === "off" ? "is-off" : ""}`}><button style={{ all: "unset", cursor: "zoom-in", display: "grid", placeItems: "center", width: "100%", height: "100%" }} onClick={() => setBig(t.id)} aria-label={`Enlarge ${t.name}`}>{t.st === "off" ? <span className="jp-muted">no signal</span> : <Spot name={t.spot} size={96} />}</button><span className="vw-scan" />{t.st !== "off" && <span className="vw-tile__live"><Badge s={al ? "danger" : "ok"}>{al ? "motion" : "live"}</Badge></span>}<div className="vw-tile__bar"><span>{t.name}</span><span>{t.kind} · {clock}</span></div></div>); };
  return (
    <>
      <PageHeader title="Tile wall" crumbs={["Views", "Tile wall"]} desc="Cameras and screens on one wall. Tiles with an alert jump to the front; click one to enlarge. Feeds are illustrations." actions={<><Segmented label="Layout" value={cols} onChange={setCols} options={[{ value: "auto", label: "Auto" }, { value: "2", label: "2 up" }]} /><Btn icon="monitor" onClick={() => void ref.current?.requestFullscreen?.()}>Full screen</Btn><Btn onClick={() => { const id = tiles[Math.floor(Math.random() * tiles.length)].id; setAlerts((a) => new Set(a).add(id)); toast({ kind: "danger", title: "Motion detected", body: tiles.find((t) => t.id === id)?.name }); }}>Simulate alert</Btn><Btn variant="ghost" onClick={() => setAlerts(new Set())} disabled={!alerts.size}>Clear alerts</Btn></>} />
      <div ref={ref} className={`vw-wall ${cols === "2" ? "vw-wall--big" : ""}`} style={{ background: "var(--jp-bg)" }}>{order.map((t) => <T key={t.id} t={t} />)}</div>
      <Modal open={!!big} onClose={() => setBig(null)} title={tiles.find((t) => t.id === big)?.name ?? ""} size="lg" footer={<Btn onClick={() => setBig(null)}>Close</Btn>}>{big && <T t={tiles.find((t) => t.id === big)!} />}</Modal>
    </>
  );
}
void Dot; void TextArea; void getWs;

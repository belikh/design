import { useMemo, useState } from "react";
import { PageHeader, Panel, Btn, Badge, Drawer, CodeBlock } from "@belikh/jupiter-ui/kit.tsx";
import { Select, TextInput } from "@belikh/jupiter-ui/inputs.tsx";
import { DataTable, type Col } from "@belikh/jupiter-ui/DataTable.tsx";
import { StatTile } from "@belikh/jupiter-ui/Charts.tsx";
import { usePrefs } from "@belikh/jupiter-ui/store.tsx";
import { BUCKETS, crumbs, listPrefix, monthlyCost, type Entry, type Obj, type StorageClass } from "./lib/storage.ts";
import { fmtBytes } from "./common.ts";
import "./devtools.css";

export function ObjectStorage() {
  const { toast } = usePrefs();
  const [store, setStore] = useState<Record<string, Obj[]>>(BUCKETS); const [bucket, setBucket] = useState("media-prod"); const [prefix, setPrefix] = useState(""); const [q, setQ] = useState(""); const [open, setOpen] = useState<string | null>(null); const [n, setN] = useState(1);
  const objs = store[bucket]; const entries = useMemo(() => listPrefix(objs, prefix, q), [objs, prefix, q]);
  const total = objs.reduce((s, o) => s + o.size, 0); const detail = objs.find((o) => o.key === open);
  const setObjs = (f: (o: Obj[]) => Obj[]) => setStore((s) => ({ ...s, [bucket]: f(s[bucket]) }));
  const removeKeys = (keys: string[]) => {
    const old = store; const hit = (k: string) => keys.some((x) => (x.endsWith("/") ? k.startsWith(x) : k === x)); const count = objs.filter((o) => hit(o.key)).length;
    setObjs((o) => o.filter((x) => !hit(x.key))); toast({ kind: "warn", title: `Deleted ${count} object${count === 1 ? "" : "s"}`, undo: () => setStore(old) });
  };
  const upload = () => { const key = `${prefix}upload-${n}.txt`; setN(n + 1); setObjs((o) => [...o, { key, size: 2048 * n, modified: "2026-11-12", type: "text/plain", cls: "standard", etag: "00c0ffee" }]); toast({ kind: "ok", title: "Uploaded", body: `${bucket}/${key}` }); };
  const changeClass = (key: string, cls: StorageClass) => setObjs((o) => o.map((x) => (x.key === key ? { ...x, cls } : x)));
  const cols: Col<Entry>[] = [
    { key: "name", header: "Name", width: 260, render: (r) => r.kind === "folder" ? <button className="lab-link" onClick={() => { setPrefix(r.key); setQ(""); }} aria-label={`Open folder ${r.name}`}>{r.name}/</button> : <button className="lab-link" onClick={() => setOpen(r.key)} aria-label={`Inspect ${r.name}`}>{r.name}</button> },
    { key: "size", header: "Size", width: 100, align: "right", render: (r) => fmtBytes(r.size), value: (r) => r.size },
    { key: "type", header: "Type", width: 150, filter: "select" }, { key: "modified", header: "Modified", width: 110 },
    { key: "cls", header: "Class", width: 130, editor: { type: "select", options: [{ value: "standard", label: "standard" }, { value: "infrequent", label: "infrequent" }, { value: "archive", label: "archive" }] }, locked: (r) => (r.kind === "folder" ? "Folders have no storage class" : undefined), render: (r) => (r.kind === "folder" ? <span className="jp-muted">{r.count} objects</span> : <Badge s={r.cls === "archive" ? "info" : undefined}>{r.cls}</Badge>) },
  ];
  return (
    <>
      <PageHeader title="Object storage" crumbs={["Data", "Object storage"]} desc="Browse buckets by prefix, search, change storage class in place, upload and remove objects (with undo)." actions={<Btn variant="primary" icon="upload" onClick={upload}>Upload file</Btn>} />
      <div className="adm-grid adm-grid--3"><StatTile label="Objects" value={String(objs.length)} /><StatTile label="Stored" value={fmtBytes(total)} /><StatTile label="Estimated cost" value={`$${monthlyCost(objs).toFixed(2)}/mo`} sub="by storage class" /></div>
      <div className="lab-gap" />
      <Panel title="Browser" flush>
        <div className="lab-toolbar">
          <label className="adm-row">Bucket <Select aria-label="Bucket" value={bucket} onChange={(v) => { setBucket(v); setPrefix(""); setQ(""); }} options={Object.keys(store)} /></label>
          <nav aria-label="Path" className="lab-crumbs"><button onClick={() => setPrefix("")} aria-current={prefix === "" ? "page" : undefined}>{bucket}</button>{crumbs(prefix).map((c) => <span key={c.prefix}> / <button onClick={() => setPrefix(c.prefix)} aria-current={c.prefix === prefix ? "page" : undefined}>{c.name}</button></span>)}</nav>
          <TextInput aria-label="Search this folder" placeholder="Search this folder…" value={q} onChange={setQ} />
        </div>
        <DataTable<Entry> key={`${bucket}/${prefix}`} rows={entries} cols={cols} ariaLabel="Objects" exportName={`${bucket}-listing`} pageSize={10}
          onCommit={(r, key, v) => { if (key === "cls" && r.kind === "object") changeClass(r.key, v as StorageClass); }}
          bulk={[{ label: "Delete selected", danger: true, onRun: (ids) => removeKeys(ids) }]} rowActions={(r) => [{ label: r.kind === "folder" ? "Open" : "Inspect", onSelect: () => (r.kind === "folder" ? setPrefix(r.key) : setOpen(r.key)) }, { label: "Delete", danger: true, onSelect: () => removeKeys([r.key]) }]} />
      </Panel>
      <Drawer open={!!detail} onClose={() => setOpen(null)} title={detail ? detail.key.split("/").pop()! : "Object"}>
        {detail && <div className="adm-stack"><dl className="lab-dl"><dt>Key</dt><dd className="adm-num">{detail.key}</dd><dt>Size</dt><dd>{fmtBytes(detail.size)}</dd><dt>Type</dt><dd>{detail.type}</dd><dt>Modified</dt><dd>{detail.modified}</dd><dt>Class</dt><dd>{detail.cls}</dd><dt>ETag</dt><dd className="adm-num">{detail.etag}</dd></dl>
          <h3>Signed URL (expires in 15 minutes)</h3><CodeBlock code={`https://${bucket}.storage.example.test/${detail.key}?sig=${detail.etag}&exp=900`} label="signed url" />
          <Btn variant="ghost" onClick={() => { removeKeys([detail.key]); setOpen(null); }}>Delete object</Btn></div>}
      </Drawer>
    </>
  );
}

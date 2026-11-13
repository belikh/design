import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Suspense, type ReactNode } from "react";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { routes } from "./index.tsx";
import { WorkflowBuilder } from "./WorkflowBuilder.tsx";
import { Notebook } from "./Notebook.tsx";
import { WebhookLog } from "./WebhookLog.tsx";
import { DbBrowser } from "./DbBrowser.tsx";
import { ObjectStorage } from "./ObjectStorage.tsx";
import { FlowViewer } from "./FlowViewer.tsx";
import { RemoteShell } from "./RemoteShell.tsx";
import { FirmwareRollout } from "./FirmwareRollout.tsx";
import { ImageAnnotator } from "./ImageAnnotator.tsx";
import { SEED, addEdge, hasCycle, simulate, validate } from "./lib/workflow.ts";
import { blocks, inline, runCell, TABLES } from "./lib/notebook.ts";
import { replayResult, seed as webhookSeed } from "./lib/webhooks.ts";
import { referencing, seedDb, validateValue } from "./lib/db.ts";
import { BUCKETS, crumbs, listPrefix } from "./lib/storage.ts";
import { FLOWS, applyFilters, sankey } from "./lib/flows.ts";
import { SEED_RECORDINGS } from "./lib/sessions.ts";
import { duration } from "./lib/asciicast.ts";
import { renderAt } from "./lib/term.ts";
import { undo, redo } from "@belikh/jupiter-ui/undo.ts";
import { attempted, initRollout, rollback, startNext, tick } from "./lib/rollout.ts";

const toasts = () => screen.getByRole("region", { name: "Notifications" });
const wrap = (ui: ReactNode) => render(<PrefsProvider><MemoryRouter><Suspense fallback={null}>{ui}</Suspense></MemoryRouter></PrefsProvider>);

describe("devtools routes", () => {
  it("registers nine unique routes", () => {
    expect(routes).toHaveLength(9); expect(new Set(routes.map((r) => r.path)).size).toBe(9);
    for (const r of routes) { expect(r.path.startsWith("/")).toBe(true); }
  });
});

describe("workflow lib", () => {
  it("seed graph is valid and the dry run follows the chosen branch", () => {
    expect(validate(SEED).filter((i) => i.level === "error")).toEqual([]);
    expect(simulate(SEED)).toContain("n3"); const no = { ...SEED, nodes: SEED.nodes.map((n) => (n.id === "n2" ? { ...n, outcome: "no" as const } : n)) };
    expect(simulate(no)).not.toContain("n3");
  });
  it("detects loops, missing branches and bad connections", () => {
    const loop = { ...SEED, edges: [...SEED.edges, { id: "x", from: "n6", to: "n5" }] }; expect(hasCycle(loop)).toBe(true); expect(validate(loop).some((i) => /loop/.test(i.text))).toBe(true);
    expect(validate({ ...SEED, edges: SEED.edges.filter((e) => e.id !== "e3") }).some((i) => /no” branch/.test(i.text))).toBe(true);
    expect(addEdge(SEED, "n7", "n1").error).toBeTruthy(); expect(addEdge(SEED, "n1", "n1").error).toBeTruthy(); expect(addEdge(SEED, "n5", "n7").error).toMatch(/Only conditions/);
  });
});
describe("workflow page", () => {
  it("moves a step with the keyboard and removes it with Delete", () => {
    wrap(<WorkflowBuilder />);
    const step = screen.getByRole("button", { name: /^Action: Request approval/ }); fireEvent.focus(step); fireEvent.keyDown(step, { key: "ArrowRight", shiftKey: true });
    expect(screen.getByText("Position").nextSibling?.textContent).toBe("480, 60");
    const before = screen.getAllByRole("row").length; fireEvent.keyDown(step, { key: "Delete" });
    expect(screen.queryByRole("button", { name: /^Action: Request approval/ })).toBeNull(); expect(screen.getAllByRole("row").length).toBeLessThan(before);
    expect(toasts()).toHaveTextContent(/Deleted/);
  });
  it("connects through the inspector and runs a dry run", () => {
    wrap(<WorkflowBuilder />); fireEvent.click(screen.getByRole("button", { name: /Delete step/ })); fireEvent.click(screen.getByRole("button", { name: /^Trigger: Webhook received/ }));
    fireEvent.click(screen.getByRole("button", { name: "Dry run" })); expect(screen.getByText(/Dry run: Webhook received/)).toBeInTheDocument();
  });
});

describe("notebook", () => {
  it("parses markdown subset and runs cells", () => {
    expect(inline("a **b** `c`").map((t) => t.t)).toEqual(["s", "b", "s", "c"]); expect(blocks("# T\n- x\ntext").map((b) => b.k)).toEqual(["h1", "li", "p"]);
    expect(runCell({ id: "q", kind: "query", source: "select count(*) as n from orders" }).result?.rows[0].n).toBe(TABLES.orders.length);
    expect(runCell({ id: "q", kind: "query", source: "select from" }).error).toBeTruthy();
  });
  it("shows query results and a chart, and reports SQL errors", () => {
    wrap(<Notebook />); expect(screen.getByRole("columnheader", { name: "revenue" })).toBeInTheDocument(); expect(screen.getAllByRole("img").length + screen.getAllByText(/Revenue by region/).length).toBeGreaterThan(0);
    const sql = screen.getByLabelText("Query cell 2 SQL"); fireEvent.change(sql, { target: { value: "select nope from" } }); fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(screen.getByText("Query failed")).toBeInTheDocument();
  });
  it("adds, moves and deletes cells with undo", () => {
    wrap(<Notebook />); fireEvent.click(screen.getByRole("button", { name: "Text" })); expect(screen.getAllByRole("listitem", { name: /cell/ })).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Move cell 4 up" })); fireEvent.click(screen.getByRole("button", { name: "Delete cell 3" }));
    expect(screen.getAllByRole("listitem", { name: /cell/ })).toHaveLength(3); fireEvent.click(within(toasts()).getByRole("button", { name: /undo/i }));
    expect(screen.getAllByRole("listitem", { name: /cell/ })).toHaveLength(4);
  });
});

describe("webhooks", () => {
  it("replay fails against an unhealthy endpoint and succeeds against a healthy one", () => {
    const d = webhookSeed().find((x) => x.outcome === "failed")!; expect(replayResult(d, false, 1).outcome).toBe("failed"); const ok = replayResult(d, true, 2); expect(ok.outcome).toBe("delivered"); expect(ok.replayOf).toBe(d.id); expect(ok.attempt).toBe(d.attempt + 1);
  });
  it("replays a delivery from the row menu and adds a row", async () => {
    wrap(<WebhookLog />); const menu = await screen.findByRole("button", { name: "Actions for dl_036" }); fireEvent.click(menu);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Replay" })); await waitFor(() => expect(toasts()).toHaveTextContent(/Replayed 1 delivery/));
    await waitFor(() => expect(screen.getAllByText("dl_r1").length).toBeGreaterThan(0));
  });
});

describe("database browser", () => {
  it("validates foreign keys and types", () => {
    const db = seedDb(); const orders = db.find((t) => t.name === "orders")!; const fk = orders.cols.find((c) => c.name === "customer_id")!;
    expect(validateValue(db, "orders", fk, 3)).toBeNull(); expect(validateValue(db, "orders", fk, 999)).toMatch(/foreign key/); expect(validateValue(db, "orders", orders.cols[0], 100)).toMatch(/unique/); expect(validateValue(db, "orders", orders.cols[3], "")).toMatch(/empty/);
    expect(referencing(db, "customers")).toEqual([{ table: "orders", col: "customer_id", refCol: "id" }]);
  });
  it("follows a foreign key link to the referenced row", async () => {
    wrap(<DbBrowser />); fireEvent.click((await screen.findAllByRole("button", { name: /^Open customers \d/ }))[0]);
    expect(await screen.findByText(/id = /)).toBeInTheDocument(); expect(screen.getByRole("button", { name: /^customers\d/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Structure/ })); expect(screen.getByText(/CREATE TABLE customers/)).toBeInTheDocument();
  });
});

describe("object storage", () => {
  it("lists prefixes like a delimiter listing", () => {
    const e = listPrefix(BUCKETS["media-prod"], ""); expect(e.filter((x) => x.kind === "folder").map((x) => x.name).sort()).toEqual(["docs", "photos", "video"]); expect(e.some((x) => x.name === "README.txt")).toBe(true);
    expect(listPrefix(BUCKETS["media-prod"], "photos/2026/").map((x) => x.name).sort()).toEqual(["hobart", "perth"]); expect(crumbs("a/b/")).toEqual([{ name: "a", prefix: "a/" }, { name: "b", prefix: "a/b/" }]); expect(listPrefix(BUCKETS["media-prod"], "", "read")).toHaveLength(1);
  });
  it("navigates into a folder, uploads and deletes with undo", async () => {
    wrap(<ObjectStorage />); fireEvent.click(await screen.findByRole("button", { name: "Open folder docs" })); expect(screen.getByRole("button", { name: "Inspect handbook.pdf" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Upload file" })); expect(await screen.findByRole("button", { name: "Inspect upload-1.txt" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Actions for docs/upload-1.txt" })); fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" })); expect(screen.queryByRole("button", { name: "Inspect upload-1.txt" })).toBeNull();
    fireEvent.click(within(toasts()).getByRole("button", { name: /undo/i })); expect(await screen.findByRole("button", { name: "Inspect upload-1.txt" })).toBeInTheDocument();
  });
});

describe("network flows", () => {
  it("lays out a sankey whose link widths sum to node heights and filters", () => {
    const l = sankey(FLOWS, 360); const lt = l.left.reduce((s, n) => s + n.total, 0), lk = l.links.reduce((s, k) => s + k.bytes, 0); expect(lt).toBe(lk);
    for (const n of l.left) { const ws = l.links.filter((k) => k.src === n.name).reduce((s, k) => s + k.w, 0); expect(ws).toBeLessThanOrEqual(n.h + l.links.length); }
    expect(applyFilters(FLOWS, { proto: "udp", minBytes: 0, q: "", action: "all" }).every((f) => f.proto === "udp")).toBe(true); expect(applyFilters(FLOWS, { proto: "all", minBytes: 0, q: "", action: "block" }).every((f) => f.dst.startsWith("ads."))).toBe(true);
  });
  it("focuses a device and filters by protocol", () => {
    wrap(<FlowViewer />); const all = screen.getAllByRole("row").length; fireEvent.click(screen.getByRole("button", { name: "ICMP" })); expect(screen.getAllByRole("row").length).toBeLessThan(all);
    fireEvent.click(screen.getByRole("button", { name: /^gateway \(10\.0\.0\.1\)/ })); expect(screen.getByText(/Flows for gateway/)).toBeInTheDocument();
  });
});

describe("remote shell", () => {
  it("seed recordings replay to a terminal screen", () => {
    const r = SEED_RECORDINGS[0]; expect(duration(r)).toBeGreaterThan(5000); expect(renderAt(r.events, 0)).toContain("$"); expect(renderAt(r.events, duration(r))).toContain("admin"); expect(renderAt(r.events, 2000).length).toBeLessThan(renderAt(r.events, duration(r)).length);
  });
  it("records a live session and saves it when it ends", async () => {
    wrap(<RemoteShell />); fireEvent.click(screen.getAllByRole("button", { name: /Connect/ })[0]);
    const input = await screen.findByLabelText("Command"); await waitFor(() => expect(input).not.toBeDisabled()); fireEvent.change(input, { target: { value: "whoami | grep adm" } }); fireEvent.submit(input.closest("form")!);
    expect(screen.getByLabelText(/Terminal on admin@edge-gw/)).toHaveTextContent(/\$ whoami \| grep adm\s+admin/); fireEvent.click(screen.getByRole("button", { name: "End and save" }));
    fireEvent.click(screen.getByRole("tab", { name: /Recordings/ })); expect(screen.getAllByRole("button", { name: /Delete recording/ })).toHaveLength(3);
  });
  it("types straight into the terminal: history, Ctrl+C and Escape", async () => {
    wrap(<RemoteShell />); fireEvent.click(screen.getAllByRole("button", { name: /Connect/ })[0]); const term = await screen.findByRole("application", { name: /Terminal on/ });
    const type = (s: string) => { for (const ch of s) fireEvent.keyDown(term, { key: ch }); };
    type("pwd"); fireEvent.keyDown(term, { key: "Enter" }); expect(term).toHaveTextContent("/home/admin"); fireEvent.keyDown(term, { key: "ArrowUp" }); expect(term.textContent).toMatch(/\$ pwd$/);
    fireEvent.keyDown(term, { key: "c", ctrlKey: true }); expect(term.textContent).toContain("^C"); fireEvent.keyDown(term, { key: "Escape" }); expect(screen.getByLabelText("Command")).toHaveFocus();
  });
  it("refuses to connect a WebSocket without a valid URL", () => {
    wrap(<RemoteShell />); fireEvent.click(screen.getByRole("button", { name: "WebSocket" })); expect(screen.getByRole("button", { name: /^Connect/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/WebSocket URL/), { target: { value: "wss://u:p@x.example/pty" } }); expect(screen.getByRole("button", { name: /^Connect/ })).toBeDisabled(); expect(screen.getByText(/credentials are not accepted/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/WebSocket URL/), { target: { value: "ws://127.0.0.1:9/pty" } }); expect(screen.getByRole("button", { name: /^Connect/ })).toBeEnabled(); expect(screen.getByText("Unencrypted connection")).toBeInTheDocument();
  });
  it("scrubbing the replay changes the screen and the summary shows sizes", () => {
    wrap(<RemoteShell />); fireEvent.click(screen.getByRole("tab", { name: /Recordings/ })); const scr = screen.getByLabelText(/Replay of session/); const before = scr.textContent;
    fireEvent.change(screen.getByRole("slider", { name: /Position/ }), { target: { value: String(duration(SEED_RECORDINGS[0])) } }); expect(scr.textContent!.length).toBeGreaterThan(before!.length);
    expect(screen.getByLabelText("Recording summary")).toHaveTextContent(/as \.cast/);
  });
  it("imports a .cast file and rejects a bad one", async () => {
    wrap(<RemoteShell />); fireEvent.click(screen.getByRole("tab", { name: /Recordings/ })); const inp = screen.getByLabelText("Import .cast file");
    const cast = '{"version":2,"width":80,"height":24,"timestamp":1700000000,"title":"bob@lab"}\n[0.1,"o","hello\\r\\n"]\n[0.9,"o","bye"]\n';
    fireEvent.change(inp, { target: { files: [new File([cast], "x.cast")] } }); await waitFor(() => expect(screen.getByRole("button", { name: /Delete recording .* on lab/ })).toBeInTheDocument()); expect(screen.getByLabelText(/Replay of session on lab/)).toBeInTheDocument();
    fireEvent.change(inp, { target: { files: [new File(["nope"], "bad.cast")] } }); expect(await screen.findByText(/bad\.cast: Line 1 is not valid JSON/)).toBeInTheDocument();
  });
});

describe("firmware rollout", () => {
  it("halts a ring that exceeds its failure limit and rolls back", () => {
    let s = startNext({ ...initRollout(), badBuild: true }); for (let i = 0; i < 12; i++) s = tick(s); expect(s.rings[0].status).toBe("halted"); expect(s.rings[1].status).toBe("pending"); expect(rollback(s, "canary").rings[0].updated).toBe(0);
  });
  it("completes rings in order with auto advance", () => {
    let s = startNext(initRollout()); for (let i = 0; i < 400 && s.rings.some((r) => r.status !== "done" && r.status !== "halted"); i++) s = tick(s);
    expect(s.rings[0].status).toBe("done"); expect(attempted(s.rings[0])).toBe(s.rings[0].devices); expect(s.rings.every((r) => r.status === "done" || r.status === "halted")).toBe(true);
  });
  it("starts the next ring from the UI and steps progress", () => {
    wrap(<FirmwareRollout />); fireEvent.click(screen.getByRole("switch", { name: "Run live" })); fireEvent.click(screen.getByRole("button", { name: "Start next ring" })); fireEvent.click(screen.getByRole("button", { name: "Step" }));
    expect(screen.getByRole("list", { name: "Rings" })).toHaveTextContent(/running/); expect(screen.getByRole("button", { name: "Roll back" })).toBeInTheDocument();
  });
});

describe("image annotation", () => {
  const canvas = () => screen.getByRole("group", { name: /Image canvas/ }); const svgEl = () => screen.getByTestId("annot-svg");
  const tool = (n: string) => fireEvent.click(within(screen.getByRole("group", { name: "Tool" })).getByRole("button", { name: n }));
  const drag = (el: Element, pts: [number, number][]) => { fireEvent.pointerDown(el, { clientX: pts[0][0], clientY: pts[0][1], button: 0 }); for (const p of pts.slice(1)) fireEvent.pointerMove(el, { clientX: p[0], clientY: p[1] }); const l = pts[pts.length - 1]; fireEvent.pointerUp(el, { clientX: l[0], clientY: l[1], button: 0 }); };
  it("moves a box with the keyboard, edits its note in place and deletes it with undo", () => {
    wrap(<ImageAnnotator />); fireEvent.click(screen.getByRole("button", { name: "Add box" })); const b = screen.getByRole("button", { name: /Device box at 260, 160/ }); fireEvent.keyDown(b, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: /Device box at 265, 160/ })).toBeInTheDocument(); fireEvent.keyDown(screen.getByRole("button", { name: /Device box at 265, 160/ }), { key: "ArrowLeft", shiftKey: true }); expect(screen.getByRole("button", { name: /Device box at 264, 160/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: /^Device box at 264, 160/ }), { key: "Delete" }); expect(screen.queryByRole("button", { name: /^Device box at 264, 160/ })).toBeNull(); fireEvent.click(within(toasts()).getByRole("button", { name: /undo/i })); return waitFor(() => expect(screen.getByRole("button", { name: /^Device box at 264, 160/ })).toBeInTheDocument());
  });
  it("draws a box, a point and a polygon with the pointer", () => {
    wrap(<ImageAnnotator />); tool("Box"); drag(svgEl(), [[10, 10], [120, 90]]); expect(screen.getByText("6 annotations")).toBeInTheDocument(); expect(screen.getByRole("button", { name: /Device box at 10, 10/ })).toBeInTheDocument();
    tool("Point"); fireEvent.pointerDown(svgEl(), { clientX: 300, clientY: 300, button: 0 }); expect(screen.getByText("7 annotations")).toBeInTheDocument();
    tool("Polygon"); for (const p of [[400, 300], [500, 300], [450, 380]]) fireEvent.pointerDown(svgEl(), { clientX: p[0], clientY: p[1], button: 0 }); fireEvent.keyDown(canvas(), { key: "Enter" });
    expect(screen.getByText("8 annotations")).toBeInTheDocument(); expect(screen.getByRole("button", { name: /Device polygon, 3 vertices at 400, 300/ })).toBeInTheDocument();
  });
  it("a polygon with too few points is discarded with a notice", () => {
    wrap(<ImageAnnotator />); tool("Polygon"); fireEvent.pointerDown(svgEl(), { clientX: 50, clientY: 50, button: 0 }); fireEvent.pointerDown(svgEl(), { clientX: 150, clientY: 50, button: 0 }); fireEvent.keyDown(canvas(), { key: "Enter" });
    expect(screen.getByText("5 annotations")).toBeInTheDocument(); expect(screen.getByTestId("annot-note")).toHaveTextContent(/at least 3 points/);
  });
  it("edits polygon vertices from the keyboard, with limits", () => {
    wrap(<ImageAnnotator />); const poly = screen.getByRole("button", { name: /Label polygon, 4 vertices at 470, 40/ }); fireEvent.focus(poly); fireEvent.keyDown(poly, { key: "Enter" });
    const v = () => screen.getByRole("button", { name: /^Vertex 1 of 4/ }); fireEvent.keyDown(v(), { key: "ArrowRight" }); expect(screen.getByRole("button", { name: /^Vertex 1 of 4 at 475, 40/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: /^Vertex 1 of 4/ }), { key: "Insert" }); expect(screen.getByRole("button", { name: /^Vertex 2 of 5/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: /^Vertex 2 of 5/ }), { key: "Delete" }); fireEvent.keyDown(screen.getByRole("button", { name: /^Vertex 2 of 4/ }), { key: "Delete" }); expect(screen.getByRole("button", { name: /^Vertex 2 of 3/ })).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: /^Vertex 2 of 3/ }), { key: "Delete" }); expect(screen.getByTestId("annot-note")).toHaveTextContent(/at least 3 vertices/);
  });
  it("undoes and redoes through the shared undo stack, one entry per run of arrow keys", async () => {
    wrap(<ImageAnnotator />); const a = screen.getByRole("button", { name: /Fault box at 70, 232/ }); for (let i = 0; i < 3; i++) fireEvent.keyDown(screen.getByRole("button", { name: /Fault box at/ }), { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: /Fault box at 70, 247/ })).toBeInTheDocument(); void a; await act(async () => { await undo(); }); expect(screen.getByRole("button", { name: /Fault box at 70, 232/ })).toBeInTheDocument();
    await act(async () => { await redo(); }); expect(screen.getByRole("button", { name: /Fault box at 70, 247/ })).toBeInTheDocument();
  });
  it("adds and removes classes, and refuses duplicates or classes in use", () => {
    wrap(<ImageAnnotator />); const add = (n: string) => { fireEvent.change(screen.getByLabelText("New class"), { target: { value: n } }); fireEvent.click(screen.getByRole("button", { name: "Add" })); };
    add("Port"); expect(screen.getByRole("list", { name: "Classes" })).toHaveTextContent("Port"); add("port"); expect(screen.getByText("That class already exists.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove class Device" })).toBeDisabled(); fireEvent.click(screen.getByRole("button", { name: "Remove class Port" })); expect(screen.getByRole("list", { name: "Classes" })).not.toHaveTextContent("Port");
  });
  it("exports COCO JSON and CSV and re-imports them", async () => {
    wrap(<ImageAnnotator />); fireEvent.click(screen.getByText("Preview COCO JSON")); expect(screen.getByText(/"categories"/)).toBeInTheDocument();
    const coco = '{"images":[{"file_name":"x.png","width":640,"height":400}],"categories":[{"id":1,"name":"Bolt"}],"annotations":[{"category_id":1,"bbox":[10,10,30,30]}]}';
    fireEvent.change(screen.getByLabelText("Import annotations file"), { target: { files: [new File([coco], "x.json")] } }); await waitFor(() => expect(screen.getByText("1 annotation")).toBeInTheDocument()); expect(screen.getByRole("list", { name: "Classes" })).toHaveTextContent("Bolt");
    fireEvent.change(screen.getByLabelText("Import annotations file"), { target: { files: [new File(["kind,points\npoint,5 5\npolygon,0 0;9 0;9 9"], "x.csv")] } }); await waitFor(() => expect(screen.getByText("2 annotations")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Import annotations file"), { target: { files: [new File(["{nope"], "bad.json")] } }); expect(await screen.findByText(/bad\.json: This is not valid JSON/)).toBeInTheDocument();
  });
  it("rejects a non-image file", () => {
    wrap(<ImageAnnotator />); fireEvent.change(screen.getByLabelText("Open image file"), { target: { files: [new File(["hello"], "notes.txt", { type: "text/plain" })] } }); expect(screen.getByText(/notes\.txt is not an image file/)).toBeInTheDocument();
  });
  it("zooms with the buttons and fits again", () => {
    wrap(<ImageAnnotator />); fireEvent.click(screen.getByRole("button", { name: "Zoom in" })); expect(screen.getByTestId("annot-svg").getAttribute("viewBox")).toMatch(/^64 40 512 320$/); fireEvent.click(screen.getByRole("button", { name: "Fit" })); expect(screen.getByTestId("annot-svg").getAttribute("viewBox")).toBe("0 0 640 400");
  });
});
void act;

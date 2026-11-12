export type NodeType = "trigger" | "action" | "condition" | "delay" | "end";
export type WfNode = { id: string; type: NodeType; label: string; x: number; y: number; outcome?: "yes" | "no" };
export type WfEdge = { id: string; from: string; to: string; branch?: "yes" | "no" };
export type Graph = { nodes: WfNode[]; edges: WfEdge[] };
export const NODE_W = 148, NODE_H = 46;
export const TYPE_LABEL: Record<NodeType, string> = { trigger: "Trigger", action: "Action", condition: "Condition", delay: "Delay", end: "End" };

export const SEED: Graph = {
  nodes: [
    { id: "n1", type: "trigger", label: "Webhook received", x: 30, y: 150 },
    { id: "n2", type: "condition", label: "Amount over 500?", x: 230, y: 150, outcome: "yes" },
    { id: "n3", type: "action", label: "Request approval", x: 440, y: 60 },
    { id: "n4", type: "delay", label: "Wait 1 hour", x: 640, y: 60 },
    { id: "n5", type: "action", label: "Create invoice", x: 440, y: 250 },
    { id: "n6", type: "action", label: "Send receipt email", x: 640, y: 250 },
    { id: "n7", type: "end", label: "Done", x: 840, y: 150 },
  ],
  edges: [
    { id: "e1", from: "n1", to: "n2" }, { id: "e2", from: "n2", to: "n3", branch: "yes" }, { id: "e3", from: "n2", to: "n5", branch: "no" },
    { id: "e4", from: "n3", to: "n4" }, { id: "e5", from: "n4", to: "n5" }, { id: "e6", from: "n5", to: "n6" }, { id: "e7", from: "n6", to: "n7" },
  ],
};

export type Issue = { level: "error" | "warn"; text: string; node?: string };
export function hasCycle(g: Graph): boolean {
  const color = new Map<string, number>();
  const adj = (id: string) => g.edges.filter((e) => e.from === id).map((e) => e.to);
  const visit = (id: string): boolean => { color.set(id, 1); for (const t of adj(id)) { const c = color.get(t) ?? 0; if (c === 1 || (c === 0 && visit(t))) return true; } color.set(id, 2); return false; };
  return g.nodes.some((n) => (color.get(n.id) ?? 0) === 0 && visit(n.id));
}
export function reachable(g: Graph): Set<string> {
  const seen = new Set<string>(); const stack = g.nodes.filter((n) => n.type === "trigger").map((n) => n.id);
  while (stack.length) { const id = stack.pop()!; if (seen.has(id)) continue; seen.add(id); for (const e of g.edges) if (e.from === id) stack.push(e.to); }
  return seen;
}
export function validate(g: Graph): Issue[] {
  const out: Issue[] = []; const triggers = g.nodes.filter((n) => n.type === "trigger");
  if (triggers.length === 0) out.push({ level: "error", text: "Add a trigger: nothing starts this workflow." });
  if (triggers.length > 1) out.push({ level: "warn", text: `${triggers.length} triggers: each one starts its own run.` });
  if (hasCycle(g)) out.push({ level: "error", text: "The graph contains a loop. Workflows must finish." });
  const seen = reachable(g);
  for (const n of g.nodes) {
    if (!seen.has(n.id) && n.type !== "trigger") out.push({ level: "warn", text: `“${n.label}” is not reachable from a trigger.`, node: n.id });
    const outs = g.edges.filter((e) => e.from === n.id);
    if (n.type === "condition") for (const b of ["yes", "no"] as const) if (!outs.some((e) => e.branch === b)) out.push({ level: "error", text: `“${n.label}” has no “${b}” branch.`, node: n.id });
    if (n.type !== "end" && n.type !== "condition" && outs.length === 0) out.push({ level: "warn", text: `“${n.label}” leads nowhere. Connect it or end the flow.`, node: n.id });
    if (n.type === "end" && outs.length) out.push({ level: "error", text: `“${n.label}” is an end node and cannot have outputs.`, node: n.id });
  }
  return out;
}
/** Walk from the first trigger, following each condition's simulated outcome. Stops at loops or after 50 steps. */
export function simulate(g: Graph): string[] {
  const start = g.nodes.find((n) => n.type === "trigger"); if (!start) return [];
  const path: string[] = []; let cur: WfNode | undefined = start;
  while (cur && path.length < 50 && !path.includes(cur.id)) {
    path.push(cur.id);
    const outs: WfEdge[] = g.edges.filter((e) => e.from === cur!.id);
    const edge: WfEdge | undefined = cur.type === "condition" ? outs.find((e) => e.branch === (cur!.outcome ?? "yes")) : outs[0];
    cur = edge ? g.nodes.find((n) => n.id === edge.to) : undefined;
  }
  return path;
}
export function addEdge(g: Graph, from: string, to: string, branch?: "yes" | "no"): { graph: Graph; error?: string } {
  if (from === to) return { graph: g, error: "A step cannot connect to itself." };
  const src = g.nodes.find((n) => n.id === from), dst = g.nodes.find((n) => n.id === to);
  if (!src || !dst) return { graph: g, error: "Unknown step." };
  if (src.type === "end") return { graph: g, error: "End nodes cannot have outputs." };
  if (dst.type === "trigger") return { graph: g, error: "A trigger cannot have inputs." };
  if (g.edges.some((e) => e.from === from && e.to === to)) return { graph: g, error: "Already connected." };
  let b = branch;
  if (src.type === "condition") { const used = g.edges.filter((e) => e.from === from).map((e) => e.branch); b = b ?? (used.includes("yes") ? "no" : "yes"); if (used.includes(b)) return { graph: g, error: `“${src.label}” already has a “${b}” branch.` }; }
  else if (g.edges.some((e) => e.from === from)) return { graph: g, error: "Only conditions can branch. Remove the existing connection first." };
  const next = { ...g, edges: [...g.edges, { id: `e${Date.now()}${g.edges.length}`, from, to, branch: b }] };
  return { graph: next };
}

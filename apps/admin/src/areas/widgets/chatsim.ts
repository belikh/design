/* Simulated assistant: no network. A scripted reply is streamed token by token with citations and tool calls. */
export type Citation = { n: number; title: string; source: string };
export type ToolCall = { id: string; name: string; args: Record<string, string>; status: "running" | "done" | "error"; result?: string };
export type Chunk = { type: "text"; text: string } | { type: "tool"; call: ToolCall } | { type: "tool-result"; id: string; status: "done" | "error"; result: string } | { type: "cite"; cite: Citation } | { type: "done" };
export const SOURCES: Citation[] = [
  { n: 1, title: "Token reference", source: "docs/tokens.md" }, { n: 2, title: "Accessibility checklist", source: "docs/a11y.md" }, { n: 3, title: "Release notes 2.4", source: "changelog" },
];
type Plan = { tool?: { name: string; args: Record<string, string>; result: string; fail?: boolean }; text: string; cites: number[] };
export function plan(prompt: string): Plan {
  const p = prompt.toLowerCase();
  if (/(fail|error|broken)/.test(p)) return { tool: { name: "search_logs", args: { query: prompt.slice(0, 40) }, result: "Upstream timed out after 5s", fail: true }, text: "I tried to search the logs but the tool timed out. I can retry, or you can narrow the time range. [1]", cites: [1] };
  if (/(colou?r|token|theme)/.test(p)) return { tool: { name: "search_docs", args: { query: "design tokens" }, result: "2 documents matched" }, text: "Colours are exposed as --jp-* custom properties [1]. Use status tokens only for status, and check pairs against the contrast table [2].", cites: [1, 2] };
  if (/(release|change|new)/.test(p)) return { tool: { name: "get_release", args: { version: "2.4" }, result: "Release 2.4, 14 changes" }, text: "Version 2.4 added the P3 input set and fixed focus handling in dialogs [3].", cites: [3] };
  return { text: "I can look things up in the docs, summarise releases, and check contrast. Try asking about colour tokens or the latest release.", cites: [] };
}
/** Yields chunks with an optional delay between them (0 in tests). */
export async function* stream(prompt: string, delay = 25, signal?: AbortSignal): AsyncGenerator<Chunk> {
  const pl = plan(prompt); const wait = () => (delay ? new Promise<void>((r) => setTimeout(r, delay)) : Promise.resolve());
  if (pl.tool) { const id = `t${Date.now()}`; yield { type: "tool", call: { id, name: pl.tool.name, args: pl.tool.args, status: "running" } }; await wait(); await wait(); if (signal?.aborted) return; yield { type: "tool-result", id, status: pl.tool.fail ? "error" : "done", result: pl.tool.result }; }
  for (const w of pl.text.split(/(\s+)/)) { if (signal?.aborted) return; if (w) { yield { type: "text", text: w }; await wait(); } }
  for (const n of pl.cites) yield { type: "cite", cite: SOURCES.find((s) => s.n === n)! };
  yield { type: "done" };
}

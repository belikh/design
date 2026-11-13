import { loadProject } from "./project.mjs";
import { diffMarkdown, writeMarkdown } from "./build-md.mjs";

const HELP = `jupiter-docs: one Markdown source, three outputs (site, repo Markdown, PDF)

  jupiter-docs check [--strict]            validate the source (exit 1 on errors; --strict also on warnings)
  jupiter-docs build [--md] [--site] [--pdf]   build outputs (default: --md --site)
  jupiter-docs build --check               fail when the generated Markdown is out of date
  jupiter-docs init [dir]                  scaffold docs-src and docs.config.json

Options: --config <file> (default docs.config.json)`;

function parse(argv) {
  const flags = new Set(); const vals = {}; const rest = [];
  for (let i = 0; i < argv.length; i++) { const a = argv[i]; if (a === "--config") vals.config = argv[++i]; else if (a.startsWith("--")) flags.add(a.slice(2)); else rest.push(a); }
  return { flags, vals, rest };
}
const print = (project, strict) => {
  for (const w of project.warnings) console.error(`warning: ${w}`);
  for (const e of project.errors) console.error(`error: ${e}`);
  return project.errors.length > 0 || (strict && project.warnings.length > 0);
};

export async function main(argv) {
  const [cmd, ...args] = argv; const { flags, vals, rest } = parse(args); const configFile = vals.config ?? "docs.config.json";
  if (!cmd || cmd === "help" || flags.has("help")) { console.log(HELP); return cmd ? 0 : 1; }
  if (cmd === "init") { const { init } = await import("./init.mjs"); return init(rest[0] ?? "."); }
  if (cmd !== "check" && cmd !== "build") { console.error(`unknown command "${cmd}"\n\n${HELP}`); return 1; }
  const project = loadProject(configFile);
  if (print(project, flags.has("strict"))) { console.error(`${project.errors.length} error(s)`); return 1; }
  if (cmd === "check") { console.log(`${project.pages.length} page(s) OK`); return 0; }
  if (flags.has("check")) {
    const stale = diffMarkdown(project);
    if (stale.length) { console.error(`Generated Markdown is stale:\n  ${stale.join("\n  ")}\nRun: jupiter-docs build --md`); return 1; }
    console.log(`Generated Markdown is current (${project.pages.length} page(s)).`); return 0;
  }
  const any = flags.has("md") || flags.has("site") || flags.has("pdf"); const want = (k) => flags.has(k) || (!any && k !== "pdf");
  if (want("md")) { const r = writeMarkdown(project); console.log(`markdown: ${r.total} file(s), ${r.written.length} written`); }
  if (want("site")) { const { buildSite } = await import("./build-site.mjs"); const r = await buildSite(project); console.log(`site: ${r.files} file(s) in ${r.out}`); }
  if (want("pdf")) { const { buildPdf } = await import("./build-pdf.mjs"); const r = await buildPdf(project); console.log(`pdf: ${r.pdf}`); }
  return 0;
}

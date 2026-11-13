// LaTeX/PDF: write <id>.tex with write-tex.mjs, compile with xelatex using jupiter-docs.cls, fonts from the LaTeX bundle.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { texWriter } from "./write-tex.mjs";
import { visit } from "./parse.mjs";
import { graphicSvg, logos, packageRoot, resolveFile } from "./resolve.mjs";

/** Find the LaTeX bundle: config.latexDir, $JUPITER_LATEX_DIR, or packages/latex next to this package. Supports the monorepo (src/) and jupiter-latex.tgz (tex/) layouts. */
export function findLatex(project) {
  const cands = [project.config.latexDir && resolve(project.root, project.config.latexDir), process.env.JUPITER_LATEX_DIR, join(packageRoot, "../latex")].filter(Boolean);
  for (const d of cands) for (const sub of ["src", "tex"]) if (existsSync(join(d, sub, "jupiter-docs.cls"))) return { classDir: join(d, sub), fontDir: existsSync(join(d, "fonts/sgi-text-400.otf")) ? join(d, "fonts") : null, dir: d };
  return null;
}
const need = (cmd) => spawnSync(cmd, ["--version"], { stdio: "ignore" }).error === undefined;

function svgToPdf(svg, outFile, colour) {
  let s = svg.replace(/ pathLength="1"/g, "").replace(/ class="[^"]*"/, "");
  if (colour) s = s.replaceAll("currentColor", colour);
  const vb = /viewBox="([-\d. ]+)"/.exec(s)[1].split(/\s+/).map(Number);
  s = s.replace(/<svg /, `<svg width="${vb[2]}pt" height="${vb[3]}pt" `);
  const r = spawnSync("rsvg-convert", ["-f", "pdf", "-o", outFile], { input: s });
  if (r.status !== 0) throw new Error(`rsvg-convert failed: ${r.stderr}`);
}

export async function buildPdf(project, { date } = {}) {
  const { config, root, pages, nav } = project;
  const latex = findLatex(project); if (!latex) throw new Error("jupiter-docs.cls not found: set latexDir in docs.config.json or JUPITER_LATEX_DIR (packages/latex or an unpacked jupiter-latex.tgz)");
  if (!need("xelatex")) throw new Error("xelatex not found (install TeX Live: texlive-xetex texlive-latex-extra)");
  const tokens = resolveFile("@belikh/jupiter-tokens/tokens.sty", root); const tokensDir = join(tokens, "..");
  const work = join(root, config.pdfOut, ".pdf-build", config.id); rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
  const sty = readFileSync(tokens, "utf8"); const accent = "#" + /\\definecolor\{jplightAccent\}\{HTML\}\{([0-9A-Fa-f]{6})\}/.exec(sty)?.[1];
  const hasSvg = need("rsvg-convert") && /^#[0-9A-Fa-f]{6}$/.test(accent);
  if (!hasSvg) console.warn("warning: rsvg-convert not found (librsvg2-bin): the PDF is built without logo and line art");
  else {
    const L = config.logo === "none" ? null : await logos(root);
    if (L) svgToPdf(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${L.light.viewBox}">${L.light.inner}</svg>`, join(work, "jp-logo-light.pdf"));
    const refs = new Set(["rule/end"]); for (const p of pages) visit(p.tree, (n) => { if (n.type === "graphic") refs.add(n.ref); });
    for (const ref of refs) { const svg = graphicSvg(ref, root); if (svg) svgToPdf(svg, join(work, `jpg-${ref.replace("/", "-")}.pdf`), accent); }
    if (config.hero) { const svg = graphicSvg(config.hero, root); if (svg) svgToPdf(svg, join(work, "jpg-cover.pdf"), accent); }
  }
  const d = date ?? (process.env.SOURCE_DATE_EPOCH ? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000) : new Date());
  const dateText = d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const w = texWriter({ pages, config }); const name = config.id;
  writeFileSync(join(work, `${name}.tex`), w.document({ nav, date: dateText, version: config.version ? `v${config.version}` : "" }));
  const fonts = latex.fontDir ? latex.fontDir + "/" : "";
  const env = { ...process.env, TEXINPUTS: `.:${work}:${latex.classDir}:${tokensDir}:`, SOURCE_DATE_EPOCH: process.env.SOURCE_DATE_EPOCH ?? String(Math.floor(d.getTime() / 1000)) };
  let log = "";
  for (let pass = 1; pass <= 3; pass++) {
    const r = spawnSync("xelatex", ["-interaction=nonstopmode", "-halt-on-error", `-output-directory=${work}`, `\\def\\jpfontdir{${fonts}}\\input{${name}.tex}`], { cwd: work, env, encoding: "utf8" });
    log = r.stdout + r.stderr; writeFileSync(join(work, `${name}.log.txt`), log);
    if (r.status !== 0) throw new Error(`xelatex failed (log: ${join(work, name + ".log.txt")}):\n${log.split("\n").slice(-25).join("\n")}`);
    if (pass >= 2 && !/Rerun to get|Label\(s\) may have changed/.test(log)) break;
  }
  const missing = [...new Set([...log.matchAll(/Missing character: There is no (.+?) in font ([^\n!]+)/g)].map((m) => `${m[1]} in ${m[2].trim()}`))];
  if (missing.length) throw new Error(`xelatex: glyphs missing from the fonts:\n  ${missing.join("\n  ")}\nAdd a \\newunicodechar mapping to jupiter-docs.cls or change the text.`);
  const outDir = join(root, config.pdfOut); mkdirSync(outDir, { recursive: true });
  const pdf = join(outDir, `${name}.pdf`); copyFileSync(join(work, `${name}.pdf`), pdf);
  return { pdf: join(config.pdfOut, `${name}.pdf`), fonts: Boolean(latex.fontDir) };
}

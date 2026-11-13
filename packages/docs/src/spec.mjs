// The source format in one dependency-free place. The parser, `check`, the writers, the agent skill drift check and the
// "Writing documentation" page all read these tables, so a directive added here is known everywhere.

/** Callout containers (`:::note Title`). gh = GitHub alert type, tex = jpcallout kind, css = components.css modifier. */
export const CALLOUTS = {
  note: { label: "Note", gh: "NOTE", tex: "info", css: "" },
  tip: { label: "Tip", gh: "TIP", tex: "ok", css: " jp-callout--ok" },
  warning: { label: "Warning", gh: "WARNING", tex: "warn", css: " jp-callout--warn" },
  danger: { label: "Danger", gh: "CAUTION", tex: "danger", css: " jp-callout--danger" },
};

/** Block directives: `:::name arg` ... `:::` (container) and `::name arg` (leaf, one line). */
export const CONTAINERS = [...Object.keys(CALLOUTS), "see-also"];
export const LEAVES = ["graphic", "glossary"];
export const DIRECTIVES = [...CONTAINERS, ...LEAVES];

/** Inline syntax: `[[page-id]]`, `[[page-id#heading|text]]`, `[[term:Name]]`. */
export const INLINE = ["[[page-id]]", "[[page-id#anchor|text]]", "[[term:Name]]"];

/** Code fence info string: `lang title="Text"`. */
export const FENCE_OPTIONS = ["title"];

export const FRONT_MATTER = {
  title: "string, required",
  summary: "string, required: one sentence, shown in search, cards and the page header",
  section: "string, required: an id from the sections list of docs.config.json (not needed on index.md)",
  order: "number: position inside the section (default 100; ties sort by title)",
  icon: "string: a name from the icon tier of the graphics set, for example home or gear",
  audience: "one of users, developers, agents, maintainers",
  status: "one of draft, stable, deprecated",
};
export const AUDIENCES = ["users", "developers", "agents", "maintainers"];
export const STATUSES = ["draft", "stable", "deprecated"];

export const CONFIG_KEYS = {
  project: "string, required: the project name",
  id: "string: file name for the PDF (default: the project name, lower case)",
  description: "string: one sentence for the landing page and meta description",
  version: "string, or versionFrom: path of a JSON file whose version field is used",
  versionFrom: "string",
  repo: "string: repository URL, used for edit links and the header link",
  repoBranch: "string, default main",
  siteUrl: "string: public URL (https://docs.example.org), needed for the sitemap",
  base: "string, default /: the path the site is served from",
  src: "string, default docs-src",
  mdOut: "string, default docs",
  siteOut: "string, default dist/site",
  pdfOut: "string, default dist",
  sections: "list of { id, title, summary?, icon? }, in navigation order",
  glossary: "object: term to definition",
  hero: "string: spot graphic for the landing page, for example spot/summit",
  graphicsUrl: "string: URL template for graphics in generated Markdown: {root} {tier} {name} {theme}",
  latexDir: "string: a directory holding jupiter-docs.cls (monorepo packages/latex, or an unpacked jupiter-latex.tgz)",
  author: "string: author line on the PDF cover",
};

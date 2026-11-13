import { INVOICES, totals, type Invoice } from "./billing.data.ts";
import { fmtDate } from "./lib.ts";

export type Template = { id: string; cls: string; name: string; desc: string; options: string[]; macros: string[]; source: string };
export const TEMPLATES: Template[] = [
  { id: "resume", cls: "jupiter-resume", name: "Resume / CV", desc: "One content file, three layouts.", options: ["dense", "sidebar", "classic"], macros: ["\\resumename", "\\resumesection", "\\resumeentry", "\\resumeskill"], source: "templates/resume-dense.tex" },
  { id: "letter", cls: "jupiter-letter", name: "Formal letter", desc: "Serif, monochrome, conventional layout.", options: ["formal"], macros: ["\\sender", "\\recipient", "\\subject", "jpletter", "\\signoff"], source: "templates/letter-formal.tex" },
  { id: "cover", cls: "jupiter-letter", name: "Cover letter", desc: "Sans with an accent rule; matches the dense resume.", options: ["cover"], macros: ["\\sender", "\\recipient", "\\subject", "jpletter", "\\signoff"], source: "templates/letter-cover.tex" },
  { id: "notes", cls: "jupiter-notes", name: "Notes", desc: "Margin remarks, checklists, callouts.", options: [], macros: ["\\notemeta", "\\jpmargin", "jptodo", "jpcallout"], source: "templates/notes.tex" },
  { id: "report", cls: "jupiter-report", name: "Report", desc: "Title page, contents, numbered sections, code.", options: [], macros: ["\\subtitle", "\\reportversion", "\\tableofcontents", "jpcode"], source: "templates/report.tex" },
  { id: "invoice", cls: "jupiter-invoice", name: "Invoice", desc: "Line items with computed totals and GST.", options: [], macros: ["\\invoicefrom", "\\invoiceitem", "\\invoicetotals", "\\paymentdetails"], source: "templates/invoice.tex" },
];
export const buildCommand = (t: Template) => `packages/latex/scripts/build.sh packages/latex/${t.source}`;
/** Escape LaTeX special characters so user text can never inject commands. */
export function texEscape(s: string): string {
  const map: Record<string, string> = { "\\": "\\textbackslash{}", "&": "\\&", "%": "\\%", "$": "\\$", "#": "\\#", "_": "\\_", "{": "\\{", "}": "\\}", "~": "\\textasciitilde{}", "^": "\\textasciicircum{}" };
  return s.replace(/[\\&%$#_{}~^]/g, (c) => map[c]);
}
const money = (n: number) => n.toFixed(2);
/** LaTeX source for an invoice, using the jupiter-invoice class macros. */
export function invoiceTex(inv: Invoice): string {
  return [`\\documentclass{jupiter-invoice}`, `\\invoicefrom{Alex Example \\\\ 12 Example Street \\\\ Brisbane QLD 4000 \\\\ ABN 00 000 000 000}`, `\\invoiceto{${texEscape(inv.client)}}`, `\\invoicenumber{${texEscape(inv.number)}}`, `\\invoicedate{${fmtDate(inv.issued)}}`, `\\invoiceduedate{${fmtDate(inv.due)}}`,
    `\\invoicestatus{${inv.status === "paid" ? "Paid" : inv.status === "draft" ? "Draft" : "Unpaid"}}`, `\\taxrate{10}`, `\\paymentdetails{Account name: Alex Example \\\\ BSB 000-000 \\\\ Account 00000000 \\\\ Reference: ${texEscape(inv.number)}}`, `\\begin{document}`, `\\maketitle`, `\\begin{invoiceitems}`,
    ...inv.items.map((i) => `  \\invoiceitem{${texEscape(i.desc)}}{${i.qty}}{${money(i.unit)}}`), `\\end{invoiceitems}`, `\\invoicetotals`, `\\invoicefooter`, `\\end{document}`, `% total ${money(totals(inv.items).total)} AUD incl. GST`].join("\n");
}
export type Letter = { id: string; kind: "formal" | "cover"; to: string; subject: string; date: string; body: string; status: "draft" | "sent" };
export const LETTERS: Letter[] = [
  { id: "L-001", kind: "cover", to: "Hiring Manager, Example Pty Ltd", subject: "Application: Field Systems Technician (REQ-1234)", date: "2026-11-12", status: "draft", body: "I am applying for the Field Systems Technician role.\n\nI bring decades of hands-on Linux, networking and hardware experience." },
  { id: "L-002", kind: "formal", to: "Ms Jordan Smith, Example Pty Ltd", subject: "Re: Request for written confirmation", date: "2026-11-05", status: "sent", body: "I am writing to request written confirmation of the terms discussed on 5 November, including the start date and rate of pay." },
];
export function letterTex(l: Letter): string {
  const paras = l.body.split(/\n{2,}/).map((p) => texEscape(p.trim())).filter(Boolean).join("\n\n");
  return [`\\documentclass${l.kind === "cover" ? "[cover]" : ""}{jupiter-letter}`, `\\sender{Alex Example}{12 Example Street \\\\ Brisbane QLD 4000}{alex@example.com}`, `\\recipient{${texEscape(l.to).replace(/, /g, " \\\\ ")}}`, `\\letterdate{${fmtDate(l.date)}}`, `\\subject{${texEscape(l.subject)}}`, `\\begin{document}`, `\\begin{jpletter}{Dear ${texEscape(l.to.split(",")[0].split(" ").slice(-1)[0] === "Manager" ? "Hiring Manager" : l.to.split(",")[0])},}`, paras, `\\end{jpletter}`, `\\signoff{${l.kind === "cover" ? "Kind regards," : "Yours sincerely,"}}{Alex Example}`, `\\end{document}`].join("\n");
}
export type Pdf = { id: string; name: string; template: string; pages: number; kb: number; at: string; sha: string };
export const PDFS: Pdf[] = [{ id: "g1", name: "INV-0042.pdf", template: "invoice", pages: 1, kb: 38, at: "2026-11-12 09:14", sha: "5f2a91c" }, { id: "g2", name: "resume-dense.pdf", template: "resume", pages: 2, kb: 112, at: "2026-11-11 16:02", sha: "a09bd44" }, { id: "g3", name: "resume-classic.pdf", template: "resume", pages: 3, kb: 98, at: "2026-11-11 16:02", sha: "77c1e08" }, { id: "g4", name: "quarterly-review.pdf", template: "report", pages: 3, kb: 204, at: "2026-11-09 11:40", sha: "1d3e6fa" }];
export const INVOICE_RECORDS = INVOICES;
export const pdfNameFor = (kind: string, id: string) => `${id}.pdf`.replace(/[^\w.-]/g, "_") + (kind ? "" : "");

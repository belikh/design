// Table exporters: CSV, JSON, Markdown, TSV, a real .xlsx (zip, stored) and a plain-text PDF. No dependencies.

export type Cell = string | number | boolean | null | undefined;
const s = (v: Cell) => (v === null || v === undefined ? "" : String(v));

export const toCsv = (headers: string[], rows: Cell[][]) => [headers, ...rows].map((r) => r.map((v) => `"${s(v).replace(/"/g, '""')}"`).join(",")).join("\n");
export const toTsv = (headers: string[], rows: Cell[][]) => [headers, ...rows].map((r) => r.map((v) => s(v).replace(/[\t\n\r]+/g, " ")).join("\t")).join("\n");
export const toJson = (headers: string[], rows: Cell[][]) => JSON.stringify(rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null]))), null, 2);
export function toMarkdown(headers: string[], rows: Cell[][], align: ("left" | "right")[] = []) {
  const esc = (v: Cell) => s(v).replace(/\|/g, "\\|").replace(/\n/g, " ");
  return [`| ${headers.map(esc).join(" | ")} |`, `| ${headers.map((_, i) => (align[i] === "right" ? "---:" : "---")).join(" | ")} |`, ...rows.map((r) => `| ${r.map(esc).join(" | ")} |`)].join("\n");
}

// ---------- zip (store) + xlsx ----------
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(b: Uint8Array) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
const enc = new TextEncoder();
const u16 = (n: number) => [n & 255, (n >> 8) & 255]; const u32 = (n: number) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];

export function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: number[][] = []; const central: number[][] = []; let offset = 0;
  for (const f of files) {
    const name = [...enc.encode(f.name)]; const crc = crc32(f.data); const size = f.data.length;
    const local = [0x50, 0x4b, 0x03, 0x04, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...name];
    parts.push(local, [...f.data]);
    central.push([0x50, 0x4b, 0x01, 0x02, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(size), ...u32(size), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]);
    offset += local.length + size;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = [0x50, 0x4b, 0x05, 0x06, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(offset), ...u16(0)];
  const all = [...parts, ...central, end]; const out = new Uint8Array(all.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of all) { out.set(p, o); o += p.length; } return out;
}
const xmlEsc = (v: string) => v.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const colName = (i: number) => { let n = i + 1, out = ""; while (n > 0) { const m = (n - 1) % 26; out = String.fromCharCode(65 + m) + out; n = Math.floor((n - 1) / 26); } return out; };
export function sheetXml(headers: string[], rows: Cell[][]) {
  const cell = (v: Cell, c: number, r: number, bold = false) => { const ref = `${colName(c)}${r}`; const st = bold ? ' s="1"' : ""; return typeof v === "number" && Number.isFinite(v) ? `<c r="${ref}"${st}><v>${v}</v></c>` : typeof v === "boolean" ? `<c r="${ref}" t="b"${st}><v>${v ? 1 : 0}</v></c>` : `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${xmlEsc(s(v))}</t></is></c>`; };
  const body = [headers, ...rows].map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => cell(v, ci, ri + 1, ri === 0)).join("")}</row>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${body}</sheetData></worksheet>`;
}
export function buildXlsx(headers: string[], rows: Cell[][], sheet = "Sheet1"): Uint8Array {
  const f = (name: string, text: string) => ({ name, data: enc.encode(text) }); const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zipStore([
    f("[Content_Types].xml", `${H}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`),
    f("_rels/.rels", `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    f("xl/workbook.xml", `${H}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEsc(sheet.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    f("xl/_rels/workbook.xml.rels", `${H}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    f("xl/styles.xml", `${H}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`),
    f("xl/worksheets/sheet1.xml", sheetXml(headers, rows)),
  ]);
}

// ---------- pdf (text table, Courier) ----------
const pdfStr = (v: string) => v.replace(/[^\x20-\x7e]/g, "?").replace(/([\\()])/g, "\\$1");
export function buildPdf(title: string, headers: string[], rows: Cell[][]): Uint8Array {
  const cols = headers.length; const w = headers.map((h, i) => Math.min(24, Math.max(h.length, ...rows.map((r) => s(r[i]).length)))); const pad = (v: string, n: number) => (v.length > n ? v.slice(0, n - 1) + "~" : v.padEnd(n));
  const line = (r: Cell[]) => r.slice(0, cols).map((v, i) => pad(s(v), w[i])).join("  "); const head = line(headers); const rule = "-".repeat(head.length);
  const perPage = 52; const pages: string[][] = []; for (let i = 0; i < Math.max(1, rows.length); i += perPage) pages.push(rows.slice(i, i + perPage).map(line));
  const fontSize = Math.max(5, Math.min(9, Math.floor(540 / (head.length * 0.6)))); const objs: string[] = [];
  const pageIds = pages.map((_, i) => 4 + i * 2);
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>"; objs[2] = `<< /Type /Pages /Kids [${pageIds.map((p) => `${p} 0 R`).join(" ")}] /Count ${pages.length} >>`; objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";
  pages.forEach((p, i) => {
    const lines = [i === 0 ? title : `${title} (page ${i + 1})`, "", head, rule, ...p]; const y0 = 800;
    const content = `BT /F1 ${fontSize} Tf ${fontSize + 2} TL 36 ${y0} Td ${lines.map((l) => `(${pdfStr(l)}) Tj T*`).join(" ")} ET`;
    objs[4 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`;
    objs[5 + i * 2] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  let out = "%PDF-1.4\n"; const offs: number[] = [0];
  for (let i = 1; i < objs.length; i++) { offs[i] = out.length; out += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
  const xref = out.length; out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`; for (let i = 1; i < objs.length; i++) out += `${String(offs[i]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`; return enc.encode(out);
}

export function download(name: string, data: BlobPart, type: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

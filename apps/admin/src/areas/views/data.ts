import { rng, series, people, regions } from "../../data/fixtures.ts";
import type { Contact, Priority, SubTask, Tag, Version } from "./logic.ts";
import { NOW0 } from "./shared.tsx";

const r = rng(404); const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)]; const int = (lo: number, hi: number) => Math.floor(lo + r() * (hi - lo + 1));
export { people, regions, series };

/* tickets */
export type Ticket = { id: string; title: string; customer: string; priority: Priority; status: "open" | "waiting" | "resolved"; openedAt: number; pausedAt?: number; pausedMin?: number; resolvedAt?: number; owner: string };
const tt = ["Cannot sign in after password reset", "Invoice shows wrong GST", "PXE boot fails on node 3", "Camera offline since update", "Wi-Fi drops in the workshop", "Export is empty", "Disk almost full on tank", "Certificate warning on jupiter.au", "Slow dashboard on mobile", "Request: add SSO", "VPN peer cannot connect", "Backup job failed overnight"];
export const tickets: Ticket[] = tt.map((title, i) => { const priority = (["P1", "P2", "P2", "P3", "P3", "P4"] as Priority[])[i % 6]; const openedAt = NOW0 - [20, 130, 200, 600, 1300, 2500, 60, 4000, 340, 5000, 45, 900][i];
  return { id: `TKT-${2040 + i}`, title, customer: pick(["Example Pty Ltd", "Brisbane Council", "Kookaburra Co", "Wombat Freight", "Outback Haulage"]), priority, status: i === 5 ? "resolved" : i % 5 === 3 ? "waiting" : "open", openedAt, pausedAt: i % 5 === 3 ? NOW0 - 100 : undefined, pausedMin: 0, resolvedAt: i === 5 ? openedAt + 50 : undefined, owner: people[i % people.length] }; });

/* approvals */
export type Approval = { id: string; kind: "Expense" | "Access" | "Change" | "Leave" | "Purchase"; title: string; by: string; amount?: number; at: number; status: "pending" | "approved" | "rejected"; reason?: string; risk: "low" | "med" | "high" };
export const approvals: Approval[] = [
  { id: "AP-301", kind: "Purchase", title: "Replacement UDM Pro", by: people[1], amount: 749, at: NOW0 - 90, status: "pending", risk: "low" }, { id: "AP-302", kind: "Access", title: "Prod database read access for Mia Patel", by: people[2], at: NOW0 - 240, status: "pending", risk: "high" },
  { id: "AP-303", kind: "Change", title: "Rotate WireGuard keys (maintenance window Sat 22:00)", by: people[3], at: NOW0 - 600, status: "pending", risk: "med" }, { id: "AP-304", kind: "Expense", title: "Conference travel: Melbourne", by: people[4], amount: 1260, at: NOW0 - 1500, status: "pending", risk: "med" },
  { id: "AP-305", kind: "Leave", title: "Annual leave 3 to 14 Dec", by: people[5], at: NOW0 - 2200, status: "pending", risk: "low" }, { id: "AP-306", kind: "Purchase", title: "FPGA dev boards (x4)", by: people[6], amount: 340, at: NOW0 - 3000, status: "pending", risk: "low" },
  { id: "AP-290", kind: "Expense", title: "Domain renewals", by: people[7], amount: 88, at: NOW0 - 5000, status: "approved", risk: "low" },
];

/* tasks */
export const taskTree: SubTask[] = [
  { id: "t1", title: "Launch v1.0", done: false, sub: [{ id: "t1a", title: "Final QA pass", done: true }, { id: "t1b", title: "Release notes", done: false, sub: [{ id: "t1b1", title: "Draft", done: true }, { id: "t1b2", title: "Review", done: false }] }, { id: "t1c", title: "Publish to Pages", done: false }] },
  { id: "t2", title: "Network migration", done: false, sub: [{ id: "t2a", title: "Create camera VLAN", done: true }, { id: "t2b", title: "Move IoT devices", done: false }, { id: "t2c", title: "Update firewall zones", done: false }] },
  { id: "t3", title: "Renew certificates", done: true },
];

/* contacts */
export const STAGES = ["Lead", "Qualified", "Proposal", "Won", "Lost"] as const;
export const contacts: Contact[] = [
  ["Ava Nguyen", "ava@example.com", "0412 345 678", "Example Pty Ltd", "Lead"], ["A. Nguyen", "ava@example.com", "", "Example Pty Ltd", "Lead"], ["Noah Smith", "noah@kookaburra.au", "0400 111 222", "Kookaburra Co", "Qualified"], ["Mia Patel", "mia@wombat.au", "+61 421 555 019", "Wombat Freight", "Proposal"],
  ["Mia Patel-Singh", "", "0421 555 019", "Wombat Freight", "Proposal"], ["Liam Williams", "liam@outback.au", "0433 222 909", "Outback Haulage", "Won"], ["Zoe Chen", "zoe@bnecouncil.gov.au", "07 3000 1234", "Brisbane Council", "Qualified"], ["Jack Evans", "jack@example.com", "0455 010 010", "Example Pty Ltd", "Lost"], ["Jak Evans", "jack.evans@example.com", "0455 010 010", "Example Pty Ltd", "Lead"], ["Ruby Singh", "ruby@sgi.au", "0466 777 888", "SGI Fans", "Won"],
].map(([name, email, phone, company, stage], i) => ({ id: `c${i + 1}`, name, email, phone, company, stage, notes: i === 0 ? "prefers email" : undefined }));

/* products */
export type Product = { id: string; name: string; spot: string; cat: string; price: number; options: { Colour: string[]; Size: string[] }; stock: Record<string, number> };
export const products: Product[] = [
  { id: "p1", name: "Retro keyboard", spot: "keyboard-mouse", cat: "Peripherals", price: 129, options: { Colour: ["Beige", "Grey"], Size: ["Full", "Compact"] }, stock: { "Beige|Full": 12, "Beige|Compact": 3, "Grey|Full": 0, "Grey|Compact": 8 } },
  { id: "p2", name: "CRT monitor stand", spot: "crt-monitor", cat: "Accessories", price: 79, options: { Colour: ["Black", "Beige"], Size: ["14in", "17in"] }, stock: { "Black|14in": 5, "Black|17in": 2, "Beige|14in": 0, "Beige|17in": 0 } },
  { id: "p3", name: "Floppy storage box", spot: "floppy-35", cat: "Accessories", price: 24, options: { Colour: ["Clear", "Smoke"], Size: ["40", "80"] }, stock: { "Clear|40": 40, "Clear|80": 22, "Smoke|40": 9, "Smoke|80": 1 } },
  { id: "p4", name: "Vinyl crate", spot: "vinyl", cat: "Storage", price: 59, options: { Colour: ["Oak", "Walnut"], Size: ["Single", "Double"] }, stock: { "Oak|Single": 7, "Oak|Double": 4, "Walnut|Single": 0, "Walnut|Double": 2 } },
  { id: "p5", name: "ISA card kit", spot: "isa-card", cat: "Retro", price: 260, options: { Colour: ["Green"], Size: ["8-bit", "16-bit"] }, stock: { "Green|8-bit": 6, "Green|16-bit": 0 } },
  { id: "p6", name: "Modem (56k)", spot: "modem", cat: "Retro", price: 45, options: { Colour: ["Beige"], Size: ["External", "Internal"] }, stock: { "Beige|External": 14, "Beige|Internal": 3 } },
];

/* orders */
export type OLine = { sku: string; name: string; qty: number; price: number };
export type Ord = { id: string; customer: string; placed: number; status: "placed" | "paid" | "picked" | "shipped" | "delivered" | "cancelled"; lines: OLine[]; shipping: number; events: { at: number; text: string }[] };
const steps = ["placed", "paid", "picked", "shipped", "delivered"] as const; export const ORDER_STEPS = steps;
export const ordersV: Ord[] = Array.from({ length: 14 }, (_, i) => { const st = (i === 11 ? "cancelled" : steps[i % 5]) as Ord["status"]; const placed = NOW0 - (i + 1) * 410; const idx = steps.indexOf(st as (typeof steps)[number]);
  const lines = Array.from({ length: 1 + (i % 3) }, (_, k) => { const p = products[(i + k) % products.length]; return { sku: `${p.id.toUpperCase()}-${k + 1}`, name: p.name, qty: 1 + ((i + k) % 3), price: p.price }; });
  return { id: `SO-${7100 + i}`, customer: people[i % people.length], placed, status: st, lines, shipping: 12, events: st === "cancelled" ? [{ at: placed, text: "Order placed" }, { at: placed + 30, text: "Cancelled by customer" }] : steps.slice(0, Math.max(1, idx + 1)).map((s, k) => ({ at: placed + k * 140, text: { placed: "Order placed", paid: "Payment received", picked: "Picked and packed", shipped: "Handed to carrier", delivered: "Delivered" }[s] })) }; });

/* assets */
export type Asset = { id: string; name: string; type: string; location: string; status: "in-use" | "spare" | "repair" | "retired"; holder?: string; bought: string; cost: number; serial: string };
export const assets: Asset[] = [["SGI Indy (R4400)", "Workstation", "Workshop", "in-use", "Ava Nguyen", "2019-03-02", 480], ["IBM 5160 XT", "Computer", "Retro shelf", "in-use", undefined, "2018-07-14", 260], ["UDM Pro", "Network", "Rack 1", "in-use", undefined, "2022-02-01", 599], ["USW-24 PoE", "Network", "Rack 1", "in-use", undefined, "2022-02-01", 399], ["Tang Nano 20K", "FPGA", "Bench", "spare", undefined, "2024-05-20", 45], ["ESP32-S3 DevKit", "Embedded", "Bench", "spare", undefined, "2025-01-11", 12], ["Orca printer (Kobra S1)", "3D printer", "Workshop", "repair", "Mia Patel", "2025-06-03", 520], ["HP 9000 C3600", "Workstation", "Garage", "retired", undefined, "2017-10-09", 150], ["Mac SE/30", "Computer", "Retro shelf", "spare", undefined, "2019-01-19", 310], ["Sun SPARCstation 20", "Workstation", "Garage", "in-use", "Noah Smith", "2020-08-30", 220]]
  .map(([name, type, location, status, holder, bought, cost], i) => ({ id: `AST-${100 + i}`, name: name as string, type: type as string, location: location as string, status: status as Asset["status"], holder: holder as string | undefined, bought: bought as string, cost: cost as number, serial: `JP${(7000 + i * 37).toString(16).toUpperCase()}` }));

/* files */
export type FNode = { id: string; name: string; kind: "folder" | "file"; size?: number; mod: number; spot?: string; children?: FNode[]; ext?: string };
export const fileTree: FNode = { id: "root", name: "Jupiter", kind: "folder", mod: NOW0, children: [
  { id: "d1", name: "Design", kind: "folder", mod: NOW0 - 300, children: [{ id: "f1", name: "tokens.json", kind: "file", size: 1900, mod: NOW0 - 200, ext: "json" }, { id: "f2", name: "icons.svg", kind: "file", size: 92000, mod: NOW0 - 700, spot: "lens", ext: "svg" }, { id: "d1a", name: "Illustrations", kind: "folder", mod: NOW0 - 1500, children: [{ id: "f3", name: "koala.svg", kind: "file", size: 8100, mod: NOW0 - 1400, spot: "koala", ext: "svg" }, { id: "f4", name: "kangaroo.svg", kind: "file", size: 7800, mod: NOW0 - 1300, spot: "kangaroo", ext: "svg" }] }] },
  { id: "d2", name: "Docs", kind: "folder", mod: NOW0 - 900, children: [{ id: "f5", name: "readme.md", kind: "file", size: 4300, mod: NOW0 - 900, ext: "md" }, { id: "f6", name: "invoice-0042.pdf", kind: "file", size: 120000, mod: NOW0 - 2900, ext: "pdf" }] },
  { id: "d3", name: "Firmware", kind: "folder", mod: NOW0 - 4000, children: [{ id: "f7", name: "aquila-0.3.bin", kind: "file", size: 912000, mod: NOW0 - 4000, ext: "bin" }, { id: "f8", name: "bleproxy.factory.bin", kind: "file", size: 1480000, mod: NOW0 - 6000, ext: "bin" }] },
  { id: "f9", name: "notes.txt", kind: "file", size: 640, mod: NOW0 - 60, ext: "txt" },
] };

/* media */
export const media = ["koala", "kangaroo", "wombat", "platypus", "echidna", "emu", "kookaburra", "cockatoo", "magpie", "lorikeet", "tasmanian-devil", "crocodile", "frilled-lizard", "gum-leaf", "banksia", "wattle"].map((spot, i) => ({ id: `m${i}`, spot, name: `${spot}.svg`, kind: i < 7 ? "Mammal" : i < 11 ? "Bird" : i < 13 ? "Reptile" : "Plant", year: 2024 + (i % 3), size: 6000 + i * 330, fav: i % 5 === 0 }));

/* roadmap */
export const roadmap = [["Tokens v1", 0, 3, "Design", "done"], ["Graphics set", 1, 5, "Design", "done"], ["Admin P1", 3, 7, "Product", "done"], ["Admin P2", 6, 12, "Product", "risk"], ["Warehouse kiosks", 5, 9, "Ops", ""], ["HA panel", 8, 10, "Ops", ""], ["ESPHome widgets", 9, 12, "Ops", ""], ["Release automation", 2, 6, "Platform", "done"], ["Cloudflare Pages", 6, 8, "Platform", ""], ["LaTeX templates", 4, 7, "Design", "done"], ["GTK + Slint demos", 7, 10, "Design", ""]].map(([title, start, end, lane, st], i) => ({ id: `r${i}`, title: title as string, start: start as number, end: end as number, lane: lane as string, st: st as string }));

/* org */
export type Person = { id: string; name: string; role: string; team: string; boss: string | null; loc: string; email: string };
export const org: Person[] = [["Ava Nguyen", "CEO", "Exec", null], ["Noah Smith", "Head of Engineering", "Engineering", "Ava Nguyen"], ["Mia Patel", "Head of Operations", "Ops", "Ava Nguyen"], ["Liam Williams", "Design Lead", "Design", "Ava Nguyen"], ["Isla Brown", "Staff Engineer", "Engineering", "Noah Smith"], ["Ethan Evans", "Platform Engineer", "Engineering", "Noah Smith"], ["Zoe Taylor", "Warehouse Manager", "Ops", "Mia Patel"], ["Jack Kelly", "Dock Supervisor", "Ops", "Zoe Taylor"], ["Ruby Moore", "Illustrator", "Design", "Liam Williams"], ["Leo Walker", "Designer", "Design", "Liam Williams"], ["Ella Hughes", "SRE", "Engineering", "Noah Smith"]].map(([name, role, team, boss], i) => ({ id: `o${i}`, name: name as string, role: role as string, team: team as string, boss: boss as string | null, loc: ["Brisbane", "Sydney", "Remote"][i % 3], email: `${(name as string).toLowerCase().replace(" ", ".")}@example.com` }));

/* map */
export const mapPts = Array.from({ length: 36 }, (_, i) => ({ id: `s${i}`, name: `${pick(["Depot", "Site", "Locker", "Hub", "Kiosk"])} ${i + 1}`, x: 40 + r() * 520, y: 30 + r() * 300, kind: pick(["depot", "site", "locker"]), status: pick(["ok", "ok", "ok", "warn", "danger"] as const) }));
export const zones: { id: string; name: string; poly: [number, number][] }[] = [{ id: "z1", name: "Northside", poly: [[60, 40], [300, 30], [320, 150], [90, 170]] }, { id: "z2", name: "CBD", poly: [[320, 150], [440, 140], [450, 250], [310, 260]] }, { id: "z3", name: "Southside", poly: [[90, 200], [300, 260], [330, 340], [60, 330]] }];

/* taxonomy */
export const tagSeed: Tag[] = [["a", "Infrastructure", null, 14], ["b", "Network", "a", 9], ["c", "Wi-Fi", "b", 5], ["d", "VPN", "b", 4], ["e", "Storage", "a", 6], ["f", "Design", null, 11], ["g", "Icons", "f", 8], ["h", "Illustrations", "f", 7], ["i", "Retro", null, 12], ["j", "SGI", "i", 6], ["k", "Mac", "i", 3], ["l", "wifi", "b", 1]].map(([id, name, parent, uses]) => ({ id: id as string, name: name as string, parent: parent as string | null, uses: uses as number }));

/* versions */
export const versionSeed: Version[] = [
  { id: "v1", n: 1, at: "2026-10-01 09:12", by: "Ava Nguyen", note: "First draft", body: "# Runbook: PXE boot\n\n1. Check DHCP lease\n2. Check TFTP\n3. Reboot node" },
  { id: "v2", n: 2, at: "2026-10-14 14:40", by: "Noah Smith", note: "Add iSCSI step", body: "# Runbook: PXE boot\n\n1. Check DHCP lease\n2. Check TFTP\n3. Check iSCSI target\n4. Reboot node" },
  { id: "v3", n: 3, at: "2026-11-02 08:05", by: "Mia Patel", note: "Rename and add rollback", body: "# Runbook: PXE / netboot\n\n1. Check DHCP lease\n2. Check TFTP\n3. Check iSCSI target\n4. Reboot node\n5. Roll back the boot image if it fails" },
  { id: "v4", n: 4, at: "2026-11-09 16:30", by: "Ella Hughes", note: "Clarify timeouts", body: "# Runbook: PXE / netboot\n\n1. Check DHCP lease (30s timeout)\n2. Check TFTP\n3. Check iSCSI target\n4. Reboot node\n5. Roll back the boot image if it fails" },
];

/* leaderboard */
export const lbSeed = people.slice(0, 10).map((name, i) => ({ id: `l${i}`, name, score: [940, 910, 910, 780, 760, 640, 610, 540, 420, 300][i], prev: [900, 870, 930, 700, 790, 600, 650, 500, 430, 280][i] }));

/* changelog */
export type Change = { v: string; date: string; type: "feature" | "fix" | "improvement" | "breaking"; title: string; body: string };
export const changelog: Change[] = [
  { v: "1.1.0", date: "2026-11-12", type: "feature", title: "Warehouse timeslot system", body: "Driver check-in kiosk, dock board and lobby display with live priority ranking." }, { v: "1.1.0", date: "2026-11-12", type: "improvement", title: "Colour-blind-safe chart palette", body: "The first six series stay distinguishable under every colour-vision type." },
  { v: "1.0.2", date: "2026-11-05", type: "fix", title: "Gauge arc above 50%", body: "The arc used the wrong flag and drew a loop." }, { v: "1.0.2", date: "2026-11-05", type: "fix", title: "Sparklines were dashed", body: "A class collision leaked stroke-dasharray." },
  { v: "1.0.0", date: "2026-10-28", type: "feature", title: "Admin template", body: "28 routes covering the core kit." }, { v: "1.0.0", date: "2026-10-28", type: "breaking", title: "Chart series colours", body: "Series 2 and 3 changed from teal/green to amber/teal. Status colours are now reserved." },
];

/* tiles */
export const tiles = [["Front door", "camera", "ok"], ["Driveway", "camera", "ok"], ["Workshop", "camera", "warn"], ["Dock 4", "camera", "ok"], ["Server room", "camera", "danger"], ["Lobby display", "screen", "ok"], ["Kiosk 1", "screen", "ok"], ["Kiosk 2", "screen", "off"], ["Rack temp", "sensor", "ok"]].map(([name, kind, st], i) => ({ id: `t${i}`, name: name as string, kind: kind as string, st: st as string, spot: ["koala", "kangaroo", "wombat", "echidna", "emu", "kookaburra", "cockatoo", "magpie", "lorikeet"][i] }));

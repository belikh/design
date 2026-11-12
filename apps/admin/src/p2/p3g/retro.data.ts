import type { Row } from "./lib.tsx";
export type Machine = Row & { name: string; model: string; year: number; cpu: string; ramMb: number; os: string; status: "Working" | "Restoring" | "Parts" | "Stored"; condition: "Mint" | "Good" | "Fair" | "Poor"; location: string; serial: string };
export const MACHINES = (): Machine[] => [
  { id: "m1", rev: 1, name: "Octane", model: "SGI Octane (R10000)", year: 1997, cpu: "MIPS R10000 250 MHz", ramMb: 512, os: "IRIX 6.5.30", status: "Working", condition: "Good", location: "Shelf A2", serial: "1000145" },
  { id: "m2", rev: 1, name: "O2", model: "SGI O2 (R5000)", year: 1996, cpu: "MIPS R5000 180 MHz", ramMb: 256, os: "IRIX 6.5.22", status: "Restoring", condition: "Fair", location: "Bench", serial: "O2-77310" },
  { id: "m3", rev: 1, name: "Indy", model: "SGI Indy (R4400)", year: 1993, cpu: "MIPS R4400 200 MHz", ramMb: 128, os: "IRIX 6.5.22", status: "Working", condition: "Good", location: "Shelf A1", serial: "IND-4410" },
  { id: "m4", rev: 1, name: "Fuel", model: "SGI Fuel", year: 2004, cpu: "MIPS R16000 700 MHz", ramMb: 2048, os: "IRIX 6.5.30", status: "Stored", condition: "Mint", location: "Cupboard", serial: "FUEL-0092" },
  { id: "m5", rev: 1, name: "Onyx2 (parts)", model: "SGI Onyx2", year: 1997, cpu: "MIPS R10000 195 MHz x4", ramMb: 1024, os: "", status: "Parts", condition: "Poor", location: "Garage", serial: "ONX-2210" },
  { id: "m6", rev: 1, name: "Amiga 1200", model: "Commodore A1200", year: 1992, cpu: "68EC020 14 MHz", ramMb: 2, os: "AmigaOS 3.1", status: "Restoring", condition: "Fair", location: "Bench", serial: "A12-8841" },
];
export type Firmware = Row & { machine: string; item: string; version: string; latest: string; file: string; verified: boolean };
export const FIRMWARE = (): Firmware[] => [
  { id: "f1", rev: 1, machine: "Octane", item: "PROM", version: "6.5.30", latest: "6.5.30", file: "octane-prom-6.5.30.bin", verified: true },
  { id: "f2", rev: 1, machine: "O2", item: "PROM", version: "4.18", latest: "4.18", file: "o2-prom-4.18.bin", verified: true },
  { id: "f3", rev: 1, machine: "Indy", item: "PROM", version: "4.1.9", latest: "4.1.9", file: "", verified: false },
  { id: "f4", rev: 1, machine: "Fuel", item: "PROM", version: "6.5.28", latest: "6.5.30", file: "fuel-prom-6.5.28.bin", verified: true },
  { id: "f5", rev: 1, machine: "Amiga 1200", item: "Kickstart ROM", version: "3.1 (40.068)", latest: "3.2.2", file: "kick31.rom", verified: true },
];
/** "outdated" when the running version differs from the latest known. */
export const fwState = (f: Firmware) => (f.version === f.latest ? "current" : "outdated");
export type Media = Row & { title: string; kind: "Install CD" | "Tape" | "Floppy" | "Manual" | "Software"; format: string; for: string; condition: "Good" | "Fair" | "Poor"; imaged: boolean; sha: string };
export const MEDIA = (): Media[] => [
  { id: "d1", rev: 1, title: "IRIX 6.5.30 Overlays 1-3", kind: "Install CD", format: "CD-ROM (SGI)", for: "Octane", condition: "Good", imaged: true, sha: "9f2c1a7" },
  { id: "d2", rev: 1, title: "IRIX 6.5 Foundation 1", kind: "Install CD", format: "CD-ROM (SGI)", for: "O2", condition: "Fair", imaged: true, sha: "41be77d" },
  { id: "d3", rev: 1, title: "Impressario 1.0", kind: "Software", format: "CD-ROM", for: "Indy", condition: "Good", imaged: false, sha: "" },
  { id: "d4", rev: 1, title: "Workbench 3.1 disk set", kind: "Floppy", format: "880K ADF", for: "Amiga 1200", condition: "Poor", imaged: false, sha: "" },
  { id: "d5", rev: 1, title: "Octane hardware guide", kind: "Manual", format: "Paper", for: "Octane", condition: "Good", imaged: false, sha: "" },
];
export const imagedPct = (m: Media[]) => { const digital = m.filter((x) => x.kind !== "Manual"); return digital.length ? Math.round((digital.filter((x) => x.imaged).length / digital.length) * 100) : 100; };
export type LogEntry = Row & { date: string; machine: string; action: string; notes: string; cost: number };
export const LOG = (): LogEntry[] => [
  { id: "e1", rev: 1, date: "2026-11-09", machine: "O2", action: "Replaced CMOS battery", notes: "Boot time now correct after power cycle.", cost: 6 },
  { id: "e2", rev: 1, date: "2026-11-02", machine: "Amiga 1200", action: "Recapped motherboard", notes: "Tantalum caps swapped; display still rolls on the left edge.", cost: 38 },
  { id: "e3", rev: 1, date: "2026-10-19", machine: "Octane", action: "Cleaned and re-pasted CPU module", notes: "Idle 44 C, was 61 C.", cost: 9 },
  { id: "e4", rev: 1, date: "2026-10-04", machine: "Indy", action: "Replaced PSU fan", notes: "", cost: 21 },
];
export const totalCost = (l: LogEntry[]) => l.reduce((s, e) => s + e.cost, 0);
export const byMachine = (l: LogEntry[], name: string) => l.filter((e) => e.machine === name).sort((a, b) => b.date.localeCompare(a.date));

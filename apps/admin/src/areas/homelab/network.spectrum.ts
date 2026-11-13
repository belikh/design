/** Wi-Fi channel plans for 5 GHz and 6 GHz (20/40/80/160 MHz) with DFS marking, and recommendation over a (fictional) airtime scan. */
export type Band = "2.4 GHz" | "5 GHz" | "6 GHz";
export type Width = 20 | 40 | 80 | 160;
export const WIDTHS: Width[] = [20, 40, 80, 160];
export type Block = { /** 20 MHz channel numbers the block covers, low to high. */ channels: number[]; /** Primary (first) channel and centre channel number. */ primary: number; center: number; width: Width; dfs: boolean };

/** Contiguous runs of 20 MHz channels (step 4) within which wider blocks are aligned from the run start. */
const SEGMENTS: Record<"5 GHz" | "6 GHz", number[][]> = {
  "5 GHz": [[36, 40, 44, 48, 52, 56, 60, 64], [100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144], [149, 153, 157, 161], [165]],
  // 6 GHz (UNII-5..8): channels 1, 5, ..., 233 -> 59 channels; bonding is aligned from channel 1.
  "6 GHz": [Array.from({ length: 59 }, (_, k) => 1 + 4 * k)],
};
/** DFS (radar detection) channels in 5 GHz: UNII-2A and UNII-2C. 6 GHz has none (standard-power outdoor use needs AFC instead). */
export const isDfs = (band: Band, ch: number) => band === "5 GHz" && ch >= 52 && ch <= 144;
export const channels20 = (band: Band): number[] => (band === "2.4 GHz" ? Array.from({ length: 13 }, (_, i) => i + 1) : SEGMENTS[band].flat());
export const supportedWidths = (band: Band): Width[] => (band === "2.4 GHz" ? [20, 40] : WIDTHS);

/** All channel blocks of a width in a band. 2.4 GHz is listed per primary channel (blocks overlap), others are aligned and non-overlapping. */
export function channelPlan(band: Band, width: Width): Block[] {
  if (band === "2.4 GHz") return width > 40 ? [] : channels20(band).filter((c) => width === 20 || c <= 9).map((c) => ({ channels: width === 20 ? [c] : [c, c + 4].filter((x) => x <= 13), primary: c, center: width === 20 ? c : c + 2, width, dfs: false }));
  const span = width / 20; const out: Block[] = [];
  for (const seg of SEGMENTS[band]) for (let i = 0; i + span <= seg.length; i += span) {
    if (seg[i] === 165 && width > 20) continue; const ch = seg.slice(i, i + span);
    out.push({ channels: ch, primary: ch[0], center: (ch[0] + ch[ch.length - 1]) / 2, width, dfs: ch.some((c) => isDfs(band, c)) });
  }
  return out;
}
/** Why a primary channel + width combination is not valid in a band (null when it is). */
export function radioProblem(band: Band, channel: number, width: Width): string | null {
  if (!channels20(band).includes(channel)) return band === "2.4 GHz" ? "2.4 GHz channels are 1 to 13" : band === "5 GHz" ? "Not a 5 GHz channel (36 to 64, 100 to 144, 149 to 165)" : "6 GHz channels are 1, 5, 9 and so on up to 233";
  if (!supportedWidths(band).includes(width)) return `${width} MHz is not usable on ${band}`;
  if (band === "2.4 GHz") return width === 40 && channel > 9 ? "A 40 MHz channel needs a primary of 9 or lower" : null;
  if (!channelPlan(band, width).some((b) => b.channels.includes(channel))) return `Channel ${channel} has no ${width} MHz block`; return null;
}
export const blockLabel = (b: Block) => (b.channels.length === 1 ? `${b.primary}` : `${b.channels[0]} to ${b.channels[b.channels.length - 1]} (centre ${b.center})`);

/** Fictional neighbour airtime (% busy) per 20 MHz channel from a scan. Not real data. */
export const SPECTRUM_5: Record<number, number> = { 36: 62, 40: 55, 44: 30, 48: 28, 52: 12, 56: 10, 60: 9, 64: 8, 100: 6, 104: 5, 108: 7, 112: 6, 116: 4, 120: 3, 124: 3, 128: 4, 132: 5, 136: 4, 140: 3, 144: 2, 149: 48, 153: 44, 157: 21, 161: 18, 165: 9 };
export const SPECTRUM_6: Record<number, number> = Object.fromEntries(Array.from({ length: 59 }, (_, k) => { const c = 1 + 4 * k; return [c, c < 30 ? 22 - (k % 4) * 3 : c < 100 ? 4 + (k % 3) * 2 : c < 180 ? 2 + (k % 2) : 1]; }));
export const SPECTRUM: Record<"5 GHz" | "6 GHz", Record<number, number>> = { "5 GHz": SPECTRUM_5, "6 GHz": SPECTRUM_6 };

/** Mean airtime across a block's channels. */
export const blockLoad = (b: Block, util: Record<number, number>) => Math.round((b.channels.reduce((s, c) => s + (util[c] ?? 0), 0) / b.channels.length) * 10) / 10;
export type Ranked = Block & { load: number };
/** Blocks ranked quietest first; DFS blocks are skipped unless allowed (a radar hit forces a channel change and a 60 s listen before use). */
export function rankBlocks(band: "5 GHz" | "6 GHz", width: Width, util: Record<number, number>, allowDfs: boolean): Ranked[] {
  return channelPlan(band, width).filter((b) => allowDfs || !b.dfs).map((b) => ({ ...b, load: blockLoad(b, util) })).sort((a, b) => a.load - b.load || a.primary - b.primary);
}

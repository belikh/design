export type Track = { id: string; title: string; artist: string; album: string; year: number; sec: number; genre: string; tags: string[]; plays: number; added: string };
export type Playlist = { id: string; name: string; trackIds: string[] };
export const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
export const totalSeconds = (ids: string[], tracks: Track[]) => ids.reduce((a, id) => a + (tracks.find((t) => t.id === id)?.sec ?? 0), 0);
export const fmtTotal = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.floor((s % 3600) / 60)} min` : `${Math.floor(s / 60)} min ${s % 60} s`);
const T = (id: number, title: string, artist: string, album: string, year: number, sec: number, genre: string, tags: string, plays: number): Track => ({ id: `t${id}`, title, artist, album, year, sec, genre, tags: tags.split(" ").filter(Boolean), plays, added: `2026-0${1 + (id % 9)}-${String(1 + ((id * 3) % 27)).padStart(2, "0")}` });
export const TRACKS: Track[] = [
  T(1, "Warm Cathode", "Nine Valves", "Bakelite", 2024, 214, "Electronic", "retro warm", 41), T(2, "Floppy Dawn", "Nine Valves", "Bakelite", 2024, 188, "Electronic", "retro chiptune", 63), T(3, "Brisbane Rain", "Kangaroo Court", "Wet Season", 2023, 251, "Indie", "rain mellow", 88),
  T(4, "Story Bridge at Night", "Kangaroo Court", "Wet Season", 2023, 299, "Indie", "city night", 52), T(5, "IRIX Lullaby", "Indy Indy", "Octane", 2025, 176, "Ambient", "retro calm", 30), T(6, "Hz of Home", "Indy Indy", "Octane", 2025, 342, "Ambient", "calm focus", 77),
  T(7, "ISA Slot Blues", "The XTs", "5160", 2022, 203, "Blues", "retro blues", 19), T(8, "Coax Heart", "The XTs", "5160", 2022, 231, "Blues", "retro slow", 24), T(9, "Magpie Season", "Wombat Radio", "Burrow", 2025, 195, "Folk", "bird spring", 47),
  T(10, "Echidna Waltz", "Wombat Radio", "Burrow", 2025, 262, "Folk", "waltz calm", 35), T(11, "Rack Unit", "Patch Panel", "Cat6", 2024, 228, "Electronic", "focus rhythm", 92), T(12, "Subnet Mask", "Patch Panel", "Cat6", 2024, 207, "Electronic", "focus", 66),
  T(13, "Tang Nano", "FPGA Fridays", "Bitstream", 2026, 183, "Electronic", "retro chiptune", 12), T(14, "Gate Delay", "FPGA Fridays", "Bitstream", 2026, 219, "Electronic", "rhythm", 15), T(15, "Cockatoo Alarm", "Wombat Radio", "Burrow", 2025, 154, "Folk", "bird", 28), T(16, "Long Weekend", "Kangaroo Court", "Wet Season", 2023, 318, "Indie", "mellow calm", 71),
];
export const PLAYLISTS: Playlist[] = [{ id: "p1", name: "Focus", trackIds: ["t6", "t11", "t12", "t5"] }, { id: "p2", name: "Retro evening", trackIds: ["t1", "t2", "t5", "t7", "t13"] }, { id: "p3", name: "Rainy day", trackIds: ["t3", "t16", "t10"] }];
export type Filter = { q: string; genre: string; tag: string; sort: "title" | "plays" | "year" | "added" };
export function filterTracks(tracks: Track[], f: Filter): Track[] {
  const q = f.q.trim().toLowerCase();
  const out = tracks.filter((t) => (f.genre === "all" || t.genre === f.genre) && (f.tag === "all" || t.tags.includes(f.tag)) && (!q || `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q)));
  const by: Record<Filter["sort"], (a: Track, b: Track) => number> = { title: (a, b) => a.title.localeCompare(b.title), plays: (a, b) => b.plays - a.plays, year: (a, b) => b.year - a.year, added: (a, b) => b.added.localeCompare(a.added) };
  return [...out].sort(by[f.sort]);
}
export function validateMeta(t: Pick<Track, "title" | "artist" | "year" | "sec">): Partial<Record<"title" | "artist" | "year" | "sec", string>> {
  const e: Partial<Record<"title" | "artist" | "year" | "sec", string>> = {};
  if (!t.title.trim()) e.title = "Title is required"; if (!t.artist.trim()) e.artist = "Artist is required";
  if (!Number.isInteger(t.year) || t.year < 1900 || t.year > 2100) e.year = "Year must be between 1900 and 2100"; if (t.sec <= 0 || t.sec > 3 * 3600) e.sec = "Duration must be between 1 second and 3 hours";
  return e;
}
export const allTags = (tracks: Track[]) => [...new Set(tracks.flatMap((t) => t.tags))].sort();
export const move = <T,>(a: T[], from: number, to: number) => { const c = [...a]; if (to < 0 || to >= c.length) return c; const [x] = c.splice(from, 1); c.splice(to, 0, x); return c; };

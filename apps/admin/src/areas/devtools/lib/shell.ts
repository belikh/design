/**
 * Command interpreter for the simulated shell: runs a parsed pipeline against the virtual filesystem and returns text and an exit code.
 * Pure and deterministic (the clock is fixed), so it is easy to test and to record. Nothing here touches a real system.
 */
import { parseLine } from "./tokenize.ts";
import { buildFs, getNode, listDir, nodeSize, resolvePath, type VNode } from "./vfs.ts";

export type Host = { id: string; name: string; user: string; os: string };
export const HOSTS: Host[] = [
  { id: "edge-gw", name: "edge-gw", user: "admin", os: "Linux 6.8 aarch64" },
  { id: "nas", name: "nas", user: "root", os: "Linux 6.6 x86_64" },
  { id: "hass", name: "hass", user: "homeassistant", os: "Linux 6.12 x86_64" },
];

export type ShellState = { cwd: string; env: Record<string, string>; history: string[]; lastExit: number };
export const homeOf = (h: Host) => (h.user === "root" ? "/root" : `/home/${h.user}`);
export function initState(h: Host): ShellState {
  const home = homeOf(h);
  return { cwd: home, history: [], lastExit: 0, env: { USER: h.user, HOME: home, HOSTNAME: h.name, SHELL: "/bin/bash", TERM: "xterm-256color", PATH: "/usr/local/bin:/usr/bin:/bin", LANG: "en_AU.UTF-8" } };
}
/** Each host has its own filesystem; root's home is added for the root user. */
export function fsFor(h: Host): VNode {
  const fs = buildFs(h);
  if (h.user === "root" && fs.t === "d") fs.kids.root = { t: "d", kids: { "notes.txt": { t: "f", data: "rotate keys on friday" } } };
  return fs;
}
export const prompt = (h: Host, s: Pick<ShellState, "cwd">) => `${h.user}@${h.name}:${s.cwd.startsWith(homeOf(h)) ? `~${s.cwd.slice(homeOf(h).length)}` : s.cwd}$ `;

export type RunResult = { out: string; code: number; clear?: boolean; exit?: boolean; state: ShellState };
type Ctx = { host: Host; fs: VNode; state: ShellState; args: string[]; stdin: string | null; piped: boolean };
type CmdOut = { out?: string; err?: string; code?: number; cwd?: string; clear?: boolean; exit?: boolean; env?: Record<string, string>; history?: string[] };
type Cmd = (c: Ctx) => CmdOut;

const NOW = "Thu Nov 12 17:52:00 AEDT 2026";
const lines = (s: string) => (s === "" ? [] : s.replace(/\n$/, "").split("\n"));
const resolve = (c: Ctx, p: string) => resolvePath(c.state.cwd, p, c.state.env.HOME ?? "/");
const bad = (cmd: string, opt: string): CmdOut => ({ err: `${cmd}: invalid option -- '${opt}'`, code: 2 });

/** Split `args` into flags (`-abc`) and operands. Returns an offending flag when it is not in `allowed`. */
function flags(args: string[], allowed: string): { f: Set<string>; rest: string[]; bad?: string } {
  const f = new Set<string>(); const rest: string[] = []; let done = false;
  for (const a of args) {
    if (!done && a === "--") { done = true; continue; }
    if (!done && /^-[A-Za-z]+$/.test(a)) { for (const ch of a.slice(1)) { if (!allowed.includes(ch)) return { f, rest, bad: ch }; f.add(ch); } } else rest.push(a);
  }
  return { f, rest };
}
/** Read text for head/tail/grep/cat/wc from files or stdin. */
function inputs(c: Ctx, cmd: string, files: string[]): { text: string; err?: string; code?: number } {
  if (!files.length) return c.stdin === null ? { text: "", err: `${cmd}: missing file operand`, code: 1 } : { text: c.stdin };
  let text = ""; let err = ""; let code = 0;
  for (const p of files) {
    const n = getNode(c.fs, resolve(c, p));
    if (!n) { err += `${cmd}: ${p}: No such file or directory\n`; code = 1; } else if (n.t === "d") { err += `${cmd}: ${p}: Is a directory\n`; code = 1; } else text += n.data.endsWith("\n") ? n.data : n.data + "\n";
  }
  return { text, err: err.replace(/\n$/, "") || undefined, code };
}
const count = (a: string[], cmd: string): { n: number; rest: string[]; err?: CmdOut } => {
  let n = 10; const rest: string[] = [];
  for (let i = 0; i < a.length; i++) {
    const m = /^-(\d+)$/.exec(a[i]);
    if (a[i] === "-n") { const v = a[++i]; if (v === undefined || !/^\d+$/.test(v)) return { n, rest, err: { err: `${cmd}: invalid number of lines: '${v ?? ""}'`, code: 1 } }; n = Number(v); } else if (m) n = Number(m[1]); else rest.push(a[i]);
  }
  return { n, rest };
};

const COMMANDS: Record<string, Cmd> = {
  help: () => ({ out: "Commands: cd ls cat grep head tail wc echo pwd env export history clear help uname ps df uptime whoami hostname date true false exit\nSyntax: quotes ('..' \"..\"), $VAR and $?, and pipes (cmd | cmd). Tab completes, Up/Down recall history, Ctrl+C cancels, Ctrl+L clears." }),
  whoami: (c) => ({ out: c.host.user }),
  hostname: (c) => ({ out: c.host.name }),
  pwd: (c) => ({ out: c.state.cwd }),
  date: () => ({ out: NOW }),
  true: () => ({ code: 0 }),
  false: () => ({ code: 1 }),
  clear: () => ({ clear: true }),
  exit: (c) => { const n = c.args[0] === undefined ? c.state.lastExit : Number(c.args[0]); return Number.isInteger(n) ? { exit: true, code: n & 255 } : { err: `exit: ${c.args[0]}: numeric argument required`, code: 2, exit: true }; },
  uname: (c) => { const { f, bad: b } = flags(c.args, "asrmn"); if (b) return bad("uname", b); const [s, r, m] = [ "Linux", c.host.os.split(" ")[1], c.host.os.split(" ")[2]]; return { out: f.has("a") ? `${s} ${c.host.name} ${r} #1 SMP ${m} GNU/Linux` : f.has("r") ? r : f.has("m") ? m : f.has("n") ? c.host.name : s }; },
  uptime: () => ({ out: " 17:52:00 up 41 days,  3:12,  1 user,  load average: 0.21, 0.30, 0.28" }),
  df: (c) => { const { bad: b } = flags(c.args, "h"); return b ? bad("df", b) : { out: "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda2       118G   41G   72G  37% /\n/dev/sdb1       3.6T  3.3T  330G  91% /srv" }; },
  ps: (c) => ({ out: `  PID TTY          TIME CMD\n    1 ?        00:00:03 systemd\n  290 ?        00:00:00 sshd\n  311 ?        00:00:00 cron\n  402 pts/0    00:00:00 bash\n  ${600 + c.state.history.length} pts/0    00:00:00 ps` }),
  env: (c) => ({ out: Object.entries(c.state.env).filter(([k]) => k !== "?").sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n") }),
  export: (c) => {
    const env = { ...c.state.env };
    for (const a of c.args) { const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/s.exec(a); if (!m) { if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(a)) return { err: `export: \`${a}': not a valid identifier`, code: 1 }; continue; } env[m[1]] = m[2]; }
    return { env };
  },
  echo: (c) => { const n = c.args[0] === "-n"; return { out: c.args.slice(n ? 1 : 0).join(" ") }; },
  history: (c) => {
    if (c.args[0] === "-c") return { history: [] };
    const h = c.state.history; return { out: h.map((l, i) => `${String(i + 1).padStart(5)}  ${l}`).join("\n") };
  },
  cd: (c) => {
    const p = c.args[0] ?? c.state.env.HOME ?? "/"; const full = resolve(c, p); const n = getNode(c.fs, full);
    return !n ? { err: `cd: ${p}: No such file or directory`, code: 1 } : n.t === "f" ? { err: `cd: ${p}: Not a directory`, code: 1 } : { cwd: full };
  },
  ls: (c) => {
    const { f, rest, bad: b } = flags(c.args, "alh1"); if (b) return bad("ls", b);
    const targets = rest.length ? rest : ["."]; const parts: string[] = []; let err = ""; let code = 0;
    const row = (name: string, n: VNode) => (f.has("l") ? `${n.t === "d" ? "drwxr-xr-x" : "-rw-r--r--"} 1 ${c.host.user} ${c.host.user} ${String(nodeSize(n)).padStart(5)} Nov 12 17:40 ${name}` : name);
    for (const t of targets) {
      const n = getNode(c.fs, resolve(c, t));
      if (!n) { err += `ls: cannot access '${t}': No such file or directory\n`; code = 2; continue; }
      const rows = n.t === "f" ? [row(t, n)] : [...(f.has("a") ? [row(".", n), row("..", n)] : []), ...listDir(n, f.has("a")).map((e) => row(e.name, e.node))];
      const body = f.has("l") || f.has("1") || c.piped ? rows.join("\n") : rows.join("  ");
      parts.push(targets.length > 1 && n.t === "d" ? `${t}:\n${body}` : body);
    }
    return { out: parts.filter((p) => p !== "").join("\n\n"), err: err.replace(/\n$/, "") || undefined, code };
  },
  cat: (c) => { const { rest, bad: b } = flags(c.args, ""); if (b) return bad("cat", b); const r = inputs(c, "cat", rest); return { out: r.text.replace(/\n$/, ""), err: r.err, code: r.code ?? 0 }; },
  head: (c) => { const k = count(c.args, "head"); if (k.err) return k.err; const r = inputs(c, "head", k.rest); return { out: lines(r.text).slice(0, k.n).join("\n"), err: r.err, code: r.code ?? 0 }; },
  tail: (c) => { const k = count(c.args, "tail"); if (k.err) return k.err; const r = inputs(c, "tail", k.rest); const l = lines(r.text); return { out: (k.n === 0 ? [] : l.slice(-k.n)).join("\n"), err: r.err, code: r.code ?? 0 }; },
  wc: (c) => {
    const { f, rest, bad: b } = flags(c.args, "lwc"); if (b) return bad("wc", b); const r = inputs(c, "wc", rest); const l = lines(r.text).length, w = r.text.split(/\s+/).filter(Boolean).length, ch = r.text.length;
    const all = !f.size; const v = [(all || f.has("l")) && l, (all || f.has("w")) && w, (all || f.has("c")) && ch].filter((x) => x !== false);
    return { out: v.join(" "), err: r.err, code: r.code ?? 0 };
  },
  grep: (c) => {
    const { f, rest, bad: b } = flags(c.args, "ivnc"); if (b) return bad("grep", b);
    if (!rest.length) return { err: "Usage: grep [-ivnc] PATTERN [FILE]...", code: 2 };
    let re: RegExp; try { re = new RegExp(rest[0], f.has("i") ? "i" : ""); } catch { return { err: `grep: invalid regular expression: ${rest[0]}`, code: 2 }; }
    const files = rest.slice(1); const multi = files.length > 1; const out: string[] = []; let total = 0; let err = ""; let code = 0;
    const scan = (name: string | null, text: string) => {
      let n = 0;
      lines(text).forEach((l, i) => { if (re.test(l) !== f.has("v")) { n++; if (!f.has("c")) out.push(`${multi && name ? `${name}:` : ""}${f.has("n") ? `${i + 1}:` : ""}${l}`); } });
      total += n; if (f.has("c")) out.push(`${multi && name ? `${name}:` : ""}${n}`);
    };
    if (!files.length) { if (c.stdin === null) return { err: "grep: missing file operand", code: 2 }; scan(null, c.stdin); } else for (const p of files) { const r = inputs(c, "grep", [p]); if (r.err) { err += `${r.err}\n`; code = 2; } else scan(p, r.text); }
    return { out: out.join("\n"), err: err.replace(/\n$/, "") || undefined, code: code || (total > 0 ? 0 : 1) };
  },
};
for (const k of ["sudo", "rm", "mv", "cp", "touch", "mkdir", "chmod", "reboot", "shutdown", "kill", "apt"]) COMMANDS[k] = () => ({ err: `${k}: not permitted in a recorded demo session`, code: 1 });
export const COMMAND_NAMES = Object.keys(COMMANDS).sort();

/** Run one command line. `state.history` must already include the line (bash adds it before running). */
export function run(host: Host, fs: VNode, state: ShellState, line: string): RunResult {
  const parsed = parseLine(line, { ...state.env, "?": String(state.lastExit) });
  if (!parsed.ok) return { out: `bash: ${parsed.error}`, code: 2, state: { ...state, lastExit: 2 } };
  if (!parsed.pipeline.length) return { out: "", code: state.lastExit, state };
  let st = state; let stdin: string | null = null; let stderr: string[] = []; let out = ""; let code = 0; let clear = false; let exit = false;
  parsed.pipeline.forEach((argv, i) => {
    const last = i === parsed.pipeline.length - 1; const fn = COMMANDS[argv[0]];
    let r: CmdOut;
    if (!fn) r = { err: `bash: ${argv[0]}: command not found`, code: 127 };
    else r = fn({ host, fs, state: st, args: argv.slice(1), stdin, piped: !last });
    if (r.err) stderr.push(r.err);
    code = r.code ?? 0; out = r.out ?? "";
    if (parsed.pipeline.length === 1) { if (r.clear) clear = true; if (r.exit) exit = true; }
    st = { ...st, cwd: r.cwd ?? st.cwd, env: r.env ?? st.env, history: r.history ?? st.history };
    stdin = out;
  });
  const text = [...stderr, ...(out ? [out] : [])].join("\n");
  return { out: text, code, clear, exit, state: { ...st, lastExit: code } };
}

/** Tab completion for the text before the cursor. Returns the new buffer and, when ambiguous, the candidate list. */
export function complete(fs: VNode, state: ShellState, buf: string): { buf: string; options: string[] } {
  const m = /(^|[\s|])([^\s|]*)$/.exec(buf)!; const word = m[2]; const head = buf.slice(0, buf.length - word.length);
  const isCmd = /^\s*$/.test(head.replace(/^.*\|/, ""));
  let cands: { name: string; dir: boolean }[]; let prefix = "";
  if (isCmd && !word.includes("/")) cands = COMMAND_NAMES.filter((n) => n.startsWith(word)).map((name) => ({ name, dir: false }));
  else {
    const slash = word.lastIndexOf("/"); prefix = word.slice(0, slash + 1); const part = word.slice(slash + 1);
    const dir = getNode(fs, resolvePath(state.cwd, prefix || ".", state.env.HOME ?? "/"));
    cands = dir ? listDir(dir, part.startsWith(".")).filter((e) => e.name.startsWith(part)).map((e) => ({ name: e.name, dir: e.node.t === "d" })) : [];
  }
  const part = word.slice(prefix.length);
  if (!cands.length) return { buf, options: [] };
  if (cands.length === 1) { const c = cands[0]; return { buf: head + prefix + c.name + (c.dir ? "/" : " "), options: [] }; }
  let common = cands[0].name; for (const c of cands) { let i = 0; while (i < common.length && i < c.name.length && common[i] === c.name[i]) i++; common = common.slice(0, i); }
  return { buf: head + prefix + (common.length > part.length ? common : part), options: cands.map((c) => c.name + (c.dir ? "/" : "")) };
}

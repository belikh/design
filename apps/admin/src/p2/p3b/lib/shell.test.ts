import { describe, it, expect } from "vitest";
import { parseLine } from "./tokenize.ts";
import { buildFs, getNode, resolvePath, listDir } from "./vfs.ts";
import { HOSTS, complete, fsFor, initState, run } from "./shell.ts";
import { SimShell } from "./simshell.ts";
import { Screen, renderAt } from "./term.ts";

const h = HOSTS[0]; const fs = fsFor(h);
const sh = (line: string, st = initState(h)) => run(h, fs, { ...st, history: [...st.history, line] }, line);
const ok = (p: ReturnType<typeof parseLine>) => { if (!p.ok) throw new Error(p.error); return p.pipeline; };

describe("tokenize", () => {
  it("splits words, honours quotes and escapes", () => {
    expect(ok(parseLine(`echo "a b" 'c  d' e\\ f ""`, {}))).toEqual([["echo", "a b", "c  d", "e f", ""]]);
    expect(ok(parseLine(`echo "say \\"hi\\"" 'it''s'`, {}))).toEqual([["echo", 'say "hi"', "its"]]);
  });
  it("expands variables except in single quotes, plus $?", () => {
    expect(ok(parseLine("echo $A \"$A-${B}\" '$A' $? $NOPE \"$NOPE\" x", { A: "1", B: "2", "?": "7" }))).toEqual([["echo", "1", "1-2", "$A", "7", "", "x"]]);
  });
  it("splits pipelines and reports syntax errors", () => {
    expect(ok(parseLine("cat a | grep b | wc -l", {}))).toEqual([["cat", "a"], ["grep", "b"], ["wc", "-l"]]);
    expect(ok(parseLine('echo "a|b"', {}))).toEqual([["echo", "a|b"]]);
    expect(parseLine("| cat", {}).ok).toBe(false); expect(parseLine("cat |", {}).ok).toBe(false); expect(parseLine('echo "oops', {}).ok).toBe(false);
    expect(ok(parseLine("   ", {}))).toEqual([]); expect(ok(parseLine("ls # comment", {}))).toEqual([["ls"]]);
  });
});

describe("vfs", () => {
  it("normalises paths and lists directories", () => {
    expect(resolvePath("/a/b", "../c/./d")).toBe("/a/c/d"); expect(resolvePath("/", "../..")).toBe("/"); expect(resolvePath("/x", "~/q", "/home/u")).toBe("/home/u/q");
    const f = buildFs(h); expect(listDir(getNode(f, "/")!).map((e) => e.name)).toContain("etc"); expect(getNode(f, "/etc/hostname")).toEqual({ t: "f", data: "edge-gw" }); expect(getNode(f, "/nope/x")).toBeUndefined();
    expect(listDir(getNode(f, "/home/admin")!).map((e) => e.name)).not.toContain(".profile"); expect(listDir(getNode(f, "/home/admin")!, true).map((e) => e.name)).toContain(".profile");
  });
});

describe("commands", () => {
  it("navigates and lists", () => {
    const r = sh("cd /var/log"); expect(r.state.cwd).toBe("/var/log"); expect(r.code).toBe(0);
    expect(sh("ls /var/log").out).toBe("auth.log  syslog"); expect(sh("ls -l /etc/hostname").out).toMatch(/^-rw-r--r-- 1 admin admin\s+\d+ Nov 12 17:40 \/etc\/hostname$/);
    expect(sh("cd /nope").code).toBe(1); expect(sh("cd /etc/motd").out).toMatch(/Not a directory/); expect(sh("cd").state.cwd).toBe("/home/admin"); expect(sh("pwd").out).toBe("/home/admin");
  });
  it("cat, head, tail, grep and wc work on files and pipes", () => {
    expect(sh("cat /etc/hostname").out).toBe("edge-gw");
    expect(sh("head -n 2 /var/log/syslog").out.split("\n")).toHaveLength(2); expect(sh("tail -2 /var/log/syslog").out).toContain("Cleanup of Temporary");
    expect(sh("grep -c kernel /var/log/syslog").out).toBe("2"); expect(sh("grep -n -i BACKUP /var/log/syslog").out).toMatch(/^8:.*backup/m);
    const p = sh("cat /var/log/syslog | grep kernel"); expect(p.out.split("\n")).toHaveLength(2); expect(p.code).toBe(0);
    expect(sh("cat /var/log/syslog | grep kernel | wc -l").out).toBe("2"); expect(sh("ls /var/log | wc -l").out).toBe("2");
    expect(sh('echo "hello   world" | grep -v zzz').out).toBe("hello   world");
  });
  it("sets exit codes and $?", () => {
    expect(sh("nope").code).toBe(127); expect(sh("nope").out).toMatch(/command not found/); expect(sh("grep zzz /etc/hostname").code).toBe(1); expect(sh("cat /missing").code).toBe(1);
    expect(sh("false").code).toBe(1); expect(sh("true").code).toBe(0); expect(sh("rm x").code).toBe(1); expect(sh("grep (").code).toBe(2);
    const a = sh("false"); expect(sh("echo $?", a.state).out).toBe("1"); expect(sh("echo $?", sh("echo hi").state).out).toBe("0");
    expect(sh("exit 3")).toMatchObject({ exit: true, code: 3 }); expect(sh("cat |").code).toBe(2);
  });
  it("env, export, history, clear, uname", () => {
    expect(sh("env").out).toContain("USER=admin"); const e = sh("export FOO=bar baz=1"); expect(sh('echo "[$FOO]"', e.state).out).toBe("[bar]");
    expect(sh("history", { ...initState(h), history: ["ls"] }).out).toContain("history"); expect(sh("clear").clear).toBe(true); expect(sh("uname -r").out).toBe("6.8"); expect(sh("uname -a").out).toContain("edge-gw");
    expect(sh("history -c").state.history).toEqual([]); expect(sh("ls -z").code).toBe(2);
  });
});

describe("completion", () => {
  const st = initState(h);
  it("completes commands, paths and lists ambiguity", () => {
    expect(complete(fs, st, "uptim")).toEqual({ buf: "uptime ", options: [] }); expect(complete(fs, st, "cat /etc/ho").buf).toBe("cat /etc/hostname ");
    expect(complete(fs, st, "cd /v").buf).toBe("cd /var/"); expect(complete(fs, st, "cat /var/log/").options).toEqual(["auth.log", "syslog"]); expect(complete(fs, st, "cat /var/log/s").buf).toBe("cat /var/log/syslog ");
    const r = complete(fs, st, "h"); expect(r.options).toEqual(["head", "help", "history", "hostname"]); expect(r.buf).toBe("h"); expect(complete(fs, st, "cat zzz")).toEqual({ buf: "cat zzz", options: [] });
    expect(complete(fs, st, "cat a | gre").buf).toBe("cat a | grep "); expect(complete(fs, st, "cat n").buf).toBe("cat notes.txt ");
  });
});

describe("SimShell terminal behaviour", () => {
  const term = (...chunks: string[]) => { const s = new SimShell(h); const sc = new Screen(); sc.write(s.start()); for (const c of chunks) sc.write(s.feed(c).out); return { s, text: sc.text() }; };
  it("echoes, edits and runs a line", () => {
    const { text } = term("whoamx", "\x7f", "i", "\r"); expect(text).toContain("admin@edge-gw:~$ whoami\nadmin\nadmin@edge-gw:~$ ");
  });
  it("recalls history with Up/Down", () => {
    const { text } = term("pwd\r", "echo hi\r", "\x1b[A", "\x1b[A", "\x1b[B"); expect(text.split("\n").at(-1)).toBe("admin@edge-gw:~$ echo hi");
    expect(term("pwd\r", "\x1b[A", "\x1b[B").text.split("\n").at(-1)).toBe("admin@edge-gw:~$ "); expect(term("ab", "\x1b[A", "\x1b[").text).toContain("ab"); // split escape sequences are tolerated
  });
  it("completes with Tab and lists options", () => {
    expect(term("cat /etc/mo", "\t").text.split("\n").at(-1)).toBe("admin@edge-gw:~$ cat /etc/motd "); const t = term("cat /var/log/", "\t").text; expect(t).toContain("auth.log  syslog"); expect(t.split("\n").at(-1)).toBe("admin@edge-gw:~$ cat /var/log/");
  });
  it("Ctrl+C cancels the line, Ctrl+L clears the screen, Ctrl+D exits", () => {
    expect(term("rm -rf /", "\x03").text).toContain("rm -rf /^C"); expect(term("rm -rf /", "\x03").s.feed("\r").out).toBe("\r\nadmin@edge-gw:~$ ");
    const c = term("pwd\r", "ec", "\x0c"); expect(c.text).toBe("admin@edge-gw:~$ ec"); const d = new SimShell(h); d.start(); expect(d.feed("\x04")).toEqual({ out: "logout\r\n", closed: true });
    expect(term("ec", "\x04").s.feed("").closed).toBe(false); const x = new SimShell(h); expect(x.feed("exit\r").closed).toBe(true);
  });
  it("tracks cwd in the prompt and the clear command", () => {
    expect(term("cd /var/log\r").text.split("\n").at(-1)).toBe("admin@edge-gw:/var/log$ "); expect(term("cd ~/todo\r").text.split("\n").at(-1)).toBe("admin@edge-gw:~/todo$ "); expect(term("pwd\r", "clear\r").text).toBe("admin@edge-gw:~$ ");
  });
});

describe("terminal emulator", () => {
  it("handles CR, backspace, erase and clear", () => {
    const s = new Screen(); s.write("abc\rX\n12\b3\x1b[K\r\nq\x1b[31mred\x1b[0m"); expect(s.text()).toBe("Xbc\n13\nqred");
    s.write("\x1b[2J\x1b[Hz"); expect(s.text()).toBe("z"); const t = new Screen(); t.write("ab\x1b[1;1H\x1b[Kcd"); expect(t.text()).toBe("cd");
    expect(renderAt([{ t: 0, k: "o", s: "a" }, { t: 5, k: "i", s: "zzz" }, { t: 10, k: "o", s: "b" }], 7)).toBe("a");
  });
});

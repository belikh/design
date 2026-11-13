/** A tiny in-memory filesystem for the simulated shell. Immutable once built; nothing touches a real disk. */
export type VNode = { t: "d"; kids: Record<string, VNode> } | { t: "f"; data: string };
const d = (kids: Record<string, VNode> = {}): VNode => ({ t: "d", kids });
const f = (data: string): VNode => ({ t: "f", data });

const syslog = (host: string) => [
  "Nov 12 17:40:01 {h} CRON[311]: (root) CMD (run-parts /etc/cron.hourly)",
  "Nov 12 17:41:12 {h} kernel: eth0: link up, 1000 Mbps full duplex",
  "Nov 12 17:42:30 {h} systemd[1]: Started Daily apt download activities.",
  "Nov 12 17:44:02 {h} sshd[290]: Server listening on 0.0.0.0 port 22.",
  "Nov 12 17:45:19 {h} kernel: usb 1-1: new high-speed USB device number 4",
  "Nov 12 17:46:51 {h} dhclient[188]: DHCPREQUEST for 10.0.4.21 on eth0",
  "Nov 12 17:47:03 {h} dhclient[188]: bound to 10.0.4.21 -- renewal in 1750 seconds.",
  "Nov 12 17:49:44 {h} CRON[402]: (root) CMD (/usr/local/bin/backup.sh)",
  "Nov 12 17:50:10 {h} backup.sh[403]: error: /srv/backups is 91% full",
  "Nov 12 17:51:30 {h} systemd[1]: Starting Cleanup of Temporary Directories...",
].join("\n").replaceAll("{h}", host);

export function buildFs(host: { name: string; user: string; os: string }): VNode {
  const home = `home`;
  return d({
    etc: d({
      hostname: f(host.name),
      passwd: f(`root:x:0:0:root:/root:/bin/bash\n${host.user}:x:1000:1000:${host.user}:/home/${host.user}:/bin/bash\nsshd:x:110:65534::/run/sshd:/usr/sbin/nologin`),
      fstab: f("UUID=a1b2 /    ext4 defaults 0 1\nUUID=c3d4 /srv ext4 defaults 0 2"),
      motd: f("Authorised use only. Sessions are recorded."),
      "os-release": f(`PRETTY_NAME="${host.os}"\nID=debian`),
    }),
    [home]: d({ [host.user]: d({ "notes.txt": f("rotate keys on friday\nrenew tls cert\ncheck backup disk usage\nreplace psu fan"), ".profile": f("export EDITOR=vi"), todo: d({ "ports.txt": f("22 ssh\n80 http\n443 https\n1883 mqtt") }) }) }),
    var: d({ log: d({ syslog: f(syslog(host.name)), "auth.log": f(`Nov 12 17:38:20 ${host.name} sshd[290]: Accepted publickey for ${host.user}\nNov 12 17:30:02 ${host.name} sshd[281]: Failed password for invalid user test`) }) }),
    srv: d({ media: d({ "films.idx": f("12 entries") }), backups: d({ "daily.tar.gz": f("(binary)"), "weekly.tar.gz": f("(binary)") }) }),
    tmp: d(),
  });
}

/** Normalise `p` against `cwd`; `~` is the user's home. Always returns an absolute path without `.`/`..`/double slashes. */
export function resolvePath(cwd: string, p: string, home = "/"): string {
  const raw = p === "~" ? home : p.startsWith("~/") ? `${home}/${p.slice(2)}` : p;
  const parts = (raw.startsWith("/") ? raw : `${cwd}/${raw}`).split("/").filter((x) => x && x !== ".");
  const out: string[] = [];
  for (const x of parts) { if (x === "..") out.pop(); else out.push(x); }
  return `/${out.join("/")}`;
}

export function getNode(root: VNode, path: string): VNode | undefined {
  let n: VNode = root;
  for (const seg of path.split("/").filter(Boolean)) { if (n.t !== "d") return undefined; const k = n.kids[seg]; if (!k) return undefined; n = k; }
  return n;
}

export const nodeSize = (n: VNode) => (n.t === "f" ? n.data.length : 4096);

/** Names in a directory, directories first is NOT applied: plain sorted order like `ls`. Hidden entries only when `all`. */
export function listDir(n: VNode, all = false): { name: string; node: VNode }[] {
  if (n.t !== "d") return [];
  return Object.keys(n.kids).filter((k) => all || !k.startsWith(".")).sort().map((name) => ({ name, node: n.kids[name] }));
}

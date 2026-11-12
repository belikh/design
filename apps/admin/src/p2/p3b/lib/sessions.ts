import { makeRecording, Recorder, type Recording } from "./asciicast.ts";
import { HOSTS, type Host } from "./shell.ts";
import { SimShell } from "./simshell.ts";

/** Build a recording by typing `cmds` into a simulated shell with human-ish delays, exactly as a live session would record. */
export function scriptSession(host: Host, started: string, timestamp: number, cmds: string[], id: string): Recording {
  let clock = 0; const rec = new Recorder(() => clock); const sh = new SimShell(host);
  clock = 0; rec.add("o", sh.start());
  clock = 600;
  for (const c of cmds) {
    for (const ch of c) { clock += 70 + ((ch.charCodeAt(0) * 13) % 60); rec.add("i", ch); const r = sh.feed(ch); clock += 3; rec.add("o", r.out); }
    clock += 160; rec.add("i", "\r"); const r = sh.feed("\r"); clock += 40; rec.add("o", r.out);
    if (r.closed) break; clock += 900;
  }
  return makeRecording({ id, host: host.id, user: host.user, started, timestamp, events: rec.events });
}

export const SEED_RECORDINGS: Recording[] = [
  scriptSession(HOSTS[0], "2026-11-11 09:14:02", 1794345242, ["whoami", "uptime", "ls /var/log", "grep -i failed /var/log/auth.log", "exit"], "rec-1"),
  scriptSession(HOSTS[1], "2026-11-12 11:30:45", 1794483045, ["df | grep srv", "cd /srv", "ls | wc -l", "ps", "exit"], "rec-2"),
];

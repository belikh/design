/**
 * Shell line parsing for the simulated shell: quoting, escapes, $VAR / ${VAR} / $? expansion and pipes.
 * Pure: no I/O. Globbing, redirection, subshells and `;`/`&&` lists are deliberately not supported.
 */
export type Parsed = { ok: true; pipeline: string[][] } | { ok: false; error: string };

const NAME = /[A-Za-z0-9_]/;

/** Split a command line into a pipeline (an array of argv arrays). `env.?` holds the last exit status. */
export function parseLine(line: string, env: Record<string, string>): Parsed {
  const pipeline: string[][] = [];
  let argv: string[] = [];
  let cur = "";
  let started = false; // a word is open (so "" yields an empty argument)
  let quote: "'" | '"' | null = null;

  const expand = (i: number): number => {
    // line[i] === "$"; append the expansion to `cur`, return the index of the last char consumed
    const n = line[i + 1];
    if (n === "?") { cur += env["?"] ?? "0"; return i + 1; }
    if (n === "{") {
      const end = line.indexOf("}", i + 2);
      if (end < 0) { cur += "$"; return i; }
      cur += env[line.slice(i + 2, end)] ?? ""; return end;
    }
    if (n !== undefined && NAME.test(n) && !/[0-9]/.test(n)) {
      let j = i + 1;
      while (j < line.length && NAME.test(line[j])) j++;
      cur += env[line.slice(i + 1, j)] ?? ""; return j - 1;
    }
    cur += "$"; return i;
  };
  const endWord = () => { if (started) argv.push(cur); cur = ""; started = false; };

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote === "'") { if (ch === "'") quote = null; else cur += ch; continue; }
    if (quote === '"') {
      if (ch === '"') quote = null;
      else if (ch === "\\" && i + 1 < line.length && '"\\$`'.includes(line[i + 1])) cur += line[++i];
      else if (ch === "$") i = expand(i);
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') { quote = ch; started = true; continue; }
    if (ch === "\\") { if (i + 1 < line.length) { cur += line[++i]; started = true; } continue; }
    if (ch === "$") { const before = cur.length; i = expand(i); if (cur.length > before) started = true; continue; } // an empty unquoted expansion vanishes
    if (ch === "#" && !started) break; // comment to end of line
    if (ch === "|") {
      endWord();
      if (argv.length === 0) return { ok: false, error: "syntax error near unexpected token `|'" };
      pipeline.push(argv); argv = []; continue;
    }
    if (/\s/.test(ch)) { endWord(); continue; }
    cur += ch; started = true;
  }
  if (quote) return { ok: false, error: `unexpected EOF while looking for matching \`${quote}'` };
  endWord();
  if (argv.length) pipeline.push(argv);
  else if (pipeline.length) return { ok: false, error: "syntax error: unexpected end of line after `|'" };
  return { ok: true, pipeline };
}

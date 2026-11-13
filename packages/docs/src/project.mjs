// Load config + pages and run validation: the shared first step of every command.
import { existsSync } from "node:fs";
import { loadConfig } from "./config.mjs";
import { loadPages, sortedNav } from "./source.mjs";
import { checkProject } from "./check.mjs";

export function loadProject(configFile) {
  const { config, root, errors } = loadConfig(configFile);
  if (!config) return { errors, warnings: [] };
  if (!existsSync(`${root}/${config.src}`)) return { errors: [...errors, `${config.src}: source folder not found (run: jupiter-docs init)`], warnings: [] };
  const pages = loadPages(root, config);
  const res = checkProject({ config, root, pages });
  return { config, root, pages, nav: sortedNav(pages, config), glossaryPage: res.glossaryPage, errors: [...errors, ...res.errors], warnings: res.warnings };
}

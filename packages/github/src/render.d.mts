export type Scheme = "light" | "dark";
export type Status = "ok" | "warn" | "danger" | "info" | "accent" | "neutral";
export interface GithubTheme { name: string; version: string; color: Record<Scheme, Record<string, string>>; font: { sans: string; mono: string }; radius: { sm: number; md: number } }
export interface TextOpts { title?: string; subtitle?: string; eyebrow?: string; footer?: string }
export const SCHEMES: Scheme[];
export const STATUSES: Status[];
export function esc(s: unknown): string;
export function statusColors(theme: GithubTheme, scheme: Scheme, status?: Status): { fg: string; bg: string; on?: string; solid?: boolean };
export function renderBanner(theme: GithubTheme, scheme: Scheme, o?: TextOpts): string;
export function renderDivider(theme: GithubTheme, scheme: Scheme): string;
export function renderTile(theme: GithubTheme, scheme: Scheme, o?: { label?: string; value?: string; status?: Status }): string;
export function renderBadge(theme: GithubTheme, scheme: Scheme, o?: { label?: string; value?: string; status?: Status }): string;
export function renderSocial(theme: GithubTheme, scheme: Scheme, o?: TextOpts): string;
/** Share card (Open Graph image) for one page of a site, 1200x630. `art` is an SVG string of one graphic for the right-hand side. */
export interface ShareOpts { title?: string; subtitle?: string; eyebrow?: string; footer?: string; art?: string }
export function renderShare(theme: GithubTheme, scheme: Scheme, o?: ShareOpts): string;
export function wrap(text: string, maxChars: number, maxLines: number): string[];
export function paletteMarkdown(theme: GithubTheme): string;
export function slug(s: string): string;

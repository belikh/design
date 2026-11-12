# Modernisation backlog (100 items)

Source: an independent review of the admin template, asked "how do we make the templates more modern, especially edit-in-place and
bulk edit". Decisions from the owner: **commit-on-blur or an explicit button is a user preference** (default blur, set in Settings →
Appearance); **there is no real backend** (everything is a client-side mock behind one interface); and **this repo is boilerplate that
other agents copy**, so every project gets the same look and feel. That last point means the agent-facing material (section I) is as
important as any UI feature.

Tiers are proposals: **P1** build first (they compound: everything else reuses them), **P2** next, **P3** when needed.
Status: `done`, `partial`, `todo`, `skipped` (with the reason under *Notes*).

## A. Edit in place
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 1 | Wire `Editable` into `DataTable` through a column `editor` spec (keep `edit: "text" \| "number"` as an alias) | P1 | done |
| 2 | Use `Editable` for every detail-page field, so no page has a separate edit mode | P1 | done |
| 3 | Editable page titles | P2 | done |
| 4 | Editable kanban cards (title, tag, assignee, points) | P2 | done |
| 5 | The same saving, saved and error-with-retry states on every field | P1 | done |
| 6 | Undo toast instead of confirm dialogs for reversible edits | P1 | done |
| 7 | Spreadsheet keys in grids: type to replace, F2 to edit, Enter moves down, Tab moves right | P1 | done |
| 8 | Type-aware displays: status chips, relative dates, avatars, currency | P1 | done |
| 9 | Paste into a focused cell commits the value | P2 | done |
| 10 | Locked fields show a lock and the reason | P2 | done |
| 11 | Field history popover (who, when, from, to) | P3 | done |
| 12 | Empty values render as "Add …", not blank | P1 | done |

## B. Bulk edit
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 13 | Sticky selection toolbar replaces the queue-and-review drawer | P1 | done |
| 14 | One "Set field" control per editable column, reusing `FieldEditor` | P1 | done |
| 15 | "Mixed" placeholder when selected rows disagree | P1 | done |
| 16 | Live preview: "changes 9 of 12, 3 already match" | P1 | done |
| 17 | "Apply to N selected" from any cell edit | P1 | done |
| 18 | Fill down with Ctrl/Cmd+D and a drag handle | P2 | done |
| 19 | Paste a block over a selection, with per-cell validation | P2 | done |
| 20 | Select all rows matching the filter, not just the page | P1 | done |
| 21 | One undo for the whole batch | P1 | done |
| 22 | Partial-failure report with "retry failed rows" | P1 | done |
| 23 | Progress and cancel for large batches | P2 | done |
| 24 | Review step only for destructive or very large changes | P1 | done |
| 25 | Relative operations (add/remove a tag, increment, shift a date), not only "set" | P2 | done |

## C. Grids
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 26 | Saved views (columns, filters, sort) with a switcher | P2 | done |
| 27 | URL state on every table | P2 | done |
| 28 | Filter chips with operators instead of per-column inputs | P2 | done |
| 29 | One column-header menu for sort, pin, hide and group | P2 | done |
| 30 | Row hover actions with shortcut hints | P3 | done |
| 31 | Row peek: Space opens a side preview | P2 | done |
| 32 | Selection summary with aggregates | P2 | done |
| 33 | Skeleton rows that match real column widths | P3 | done |
| 34 | Density from the global preference only | P2 | done |
| 35 | Inline "add row" at the bottom of the grid | P2 | done |
| 36 | Keyboard alternative for every drag reorder | P1 | done |

## D. Forms
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 37 | Autosave on settings pages, with no Save button | P1 | done |
| 38 | Drafts restored after reload, with a notice | P1 | done |
| 39 | Validate on blur; show the summary only on submit | P2 | done |
| 40 | Smart defaults and "same as above" | P3 | done |
| 41 | Progressive disclosure for advanced fields | P2 | done |
| 42 | Auto-growing textareas (`field-sizing: content` where supported) | P3 | done |
| 43 | Input masks and format-as-you-type numbers | P2 | done |
| 44 | Relative date shortcuts ("tomorrow", "+3d") | P3 | done |
| 45 | Combobox wherever a select has more than about seven options | P2 | done |
| 46 | Paste-to-fill as a standard form affordance | P2 | done |
| 47 | Unsaved-changes guard on route change, not just unload | P1 | done |
| 48 | Wizard steps addressable by URL and resumable | P2 | done |

## E. Shell and navigation
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 49 | Selection-aware command palette actions | P1 | done |
| 50 | Recent and pinned pages | P2 | done |
| 51 | Breadcrumbs with sibling dropdowns | P3 | done |
| 52 | Global "create" menu | P2 | done |
| 53 | Stacked peek panels for records opened from lists | P3 | done |
| 54 | Shortcut hints inside menus and tooltips | P2 | done |
| 55 | Resizable sidebar with remembered width | P3 | done |
| 56 | Collapse the top-bar controls into one "Display" menu (they clip at 1100px) | P1 | done |
| 57 | Split view for two records | P3 | done |
| 58 | Back and forward restore scroll, selection and filters | P2 | done |
| 59 | Notification inbox with inline actions | P2 | done |
| 60 | "What's new" fed from the changelog | P3 | done |

## F. Feedback and state
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 61 | Optimistic updates by default, with rollback | P1 | done |
| 62 | Per-page undo and redo (Ctrl+Z) | P2 | done |
| 63 | Skeletons instead of spinners, with no layout shift | P2 | done |
| 64 | Stale-data badge with background refresh | P3 | done |
| 65 | Offline queue with a "N changes pending" pill | P3 | done |
| 66 | Conflict prompt: keep mine or take theirs | P2 | done |
| 67 | Empty states with one primary action and a spot illustration | P1 | done |
| 68 | Grouped, de-duplicated toasts; errors persist until dismissed | P2 | done |

## G. Platform (check browser support for 71, 74, 79 and 42's `field-sizing`; keep fallbacks)
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 69 | Native `<dialog>` for modals and drawers | P2 | done |
| 70 | Popover API for menus, popovers and tooltips | P2 | done |
| 71 | CSS anchor positioning for those | P3 | done |
| 72 | Container queries for cards and widgets | P2 | done |
| 73 | `:has()` for parent-state styling | P3 | done |
| 74 | View transitions for route and list changes | P3 | done |
| 75 | `light-dark()` to shrink theme CSS | P3 | skipped |
| 76 | Logical properties everywhere, removing most `[dir="rtl"]` overrides | P2 | done |
| 77 | No literal pixel font sizes (the +2px change had to touch 302 lines) | P1 | done |
| 78 | `text-wrap: balance` on headings | P3 | done |
| 79 | `@starting-style` for enter and exit animation | P3 | done |
| 80 | `inert` on content behind overlays | P2 | done |
| 81 | `content-visibility: auto` on long lists | P3 | done |
| 82 | `:user-invalid` for validation styling | P3 | done |
| 83 | `dvh` units and safe-area insets for kiosks and phones | P2 | done |
| 84 | `scrollbar-gutter: stable` and `overscroll-behavior: contain` in panels | P3 | done |
| 85 | `@layer` for app CSS, so page styles can't fight components | P2 | done |
| 86 | Subgrid for aligned card and form rows | P3 | done |

## H. Architecture
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 87 | `useOptimistic`, `useActionState` and transitions | P2 | done |
| 88 | One mock data layer (async, latency, injectable failures) behind an interface every page uses | P1 | done |
| 89 | Route-level error boundaries and Suspense with skeleton fallbacks | P1 | done |
| 90 | Promote `src/ui` to a workspace package so projects import it instead of copying | P1 | done |
| 91 | Split `admin.css` into per-component files | P2 | done |
| 92 | Move the first-wave routes into the typed registry too | P2 | done |

## I. Boilerplate for agents (this is what makes every project look and feel the same)
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 93 | Root `AGENTS.md`: rules, where things live, do and don't | P1 | done |
| 94 | Machine-readable component manifest (name, props, when to use) | P1 | done |
| 95 | Copyable page recipes: list, detail, form, dashboard, kiosk | P1 | done |
| 96 | Scaffold command for a new page | P1 | done |
| 97 | Lint that fails on hard-coded colours, pixel font sizes and bespoke editors or overlays | P1 | done |
| 98 | A "which component for which need" decision table | P1 | done |

## J. Quality
| # | Item | Tier | Status |
| ---: | --- | :---: | :---: |
| 99 | Real-browser interaction tests for focus, paste and drag | P1 | done |
| 100 | Per-route accessibility check, plus the visual baseline, in CI | P1 | done |

## Order of work
1. **Edit in place** (1, 5–8, 12) and **bulk edit** (13–17, 20–22, 24): the `Editable` primitive exists; wire it into `DataTable` and build the
   selection toolbar. Tests first for `Editable`.
2. **Agent boilerplate** (93–98) and the **mock data layer** (88), so what other agents copy is the new pattern, not the old one.
3. Forms and shell (37, 38, 47, 49, 56), then platform primitives (69, 70, 77, 85), then the rest.

Known caveats: items 69–74 and 79 depend on browser support that should be checked before relying on them; the repo has no backend, so
"optimistic" and "conflict" behaviour is simulated against the mock layer (88).

## Notes on items not fully done
- **75 `light-dark()` (skipped):** it only chooses between two colours by `color-scheme`. The generated token CSS also carries a high-contrast variant, density, and forced-colours rules, and it is emitted from one JSON source for nine outputs, so rewriting it would not shrink the CSS and would complicate the generator. Revisit if the themes are ever reduced to light and dark only.
- **76 logical properties (done):** converted every physical `margin/padding/border/inset/text-align` left/right in the shared and app styles and removed the `[dir=rtl]` overrides they made redundant (verified: the sidebar, table headers and borders mirror with `lang=ar`). Five remain in the warehouse styles, which were being edited elsewhere; the lint blocks new ones.
- **8, 20, 27:** done through the table (type-aware cells, select-all across pages, URL state keyed by `aria-label`). Pages that render a `DataTable` without an `aria-label` do not keep URL state.

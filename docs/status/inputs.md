# P2 status: inputs (spec sections C1 to C7)

Routes live under `/inputs/*` (nav group **Forms**), code in `apps/admin/src/p2/inputs/`.
Pages: `text`, `security`, `editors`, `numbers`, `dates`, `pickers`, `choices`, `files`, `data`, `access`, `network`, `location`.
All data is fictional and deterministic; nothing makes a network request. Pure logic is in `logic-*.ts`, `lint.ts`, `sha.ts`, `qr.ts` with tests.

| ID | Entry | Status | Route | Note |
|---|---|---|---|---|
| C003 | Rich text, markdown, code highlight | Done | /p2/inputs/editors | Markdown with live preview and shortcuts; highlighting in the code editor (6 languages). |
| C004 | Mention and slash commands | Done | /p2/inputs/text | Textarea-based popup with keyboard selection; mentions drawn from the people fixtures. |
| C006 | Secret / API key field | Done | /p2/inputs/security | Masked, reveal, copy, rotate. Keys are generated locally. |
| C007 | Card, IBAN, BSB, ABN masks | Done | /p2/inputs/text | Luhn, mod-97, ABN weighting; also phone and plate. Errors show on blur. |
| C008 | Password generator, passkey, TOTP QR, recovery codes | Done | /p2/inputs/security | QR and TOTP are real (RFC vectors, QR decoded with zbarimg). Passkey is simulated unless the user opts into the browser's real prompt; nothing is verified server-side. |
| C009 | Async availability | Done | /p2/inputs/text | Simulated delay and a fixed taken-list; slug follows the title until edited. |
| C010 | Click-to-edit | Done | /p2/inputs/text | Optimistic save with rollback (text containing "fail" is rejected to show it). |
| C011 | Rich text with attachments, tables, variables, snippets | Partial | /p2/inputs/editors | Uses `contentEditable` + `execCommand` (deprecated API); sanitised HTML and markdown output. Attachments are listed locally, not uploaded. |
| C012 | Code editors with lint, format, diff before save | Partial | /p2/inputs/editors | JSON/YAML/SQL/shell/CSS/markdown linters are small hand-written checks, not full parsers; editor is a textarea, not a code-editing engine. Format and diff-before-save work. |
| C016 | Scrub number, knob | Done | /p2/inputs/numbers | Pointer drag and keyboard on both. |
| C017 | Min-max, ratio, dimensions | Done | /p2/inputs/numbers | Linked ratio lock, volume and cubic weight. |
| C018 | Allocation sliders sum to 100 | Done | /p2/inputs/numbers | Locks supported; total always 100 (tested). |
| C019 | Money, currency, range | Done | /p2/inputs/numbers | Integer minor units, shorthand like "12k", per-currency digits. |
| C020 | Unit switching | Done | /p2/inputs/numbers | Length, mass, temperature, data; value converts when the unit changes. |
| C024 | Transfer list | Done | /p2/inputs/pickers | Filter, select all, double-click and keyboard moves. |
| C025 | Tree select, cascader, hierarchical checklist | Done | /p2/inputs/pickers | Tri-state parent checkboxes. |
| C026 | Country, region, timezone, language | Partial | /p2/inputs/pickers | Only 13 countries and a small region set are included; time zones come from the platform list. |
| C028 | Autocomplete with recents and ghost text | Done | /p2/inputs/text | Recents persist in localStorage (guarded). |
| C029 | Multi-value paste chips with validation | Done | /p2/inputs/text | Commas, semicolons, newlines; duplicates dropped; fix-up action. |
| C030 | Switch with confirm and pending | Done | /p2/inputs/choices | Simulated async commit; risky switches ask first. |
| C031 | Radio "other" and conditional reveal | Done | /p2/inputs/choices | |
| C032 | Rich options, virtualised, select all | Done | /p2/inputs/pickers | 5,000 rows, windowed (about 10 in the DOM); fixed 44px row height. |
| C033 | People, role, team pickers | Done | /p2/inputs/pickers | |
| C034 | Record reference, relation editor | Done | /p2/inputs/pickers | Async search over order/customer fixtures; relation types and link limit. |
| C036 | Duration | Done | /p2/inputs/numbers | Parses `1h 30m`, `90m`, `01:30:00`; shows ISO 8601. |
| C038 | Natural-language date, fiscal, multi-date, blackout | Done | /p2/inputs/dates | AU financial year (Jul to Jun); shift-click ranges skip blocked days. Parsing covers common phrases only, English only. |
| C039 | Timezone conversion preview, working hours | Done | /p2/inputs/dates | DST-correct offsets for the chosen date; overlap computed per weekday (a day-boundary shift can drop edge hours). |
| C046 | Folder, URL, camera, barcode, QR, chunked uploads | Partial | /p2/inputs/files | URL import and chunk transport are simulated (real chunk planning, one scripted failure and resume). Camera and barcode use browser APIs behind feature detection and never prompt on load; `BarcodeDetector` is Chromium-only, so other browsers get manual or hardware-scanner entry. Not tested against real hardware. |
| C047 | Image focal point, alt text, redact, SVG light/dark | Partial | /p2/inputs/files | Focal-point crops and alt-text checks work. Redaction boxes are overlays only: no flattened export. Light/dark preview shows the line graphics under each theme; it does not measure contrast. |
| C051 | JSON-schema form | Done | /p2/inputs/data | Subset: string, number, integer, boolean, enum, array of enum, object, formats email/uri/date, length/range/required/uniqueItems. No `$ref`, `oneOf`, nested objects UI. |
| C052 | Address autocomplete, map confirm, geo point, radius | Partial | /p2/inputs/location | Eight fictional addresses and a schematic SVG map (no tiles, no real geocoder). Pin drag, coordinate validation, haversine radius work. |
| C053 | IP, CIDR, MAC, port range, hostname | Done | /p2/inputs/network | |
| C054 | Permissions matrix | Done | /p2/inputs/access | Presets, row/column toggles, implied view, unsaved diff. |
| C056 | Drag-sort, ranking, matrix of questions | Done | /p2/inputs/choices | HTML5 drag plus up/down buttons with announcements; touch drag is not supported (buttons work). |
| C058 | Per-locale translations editor | Done | /p2/inputs/data | Completeness per locale, placeholder-mismatch errors. |
| C059 | Filter pills with operators | Done | /p2/inputs/data | Operators depend on field type; live row count. |
| C060 | Tokenised search, scopes, saved queries | Done | /p2/inputs/data | `field:value`, `field>n`, `-negation`, quoted text; saved queries are in-memory. |
| C061 | Editable grid as a field, checkbox/radio matrix | Done | /p2/inputs/data, /p2/inputs/choices | Cell-level validation, Enter adds a row. |
| C062 | Rule builder, threshold editor on chart | Done | /p2/inputs/data | Rule tester against sample event; draggable threshold with consecutive-point breaches. |
| C063 | Column mapping, option-list editor | Done | /p2/inputs/data | Fuzzy auto-mapping, per-row validation, import of valid rows only (no persistence). |
| C065 | VLAN, subnet calculator, firewall, DNS, port forward, SSH fingerprint | Done | /p2/inputs/network | VLSM planner; firewall shadow detection; SSH fingerprint matches `ssh-keygen -lf`. IPv4 only for calculators; no ECDSA/RSA bit parsing beyond RSA length. |
| C072 | Save and resume, draft and publish | Done | /p2/inputs/access | Autosave to localStorage (guarded) with resume prompt; publish with confirm and version restore. Local only, no server. |
| C073 | Field permissions, field history | Done | /p2/inputs/access | Per-role edit/read/hidden with live preview; per-field history with revert. UI only: nothing is enforced server-side. |

## Verification
- `npx tsc -b --noEmit` is clean for `src/p2/inputs` and `src/ui/inputs`.
- `npx vitest run src/p2/inputs src/ui/inputs.test.tsx`: 83 tests passing (35 logic, 43 component/route, 5 existing).
- Every page was screenshotted (light, and dark/390px for numbers-adjacent and network pages); not every page was checked in dark or at 390px.
- Bugs the tests caught and that were fixed: `field>n` search syntax did not parse, `parseAmount("abc")` returned 0, schema-form errors were keyed wrongly and never displayed, `TextInput` dropped its `jp-input` class when given a `className` (fixed in `src/ui/inputs.tsx`, backward compatible).

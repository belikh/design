# @belikh/jupiter-ui

The Jupiter React components. They contain no design decisions: every colour, size, shadow, stacking order and density value is a
`--jp-*` variable generated from `jupiter.tokens.json` by `@belikh/jupiter-tokens`. Change a token in the design system, rebuild, and every
project that imports this package changes with it.

```tsx
import "@belikh/jupiter-tokens/tokens.css";      // the variables (generated)
import "@belikh/jupiter-tokens/components.css";  // .jp-* classes (generated)
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { Btn, PageHeader, Panel } from "@belikh/jupiter-ui/kit.tsx";
import { DataTable } from "@belikh/jupiter-ui/DataTable.tsx";
```

Needs a bundler that handles TypeScript and CSS imports (Vite, Next with transpilePackages, etc.), React 19 and react-router 7.
Start a project with `node scripts/new-project.mjs <dir>` (see docs/consuming.md). Component index: `components.manifest.json`.

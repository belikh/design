import type { P2Route } from "../registry.ts";
import { WhatsNew } from "./WhatsNew.tsx";

export const routes: P2Route[] = [
  { path: "/whats-new", label: "What’s new", icon: "sparkle", group: "Tools", keywords: "changelog release notes updates", element: <WhatsNew /> },
];

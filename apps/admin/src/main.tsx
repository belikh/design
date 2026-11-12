import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@belikh/jupiter-tokens/tokens.css";
import "@belikh/jupiter-tokens/components.css";
import "./styles/entry.ts";
import { PrefsProvider } from "@belikh/jupiter-ui/store.tsx";
import { App } from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode><PrefsProvider><BrowserRouter><App /></BrowserRouter></PrefsProvider></StrictMode>,
);

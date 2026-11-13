import { PageSkeleton } from "@belikh/jupiter-ui/kit.tsx";
import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";
import { Shell } from "./Shell.tsx";
import { DsProvider } from "./docs/store.tsx";
import { AREA_ROUTES } from "./areas/registry.ts";
const Errors = lazy(() => import("./pages/Errors.tsx").then((m) => ({ default: m.Errors })));

export function App() {
  return (
    <DsProvider>
    <Suspense fallback={<PageSkeleton />}>
    <Routes>
      <Route element={<Shell />}>
        {AREA_ROUTES.map((r) => <Route key={r.routePath ?? r.path} path={r.routePath ?? r.path} element={<Suspense fallback={<PageSkeleton />}>{r.element}</Suspense>} />)}
        <Route path="*" element={<Errors code="404" />} />
      </Route>
    </Routes>
    </Suspense>
    </DsProvider>
  );
}

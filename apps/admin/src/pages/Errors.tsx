import { Link, useParams } from "react-router-dom";
import { Spot } from "@belikh/jupiter-ui/Icon.tsx";
import { Btn } from "@belikh/jupiter-ui/kit.tsx";

const E: Record<string, [string, string, string, string]> = {
  "401": ["Sign in required", "Your session has expired. Sign in again to continue.", "locked", "/auth/sign-in"], "403": ["You don’t have access", "Ask an admin to grant you the right role.", "locked", "/"], "404": ["Page not found", "The page you’re looking for doesn’t exist or has moved.", "not-found", "/"],
  "500": ["Something broke on our side", "We’ve been notified. Try again in a moment.", "unplugged", "/"], "503": ["Down for maintenance", "We’ll be back shortly.", "maintenance", "/status"],
};
export function Errors({ code: fixed }: { code?: string }) {
  const p = useParams(); const code = fixed ?? p.code ?? "404"; const [t, d, spot, to] = E[code] ?? E["404"];
  return (
    <div className="adm-errpage"><Spot name={spot} size={220} /><div className="adm-errpage__code">{code}</div><h1>{t}</h1><p className="jp-muted">{d}</p><div className="adm-row" style={{ justifyContent: "center" }}><Link to={to} className="jp-btn jp-btn--primary">{to === "/auth/sign-in" ? "Sign in" : to === "/status" ? "View status" : "Back to overview"}</Link><Btn onClick={() => history.back()}>Go back</Btn></div></div>
  );
}

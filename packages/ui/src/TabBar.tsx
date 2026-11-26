// The bottom navigation of a phone app: three to five destinations, each an icon over a short label, always in reach of a thumb.
// Put it last inside `.adm-shell`. It shows on small screens (where the sidebar becomes a drawer) and is hidden on wide ones, unless `always`.
import { NavLink } from "react-router-dom";
import { Icon } from "./Icon.tsx";
import "./styles/tabbar.css";

export type TabBarItem = { to: string; label: string; /** An icon name from @belikh/jupiter-graphics. */ icon: string; /** Match the path exactly (for the home tab). */ end?: boolean; /** A count of things waiting, shown on the icon. */ count?: number };

export function TabBar({ items, label = "Primary", always }: { items: TabBarItem[]; /** Accessible name of the navigation. */ label?: string; /** Show on wide screens too. */ always?: boolean }) {
  return (
    <nav className={`adm-tabbar${always ? " adm-tabbar--always" : ""}`} aria-label={label}>
      {items.map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end}>
          <span className="adm-tabbar__icon"><Icon name={i.icon} size={22} />{!!i.count && <b aria-hidden>{i.count > 9 ? "9+" : i.count}</b>}</span>
          <span>{i.label}</span>
          {!!i.count && <span className="adm-sr">, {i.count} waiting</span>}
        </NavLink>
      ))}
    </nav>
  );
}

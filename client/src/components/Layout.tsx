import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { OfflineBanner } from "./OfflineBanner";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "🏠", end: true },
  { to: "/finca", label: "Finca", icon: "🌱", end: false },
  { to: "/cultivos", label: "Cultivos", icon: "🌾", end: false },
  { to: "/conocimiento", label: "Conocimiento", icon: "📘", end: false },
  { to: "/busqueda", label: "Búsqueda", icon: "🔍", end: false },
];

const SECONDARY_NAV_ITEMS = [
  { to: "/stock", label: "Stock", icon: "📦", end: false },
  { to: "/economia", label: "Economía", icon: "💰", end: false },
  { to: "/ajustes", label: "Ajustes", icon: "⚙️", end: false },
];

function NavLinks({ items }: { items: typeof NAV_ITEMS }) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">🚜 App Finca</div>
        <nav className="nav-list">
          <NavLinks items={NAV_ITEMS} />
        </nav>
        <nav className="nav-list" style={{ marginTop: "auto", paddingTop: "1rem" }}>
          <NavLinks items={SECONDARY_NAV_ITEMS} />
        </nav>
      </aside>
      <main className="main-content">
        <OfflineBanner />
        {children}
      </main>
      <nav className="tabbar">
        <NavLinks items={[...NAV_ITEMS, ...SECONDARY_NAV_ITEMS]} />
      </nav>
    </div>
  );
}

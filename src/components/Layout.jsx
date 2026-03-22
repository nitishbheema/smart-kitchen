import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";

const navItems = [
  { to: "/",            icon: "⊞",  label: "Dashboard"   },
  { to: "/cook",        icon: "🍳",  label: "Cook"        },
  { to: "/ingredients", icon: "🧂",  label: "Ingredients" },
  { to: "/logs",        icon: "📋",  label: "Logs"        },
  { to: "/analytics",   icon: "📊",  label: "Analytics"   },
  { to: "/settings",    icon: "⚙️",  label: "Settings"    },
];

function Layout({ children }) {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), setUser);
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(getAuth());
  };

  const currentPage = navItems.find(n => n.to === location.pathname)?.label || "SmartKitchen";

  return (
    <div className="app-shell">

      {/* ── Sidebar ── */}
      <aside className="sidebar">

        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">🍽️</div>
          <span>SmartKitchen</span>
        </div>

        {/* Nav */}
        <p className="sidebar-section-label">Main Menu</p>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`nav-item ${location.pathname === to ? "active" : ""}`}
            >
              <span style={{ fontSize: "1rem" }}>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn btn-danger" style={{ width: "100%" }}>
            ⏻ &nbsp;Logout
          </button>
        </div>

      </aside>

      {/* ── Main ── */}
      <div className="main-content">

        {/* Topbar */}
        <header className="topbar">
          <span className="topbar-title">{currentPage}</span>
          <div className="topbar-right">
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              <span className="status-dot online"></span>
              Connected
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          {children}
        </main>

      </div>
    </div>
  );
}

export default Layout;
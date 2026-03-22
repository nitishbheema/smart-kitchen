import { Outlet, Link, useLocation } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

const navItems = [
  { to: "/chef",      icon: "⊞",  label: "Dashboard" },
  { to: "/chef/cook", icon: "🍳",  label: "Cook"      },
  { to: "/chef/logs", icon: "📋",  label: "My Logs"   },
];

function ChefLayout({ profile }) {
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(getAuth());
  };

  const currentPage = navItems.find(n => n.to === location.pathname)?.label || "Chef";

  return (
    <div className="app-shell">

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🍽️</div>
          <span>SmartKitchen</span>
        </div>

        {/* Role badge */}
        <div style={{
          margin: "0 4px 16px", padding: "8px 12px",
          background: "#f0fdf4", borderRadius: "8px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontSize: "1.2rem" }}>👨‍🍳</span>
          <div>
            <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--success)" }}>Chef</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{profile?.name || "Chef"}</div>
          </div>
        </div>

        <p className="sidebar-section-label">Kitchen</p>
        <nav className="sidebar-nav">
          {navItems.map(({ to, icon, label }) => (
            <Link key={to} to={to}
              className={`nav-item ${location.pathname === to ? "active" : ""}`}>
              <span style={{ fontSize: "1rem" }}>{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn btn-danger" style={{ width: "100%" }}>
            ⏻ &nbsp;Logout
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{currentPage}</span>
          <div className="topbar-right">
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
              <span className="status-dot online"></span>
              Connected
            </span>
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>

    </div>
  );
}

export default ChefLayout;
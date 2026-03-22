import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { listenAlerts, resolveAlert } from "../../services/stockService";

function AdminDashboard() {
  const [kitchen, setKitchen]   = useState(null);
  const [stock, setStock]       = useState({});
  const [logs, setLogs]         = useState([]);
  const [chefs, setChefs]       = useState({});
  const [alerts, setAlerts]     = useState([]);
  const [copied, setCopied]     = useState(false);

  const adminUID = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!adminUID) return;

    onValue(ref(db, `kitchens/${adminUID}`), (snap) => {
      if (snap.exists()) setKitchen(snap.val());
    });

    onValue(ref(db, `kitchens/${adminUID}/stock`), (snap) => {
      setStock(snap.val() || {});
    });

    onValue(ref(db, `logs/${adminUID}`), (snap) => {
      const data = snap.val();
      if (!data) return;
      setLogs(Object.values(data).reverse().slice(0, 5));
    });

    onValue(ref(db, `kitchens/${adminUID}/chefs`), (snap) => {
      setChefs(snap.val() || {});
    });

    // Live alerts
    listenAlerts(adminUID, setAlerts);
  }, [adminUID]);

  const handleCopy = () => {
    navigator.clipboard.writeText(kitchen?.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lowStockItems = Object.entries(stock).filter(
    ([, item]) => item.quantity <= item.lowStockLimit
  );

  const totalItems   = Object.keys(stock).length;
  const totalChefs   = Object.keys(chefs).length;
  const totalLogs    = logs.length;

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of your kitchen — {kitchen?.name || "Loading..."}</p>
      </div>

      {/* ── Kitchen Code Banner ── */}
      <div style={{
        background: "linear-gradient(135deg, var(--accent), #9333ea)",
        borderRadius: "14px", padding: "20px 24px",
        marginBottom: "24px", color: "white",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px",
      }}>
        <div>
          <div style={{ fontSize: "0.78rem", opacity: 0.8, marginBottom: "4px", fontWeight: 500 }}>
            🔑 YOUR KITCHEN CODE — Share this with your chefs
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, letterSpacing: "0.12em" }}>
            {kitchen?.code || "Loading..."}
          </div>
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "8px", padding: "10px 20px", color: "white",
            cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.3)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
        >
          {copied ? "✔ Copied!" : "📋 Copy Code"}
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <span className="stat-label">Total Stock Items</span>
          <span className="stat-value">{totalItems}</span>
          <span className="stat-sub">Ingredients tracked</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Low Stock Alerts</span>
          <span className="stat-value" style={{ color: lowStockItems.length > 0 ? "var(--error)" : "var(--success)" }}>
            {lowStockItems.length}
          </span>
          <span className="stat-sub">{lowStockItems.length > 0 ? "Need restocking" : "All good"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Chefs</span>
          <span className="stat-value">{totalChefs}</span>
          <span className="stat-sub">In your kitchen</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Recent Logs</span>
          <span className="stat-value">{totalLogs}</span>
          <span className="stat-sub">Latest entries</span>
        </div>
      </div>

      {/* ── Low stock alerts + recent logs ── */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>

        {/* Low stock */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3>🔔 Live Alerts</h3>
            {alerts.length > 0 && (
              <span className="badge badge-error">{alerts.length} active</span>
            )}
          </div>
          {alerts.length === 0 && lowStockItems.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--success)", fontSize: "0.875rem" }}>
              <span className="status-dot online" /> All clear — no alerts
            </div>
          ) : (
            <>
              {/* Firebase alerts */}
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 0", borderBottom: "1px solid var(--border)",
                }}>
                  <div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>
                      {alert.ingredient}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "6px" }}>
                      {alert.quantity} {alert.unit} left
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span className="badge badge-error">Low Stock</span>
                    <button
                      onClick={() => resolveAlert(adminUID, alert.id)}
                      style={{ background: "none", border: "1px solid var(--border)", borderRadius: "6px",
                        padding: "2px 8px", cursor: "pointer", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      ✔ Resolve
                    </button>
                  </div>
                </div>
              ))}
              {/* Low stock items not yet alerted */}
              {lowStockItems.filter(([k]) => !alerts.find(a => a.ingredient?.toLowerCase() === stock[k]?.name?.toLowerCase()))
                .map(([key, item]) => (
                  <div key={key} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "9px 0", borderBottom: "1px solid var(--border)",
                  }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>
                      {item.name}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {item.quantity} {item.unit}
                      </span>
                      <span className="badge badge-warning">Low</span>
                    </div>
                  </div>
                ))
              }
            </>
          )}
        </div>

        {/* Stock overview */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3>Stock Overview</h3>
            <a href="/admin/stock" style={{ fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none" }}>Manage →</a>
          </div>
          {Object.entries(stock).slice(0, 6).map(([key, item]) => {
            const pct = Math.min((item.quantity / (item.lowStockLimit * 10)) * 100, 100);
            const isLow = item.quantity <= item.lowStockLimit;
            return (
              <div key={key} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{item.quantity} {item.unit}</span>
                </div>
                <div style={{ height: "5px", background: "var(--bg-app)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pct}%`,
                    background: isLow ? "var(--error)" : "var(--success)",
                    borderRadius: "99px", transition: "width 0.4s",
                  }} />
                </div>
              </div>
            );
          })}
          {Object.keys(stock).length > 6 && (
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "8px" }}>
              +{Object.keys(stock).length - 6} more items
            </p>
          )}
        </div>

      </div>

      {/* ── Recent activity ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>Recent Activity</h3>
          <a href="/admin/logs" style={{ fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none" }}>View all →</a>
        </div>
        {logs.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)" }}>
            No cooking activity yet
          </p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Dish</th>
                  <th>Weight</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Chef</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)", textTransform: "capitalize" }}>{log.item}</td>
                    <td style={{ textTransform: "capitalize" }}>{log.dish || "—"}</td>
                    <td>{log.weight} g</td>
                    <td>{log.target} g</td>
                    <td>
                      <span className={`badge ${log.status === "OK" ? "badge-success" : log.status === "OVER" ? "badge-error" : "badge-warning"}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.78rem" }}>{log.user || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

export default AdminDashboard;
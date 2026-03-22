import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { getUser } from "../../services/userService";
import { listenAlerts } from "../../services/stockService";

function ChefDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile]   = useState(null);
  const [stock, setStock]       = useState({});
  const [weight, setWeight]     = useState(0);
  const [rfid, setRfid]         = useState("None");
  const [myLogs, setMyLogs]     = useState([]);
  const [kitchen, setKitchen]   = useState(null);
  const [alerts, setAlerts]     = useState([]);

  const uid = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!uid) return;

    const init = async () => {
      const p = await getUser(uid);
      setProfile(p);
      if (!p?.kitchenId) return;
      const adminUID = p.kitchenId;

      // Kitchen info
      onValue(ref(db, `kitchens/${adminUID}`), (snap) => {
        if (snap.exists()) setKitchen(snap.val());
      });

      // Stock
      onValue(ref(db, `kitchens/${adminUID}/stock`), (snap) => {
        setStock(snap.val() || {});
      });

      // Live sensor data
      onValue(ref(db, `liveData/${adminUID}/weight`), (snap) => {
        setWeight(snap.val() || 0);
      });
      onValue(ref(db, `liveData/${adminUID}/currentRFID`), (snap) => {
        setRfid(snap.val() || "None");
      });

      // Alerts
      listenAlerts(adminUID, setAlerts);

      // My logs only
      onValue(ref(db, `logs/${adminUID}`), (snap) => {
        const data = snap.val();
        if (!data) { setMyLogs([]); return; }
        const all = Object.values(data).filter(l => l.chefId === uid);
        all.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setMyLogs(all.slice(0, 5));
      });
    };

    init();
  }, [uid]);

  const lowStockItems  = Object.entries(stock).filter(([, i]) => i.quantity <= i.lowStockLimit);
  const totalIngredients = Object.keys(stock).length;
  const todayLogs      = myLogs.filter(l => {
    if (!l.timestamp) return false;
    const today = new Date().toDateString();
    return new Date(l.timestamp).toDateString() === today;
  });

  const formatTime = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>Welcome, {profile?.name || "Chef"} 👨‍🍳</h1>
        <p>{kitchen?.name || "Loading kitchen..."}</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <span className="stat-label">Live Weight</span>
          <span className="stat-value">
            {weight}
            <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "4px" }}>g</span>
          </span>
          <span className="stat-sub">From sensor</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">RFID Item</span>
          <span className="stat-value" style={{ fontSize: "1.2rem", textTransform: "capitalize" }}>
            {rfid || "None"}
          </span>
          <span className="stat-sub">Detected ingredient</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Today's Logs</span>
          <span className="stat-value">{todayLogs.length}</span>
          <span className="stat-sub">Steps completed</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Low Stock</span>
          <span className="stat-value" style={{ color: lowStockItems.length > 0 ? "var(--error)" : "var(--success)" }}>
            {lowStockItems.length}
          </span>
          <span className="stat-sub">{lowStockItems.length > 0 ? "Need restocking" : "All good"}</span>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: "24px" }}>

        {/* ── Stock overview ── */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3>Ingredient Stock</h3>
            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{totalIngredients} items</span>
          </div>

          {Object.keys(stock).length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No stock data</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(stock).slice(0, 8).map(([key, item]) => {
                const isLow = item.quantity <= item.lowStockLimit;
                const pct   = Math.min((item.quantity / (item.lowStockLimit * 10)) * 100, 100);
                return (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "var(--text-primary)" }}>
                        {item.name}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: isLow ? "var(--error)" : "var(--text-muted)", fontWeight: isLow ? 600 : 400 }}>
                        {item.quantity} {item.unit}
                        {isLow && " ⚠️"}
                      </span>
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
              {Object.keys(stock).length > 8 && (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center" }}>
                  +{Object.keys(stock).length - 8} more ingredients
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Active alerts banner */}
          {alerts.length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: "0" }}>
              🔔 <strong>{alerts.length} stock alert{alerts.length > 1 ? "s" : ""}:</strong>{" "}
              {alerts.slice(0, 2).map(a => a.ingredient).join(", ")} {alerts.length > 2 ? `+${alerts.length - 2} more` : ""} — inform admin
            </div>
          )}

          {/* Quick start cooking */}
          <div className="card" style={{
            background: "linear-gradient(135deg, var(--accent), #9333ea)",
            color: "white", textAlign: "center", padding: "28px 20px",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🍳</div>
            <h3 style={{ color: "white", marginBottom: "6px" }}>Ready to Cook?</h3>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem", marginBottom: "16px" }}>
              Start a cooking session with real-time RFID + weight validation
            </p>
            <button
              onClick={() => navigate("/chef/cook")}
              style={{
                display: "inline-block", background: "white",
                color: "var(--accent)", fontWeight: 700, fontSize: "0.875rem",
                padding: "10px 24px", borderRadius: "8px", border: "none",
                cursor: "pointer", transition: "opacity 0.15s",
              }}>
              Start Cooking →
            </button>
          </div>

          {/* Low stock alerts */}
          <div className="card">
            <h3 style={{ marginBottom: "12px" }}>⚠️ Low Stock</h3>
            {lowStockItems.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px",
                color: "var(--success)", fontSize: "0.875rem" }}>
                <span className="status-dot online" />
                All ingredients stocked
              </div>
            ) : (
              lowStockItems.slice(0, 5).map(([key, item]) => (
                <div key={key} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)" }}>
                    {item.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      {item.quantity} {item.unit}
                    </span>
                    <span className="badge badge-error">Low</span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

      {/* ── Recent activity ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>My Recent Activity</h3>
          <a href="/chef/logs" onClick={(e) => { e.preventDefault(); navigate("/chef/logs"); }} style={{ fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none" }}>
            View all →
          </a>
        </div>

        {myLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📋</div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No cooking activity yet — start cooking to see logs here
            </p>
          </div>
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
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {myLogs.map((log, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)", textTransform: "capitalize" }}>
                      {log.item}
                    </td>
                    <td style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>
                      {log.dish || "—"}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.weight}g</td>
                    <td style={{ color: "var(--text-muted)" }}>{log.target}g</td>
                    <td>
                      <span className={`badge ${
                        log.status === "OK"    ? "badge-success" :
                        log.status === "OVER"  ? "badge-error"   : "badge-warning"
                      }`}>{log.status}</span>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {formatTime(log.timestamp)}
                    </td>
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

export default ChefDashboard;
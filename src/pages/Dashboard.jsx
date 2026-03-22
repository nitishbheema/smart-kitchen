import { useEffect, useState } from "react";
import { listenWeight } from "../services/weightService";
import { listenRFID } from "../services/rfidService";
import { listenRecipes } from "../services/recipeService";
import { listenFlow } from "../services/flowService";
import { checkStatus } from "../utils/toleranceCheck";
import { addLog } from "../services/logService";
import { db } from "../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { getAuth } from "firebase/auth";

function Dashboard() {
  const [weight, setWeight]   = useState(0);
  const [item, setItem]       = useState("None");
  const [recipes, setRecipes] = useState({});
  const [flow, setFlow]       = useState({});
  const [step, setStep]       = useState(0);
  const [alerts, setAlerts]   = useState([]);
  const [logged, setLogged]   = useState(false);
  const [logs, setLogs]       = useState([]);

  // Firebase listeners
  useEffect(() => {
    listenWeight(setWeight);
    listenRFID(setItem);
    listenRecipes(setRecipes);
    try { listenFlow("biryani", setFlow); } catch (e) {}

    const logRef = ref(db, "logs");
    onValue(logRef, (snap) => {
      const data = snap.val();
      if (!data) return;
      const list = Object.values(data).reverse().slice(0, 5);
      setLogs(list);
    });
  }, []);

  // Derived values
  const expectedItem  = flow?.[step] || "";
  const target        = recipes?.[expectedItem?.toLowerCase()] || 0;
  const isCorrectItem = item?.toLowerCase() === expectedItem?.toLowerCase();
  const status        = checkStatus(weight, target);
  const isError       = !isCorrectItem || status !== "OK";
  const fillPct       = target > 0 ? Math.min((weight / target) * 100, 100) : 0;

  // Auto logging
  useEffect(() => {
    if (!isError && expectedItem && target > 0 && !logged) {
      addLog({ item, weight, target, status, step });
      setLogged(true);
      setStep(prev => prev + 1);
    }
    if (isError) setLogged(false);
  }, [isError]);

  // Alerts
  useEffect(() => {
    if (target === 0) return;
    if (weight > target + 10)      setAlerts(["Over usage detected"]);
    else if (weight < target - 20) setAlerts(["Low usage"]);
    else                           setAlerts([]);
  }, [weight, target]);

  const barColor =
    !isCorrectItem     ? "var(--error)" :
    status === "OVER"  ? "var(--error)" :
    status === "UNDER" ? "var(--warning)" :
                         "var(--success)";

  const statusBadge =
    status === "OK"   ? "badge badge-success" :
    status === "OVER" ? "badge badge-error"   :
                        "badge badge-warning";

  return (
    <div>

      {/* Page header */}
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Live sensor overview and kitchen status</p>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>

        <div className="stat-card">
          <span className="stat-label">Live Weight</span>
          <span className="stat-value">{weight}
            <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "4px" }}>g</span>
          </span>
          <span className="stat-sub">From weight sensor</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Target Weight</span>
          <span className="stat-value">{target}
            <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "4px" }}>g</span>
          </span>
          <span className="stat-sub">{expectedItem || "No step active"}</span>
        </div>

        <div className="stat-card">
          <span className="stat-label">RFID Item</span>
          <span className="stat-value" style={{ fontSize: "1.2rem" }}>{item || "None"}</span>
          <span className="stat-sub">
            {isCorrectItem
              ? <span style={{ color: "var(--success)" }}>✔ Correct item</span>
              : <span style={{ color: "var(--error)" }}>✖ Wrong item</span>}
          </span>
        </div>

        <div className="stat-card">
          <span className="stat-label">Cooking Step</span>
          <span className="stat-value">{step + 1}
            <span style={{ fontSize: "1rem", fontWeight: 400, color: "var(--text-muted)" }}>
              {" "}/ {Object.keys(flow).length || "—"}
            </span>
          </span>
          <span className="stat-sub">Biryani flow</span>
        </div>

      </div>

      {/* Live sensor + alerts row */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>

        {/* Live Sensor Card */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3>Live Sensor</h3>
            <span className={statusBadge}>{status}</span>
          </div>

          {/* Weight fill bar */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Weight fill</span>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-primary)" }}>{fillPct.toFixed(0)}%</span>
            </div>
            <div style={{ height: "10px", background: "var(--bg-app)", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${fillPct}%`,
                background: barColor, borderRadius: "99px",
                transition: "width 0.4s ease, background 0.3s ease",
              }} />
            </div>
          </div>

          {[
            { label: "Detected Item",  value: item || "None" },
            { label: "Expected Item",  value: expectedItem || "N/A" },
            { label: "Current Weight", value: `${weight} g` },
            { label: "Target Weight",  value: `${target} g` },
          ].map(({ label, value }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between",
              padding: "8px 0", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>{label}</span>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-primary)" }}>{value}</span>
            </div>
          ))}

          {isError && (
            <div className="alert alert-error" style={{ marginTop: "14px" }}>
              ⚠️ Fix input — {!isCorrectItem ? "wrong item detected" : `weight is ${status.toLowerCase()}`}
            </div>
          )}
          {!isError && target > 0 && (
            <div className="alert alert-success" style={{ marginTop: "14px" }}>
              ✔ All good — logged and moving to next step
            </div>
          )}
        </div>

        {/* Alerts + Sensor status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <div className="card">
            <h3 style={{ marginBottom: "12px" }}>Alerts</h3>
            {alerts.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--success)", fontSize: "0.875rem" }}>
                <span className="status-dot online" />
                No active alerts
              </div>
            ) : (
              alerts.map((a, i) => (
                <div key={i} className="alert alert-warning">⚠️ {a}</div>
              ))
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: "12px" }}>Sensor Status</h3>
            {[
              { label: "Weight Sensor", active: weight !== null },
              { label: "RFID Scanner",  active: item !== "None" && !!item },
              { label: "Firebase",      active: true },
            ].map(({ label, active }) => (
              <div key={label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 0", borderBottom: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{label}</span>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: active ? "var(--success)" : "var(--error)" }}>
                  <span className={`status-dot ${active ? "online" : "offline"}`} />
                  {active ? "Online" : "Offline"}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Recent logs */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>Recent Activity</h3>
          <a href="/logs" style={{ fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none" }}>View all →</a>
        </div>

        {logs.length === 0 ? (
          <p style={{ textAlign: "center", padding: "20px 0", color: "var(--text-muted)" }}>No logs yet</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Weight</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, color: "var(--text-primary)", textTransform: "capitalize" }}>{log.item}</td>
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

export default Dashboard;
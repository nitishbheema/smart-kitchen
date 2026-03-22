import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue, remove, get } from "firebase/database";

function AdminChefs() {
  const [chefs, setChefs]       = useState([]);
  const [logs, setLogs]         = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(false);

  const adminUID = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!adminUID) return;

    // Get chef UIDs from kitchen
onValue(ref(db, `kitchens/${adminUID}/chefs`), (snap) => {
  const chefUIDs = snap.val() || {};
  
  const fetchProfiles = async () => {
    const chefProfiles = await Promise.all(
      Object.keys(chefUIDs).map(async (uid) => {
        const userSnap = await get(ref(db, `users/${uid}`));
        return userSnap.exists()
          ? { uid, ...userSnap.val() }
          : { uid, name: "Unknown", email: "" };
      })
    );
    setChefs(chefProfiles);
  };

  fetchProfiles();
});

    // Get all logs for this kitchen
    onValue(ref(db, `logs/${adminUID}`), (snap) => {
      const data = snap.val();
      if (!data) { setLogs([]); return; }
      setLogs(Object.values(data));
    });
  }, [adminUID]);

  // ── Remove chef from kitchen ──
  const handleRemove = async (uid, name) => {
    if (!window.confirm(`Remove ${name} from your kitchen?`)) return;
    setLoading(true);
    await remove(ref(db, `kitchens/${adminUID}/chefs/${uid}`));
    setSelected(null);
    setLoading(false);
  };

  // ── Per chef stats ──
  const getChefStats = (uid) => {
    const chefLogs = logs.filter(l => l.chefId === uid);
    const total    = chefLogs.length;
    const ok       = chefLogs.filter(l => l.status === "OK").length;
    const errors   = total - ok;
    const accuracy = total > 0 ? Math.round((ok / total) * 100) : 0;
    const lastActive = chefLogs.length > 0
      ? Math.max(...chefLogs.map(l => l.timestamp || 0))
      : null;
    return { total, ok, errors, accuracy, lastActive };
  };

  const selectedChef = selected ? chefs.find(c => c.uid === selected) : null;
  const selectedLogs = selected ? logs.filter(l => l.chefId === selected).reverse().slice(0, 20) : [];
  const selectedStats = selected ? getChefStats(selected) : null;

  const formatTime = (ts) => {
    if (!ts) return "Never";
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Chefs</h1>
        <p>{chefs.length} chef{chefs.length !== 1 ? "s" : ""} in your kitchen</p>
      </div>

      {chefs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px" }}>
          <div style={{ fontSize: "3rem", marginBottom: "12px" }}>👨‍🍳</div>
          <h3 style={{ marginBottom: "6px" }}>No chefs yet</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
            Share your kitchen code with chefs so they can join
          </p>
          <a href="/admin" style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            color: "var(--accent)", fontSize: "0.875rem", textDecoration: "none", fontWeight: 500,
          }}>← Go to Dashboard to copy code</a>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: "20px", alignItems: "start" }}>

          {/* ── Left: Chef list ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {chefs.map((chef) => {
              const stats = getChefStats(chef.uid);
              const isSelected = selected === chef.uid;

              return (
                <div key={chef.uid} className="card"
                  onClick={() => setSelected(isSelected ? null : chef.uid)}
                  style={{
                    cursor: "pointer", padding: "16px",
                    border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: isSelected ? "var(--accent-light)" : "var(--bg-card)",
                    transition: "all 0.15s",
                  }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {/* Avatar */}
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "50%",
                        background: isSelected ? "var(--accent)" : "var(--bg-app)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.2rem", flexShrink: 0,
                        border: "2px solid " + (isSelected ? "var(--accent)" : "var(--border)"),
                      }}>👨‍🍳</div>

                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem",
                          color: isSelected ? "var(--accent)" : "var(--text-primary)" }}>
                          {chef.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {chef.email || "No email"}
                        </div>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {stats.total}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Logs</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 700,
                          color: stats.accuracy >= 80 ? "var(--success)" : stats.accuracy >= 50 ? "var(--warning)" : "var(--error)" }}>
                          {stats.accuracy}%
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Accuracy</div>
                      </div>
                      <span className={`badge ${stats.accuracy >= 80 ? "badge-success" : stats.accuracy >= 50 ? "badge-warning" : "badge-error"}`}>
                        {stats.accuracy >= 80 ? "Good" : stats.accuracy >= 50 ? "Average" : "Poor"}
                      </span>
                    </div>
                  </div>

                  {/* Accuracy bar */}
                  <div style={{ marginTop: "12px" }}>
                    <div style={{ height: "4px", background: "var(--bg-app)", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{
                        height: "100%",
                        width: `${stats.accuracy}%`,
                        background: stats.accuracy >= 80 ? "var(--success)" : stats.accuracy >= 50 ? "var(--warning)" : "var(--error)",
                        borderRadius: "99px", transition: "width 0.4s",
                      }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Right: Chef detail ── */}
          <div style={{ position: "sticky", top: "20px" }}>
            {!selectedChef ? (
              <div className="card" style={{ padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>👨‍🍳</div>
                <h3 style={{ marginBottom: "6px" }}>Select a Chef</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Click a chef to see their activity and stats
                </p>
              </div>
            ) : (
              <div className="card">

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "44px", height: "44px", borderRadius: "50%",
                      background: "var(--accent-light)", border: "2px solid var(--accent)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
                    }}>👨‍🍳</div>
                    <div>
                      <h3 style={{ marginBottom: "2px" }}>{selectedChef.name}</h3>
                      <p style={{ fontSize: "0.78rem" }}>{selectedChef.email || "No email"}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "1.2rem", color: "var(--text-muted)",
                  }}>✕</button>
                </div>

                {/* Stats grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                  {[
                    { label: "Total Logs",     value: selectedStats.total,    color: "var(--text-primary)" },
                    { label: "Accuracy",        value: selectedStats.accuracy + "%", color: selectedStats.accuracy >= 80 ? "var(--success)" : "var(--warning)" },
                    { label: "Correct Steps",   value: selectedStats.ok,       color: "var(--success)" },
                    { label: "Errors",          value: selectedStats.errors,   color: selectedStats.errors > 0 ? "var(--error)" : "var(--success)" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: "var(--bg-app)", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Last active */}
                <div style={{ padding: "10px 12px", background: "var(--bg-app)", borderRadius: "8px",
                  marginBottom: "16px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                  🕐 Last active: <strong>{formatTime(selectedStats.lastActive)}</strong>
                </div>

                {/* Recent logs */}
                <h3 style={{ marginBottom: "10px", fontSize: "0.9rem" }}>Recent Activity</h3>
                {selectedLogs.length === 0 ? (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "16px 0" }}>
                    No activity yet
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                    {selectedLogs.slice(0, 8).map((log, i) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 10px", background: "var(--bg-app)", borderRadius: "8px",
                      }}>
                        <div>
                          <span style={{ fontWeight: 500, fontSize: "0.82rem",
                            color: "var(--text-primary)", textTransform: "capitalize" }}>
                            {log.item}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginLeft: "6px" }}>
                            {log.dish || ""}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{log.weight}g</span>
                          <span className={`badge ${log.status === "OK" ? "badge-success" : log.status === "OVER" ? "badge-error" : "badge-warning"}`}>
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Remove button */}
                <button className="btn btn-danger" style={{ width: "100%" }}
                  onClick={() => handleRemove(selectedChef.uid, selectedChef.name)}
                  disabled={loading}>
                  {loading ? "Removing..." : "🚫 Remove Chef from Kitchen"}
                </button>

              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

export default AdminChefs;
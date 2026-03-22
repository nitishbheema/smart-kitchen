import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { getUser } from "../../services/userService";

function ChefLogs() {
  const navigate = useNavigate();
  const [logs, setLogs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDish, setFilterDish]   = useState("all");
  const [filterDate, setFilterDate]   = useState("");
  const [search, setSearch]           = useState("");

  const uid = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const init = async () => {
      const p = await getUser(uid);
      if (!p?.kitchenId) return;

      onValue(ref(db, `logs/${p.kitchenId}`), (snap) => {
        const data = snap.val();
        if (!data) { setLogs([]); setLoading(false); return; }
        const myLogs = Object.entries(data)
          .map(([id, log]) => ({ id, ...log }))
          .filter(l => l.chefId === uid)
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setLogs(myLogs);
        setLoading(false);
      });
    };
    init();
  }, [uid]);

  // ── Unique dishes for filter ──
  const dishes = ["all", ...new Set(logs.map(l => l.dish).filter(Boolean))];

  // ── Filtered logs ──
  const filtered = logs.filter(log => {
    const matchSearch  = log.item?.toLowerCase().includes(search.toLowerCase()) ||
                         log.dish?.toLowerCase().includes(search.toLowerCase());
    const matchStatus  = filterStatus === "all" || log.status === filterStatus;
    const matchDish    = filterDish === "all" || log.dish === filterDish;
    const matchDate    = !filterDate || (
      log.timestamp && new Date(log.timestamp).toISOString().startsWith(filterDate)
    );
    return matchSearch && matchStatus && matchDish && matchDate;
  });

  // ── Stats ──
  const total    = filtered.length;
  const okCount  = filtered.filter(l => l.status === "OK").length;
  const accuracy = total > 0 ? Math.round((okCount / total) * 100) : 0;
  const overCount  = filtered.filter(l => l.status === "OVER").length;
  const underCount = filtered.filter(l => l.status === "UNDER").length;

  const clearFilters = () => {
    setSearch(""); setFilterStatus("all");
    setFilterDish("all"); setFilterDate("");
  };
  const hasFilters = search || filterStatus !== "all" || filterDish !== "all" || filterDate;

  const formatTime = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1>My Logs</h1>
        <p>Your personal cooking activity history</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <span className="stat-label">Total Logs</span>
          <span className="stat-value">{total}</span>
          <span className="stat-sub">Cooking steps</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Accuracy</span>
          <span className="stat-value" style={{ color: accuracy >= 80 ? "var(--success)" : accuracy >= 50 ? "var(--warning)" : "var(--error)" }}>
            {accuracy}%
          </span>
          <span className="stat-sub">{okCount} correct steps</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Over Usage</span>
          <span className="stat-value" style={{ color: overCount > 0 ? "var(--error)" : "var(--success)" }}>
            {overCount}
          </span>
          <span className="stat-sub">Weight exceeded</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Under Usage</span>
          <span className="stat-value" style={{ color: underCount > 0 ? "var(--warning)" : "var(--success)" }}>
            {underCount}
          </span>
          <span className="stat-sub">Weight too low</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: "16px", padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>

          <div style={{ flex: 2, minWidth: "160px" }}>
            <label className="input-label">Search</label>
            <input className="input" placeholder="🔍 Item or dish..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div style={{ flex: 1, minWidth: "120px" }}>
            <label className="input-label">Status</label>
            <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="OK">OK</option>
              <option value="OVER">Over</option>
              <option value="UNDER">Under</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: "130px" }}>
            <label className="input-label">Dish</label>
            <select className="input" value={filterDish} onChange={e => setFilterDish(e.target.value)}>
              {dishes.map(d => (
                <option key={d} value={d}>{d === "all" ? "All Dishes" : d}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: "140px" }}>
            <label className="input-label">Date</label>
            <input className="input" type="date"
              value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>

          {hasFilters && (
            <button className="btn btn-ghost" onClick={clearFilters} style={{ alignSelf: "flex-end" }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Logs table ── */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            Loading your logs...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>📋</div>
            <h3 style={{ marginBottom: "6px" }}>
              {hasFilters ? "No logs match your filters" : "No cooking activity yet"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "14px" }}>
              {hasFilters ? "Try clearing filters" : "Start cooking to see your logs here"}
            </p>
            {hasFilters ? (
              <button className="btn btn-ghost" onClick={clearFilters}>Clear filters</button>
            ) : (
              <button onClick={() => navigate("/chef/cook")} className="btn btn-primary">Start Cooking →</button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Dish</th>
                  <th>Weight</th>
                  <th>Target</th>
                  <th>Diff</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const diff = log.weight - log.target;
                  return (
                    <tr key={log.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>{total - i}</td>
                      <td style={{ fontWeight: 500, color: "var(--text-primary)", textTransform: "capitalize" }}>
                        {log.item || "—"}
                      </td>
                      <td style={{ textTransform: "capitalize", color: "var(--text-secondary)" }}>
                        {log.dish || "—"}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.weight}g</td>
                      <td style={{ color: "var(--text-muted)" }}>{log.target}g</td>
                      <td style={{
                        fontWeight: 600, fontSize: "0.82rem",
                        color: diff === 0 ? "var(--success)" : diff > 0 ? "var(--error)" : "var(--warning)",
                      }}>
                        {diff > 0 ? `+${diff}` : diff}g
                      </td>
                      <td>
                        <span className={`badge ${
                          log.status === "OK"    ? "badge-success" :
                          log.status === "OVER"  ? "badge-error"   : "badge-warning"
                        }`}>{log.status}</span>
                      </td>
                      <td style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {formatTime(log.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div style={{
            padding: "12px 16px", borderTop: "1px solid var(--border)",
            fontSize: "0.78rem", color: "var(--text-muted)",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>Showing {filtered.length} of {logs.length} logs</span>
            <span>{okCount} correct · {overCount} over · {underCount} under · {accuracy}% accuracy</span>
          </div>
        )}
      </div>

    </div>
  );
}

export default ChefLogs;
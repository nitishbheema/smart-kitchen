import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue, get } from "firebase/database";

function AdminLogs() {
  const [logs, setLogs]         = useState([]);
  const [chefs, setChefs]       = useState({});
  const [search, setSearch]     = useState("");
  const [filterChef, setFilterChef]     = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate]     = useState("");
  const [loading, setLoading]   = useState(true);

  const adminUID = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!adminUID) return;

    // Fetch chef profiles
    const fetchChefs = async () => {
      const snap = await get(ref(db, `kitchens/${adminUID}/chefs`));
      const chefUIDs = snap.val() || {};
      const profiles = {};
      await Promise.all(
        Object.keys(chefUIDs).map(async (uid) => {
          const userSnap = await get(ref(db, `users/${uid}`));
          if (userSnap.exists()) profiles[uid] = userSnap.val();
        })
      );
      setChefs(profiles);
    };
    fetchChefs();

    // Listen to logs
    onValue(ref(db, `logs/${adminUID}`), (snap) => {
      const data = snap.val();
      if (!data) { setLogs([]); setLoading(false); return; }
      const list = Object.entries(data).map(([id, log]) => ({ id, ...log }));
      list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setLogs(list);
      setLoading(false);
    });
  }, [adminUID]);

  // ── Filtered logs ──
  const filtered = logs.filter(log => {
    const matchSearch = (
      log.item?.toLowerCase().includes(search.toLowerCase()) ||
      log.dish?.toLowerCase().includes(search.toLowerCase()) ||
      log.user?.toLowerCase().includes(search.toLowerCase())
    );
    const matchChef   = filterChef === "all" || log.chefId === filterChef;
    const matchStatus = filterStatus === "all" || log.status === filterStatus;
    const matchDate   = !filterDate || (
      log.timestamp && new Date(log.timestamp).toISOString().startsWith(filterDate)
    );
    return matchSearch && matchChef && matchStatus && matchDate;
  });

  // ── Stats ──
  const total   = filtered.length;
  const okCount = filtered.filter(l => l.status === "OK").length;
  const overCount  = filtered.filter(l => l.status === "OVER").length;
  const underCount = filtered.filter(l => l.status === "UNDER").length;

  const formatTime = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const clearFilters = () => {
    setSearch("");
    setFilterChef("all");
    setFilterStatus("all");
    setFilterDate("");
  };

  const hasFilters = search || filterChef !== "all" || filterStatus !== "all" || filterDate;

  return (
    <div>
      <div className="page-header">
        <h1>Logs</h1>
        <p>Complete cooking activity across all chefs</p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid-4" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <span className="stat-label">Total Logs</span>
          <span className="stat-value">{total}</span>
          <span className="stat-sub">Filtered entries</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Correct</span>
          <span className="stat-value" style={{ color: "var(--success)" }}>{okCount}</span>
          <span className="stat-sub">{total > 0 ? Math.round((okCount / total) * 100) : 0}% accuracy</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Over Usage</span>
          <span className="stat-value" style={{ color: "var(--error)" }}>{overCount}</span>
          <span className="stat-sub">Weight exceeded</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Under Usage</span>
          <span className="stat-value" style={{ color: "var(--warning)" }}>{underCount}</span>
          <span className="stat-sub">Weight too low</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="card" style={{ marginBottom: "16px", padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>

          {/* Search */}
          <div style={{ flex: 2, minWidth: "160px" }}>
            <label className="input-label">Search</label>
            <input className="input" placeholder="🔍 Item, dish, chef..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Chef filter */}
          <div style={{ flex: 1, minWidth: "140px" }}>
            <label className="input-label">Chef</label>
            <select className="input" value={filterChef} onChange={e => setFilterChef(e.target.value)}>
              <option value="all">All Chefs</option>
              {Object.entries(chefs).map(([uid, chef]) => (
                <option key={uid} value={uid}>{chef.name}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div style={{ flex: 1, minWidth: "120px" }}>
            <label className="input-label">Status</label>
            <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="OK">OK</option>
              <option value="OVER">Over</option>
              <option value="UNDER">Under</option>
            </select>
          </div>

          {/* Date filter */}
          <div style={{ flex: 1, minWidth: "140px" }}>
            <label className="input-label">Date</label>
            <input className="input" type="date"
              value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>

          {/* Clear */}
          {hasFilters && (
            <button className="btn btn-ghost" onClick={clearFilters}
              style={{ alignSelf: "flex-end" }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Logs table ── */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
            Loading logs...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📋</div>
            <p style={{ color: "var(--text-muted)" }}>
              {hasFilters ? "No logs match your filters" : "No cooking activity yet"}
            </p>
            {hasFilters && (
              <button className="btn btn-ghost" onClick={clearFilters} style={{ marginTop: "10px" }}>
                Clear filters
              </button>
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
                  <th>Chef</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => {
                  const diff = log.weight - log.target;
                  return (
                    <tr key={log.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                        {total - i}
                      </td>
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
                      <td style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                        {log.user || "—"}
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

        {/* Footer count */}
        {filtered.length > 0 && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)",
            fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
            <span>Showing {filtered.length} of {logs.length} logs</span>
            <span>{okCount} correct · {overCount} over · {underCount} under</span>
          </div>
        )}
      </div>

    </div>
  );
}

export default AdminLogs;
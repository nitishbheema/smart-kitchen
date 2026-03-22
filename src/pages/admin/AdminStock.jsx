import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue, update, remove } from "firebase/database";

function AdminStock() {
  const [stock, setStock]         = useState({});
  const [search, setSearch]       = useState("");
  const [editKey, setEditKey]     = useState(null);
  const [editVal, setEditVal]     = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [newItem, setNewItem]     = useState({ name: "", quantity: "", unit: "g", lowStockLimit: "" });
  const [filter, setFilter]       = useState("all"); // all | low | ok
  const [loading, setLoading]     = useState(false);

  const adminUID = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!adminUID) return;
    onValue(ref(db, `kitchens/${adminUID}/stock`), (snap) => {
      setStock(snap.val() || {});
    });
  }, [adminUID]);

  // ── Update quantity ──
  const handleUpdateQty = async (key) => {
    if (!editVal && editVal !== 0) return;
    setLoading(true);
    await update(ref(db, `kitchens/${adminUID}/stock/${key}`), {
      quantity: Number(editVal),
    });
    setEditKey(null);
    setEditVal("");
    setLoading(false);
  };

  // ── Delete item ──
  const handleDelete = async (key) => {
    if (!window.confirm("Remove this ingredient from stock?")) return;
    await remove(ref(db, `kitchens/${adminUID}/stock/${key}`));
  };

  // ── Add new item ──
  const handleAdd = async () => {
    if (!newItem.name || !newItem.quantity) return;
    setLoading(true);
    const key = newItem.name.toLowerCase().replace(/\s+/g, "_");
    await update(ref(db, `kitchens/${adminUID}/stock/${key}`), {
      name:          newItem.name,
      quantity:      Number(newItem.quantity),
      unit:          newItem.unit,
      lowStockLimit: Number(newItem.lowStockLimit) || 100,
    });
    setNewItem({ name: "", quantity: "", unit: "g", lowStockLimit: "" });
    setShowAdd(false);
    setLoading(false);
  };

  // ── Filtered + searched stock ──
  const filteredStock = Object.entries(stock).filter(([key, item]) => {
    const matchSearch = item.name?.toLowerCase().includes(search.toLowerCase());
    const isLow = item.quantity <= item.lowStockLimit;
    if (filter === "low") return matchSearch && isLow;
    if (filter === "ok")  return matchSearch && !isLow;
    return matchSearch;
  });

  const lowCount = Object.values(stock).filter(i => i.quantity <= i.lowStockLimit).length;

  return (
    <div>
      <div className="page-header">
        <h1>Stock Management</h1>
        <p>Monitor and update ingredient quantities</p>
      </div>

      {/* ── Stat row ── */}
      <div className="grid-3" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <span className="stat-label">Total Ingredients</span>
          <span className="stat-value">{Object.keys(stock).length}</span>
          <span className="stat-sub">In your kitchen</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Low Stock</span>
          <span className="stat-value" style={{ color: lowCount > 0 ? "var(--error)" : "var(--success)" }}>
            {lowCount}
          </span>
          <span className="stat-sub">{lowCount > 0 ? "Need restocking" : "All good"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Well Stocked</span>
          <span className="stat-value" style={{ color: "var(--success)" }}>
            {Object.keys(stock).length - lowCount}
          </span>
          <span className="stat-sub">Above limit</span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="card" style={{ marginBottom: "16px", padding: "14px 16px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>

          {/* Search */}
          <input
            className="input"
            placeholder="🔍 Search ingredient..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: "240px" }}
          />

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { key: "all", label: `All (${Object.keys(stock).length})` },
              { key: "low", label: `Low (${lowCount})` },
              { key: "ok",  label: `OK (${Object.keys(stock).length - lowCount})` },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setFilter(key)} style={{
                padding: "6px 14px", borderRadius: "6px", border: "none",
                cursor: "pointer", fontSize: "0.8rem", fontWeight: 500,
                background: filter === key ? "var(--accent)" : "var(--bg-app)",
                color: filter === key ? "white" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}>{label}</button>
            ))}
          </div>

          {/* Add button */}
          <button
            className="btn btn-primary"
            style={{ marginLeft: "auto" }}
            onClick={() => setShowAdd(!showAdd)}
          >
            + Add Ingredient
          </button>
        </div>
      </div>

      {/* ── Add new item form ── */}
      {showAdd && (
        <div className="card" style={{ marginBottom: "16px", background: "var(--accent-light)", border: "1px solid var(--accent)" }}>
          <h3 style={{ marginBottom: "14px", color: "var(--accent)" }}>Add New Ingredient</h3>
          <div className="grid-4" style={{ marginBottom: "12px" }}>
            <div>
              <label className="input-label">Name</label>
              <input className="input" placeholder="e.g. Cumin Seeds"
                value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Quantity</label>
              <input className="input" type="number" placeholder="e.g. 1000"
                value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Unit</label>
              <select className="input" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                <option value="g">g (grams)</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">litres</option>
                <option value="pcs">pcs</option>
              </select>
            </div>
            <div>
              <label className="input-label">Low Stock Limit</label>
              <input className="input" type="number" placeholder="e.g. 100"
                value={newItem.lowStockLimit} onChange={e => setNewItem({ ...newItem, lowStockLimit: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-primary" onClick={handleAdd} disabled={loading}>
              {loading ? "Adding..." : "✔ Add Ingredient"}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Stock table ── */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Low Limit</th>
                <th>Status</th>
                <th>Stock Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No ingredients found
                  </td>
                </tr>
              ) : (
                filteredStock.map(([key, item]) => {
                  const isLow = item.quantity <= item.lowStockLimit;
                  const pct   = Math.min((item.quantity / (item.lowStockLimit * 10)) * 100, 100);

                  return (
                    <tr key={key}>
                      {/* Name */}
                      <td style={{ fontWeight: 500, color: "var(--text-primary)" }}>{item.name}</td>

                      {/* Quantity — inline edit */}
                      <td>
                        {editKey === key ? (
                          <input
                            type="number"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleUpdateQty(key)}
                            style={{
                              width: "80px", padding: "4px 8px", borderRadius: "6px",
                              border: "1px solid var(--accent)", outline: "none", fontSize: "0.875rem",
                            }}
                            autoFocus
                          />
                        ) : (
                          <span style={{ fontWeight: 600, color: isLow ? "var(--error)" : "var(--text-primary)" }}>
                            {item.quantity}
                          </span>
                        )}
                      </td>

                      <td>{item.unit}</td>
                      <td style={{ color: "var(--text-muted)" }}>{item.lowStockLimit}</td>

                      {/* Status badge */}
                      <td>
                        <span className={`badge ${isLow ? "badge-error" : "badge-success"}`}>
                          {isLow ? "Low" : "OK"}
                        </span>
                      </td>

                      {/* Mini bar */}
                      <td style={{ minWidth: "100px" }}>
                        <div style={{ height: "6px", background: "var(--bg-app)", borderRadius: "99px", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${pct}%`,
                            background: isLow ? "var(--error)" : "var(--success)",
                            borderRadius: "99px", transition: "width 0.4s",
                          }} />
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {editKey === key ? (
                            <>
                              <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                                onClick={() => handleUpdateQty(key)} disabled={loading}>
                                Save
                              </button>
                              <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                                onClick={() => setEditKey(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-secondary" style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                                onClick={() => { setEditKey(key); setEditVal(item.quantity); }}>
                                ✏️ Edit
                              </button>
                              <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                                onClick={() => handleDelete(key)}>
                                🗑
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default AdminStock;
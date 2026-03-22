import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue, update } from "firebase/database";

function AdminSettings() {
  const [kitchen, setKitchen]         = useState(null);
  const [kitchenName, setKitchenName] = useState("");
  const [tolerance, setTolerance]     = useState(10);
  const [copied, setCopied]           = useState(false);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  const adminUID = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!adminUID) return;
    onValue(ref(db, `kitchens/${adminUID}`), (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setKitchen(data);
        setKitchenName(data.name || "");
        setTolerance(data.tolerance ?? 10);
      }
    });
  }, [adminUID]);

  const handleCopy = () => {
    navigator.clipboard.writeText(kitchen?.code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    await update(ref(db, `kitchens/${adminUID}`), {
      name:      kitchenName.trim() || "My Kitchen",
      tolerance: Number(tolerance),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your kitchen configuration</p>
      </div>

      <div style={{ maxWidth: "600px", display: "flex", flexDirection: "column", gap: "16px" }}>

        {/* ── Kitchen Code ── */}
        <div className="card">
          <h3 style={{ marginBottom: "4px" }}>🔑 Kitchen Code</h3>
          <p style={{ marginBottom: "16px", fontSize: "0.82rem" }}>
            Share this code with your chefs so they can join your kitchen
          </p>

          <div style={{
            background: "linear-gradient(135deg, var(--accent), #9333ea)",
            borderRadius: "12px", padding: "20px 24px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "12px",
          }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.7)", marginBottom: "4px", fontWeight: 500 }}>
                YOUR KITCHEN CODE
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "white", letterSpacing: "0.12em" }}>
                {kitchen?.code || "Loading..."}
              </div>
            </div>
            <button onClick={handleCopy} style={{
              background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "8px", padding: "10px 18px", color: "white",
              cursor: "pointer", fontWeight: 600, fontSize: "0.875rem",
            }}>
              {copied ? "✔ Copied!" : "📋 Copy"}
            </button>
          </div>

          <div className="alert alert-info" style={{ fontSize: "0.82rem" }}>
            ℹ️ This code is permanent and unique to your kitchen. Don't share it publicly.
          </div>
        </div>

        {/* ── Kitchen Info ── */}
        <div className="card">
          <h3 style={{ marginBottom: "4px" }}>🍽️ Kitchen Info</h3>
          <p style={{ marginBottom: "16px", fontSize: "0.82rem" }}>
            Update your kitchen name
          </p>

          <div style={{ marginBottom: "16px" }}>
            <label className="input-label">Kitchen Name</label>
            <input
              className="input"
              placeholder="e.g. Hotel Saravana Kitchen"
              value={kitchenName}
              onChange={e => setKitchenName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label className="input-label">Admin UID</label>
            <input
              className="input"
              value={adminUID || ""}
              readOnly
              style={{ background: "var(--bg-app)", color: "var(--text-muted)", fontSize: "0.78rem" }}
            />
          </div>
        </div>

        {/* ── Tolerance Settings ── */}
        <div className="card">
          <h3 style={{ marginBottom: "4px" }}>⚖️ Weight Tolerance</h3>
          <p style={{ marginBottom: "16px", fontSize: "0.82rem" }}>
            How much variation (in grams) is allowed before triggering an alert
          </p>

          <div style={{ marginBottom: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <label className="input-label" style={{ margin: 0 }}>Tolerance: ±{tolerance}g</label>
              <span className={`badge ${tolerance <= 5 ? "badge-error" : tolerance <= 15 ? "badge-warning" : "badge-success"}`}>
                {tolerance <= 5 ? "Strict" : tolerance <= 15 ? "Normal" : "Relaxed"}
              </span>
            </div>
            <input
              type="range"
              min="1" max="50" step="1"
              value={tolerance}
              onChange={e => setTolerance(e.target.value)}
              style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between",
              fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              <span>1g (Strict)</span>
              <span>25g (Normal)</span>
              <span>50g (Relaxed)</span>
            </div>
          </div>

          <div className="alert alert-info" style={{ fontSize: "0.82rem", marginTop: "12px" }}>
            ℹ️ Currently: if chef adds <strong>{tolerance}g more or less</strong> than the target, it's still marked OK.
          </div>
        </div>

        {/* ── Save button ── */}
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ padding: "12px", fontSize: "0.95rem" }}
        >
          {saving ? "Saving..." : saved ? "✔ Saved!" : "Save Settings"}
        </button>

      </div>
    </div>
  );
}

export default AdminSettings;
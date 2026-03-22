import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { getUser } from "../../services/userService";
import { addLog } from "../../services/logService";

const CATEGORIES = ["All", "Rice", "Biryani", "Curry", "Dal", "Breakfast", "Bread", "Soup", "Sides", "Dessert"];

function ChefCook() {
  const [profile, setProfile]     = useState(null);
  const [recipes, setRecipes]     = useState({});
  const [weight, setWeight]       = useState(0);
  const [rfid, setRfid]           = useState("None");
  const [tolerance, setTolerance] = useState(10);

  const [category, setCategory]         = useState("All");
  const [search, setSearch]             = useState("");
  const [selectedDish, setSelectedDish] = useState("");
  const [started, setStarted]           = useState(false);
  const [step, setStep]                 = useState(0);
  const [logged, setLogged]             = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [done, setDone]                 = useState(false);

  const uid = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const init = async () => {
      const p = await getUser(uid);
      setProfile(p);
      if (!p?.kitchenId) return;
      const adminUID = p.kitchenId;

      onValue(ref(db, `kitchens/${adminUID}/recipes`), (snap) => {
        setRecipes(snap.val() || {});
      });
      onValue(ref(db, `liveData/${adminUID}/weight`), (snap) => {
        setWeight(snap.val() || 0);
      });
      onValue(ref(db, `liveData/${adminUID}/currentRFID`), (snap) => {
        setRfid(snap.val() || "None");
      });
      onValue(ref(db, `kitchens/${adminUID}/tolerance`), (snap) => {
        setTolerance(snap.val() ?? 10);
      });
    };
    init();
  }, [uid]);

  // ── Derived ──
  const currentRecipe = selectedDish ? recipes[selectedDish] : null;
  const ingredients   = currentRecipe ? Object.values(currentRecipe.ingredients || {}) : [];
  const totalSteps    = ingredients.length;
  const currentIng    = ingredients[step];
  const expectedItem  = currentIng?.item || "";
  const target        = currentIng?.targetWeight || 0;

  const isCorrectItem = rfid?.toLowerCase() === expectedItem?.toLowerCase();
  const diff          = weight - target;
  const isOver        = weight > target + tolerance;
  const isUnder       = weight < target - tolerance;
  const status        = isOver ? "OVER" : isUnder ? "UNDER" : "OK";
  const isError       = !isCorrectItem || status !== "OK";
  const fillPct       = target > 0 ? Math.min((weight / target) * 100, 100) : 0;
  const progress      = totalSteps > 0 ? Math.round((step / totalSteps) * 100) : 0;

  // ── Auto log ──
  useEffect(() => {
    if (!started || done) return;
    if (!isError && expectedItem && target > 0 && !logged) {
      addLog({ item: expectedItem, weight, target, status, step, dish: selectedDish });
      setLogged(true);
      setCompletedSteps(prev => [...prev, { item: expectedItem, weight, target, status }]);
      setTimeout(() => {
        if (step + 1 >= totalSteps) {
          setDone(true);
        } else {
          setStep(prev => prev + 1);
          setLogged(false);
        }
      }, 1200);
    }
    if (isError) setLogged(false);
  }, [isError, started]);

  const barColor =
    !isCorrectItem     ? "var(--error)"   :
    status === "OVER"  ? "var(--error)"   :
    status === "UNDER" ? "var(--warning)" :
                         "var(--success)";

  const resetCooking = () => {
    setStarted(false); setStep(0); setLogged(false);
    setCompletedSteps([]); setDone(false); setSelectedDish("");
    setCategory("All"); setSearch("");
  };

  // ── Filtered recipes ──
  const filteredRecipes = Object.entries(recipes).filter(([, r]) => {
    const matchCat    = category === "All" || r.category === category;
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Done screen ──
  if (done) {
    const okCount  = completedSteps.filter(s => s.status === "OK").length;
    const accuracy = Math.round((okCount / completedSteps.length) * 100);
    return (
      <div>
        <div className="page-header"><h1>Cook</h1><p>Session complete</p></div>
        <div style={{ maxWidth: "500px", margin: "0 auto" }}>
          <div className="card" style={{ textAlign: "center", padding: "36px 28px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎉</div>
            <h2 style={{ marginBottom: "4px" }}>Cooking Complete!</h2>
            <p style={{ marginBottom: "20px" }}>{currentRecipe?.name}</p>
            <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Steps Done", value: completedSteps.length },
                { label: "Accuracy",   value: accuracy + "%" },
                { label: "OK Steps",   value: okCount },
              ].map(({ label, value }) => (
                <div key={label} style={{ flex: 1, background: "var(--bg-app)", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--accent)" }}>{value}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "left", marginBottom: "20px" }}>
              <h3 style={{ marginBottom: "10px", fontSize: "0.9rem" }}>Summary</h3>
              {completedSteps.map((s, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "7px 0", borderBottom: "1px solid var(--border)",
                }}>
                  <span style={{ fontSize: "0.82rem", textTransform: "capitalize", color: "var(--text-primary)" }}>
                    {i + 1}. {s.item}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.weight}g / {s.target}g</span>
                    <span className={`badge ${s.status === "OK" ? "badge-success" : s.status === "OVER" ? "badge-error" : "badge-warning"}`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" onClick={resetCooking} style={{ width: "100%", padding: "12px" }}>
              🍳 Cook Another Dish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header"><h1>Cook</h1><p>Step-by-step guided cooking with live validation</p></div>

      <div style={{ maxWidth: "520px", margin: "0 auto" }}>

        {/* ══════════════════════════
            DISH SELECTION
        ══════════════════════════ */}
        {!started ? (
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ marginBottom: "4px" }}>Select a Dish</h3>
            <p style={{ marginBottom: "14px", fontSize: "0.82rem" }}>Choose what you're cooking today</p>

            {/* Search */}
            <input className="input" placeholder="🔍 Search recipes..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ marginBottom: "12px" }} />

            {/* Category pills */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
              {CATEGORIES.map(cat => {
                const count = cat === "All"
                  ? Object.keys(recipes).length
                  : Object.values(recipes).filter(r => r.category === cat).length;
                if (count === 0 && cat !== "All") return null;
                return (
                  <button key={cat} onClick={() => setCategory(cat)} style={{
                    padding: "4px 12px", borderRadius: "99px",
                    cursor: "pointer", fontSize: "0.75rem", fontWeight: 500,
                    background: category === cat ? "var(--accent)" : "var(--bg-app)",
                    color: category === cat ? "white" : "var(--text-secondary)",
                    border: category === cat ? "none" : "1px solid var(--border)",
                    transition: "all 0.15s",
                  }}>
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Scrollable recipe list */}
            <div style={{
              maxHeight: "320px", overflowY: "auto",
              display: "flex", flexDirection: "column", gap: "6px",
              marginBottom: "16px", paddingRight: "4px",
            }}>
              {filteredRecipes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  No recipes found
                </div>
              ) : (
                filteredRecipes.map(([key, recipe]) => (
                  <div key={key}
                    onClick={() => setSelectedDish(selectedDish === key ? "" : key)}
                    style={{
                      padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
                      border: selectedDish === key ? "2px solid var(--accent)" : "1px solid var(--border)",
                      background: selectedDish === key ? "var(--accent-light)" : "var(--bg-card)",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "all 0.15s",
                    }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem",
                        color: selectedDish === key ? "var(--accent)" : "var(--text-primary)" }}>
                        {recipe.name}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {Object.keys(recipe.ingredients || {}).length} ingredients
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="badge badge-accent">{recipe.category}</span>
                      {selectedDish === key && (
                        <span style={{ color: "var(--accent)", fontSize: "1rem" }}>✔</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Start button — always visible */}
            <button
              className="btn btn-primary"
              onClick={() => selectedDish && setStarted(true)}
              disabled={!selectedDish}
              style={{
                width: "100%", padding: "12px", fontSize: "0.95rem",
                opacity: selectedDish ? 1 : 0.5, cursor: selectedDish ? "pointer" : "not-allowed",
              }}>
              {selectedDish
                ? `▶ Start Cooking — ${recipes[selectedDish]?.name}`
                : "Select a dish to start"}
            </button>
          </div>

        ) : (
          /* ══════════════════════════
              ACTIVE COOKING
          ══════════════════════════ */
          <div className="card" style={{ padding: "24px" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div>
                <h3 style={{ marginBottom: "2px" }}>{currentRecipe?.name}</h3>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  Step {step + 1} of {totalSteps}
                </span>
              </div>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent)" }}>
                {progress}%
              </span>
            </div>

            {/* Overall progress */}
            <div style={{ height: "6px", background: "var(--bg-app)", borderRadius: "99px",
              overflow: "hidden", marginBottom: "20px" }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: "var(--accent)", borderRadius: "99px", transition: "width 0.4s",
              }} />
            </div>

            {/* Expected ingredient */}
            <div style={{ textAlign: "center", marginBottom: "18px" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600, letterSpacing: "0.05em" }}>
                ADD THIS INGREDIENT
              </div>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--text-primary)",
                textTransform: "capitalize", marginBottom: "4px" }}>
                {expectedItem}
              </div>
              <div style={{ fontSize: "0.95rem", color: "var(--text-muted)" }}>
                Target: <strong style={{ color: "var(--accent)" }}>{target}g</strong>
                <span style={{ fontSize: "0.75rem", marginLeft: "6px" }}>(±{tolerance}g)</span>
              </div>
            </div>

            {/* Live weight */}
            <div style={{ textAlign: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "3.5rem", fontWeight: 800, color: barColor,
                transition: "color 0.3s", lineHeight: 1 }}>
                {weight}
                <span style={{ fontSize: "1.2rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "4px" }}>g</span>
              </div>
            </div>

            {/* Fill bar */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Weight fill</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: barColor }}>{fillPct.toFixed(0)}%</span>
              </div>
              <div style={{ height: "12px", background: "var(--bg-app)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${fillPct}%`,
                  background: barColor, borderRadius: "99px",
                  transition: "width 0.3s ease, background 0.3s ease",
                }} />
              </div>
            </div>

            {/* Info boxes */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              {[
                { label: "RFID", value: rfid || "None", color: isCorrectItem ? "var(--success)" : "var(--error)" },
                { label: "MATCH", value: isCorrectItem ? "✔ Correct" : "✖ Wrong", color: isCorrectItem ? "var(--success)" : "var(--error)" },
                { label: "STATUS", value: status, color: status === "OK" ? "var(--success)" : status === "OVER" ? "var(--error)" : "var(--warning)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ flex: 1, padding: "10px 8px", background: "var(--bg-app)",
                  borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "3px", fontWeight: 600 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.8rem", color, textTransform: "capitalize" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Alert / success */}
            {isError ? (
              <div className="alert alert-error" style={{ marginBottom: "14px" }}>
                ⚠️ {!isCorrectItem
                  ? `Wrong item — place "${expectedItem}"`
                  : status === "OVER"
                  ? `Too much! Remove ${Math.abs(diff)}g`
                  : `Add ${Math.abs(diff)}g more`}
              </div>
            ) : (
              <div className="alert alert-success" style={{ marginBottom: "14px" }}>
                ✔ {logged ? "Logged! Moving to next step..." : "Perfect — hold steady..."}
              </div>
            )}

            {/* Completed steps */}
            {completedSteps.length > 0 && (
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>
                  COMPLETED STEPS
                </div>
                <div style={{ maxHeight: "120px", overflowY: "auto" }}>
                  {completedSteps.map((s, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "5px 0", borderBottom: "1px solid var(--border)",
                    }}>
                      <span style={{ fontSize: "0.78rem", textTransform: "capitalize", color: "var(--text-secondary)" }}>
                        {i + 1}. {s.item}
                      </span>
                      <span className={`badge ${s.status === "OK" ? "badge-success" : s.status === "OVER" ? "badge-error" : "badge-warning"}`}
                        style={{ fontSize: "0.68rem" }}>
                        {s.weight}g / {s.target}g
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn-danger" onClick={resetCooking} style={{ width: "100%" }}>
              🔄 Cancel & Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChefCook;
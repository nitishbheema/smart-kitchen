import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue, set, remove } from "firebase/database";

const CATEGORIES = ["All", "Rice", "Biryani", "Curry", "Dal", "Breakfast", "Bread", "Soup", "Sides", "Dessert"];
const CAT_OPTIONS = ["Rice", "Biryani", "Curry", "Dal", "Breakfast", "Bread", "Soup", "Sides", "Dessert"];

const emptyRecipe = () => ({
  name: "",
  category: "Curry",
  ingredients: [{ item: "", targetWeight: "" }],
});

function AdminRecipes() {
  const [recipes, setRecipes]     = useState({});
  const [search, setSearch]       = useState("");
  const [category, setCategory]   = useState("All");
  const [selected, setSelected]   = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [editKey, setEditKey]     = useState(null); // null = new recipe
  const [form, setForm]           = useState(emptyRecipe());
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const adminUID = getAuth().currentUser?.uid;

  useEffect(() => {
    if (!adminUID) return;
    onValue(ref(db, `kitchens/${adminUID}/recipes`), (snap) => {
      setRecipes(snap.val() || {});
    });
  }, [adminUID]);

  // ── Open create form ──
  const openCreate = () => {
    setEditKey(null);
    setForm(emptyRecipe());
    setError("");
    setShowForm(true);
    setSelected(null);
  };

  // ── Open edit form ──
  const openEdit = (key) => {
    const r = recipes[key];
    setEditKey(key);
    setForm({
      name:        r.name,
      category:    r.category,
      ingredients: Object.values(r.ingredients || {}).map(i => ({
        item:         i.item,
        targetWeight: i.targetWeight,
      })),
    });
    setError("");
    setShowForm(true);
    setSelected(null);
  };

  // ── Ingredient helpers ──
  const addIngredient = () =>
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { item: "", targetWeight: "" }] }));

  const removeIngredient = (i) =>
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));

  const updateIngredient = (i, field, val) =>
    setForm(f => ({
      ...f,
      ingredients: f.ingredients.map((ing, idx) =>
        idx === i ? { ...ing, [field]: val } : ing
      ),
    }));

  // ── Save recipe ──
  const handleSave = async () => {
    if (!form.name.trim()) { setError("Recipe name is required."); return; }
    if (form.ingredients.some(i => !i.item || !i.targetWeight)) {
      setError("All ingredients must have a name and target weight."); return;
    }
    setError("");
    setLoading(true);

    const key = editKey || form.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");

    // Build ingredients object {0: {item, targetWeight}, 1: ...}
    const ingredients = {};
    form.ingredients.forEach((ing, idx) => {
      ingredients[idx] = {
        item:         ing.item.toLowerCase().trim(),
        targetWeight: Number(ing.targetWeight),
      };
    });

    await set(ref(db, `kitchens/${adminUID}/recipes/${key}`), {
      name:        form.name.trim(),
      category:    form.category,
      ingredients,
    });

    setShowForm(false);
    setLoading(false);
  };

  // ── Delete recipe ──
  const handleDelete = async (key) => {
    if (!window.confirm(`Delete "${recipes[key]?.name}"?`)) return;
    await remove(ref(db, `kitchens/${adminUID}/recipes/${key}`));
    if (selected === key) setSelected(null);
  };

  // ── Filtered recipes ──
  const filtered = Object.entries(recipes).filter(([, r]) => {
    const matchSearch   = r.name?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = category === "All" || r.category === category;
    return matchSearch && matchCategory;
  });

  const catCount = (cat) => cat === "All"
    ? Object.keys(recipes).length
    : Object.values(recipes).filter(r => r.category === cat).length;

  const selectedRecipe = selected ? recipes[selected] : null;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1>Recipes</h1>
          <p>Manage all recipes in your kitchen — {Object.keys(recipes).length} total</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Recipe</button>
      </div>

      {/* ══════════════════════════
          CREATE / EDIT FORM
      ══════════════════════════ */}
      {showForm && (
        <div className="card" style={{
          marginBottom: "20px",
          border: "2px solid var(--accent)",
          background: "var(--accent-light)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ color: "var(--accent)" }}>
              {editKey ? "✏️ Edit Recipe" : "✨ Create New Recipe"}
            </h3>
            <button onClick={() => setShowForm(false)} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "1.2rem", color: "var(--text-muted)",
            }}>✕</button>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: "14px" }}>⚠️ {error}</div>
          )}

          {/* Name + Category */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 2 }}>
              <label className="input-label">Recipe Name</label>
              <input className="input" placeholder="e.g. Mushroom Biryani"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="input-label">Category</label>
              <select className="input" value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                {CAT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Ingredients */}
          <label className="input-label" style={{ marginBottom: "8px", display: "block" }}>
            Ingredients & Target Weights
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
            {form.ingredients.map((ing, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {/* Step number */}
                <div style={{
                  width: "26px", height: "26px", borderRadius: "50%",
                  background: "var(--accent)", color: "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>

                <input className="input" placeholder="Ingredient name (e.g. rice)"
                  value={ing.item}
                  onChange={e => updateIngredient(i, "item", e.target.value)}
                  style={{ flex: 2 }} />

                <input className="input" type="number" placeholder="Weight (g)"
                  value={ing.targetWeight}
                  onChange={e => updateIngredient(i, "targetWeight", e.target.value)}
                  style={{ flex: 1 }} />

                <button onClick={() => removeIngredient(i)} disabled={form.ingredients.length === 1}
                  style={{
                    background: "none", border: "1px solid var(--border)", borderRadius: "6px",
                    padding: "6px 10px", cursor: "pointer", color: "var(--error)",
                    fontSize: "0.85rem", opacity: form.ingredients.length === 1 ? 0.4 : 1,
                  }}>🗑</button>
              </div>
            ))}
          </div>

          {/* Add ingredient */}
          <button className="btn btn-ghost" onClick={addIngredient}
            style={{ marginBottom: "16px", fontSize: "0.82rem" }}>
            + Add Ingredient
          </button>

          {/* Save / Cancel */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : editKey ? "✔ Update Recipe" : "✔ Save Recipe"}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ══════════════════════════
          RECIPE LIST + DETAIL
      ══════════════════════════ */}
      <div className="grid-2" style={{ gap: "20px", alignItems: "start" }}>

        {/* Left: list */}
        <div>
          {/* Search */}
          <div className="card" style={{ padding: "14px 16px", marginBottom: "14px" }}>
            <input className="input" placeholder="🔍 Search recipes..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {/* Category pills */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setCategory(cat)} style={{
                padding: "5px 12px", borderRadius: "99px",
                cursor: "pointer", fontSize: "0.78rem", fontWeight: 500,
                background: category === cat ? "var(--accent)" : "var(--bg-card)",
                color: category === cat ? "white" : "var(--text-secondary)",
                border: category === cat ? "none" : "1px solid var(--border)",
                transition: "all 0.15s",
              }}>
                {cat} ({catCount(cat)})
              </button>
            ))}
          </div>

          {/* Recipe cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                No recipes found
              </div>
            ) : (
              filtered.map(([key, recipe]) => (
                <div key={key} className="card" style={{
                  cursor: "pointer", padding: "12px 14px",
                  border: selected === key ? "2px solid var(--accent)" : "1px solid var(--border)",
                  background: selected === key ? "var(--accent-light)" : "var(--bg-card)",
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                    onClick={() => setSelected(selected === key ? null : key)}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem",
                        color: selected === key ? "var(--accent)" : "var(--text-primary)" }}>
                        {recipe.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {Object.keys(recipe.ingredients || {}).length} ingredients
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="badge badge-accent">{recipe.category}</span>
                      {/* Edit + Delete */}
                      <button className="btn btn-secondary" style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                        onClick={e => { e.stopPropagation(); openEdit(key); }}>✏️</button>
                      <button className="btn btn-danger" style={{ padding: "3px 8px", fontSize: "0.72rem" }}
                        onClick={e => { e.stopPropagation(); handleDelete(key); }}>🗑</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: detail */}
        <div style={{ position: "sticky", top: "20px" }}>
          {!selectedRecipe ? (
            <div className="card" style={{ padding: "40px", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📋</div>
              <h3 style={{ marginBottom: "6px" }}>Select a Recipe</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Click any recipe to see its ingredients and steps
              </p>
            </div>
          ) : (
            <div className="card">
              <div style={{ marginBottom: "16px", paddingBottom: "14px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ marginBottom: "4px" }}>{selectedRecipe.name}</h2>
                    <span className="badge badge-accent">{selectedRecipe.category}</span>
                  </div>
                  <button onClick={() => setSelected(null)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "1.2rem", color: "var(--text-muted)",
                  }}>✕</button>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                {[
                  { label: "Ingredients", value: Object.keys(selectedRecipe.ingredients || {}).length },
                  { label: "Total Weight", value: Object.values(selectedRecipe.ingredients || {}).reduce((s, i) => s + (i.targetWeight || 0), 0) + "g" },
                  { label: "Steps", value: Object.keys(selectedRecipe.ingredients || {}).length },
                ].map(({ label, value }) => (
                  <div key={label} style={{ textAlign: "center", flex: 1, padding: "10px",
                    background: "var(--bg-app)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent)" }}>{value}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Steps */}
              <h3 style={{ marginBottom: "10px" }}>Ingredients & Steps</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {Object.entries(selectedRecipe.ingredients || {}).map(([step, ing]) => (
                  <div key={step} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "10px 12px", background: "var(--bg-app)", borderRadius: "8px",
                  }}>
                    <div style={{
                      width: "24px", height: "24px", borderRadius: "50%",
                      background: "var(--accent)", color: "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
                    }}>{Number(step) + 1}</div>
                    <span style={{ flex: 1, fontWeight: 500, fontSize: "0.875rem",
                      color: "var(--text-primary)", textTransform: "capitalize" }}>
                      {ing.item}
                    </span>
                    <span className="badge badge-accent">{ing.targetWeight}g</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default AdminRecipes;
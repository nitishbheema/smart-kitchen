import { db } from "../firebase/firebaseConfig";
import { ref, set, get, update } from "firebase/database";

// ── Generate a random kitchen code ──
export const generateKitchenCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "KITCHEN-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// ── Create kitchen for new admin ──
// Copies all recipe + stock templates into their kitchen node
export const createKitchen = async (adminUID, kitchenName) => {
  const code = generateKitchenCode();

  // 1. Fetch templates from Firebase
  const recipesSnap = await get(ref(db, "recipeTemplates"));
  const stockSnap   = await get(ref(db, "stockTemplates"));

  const recipeTemplates = recipesSnap.val() || {};
  const stockTemplates  = stockSnap.val()   || {};

  // 2. Build stock object from templates
  const stock = {};
  Object.entries(stockTemplates).forEach(([key, item]) => {
    stock[key] = {
      name:          item.name,
      quantity:      item.defaultQuantity,
      unit:          item.unit,
      lowStockLimit: item.lowStockLimit,
    };
  });

  // 3. Write everything to kitchens/{adminUID}
  await set(ref(db, `kitchens/${adminUID}`), {
    code,
    name:      kitchenName || "My Kitchen",
    adminUID,
    createdAt: Date.now(),
    chefs:     {},
    recipes:   recipeTemplates,
    stock,
  });

  return code;
};

// ── Find kitchen by code ──
export const findKitchenByCode = async (code) => {
  const snap = await get(ref(db, "kitchens"));
  if (!snap.exists()) return null;

  const kitchens = snap.val();
  const entry = Object.entries(kitchens).find(
    ([, k]) => k.code === code.trim().toUpperCase()
  );

  if (!entry) return null;
  return { adminUID: entry[0], ...entry[1] };
};

// ── Add chef to kitchen ──
export const addChefToKitchen = async (adminUID, chefUID) => {
  await update(ref(db, `kitchens/${adminUID}/chefs`), {
    [chefUID]: true,
  });
};

// ── Get kitchen data ──
export const getKitchen = async (adminUID) => {
  const snap = await get(ref(db, `kitchens/${adminUID}`));
  return snap.exists() ? snap.val() : null;
};
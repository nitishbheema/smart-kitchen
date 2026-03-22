import { db } from "../firebase/firebaseConfig";
import { ref, get, update, push, onValue } from "firebase/database";

// ── Deduct ingredient from stock after a successful cook step ──
export const deductStock = async (adminUID, ingredientName, usedWeight) => {
  if (!adminUID || !ingredientName || !usedWeight) return;

  const stockSnap = await get(ref(db, `kitchens/${adminUID}/stock`));
  if (!stockSnap.exists()) return;

  const stock = stockSnap.val();

  const match = Object.entries(stock).find(
    ([, item]) => item.name?.toLowerCase() === ingredientName.toLowerCase()
  );

  if (!match) return;

  const [key, item] = match;
  const newQty = Math.max(0, (item.quantity || 0) - usedWeight);

  await update(ref(db, `kitchens/${adminUID}/stock/${key}`), {
    quantity: newQty,
  });

  if (newQty <= item.lowStockLimit) {
    await pushAlert(adminUID, {
      type:       "LOW_STOCK",
      ingredient: item.name,
      quantity:   newQty,
      unit:       item.unit,
      lowLimit:   item.lowStockLimit,
    });
  }
};

// ── Push alert to Firebase ──
export const pushAlert = async (adminUID, data) => {
  await push(ref(db, `alerts/${adminUID}`), {
    ...data,
    resolved:  false,
    timestamp: Date.now(),
  });
};

// ── Listen to unresolved alerts ──
export const listenAlerts = (adminUID, callback) => {
  onValue(ref(db, `alerts/${adminUID}`), (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    const list = Object.entries(data)
      .map(([id, alert]) => ({ id, ...alert }))
      .filter(a => !a.resolved)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    callback(list);
  });
};

// ── Resolve an alert ──
export const resolveAlert = async (adminUID, alertId) => {
  await update(ref(db, `alerts/${adminUID}/${alertId}`), {
    resolved: true,
  });
};
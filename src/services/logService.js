import { db } from "../firebase/firebaseConfig";
import { ref, push, onValue } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getUser } from "./userService";
import { deductStock } from "./stockService";

// ── Add a log + auto deduct stock ──
export const addLog = async (data) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const profile  = await getUser(user.uid);
  const adminUID = profile?.kitchenId;
  if (!adminUID) return;

  // 1. Save the log
  const logRef = ref(db, `logs/${adminUID}`);
  await push(logRef, {
    ...data,
    chefId:    user.uid,
    user:      profile?.name || user.email || "unknown",
    timestamp: Date.now(),
  });

  // 2. Auto deduct stock only if step was OK or OVER
  // (UNDER means they didn't add enough so we don't deduct full amount)
  if (data.status === "OK" || data.status === "OVER") {
    await deductStock(adminUID, data.item, data.weight);
  } else if (data.status === "UNDER") {
    // Still deduct what was used
    await deductStock(adminUID, data.item, data.weight);
  }
};

// ── Listen to logs ──
export const listenLogs = (adminUID, callback) => {
  const logRef = ref(db, `logs/${adminUID}`);
  onValue(logRef, (snap) => {
    const data = snap.val();
    if (!data) { callback([]); return; }
    const list = Object.values(data).reverse();
    callback(list);
  });
};
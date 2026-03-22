import { db } from "../firebase/firebaseConfig";
import { ref, set, get } from "firebase/database";

// ── Save user profile after signup ──
export const saveUser = async (uid, data) => {
  await set(ref(db, `users/${uid}`), {
    ...data,
    createdAt: Date.now(),
  });
};

// ── Get user profile ──
export const getUser = async (uid) => {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
};
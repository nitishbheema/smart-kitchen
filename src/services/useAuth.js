import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getUser } from "./userService";
import { app } from "../firebase/firebaseConfig";

const auth = getAuth(app);

// Returns { user, profile, loading }
// user    → Firebase auth user (or null)
// profile → { name, role, kitchenId } from Firebase DB (or null)
// loading → true while checking auth state

export function useAuth() {
  const [user, setUser]       = useState(undefined); // undefined = still loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        // fetch their profile to get role
        const p = await getUser(u.uid);
        setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return () => unsub();
  }, []);

  return { user, profile, loading: user === undefined };
}
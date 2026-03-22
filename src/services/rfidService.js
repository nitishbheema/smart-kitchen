import { db } from "../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";

export const listenRFID = (adminUID, callback) => {
  const rfidRef = ref(db, `liveData/${adminUID}/currentRFID`);
  onValue(rfidRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || "none");
  });
};
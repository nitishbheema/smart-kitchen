import { db } from "../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
 
export const listenWeight = (adminUID, callback) => {
  const weightRef = ref(db, `liveData/${adminUID}/weight`);
  onValue(weightRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || 0);
  });
};
 
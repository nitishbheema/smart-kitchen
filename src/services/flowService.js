import { db } from "../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";

export const listenFlow = (dish, callback) => {
  const flowRef = ref(db, `recipeFlow/${dish}`);

  onValue(flowRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || {});
  });
};
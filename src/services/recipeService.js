import { db } from "../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";

export const listenRecipes = (callback) => {
  const recipeRef = ref(db, "recipes");

  onValue(recipeRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  });
};
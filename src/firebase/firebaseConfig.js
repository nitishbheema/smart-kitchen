import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";


const firebaseConfig = {
  apiKey: "AIzaSyDsMSEqO9aepha3LT-9d_eNA_en13ikRSA",
  authDomain: "smart-kitchen-5a2e5.firebaseapp.com",
  databaseURL: "https://smart-kitchen-5a2e5-default-rtdb.firebaseio.com",
  projectId: "smart-kitchen-5a2e5",
  storageBucket: "smart-kitchen-5a2e5.firebasestorage.app",
  messagingSenderId: "1011700568709",
  appId: "1:1011700568709:web:c84e49f23ddf09ce728fec"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
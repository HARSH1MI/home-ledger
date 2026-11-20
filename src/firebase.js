import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQ9AUxgAyOonveuJ8NJz0rV42tSR7HclQ",
  authDomain: "home-ledger-e3f98.firebaseapp.com",
  projectId: "home-ledger-e3f98",
  storageBucket: "home-ledger-e3f98.firebasestorage.app",
  messagingSenderId: "309930271447",
  appId: "1:309930271447:web:e18b67b55ff53046cac692"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
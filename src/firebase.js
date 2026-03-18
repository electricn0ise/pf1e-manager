import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyDKX5qk6yN1OpbwFEJ4BP0lKp18mh5Mors",
  authDomain:        "pf1e-manager.firebaseapp.com",
  projectId:         "pf1e-manager",
  storageBucket:     "pf1e-manager.firebasestorage.app",
  messagingSenderId: "888597555462",
  appId:             "1:888597555462:web:8cab58e7bfd84a7e2e1687",
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// src/context/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyDB9NCO-1m6XZG_FN2wZNRXl9R-GGyQw80",
  authDomain:        "hospital-3b575.firebaseapp.com",
  projectId:         "hospital-3b575",
  storageBucket:     "hospital-3b575.firebasestorage.app",
  messagingSenderId: "120650690852",
  appId:             "1:120650690852:web:03d902c1bafa48b39ac3b1",
  databaseURL:       "https://hospital-3b575-default-rtdb.firebaseio.com",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db   = getDatabase(app);
export const auth = getAuth(app);
export default app;
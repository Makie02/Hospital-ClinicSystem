// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { ref, onValue, get, query, orderByChild, equalTo } from "firebase/database";
import { auth, db } from "./firebase";

export const ALL_MODULES = [
  "dashboard","patients","appointments","doctors",
  "records","pharmacy","lab","billing","ipd","inventory",
  "settings","users","maintenance",
];

const SUPERADMIN_PROFILE = {
  id:        "superadmin-hardcoded-uid",
  uid:       "superadmin-hardcoded-uid",
  firstName: "Super",
  lastName:  "Admin",
  email:     "superadmin@clinic.local",
  role:      "superadmin",
  status:    "Active",
  modules:   ALL_MODULES,
};

const SUPERADMIN_USER = { uid: SUPERADMIN_PROFILE.uid };

// ─── Storage keys ─────────────────────────────────────────────────────────────
const ADMIN_KEY = "medicore_admin_session";
const SUPER_KEY = "medicore_super_session";

// ─── Helpers — write to both storages for resilience on hard reload ───────────
function saveAdmin(user, profile) {
  try {
    const raw = JSON.stringify({ user, profile });
    sessionStorage.setItem(ADMIN_KEY, raw);
    localStorage.setItem(ADMIN_KEY, raw);
  } catch {}
}
function loadAdmin() {
  try {
    const s = sessionStorage.getItem(ADMIN_KEY);
    if (s) return JSON.parse(s);
    const l = localStorage.getItem(ADMIN_KEY);
    if (l) { sessionStorage.setItem(ADMIN_KEY, l); return JSON.parse(l); }
  } catch {}
  return null;
}
function clearAdmin() {
  try {
    sessionStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(ADMIN_KEY);
  } catch {}
}

function saveSuper() {
  try {
    sessionStorage.setItem(SUPER_KEY, "1");
    localStorage.setItem(SUPER_KEY, "1");
  } catch {}
}
function loadSuper() {
  try {
    return !!(sessionStorage.getItem(SUPER_KEY) || localStorage.getItem(SUPER_KEY));
  } catch {}
  return false;
}
function clearSuper() {
  try {
    sessionStorage.removeItem(SUPER_KEY);
    localStorage.removeItem(SUPER_KEY);
  } catch {}
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children, onPatientLogin }) {
  // ✅ Initialize SYNCHRONOUSLY from storage so the very first render
  //    already has the correct state — no blank flash or Login redirect.
  const [user, setUser] = useState(() => {
    if (loadSuper()) return SUPERADMIN_USER;
    return loadAdmin()?.user ?? null;
  });
  const [profile, setProfile] = useState(() => {
    if (loadSuper()) return SUPERADMIN_PROFILE;
    return loadAdmin()?.profile ?? null;
  });
  // ✅ loading starts FALSE when cache exists — no FullScreenLoader flash
  const [loading, setLoading] = useState(() => {
    if (loadSuper()) return false;
    if (loadAdmin()) return false;
    return true; // fresh visit — wait for Firebase
  });
  const [error,             setError]             = useState("");
  const [isSuperadminLocal, setIsSuperadminLocal] = useState(() => loadSuper());

  // ─── Firebase auth listener ─────────────────────────────────────────────────
  useEffect(() => {
    // Superadmin uses fake session — skip Firebase entirely
    if (isSuperadminLocal) return;

    let dbUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (dbUnsub) { dbUnsub(); dbUnsub = null; }

      if (!firebaseUser) {
        // Firebase says no user — clear everything
        clearAdmin();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // ── Check kung patient siya BAGO i-load bilang admin ──────────────────
      try {
        const patientSnap = await get(
          query(ref(db, "patients"), orderByChild("uid"), equalTo(firebaseUser.uid))
        );
        if (patientSnap.exists()) {
          const [id, data] = Object.entries(patientSnap.val())[0];
          await signOut(auth);
          clearAdmin();
          setUser(null);
          setProfile(null);
          setLoading(false);
          if (onPatientLogin) onPatientLogin({ id, ...data });
          return;
        }
      } catch {}

      // ── Hindi patient — i-load bilang admin/staff ─────────────────────────
      setUser(firebaseUser);

      const profileRef = ref(db, `users/${firebaseUser.uid}`);
      dbUnsub = onValue(profileRef, (snap) => {
        const data = snap.val();
        const resolvedProfile = data
          ? {
              ...data,
              id:      firebaseUser.uid,
              modules: data.role === "superadmin"
                ? ALL_MODULES
                : (data.modules || ["dashboard"]),
            }
          : {
              // Fallback kung walang DB record
              id:        firebaseUser.uid,
              email:     firebaseUser.email,
              firstName: "User",
              lastName:  "",
              role:      "staff",
              status:    "Active",
              modules:   ["dashboard"],
            };

        setProfile(resolvedProfile);
        // ✅ Save to storage so next reload is instant
        saveAdmin(firebaseUser, resolvedProfile);
        setLoading(false);
      });
    });

    return () => { authUnsub(); if (dbUnsub) dbUnsub(); };
  }, [isSuperadminLocal]);

  // ─── Superadmin login (no Firebase) ─────────────────────────────────────────
  const loginAsSuperadmin = () => {
    saveSuper(); // ✅ persist across reload
    setIsSuperadminLocal(true);
    setProfile(SUPERADMIN_PROFILE);
    setUser(SUPERADMIN_USER);
    setLoading(false);
    setError("");
  };

  // ─── Firebase login ──────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      const msg = {
        "auth/user-not-found":     "No account found with that email.",
        "auth/wrong-password":     "Incorrect password.",
        "auth/invalid-email":      "Invalid email address.",
        "auth/too-many-requests":  "Too many failed attempts. Try again later.",
        "auth/user-disabled":      "This account has been disabled.",
        "auth/invalid-credential": "Invalid email or password.",
      }[e.code] || "Login failed. Please check your credentials.";
      setError(msg);
      throw new Error(msg);
    }
  };

  // ─── Logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    clearAdmin(); // ✅ clear both storages
    clearSuper();
    setIsSuperadminLocal(false);
    setProfile(null);
    setUser(null);
    setLoading(false);
    try { await signOut(auth); } catch {}
  };

  // ─── Access helpers ──────────────────────────────────────────────────────────
  const hasAccess    = (moduleId) => profile?.modules?.includes(moduleId) ?? false;
  const isSuperAdmin = ()         => profile?.role === "superadmin";
  const isAdmin      = ()         => profile?.role === "admin" || profile?.role === "superadmin";
  const isSuspended  = ()         => profile?.status === "Suspended";

  return (
    <AuthContext.Provider value={{
      user, profile, loading, error,
      login, loginAsSuperadmin, logout,
      hasAccess, isSuperAdmin, isAdmin, isSuspended,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
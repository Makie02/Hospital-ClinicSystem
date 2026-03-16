// src/App.js
import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ref, onValue } from "firebase/database";
import { db } from "./context/firebase";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import MaintenancePage from "./Maintenance/Maintenancepage";
import PatientDashboard from "./Patients_homepage/PatientDashboard";
import { PatientProvider } from "./context/PatientContext";

// ─── Session keys ─────────────────────────────────────────────────────────────
const PATIENT_SESSION_KEY = "medicore_patient_session";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function savePatientSession(patient) {
  try {
    const raw = JSON.stringify(patient);
    sessionStorage.setItem(PATIENT_SESSION_KEY, raw);
    localStorage.setItem(PATIENT_SESSION_KEY, raw);
  } catch {}
}
function loadPatientSession() {
  try {
    const s = sessionStorage.getItem(PATIENT_SESSION_KEY);
    if (s) return JSON.parse(s);
    const l = localStorage.getItem(PATIENT_SESSION_KEY);
    if (l) { sessionStorage.setItem(PATIENT_SESSION_KEY, l); return JSON.parse(l); }
  } catch {}
  return null;
}
function clearPatientSession() {
  try {
    sessionStorage.removeItem(PATIENT_SESSION_KEY);
    localStorage.removeItem(PATIENT_SESSION_KEY);
  } catch {}
}

// ─── Full screen loader ───────────────────────────────────────────────────────
function FullScreenLoader() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#080b12", gap: 16,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%",
        border: "3px solid rgba(59,130,246,0.25)",
        borderTopColor: "#3b82f6",
        animation: "spin .8s linear infinite",
      }} />
      <p style={{ margin: 0, fontSize: 13, color: "#475569", fontFamily: "system-ui" }}>
        Loading…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Maintenance checker hook ─────────────────────────────────────────────────
// Listens to Firebase maintenanceSettings in real-time.
// Returns { isMaintenanceMode, maintenanceSettings, loadingMaintenance }
function useMaintenanceMode() {
  const [isMaintenanceMode,    setIsMaintenanceMode]    = useState(false);
  const [maintenanceSettings,  setMaintenanceSettings]  = useState(null);
  const [loadingMaintenance,   setLoadingMaintenance]   = useState(true);

  useEffect(() => {
    // ✅ Listen to the explicit maintenanceMode flag written by MaintenanceAll.jsx
    const unsub = onValue(ref(db, "maintenanceSettings"), (snap) => {
      if (!snap.exists()) {
        setIsMaintenanceMode(false);
        setMaintenanceSettings(null);
        setLoadingMaintenance(false);
        return;
      }
      const data = snap.val();
      setMaintenanceSettings(data);
      // Use explicit flag if present, fallback to modules check
      if (typeof data.maintenanceMode === "boolean") {
        setIsMaintenanceMode(data.maintenanceMode);
      } else if (data.modules) {
        setIsMaintenanceMode(Object.values(data.modules).some(v => v === false));
      } else {
        setIsMaintenanceMode(false);
      }
      setLoadingMaintenance(false);
    });
    return () => unsub();
  }, []);

  return { isMaintenanceMode, maintenanceSettings, loadingMaintenance };
}

// ─── Admin content (inside AuthProvider) ─────────────────────────────────────
function AdminContent({ onPatientLogin }) {
  const { user, profile, loading } = useAuth();
  const { isMaintenanceMode, loadingMaintenance } = useMaintenanceMode();

  if (loading || loadingMaintenance) return <FullScreenLoader />;
  if (!user) return <Login onPatientLogin={onPatientLogin} />;

  // ✅ Superadmin ALWAYS bypasses maintenance — full access
  const isSuperadmin = profile?.role === "superadmin" || user?.isSuperadmin;
  if (isMaintenanceMode && !isSuperadmin) {
    return (
      <MaintenancePage
        user={profile || user}
        onLogout={() => {
          // AuthContext's logout will flip user to null → Login renders
          import("./context/firebase").then(({ auth }) => {
            import("firebase/auth").then(({ signOut }) => signOut(auth));
          });
        }}
      />
    );
  }

  return <Layout />;
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [patientUser, setPatientUser] = useState(() => loadPatientSession());

  const handlePatientLogin = (patient) => {
    savePatientSession(patient);
    setPatientUser(patient);
  };
  const handlePatientLogout = () => {
    clearPatientSession();
    setPatientUser(null);
  };

  return (
    <ThemeProvider>
      {patientUser ? (
        // ── Patient branch ────────────────────────────────────────────────────
        // ✅ Patients also get the maintenance gate
        <PatientMaintenanceGate
          patientUser={patientUser}
          onPatientLogout={handlePatientLogout}
        />
      ) : (
        // ── Admin / Staff branch ──────────────────────────────────────────────
        <AuthProvider onPatientLogin={handlePatientLogin}>
          <AdminContent onPatientLogin={handlePatientLogin} />
        </AuthProvider>
      )}
    </ThemeProvider>
  );
}

// ─── Patient maintenance gate ─────────────────────────────────────────────────
// Patients are also blocked during maintenance — they are NOT superadmin.
function PatientMaintenanceGate({ patientUser, onPatientLogout }) {
  const { isMaintenanceMode, loadingMaintenance } = useMaintenanceMode();

  if (loadingMaintenance) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#080b12" }}>
      <div style={{ width:38, height:38, borderRadius:"50%", border:"3px solid rgba(59,130,246,0.25)", borderTopColor:"#3b82f6", animation:"spin .8s linear infinite" }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (isMaintenanceMode) {
    return (
      <MaintenancePage
        user={patientUser}
        onLogout={onPatientLogout}
      />
    );
  }

  return (
    <LanguageProvider>
      <PatientProvider patient={patientUser}>
        <PatientDashboard
          patient={patientUser}
          onLogout={onPatientLogout}
        />
      </PatientProvider>
    </LanguageProvider>
  );
}
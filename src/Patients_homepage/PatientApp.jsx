// src/Patients_homepage/PatientApp.jsx
import React, { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import { auth, db } from "../context/firebase";
import PatientLogin from "./Patientlogin";
import PatientDashboard from "./PatientDashboard";

export default function PatientApp() {
  const [patient, setPatient] = useState(null);  // null = not logged in
  const [checking, setChecking] = useState(true);  // checking firebase auth state

  // Check if there's already a logged-in patient on page load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await get(
            query(ref(db, "patients"), orderByChild("uid"), equalTo(user.uid))
          );
          if (snap.exists()) {
            const [id, data] = Object.entries(snap.val())[0];
            setPatient({ id, ...data });
          } else {
            // Auth user exists but no patient record — sign out silently
            await auth.signOut();
            setPatient(null);
          }
        } catch {
          setPatient(null);
        }
      } else {
        setPatient(null);
      }
      setChecking(false);
    });
    return () => unsub();
  }, []);

  if (checking) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#eff6ff,#e0f2fe)",
        flexDirection: "column",
        gap: 16,
        fontFamily: "'Nunito', system-ui, sans-serif",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: "linear-gradient(135deg,#1d4ed8,#0284c7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 10px 28px rgba(29,78,216,0.3)",
        }}>
          {/* Heart SVG inline */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#1e3a8a" }}>MediCore</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>Naglo-load…</p>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!patient) {
    return <PatientLogin onLogin={(p) => setPatient(p)} />;
  }

  return (
    <PatientDashboard
      patient={patient}
      onLogout={() => setPatient(null)}
    />
  );
}
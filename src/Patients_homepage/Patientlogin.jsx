// src/Patients_homepage/PatientLogin.jsx
import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { ref, push, set, get, query, orderByChild, equalTo } from "firebase/database";
import { auth, db } from "../context/firebase";
import {
  Eye, EyeOff, Activity, AlertCircle, Lock,
  User, Mail, Phone, MapPin, Calendar, Droplets, ArrowLeft,
} from "lucide-react";

const BLOOD_TYPES  = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const GENDERS      = ["Male","Female","Other"];

const EMPTY_REG = {
  firstName:"", lastName:"", email:"", password:"", confirmPassword:"",
  age:"", gender:"", contact:"", address:"", bloodType:"", allergies:"",
};

export default function PatientLogin({ onLogin }) {
  const [mode, setMode]       = useState("login"); // "login" | "register"
  const [form, setForm]       = useState(EMPTY_REG);
  const [showPw, setShowPw]   = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [step, setStep]       = useState(1); // register multi-step: 1 or 2

  const set_ = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email.trim() || !form.password) { setError("Punan ang lahat ng fields."); return; }
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      // Verify this user is a patient (has patientUid in Firebase)
      const snap = await get(query(ref(db, "patients"), orderByChild("uid"), equalTo(cred.user.uid)));
      if (!snap.exists()) {
        await auth.signOut();
        setError("Walang patient account na nakalink sa email na ito.");
        return;
      }
      const [id, data] = Object.entries(snap.val())[0];
      onLogin({ id, ...data });
    } catch (err) {
      const msgs = {
        "auth/user-not-found":     "Walang account sa email na iyan.",
        "auth/wrong-password":     "Mali ang password.",
        "auth/invalid-email":      "Invalid na email.",
        "auth/invalid-credential": "Mali ang email o password.",
        "auth/too-many-requests":  "Maraming beses na nagtry. Subukan ulit mamaya.",
      };
      setError(msgs[err.code] || "Login failed. Subukan ulit.");
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!form.firstName.trim()) return "Kailangan ang first name.";
    if (!form.lastName.trim())  return "Kailangan ang last name.";
    if (!form.email.trim())     return "Kailangan ang email.";
    if (!form.password)         return "Kailangan ang password.";
    if (form.password.length < 6) return "Password dapat 6 characters pataas.";
    if (form.password !== form.confirmPassword) return "Hindi magkapareho ang passwords.";
    return "";
  };
  const validateStep2 = () => {
    if (!form.age || isNaN(form.age) || +form.age < 0 || +form.age > 150) return "Ilagay ang tamang edad (0–150).";
    if (!form.gender)    return "Piliin ang gender.";
    if (!form.bloodType) return "Piliin ang blood type.";
    return "";
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    const err = validateStep2();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);

      // Count existing patients for ID
      const snap = await get(ref(db, "patients"));
      const count = snap.exists() ? Object.keys(snap.val()).length : 0;
      const patientId = `P-${String(count + 1).padStart(4, "0")}`;
      const now = Date.now();

      const patientData = {
        uid: cred.user.uid,
        patientId,
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        age:       form.age,
        gender:    form.gender,
        contact:   form.contact,
        address:   form.address,
        bloodType: form.bloodType,
        allergies: form.allergies || "None",
        status:    "Active",
        createdAt: now,
        updatedAt: now,
      };

      // Save to Firebase patients node
      const newRef = await push(ref(db, "patients"), patientData);
      onLogin({ id: newRef.key, ...patientData });
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "Ginamit na ang email na iyan. Mag-login na lang.",
        "auth/invalid-email":        "Invalid na email address.",
        "auth/weak-password":        "Masyadong mahina ang password. Gumamit ng mas mahaba.",
      };
      setError(msgs[err.code] || err.message || "Registration failed. Subukan ulit.");
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const inputStyle = (focused) => ({
    width: "100%", boxSizing: "border-box",
    background: "#f8fafc",
    border: `1.5px solid ${focused ? "#3b82f6" : "#e2e8f0"}`,
    borderRadius: 12, padding: "11px 14px 11px 38px",
    fontSize: 13, color: "#0f172a", outline: "none",
    boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.12)" : "none",
    transition: "all 0.2s",
  });

  const [focused, setFocused] = useState({});
  const foc  = (k) => () => setFocused(p => ({ ...p, [k]: true }));
  const blur = (k) => () => setFocused(p => ({ ...p, [k]: false }));

  const IconInput = ({ icon: Icon, id, type = "text", placeholder, value, onChange, rightEl }) => (
    <div style={{ position: "relative" }}>
      <Icon size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        style={inputStyle(focused[id])}
        onFocus={foc(id)} onBlur={blur(id)}
      />
      {rightEl}
    </div>
  );

  const SelectInput = ({ id, value, onChange, options, placeholder }) => (
    <select
      value={value} onChange={onChange}
      style={{ width: "100%", boxSizing: "border-box", background: "#f8fafc", border: `1.5px solid ${focused[id] ? "#3b82f6" : "#e2e8f0"}`, borderRadius: 12, padding: "11px 14px", fontSize: 13, color: value ? "#0f172a" : "#94a3b8", outline: "none", cursor: "pointer", transition: "all 0.2s", colorScheme: "light" }}
      onFocus={foc(id)} onBlur={blur(id)}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const FLabel = ({ children }) => (
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6, color: "#64748b" }}>{children}</label>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#eff6ff 0%,#f0fdf4 50%,#faf5ff 100%)", padding: 16, position: "relative", overflow: "hidden" }}>

      {/* Background blobs */}
      <div style={{ position: "absolute", top: "-10%", left: "-5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.1),transparent 65%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(16,185,129,0.08),transparent 65%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: mode === "register" && step === 2 ? 540 : 440, position: "relative", zIndex: 1, transition: "max-width .3s" }}>

        {/* Card */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 60px rgba(59,130,246,0.1), 0 4px 16px rgba(0,0,0,0.06)" }}>
          <div style={{ height: 4, background: "linear-gradient(90deg,#3b82f6,#10b981,#8b5cf6)" }} />

          {/* Header */}
          <div style={{ padding: "32px 36px 24px", textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, margin: "0 auto 16px", background: "linear-gradient(135deg,#3b82f6,#10b981)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 28px rgba(59,130,246,0.3)" }}>
              <Activity size={28} color="#fff" />
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a" }}>MediCore</h1>
            <p style={{ margin: "5px 0 0", fontSize: 12, color: "#64748b" }}>Patient Portal</p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", margin: "0 36px 24px", background: "#f1f5f9", borderRadius: 12, padding: 4 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); setStep(1); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all .2s",
                  background: mode === m ? "#fff" : "transparent",
                  color: mode === m ? "#0f172a" : "#64748b",
                  boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                }}>
                {m === "login" ? "Mag-login" : "Mag-register"}
              </button>
            ))}
          </div>

          <div style={{ padding: "0 36px 36px" }}>

            {/* Error */}
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 16, borderRadius: 12, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444", fontSize: 13 }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            {/* ── LOGIN FORM ── */}
            {mode === "login" && (
              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <FLabel>Email</FLabel>
                  <IconInput icon={Mail} id="lemail" type="email" placeholder="email@example.com" value={form.email} onChange={set_("email")} />
                </div>
                <div>
                  <FLabel>Password</FLabel>
                  <IconInput icon={Lock} id="lpw" type={showPw ? "text" : "password"} placeholder="Ilagay ang password" value={form.password} onChange={set_("password")}
                    rightEl={<button type="button" onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
                  />
                </div>
                <button type="submit" disabled={loading}
                  style={{ marginTop: 6, padding: "13px 0", borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(59,130,246,.5)" : "linear-gradient(135deg,#3b82f6,#10b981)", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: loading ? "none" : "0 8px 20px rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
                  {loading ? <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite" }} /> Logging in…</> : "Mag-login"}
                </button>
                <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", margin: 0 }}>
                  Wala pang account?{" "}
                  <button type="button" onClick={() => { setMode("register"); setError(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontWeight: 700, fontSize: 12 }}>Mag-register</button>
                </p>
              </form>
            )}

            {/* ── REGISTER FORM STEP 1 ── */}
            {mode === "register" && step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); const err = validateStep1(); if (err) { setError(err); return; } setError(""); setStep(2); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <FLabel>First Name</FLabel>
                    <IconInput icon={User} id="rfn" placeholder="Juan" value={form.firstName} onChange={set_("firstName")} />
                  </div>
                  <div>
                    <FLabel>Last Name</FLabel>
                    <IconInput icon={User} id="rln" placeholder="dela Cruz" value={form.lastName} onChange={set_("lastName")} />
                  </div>
                </div>
                <div>
                  <FLabel>Email</FLabel>
                  <IconInput icon={Mail} id="remail" type="email" placeholder="email@example.com" value={form.email} onChange={set_("email")} />
                </div>
                <div>
                  <FLabel>Password</FLabel>
                  <IconInput icon={Lock} id="rpw" type={showPw ? "text" : "password"} placeholder="Min. 6 characters" value={form.password} onChange={set_("password")}
                    rightEl={<button type="button" onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>{showPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
                  />
                </div>
                <div>
                  <FLabel>Confirm Password</FLabel>
                  <IconInput icon={Lock} id="rcpw" type={showCPw ? "text" : "password"} placeholder="Ulitin ang password" value={form.confirmPassword} onChange={set_("confirmPassword")}
                    rightEl={<button type="button" onClick={() => setShowCPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex" }}>{showCPw ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#3b82f6" }} />
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#e2e8f0" }} />
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: 0 }}>Hakbang 1 ng 2 — Account info</p>
                <button type="submit"
                  style={{ padding: "13px 0", borderRadius: 14, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: "0 8px 20px rgba(99,102,241,0.3)" }}>
                  Susunod →
                </button>
              </form>
            )}

            {/* ── REGISTER FORM STEP 2 ── */}
            {mode === "register" && step === 2 && (
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <FLabel>Edad</FLabel>
                    <IconInput icon={Calendar} id="rage" type="number" placeholder="25" value={form.age} onChange={set_("age")} />
                  </div>
                  <div>
                    <FLabel>Gender</FLabel>
                    <SelectInput id="rgender" value={form.gender} onChange={set_("gender")} options={GENDERS} placeholder="Piliin" />
                  </div>
                  <div>
                    <FLabel>Blood Type</FLabel>
                    <SelectInput id="rblood" value={form.bloodType} onChange={set_("bloodType")} options={BLOOD_TYPES} placeholder="Piliin" />
                  </div>
                </div>
                <div>
                  <FLabel>Contact Number</FLabel>
                  <IconInput icon={Phone} id="rphone" placeholder="09XXXXXXXXX" value={form.contact} onChange={set_("contact")} />
                </div>
                <div>
                  <FLabel>Address</FLabel>
                  <IconInput icon={MapPin} id="raddr" placeholder="Barangay, Lungsod, Lalawigan" value={form.address} onChange={set_("address")} />
                </div>
                <div>
                  <FLabel>Allergies (ilagay ang "None" kung wala)</FLabel>
                  <IconInput icon={AlertCircle} id="rallerg" placeholder="e.g. Penicillin, Aspirin" value={form.allergies} onChange={set_("allergies")} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#3b82f6" }} />
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: "#3b82f6" }} />
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: 0 }}>Hakbang 2 ng 2 — Personal info</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={() => { setStep(1); setError(""); }}
                    style={{ flex: 1, padding: "13px 0", borderRadius: 14, border: "1.5px solid #e2e8f0", cursor: "pointer", background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <ArrowLeft size={14} /> Bumalik
                  </button>
                  <button type="submit" disabled={loading}
                    style={{ flex: 2, padding: "13px 0", borderRadius: 14, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(16,185,129,.5)" : "linear-gradient(135deg,#10b981,#3b82f6)", color: "#fff", fontSize: 14, fontWeight: 700, boxShadow: loading ? "none" : "0 8px 20px rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    {loading ? <><div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite" }} /> Nagre-register…</> : "I-register ang Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 20 }}>© 2025 MediCore. All rights reserved.</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
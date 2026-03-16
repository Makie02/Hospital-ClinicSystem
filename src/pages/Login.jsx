// src/pages/Login.jsx
// ─── UNIFIED LOGIN — Auto-detect role (Admin or Patient) + Maintenance Gate ───
import React, { useState, useRef, useCallback, useEffect } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { ref, push, get, query, orderByChild, equalTo, onValue } from "firebase/database";
import { auth, db } from "../context/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Eye, EyeOff, AlertCircle, Lock, Clock,
  Mail, Phone, MapPin, Calendar, ArrowLeft, User, ShieldCheck, RefreshCw,
  Wrench,
} from "lucide-react";
import BgClinic from "../Image/BgClinic.png";
import LogoMed from "../Image/logomed.png";

const SUPERADMIN_USER = "superadmin";
const SUPERADMIN_PASS = "superadmin";
const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-","None"];
const GENDERS = ["Male", "Female", "Other"];
const EMPTY = {
  firstName: "", lastName: "", email: "", password: "", confirmPassword: "",
  age: "", gender: "", contact: "", address: "", bloodType: "", allergies: "",
};

const accent1 = "#0ea5e9";
const accent2 = "#6366f1";
const glow    = "rgba(14,165,233,0.3)";

const CAPTCHA_PUZZLES = [
  {
    instruction: "I-drag ang PUSO papunta sa kahon",
    emoji: "🫀", icon: "❤️",
    slots: [
      { emoji: "🌟", label: "bituin", correct: false },
      { emoji: "❤️", label: "puso",   correct: true  },
      { emoji: "🌙", label: "buwan",  correct: false },
      { emoji: "⚡", label: "kidlat", correct: false },
    ],
    target: "puso",
  },
  {
    instruction: "I-drag ang MEDICAL CROSS papunta sa kahon",
    emoji: "➕", icon: "➕",
    slots: [
      { emoji: "🔵", label: "bilog",  correct: false },
      { emoji: "⭐", label: "bituin", correct: false },
      { emoji: "➕", label: "krus",   correct: true  },
      { emoji: "🔷", label: "rombo",  correct: false },
    ],
    target: "krus",
  },
  {
    instruction: "I-drag ang SYRINGE papunta sa kahon",
    emoji: "💉", icon: "💉",
    slots: [
      { emoji: "💊", label: "tableta",    correct: false },
      { emoji: "🩺", label: "stethoscope",correct: false },
      { emoji: "🩹", label: "bandage",    correct: false },
      { emoji: "💉", label: "syringe",    correct: true  },
    ],
    target: "syringe",
  },
  {
    instruction: "I-drag ang SHIELD (kalasag) papunta sa kahon",
    emoji: "🛡️", icon: "🛡️",
    slots: [
      { emoji: "⚔️",  label: "espada",  correct: false },
      { emoji: "🛡️", label: "kalasag", correct: true  },
      { emoji: "🏹",  label: "pana",    correct: false },
      { emoji: "🗡️", label: "dagger",   correct: false },
    ],
    target: "kalasag",
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────
const FLabel = ({ c, isDark }) => (
  <label style={{
    display: "block", fontSize: 10, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.7px",
    marginBottom: 5, color: isDark ? "#475569" : "#64748b",
  }}>{c}</label>
);

const iBase = (isDark, pl = 14, pr = 14) => ({
  width: "100%", boxSizing: "border-box",
  background: isDark ? "rgba(255,255,255,0.05)" : "#f8fafc",
  border: `1.5px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
  borderRadius: 12, padding: `11px ${pr}px 11px ${pl}px`,
  fontSize: 13, color: isDark ? "#f1f5f9" : "#0f172a",
  outline: "none", transition: "border-color .2s, box-shadow .2s",
});

const IField = ({ label, icon: Icon, type = "text", ph, val, chg, right, isDark }) => (
  <div>
    {label && <FLabel c={label} isDark={isDark} />}
    <div style={{ position: "relative" }}>
      {Icon && (
        <Icon size={13} style={{
          position: "absolute", left: 13, top: "50%",
          transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none",
        }} />
      )}
      <input
        type={type} placeholder={ph} value={val} onChange={chg}
        style={iBase(isDark, Icon ? 38 : 14, right ? 40 : 14)}
        className="mc-input"
      />
      {right}
    </div>
  </div>
);

const SField = ({ label, val, chg, opts, ph, isDark }) => (
  <div>
    {label && <FLabel c={label} isDark={isDark} />}
    <select value={val} onChange={chg}
      style={{ ...iBase(isDark, 14, 14), color: val ? (isDark ? "#f1f5f9" : "#0f172a") : "#94a3b8", cursor: "pointer" }}
      className="mc-input"
    >
      <option value="" disabled>{ph}</option>
      {opts.map(o => <option key={o} value={o} style={{ color: "#0f172a" }}>{o}</option>)}
    </select>
  </div>
);

const EBtn = ({ show, tog }) => (
  <button type="button" onClick={tog} style={{
    position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", padding: 0,
  }}>
    {show ? <EyeOff size={14} /> : <Eye size={14} />}
  </button>
);

const PrimaryBtn = ({ label, loadLabel, loading, onClick, type = "submit" }) => (
  <button type={type} disabled={loading} onClick={onClick} style={{
    width: "100%", padding: "13px 0", borderRadius: 13,
    border: "none", cursor: loading ? "not-allowed" : "pointer",
    background: loading ? "rgba(99,99,99,.35)" : `linear-gradient(135deg,${accent1},${accent2})`,
    color: "#fff", fontSize: 14, fontWeight: 700,
    boxShadow: loading ? "none" : `0 8px 20px ${glow}`,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s",
  }}>
    {loading
      ? <><div style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite" }} />{loadLabel}</>
      : label}
  </button>
);

const ErrBox = ({ error }) => error ? (
  <div style={{
    display: "flex", alignItems: "center", gap: 9,
    padding: "10px 13px", marginBottom: 14, borderRadius: 11,
    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
    color: "#ef4444", fontSize: 12,
  }}>
    <AlertCircle size={13} style={{ flexShrink: 0 }} /> {error}
  </div>
) : null;

// ─── Maintenance Banner ───────────────────────────────────────────────────────
const MaintenanceBanner = ({ isDark: D, info = {}, etaDisplay = "" }) => (
  <div style={{
    borderRadius: 14, marginBottom: 14, overflow: "hidden",
    border: "1.5px solid rgba(249,115,22,0.3)",
    animation: "fadeIn .3s ease",
  }}>
    {/* Header row */}
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      background: "rgba(249,115,22,0.09)",
    }}>
      <Wrench size={14} color="#f97316" style={{ flexShrink: 0, animation: "spinSlow 4s linear infinite" }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#f97316" }}>
          System Under Maintenance
        </p>
        <p style={{ margin: 0, fontSize: 10, color: D ? "#9a3412" : "#c2410c" }}>
          Only superadmin can log in · v{info.version || "1.0.0"}
        </p>
      </div>
    </div>
    {/* Reason */}
    {info.reason && (
      <div style={{ padding: "8px 14px", background: D ? "rgba(249,115,22,0.05)" : "rgba(249,115,22,0.04)", borderTop: "1px solid rgba(249,115,22,0.15)" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".6px", color: "#f97316", marginBottom: 2 }}>Reason</p>
        <p style={{ margin: 0, fontSize: 11, color: D ? "#fed7aa" : "#7c2d12", lineHeight: 1.5 }}>{info.reason}</p>
      </div>
    )}
    {/* ETA */}
    {etaDisplay && (
      <div style={{ padding: "8px 14px", background: D ? "rgba(99,102,241,0.06)" : "rgba(99,102,241,0.04)", borderTop: "1px solid rgba(99,102,241,0.15)", display: "flex", alignItems: "center", gap: 8 }}>
        <Clock size={11} color="#818cf8" style={{ flexShrink: 0 }}/>
        <div>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#818cf8" }}>Expected back online</p>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: D ? "#c7d2fe" : "#3730a3" }}>{etaDisplay}</p>
        </div>
      </div>
    )}
  </div>
);

// ─── CAPTCHA Modal ─────────────────────────────────────────────────────────────
const CaptchaModal = ({ isDark, onSuccess, onClose }) => {
  const [puzzle, setPuzzle]     = useState(() => CAPTCHA_PUZZLES[Math.floor(Math.random() * CAPTCHA_PUZZLES.length)]);
  const [dragging, setDragging] = useState(null);
  const [dropped, setDropped]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [shake, setShake]       = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragPos, setDragPos]   = useState({ x: 0, y: 0 });
  const [isDraggingNow, setIsDraggingNow] = useState(false);
  const dragItemRef = useRef(null);

  const cardBg  = isDark ? "#0d1117" : "#ffffff";
  const textPri = isDark ? "#f1f5f9" : "#0f172a";
  const textSec = isDark ? "#94a3b8" : "#64748b";
  const borderC = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const slotBg  = isDark ? "rgba(255,255,255,0.04)" : "#f8fafc";

  const newPuzzle = () => {
    const p = CAPTCHA_PUZZLES[Math.floor(Math.random() * CAPTCHA_PUZZLES.length)];
    setPuzzle(p); setDropped(false); setSuccess(false); setShake(false); setDragging(null);
  };

  const onMouseDownSlot = (e, idx) => {
    e.preventDefault();
    setDragging(idx); setIsDraggingNow(true);
    setDragPos({ x: e.clientX, y: e.clientY });
    dragItemRef.current = idx;
  };

  const onMouseMove = useCallback((e) => {
    if (!isDraggingNow) return;
    setDragPos({ x: e.clientX, y: e.clientY });
  }, [isDraggingNow]);

  const onMouseUp = useCallback(() => {
    if (!isDraggingNow) return;
    if (dragOver) {
      const correct = puzzle.slots[dragging]?.correct;
      if (correct) { setSuccess(true); setDropped(true); setTimeout(() => onSuccess(), 900); }
      else { setShake(true); setTimeout(() => { setShake(false); newPuzzle(); }, 700); }
    }
    setIsDraggingNow(false); setDragging(null);
  }, [isDraggingNow, dragOver, dragging, puzzle]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  const onTouchStart = (e, idx) => {
    setDragging(idx); setIsDraggingNow(true);
    const t = e.touches[0];
    setDragPos({ x: t.clientX, y: t.clientY });
    dragItemRef.current = idx;
  };
  const onTouchMove = (e) => {
    if (!isDraggingNow) return;
    const t = e.touches[0];
    setDragPos({ x: t.clientX, y: t.clientY });
  };
  const onTouchEnd = () => {
    if (!isDraggingNow) return;
    if (dragOver) {
      const correct = puzzle.slots[dragging]?.correct;
      if (correct) { setSuccess(true); setDropped(true); setTimeout(() => onSuccess(), 900); }
      else { setShake(true); setTimeout(() => { setShake(false); newPuzzle(); }, 700); }
    }
    setIsDraggingNow(false); setDragging(null);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)", userSelect: "none" }}
      onMouseMove={onMouseMove} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
    >
      <div style={{ background: cardBg, borderRadius: 24, padding: "28px 28px 24px", width: "100%", maxWidth: 380, border: `1px solid ${borderC}`, boxShadow: "0 32px 64px rgba(0,0,0,0.4)", animation: shake ? "captchaShake .5s ease" : "captchaIn .25s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={20} color={accent1} />
          <span style={{ fontSize: 15, fontWeight: 700, color: textPri }}>Human Verification</span>
          <button onClick={newPuzzle} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: textSec, display: "flex", alignItems: "center", gap: 4, fontSize: 11, padding: "4px 8px", borderRadius: 8 }}>
            <RefreshCw size={12} /> Bago
          </button>
        </div>
        <p style={{ fontSize: 12, color: textSec, margin: "0 0 20px" }}>Para mapatunayan na hindi bot, {puzzle.instruction}</p>
        <div onMouseEnter={() => setDragOver(true)} onMouseLeave={() => setDragOver(false)}
          style={{ width: "100%", height: 90, borderRadius: 16, marginBottom: 20, border: `2px dashed ${success ? "#10b981" : dragOver && isDraggingNow ? accent1 : borderC}`, background: success ? "rgba(16,185,129,0.08)" : dragOver && isDraggingNow ? "rgba(14,165,233,0.08)" : slotBg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, transition: "all .2s", fontSize: 32 }}>
          {success
            ? <><span>✅</span><span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>Tama! Human ka!</span></>
            : <><span style={{ fontSize: 28, opacity: 0.3 }}>📦</span><span style={{ fontSize: 11, color: textSec }}>I-drop dito ang tamang item</span></>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {puzzle.slots.map((slot, idx) => (
            <div key={idx} onMouseDown={(e) => onMouseDownSlot(e, idx)} onTouchStart={(e) => onTouchStart(e, idx)}
              style={{ background: slotBg, border: `1.5px solid ${dragging === idx ? accent1 : borderC}`, borderRadius: 14, padding: "14px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "grab", transition: "all .15s", opacity: dragging === idx ? 0.3 : 1, transform: dragging === idx ? "scale(0.9)" : "scale(1)" }}>
              <span style={{ fontSize: 26, lineHeight: 1 }}>{slot.emoji}</span>
              <span style={{ fontSize: 10, color: textSec, textAlign: "center" }}>{slot.label}</span>
            </div>
          ))}
        </div>
        {isDraggingNow && dragging !== null && (
          <div style={{ position: "fixed", left: dragPos.x - 28, top: dragPos.y - 28, width: 56, height: 56, borderRadius: 14, background: cardBg, border: `2px solid ${accent1}`, boxShadow: `0 8px 24px ${glow}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, pointerEvents: "none", zIndex: 10001, transform: "rotate(-6deg) scale(1.15)" }}>
            {puzzle.slots[dragging]?.emoji}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc", border: `1px dashed ${borderC}` }}>
          <span style={{ fontSize: 16 }}>👆</span>
          <span style={{ fontSize: 11, color: textSec }}>I-click at i-drag ang <strong style={{ color: textPri }}>{puzzle.target}</strong> papunta sa kahon sa itaas</span>
        </div>
        <button onClick={onClose} style={{ width: "100%", marginTop: 14, padding: "9px 0", borderRadius: 11, border: `1.5px solid ${borderC}`, background: "none", cursor: "pointer", fontSize: 12, color: textSec, fontWeight: 600 }}>
          Kanselahin
        </button>
      </div>
      <style>{`
        @keyframes captchaIn   { from { opacity:0; transform: scale(0.92) } to { opacity:1; transform: scale(1) } }
        @keyframes captchaShake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
      `}</style>
    </div>
  );
};

// ─── Main Login Component ──────────────────────────────────────────────────────
export default function Login({ onPatientLogin }) {
  const { isDark: D } = useTheme();
  const { loginAsSuperadmin } = useAuth();

  const [mode, setMode]           = useState("login");
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState(EMPTY);
  const [showPw, setShowPw]       = useState(false);
  const [showCPw, setShowCPw]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [showCaptcha, setShowCaptcha] = useState(false);

  // ✅ Live maintenance — reads explicit flag + version/reason/ETA for display
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceInfo,   setMaintenanceInfo]   = useState({});
  useEffect(() => {
    const unsub = onValue(ref(db, "maintenanceSettings"), (snap) => {
      if (!snap.exists()) { setIsMaintenanceMode(false); setMaintenanceInfo({}); return; }
      const d = snap.val();
      setIsMaintenanceMode(
        typeof d.maintenanceMode === "boolean"
          ? d.maintenanceMode
          : (d.modules ? Object.values(d.modules).some(v => v === false) : false)
      );
      setMaintenanceInfo({
        version:  d.version  || "1.0.0",
        reason:   d.reason   || "",
        etaDate:  d.etaDate  || "",
        etaTime:  d.etaTime  || "",
      });
    });
    return () => unsub();
  }, []);

  // ETA display string
  const etaDisplay = maintenanceInfo.etaDate
    ? `${new Date(maintenanceInfo.etaDate).toLocaleDateString("en-PH",{month:"long",day:"numeric",year:"numeric"})}${maintenanceInfo.etaTime ? " at " + maintenanceInfo.etaTime : ""}`
    : "";

  const set_ = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const reset = () => {
    setError(""); setStep(1); setForm(EMPTY);
    setShowPw(false); setShowCPw(false); setShowCaptcha(false);
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async e => {
    e.preventDefault(); setError("");
    const emailOrUser = form.email.trim();
    const password    = form.password;
    if (!emailOrUser || !password) { setError("Punan ang lahat ng fields."); return; }
    setLoading(true);
    try {
      // ✅ Superadmin shortcut — ALWAYS allowed even in maintenance
      if (emailOrUser.toLowerCase() === SUPERADMIN_USER && password === SUPERADMIN_PASS) {
        loginAsSuperadmin(); return;
      }

      // ✅ MAINTENANCE GATE — block all non-superadmin login attempts
      if (isMaintenanceMode) {
        setError("System is under maintenance. Only superadmin can log in at this time.");
        return;
      }

      // Firebase Auth login
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, emailOrUser, password);
      } catch (authErr) {
        const msgs = {
          "auth/user-not-found":     "Walang account sa email na iyan.",
          "auth/wrong-password":     "Mali ang password.",
          "auth/invalid-credential": "Mali ang email o password.",
          "auth/invalid-email":      "Invalid na email address.",
          "auth/too-many-requests":  "Maraming pagsubok. Subukan mamaya.",
          "auth/user-disabled":      "Disabled ang account na ito.",
        };
        setError(msgs[authErr.code] || "Login failed."); return;
      }

      const uid = cred.user.uid;

      // 1) Check kung admin/staff — if maintenance, block
      const userSnap = await get(ref(db, `users/${uid}`));
      if (userSnap.exists()) {
        const userData = userSnap.val();
        // ✅ Check if this specific user is superadmin in Firebase too
        if (userData.role === "superadmin") {
          // Let AuthContext handle → will show Layout
          return;
        }
        // Any other role → maintenance block
        if (isMaintenanceMode) {
          await import("firebase/auth").then(({ signOut }) => signOut(auth));
          setError("System is under maintenance. Only superadmin can log in.");
          return;
        }
        return; // AuthContext handles
      }

      // 2) Check kung patient
      const patientSnap = await get(query(ref(db, "patients"), orderByChild("uid"), equalTo(uid)));
      if (patientSnap.exists()) {
        if (isMaintenanceMode) {
          // Block patient login during maintenance
          const { signOut } = await import("firebase/auth");
          await signOut(auth);
          setError("System is under maintenance. Please try again later.");
          return;
        }
        const [id, data] = Object.entries(patientSnap.val())[0];
        if (onPatientLogin) onPatientLogin({ id, ...data });
        return;
      }

      // 3) Legacy admins node
      const adminSnap = await get(query(ref(db, "admins"), orderByChild("uid"), equalTo(uid)));
      if (adminSnap.exists()) {
        if (isMaintenanceMode) {
          const { signOut } = await import("firebase/auth");
          await signOut(auth);
          setError("System is under maintenance. Only superadmin can log in.");
          return;
        }
        return; // AuthContext handles
      }

      // 4) No role
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
      setError("Walang nahanap na role para sa account na ito. Makipag-ugnayan sa admin.");

    } finally { setLoading(false); }
  };

  // ── Validate Step 1 ────────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!form.firstName.trim())   return "Kailangan ang first name.";
    if (!form.lastName.trim())    return "Kailangan ang last name.";
    if (!form.email.trim())       return "Kailangan ang email.";
    if (!form.password)           return "Kailangan ang password.";
    if (form.password.length < 6) return "Password — minimum 6 characters.";
    if (form.password !== form.confirmPassword) return "Hindi magkapareho ang passwords.";
    return "";
  };

  // ── Step 2 submit → show CAPTCHA ───────────────────────────────────────────
  const handleStep2Submit = (e) => {
    e.preventDefault(); setError("");
    if (!form.age || +form.age < 0 || +form.age > 150) { setError("Ilagay ang tamang edad."); return; }
    if (!form.gender)    { setError("Piliin ang gender.");     return; }
    if (!form.bloodType) { setError("Piliin ang blood type."); return; }
    // ✅ Block registration during maintenance
    if (isMaintenanceMode) { setError("Registration is disabled during maintenance."); return; }
    setShowCaptcha(true);
  };

  // ── Actual Register (after CAPTCHA) ────────────────────────────────────────
  const doRegister = async () => {
    setShowCaptcha(false);
    setLoading(true);
    try {
      const cred  = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      const snap  = await get(ref(db, "patients"));
      const count = snap.exists() ? Object.keys(snap.val()).length : 0;
      const patientId = `P-${String(count + 1).padStart(4, "0")}`;
      const now   = Date.now();
      const data  = {
        uid:        cred.user.uid,
        role:       "patient",
        patientId,
        firstName:  form.firstName.trim(),
        lastName:   form.lastName.trim(),
        email:      form.email.trim(),
        age:        form.age,
        gender:     form.gender,
        contact:    form.contact,
        address:    form.address,
        bloodType:  form.bloodType,
        allergies:  form.allergies || "None",
        status:     "Active",
        createdAt:  now,
        updatedAt:  now,
      };
      const nr = await push(ref(db, "patients"), data);
      if (onPatientLogin) onPatientLogin({ id: nr.key, ...data });
    } catch (err) {
      const msgs = {
        "auth/email-already-in-use": "Ginamit na ang email na iyan.",
        "auth/invalid-email":        "Invalid na email.",
        "auth/weak-password":        "Masyadong mahina ang password.",
      };
      setError(msgs[err.code] || err.message || "Registration failed.");
    } finally { setLoading(false); }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const cardBg  = D ? "#0d1117" : "#ffffff";
  const cardBdr = D ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.1)";
  const textSec = D ? "#475569" : "#64748b";

  return (
    <>
      {showCaptcha && (
        <CaptchaModal isDark={D} onSuccess={doRegister} onClose={() => setShowCaptcha(false)} />
      )}

      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${BgClinic})`, backgroundSize: "cover", backgroundPosition: "center", zIndex: 0 }} />
        <div style={{ position: "absolute", inset: 0, background: D ? "rgba(8,11,18,0.40)" : "rgba(220,235,255,0.25)", zIndex: 0 }} />

        <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
          <div style={{ background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 28, overflow: "hidden", boxShadow: D ? "0 40px 80px rgba(0,0,0,0.6)" : "0 24px 60px rgba(99,102,241,0.1), 0 4px 16px rgba(0,0,0,0.06)" }}>

            {/* ✅ Animated top bar — orange during maintenance, normal otherwise */}
            <div style={{ height: 4, background: isMaintenanceMode ? "linear-gradient(90deg,#f97316,#ef4444,#f97316)" : `linear-gradient(90deg,${accent1},${accent2})`, backgroundSize: "200% 100%", animation: isMaintenanceMode ? "shimmer 2s linear infinite" : "none" }} />

            <div style={{ padding: "20px 15px 10px", textAlign: "center" }}>
              <img src={LogoMed} alt="MediCore Logo" style={{ width: 350, height: 150, objectFit: "contain", display: "block", margin: "0 auto 10px" }} />
              <p style={{ margin: "4px 0 0", fontSize: 12, color: textSec }}>Clinic Management System</p>
            </div>

            <div style={{ padding: "0 26px 28px" }}>

              {/* ✅ Maintenance banner — shows on login page if system is under maintenance */}
              {isMaintenanceMode && <MaintenanceBanner isDark={D} info={maintenanceInfo} etaDisplay={etaDisplay} />}

              {/* Tabs */}
              <div style={{ display: "flex", background: D ? "rgba(255,255,255,0.04)" : "#f8fafc", borderRadius: 11, padding: 3, marginBottom: 16, border: `1px solid ${D ? "rgba(255,255,255,0.06)" : "#f1f5f9"}` }}>
                {[{ id: "login", label: "Mag-login" }, { id: "register", label: "Mag-register" }].map(m => (
                  <button key={m.id} onClick={() => { setMode(m.id); reset(); }}
                    style={{ flex: 1, padding: "7px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all .2s", background: mode === m.id ? "#fff" : "transparent", color: mode === m.id ? "#0f172a" : textSec, boxShadow: mode === m.id ? "0 2px 8px rgba(0,0,0,0.07)" : "none" }}>
                    {m.label}
                  </button>
                ))}
              </div>

              <ErrBox error={error} />

              {/* ══ LOGIN ══ */}
              {mode === "login" && (
                <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  <IField label="Email o Username" icon={Mail} type="text" ph="email@example.com o superadmin" val={form.email} chg={set_("email")} isDark={D} />
                  <IField label="Password" icon={Lock} type={showPw ? "text" : "password"} ph="Ilagay ang password" val={form.password} chg={set_("password")} isDark={D} right={<EBtn show={showPw} tog={() => setShowPw(p => !p)} />} />
                  <div style={{ marginTop: 4 }}>
                    <PrimaryBtn label="Mag-login →" loadLabel="Checking…" loading={loading} />
                  </div>
                  <p style={{ textAlign: "center", fontSize: 12, color: textSec, margin: 0 }}>
                    Wala pang account?{" "}
                    <button type="button" onClick={() => { setMode("register"); reset(); }} style={{ background: "none", border: "none", cursor: "pointer", color: accent1, fontWeight: 700, fontSize: 12 }}>Mag-register</button>
                  </p>
                  <div style={{ padding: "8px 12px", borderRadius: 10, background: D ? "rgba(255,255,255,0.03)" : "#f8fafc", border: `1px dashed ${D ? "rgba(255,255,255,0.07)" : "#e2e8f0"}`, textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 11, color: textSec }}>
                      Para sa mga admin, gamitin ang inyong email o ang default na{" "}
                      <span style={{ color: D ? "#818cf8" : "#6366f1", fontWeight: 700 }}>superadmin / superadmin</span>
                    </p>
                  </div>
                </form>
              )}

              {/* ══ REGISTER Step 1 ══ */}
              {mode === "register" && step === 1 && (
                <form onSubmit={e => { e.preventDefault(); const err = validateStep1(); if (err) { setError(err); return; } setError(""); setStep(2); }}
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {isMaintenanceMode && (
                    <div style={{ padding:"10px 12px", borderRadius:10, background:"rgba(249,115,22,0.06)", border:"1px solid rgba(249,115,22,0.2)", fontSize:11, color:"#f97316", textAlign:"center" }}>
                      ⚠️ Registration is disabled during maintenance.
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <IField label="First Name" icon={User} ph="Juan"      val={form.firstName} chg={set_("firstName")} isDark={D} />
                    <IField label="Last Name"  icon={User} ph="dela Cruz" val={form.lastName}  chg={set_("lastName")}  isDark={D} />
                  </div>
                  <IField label="Email"            icon={Mail} type="email"                        ph="email@example.com"  val={form.email}           chg={set_("email")}           isDark={D} />
                  <IField label="Password"         icon={Lock} type={showPw  ? "text" : "password"} ph="Min. 6 characters"  val={form.password}        chg={set_("password")}        isDark={D} right={<EBtn show={showPw}  tog={() => setShowPw(p => !p)} />} />
                  <IField label="Confirm Password" icon={Lock} type={showCPw ? "text" : "password"} ph="Ulitin ang password" val={form.confirmPassword} chg={set_("confirmPassword")} isDark={D} right={<EBtn show={showCPw} tog={() => setShowCPw(p => !p)} />} />
                  <div style={{ display: "flex", gap: 5, margin: "1px 0" }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: accent1 }} />
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: D ? "rgba(255,255,255,0.1)" : "#e2e8f0" }} />
                  </div>
                  <p style={{ fontSize: 11, color: textSec, textAlign: "center", margin: 0 }}>Hakbang 1 ng 2 — Account info</p>
                  <button type="submit" disabled={isMaintenanceMode} style={{ padding: "12px 0", borderRadius: 12, border: "none", cursor: isMaintenanceMode ? "not-allowed" : "pointer", background: isMaintenanceMode ? "rgba(99,99,99,.3)" : `linear-gradient(135deg,${accent1},${accent2})`, color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: isMaintenanceMode ? "none" : `0 6px 18px ${glow}` }}>
                    Susunod → Personal Info
                  </button>
                </form>
              )}

              {/* ══ REGISTER Step 2 ══ */}
              {mode === "register" && step === 2 && (
                <form onSubmit={handleStep2Submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <IField label="Edad" icon={Calendar} type="number" ph="25" val={form.age}       chg={set_("age")}       isDark={D} />
                    <SField label="Gender"     val={form.gender}    chg={set_("gender")}    opts={GENDERS}     ph="Piliin" isDark={D} />
                    <SField label="Blood Type" val={form.bloodType} chg={set_("bloodType")} opts={BLOOD_TYPES} ph="Piliin" isDark={D} />
                  </div>
                  <IField label="Contact"              icon={Phone}       ph="09XXXXXXXXX"          val={form.contact}   chg={set_("contact")}   isDark={D} />
                  <IField label="Address"              icon={MapPin}      ph="Barangay, Lungsod"    val={form.address}   chg={set_("address")}   isDark={D} />
                  <IField label="Allergies (o 'None')" icon={AlertCircle} ph="Penicillin, Aspirin…" val={form.allergies} chg={set_("allergies")} isDark={D} />
                  <div style={{ display: "flex", gap: 5, margin: "1px 0" }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: accent1 }} />
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: "#10b981" }} />
                  </div>
                  <p style={{ fontSize: 11, color: textSec, textAlign: "center", margin: 0 }}>Hakbang 2 ng 2 — Personal info</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: D ? "rgba(14,165,233,0.06)" : "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.2)" }}>
                    <ShieldCheck size={13} color={accent1} />
                    <span style={{ fontSize: 11, color: D ? "#7dd3fc" : "#0369a1" }}>May CAPTCHA verification bago mag-register para sa seguridad</span>
                  </div>
                  <div style={{ display: "flex", gap: 9 }}>
                    <button type="button" onClick={() => { setStep(1); setError(""); }}
                      style={{ flex: "0 0 88px", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${D ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, cursor: "pointer", background: D ? "rgba(255,255,255,0.04)" : "#f8fafc", color: textSec, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                      <ArrowLeft size={12} /> Bumalik
                    </button>
                    <div style={{ flex: 1 }}>
                      <PrimaryBtn label="I-register →" loadLabel="Nagre-register…" loading={loading} />
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 16 }}>
            <p style={{ margin: "0 0 3px", fontSize: 11, color: D ? "#1e293b" : "#94a3b8" }}>
              © 2025 MediCore. All rights reserved. &nbsp;·&nbsp; v1.0.0
            </p>
            <p style={{ margin: 0, fontSize: 11, color: D ? "#1e293b" : "#94a3b8" }}>
              Powered by{" "}
              <span style={{ fontWeight: 700, background: `linear-gradient(90deg,${accent1},${accent2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Ichthus Technology
              </span>
            </p>
          </div>
        </div>

        <style>{`
          @keyframes spin     { to { transform: rotate(360deg) } }
          @keyframes spinSlow { to { transform: rotate(360deg) } }
          @keyframes shimmer  { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
          @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
          .mc-input:focus {
            border-color: #0ea5e9 !important;
            box-shadow: 0 0 0 3px rgba(14,165,233,0.12) !important;
          }
        `}</style>
      </div>
    </>
  );
}
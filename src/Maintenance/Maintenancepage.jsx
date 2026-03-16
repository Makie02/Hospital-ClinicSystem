// src/pages/MaintenancePage.jsx
// ─── MAINTENANCE HOLDING PAGE ─────────────────────────────────────────────────
// Shown to ALL non-superadmin users when the system is under maintenance.
// Superadmin bypasses this entirely — handled in App.js / AuthContext.
import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db, auth } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import { signOut } from "firebase/auth";
import {
  Wrench, Clock, ShieldCheck, RefreshCw, LogOut,
  Wifi, WifiOff, Stethoscope,
} from "lucide-react";
import LogoMed from "../Image/logomed.png";

// ── Pulsing gear icon ─────────────────────────────────────────────────────────
const GearAnim = ({ D }) => (
  <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 28px" }}>
    {/* Outer ring pulse */}
    <div style={{
      position: "absolute", inset: -8, borderRadius: "50%",
      border: "2px solid rgba(249,115,22,0.2)",
      animation: "ringPulse 2s ease-in-out infinite",
    }} />
    <div style={{
      position: "absolute", inset: -18, borderRadius: "50%",
      border: "2px solid rgba(249,115,22,0.1)",
      animation: "ringPulse 2s ease-in-out infinite 0.4s",
    }} />
    {/* Main icon */}
    <div style={{
      width: 100, height: 100, borderRadius: "50%",
      background: "linear-gradient(135deg,rgba(249,115,22,0.15),rgba(239,68,68,0.15))",
      border: "2px solid rgba(249,115,22,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "gearSpin 8s linear infinite",
    }}>
      <Wrench size={42} color="#f97316" />
    </div>
  </div>
);

// ── Status item row ───────────────────────────────────────────────────────────
const StatusRow = ({ icon: Icon, label, value, color, D }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", borderRadius: 12,
    background: D ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)",
    border: `1px solid ${D ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
  }}>
    <div style={{
      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: `${color}18`, border: `1px solid ${color}30`,
    }}>
      <Icon size={16} color={color} />
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: 11, color: D ? "#475569" : "#94a3b8", fontWeight: 600 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: D ? "#cbd5e1" : "#334155" }}>{value}</p>
    </div>
  </div>
);

// ── Live clock ────────────────────────────────────────────────────────────────
const LiveClock = ({ D }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ fontFamily: "monospace", fontWeight: 800, color: D ? "#60a5fa" : "#2563eb" }}>
      {time.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
};

// ── Progress bar (looping) ────────────────────────────────────────────────────
const LoopBar = ({ color = "#f97316" }) => (
  <div style={{ height: 3, borderRadius: 999, overflow: "hidden", background: "rgba(249,115,22,0.1)", margin: "20px 0" }}>
    <div style={{
      height: "100%", width: "40%", borderRadius: 999,
      background: `linear-gradient(90deg,transparent,${color},transparent)`,
      animation: "slideBar 2s ease-in-out infinite",
    }} />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MaintenancePage({ user, onLogout }) {
  const { isDark: D } = useTheme();
  const [settings, setSettings] = useState(null);
  const [online, setOnline]     = useState(navigator.onLine);

  // Listen for online/offline
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  // Live-listen to maintenanceSettings so page auto-refreshes when admin fixes it
  useEffect(() => {
    const unsub = onValue(ref(db, "maintenanceSettings"), snap => {
      if (snap.exists()) setSettings(snap.val());
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try { await signOut(auth); } catch {}
    if (onLogout) onLogout();
  };

  // Styles
  const bg      = D ? "#080b12" : "#f0f4ff";
  const cardBg  = D ? "rgba(13,17,23,0.95)" : "rgba(255,255,255,0.95)";
  const textPri = D ? "#f1f5f9" : "#0f172a";
  const textSec = D ? "#475569" : "#64748b";
  const border  = D ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.12)";

  const version   = settings?.version || "1.0.0";
  const updatedAt = settings?.updatedAt
    ? new Date(settings.updatedAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";
  const reason    = settings?.reason || "";
  const etaDisplay = (settings?.etaDate)
    ? `${new Date(settings.etaDate).toLocaleDateString("en-PH",{month:"long",day:"numeric",year:"numeric"})}${settings.etaTime ? " at " + settings.etaTime : ""}`
    : "—";

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, background: bg, position: "relative", overflow: "hidden",
      fontFamily: "'Nunito', system-ui, sans-serif",
    }}>

      {/* Decorative BG blobs */}
      <div style={{ position: "fixed", top: "-10%", right: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(249,115,22,0.08),transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-10%", left: "-5%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle,rgba(239,68,68,0.06),transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "40%", left: "-8%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,0.05),transparent 70%)", pointerEvents: "none" }} />

      <div style={{
        width: "100%", maxWidth: 480,
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 32,
        padding: "40px 36px",
        backdropFilter: "blur(20px)",
        boxShadow: D
          ? "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)"
          : "0 24px 64px rgba(99,102,241,0.12), 0 4px 16px rgba(0,0,0,0.06)",
        animation: "cardIn .4s cubic-bezier(0.34,1.56,0.64,1)",
        position: "relative",
      }}>

        {/* Top accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, borderRadius: "32px 32px 0 0", background: "linear-gradient(90deg,#f97316,#ef4444,#f97316)", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <img src={LogoMed} alt="MediCore" style={{ height: 60, objectFit: "contain", display: "inline-block" }} />
        </div>

        {/* Gear animation */}
        <GearAnim D={D} />

        {/* Main title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 900, color: textPri }}>
            System Maintenance
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: textSec, lineHeight: 1.7 }}>
            The system is currently under maintenance.<br />
            Please wait while our team completes the updates.
          </p>
        </div>

        {/* Loop progress bar */}
        <LoopBar />

        {/* Status cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          <StatusRow icon={Stethoscope} D={D} label="System" value="MediCore Clinic Management" color="#6366f1"/>
          <StatusRow icon={Clock} D={D} label="Current Time" value={<LiveClock D={D} />} color="#f59e0b"/>
          <StatusRow icon={Wrench} D={D} label="Maintenance Started" value={updatedAt} color="#f97316"/>
          <StatusRow icon={ShieldCheck} D={D} label="System Version" value={`v${version}`} color="#8b5cf6"/>
          <StatusRow icon={online ? Wifi : WifiOff} D={D} label="Connection" value={online ? "Online — Connected" : "Offline — Check your network"} color={online ? "#10b981" : "#ef4444"}/>
        </div>

        {/* Reason */}
        {reason && (
          <div style={{
            padding:"12px 16px", borderRadius:14, marginBottom:12,
            background: D?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.06)",
            border:"1.5px solid rgba(249,115,22,0.25)",
          }}>
            <p style={{ margin:"0 0 4px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", color:"#f97316" }}>
              Reason / Dahilan
            </p>
            <p style={{ margin:0, fontSize:13, color: D?"#fed7aa":"#7c2d12", lineHeight:1.6 }}>{reason}</p>
          </div>
        )}

        {/* ETA */}
        {etaDisplay !== "—" && (
          <div style={{
            padding:"12px 16px", borderRadius:14, marginBottom:20,
            background: D?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.06)",
            border:"1.5px solid rgba(99,102,241,0.25)",
            display:"flex", alignItems:"center", gap:12,
          }}>
            <div style={{ width:36,height:36,borderRadius:10,background:"rgba(99,102,241,0.15)",border:"1px solid rgba(99,102,241,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <Clock size={16} color="#818cf8"/>
            </div>
            <div>
              <p style={{ margin:0, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", color:"#818cf8" }}>Expected to be back online</p>
              <p style={{ margin:0, fontSize:14, fontWeight:800, color: D?"#c7d2fe":"#3730a3" }}>{etaDisplay}</p>
            </div>
          </div>
        )}

        {/* Logged in as */}
        {user && (
          <div style={{
            padding: "10px 14px", borderRadius: 12, marginBottom: 16,
            background: D ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.06)",
            border: "1px solid rgba(99,102,241,0.2)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                {(user.name || user.firstName || user.email || "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: textPri, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: textSec }}>Logged in · Waiting for system to come back online</p>
            </div>
          </div>
        )}

        {/* Auto-refresh notice */}
        <div style={{
          padding: "10px 14px", borderRadius: 12, marginBottom: 20,
          background: D ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.05)",
          border: "1px solid rgba(16,185,129,0.2)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <RefreshCw size={13} color="#10b981" style={{ flexShrink: 0, animation: "spinSlow 3s linear infinite" }} />
          <p style={{ margin: 0, fontSize: 11, color: D ? "#6ee7b7" : "#065f46", lineHeight: 1.5 }}>
            This page will <strong>automatically refresh</strong> once maintenance is complete — no need to reload.
          </p>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 14, border: "none",
            cursor: "pointer",
            background: D ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)",
            color: "#ef4444",
            fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            border: "1.5px solid rgba(239,68,68,0.2)",
            transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = D ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)"; }}
        >
          <LogOut size={14} /> Sign Out
        </button>

        {/* Footer */}
        <p style={{ margin: "16px 0 0", textAlign: "center", fontSize: 11, color: D ? "#1e293b" : "#94a3b8" }}>
          © 2025 MediCore · Powered by{" "}
          <span style={{ fontWeight: 700, background: "linear-gradient(90deg,#0ea5e9,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Ichthus Technology
          </span>
        </p>
      </div>

      <style>{`
        @keyframes gearSpin   { to { transform: rotate(360deg); } }
        @keyframes ringPulse  { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
        @keyframes slideBar   { 0%{transform:translateX(-150%)} 100%{transform:translateX(350%)} }
        @keyframes shimmer    { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spinSlow   { to{transform:rotate(360deg)} }
        @keyframes cardIn     { from{opacity:0;transform:translateY(20px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>
    </div>
  );
}
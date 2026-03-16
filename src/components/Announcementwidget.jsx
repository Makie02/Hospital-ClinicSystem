// src/components/AnnouncementWidget.jsx
// ─── Reusable Announcement Banner for Admin & Patient Dashboards ──────────────
// Usage:  <AnnouncementWidget audience="admin" />   (admin/staff dashboard)
//         <AnnouncementWidget audience="patient" />  (patient dashboard)
// audience = "admin" | "patient" | "all"
// Each banner can be dismissed per-session (sessionStorage).

import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../context/firebase";
import { Megaphone, X, ChevronDown, ChevronUp, Clock } from "lucide-react";

// ── Type configs (must match MaintenanceAll.jsx ANNOUNCE_TYPES) ───────────────
const TYPE_CFG = {
  info:        { color:"#3b82f6", bg:"rgba(59,130,246,0.08)",   border:"rgba(59,130,246,0.25)",  label:"Info"        },
  warning:     { color:"#f97316", bg:"rgba(249,115,22,0.08)",   border:"rgba(249,115,22,0.25)",  label:"Warning"     },
  critical:    { color:"#ef4444", bg:"rgba(239,68,68,0.08)",    border:"rgba(239,68,68,0.25)",   label:"Critical"    },
  success:     { color:"#10b981", bg:"rgba(16,185,129,0.08)",   border:"rgba(16,185,129,0.25)",  label:"Success"     },
  maintenance: { color:"#8b5cf6", bg:"rgba(139,92,246,0.08)",   border:"rgba(139,92,246,0.25)",  label:"Maintenance" },
};

const fmtDt = (s) =>
  s ? new Date(s).toLocaleString("en-PH", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : null;

// ── Single announcement card ──────────────────────────────────────────────────
function AnnouncementCard({ announcement: a, onDismiss, D }) {
  const tc = TYPE_CFG[a.type] || TYPE_CFG.info;
  const [expanded, setExpanded] = useState(false);
  const until = fmtDt(a.showUntil);
  const isLong = a.message?.length > 120;
  const preview = isLong && !expanded ? a.message.slice(0, 120) + "…" : a.message;

  return (
    <div style={{
      borderRadius: 14,
      border: `1.5px solid ${tc.border}`,
      background: D ? `${tc.color}0d` : tc.bg,
      overflow: "hidden",
      animation: "annIn .3s cubic-bezier(0.34,1.56,0.64,1)",
    }}>
      {/* Top color strip */}
      <div style={{ height: 3, background: `linear-gradient(90deg,${tc.color},${tc.color}88)` }}/>

      <div style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Icon */}
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `${tc.color}18`, border: `1px solid ${tc.border}`,
          marginTop: 1,
        }}>
          <Megaphone size={15} color={tc.color} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: tc.color }}>{a.title}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 20,
              background: `${tc.color}15`, color: tc.color, border: `1px solid ${tc.border}`,
              flexShrink: 0,
            }}>
              {tc.label.toUpperCase()}
            </span>
            {until && (
              <span style={{ display:"flex", alignItems:"center", gap:3, fontSize:9, color:"#64748b", flexShrink:0 }}>
                <Clock size={9}/> Until {until}
              </span>
            )}
          </div>

          {/* Message */}
          <p style={{ margin: "0 0 4px", fontSize: 12, color: D?"#94a3b8":"#475569", lineHeight: 1.65 }}>
            {preview}
          </p>

          {/* Expand/collapse */}
          {isLong && (
            <button onClick={() => setExpanded(e => !e)} style={{ background:"none", border:"none", cursor:"pointer", color:tc.color, fontSize:11, fontWeight:700, padding:0, display:"flex", alignItems:"center", gap:4 }}>
              {expanded ? <><ChevronUp size={12}/> Show less</> : <><ChevronDown size={12}/> Read more</>}
            </button>
          )}
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button onClick={onDismiss} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex", padding:2, flexShrink:0 }}
            title="Dismiss">
            <X size={13}/>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────
export default function AnnouncementWidget({ audience = "all", D = false, maxVisible = 3 }) {
  const [all,       setAll]       = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("dismissed_announcements") || "[]"); }
    catch { return []; }
  });

  // Live-listen to Firebase announcements
  useEffect(() => {
    const unsub = onValue(ref(db, "announcements"), snap => {
      const data = snap.val();
      if (!data) { setAll([]); return; }
      setAll(
        Object.entries(data)
          .map(([id, v]) => ({ id, ...v }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      );
    });
    return () => unsub();
  }, []);

  // Filter: active, within time window, audience matches
  const now = Date.now();
  const visible = all.filter(a => {
    if (!a.active) return false;
    if (a.showFrom  && new Date(a.showFrom).getTime()  > now) return false;
    if (a.showUntil && new Date(a.showUntil).getTime() < now) return false;
    if (dismissed.includes(a.id)) return false;
    // Audience check
    if (a.audience === "all") return true;
    if (a.audience === "admin"   && (audience === "admin"   || audience === "all")) return true;
    if (a.audience === "patient" && (audience === "patient" || audience === "all")) return true;
    return a.audience === audience;
  }).slice(0, maxVisible);

  const handleDismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try { sessionStorage.setItem("dismissed_announcements", JSON.stringify(next)); } catch {}
  };

  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 8 }}>
      {visible.map(a => (
        <AnnouncementCard
          key={a.id}
          announcement={a}
          onDismiss={() => handleDismiss(a.id)}
          D={D}
        />
      ))}
      <style>{`
        @keyframes annIn {
          from { opacity:0; transform:translateY(-8px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
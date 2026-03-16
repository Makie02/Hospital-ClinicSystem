// src/Patients_homepage/PatientHeader.jsx
import React, { useState, useRef, useEffect } from "react";
import { Bell, Sun, Moon, User, Settings, LogOut, ChevronDown, X, Menu, Languages, Megaphone, Clock } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "../context/firebase";
import { usePatient } from "../context/PatientContext";
import { useLang } from "../context/LanguageContext";

// ── Announcement type colors ──────────────────────────────────────────────────
const ANN_TYPE = {
  info:        { color:"#3b82f6", bg:"rgba(59,130,246,0.08)",  border:"rgba(59,130,246,0.2)",  label:"Info"        },
  warning:     { color:"#f97316", bg:"rgba(249,115,22,0.08)",  border:"rgba(249,115,22,0.2)",  label:"Warning"     },
  critical:    { color:"#ef4444", bg:"rgba(239,68,68,0.08)",   border:"rgba(239,68,68,0.2)",   label:"Critical"    },
  success:     { color:"#10b981", bg:"rgba(16,185,129,0.08)",  border:"rgba(16,185,129,0.2)",  label:"Success"     },
  maintenance: { color:"#8b5cf6", bg:"rgba(139,92,246,0.08)", border:"rgba(139,92,246,0.2)",  label:"Maintenance" },
};

export default function PatientHeader({ page, navLabels, onMobileOpen, onLogout, onOpenProfile, onOpenSettings, pendingCount = 0 }) {
  const { patient, notifications, isDark, toggleTheme, markAllRead } = usePatient();
  const { lang, switchLang, t } = useLang();
  const D = isDark;

  const [showNotif, setShowNotif] = useState(false);
  const [showMenu,  setShowMenu]  = useState(false);
  const notifRef = useRef(null);
  const menuRef  = useRef(null);

  // ── ✅ Announcements — live from Firebase, patient audience ────────────────
  const [announcements,  setAnnouncements]  = useState([]);
  const [dismissedAnns,  setDismissedAnns]  = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("pat_dismissed_anns") || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    const now = Date.now();
    const unsub = onValue(ref(db, "announcements"), snap => {
      const data = snap.val();
      if (!data) { setAnnouncements([]); return; }
      setAnnouncements(
        Object.entries(data)
          .map(([id, v]) => ({ id, ...v }))
          .filter(a => {
            if (!a.active) return false;
            if (a.showFrom  && new Date(a.showFrom).getTime()  > now) return false;
            if (a.showUntil && new Date(a.showUntil).getTime() < now) return false;
            // Show patient if audience is "all" or "patient"
            return a.audience === "all" || a.audience === "patient";
          })
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      );
    });
    return () => unsub();
  }, []);

  const dismissAnn = (id) => {
    const next = [...dismissedAnns, id];
    setDismissedAnns(next);
    try { sessionStorage.setItem("pat_dismissed_anns", JSON.stringify(next)); } catch {}
  };

  const visibleAnns = announcements.filter(a => !dismissedAnns.includes(a.id));

  // ── Derived counts ──────────────────────────────────────────────────────────
  const unread       = notifications.filter(n => !n.read).length;
  const totalBadge   = unread + visibleAnns.length;  // ✅ combined badge count
  const fullName     = `${patient.firstName} ${patient.lastName}`.trim();
  const initials     = (patient.firstName?.[0] || "") + (patient.lastName?.[0] || "");

  // ── Outside click close ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (menuRef.current  && !menuRef.current.contains(e.target))  setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const notifColors = {
    success: { bg: D?"#052e16":"#f0fdf4", border:"#22c55e40", dot:"#22c55e" },
    error:   { bg: D?"#2d0a0a":"#fff1f2", border:"#f8717140", dot:"#f87171" },
    warning: { bg: D?"#2d1a00":"#fffbeb", border:"#fbbf2440", dot:"#fbbf24" },
    info:    { bg: D?"#0d1f3c":"#eff6ff", border:"#60a5fa40", dot:"#60a5fa" },
  };

  const btnStyle = {
    width:34, height:34, borderRadius:9,
    border:`1px solid ${D?"#334155":"#e2e8f0"}`,
    background: D?"#1e293b":"#f8fafc",
    cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
  };

  const fmtUntil = (s) =>
    s ? new Date(s).toLocaleDateString("en-PH", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" }) : null;

  return (
    <div style={{
      background: D?"#0f172a":"#fff",
      borderBottom:`1px solid ${D?"#1e293b":"#f1f5f9"}`,
      padding:"0 20px", height:60,
      display:"flex", alignItems:"center", justifyContent:"space-between",
      position:"sticky", top:0, zIndex:40, gap:12,
    }}>
      {/* Left */}
      <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
        <button onClick={onMobileOpen} className="hamburger-btn"
          style={{ ...btnStyle, display:"none" }}>
          <Menu size={17} color={D?"#94a3b8":"#475569"} />
        </button>
        <h1 style={{ margin:0, fontSize:16, fontWeight:700, color:D?"#f1f5f9":"#0f172a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {navLabels[page] || "Dashboard"}
        </h1>
      </div>

      {/* Right */}
      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>

        {/* Date */}
        <span style={{ fontSize:12, color:D?"#475569":"#94a3b8", whiteSpace:"nowrap" }} className="hide-sm">
          {new Date().toLocaleDateString("en-PH", { weekday:"short", month:"long", day:"numeric" })}
        </span>

        {/* Language toggle */}
        <button onClick={switchLang} title="Switch language"
          style={{ ...btnStyle, width:"auto", padding:"0 10px", gap:5, fontSize:11, fontWeight:700, color:D?"#94a3b8":"#475569" }}>
          <Languages size={13} />
          <span className="hide-sm">{lang === "en" ? "Filipino" : "English"}</span>
        </button>

        {/* Dark mode */}
        <button onClick={toggleTheme} style={btnStyle}>
          {D ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#475569" />}
        </button>

        {/* ── ✅ Notifications (announcements + regular notifs) ── */}
        <div ref={notifRef} style={{ position:"relative" }}>
          <button
            onClick={() => { setShowNotif(v => !v); setShowMenu(false); markAllRead(); }}
            style={{ ...btnStyle, position:"relative" }}>
            <Bell size={16} color={D?"#94a3b8":"#475569"} />
            {/* ✅ Badge — purple if announcements, red if regular notifs */}
            {totalBadge > 0 && (
              <span style={{
                position:"absolute", top:4, right:4,
                minWidth: visibleAnns.length > 0 ? 14 : 7,
                height:   visibleAnns.length > 0 ? 14 : 7,
                borderRadius:"50%",
                background: visibleAnns.length > 0 ? "#8b5cf6" : "#ef4444",
                border:`2px solid ${D?"#0f172a":"#fff"}`,
                fontSize:8, fontWeight:800, color:"#fff",
                display:"flex", alignItems:"center", justifyContent:"center",
                padding: visibleAnns.length > 0 ? "0 2px" : 0,
                animation:"badgePop .3s ease",
              }}>
                {visibleAnns.length > 0 ? (totalBadge > 9 ? "9+" : totalBadge) : ""}
              </span>
            )}
          </button>

          {showNotif && (
            <div style={{
              position:"absolute", top:"calc(100% + 8px)", right:0, width:310,
              background:D?"#1e293b":"#fff",
              border:`1px solid ${D?"#334155":"#f1f5f9"}`,
              borderRadius:16, boxShadow:"0 16px 48px rgba(0,0,0,0.2)",
              overflow:"hidden", zIndex:100,
              animation:"annIn .2s ease",
            }}>

              {/* Header */}
              <div style={{ padding:"12px 16px", borderBottom:`1px solid ${D?"#334155":"#f1f5f9"}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <Bell size={14} color={totalBadge > 0 ? "#f97316" : D?"#94a3b8":"#475569"}/>
                  <span style={{ fontSize:13, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>Notifications</span>
                </div>
                {totalBadge > 0 && (
                  <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:"linear-gradient(135deg,#8b5cf6,#6366f1)", color:"#fff" }}>
                    {totalBadge} new
                  </span>
                )}
              </div>

              <div style={{ maxHeight:380, overflowY:"auto" }}>

                {/* ── ✅ Announcements section ── */}
                {visibleAnns.length > 0 && (
                  <>
                    {/* Section label */}
                    <div style={{ padding:"8px 14px 4px", display:"flex", alignItems:"center", gap:6, background:D?"rgba(139,92,246,0.05)":"rgba(139,92,246,0.03)" }}>
                      <Megaphone size={11} color="#8b5cf6"/>
                      <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", color:"#8b5cf6" }}>
                        Announcements ({visibleAnns.length})
                      </span>
                    </div>

                    {visibleAnns.map((a, i) => {
                      const tc = ANN_TYPE[a.type] || ANN_TYPE.info;
                      const until = fmtUntil(a.showUntil);
                      return (
                        <div key={a.id} style={{
                          display:"flex", gap:10, padding:"10px 14px",
                          borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`,
                          background: D ? `${tc.color}0d` : tc.bg,
                          borderLeft:`3px solid ${tc.color}`,
                          transition:"background .15s",
                        }}>
                          {/* Icon */}
                          <div style={{ width:30, height:30, borderRadius:9, background:`${tc.color}18`, border:`1px solid ${tc.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                            <Megaphone size={12} color={tc.color}/>
                          </div>
                          {/* Content */}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              <p style={{ margin:0, fontSize:12, fontWeight:700, color:tc.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:150 }}>{a.title}</p>
                              <span style={{ fontSize:8, fontWeight:700, padding:"1px 6px", borderRadius:20, background:`${tc.color}15`, color:tc.color, border:`1px solid ${tc.border}`, flexShrink:0 }}>
                                {tc.label}
                              </span>
                            </div>
                            <p style={{ margin:"3px 0 0", fontSize:11, color:D?"#94a3b8":"#64748b", lineHeight:1.5,
                              overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                            }}>
                              {a.message}
                            </p>
                            {until && (
                              <p style={{ margin:"3px 0 0", fontSize:10, color:"#94a3b8", display:"flex", alignItems:"center", gap:3 }}>
                                <Clock size={9}/> Until {until}
                              </p>
                            )}
                          </div>
                          {/* Dismiss */}
                          <button onClick={() => dismissAnn(a.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:2, flexShrink:0, display:"flex", alignItems:"flex-start" }}>
                            <X size={12}/>
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* ── Regular notifications section ── */}
                {notifications.length > 0 && (
                  <>
                    {visibleAnns.length > 0 && (
                      <div style={{ padding:"8px 14px 4px", display:"flex", alignItems:"center", gap:6 }}>
                        <Bell size={11} color={D?"#475569":"#94a3b8"}/>
                        <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", color:D?"#475569":"#94a3b8" }}>
                          Notifications
                        </span>
                      </div>
                    )}
                    {notifications.map(n => {
                      const c = notifColors[n.type] || notifColors.info;
                      return (
                        <div key={n.id} style={{
                          padding:"11px 16px",
                          borderBottom:`1px solid ${D?"#1e293b":"#f8fafc"}`,
                          background: n.read ? "transparent" : c.bg,
                          display:"flex", gap:10, alignItems:"flex-start",
                        }}>
                          <div style={{ width:7, height:7, borderRadius:"50%", background:c.dot, marginTop:5, flexShrink:0 }} />
                          <div style={{ minWidth:0 }}>
                            <p style={{ margin:"0 0 2px", fontSize:12, fontWeight:700, color:D?"#e2e8f0":"#0f172a" }}>{n.title}</p>
                            <p style={{ margin:0, fontSize:11, color:"#64748b", lineHeight:1.5 }}>{n.msg}</p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Empty state */}
                {totalBadge === 0 && notifications.length === 0 && (
                  <div style={{ padding:"28px 16px", textAlign:"center" }}>
                    <Bell size={24} style={{ margin:"0 auto 8px", display:"block", opacity:.2, color:"#94a3b8" }} />
                    <p style={{ margin:0, fontSize:12, color:"#94a3b8" }}>No notifications</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar menu */}
        <div ref={menuRef} style={{ position:"relative" }}>
          <button
            onClick={() => { setShowMenu(v => !v); setShowNotif(false); }}
            style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 8px 4px 4px", borderRadius:11, border:`1px solid ${D?"#334155":"#e2e8f0"}`, background:D?"#1e293b":"#f8fafc", cursor:"pointer" }}>
            {patient.avatarUrl
              ? <img src={patient.avatarUrl} alt="avatar" style={{ width:28, height:28, borderRadius:8, objectFit:"cover" }} />
              : <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,#1d4ed8,#0284c7)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#fff" }}>{initials}</div>
            }
            <span style={{ fontSize:12, fontWeight:600, color:D?"#e2e8f0":"#0f172a", maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} className="hide-sm">
              {fullName}
            </span>
            <ChevronDown size={13} color={D?"#475569":"#94a3b8"} style={{ transform:showMenu?"rotate(180deg)":"rotate(0)", transition:"transform .2s" }} />
          </button>

          {showMenu && (
            <div style={{
              position:"absolute", top:"calc(100% + 8px)", right:0, width:200,
              background:D?"#1e293b":"#fff",
              border:`1px solid ${D?"#334155":"#f1f5f9"}`,
              borderRadius:14, boxShadow:"0 16px 48px rgba(0,0,0,0.2)",
              overflow:"hidden", zIndex:100,
            }}>
              <div style={{ padding:"12px 14px", borderBottom:`1px solid ${D?"#334155":"#f1f5f9"}` }}>
                <p style={{ margin:0, fontSize:12, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>{fullName}</p>
                <p style={{ margin:"2px 0 0", fontSize:10, color:"#64748b", fontFamily:"monospace" }}>{patient.patientId}</p>
              </div>
              {[
                { icon: User,     label: "My Profile", action: onOpenProfile  },
                { icon: Settings, label: "Settings",   action: onOpenSettings },
              ].map(item => (
                <button key={item.label} onClick={() => { item.action(); setShowMenu(false); }}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", border:"none", background:"transparent", cursor:"pointer", fontSize:13, fontWeight:500, color:D?"#cbd5e1":"#475569", textAlign:"left" }}
                  onMouseEnter={e => e.currentTarget.style.background=D?"#0f172a":"#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <item.icon size={15} />{item.label}
                </button>
              ))}
              <div style={{ borderTop:`1px solid ${D?"#334155":"#f1f5f9"}` }}>
                <button onClick={onLogout}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", border:"none", background:"transparent", cursor:"pointer", fontSize:13, fontWeight:600, color:"#ef4444", textAlign:"left" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,.06)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <LogOut size={15} /> {t.logout}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes annIn    { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes badgePop { from{transform:scale(0);opacity:0} to{transform:scale(1);opacity:1} }
        @media(max-width:768px){
          .hamburger-btn{display:flex!important;}
          .hide-sm{display:none!important;}
        }
      `}</style>
    </div>
  );
}
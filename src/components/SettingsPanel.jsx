import React, { useState, useRef, useEffect } from "react";
import { Settings, X, Moon, Sun, Bell, BellOff, Check, Clock, ShieldCheck, Trash2 } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";

const DEFAULT_POS = { x: window.innerWidth - 80, y: window.innerHeight / 2 };

const Toggle = ({ on, onClick, D }) => (
  <button
    onClick={onClick}
    className={`relative rounded-full transition-all duration-300 flex-shrink-0 ${on ? "bg-blue-500" : D ? "bg-gray-700" : "bg-gray-300"}`}
    style={{ width: "36px", height: "20px" }}
  >
    <span
      className="absolute top-[2px] left-[2px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-300"
      style={{ transform: on ? "translateX(16px)" : "translateX(0)" }}
    />
  </button>
);

export default function SettingsPanel({ onNavigateToAppointments }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("settings");
  const { isDark, toggleTheme, notifEnabled, toggleNotif } = useTheme();
  const D = isDark;

  // ✅ Real-time pending approvals from Firebase
  const [pendingApprovals, setPendingApprovals] = useState([]);

  useEffect(() => {
    const unsub = onValue(ref(db, "appointments"), (snap) => {
      const data = snap.val();
      if (!data) { setPendingApprovals([]); return; }
      const pending = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter(a => a.status === "Pending Approval")
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setPendingApprovals(pending);
    });
    return () => unsub();
  }, []);

  // Draggable
  const [pos, setPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("settings-btn-pos")) || DEFAULT_POS; }
    catch { return DEFAULT_POS; }
  });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  // Notif settings — per type toggles
  const [notifSettings, setNotifSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem("notif-settings")) || { all: true, bell: true, alert: true, message: true }; }
    catch { return { all: true, bell: true, alert: true, message: true }; }
  });

  // Static/local notifications (non-pending)
  const [staticNotifs, setStaticNotifs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("static-notifs")) || [
        { id: "s1", type: "alert",   icon: "⚠️", title: "ICU Capacity at 80%",        sub: "Immediate attention required",   time: "10m ago", unread: true  },
        { id: "s2", type: "message", icon: "💬", title: "Dr. Santos sent a message",   sub: "Lab results for Pedro ready",    time: "1h ago",  unread: false },
        { id: "s3", type: "notice",  icon: "🧪", title: "Lab result ready",            sub: "Ana Ramos — CBC Results",        time: "2h ago",  unread: false },
        { id: "s4", type: "notice",  icon: "💳", title: "Billing processed",           sub: "Carlos Bautista — ₱2,400 paid", time: "3h ago",  unread: false },
      ];
    } catch { return []; }
  });

  const [notifFilter, setNotifFilter] = useState("all");

  useEffect(() => { localStorage.setItem("notif-settings", JSON.stringify(notifSettings)); }, [notifSettings]);
  useEffect(() => { localStorage.setItem("static-notifs", JSON.stringify(staticNotifs)); }, [staticNotifs]);

  const toggleNotifSetting = (key) => {
    setNotifSettings(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === "all") return { all: next.all, bell: next.all, alert: next.all, message: next.all };
      const anyOn = next.bell || next.alert || next.message;
      return { ...next, all: anyOn && next.bell && next.alert && next.message };
    });
  };

  const fmtDate = (s) => {
    if (!s) return "—";
    return new Date(s + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  };
  const fmt12 = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
  };

  // ✅ Combine pending approvals (from Firebase) + static notifs into unified list
  const pendingNotifItems = pendingApprovals.map(a => ({
    id: `appt-${a.id}`,
    type: "approval",
    icon: "⏳",
    title: `Appointment Request — ${a.patientName}`,
    sub: `${a.type} · ${a.doctor} · ${fmtDate(a.date)} ${fmt12(a.time)}`,
    time: "Awaiting approval",
    unread: true,
    apptData: a,
  }));

  const allNotifs = [...pendingNotifItems, ...staticNotifs];

  const filteredNotifs = notifFilter === "all"
    ? allNotifs
    : notifFilter === "approval"
      ? pendingNotifItems
      : staticNotifs.filter(n => n.type === notifFilter);

  const unreadCount = allNotifs.filter(n => n.unread).length;
  // ✅ Badge count = pending approvals (real) + static unreads
  const badgeCount = pendingApprovals.length + staticNotifs.filter(n => n.unread).length;

  const markAllRead = () => setStaticNotifs(p => p.map(n => ({ ...n, unread: false })));
  const deleteStaticNotif = (id) => setStaticNotifs(p => p.filter(n => n.id !== id));
  const clearStatic = () => setStaticNotifs([]);

  // Drag
  const onMouseDown = (e) => {
    dragging.current = true;
    hasDragged.current = false;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return;
      hasDragged.current = true;
      const x = Math.min(Math.max(e.clientX - offset.current.x, 10), window.innerWidth - 60);
      const y = Math.min(Math.max(e.clientY - offset.current.y, 10), window.innerHeight - 60);
      const p = { x, y };
      setPos(p);
      localStorage.setItem("settings-btn-pos", JSON.stringify(p));
    };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  const panelLeft = pos.x > window.innerWidth / 2 ? pos.x - 328 - 8 : pos.x + 56;
  const panelTop  = Math.min(Math.max(pos.y - 20, 12), window.innerHeight - 560);

  const handleGoToAppointments = () => {
    setOpen(false);
    if (onNavigateToAppointments) onNavigateToAppointments();
  };

  return (
    <>
      {/* Floating draggable button */}
      <div
        onMouseDown={onMouseDown}
        onClick={() => { if (!hasDragged.current) setOpen(p => !p); }}
        className="fixed z-50 select-none"
        style={{ left: pos.x, top: pos.y, cursor: "grab" }}
      >
        <div className={`relative w-12 h-12 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-200 ${
          open
            ? "bg-blue-600 text-white border-blue-500"
            : D
              ? "bg-gray-800 border border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-400"
              : "bg-white border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500 shadow-lg"
        }`}>
          <Settings size={20} className={`transition-transform duration-500 ${open ? "rotate-90" : ""}`} />

          {/* ✅ Badge — real count (pending approvals + static unreads) */}
          {notifEnabled && badgeCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg border-2 px-0.5"
              style={{ borderColor: D ? "#1f2937" : "#ffffff", animation: "badgePop .3s ease" }}
            >
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
          onClick={() => setOpen(false)} />
      )}

      {/* Panel */}
      <div
        className={`fixed z-50 w-80 rounded-3xl shadow-2xl transition-all duration-300 ease-out ${
          open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
        style={{
          left: panelLeft, top: panelTop,
          background: D ? "#0f1117" : "#fff",
          border: D ? "1px solid #1f2937" : "1px solid #e5e7eb",
          boxShadow: D ? "0 24px 60px rgba(0,0,0,0.7)" : "0 24px 60px rgba(0,0,0,0.12)",
        }}
      >
        {/* Tabs */}
        <div className={`flex items-center gap-0.5 px-3 pt-2 border-b ${D ? "border-gray-800" : "border-gray-100"}`}>
          {[
            { key: "settings", label: "Settings",      icon: Settings },
            { key: "notifs",   label: "Notifications", icon: Bell,    badge: badgeCount },
          ].map(({ key, label, icon: Icon, badge }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all ${
                tab === key
                  ? "border-blue-500 text-blue-500"
                  : `border-transparent ${D ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`
              }`}>
              <Icon size={12} /> {label}
              {badge > 0 && (
                <span className="min-w-[16px] h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5">
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => setOpen(false)}
            className={`w-7 h-7 mb-1 rounded-xl flex items-center justify-center transition-all ${
              D ? "text-gray-600 hover:text-gray-300 hover:bg-gray-800" : "text-gray-400 hover:bg-gray-100"
            }`}>
            <X size={13} />
          </button>
        </div>

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div className="p-4 space-y-3">

            {/* ✅ Pending approval quick-view in settings tab */}
            {pendingApprovals.length > 0 && (
              <div
                className="rounded-2xl p-3 cursor-pointer"
                style={{
                  background: D ? "rgba(249,115,22,0.08)" : "rgba(249,115,22,0.05)",
                  border: "1.5px solid rgba(249,115,22,0.3)",
                }}
                onClick={handleGoToAppointments}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)" }}
                  >
                    <Clock size={17} color="#f97316" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: D ? "#fdba74" : "#c2410c" }}>
                      {pendingApprovals.length} Pending Approval{pendingApprovals.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: D ? "#9a3412" : "#ea580c" }}>
                      Tap to review in Appointments →
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "1px solid rgba(249,115,22,0.25)" }}
                  >
                    {pendingApprovals.length}
                  </span>
                </div>
              </div>
            )}

            {/* Theme */}
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${D ? "text-gray-600" : "text-gray-400"}`}>Appearance</p>
              <div className={`rounded-2xl p-3 border ${D ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-100"}`}>
                <div className="flex items-center gap-2 mb-2.5">
                  {D ? <Moon size={13} className="text-blue-400" /> : <Sun size={13} className="text-amber-500" />}
                  <div>
                    <p className={`text-xs font-semibold ${D ? "text-white" : "text-gray-700"}`}>Theme</p>
                    <p className={`text-[10px] ${D ? "text-gray-600" : "text-gray-400"}`}>{D ? "Dark mode active" : "Light mode active"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[{ label: "Light", icon: Sun, active: !D, onClick: () => D && toggleTheme() },
                    { label: "Dark",  icon: Moon, active: D, onClick: () => !D && toggleTheme() }
                  ].map(({ label, icon: Icon, active, onClick }) => (
                    <button key={label} onClick={onClick}
                      className={`relative rounded-xl border-2 p-2 transition-all ${
                        active ? "border-blue-500 bg-blue-500/5"
                          : D ? "border-transparent bg-gray-800/60 hover:border-gray-700"
                              : "border-transparent bg-gray-100 hover:border-gray-200"
                      }`}>
                      {active && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check size={9} className="text-white" />
                        </span>
                      )}
                      <div className={`w-full h-9 rounded-lg border p-1.5 mb-1.5 ${label === "Light" ? "bg-white border-gray-200" : "bg-gray-900 border-gray-700"}`}>
                        <div className={`w-full h-1.5 rounded mb-1 ${label === "Light" ? "bg-gray-100" : "bg-gray-800"}`} />
                        <div className={`w-2/3 h-1.5 rounded ${label === "Light" ? "bg-blue-100" : "bg-blue-900"}`} />
                      </div>
                      <p className={`text-[10px] font-medium text-center flex items-center justify-center gap-1 ${active ? "text-blue-500" : D ? "text-gray-500" : "text-gray-400"}`}>
                        <Icon size={9} /> {label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notification toggles */}
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${D ? "text-gray-600" : "text-gray-400"}`}>Notifications</p>
              <div className={`rounded-2xl border overflow-hidden ${D ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-100"}`}>
                {[
                  { key: "all",     label: "Notification All",     icon: "🔔", desc: "Master toggle"           },
                  { key: "bell",    label: "Notification Bell",    icon: "🛎️", desc: "General notices"         },
                  { key: "alert",   label: "Notification Alert",   icon: "⚠️", desc: "Warnings & critical"     },
                  { key: "message", label: "Notification Message", icon: "💬", desc: "Doctor & staff messages"  },
                ].map(({ key, label, icon, desc }, i, arr) => (
                  <div key={key}
                    className={`flex items-center justify-between px-3.5 py-2.5 ${
                      i < arr.length - 1 ? (D ? "border-b border-gray-800" : "border-b border-gray-100") : ""
                    } ${key === "all" ? (D ? "bg-white/3" : "bg-blue-50/50") : ""}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base w-6 text-center">{icon}</span>
                      <div>
                        <p className={`text-xs font-medium ${D ? "text-gray-200" : "text-gray-700"}`}>{label}</p>
                        <p className={`text-[10px] ${D ? "text-gray-600" : "text-gray-400"}`}>{desc}</p>
                      </div>
                    </div>
                    <Toggle on={notifSettings[key]} onClick={() => toggleNotifSetting(key)} D={D} />
                  </div>
                ))}
              </div>
            </div>

            {/* System */}
            <div className={`rounded-2xl border p-3 ${D ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-100"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <p className={`text-[10px] font-bold uppercase tracking-widest ${D ? "text-gray-600" : "text-gray-400"}`}>System</p>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full font-medium">● Online</span>
              </div>
              {[["Version","v1.0.0"],["Build","2025.03"],["Env","Development"]].map(([l,v]) => (
                <div key={l} className="flex justify-between py-0.5">
                  <span className={`text-[11px] ${D ? "text-gray-600" : "text-gray-400"}`}>{l}</span>
                  <span className={`text-[11px] font-medium ${D ? "text-gray-400" : "text-gray-600"}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {tab === "notifs" && (
          <div>
            {/* Filter */}
            <div className={`flex items-center gap-1 px-3 py-2 border-b ${D ? "border-gray-800" : "border-gray-100"}`}>
              {[
                { key: "all",      label: `All (${allNotifs.length})` },
                { key: "approval", label: `⏳ Pending (${pendingApprovals.length})` },
                { key: "alert",    label: "⚠️ Alert" },
                { key: "message",  label: "💬 Msg" },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setNotifFilter(key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    notifFilter === key
                      ? key === "approval"
                        ? "text-white"
                        : "bg-blue-500 text-white"
                      : D ? "text-gray-500 hover:text-gray-300 hover:bg-white/5" : "text-gray-400 hover:bg-gray-100"
                  }`}
                  style={notifFilter === key && key === "approval"
                    ? { background: "linear-gradient(135deg,#f97316,#f59e0b)" }
                    : {}}
                >
                  {label}
                </button>
              ))}
              <div className="flex-1" />
              {staticNotifs.some(n => n.unread) && (
                <button onClick={markAllRead} className="text-[10px] text-blue-500 hover:text-blue-400 font-medium">
                  Read all
                </button>
              )}
            </div>

            {/* ✅ Pending approval notice at top of notifs tab */}
            {(notifFilter === "all" || notifFilter === "approval") && pendingApprovals.length > 0 && (
              <div
                className="mx-3 mt-2 mb-1 rounded-xl p-2.5 cursor-pointer"
                style={{ background: D ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.06)", border: "1.5px solid rgba(249,115,22,0.3)" }}
                onClick={handleGoToAppointments}
              >
                <div className="flex items-center gap-2">
                  <Clock size={13} color="#f97316" className="flex-shrink-0" />
                  <p className="text-[11px] font-semibold flex-1" style={{ color: D ? "#fdba74" : "#c2410c" }}>
                    {pendingApprovals.length} appointment request{pendingApprovals.length > 1 ? "s" : ""} awaiting approval
                  </p>
                  <span className="text-[10px] font-bold" style={{ color: "#f97316" }}>Go →</span>
                </div>
              </div>
            )}

            {/* Notif List */}
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              {filteredNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Bell size={24} className={D ? "text-gray-700" : "text-gray-300"} />
                  <p className={`text-xs ${D ? "text-gray-600" : "text-gray-400"}`}>No notifications</p>
                </div>
              ) : (
                filteredNotifs.slice(0, 6).map((n, i) => {
                  const isApproval = n.type === "approval";
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-3.5 py-2.5 transition-all group ${
                        isApproval ? "cursor-pointer" : "cursor-default"
                      } ${
                        n.unread
                          ? isApproval
                            ? D ? "bg-orange-500/5" : "bg-orange-50/60"
                            : D ? "bg-blue-500/5" : "bg-blue-50/50"
                          : D ? "hover:bg-white/3" : "hover:bg-gray-50"
                      }`}
                      style={{ borderBottom: `1px solid ${D ? "rgba(255,255,255,0.04)" : "#f8fafc"}` }}
                      onClick={isApproval ? handleGoToAppointments : undefined}
                    >
                      <span className="text-base flex-shrink-0 mt-0.5">{n.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${D ? "text-gray-200" : "text-gray-800"}`}>{n.title}</p>
                        <p className={`text-[10px] truncate ${D ? "text-gray-500" : "text-gray-400"}`}>{n.sub}</p>
                        <p
                          className="text-[10px] mt-0.5 font-medium"
                          style={{ color: isApproval ? "#f97316" : D ? "#475569" : "#94a3b8" }}
                        >
                          {n.time}
                        </p>
                      </div>
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        {n.unread && (
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-1"
                            style={{ background: isApproval ? "#f97316" : "#3b82f6" }}
                          />
                        )}
                        {!isApproval && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteStaticNotif(n.id); }}
                            className={`opacity-0 group-hover:opacity-100 transition-all ${D ? "text-gray-700 hover:text-red-400" : "text-gray-300 hover:text-red-500"}`}
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {pendingApprovals.length > 0 && (
              <div
                className={`px-4 py-2 border-t ${D ? "border-gray-800" : "border-gray-100"}`}
                style={{ background: D ? "rgba(249,115,22,0.05)" : "rgba(249,115,22,0.03)" }}
              >
                <button
                  onClick={handleGoToAppointments}
                  className="w-full text-center text-xs font-semibold"
                  style={{ color: "#f97316" }}
                >
                  Review {pendingApprovals.length} pending appointment{pendingApprovals.length > 1 ? "s" : ""} →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className={`px-5 py-2.5 border-t ${D ? "border-gray-800" : "border-gray-100"}`}>
          <p className={`text-[10px] text-center ${D ? "text-gray-700" : "text-gray-400"}`}>MediCore © 2025</p>
        </div>
      </div>

      <style>{`
        @keyframes badgePop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </>
  );
}
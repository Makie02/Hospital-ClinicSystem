// src/components/Header.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    Search, Bell, BellOff, ChevronDown, Plus, Clock, ShieldCheck,
    X, User, Mail, Phone, MapPin, Edit3, Save, MessageSquare,
    Send, Settings, Moon, Sun, Volume2, VolumeX, Loader,
    Megaphone,
} from "lucide-react";
import { ref, onValue, push, get } from "firebase/database";
import { db } from "../context/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import MyProfileModal from "./Myprofilemodal";

const PROFILE_KEY = "medicore_profile_local";
export const saveProfileLocal = p => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {} };
export const loadProfileLocal = () => { try { const r = localStorage.getItem(PROFILE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };

const pageNames = {
    dashboard: "Dashboard", patients: "Patients", appointments: "Appointments",
    doctors: "Doctors", records: "Medical Records", pharmacy: "Pharmacy",
    lab: "Laboratory", billing: "Billing", settings: "Settings",
    users: "User Management", maintenance: "Maintenance", ipd: "I.P.D. Center",
    inventory: "Inventory",
};

// ── Announcement type colors ──────────────────────────────────────────────────
const ANN_TYPE = {
    info:        { color:"#3b82f6", bg:"rgba(59,130,246,0.1)",  border:"rgba(59,130,246,0.25)",  label:"Info"        },
    warning:     { color:"#f97316", bg:"rgba(249,115,22,0.1)",  border:"rgba(249,115,22,0.25)",  label:"Warning"     },
    critical:    { color:"#ef4444", bg:"rgba(239,68,68,0.1)",   border:"rgba(239,68,68,0.25)",   label:"Critical"    },
    success:     { color:"#10b981", bg:"rgba(16,185,129,0.1)",  border:"rgba(16,185,129,0.25)",  label:"Success"     },
    maintenance: { color:"#8b5cf6", bg:"rgba(139,92,246,0.1)", border:"rgba(139,92,246,0.25)",  label:"Maintenance" },
};

export default function Header({ activePage, onNavigateToAppointments }) {
    const { user, profile, logout } = useAuth();
    const { isDark, toggleTheme, notifEnabled, toggleNotif } = useTheme();
    const D = isDark;

    // ── Panels ───────────────────────────────────────────────────────────────
    const [showProfile,   setShowProfile]   = useState(false);
    const [showNotif,     setShowNotif]     = useState(false);
    const [showMessenger, setShowMessenger] = useState(false);
    const [showSettings,  setShowSettings]  = useState(false);
    const [showMyProfile, setShowMyProfile] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const [searchVal,     setSearchVal]     = useState("");

    // ── LOCAL PROFILE ─────────────────────────────────────────────────────────
    const [localProfile, setLocalProfile] = useState(() => {
        const cached = loadProfileLocal();
        if (cached && cached.email) return cached;
        return profile || {};
    });
    const hasFetchedRef = useRef(false);

    useEffect(() => {
        if (hasFetchedRef.current) return;
        const uid = profile?.id || user?.uid;
        if (!uid) return;
        const cached = loadProfileLocal();
        if (cached && cached.id === uid && cached.email) {
            setLocalProfile(cached);
            hasFetchedRef.current = true;
            return;
        }
        hasFetchedRef.current = true;
        get(ref(db, `users/${uid}`)).then(snap => {
            const data = snap.val();
            if (!data) return;
            const merged = { ...data, id: uid };
            setLocalProfile(merged);
            saveProfileLocal(merged);
        }).catch(() => {});
    }, [user?.uid, profile?.id]);

    useEffect(() => {
        if (!profile) return;
        const cached = loadProfileLocal();
        if (!cached || cached.id !== (profile.id || user?.uid)) {
            const merged = { ...profile, id: profile.id || user?.uid };
            setLocalProfile(merged);
            saveProfileLocal(merged);
        }
    }, [profile?.id]);

    const onProfileUpdated = useCallback((updated) => {
        setLocalProfile(updated);
        saveProfileLocal(updated);
    }, []);

    // ── Pending appointment notifications ─────────────────────────────────────
    const [pendingApprovals, setPendingApprovals] = useState([]);
    useEffect(() => {
        const unsub = onValue(ref(db, "appointments"), snap => {
            const data = snap.val();
            if (!data) { setPendingApprovals([]); return; }
            setPendingApprovals(
                Object.entries(data).map(([id, v]) => ({ id, ...v }))
                    .filter(a => a.status === "Pending Approval")
                    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            );
        });
        return () => unsub();
    }, []);

    // ── ✅ ANNOUNCEMENTS — live from Firebase, filtered for admin audience ─────
    const [announcements, setAnnouncements] = useState([]);
    const [dismissedAnns, setDismissedAnns] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem("header_dismissed_anns") || "[]"); }
        catch { return []; }
    });

    useEffect(() => {
        const now = Date.now();
        const unsub = onValue(ref(db, "announcements"), snap => {
            const data = snap.val();
            if (!data) { setAnnouncements([]); return; }
            const list = Object.entries(data)
                .map(([id, v]) => ({ id, ...v }))
                .filter(a => {
                    if (!a.active) return false;
                    if (a.showFrom  && new Date(a.showFrom).getTime()  > now) return false;
                    if (a.showUntil && new Date(a.showUntil).getTime() < now) return false;
                    // Show to admin if audience is "all" or "admin"
                    return a.audience === "all" || a.audience === "admin";
                })
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setAnnouncements(list);
        });
        return () => unsub();
    }, []);

    const dismissAnn = (id) => {
        const next = [...dismissedAnns, id];
        setDismissedAnns(next);
        try { sessionStorage.setItem("header_dismissed_anns", JSON.stringify(next)); } catch {}
    };

    // Visible announcements (not dismissed)
    const visibleAnns = announcements.filter(a => !dismissedAnns.includes(a.id));

    // ── Messenger ────────────────────────────────────────────────────────────
    const [messages,   setMessages]   = useState([]);
    const [msgText,    setMsgText]    = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);
    const [adminUsers, setAdminUsers] = useState([]);
    const [selAdmin,   setSelAdmin]   = useState(null);
    const msgsEndRef = useRef(null);

    useEffect(() => {
        if (!showMessenger) return;
        const unsub = onValue(ref(db, "users"), snap => {
            const data = snap.val();
            if (!data) return;
            const users = Object.entries(data)
                .map(([id, v]) => ({ id, ...v }))
                .filter(u => u.id !== (profile?.id || user?.uid));
            setAdminUsers(users);
            if (!selAdmin && users.length > 0) setSelAdmin(users[0]);
        });
        return () => unsub();
    }, [showMessenger]);

    useEffect(() => {
        if (!selAdmin || !profile) return;
        const ids = [profile.id || user?.uid, selAdmin.id].sort();
        const unsub = onValue(ref(db, `messages/${ids[0]}_${ids[1]}`), snap => {
            const data = snap.val();
            if (!data) { setMessages([]); return; }
            setMessages(Object.entries(data).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.ts || 0) - (b.ts || 0)));
        });
        return () => unsub();
    }, [selAdmin, profile]);

    useEffect(() => { msgsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const sendMessage = async () => {
        if (!msgText.trim() || !selAdmin || !profile) return;
        setSendingMsg(true);
        const ids = [profile.id || user?.uid, selAdmin.id].sort();
        try {
            await push(ref(db, `messages/${ids[0]}_${ids[1]}`), {
                text: msgText.trim(),
                senderId: profile.id || user?.uid,
                senderName: `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "Staff",
                ts: Date.now(), read: false,
            });
            setMsgText("");
        } finally { setSendingMsg(false); }
    };

    // ── Unread message count ──────────────────────────────────────────────────
    const [unreadCount, setUnreadCount] = useState(0);
    useEffect(() => {
        if (!profile) return;
        const myId = profile.id || user?.uid;
        const unsub = onValue(ref(db, "messages"), snap => {
            const data = snap.val();
            if (!data) { setUnreadCount(0); return; }
            let count = 0;
            Object.values(data).forEach(convo => {
                Object.values(convo).forEach(msg => { if (!msg.read && msg.senderId !== myId) count++; });
            });
            setUnreadCount(count);
        });
        return () => unsub();
    }, [profile]);

    // ── Close panels on outside click ─────────────────────────────────────────
    useEffect(() => {
        const handler = e => {
            if (!e.target.closest("[data-panel]")) {
                setShowProfile(false); setShowNotif(false); setShowSettings(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const fmtDate = s => s ? new Date(s + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" }) : "—";
    const fmt12   = t => {
        if (!t) return "—";
        const [h, m] = t.split(":").map(Number);
        return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
    };
    const fmtTime = ts => new Date(ts).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: true });

    const totalPending   = pendingApprovals.length;
    // ✅ Total badge = pending appointments + unread announcements
    const totalBadge     = totalPending + visibleAnns.length;

    const displayName  = `${localProfile.firstName || ""} ${localProfile.lastName || ""}`.trim() || localProfile.email || "User";
    const initials     = ((localProfile.firstName?.[0] || "") + (localProfile.lastName?.[0] || "")).toUpperCase() || "U";
    const avatarUrl    = localProfile.avatarUrl || null;
    const now          = new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const panelStyle = {
        position: "absolute", right: 0, top: 52, borderRadius: 18, zIndex: 50, overflow: "hidden",
        background: D ? "#0f1117" : "#ffffff",
        border: D ? "1px solid #1f2937" : "1px solid #e5e7eb",
        boxShadow: D ? "0 24px 60px rgba(0,0,0,0.6)" : "0 16px 48px rgba(0,0,0,0.12)",
        animation: "dropIn .2s ease",
    };
    const btnStyle = (color = "#3b82f6") => ({
        width: "100%", textAlign: "left", display: "flex", alignItems: "center",
        gap: 10, padding: "10px 16px", border: "none", cursor: "pointer",
        fontSize: 13, fontWeight: 500, transition: "all .15s",
        background: "transparent", color: D ? "#9ca3af" : "#4b5563", borderRadius: 10,
    });

    const AvatarBubble = ({ size = 32, radius = 10, fontSize = 13 }) => (
        <div style={{ width: size, height: size, borderRadius: radius, background: "linear-gradient(135deg,#2563eb,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize, fontWeight: 800, color: "#fff", flexShrink: 0, overflow: "hidden" }}>
            {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : initials}
        </div>
    );

    return (
        <>
        <header style={{
            height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 24px", flexShrink: 0, position: "relative", zIndex: 10,
            background: D ? "#0f1117" : "#ffffff",
            borderBottom: D ? "1px solid #1f2937" : "1px solid #e5e7eb",
        }}>
            {/* Left */}
            <div>
                <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: D ? "#f9fafb" : "#111827" }}>
                    {pageNames[activePage] || "Dashboard"}
                </h1>
                <p style={{ margin: 0, fontSize: 11, color: D ? "#4b5563" : "#9ca3af" }}>{now}</p>
            </div>

            {/* Search */}
            <div style={{ flex: 1, maxWidth: 400, margin: "0 24px" }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center", borderRadius: 14, border: `1.5px solid ${searchFocused ? "#3b82f6" : D ? "#1f2937" : "#e5e7eb"}`, background: searchFocused ? (D ? "rgba(59,130,246,0.07)" : "#eff6ff") : (D ? "#1a1f2e" : "#f9fafb"), transition: "all .2s" }}>
                    <Search size={14} style={{ position: "absolute", left: 14, color: D ? "#4b5563" : "#9ca3af" }} />
                    <input value={searchVal} onChange={e => setSearchVal(e.target.value)}
                        placeholder="Search patients, records..."
                        onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                        style={{ width: "100%", background: "transparent", border: "none", outline: "none", padding: "10px 40px 10px 38px", fontSize: 13, color: D ? "#e5e7eb" : "#374151" }}
                    />
                </div>
            </div>

            {/* Right icons */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>

                {/* New Patient */}
                <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#2563eb,#0284c7)", color: "#fff" }}>
                    <Plus size={13} /> New Patient
                </button>

                {/* ── Messenger ── */}
                <div style={{ position: "relative" }} data-panel>
                    <button onClick={() => { setShowMessenger(!showMessenger); setShowNotif(false); setShowProfile(false); setShowSettings(false); }}
                        style={{ width: 38, height: 38, borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: showMessenger ? (D ? "rgba(99,102,241,0.15)" : "#eef2ff") : "transparent", color: D ? "#9ca3af" : "#6b7280" }}>
                        <MessageSquare size={17} />
                        {unreadCount > 0 && (
                            <span style={{ position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: "50%", background: "#6366f1", fontSize: 9, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${D ? "#0f1117" : "#fff"}`, padding: "0 2px" }}>
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </button>

                    {showMessenger && (
                        <div data-panel style={{ ...panelStyle, width: 380 }}>
                            <div style={{ padding: "14px 16px", borderBottom: D ? "1px solid #1f2937" : "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <MessageSquare size={16} color="#6366f1" />
                                    <span style={{ fontWeight: 700, fontSize: 14, color: D ? "#f9fafb" : "#111827" }}>Messages</span>
                                </div>
                                <button onClick={() => setShowMessenger(false)} style={{ background: "none", border: "none", cursor: "pointer", color: D ? "#4b5563" : "#9ca3af" }}><X size={14} /></button>
                            </div>
                            <div style={{ display: "flex", height: 420 }}>
                                <div style={{ width: 120, borderRight: D ? "1px solid #1f2937" : "1px solid #f1f5f9", overflowY: "auto" }}>
                                    {adminUsers.length === 0
                                        ? <div style={{ padding: 14, fontSize: 11, color: D ? "#4b5563" : "#9ca3af", textAlign: "center" }}>No other users</div>
                                        : adminUsers.map(u => {
                                            const n = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "User";
                                            const ini = (u.firstName?.[0] || u.email?.[0] || "U").toUpperCase();
                                            return (
                                                <div key={u.id} onClick={() => setSelAdmin(u)}
                                                    style={{ padding: "10px", cursor: "pointer", background: selAdmin?.id === u.id ? (D ? "rgba(99,102,241,0.15)" : "#eef2ff") : "transparent", borderLeft: selAdmin?.id === u.id ? "3px solid #6366f1" : "3px solid transparent", transition: "all .15s" }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", margin: "0 auto 4px" }}>{ini}</div>
                                                    <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: D ? "#e5e7eb" : "#374151", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.split(" ")[0]}</p>
                                                    <p style={{ margin: 0, fontSize: 9, color: D ? "#4b5563" : "#9ca3af", textAlign: "center" }}>{u.role || "staff"}</p>
                                                </div>
                                            );
                                        })
                                    }
                                </div>
                                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                                    {selAdmin ? (
                                        <>
                                            <div style={{ padding: "10px 12px", borderBottom: D ? "1px solid #1f2937" : "1px solid #f1f5f9", fontSize: 12, fontWeight: 700, color: D ? "#e5e7eb" : "#374151" }}>
                                                {`${selAdmin.firstName || ""} ${selAdmin.lastName || ""}`.trim() || selAdmin.email}
                                            </div>
                                            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                                                {messages.length === 0 && <div style={{ textAlign: "center", padding: "24px 0", fontSize: 12, color: D ? "#4b5563" : "#9ca3af" }}>No messages yet. Say hi! 👋</div>}
                                                {messages.map(msg => {
                                                    const mine = msg.senderId === (profile?.id || user?.uid);
                                                    return (
                                                        <div key={msg.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                                                            <div style={{ maxWidth: "78%", padding: "8px 12px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: mine ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : (D ? "#1a1f2e" : "#f1f5f9"), color: mine ? "#fff" : (D ? "#e5e7eb" : "#374151"), fontSize: 12, lineHeight: 1.5 }}>
                                                                <p style={{ margin: 0 }}>{msg.text}</p>
                                                                <p style={{ margin: "3px 0 0", fontSize: 9, opacity: 0.7, textAlign: "right" }}>{fmtTime(msg.ts)}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div ref={msgsEndRef} />
                                            </div>
                                            <div style={{ padding: "8px 10px", borderTop: D ? "1px solid #1f2937" : "1px solid #f1f5f9", display: "flex", gap: 6 }}>
                                                <input value={msgText} onChange={e => setMsgText(e.target.value)}
                                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                                                    placeholder="Type a message..."
                                                    style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: D ? "1px solid #1f2937" : "1px solid #e5e7eb", background: D ? "#1a1f2e" : "#f9fafb", color: D ? "#e5e7eb" : "#374151", fontSize: 12, outline: "none" }}
                                                />
                                                <button onClick={sendMessage} disabled={sendingMsg || !msgText.trim()}
                                                    style={{ width: 34, height: 34, borderRadius: 10, border: "none", cursor: msgText.trim() ? "pointer" : "not-allowed", background: msgText.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : (D ? "#1f2937" : "#e5e7eb"), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    {sendingMsg ? <Loader size={13} style={{ animation: "spin .7s linear infinite" }} /> : <Send size={13} />}
                                                </button>
                                            </div>
                                        </>
                                    ) : <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: D ? "#4b5563" : "#9ca3af" }}>Select a user to chat</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── ✅ Notifications (appointments + announcements) ── */}
                <div style={{ position: "relative" }} data-panel>
                    <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false); setShowMessenger(false); setShowSettings(false); }}
                        style={{ width: 38, height: 38, borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", background: showNotif ? (D ? "rgba(249,115,22,0.15)" : "#fff7ed") : "transparent", color: notifEnabled ? (D ? "#9ca3af" : "#6b7280") : (D ? "#374151" : "#d1d5db") }}>
                        {notifEnabled ? <Bell size={17} /> : <BellOff size={17} />}
                        {notifEnabled && totalBadge > 0 && (
                            <span style={{ position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: "50%", background: visibleAnns.length > 0 ? "#8b5cf6" : "#ef4444", fontSize: 9, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${D ? "#0f1117" : "#fff"}`, padding: "0 2px", animation: "badgePop .3s ease" }}>
                                {totalBadge > 9 ? "9+" : totalBadge}
                            </span>
                        )}
                    </button>

                    {showNotif && (
                        <div data-panel style={{ ...panelStyle, width: 340 }}>
                            {/* Header */}
                            <div style={{ padding: "14px 16px", borderBottom: D ? "1px solid #1f2937" : "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <Bell size={15} color={totalBadge > 0 ? "#f97316" : (D ? "#9ca3af" : "#6b7280")} />
                                    <span style={{ fontWeight: 700, fontSize: 14, color: D ? "#f9fafb" : "#111827" }}>Notifications</span>
                                </div>
                                {totalBadge > 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, background: "linear-gradient(135deg,#f97316,#f59e0b)", color: "#fff" }}>
                                        {totalBadge} new
                                    </span>
                                )}
                            </div>

                            <div style={{ maxHeight: 420, overflowY: "auto" }}>

                                {/* ── Announcements section ── */}
                                {visibleAnns.length > 0 && (
                                    <>
                                        {/* Section label */}
                                        <div style={{ padding: "8px 16px 4px", display: "flex", alignItems: "center", gap: 7 }}>
                                            <Megaphone size={11} color="#8b5cf6"/>
                                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px", color: "#8b5cf6" }}>
                                                Announcements ({visibleAnns.length})
                                            </span>
                                        </div>

                                        {visibleAnns.map((a, i) => {
                                            const tc = ANN_TYPE[a.type] || ANN_TYPE.info;
                                            const until = a.showUntil
                                                ? new Date(a.showUntil).toLocaleDateString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})
                                                : null;
                                            return (
                                                <div key={a.id} style={{
                                                    display: "flex", gap: 10, padding: "10px 14px",
                                                    borderBottom: D ? "1px solid rgba(255,255,255,0.04)" : "1px solid #f8fafc",
                                                    background: D ? `${tc.color}08` : tc.bg,
                                                    borderLeft: `3px solid ${tc.color}`,
                                                    position: "relative",
                                                    transition: "background .15s",
                                                }}>
                                                    {/* Icon */}
                                                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${tc.color}18`, border: `1px solid ${tc.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                                                        <Megaphone size={13} color={tc.color}/>
                                                    </div>
                                                    {/* Content */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: tc.color, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:160 }}>{a.title}</p>
                                                            <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: `${tc.color}15`, color: tc.color, border: `1px solid ${tc.border}`, flexShrink:0 }}>
                                                                {tc.label}
                                                            </span>
                                                        </div>
                                                        <p style={{ margin: "3px 0 0", fontSize: 11, color: D?"#94a3b8":"#64748b", lineHeight: 1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                                                            {a.message}
                                                        </p>
                                                        {until && (
                                                            <p style={{ margin: "3px 0 0", fontSize: 10, color: "#94a3b8" }}>Until {until}</p>
                                                        )}
                                                    </div>
                                                    {/* Dismiss X */}
                                                    <button onClick={() => dismissAnn(a.id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", padding:2, flexShrink:0, display:"flex", alignItems:"flex-start" }}>
                                                        <X size={12}/>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </>
                                )}

                                {/* ── Pending appointments section ── */}
                                {totalPending > 0 && (
                                    <>
                                        <div style={{ padding: "8px 16px 4px", display: "flex", alignItems: "center", gap: 7 }}>
                                            <Clock size={11} color="#f97316"/>
                                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px", color: "#f97316" }}>
                                                Pending Approval ({totalPending})
                                            </span>
                                        </div>
                                        {pendingApprovals.slice(0, 4).map((a, i) => (
                                            <div key={a.id} onClick={() => { setShowNotif(false); onNavigateToAppointments?.(); }}
                                                style={{ display: "flex", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: i < 3 ? (D ? "1px solid rgba(255,255,255,0.04)" : "1px solid #f8fafc") : "none", transition: "background .15s" }}
                                                onMouseEnter={e => e.currentTarget.style.background = D ? "rgba(249,115,22,0.07)" : "rgba(249,115,22,0.04)"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                                                <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(249,115,22,0.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 800, color: "#f97316", lineHeight: 1 }}>{new Date(a.date + "T00:00:00").getDate()}</span>
                                                    <span style={{ fontSize: 8, fontWeight: 700, color: "#f97316" }}>{new Date(a.date + "T00:00:00").toLocaleString("en-PH", { month: "short" }).toUpperCase()}</span>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: D ? "#e5e7eb" : "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.patientName}</p>
                                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: D ? "#6b7280" : "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.type} · {a.doctor}</p>
                                                    <p style={{ margin: "2px 0 0", fontSize: 10, fontWeight: 600, color: "#f97316" }}>{fmtDate(a.date)} · {fmt12(a.time)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* All clear */}
                                {totalBadge === 0 && (
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 0", gap: 10 }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <ShieldCheck size={22} color="#22c55e" />
                                        </div>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: D ? "#e5e7eb" : "#374151" }}>All clear!</p>
                                        <p style={{ margin: 0, fontSize: 11, color: D ? "#4b5563" : "#9ca3af" }}>No pending approvals or announcements.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div style={{ padding: "10px 16px", borderTop: D ? "1px solid #1f2937" : "1px solid #f1f5f9", textAlign: "center" }}>
                                <button onClick={() => { setShowNotif(false); onNavigateToAppointments?.(); }}
                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: totalPending > 0 ? "#f97316" : "#3b82f6" }}>
                                    {totalPending > 0 ? "Review appointments →" : "View all appointments →"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Settings ── */}
                <div style={{ position: "relative" }} data-panel>
                    <button onClick={() => { setShowSettings(!showSettings); setShowProfile(false); setShowNotif(false); setShowMessenger(false); }}
                        style={{ width: 38, height: 38, borderRadius: 12, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: showSettings ? (D ? "rgba(99,102,241,0.15)" : "#eef2ff") : "transparent", color: D ? "#9ca3af" : "#6b7280" }}>
                        <Settings size={17} />
                    </button>
                    {showSettings && (
                        <div data-panel style={{ ...panelStyle, width: 260 }}>
                            <div style={{ padding: "14px 16px", borderBottom: D ? "1px solid #1f2937" : "1px solid #f1f5f9" }}>
                                <span style={{ fontWeight: 700, fontSize: 14, color: D ? "#f9fafb" : "#111827" }}>Quick Settings</span>
                            </div>
                            <div style={{ padding: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: D ? "rgba(255,255,255,0.03)" : "#f9fafb", marginBottom: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        {D ? <Moon size={15} color="#818cf8" /> : <Sun size={15} color="#f59e0b" />}
                                        <span style={{ fontSize: 13, fontWeight: 500, color: D ? "#e5e7eb" : "#374151" }}>{D ? "Dark Mode" : "Light Mode"}</span>
                                    </div>
                                    <button onClick={toggleTheme} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: D ? "#6366f1" : "#e5e7eb", position: "relative", transition: "background .2s" }}>
                                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: D ? 22 : 3, transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
                                    </button>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 12, background: D ? "rgba(255,255,255,0.03)" : "#f9fafb", marginBottom: 6 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        {notifEnabled ? <Volume2 size={15} color="#22c55e" /> : <VolumeX size={15} color="#ef4444" />}
                                        <span style={{ fontSize: 13, fontWeight: 500, color: D ? "#e5e7eb" : "#374151" }}>Notifications</span>
                                    </div>
                                    <button onClick={toggleNotif} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: notifEnabled ? "#22c55e" : "#e5e7eb", position: "relative", transition: "background .2s" }}>
                                        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: notifEnabled ? 22 : 3, transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
                                    </button>
                                </div>
                                <div style={{ borderTop: D ? "1px solid #1f2937" : "1px solid #f1f5f9", marginTop: 8, paddingTop: 8 }}>
                                    <button onClick={() => { setShowSettings(false); setShowMyProfile(true); }} style={{ ...btnStyle(), borderRadius: 10 }}>
                                        <User size={14} /> My Profile
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ width: 1, height: 24, background: D ? "#1f2937" : "#e5e7eb", margin: "0 4px" }} />

                {/* ── Profile button ── */}
                <div style={{ position: "relative" }} data-panel>
                    <button onClick={() => { setShowProfile(!showProfile); setShowNotif(false); setShowMessenger(false); setShowSettings(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px 6px 6px", borderRadius: 14, border: "none", cursor: "pointer", background: showProfile ? (D ? "rgba(255,255,255,0.06)" : "#f9fafb") : "transparent", transition: "all .15s" }}>
                        <AvatarBubble size={32} radius={10} fontSize={13} />
                        <div style={{ textAlign: "left" }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, lineHeight: "1.2", color: D ? "#f1f5f9" : "#374151" }}>{displayName.split(" ")[0]}</p>
                            <p style={{ margin: 0, fontSize: 10, color: D ? "#4b5563" : "#9ca3af", textTransform: "capitalize" }}>{localProfile.role || "staff"}</p>
                        </div>
                        <ChevronDown size={13} style={{ color: D ? "#4b5563" : "#9ca3af", transform: showProfile ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                    </button>

                    {showProfile && (
                        <div data-panel style={{ ...panelStyle, width: 230 }}>
                            <div style={{ padding: "14px 16px", borderBottom: D ? "1px solid #1f2937" : "1px solid #f1f5f9" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                                    <AvatarBubble size={44} radius={13} fontSize={16} />
                                    <div>
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: D ? "#f9fafb" : "#111827" }}>{displayName}</p>
                                        <p style={{ margin: 0, fontSize: 11, color: D ? "#4b5563" : "#9ca3af", textTransform: "capitalize" }}>{localProfile.role || "staff"}</p>
                                    </div>
                                </div>
                                <p style={{ margin: 0, fontSize: 11, color: D ? "#4b5563" : "#9ca3af", wordBreak: "break-all" }}>{localProfile.email || ""}</p>
                            </div>
                            <div style={{ padding: "8px" }}>
                                <button onClick={() => { setShowProfile(false); setShowMyProfile(true); }} style={{ ...btnStyle(), borderRadius: 10 }}>
                                    <User size={14} /> My Profile
                                </button>
                                <button onClick={() => { setShowProfile(false); setShowSettings(true); }} style={{ ...btnStyle(), borderRadius: 10 }}>
                                    <Settings size={14} /> Settings
                                </button>
                                <div style={{ borderTop: D ? "1px solid #1f2937" : "1px solid #f1f5f9", margin: "6px 0" }} />
                                <button onClick={logout} style={{ ...btnStyle("#ef4444"), borderRadius: 10, color: "#ef4444" }}>
                                    <X size={14} /> Sign out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>

        {showMyProfile && (
            <MyProfileModal
                onClose={() => {
                    setShowMyProfile(false);
                    const updated = loadProfileLocal();
                    if (updated) setLocalProfile(updated);
                }}
                profile={localProfile}
                user={user}
                isDark={D}
            />
        )}

        <style>{`
            @keyframes spin     { to { transform: rotate(360deg) } }
            @keyframes dropIn   { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
            @keyframes badgePop { from { transform:scale(0); opacity:0 } to { transform:scale(1); opacity:1 } }
        `}</style>
        </>
    );
}
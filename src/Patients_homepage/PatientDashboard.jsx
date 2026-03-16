// src/Patients_homepage/PatientDashboard.jsx
import React, { useState, useEffect } from "react";
import { ref, onValue, push, update } from "firebase/database";
import { signOut } from "firebase/auth";
import { auth, db } from "../context/firebase";
import { useLang } from "../context/LanguageContext";
import logo1 from "../Image/logo1.png";
import logomed from "../Image/logomed.png";
import {
    Calendar, FileText, Pill, TestTube, CreditCard,
    LogOut, User, ChevronRight, Home, Bell,
    AlertCircle, CheckCircle2, Clock, Plus, X,
    Send, Menu, ChevronLeft, Languages,
} from "lucide-react";
import { Edit3, Camera, Phone, Mail, MapPin, Droplets, Activity } from "lucide-react";

import { usePatient, PatientProvider } from "../context/PatientContext";
import PatientHeader from "./PatientHeader";
import EditProfileModal from "./EditProfileModal";
import AnnouncementWidget from "../components/Announcementwidget";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = s => {
    if (!s) return "—";
    return new Date(s + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};
const fmtTs = ts => ts
    ? new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
    : "—";
const fmtPeso = n => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
const fmt12 = t => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
};
const todayStr = () => new Date().toISOString().split("T")[0];

// ─── Constants ────────────────────────────────────────────────────────────────
const APPT_CFG = {
    "Pending Approval": { color: "#f97316", bg: "rgba(249,115,22,.12)" },
    Scheduled: { color: "#94a3b8", bg: "rgba(148,163,184,.1)" },
    Confirmed: { color: "#60a5fa", bg: "rgba(96,165,250,.1)" },
    "In Progress": { color: "#fbbf24", bg: "rgba(251,191,36,.1)" },
    Done: { color: "#34d399", bg: "rgba(52,211,153,.1)" },
    Cancelled: { color: "#f87171", bg: "rgba(248,113,113,.1)" },
    "No Show": { color: "#c084fc", bg: "rgba(192,132,252,.1)" },
};

const APPT_TYPES = [
    "General Check-up", "Follow-up", "Consultation", "Laboratory", "Dental", "Eye Exam",
    "Vaccination", "Physical Therapy", "Prenatal", "Pediatric", "Emergency", "Other",
];

const TIME_SLOTS = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
];

// ─── Brand Icons for Pay Modal ────────────────────────────────────────────────
// ─── Brand Icons — REAL LOGOS via Clearbit ────────────────────────────────────
// ─── Logo URLs — HTTPS (Google Favicon API) ───────────────────────────────────
const BRAND_LOGO_URL = {
    gcash:        "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://gcash.com&size=128",
    maya:         "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://maya.ph&size=128",
    bdo:          "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://bdo.com.ph&size=128",
    bpi:          "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://bpi.com.ph&size=128",
    unionbank:    "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://unionbankph.com&size=128",
    metrobank:    "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://metrobank.com.ph&size=128",
    landbank:     "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://landbank.com&size=128",
    rcbc:         "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://rcbc.com&size=128",
    securitybank: "https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://securitybank.com&size=128",
};

const BRAND_META = {
    gcash:        { bg: "#007DFE", label: "GCash"     },
    maya:         { bg: "#00A94F", label: "Maya"      },
    bdo:          { bg: "#CC0000", label: "BDO"       },
    bpi:          { bg: "#E30613", label: "BPI"       },
    unionbank:    { bg: "#001F6B", label: "UnionBank" },
    metrobank:    { bg: "#003087", label: "Metrobank" },
    landbank:     { bg: "#006400", label: "LandBank"  },
    rcbc:         { bg: "#D4A017", label: "RCBC"      },
    securitybank: { bg: "#1A1A2E", label: "SecBank"   },
    other:        { bg: "#64748b", label: "Bank"      },
};

const BrandIcon = ({ type, size = 36 }) => {
    const meta   = BRAND_META[type] || BRAND_META.other;
    const url    = BRAND_LOGO_URL[type];
    const radius = Math.round(size * 0.25);

    if (!url) return (
        <div style={{ width: size, height: size, borderRadius: radius, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: Math.round(size * 0.28), fontWeight: 800, color: "#fff", flexShrink: 0, fontFamily: "Arial,sans-serif" }}>
            {meta.label.slice(0, 2).toUpperCase()}
        </div>
    );

    return (
        <div style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", flexShrink: 0, background: "#fff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img
                src={url}
                alt={meta.label}
                width={size}
                height={size}
                style={{ objectFit: "contain", display: "block" }}
                onError={e => {
                    e.target.parentNode.innerHTML = `<div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${meta.bg};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.28)}px;font-weight:800;color:#fff;font-family:Arial,sans-serif">${meta.label.slice(0,2).toUpperCase()}</div>`;
                }}
            />
        </div>
    );
};

const MethodIcon = ({ method, size = 18 }) => {
    const key = method?.toLowerCase?.();
    const url = BRAND_LOGO_URL[key];
    const meta = BRAND_META[key];

    // GCash, Maya, banks — use HTTPS img
    if (url && meta) {
        return (
            <div style={{ width: size, height: size, borderRadius: 4, overflow: "hidden", flexShrink: 0, background: "#fff", border: "1px solid #e2e8f0", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <img
                    src={url}
                    alt={method}
                    width={size}
                    height={size}
                    style={{ objectFit: "contain", display: "block" }}
                    onError={e => {
                        e.target.parentNode.innerHTML = `<div style="width:${size}px;height:${size}px;border-radius:4px;background:${meta.bg};display:inline-flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.6)}px;font-weight:800;color:#fff;font-family:Arial,sans-serif">${meta.label.slice(0,2).toUpperCase()}</div>`;
                    }}
                />
            </div>
        );
    }

    if (method === "Bank Transfer") return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polygon points="12,2 22,8 2,8"/><rect x="3" y="9" width="3" height="9"/><rect x="10.5" y="9" width="3" height="9"/><rect x="18" y="9" width="3" height="9"/><line x1="2" y1="19" x2="22" y2="19"/>
        </svg>
    );

    const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
    const icons = {
        Cash:          <svg {...p}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></svg>,
        "Credit Card": <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/></svg>,
        "Debit Card":  <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="6" y1="15" x2="10" y2="15"/><line x1="14" y1="15" x2="16" y2="15"/></svg>,
        PhilHealth:    <svg {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
        HMO:           <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
        Insurance:     <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
        Other:         <svg {...p}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    };
    return icons[method] || icons.Other;
};
// Methods requiring reference number
const REF_METHODS = ["GCash", "Maya", "Bank Transfer"];
const REF_CFG = {
    GCash: { label: "GCash Reference Number", hint: "13-digit ref — GCash app → Activity → tap transaction → Reference No.", placeholder: "e.g. 1234567890123", color: "#007DFE" },
    Maya: { label: "Maya Reference Number", hint: "Maya app → Transaction History → Reference No.", placeholder: "e.g. MAYA-2025-XXXXXXXX", color: "#00A94F" },
    "Bank Transfer": { label: "Bank Transfer Trace / Ref Number", hint: "Found on bank receipt, deposit slip, or online banking.", placeholder: "e.g. 0123456789", color: "#7c3aed" },
};

// ─── Reusable UI ──────────────────────────────────────────────────────────────
const Badge = ({ label, color, bg }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${color}30`, whiteSpace: "nowrap" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />{label}
    </span>
);

const Empty = ({ icon: Icon, text }) => (
    <div style={{ textAlign: "center", padding: "36px 0" }}>
        <Icon size={30} style={{ margin: "0 auto 10px", display: "block", opacity: .3, color: "#94a3b8" }} />
        <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>{text}</p>
    </div>
);

const Card = ({ title, accent = "#2563eb", children, action }) => (
    <div style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 18, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ padding: "13px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: accent, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", flex: 1 }}>{title}</span>
            {action}
        </div>
        <div style={{ padding: 20 }}>{children}</div>
    </div>
);

// ─── Language Toggle ──────────────────────────────────────────────────────────
function LangToggle() {
    const { lang, switchLang } = useLang();
    return (
        <button onClick={switchLang} title="Switch language"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#475569", transition: "all .2s", flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.color = "#2563eb"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}>
            <Languages size={13} />
            {lang === "en" ? "Filipino" : "English"}
        </button>
    );
}

// ─── Method Icons for payment buttons ────────────────────────────────────────
const METHOD_FALLBACK = {
    GCash: { bg: "#007DFE", text: "G" },
    Maya:  { bg: "#00A94F", text: "M" },
};


// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, patient, onLogout, onBook, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
    const { t } = useLang();
    const fullName = `${patient.firstName} ${patient.lastName}`.trim();
    const initials = (patient.firstName?.[0] || "") + (patient.lastName?.[0] || "");

    const NAV = [
        { id: "home", label: t.nav.home, icon: Home },
        { id: "appointments", label: t.nav.appointments, icon: Calendar },
        { id: "records", label: t.nav.records, icon: FileText },
        { id: "prescriptions", label: t.nav.prescriptions, icon: Pill },
        { id: "lab", label: t.nav.lab, icon: TestTube },
        { id: "billing", label: t.nav.billing, icon: CreditCard },
        { id: "profile", label: t.nav.profile, icon: User },
    ];

    const SidebarContent = ({ isMobile = false }) => (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
            <div style={{ padding: collapsed && !isMobile ? "12px 8px" : "16px 14px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", minHeight: collapsed && !isMobile ? 64 : 90 }}>
                {isMobile && (
                    <button onClick={() => setMobileOpen(false)} style={{ position: "absolute", top: 10, right: 10, background: "#f1f5f9", border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={15} color="#64748b" />
                    </button>
                )}
                <img src={collapsed && !isMobile ? logo1 : logomed} alt="MediCore"
                    style={{ height: collapsed && !isMobile ? 50 : 52, maxWidth: collapsed && !isMobile ? 50 : 190, objectFit: "contain", mixBlendMode: "multiply", transition: "all .25s" }} />
                {(!collapsed || isMobile) && (
                    <p style={{ margin: "5px 0 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.2px", color: "#94a3b8" }}>{t.patientPortal}</p>
                )}
            </div>
            {(!collapsed || isMobile) ? (
                <div style={{ margin: "10px 10px 4px", padding: "10px 12px", background: "linear-gradient(135deg,#eff6ff,#e0f2fe)", borderRadius: 13, border: "1px solid #bfdbfe" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#1d4ed8,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{initials}</div>
                        <div style={{ minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName}</p>
                            <p style={{ margin: 0, fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{patient.patientId}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#1d4ed8,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff" }}>{initials}</div>
                </div>
            )}
            <div style={{ padding: "8px 10px 0", display: "flex", justifyContent: collapsed && !isMobile ? "center" : "stretch" }}>
                {(!collapsed || isMobile) ? (
                    <button onClick={() => { onBook(); if (isMobile) setMobileOpen(false); }}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px 0", borderRadius: 11, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#1d4ed8,#0284c7)", color: "#fff", fontSize: 12, fontWeight: 700, boxShadow: "0 4px 14px rgba(37,99,235,.3)" }}>
                        <Plus size={13} /> {t.bookAppt}
                    </button>
                ) : (
                    <button onClick={onBook} title={t.bookAppt}
                        style={{ width: 38, height: 38, borderRadius: 11, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#1d4ed8,#0284c7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(37,99,235,.3)" }}>
                        <Plus size={16} />
                    </button>
                )}
            </div>
            <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
                {(!collapsed || isMobile) && (
                    <p style={{ margin: "6px 4px 4px", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".8px", color: "#cbd5e1" }}>{t.menu}</p>
                )}
                {NAV.map(n => {
                    const active = page === n.id;
                    return (
                        <button key={n.id} onClick={() => { setPage(n.id); if (isMobile) setMobileOpen(false); }}
                            title={collapsed && !isMobile ? n.label : ""}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: collapsed && !isMobile ? "center" : "flex-start", gap: collapsed && !isMobile ? 0 : 10, padding: collapsed && !isMobile ? "10px 0" : "10px 12px", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500, marginBottom: 2, transition: "all .15s", background: active ? "linear-gradient(135deg,rgba(37,99,235,.1),rgba(2,132,199,.07))" : "transparent", color: active ? "#1d4ed8" : "#475569", borderLeft: !collapsed || isMobile ? (active ? "3px solid #2563eb" : "3px solid transparent") : "3px solid transparent" }}>
                            <n.icon size={16} style={{ flexShrink: 0 }} />
                            {(!collapsed || isMobile) && <span>{n.label}</span>}
                        </button>
                    );
                })}
            </nav>
            <div style={{ padding: 10, borderTop: "1px solid #f1f5f9" }}>
                <button onClick={onLogout} title={collapsed && !isMobile ? t.logout : ""}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: collapsed && !isMobile ? "center" : "flex-start", gap: collapsed && !isMobile ? 0 : 10, padding: collapsed && !isMobile ? "10px 0" : "10px 12px", borderRadius: 11, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: "rgba(239,68,68,.06)", color: "#ef4444" }}>
                    <LogOut size={14} style={{ flexShrink: 0 }} />
                    {(!collapsed || isMobile) && <span>{t.logout}</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <div style={{ width: collapsed ? 68 : 230, flexShrink: 0, height: "100vh", position: "sticky", top: 0, transition: "width .25s ease", overflow: "visible", borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", zIndex: 20 }} className="desktop-sidebar">
                <SidebarContent isMobile={false} />
                <button onClick={() => setCollapsed(c => !c)}
                    style={{ position: "absolute", top: 24, right: -14, width: 28, height: 28, borderRadius: "50%", background: "#fff", border: "1.5px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, transition: "all .2s", flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.25)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)"; }}>
                    <ChevronLeft size={14} color="#475569" style={{ transform: collapsed ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .25s" }} />
                </button>
            </div>
            {mobileOpen && (
                <>
                    <div onClick={() => setMobileOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, backdropFilter: "blur(3px)" }} />
                    <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 260, zIndex: 1001, boxShadow: "4px 0 32px rgba(0,0,0,0.2)", animation: "slideIn .25s ease" }}>
                        <SidebarContent isMobile={true} />
                    </div>
                </>
            )}
        </>
    );
}

// ─── Book Appointment Modal ───────────────────────────────────────────────────
function CreateAppointmentModal({ patient, doctors, onClose, onSuccess }) {
    const { t } = useLang();
    const fullName = `${patient.firstName} ${patient.lastName}`.trim();
    const today = todayStr();
    const [form, setForm] = useState({ type: "", doctor: "", date: "", time: "", reason: "", notes: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [step, setStep] = useState(1);
    const set_ = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const labelStyle = { display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 6, color: "#64748b" };
    const inputStyle = { width: "100%", boxSizing: "border-box", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "11px 14px", fontSize: 13, color: "#0f172a", outline: "none", transition: "border-color .2s", fontFamily: "inherit" };

    const v1 = () => { if (!form.type) return t.errType; if (!form.doctor) return t.errDoctor; if (!form.reason.trim()) return t.errReason; return ""; };
    const v2 = () => { if (!form.date) return t.errDate; if (form.date < today) return t.errPastDate; if (!form.time) return t.errTime; return ""; };
    const next = () => {
        setError("");
        if (step === 1) { const e = v1(); if (e) { setError(e); return; } setStep(2); }
        else if (step === 2) { const e = v2(); if (e) { setError(e); return; } setStep(3); }
    };
    const submit = async () => {
        setLoading(true); setError("");
        try {
            const now = Date.now();
            const apptId = `APT-${Math.floor(Math.random() * 9000) + 1000}`;
            const a = { apptId, patientName: fullName, patientId: patient.patientId, patientEmail: patient.email || "", type: form.type, doctor: form.doctor, date: form.date, time: form.time, reason: form.reason.trim(), notes: form.notes.trim() || "", status: "Pending Approval", createdAt: now, updatedAt: now, createdBy: "patient" };
            await push(ref(db, "appointments"), a);
            onSuccess(a);
        } catch { setError(t.errSave); }
        finally { setLoading(false); }
    };

    const selDay = form.date ? new Date(form.date + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "";
    const steps = [t.stepDetails, t.stepSchedule, t.stepConfirm];

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 480, boxShadow: "0 32px 80px rgba(0,0,0,0.3)", overflow: "hidden", animation: "modalIn .25s ease" }}>
                <div style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8,#0284c7)", padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Calendar size={18} color="#fff" /></div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff" }}>{t.bookModalTitle}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.7)" }}>{t.stepLabel(step, 3)}</p>
                    </div>
                    <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color="#fff" /></button>
                </div>
                <div style={{ display: "flex", background: "rgba(37,99,235,.05)", borderBottom: "1px solid #f1f5f9" }}>
                    {steps.map((s, i) => (
                        <div key={s} style={{ flex: 1, padding: "10px 8px", textAlign: "center", borderBottom: `2px solid ${step === i + 1 ? "#2563eb" : "transparent"}` }}>
                            <span style={{ fontSize: 11, fontWeight: step === i + 1 ? 700 : 500, color: step === i + 1 ? "#2563eb" : step > i + 1 ? "#22c55e" : "#94a3b8" }}>{step > i + 1 ? "✓ " : ""}{s}</span>
                        </div>
                    ))}
                </div>
                <div style={{ padding: "22px 24px" }}>
                    {error && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 11, background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)", color: "#ef4444", fontSize: 12, marginBottom: 16 }}><AlertCircle size={13} />{error}</div>}
                    {step === 1 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            <div><label style={labelStyle}>{t.apptTypeLabel}</label><select value={form.type} onChange={set_("type")} style={{ ...inputStyle, cursor: "pointer", color: form.type ? "#0f172a" : "#94a3b8" }}><option value="" disabled>{t.selectPlaceholder}</option>{APPT_TYPES.map(tp => <option key={tp} value={tp}>{tp}</option>)}</select></div>
                            <div><label style={labelStyle}>{t.doctorLabel}</label><select value={form.doctor} onChange={set_("doctor")} style={{ ...inputStyle, cursor: "pointer", color: form.doctor ? "#0f172a" : "#94a3b8" }}><option value="" disabled>{t.selectPlaceholder}</option>{doctors.length > 0 ? doctors.map(d => <option key={d.id} value={`Dr. ${d.firstName} ${d.lastName}`}>Dr. {d.firstName} {d.lastName} — {d.specialization || "General"}</option>) : <option value="Dr. General Physician">Dr. General Physician</option>}</select></div>
                            <div><label style={labelStyle}>{t.complaintLabel}</label><textarea value={form.reason} onChange={set_("reason")} placeholder={t.complaintPlaceholder} rows={3} style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} /></div>
                            <div><label style={labelStyle}>{t.notesLabel}</label><input type="text" value={form.notes} onChange={set_("notes")} placeholder={t.notesPlaceholder} style={inputStyle} /></div>
                        </div>
                    )}
                    {step === 2 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div><label style={labelStyle}>{t.dateLabel}</label><input type="date" value={form.date} onChange={set_("date")} min={today} style={inputStyle} />{selDay && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#2563eb", fontWeight: 600 }}>📅 {selDay}</p>}</div>
                            <div><label style={labelStyle}>{t.timeLabel}</label><div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>{TIME_SLOTS.map(ts => <button key={ts} type="button" onClick={() => setForm(p => ({ ...p, time: ts }))} style={{ padding: "9px 4px", borderRadius: 10, border: `1.5px solid ${form.time === ts ? "#2563eb" : "#e2e8f0"}`, background: form.time === ts ? "linear-gradient(135deg,#2563eb,#0284c7)" : "#f8fafc", color: form.time === ts ? "#fff" : "#475569", fontSize: 12, fontWeight: form.time === ts ? 700 : 500, cursor: "pointer" }}>{fmt12(ts)}</button>)}</div></div>
                            <div style={{ display: "flex", gap: 10, padding: "11px 14px", borderRadius: 12, background: "rgba(37,99,235,.05)", border: "1px solid rgba(37,99,235,.1)" }}><Bell size={14} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} /><p style={{ margin: 0, fontSize: 11, color: "#1e40af", lineHeight: 1.6 }}>{t.clinicNotice}</p></div>
                        </div>
                    )}
                    {step === 3 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ background: "linear-gradient(135deg,#eff6ff,#e0f2fe)", border: "1px solid #bfdbfe", borderRadius: 16, padding: "18px 20px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 13, background: "linear-gradient(135deg,#1d4ed8,#0284c7)", display: "flex", alignItems: "center", justifyContent: "center" }}><Calendar size={20} color="#fff" /></div>
                                    <div><p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{form.type}</p><p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{form.doctor}</p></div>
                                </div>
                                {[[`📅 ${t.dateLabel}`, fmtDate(form.date)], [`🕐 ${t.timeLabel}`, fmt12(form.time)], [`👤 ${t.patientLabel}`, fullName], [`💬 ${t.reasonLabel}`, form.reason], ...(form.notes ? [[`📝 ${t.notesFieldLabel}`, form.notes]] : [])].map(([l, v]) => (
                                    <div key={l} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid rgba(37,99,235,.1)" }}>
                                        <span style={{ fontSize: 12, color: "#64748b", flexShrink: 0, minWidth: 90 }}>{l}</span>
                                        <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(249,115,22,.07)", border: "1px solid rgba(249,115,22,.25)" }}>
                                <Clock size={15} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
                                <div><p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#c2410c" }}>Pending Clinic Approval</p><p style={{ margin: "3px 0 0", fontSize: 11, color: "#9a3412", lineHeight: 1.6 }}>Your request will be reviewed by our staff. You'll be notified via email once approved.</p></div>
                            </div>
                        </div>
                    )}
                    <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                        {step > 1 && <button onClick={() => { setStep(s => s - 1); setError(""); }} style={{ flex: "0 0 90px", padding: "12px 0", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{t.backBtn}</button>}
                        <button onClick={step < 3 ? next : submit} disabled={loading} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: loading ? "rgba(99,99,99,.3)" : "linear-gradient(135deg,#1d4ed8,#0284c7)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: loading ? "none" : "0 6px 20px rgba(37,99,235,.35)" }}>
                            {loading ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite" }} />{t.savingText}</> : step < 3 ? t.nextBtn : <><Send size={14} />Submit Request</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Pay Bill Modal ✅ UPDATED — fetches GCash/Maya/Bank from Firebase ─────────
function PayBillModal({ bill, onClose, onSuccess }) {
    const { t } = useLang();
    const balance = Math.max(0, (+bill.total || 0) - (+bill.amountPaid || 0));

    const [amount, setAmount] = useState(String(balance));
    const [method, setMethod] = useState("Cash");
    const [refNum, setRefNum] = useState("");
    const [selWallet, setSelWallet] = useState(null);
    const [ewallets, setEwallets] = useState([]);
    const [loadingWallets, setLoadingWallets] = useState(true);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState("");

    // ── Fetch clinic bank/ewallet settings from Firebase ──────────────────────
    useEffect(() => {
        const unsub = onValue(ref(db, "settings/billing/banks"), (snap) => {
            const data = snap.val();
            if (!data) { setEwallets([]); setLoadingWallets(false); return; }
            setEwallets(
                Object.entries(data)
                    .map(([id, v]) => ({ id, ...v }))
                    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
            );
            setLoadingWallets(false);
        });
        return () => unsub();
    }, []);

    const needsRef = REF_METHODS.includes(method);
    const refCfg = REF_CFG[method] || null;

    // Filter matching wallets for current method
    const matchingWallets = ewallets.filter(e => {
        const bt = (e.bankType || "").toLowerCase();
        if (method === "GCash") return bt === "gcash";
        if (method === "Maya") return bt === "maya";
        if (method === "Bank Transfer") return ["bdo", "bpi", "unionbank", "metrobank", "landbank", "rcbc", "securitybank", "other"].includes(bt);
        return false;
    });
    const [gcashMode, setGcashMode] = useState("qr"); // "qr" | "app"

    const handleMethodChange = (m) => {
        setMethod(m);
        setRefNum("");
        setSelWallet(null);
        setGcashMode("qr"); // ← add this
        setError("");
    };

    const handlePay = async () => {
        setError("");
        const num = parseFloat(amount);
        if (!amount || isNaN(num) || num <= 0) { setError(t.errPayAmount || "Please enter a valid amount."); return; }
        if (num > balance + 0.001) { setError(t.errPayMax ? t.errPayMax(fmtPeso(balance)) : `Amount exceeds balance of ${fmtPeso(balance)}`); return; }
        if (needsRef && !refNum.trim()) { setError(`Please enter the ${refCfg.label} before proceeding.`); return; }
        setPaying(true);
        try {
            const newAmountPaid = (+bill.amountPaid || 0) + num;
            const newStatus = newAmountPaid >= +bill.total ? "Paid" : "Partial";
            await update(ref(db, `bills/${bill.id}`), {
                amountPaid: newAmountPaid,
                status: newStatus,
                updatedAt: Date.now(),
                lastPaymentMethod: method,
                lastPaymentAt: Date.now(),
                ...(refNum.trim() ? { lastReferenceNumber: refNum.trim() } : {}),
            });
            onSuccess({ amount: num, method, refNum: refNum.trim(), newStatus });
        } catch { setError(t.errPaySave || "Failed to save payment. Please try again."); }
        finally { setPaying(false); }
    };

    const ALL_METHODS = ["Cash", "GCash", "Maya", "Bank Transfer", "Credit Card", "Debit Card", "PhilHealth", "HMO", "Insurance", "Other"];
    const METHOD_EMOJI = { Cash: "💵", GCash: "📱", Maya: "💙", "Bank Transfer": "🏦", "Credit Card": "💳", "Debit Card": "🏧", PhilHealth: "🏥", HMO: "🏢", Insurance: "🛡️", Other: "💰" };
    const inputStyle = { width: "100%", boxSizing: "border-box", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: "11px 14px", fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit", transition: "border-color .2s" };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 16 }}>
            <div style={{ background: "#fff", borderRadius: 24, width: "100%", maxWidth: 460, boxShadow: "0 32px 80px rgba(0,0,0,0.3)", overflow: "hidden", animation: "modalIn .25s ease", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

                {/* Header */}
                <div style={{ background: "linear-gradient(135deg,#92400e,#d97706,#f59e0b)", padding: "18px 22px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><CreditCard size={18} color="#fff" /></div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#fff" }}>{t.payModalTitle || "Pay Bill"}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.75)" }}>{bill.billId}{bill.service ? ` · ${bill.service}` : ""}</p>
                    </div>
                    <button onClick={onClose} style={{ background: "rgba(255,255,255,.15)", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} color="#fff" /></button>
                </div>

                {/* Scrollable body */}
                <div style={{ overflowY: "auto", flex: 1, padding: "18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>

                    {/* Bill summary */}
                    <div style={{ background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "1px solid #fde68a", borderRadius: 14, padding: "12px 16px" }}>
                        {[[t.totalBillLabel || "Total Bill", fmtPeso(bill.total || 0)], [t.amountPaidLabel || "Amount Paid", fmtPeso(bill.amountPaid || 0)], [t.balanceRemLabel || "Balance Due", fmtPeso(balance)]].map(([label, val], i) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < 2 ? "1px solid rgba(217,119,6,.15)" : "none" }}>
                                <span style={{ fontSize: 12, color: "#92400e" }}>{label}</span>
                                <span style={{ fontSize: i === 2 ? 16 : 13, fontWeight: i === 2 ? 800 : 600, color: i === 2 ? "#d97706" : "#0f172a" }}>{val}</span>
                            </div>
                        ))}
                    </div>

                    {/* Error */}
                    {error && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 11, background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)", color: "#ef4444", fontSize: 12 }}><AlertCircle size={13} />{error}</div>}

                    {/* Amount */}
                    <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 6, color: "#64748b" }}>{t.payAmountLabel || "Amount to Pay (₱)"}</label>
                        <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 700, color: "#d97706" }}>₱</span>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0" max={balance} step="0.01"
                                style={{ ...inputStyle, padding: "11px 14px 11px 30px", fontSize: 16, fontWeight: 700 }}
                                onFocus={e => e.target.style.borderColor = "#d97706"} onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
                        </div>
                        <div style={{ display: "flex", gap: 6, marginTop: 7, flexWrap: "wrap" }}>
                            {[balance, balance * 0.75, balance * 0.5].filter(v => v > 0).map((v, i) => (
                                <button key={i} type="button" onClick={() => setAmount(String(Math.round(v * 100) / 100))}
                                    style={{ padding: "4px 9px", borderRadius: 8, border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                                    {i === 0 ? (t.fullBtn || "Full") : i === 1 ? "75%" : "50%"} ({fmtPeso(Math.round(v * 100) / 100)})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payment method picker */}
                    {/* Payment method picker */}
                    <div>
                        <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px", marginBottom: 8, color: "#64748b" }}>
                            {t.payMethodLabel || "Payment Method"}
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            {ALL_METHODS.map(m => (
                                <button key={m} type="button" onClick={() => handleMethodChange(m)}
                                    style={{
                                        padding: "7px 12px", borderRadius: 9, cursor: "pointer",
                                        fontSize: 12, fontWeight: 600, transition: "all .15s",
                                        display: "flex", alignItems: "center", gap: 6,
                                        border: `1.5px solid ${method === m ? "#d97706" : "#e2e8f0"}`,
                                        background: method === m ? "linear-gradient(135deg,#d97706,#f59e0b)" : "#f8fafc",
                                        color: method === m ? "#fff" : "#64748b",
                                    }}>
                                    <MethodIcon method={m} size={16} />
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ✅ E-wallet/Bank section — shows only when GCash/Maya/Bank Transfer selected */}
                    {needsRef && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px", color: "#64748b" }}>
                                {method === "Bank Transfer" ? "Select Bank Account" : `Pay via ${method}`}
                            </label>

                            {/* ── GCash / Maya: two-option selector ── */}
                            {(method === "GCash" || method === "Maya") && (
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    {[
                                        {
                                            id: "qr", label: "Scan QR Code", sub: "Open app then scan", icon: (
                                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                                                    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="17" y="17" width="4" height="4" rx="0.5" />
                                                    <path d="M14 14h3v3" />
                                                </svg>
                                            )
                                        },
                                        {
                                            id: "app", label: "Open GCash App", sub: "Continue in app", icon: (
                                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                    <rect x="5" y="2" width="14" height="20" rx="2" /><circle cx="12" cy="17" r="1" fill="currentColor" />
                                                </svg>
                                            )
                                        },
                                    ].map(opt => {
                                        const brand = method === "GCash" ? "#007DFE" : "#00A94F";
                                        const isActive = gcashMode === opt.id;
                                        return (
                                            <div key={opt.id} onClick={() => setGcashMode(opt.id)}
                                                style={{ padding: "14px 10px", borderRadius: 14, border: `2px solid ${isActive ? brand : "#e2e8f0"}`, background: isActive ? `${brand}12` : "#f8fafc", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, cursor: "pointer", transition: "all .15s", color: isActive ? brand : "#64748b" }}>
                                                {opt.icon}
                                                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: isActive ? brand : "#0f172a" }}>{opt.label}</p>
                                                <p style={{ margin: 0, fontSize: 10, color: isActive ? brand : "#94a3b8", textAlign: "center" }}>{opt.sub}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {loadingWallets ? (
                                <div style={{ padding: "14px 0", textAlign: "center" }}>
                                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #e2e8f0", borderTopColor: "#d97706", animation: "spin .6s linear infinite", margin: "0 auto" }} />
                                </div>
                            ) : matchingWallets.length > 0 ? (
                                <>
                                    {matchingWallets.map(w => {
                                        const isSelected = selWallet?.id === w.id;
                                        const detail = w.number || w.account || w.bankname || "";
                                        return (
                                            <div key={w.id} onClick={() => setSelWallet(isSelected ? null : w)}
                                                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, cursor: "pointer", border: `2px solid ${isSelected ? "#d97706" : "#f1f5f9"}`, background: isSelected ? "#fffbeb" : "#fafafa", transition: "all .15s" }}>
                                                <BrandIcon type={w.bankType} size={38} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{w.label || w.bankType}</p>
                                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b", fontFamily: "monospace" }}>{detail}{w.name ? ` · ${w.name}` : ""}</p>
                                                </div>
                                                {w.qr && <img src={w.qr} alt="QR" style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 8, border: "1px solid #f1f5f9", flexShrink: 0 }} />}
                                                {isSelected && <span style={{ fontSize: 18, color: "#d97706", flexShrink: 0 }}>✓</span>}
                                            </div>
                                        );
                                    })}

                                    {/* QR full view — show when "Scan QR" mode selected */}
                                    {selWallet?.qr && gcashMode === "qr" && (
                                        <div style={{ padding: "16px", borderRadius: 14, background: "#f8fafc", border: "1px solid #f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Scan QR Code — {selWallet.label || selWallet.bankType}</p>
                                            <img src={selWallet.qr} alt="QR Code" style={{ width: 180, height: 180, objectFit: "contain", borderRadius: 12, border: "2px solid #e2e8f0" }} />
                                            <div style={{ textAlign: "center" }}>
                                                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{selWallet.number || selWallet.account || ""}</p>
                                                {selWallet.name && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{selWallet.name}</p>}
                                            </div>
                                            <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>After scanning, enter reference number below ↓</p>
                                        </div>
                                    )}

                                    {/* "Continue to GCash/Maya" deep link — show when "Open App" mode */}
                                    {gcashMode === "app" && (method === "GCash" || method === "Maya") && selWallet && (
                                        <div style={{ padding: "14px 16px", borderRadius: 14, background: method === "GCash" ? "#007DFE12" : "#00A94F12", border: `1.5px solid ${method === "GCash" ? "#007DFE30" : "#00A94F30"}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                                            <p style={{ margin: 0, fontSize: 12, color: "#475569", textAlign: "center" }}>Tap below to open the {method} app and complete your payment of <strong style={{ color: "#0f172a" }}>{fmtPeso(parseFloat(amount) || 0)}</strong></p>
                                            <button
                                                onClick={() => {
                                                    const brand = method === "GCash" ? "#007DFE" : "#00A94F";
                                                    // Try deep link first, fallback to web
                                                    const deepLink = method === "GCash"
                                                        ? `gcash://sendmoney?phone=${encodeURIComponent(selWallet.number || "")}&amount=${parseFloat(amount) || 0}`
                                                        : `maya://pay?phone=${encodeURIComponent(selWallet.number || "")}&amount=${parseFloat(amount) || 0}`;
                                                    const webFallback = method === "GCash"
                                                        ? `https://www.gcash.com`
                                                        : `https://www.maya.ph`;
                                                    // Try deep link, if fails open web
                                                    const win = window.open(deepLink, "_blank");
                                                    setTimeout(() => {
                                                        try { if (win && win.closed) window.open(webFallback, "_blank"); }
                                                        catch { window.open(webFallback, "_blank"); }
                                                    }, 1500);
                                                }}
                                                style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, border: "none", background: method === "GCash" ? "#007DFE" : "#00A94F", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: `0 6px 18px ${method === "GCash" ? "rgba(0,125,254,.35)" : "rgba(0,169,79,.35)"}` }}>
                                                <BrandIcon type={method === "GCash" ? "gcash" : "maya"} size={22} />
                                                Continue to {method}
                                            </button>
                                            <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", textAlign: "center" }}>After paying, come back here and enter your reference number</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.2)", fontSize: 12, color: "#92400e" }}>
                                    ℹ️ No {method} account set up by the clinic yet. Enter your reference number manually below.
                                </div>
                            )}

                            {/* Reference number input — same as before */}
                            {refCfg && (
                                <div style={{ padding: "12px 14px", borderRadius: 14, background: `${refCfg.color}08`, border: `1.5px solid ${refCfg.color}30`, display: "flex", flexDirection: "column", gap: 8 }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                                        <div style={{ flexShrink: 0, marginTop: 2 }}>
                                            {method === "GCash" ? <BrandIcon type="gcash" size={24} /> : method === "Maya" ? <BrandIcon type="maya" size={24} /> : <span style={{ fontSize: 20 }}>🏦</span>}
                                        </div>
                                        <div>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: refCfg.color }}>{refCfg.label}</p>
                                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{refCfg.hint}</p>
                                        </div>
                                    </div>
                                    <input type="text" value={refNum} onChange={e => setRefNum(e.target.value)} placeholder={refCfg.placeholder}
                                        style={{ ...inputStyle, fontFamily: "monospace", letterSpacing: "0.5px", borderColor: refNum.trim() ? refCfg.color : "#e2e8f0" }}
                                        onFocus={e => e.target.style.borderColor = refCfg.color}
                                        onBlur={e => e.target.style.borderColor = refNum.trim() ? refCfg.color : "#e2e8f0"} />
                                    {refNum.trim()
                                        ? <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#22c55e" }}>✓ Reference number entered</p>
                                        : <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#f97316" }}>⚠ Required for {method} payments</p>
                                    }
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: "0 22px 18px", display: "flex", gap: 10, flexShrink: 0 }}>
                    <button onClick={onClose} style={{ flex: "0 0 90px", padding: "11px 0", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {t.cancelBtn || "Cancel"}
                    </button>
                    <button onClick={handlePay} disabled={paying}
                        style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "none", background: paying ? "rgba(99,99,99,.3)" : "linear-gradient(135deg,#d97706,#f59e0b)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: paying ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: paying ? "none" : "0 6px 20px rgba(217,119,6,.35)" }}>
                        {paying
                            ? <><div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", animation: "spin .7s linear infinite" }} />{t.processingText || "Processing..."}</>
                            : <><CreditCard size={14} />{t.payNowBtn || "Pay Now"}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Success Toast ────────────────────────────────────────────────────────────
function SuccessToast({ msg, title, onClose }) {
    return (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 99999, background: "#fff", border: "1px solid #bbf7d0", borderRadius: 16, padding: "14px 18px", boxShadow: "0 16px 48px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: 12, animation: "toastIn .3s ease", maxWidth: 320 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><CheckCircle2 size={18} color="#22c55e" /></div>
            <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{title}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{msg}</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 0, display: "flex" }}><X size={14} /></button>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function PatientDashboard({ patient, onLogout }) {
    const { t } = useLang();
    const [page, setPage] = useState("home");
    const [appointments, setAppointments] = useState([]);
    const [records, setRecords] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [labRequests, setLabRequests] = useState([]);
    const [bills, setBills] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRec, setExpandedRec] = useState(null);
    const [showAppt, setShowAppt] = useState(false);
    const [toast, setToast] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [payingBill, setPayingBill] = useState(null);
    const [showEditProfile, setShowEditProfile] = useState(false);

    const fullName = `${patient.firstName} ${patient.lastName}`.trim();
    const initials = (patient.firstName?.[0] || "") + (patient.lastName?.[0] || "");
    const today = todayStr();

    useEffect(() => {
        let done = 0;
        const check = () => { if (++done >= 6) setLoading(false); };
        const n = fullName;
        const sort = (d, key) => d ? Object.entries(d).map(([id, v]) => ({ id, ...v })).filter(x => x.patientName === n).sort((a, b) => (b[key] || 0) - (a[key] || 0)) : [];
        const u1 = onValue(ref(db, "appointments"), s => { const d = s.val(); setAppointments(d ? Object.entries(d).map(([id, v]) => ({ id, ...v })).filter(a => a.patientName === n).sort((a, b) => a.date > b.date ? -1 : 1) : []); check(); });
        const u2 = onValue(ref(db, "medicalRecords"), s => { setRecords(sort(s.val(), "createdAt")); check(); });
        const u3 = onValue(ref(db, "prescriptions"), s => { setPrescriptions(sort(s.val(), "createdAt")); check(); });
        const u4 = onValue(ref(db, "labRequests"), s => { setLabRequests(sort(s.val(), "createdAt")); check(); });
        const u5 = onValue(ref(db, "bills"), s => { setBills(sort(s.val(), "createdAt")); check(); });
        const u6 = onValue(ref(db, "doctors"), s => { const d = s.val(); setDoctors(d ? Object.entries(d).map(([id, v]) => ({ id, ...v })).filter(doc => doc.status === "Active") : []); check(); });
        return () => { u1(); u2(); u3(); u4(); u5(); u6(); };
    }, [fullName]);

    const handleLogout = async () => { try { await signOut(auth); } catch { } onLogout(); };
    const showToast = (title, msg) => { setToast({ title, msg }); setTimeout(() => setToast(null), 4000); };
    const handleApptSuccess = appt => {
        setShowAppt(false); setPage("appointments");
        showToast("Request Submitted!", `Your ${appt.type} appointment for ${fmtDate(appt.date)} at ${fmt12(appt.time)} has been sent for clinic approval.`);
    };

    const upcomingAppts = appointments.filter(a => a.date >= today && a.status !== "Cancelled" && a.status !== "Pending Approval").sort((a, b) => a.date > b.date ? 1 : -1);
    const pendingApproval = appointments.filter(a => a.status === "Pending Approval");
    const totalOwed = bills.filter(b => b.status === "Unpaid" || b.status === "Partial").reduce((s, b) => s + Math.max(0, (+b.total || 0) - (+b.amountPaid || 0)), 0);
    const labPending = labRequests.filter(l => l.status === "Pending" || l.status === "Processing").length;
    const rxPending = prescriptions.filter(p => p.status === "Pending").length;

    const BookBtn = ({ small }) => (
        <button onClick={() => setShowAppt(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: small ? "7px 13px" : "10px 18px", borderRadius: 11, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#1d4ed8,#0284c7)", color: "#fff", fontSize: small ? 12 : 13, fontWeight: 700, boxShadow: "0 4px 14px rgba(37,99,235,.35)", flexShrink: 0 }}>
            <Plus size={small ? 13 : 15} /> {t.bookApptShort}
        </button>
    );

    const Home_ = () => (
        <div>
            <div style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8,#0284c7)", borderRadius: 20, padding: "22px 24px 24px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
                {[["-15%", "30%", 260, .06], ["70%", "-10%", 200, .05], ["55%", "72%", 160, .07]].map(([top, left, sz, op], i) => <div key={i} style={{ position: "absolute", top, left, width: sz, height: sz, borderRadius: "50%", background: `rgba(255,255,255,${op})`, pointerEvents: "none" }} />)}
                <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <p style={{ margin: "0 0 3px", fontSize: 12, color: "rgba(255,255,255,.65)" }}>{t.welcome}</p>
                        <h2 style={{ margin: "0 0 5px", fontSize: 22, fontWeight: 800, color: "#fff" }}>{fullName}</h2>
                        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.7)", fontFamily: "monospace" }}>{t.patientId} <strong style={{ color: "#fff" }}>{patient.patientId}</strong></p>
                    </div>
                    <button onClick={() => setShowAppt(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 13, border: "2px solid rgba(255,255,255,.35)", background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><Plus size={15} /> {t.bookAppt}</button>
                </div>
            </div>
            <AnnouncementWidget audience="patient" D={false} />
            {pendingApproval.length > 0 && (
                <div onClick={() => setPage("appointments")} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderRadius: 14, background: "linear-gradient(135deg,rgba(249,115,22,.1),rgba(251,191,36,.08))", border: "1.5px solid rgba(249,115,22,.3)", marginBottom: 16, cursor: "pointer" }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(249,115,22,.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Clock size={18} color="#f97316" /></div>
                    <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#c2410c" }}>{pendingApproval.length} Appointment{pendingApproval.length > 1 ? "s" : ""} Awaiting Clinic Approval</p>
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9a3412" }}>You'll be notified by email once reviewed. Tap to view details.</p>
                    </div>
                    <ChevronRight size={16} color="#f97316" />
                </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 18 }}>
                {[
                    { label: t.statUpcoming, value: upcomingAppts.length, color: "#2563eb", bg: "#eff6ff", icon: Calendar },
                    { label: t.statRecords, value: records.length, color: "#059669", bg: "#f0fdf4", icon: FileText },
                    { label: t.statBalance, value: fmtPeso(totalOwed), color: "#d97706", bg: "#fffbeb", icon: CreditCard, isText: true },
                    { label: t.statPendingLabs, value: labPending, color: "#7c3aed", bg: "#f5f3ff", icon: TestTube },
                ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 15, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 11, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><s.icon size={17} color={s.color} /></div>
                        <div><p style={{ margin: 0, fontSize: s.isText ? 15 : 22, fontWeight: 800, color: s.color }}>{s.value}</p><p style={{ margin: 0, fontSize: 11, color: "#64748b", fontWeight: 500 }}>{s.label}</p></div>
                    </div>
                ))}
            </div>
            <Card title={t.upcomingCount(upcomingAppts.length)} accent="#2563eb" action={<BookBtn small />}>
                {upcomingAppts.length === 0
                    ? <div style={{ textAlign: "center", padding: "24px 0" }}><Calendar size={28} style={{ margin: "0 auto 10px", display: "block", opacity: .25 }} /><p style={{ margin: "0 0 14px", fontSize: 13, color: "#94a3b8" }}>{t.noUpcoming}</p><button onClick={() => setShowAppt(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#1d4ed8,#0284c7)", color: "#fff", fontSize: 12, fontWeight: 700 }}><Plus size={13} />{t.bookApptShort}</button></div>
                    : upcomingAppts.slice(0, 3).map((a, i) => {
                        const sc = APPT_CFG[a.status] || APPT_CFG.Scheduled;
                        return (
                            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < Math.min(upcomingAppts.length, 3) - 1 ? "1px solid #f8fafc" : "none" }}>
                                <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(37,99,235,.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                    <span style={{ fontSize: 15, fontWeight: 800, color: "#2563eb", lineHeight: 1 }}>{new Date(a.date + "T00:00:00").getDate()}</span>
                                    <span style={{ fontSize: 9, color: "#2563eb", fontWeight: 600 }}>{new Date(a.date + "T00:00:00").toLocaleString("en-PH", { month: "short" }).toUpperCase()}</span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{a.type}</p><p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{a.doctor} · {fmt12(a.time)}</p></div>
                                <Badge label={a.status} color={sc.color} bg={sc.bg} />
                            </div>
                        );
                    })}
            </Card>
            {(totalOwed > 0 || rxPending > 0 || labPending > 0) && (
                <Card title={t.reminders} accent="#d97706">
                    {totalOwed > 0 && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 11, background: "rgba(217,119,6,.07)", border: "1px solid rgba(217,119,6,.2)", marginBottom: 8 }}><AlertCircle size={15} color="#d97706" /><p style={{ margin: 0, fontSize: 12, color: "#92400e" }}>{t.reminderBalance(fmtPeso(totalOwed))}</p></div>}
                    {rxPending > 0 && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 11, background: "rgba(16,185,129,.07)", border: "1px solid rgba(16,185,129,.2)", marginBottom: 8 }}><Pill size={15} color="#059669" /><p style={{ margin: 0, fontSize: 12, color: "#065f46" }}><strong>{rxPending}</strong> {t.reminderRx(rxPending)}</p></div>}
                    {labPending > 0 && <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 11, background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.2)" }}><TestTube size={15} color="#6366f1" /><p style={{ margin: 0, fontSize: 12, color: "#3730a3" }}><strong>{labPending}</strong> {t.reminderLab(labPending)}</p></div>}
                </Card>
            )}
        </div>
    );

    const Appointments_ = () => (
        <div>
            {pendingApproval.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <div style={{ background: "#fff", border: "1.5px solid rgba(249,115,22,.3)", borderRadius: 18, overflow: "hidden" }}>
                        <div style={{ padding: "13px 20px", background: "linear-gradient(135deg,rgba(249,115,22,.08),rgba(251,191,36,.05))", borderBottom: "1px solid rgba(249,115,22,.2)", display: "flex", alignItems: "center", gap: 8 }}>
                            <Clock size={15} color="#f97316" />
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#c2410c", flex: 1 }}>Awaiting Approval ({pendingApproval.length})</span>
                            <span style={{ fontSize: 11, color: "#9a3412" }}>Clinic will review these requests</span>
                        </div>
                        <div style={{ padding: "12px 20px" }}>
                            {pendingApproval.map((a, i) => (
                                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < pendingApproval.length - 1 ? "1px solid #fef3c7" : "none" }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(249,115,22,.1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: "#f97316", lineHeight: 1 }}>{new Date(a.date + "T00:00:00").getDate()}</span>
                                        <span style={{ fontSize: 9, color: "#f97316", fontWeight: 600 }}>{new Date(a.date + "T00:00:00").toLocaleString("en-PH", { month: "short" }).toUpperCase()}</span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{a.type}</p><p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{a.doctor} · {fmt12(a.time)} · {fmtDate(a.date)}</p></div>
                                    <Badge label="Pending Approval" color="#f97316" bg="rgba(249,115,22,.12)" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            <Card title={`All Appointments (${appointments.length})`} accent="#2563eb" action={<BookBtn small />}>
                {appointments.length === 0
                    ? <div style={{ textAlign: "center", padding: "28px 0" }}><Calendar size={28} style={{ margin: "0 auto 10px", display: "block", opacity: .25 }} /><p style={{ margin: "0 0 14px", fontSize: 13, color: "#94a3b8" }}>{t.noAppts}</p><button onClick={() => setShowAppt(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#1d4ed8,#0284c7)", color: "#fff", fontSize: 12, fontWeight: 700 }}><Plus size={13} />{t.bookApptShort}</button></div>
                    : appointments.map((a, i) => {
                        const sc = APPT_CFG[a.status] || APPT_CFG.Scheduled;
                        const isToday = a.date === today;
                        const isPending = a.status === "Pending Approval";
                        return (
                            <div key={a.id} style={{ padding: "14px 0", borderBottom: i < appointments.length - 1 ? "1px solid #f8fafc" : "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: isPending ? "rgba(249,115,22,.1)" : isToday ? "#dbeafe" : "#f1f5f9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <span style={{ fontSize: 15, fontWeight: 800, color: isPending ? "#f97316" : isToday ? "#2563eb" : "#475569", lineHeight: 1 }}>{new Date(a.date + "T00:00:00").getDate()}</span>
                                        <span style={{ fontSize: 9, color: isPending ? "#f97316" : isToday ? "#2563eb" : "#94a3b8", fontWeight: 600 }}>{new Date(a.date + "T00:00:00").toLocaleString("en-PH", { month: "short" }).toUpperCase()}</span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{a.type}</p>
                                            {isToday && <span style={{ fontSize: 9, fontWeight: 800, background: "#dbeafe", color: "#1d4ed8", padding: "1px 6px", borderRadius: 4 }}>{t.today}</span>}
                                        </div>
                                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{a.doctor} · {fmt12(a.time)}</p>
                                    </div>
                                    <Badge label={a.status} color={sc.color} bg={sc.bg} />
                                </div>
                                <div style={{ marginTop: 10, marginLeft: 56, padding: "10px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #f1f5f9" }}>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                                        {[["📅 Date", fmtDate(a.date)], ["🕐 Time", fmt12(a.time)], ["🏥 Doctor", a.doctor || "—"], ["📋 Type", a.type || "—"]].map(([l, v]) => (
                                            <div key={l}><p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#94a3b8", letterSpacing: ".5px" }}>{l}</p><p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{v}</p></div>
                                        ))}
                                    </div>
                                    {a.reason && <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9" }}><p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: "#94a3b8" }}>💬 Reason</p><p style={{ margin: "3px 0 0", fontSize: 12, color: "#475569", fontStyle: "italic" }}>{a.reason}</p></div>}
                                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: sc.color, flexShrink: 0 }} />
                                        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: sc.color }}>
                                            {a.status === "Pending Approval" ? "⏳ Awaiting clinic approval — you'll be notified via email" : a.status === "Confirmed" ? "✅ Confirmed by clinic — you're all set!" : a.status === "Scheduled" ? "📋 Scheduled — waiting for your visit" : a.status === "In Progress" ? "🔄 Currently in progress" : a.status === "Done" ? "✔️ Completed" : a.status === "Cancelled" ? "❌ This appointment was cancelled" : a.status === "No Show" ? "⚠️ Marked as no show" : a.status}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </Card>
        </div>
    );

    const Records_ = () => (
        <Card title={t.recordsTitle(records.length)} accent="#059669">
            {records.length === 0 ? <Empty icon={FileText} text={t.noRecords} /> : records.map((r, i) => (
                <div key={r.id}>
                    <div onClick={() => setExpandedRec(expandedRec === r.id ? null : r.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: "1px solid #f8fafc", cursor: "pointer" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.chiefComplaint || t.noComplaint}</p><span style={{ padding: "2px 7px", borderRadius: 6, fontSize: 10, fontWeight: 600, background: "rgba(37,99,235,.08)", color: "#1d4ed8", flexShrink: 0 }}>{r.type}</span></div>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{r.doctor || "—"} · {fmtDate(r.date)}</p>
                        </div>
                        <ChevronRight size={14} color="#94a3b8" style={{ flexShrink: 0, transform: expandedRec === r.id ? "rotate(90deg)" : "rotate(0)", transition: "transform .2s" }} />
                    </div>
                    {expandedRec === r.id && (
                        <div style={{ padding: "12px 0 16px", borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                                {r.diagnosis && <div><p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8" }}>{t.diagnosis}</p><p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.diagnosis}</p></div>}
                                {r.treatment && <div><p style={{ margin: "0 0 2px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8" }}>{t.treatment}</p><p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>{r.treatment}</p></div>}
                            </div>
                            {r.notes && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{r.notes}</p>}
                        </div>
                    )}
                </div>
            ))}
        </Card>
    );

    const Prescriptions_ = () => (
        <Card title={t.rxTitle(prescriptions.length)} accent="#ec4899">
            {prescriptions.length === 0 ? <Empty icon={Pill} text={t.noRx} /> : prescriptions.map((rx, i) => {
                const sc = { Dispensed: { c: "#34d399", b: "rgba(52,211,153,.1)" }, Cancelled: { c: "#f87171", b: "rgba(248,113,113,.1)" }, Pending: { c: "#f59e0b", b: "rgba(245,158,11,.1)" } }[rx.status] || { c: "#94a3b8", b: "rgba(148,163,184,.1)" };
                return (
                    <div key={rx.id} style={{ padding: "12px 0", borderBottom: i < prescriptions.length - 1 ? "1px solid #f8fafc" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <div><p style={{ margin: 0, fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>{rx.rxId}</p><p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{rx.doctor || "—"} · {fmtDate(rx.date)}</p></div>
                            <Badge label={rx.status} color={sc.c} bg={sc.b} />
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {(rx.medicines || []).map((m, j) => <div key={j} style={{ padding: "5px 10px", borderRadius: 8, background: "#f5f3ff", border: "1px solid #ede9fe" }}><p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#5b21b6" }}>{m.name}</p><p style={{ margin: 0, fontSize: 10, color: "#7c3aed" }}>{m.qty} {m.unit} · {m.frequency} · {m.days}d</p></div>)}
                        </div>
                    </div>
                );
            })}
        </Card>
    );

    const Lab_ = () => (
        <Card title={t.labTitle(labRequests.length)} accent="#7c3aed">
            {labRequests.length === 0 ? <Empty icon={TestTube} text={t.noLab} /> : labRequests.map((l, i) => {
                const sc = { Pending: { c: "#f59e0b", b: "rgba(245,158,11,.1)" }, Processing: { c: "#60a5fa", b: "rgba(96,165,250,.1)" }, Completed: { c: "#34d399", b: "rgba(52,211,153,.1)" }, Cancelled: { c: "#f87171", b: "rgba(248,113,113,.1)" } }[l.status] || { c: "#94a3b8", b: "rgba(148,163,184,.1)" };
                return (
                    <div key={l.id} style={{ padding: "12px 0", borderBottom: i < labRequests.length - 1 ? "1px solid #f8fafc" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                            <div><p style={{ margin: 0, fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>{l.labId}</p><p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{l.doctor || "—"} · {fmtDate(l.date)}</p></div>
                            <Badge label={l.status} color={sc.c} bg={sc.b} />
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{(l.tests || []).map((test, j) => <span key={j} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, background: "rgba(99,102,241,.07)", color: "#4338ca", border: "1px solid rgba(99,102,241,.15)" }}>{test}</span>)}</div>
                        {l.results && l.status === "Completed" && <div style={{ marginTop: 8, padding: "9px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}><p style={{ margin: "0 0 3px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>{t.results}</p><p style={{ margin: 0, fontSize: 12, color: "#065f46", lineHeight: 1.6 }}>{l.results}</p></div>}
                    </div>
                );
            })}
        </Card>
    );

    const Billing_ = () => (
        <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                {[
                    { label: t.totalBillsStat, value: bills.length, color: "#2563eb", bg: "#eff6ff" },
                    { label: t.balanceDueStat, value: fmtPeso(totalOwed), color: "#d97706", bg: "#fffbeb", isText: true },
                    { label: t.paidBillsStat, value: bills.filter(b => b.status === "Paid").length, color: "#059669", bg: "#f0fdf4" },
                ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}20`, borderRadius: 13, padding: "13px 15px", textAlign: "center" }}>
                        <p style={{ margin: "0 0 3px", fontSize: s.isText ? 14 : 22, fontWeight: 800, color: s.color }}>{s.value}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>{s.label}</p>
                    </div>
                ))}
            </div>
            <Card title={t.billingTitle(bills.length)} accent="#d97706">
                {bills.length === 0 ? <Empty icon={CreditCard} text={t.noBills} /> : bills.map((b, i) => {
                    const sc = { Paid: { c: "#34d399", b: "rgba(52,211,153,.1)" }, Unpaid: { c: "#f59e0b", b: "rgba(245,158,11,.1)" }, Partial: { c: "#60a5fa", b: "rgba(96,165,250,.1)" }, Cancelled: { c: "#f87171", b: "rgba(248,113,113,.1)" } }[b.status] || { c: "#94a3b8", b: "rgba(148,163,184,.1)" };
                    const bal = Math.max(0, (+b.total || 0) - (+b.amountPaid || 0));
                    const canPay = (b.status === "Unpaid" || b.status === "Partial") && bal > 0;
                    return (
                        <div key={b.id} style={{ padding: "12px 0", borderBottom: i < bills.length - 1 ? "1px solid #f8fafc" : "none" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: 11, fontFamily: "monospace", color: "#94a3b8" }}>{b.billId}</p>
                                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#64748b" }}>{b.doctor || "—"} · {fmtDate(b.date)}</p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <Badge label={b.status} color={sc.c} bg={sc.b} />
                                    {canPay && (
                                        <button onClick={() => setPayingBill(b)}
                                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#d97706,#f59e0b)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0, boxShadow: "0 3px 10px rgba(217,119,6,.3)" }}>
                                            <CreditCard size={11} /> {t.payBtn}
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
                                <span style={{ color: "#64748b" }}>{t.totalLabel}: <strong style={{ color: "#0f172a" }}>{fmtPeso(b.total || 0)}</strong></span>
                                <span style={{ color: "#64748b" }}>{t.paidLabel}: <strong style={{ color: "#22c55e" }}>{fmtPeso(b.amountPaid || 0)}</strong></span>
                                {bal > 0 && <span style={{ color: "#64748b" }}>{t.balanceLabel}: <strong style={{ color: "#f59e0b" }}>{fmtPeso(bal)}</strong></span>}
                                {b.lastPaymentMethod && <span style={{ color: "#64748b" }}>{t.lastLabel}: <strong style={{ color: "#0f172a" }}>{b.lastPaymentMethod}</strong></span>}
                                {b.lastReferenceNumber && <span style={{ color: "#64748b" }}>Ref: <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>{b.lastReferenceNumber}</strong></span>}
                            </div>
                        </div>
                    );
                })}
            </Card>
            {payingBill && (
                <PayBillModal
                    bill={payingBill}
                    onClose={() => setPayingBill(null)}
                    onSuccess={({ amount, method, refNum, newStatus }) => {
                        setPayingBill(null);
                        showToast(
                            t.payModalTitle || "Payment Recorded!",
                            `${fmtPeso(amount)} via ${method}${refNum ? ` · Ref: ${refNum}` : ""} — ${newStatus}`
                        );
                    }}
                />
            )}
        </div>
    );

    const Profile_ = () => {
        const { patient: ctxPatient } = usePatient();
        const p = ctxPatient || patient;
        const pFullName = `${p.firstName} ${p.lastName}`.trim();
        const pInitials = (p.firstName?.[0] || "") + (p.lastName?.[0] || "");
        const InfoRow = ({ icon: Icon, label, value, color = "#2563eb" }) => (
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={17} color={color} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".7px", color: "#94a3b8" }}>{label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: "#0f172a", wordBreak: "break-word" }}>{value || "—"}</p>
                </div>
            </div>
        );
        return (
            <div style={{ maxWidth: 680, margin: "0 auto" }}>
                <div style={{ background: "linear-gradient(135deg,#1e3a8a,#1d4ed8,#0284c7)", borderRadius: 24, padding: "32px 24px 72px", position: "relative", overflow: "hidden" }}>
                    {[["-20%", "25%", 280, .06], ["65%", "-15%", 220, .05], ["50%", "70%", 180, .07]].map(([top, left, sz, op], i) => <div key={i} style={{ position: "absolute", top, left, width: sz, height: sz, borderRadius: "50%", background: `rgba(255,255,255,${op})`, pointerEvents: "none" }} />)}
                    <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => setShowEditProfile(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "2px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}><Edit3 size={13} /> Edit Profile</button>
                    </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -56, marginBottom: 20, position: "relative", zIndex: 5 }}>
                    <div style={{ width: 112, height: 112, borderRadius: "50%", border: "5px solid #fff", boxShadow: "0 12px 40px rgba(0,0,0,0.2)", overflow: "hidden", background: "linear-gradient(135deg,#1d4ed8,#0284c7)" }}>
                        {p.avatarUrl ? <img src={p.avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800, color: "#fff" }}>{pInitials}</div>}
                    </div>
                    <button onClick={() => setShowEditProfile(true)} style={{ position: "relative", marginTop: -18, marginRight: -70, width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#1d4ed8,#0284c7)", border: "3px solid #fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(37,99,235,.4)" }}><Camera size={14} color="#fff" /></button>
                    <h2 style={{ margin: "14px 0 4px", fontSize: 22, fontWeight: 800, color: "#0f172a", textAlign: "center" }}>{pFullName}</h2>
                    <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b", fontFamily: "monospace" }}>{p.patientId}</p>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 14px", borderRadius: 20, background: p.status === "Active" ? "rgba(34,197,94,.1)" : "rgba(248,113,113,.1)", fontSize: 12, fontWeight: 600, color: p.status === "Active" ? "#22c55e" : "#f87171", border: `1px solid ${p.status === "Active" ? "rgba(34,197,94,.2)" : "rgba(248,113,113,.2)"}` }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.status === "Active" ? "#22c55e" : "#f87171" }} />{p.status || "Active"}
                    </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
                    {[{ label: "Appointments", value: appointments.length, color: "#2563eb", bg: "#eff6ff" }, { label: "Prescriptions", value: prescriptions.length, color: "#ec4899", bg: "#fdf2f8" }, { label: "Lab Tests", value: labRequests.length, color: "#7c3aed", bg: "#f5f3ff" }].map(s => (
                        <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}25`, borderRadius: 16, padding: "16px 14px", textAlign: "center" }}><p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</p><p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b", fontWeight: 500 }}>{s.label}</p></div>
                    ))}
                </div>
                {[{ title: "Personal Information", accent: "#2563eb", rows: [{ icon: Calendar, label: "Age", value: p.age ? `${p.age} years old` : null, color: "#2563eb" }, { icon: User, label: "Gender", value: p.gender, color: "#7c3aed" }, { icon: Droplets, label: "Blood Type", value: p.bloodType, color: "#ef4444" }, { icon: Activity, label: "Allergies", value: p.allergies, color: "#f59e0b" }] }, { title: "Contact", accent: "#059669", rows: [{ icon: Phone, label: "Phone", value: p.contact, color: "#059669" }, { icon: Mail, label: "Email", value: p.email, color: "#2563eb" }, { icon: MapPin, label: "Address", value: p.address, color: "#d97706" }] }, { title: "Account", accent: "#94a3b8", rows: [{ icon: Calendar, label: "Registered", value: fmtTs(p.createdAt), color: "#64748b" }, { icon: Calendar, label: "Last Updated", value: fmtTs(p.updatedAt), color: "#64748b" }] }].map(section => (
                    <div key={section.title} style={{ background: "#fff", border: "1px solid #f1f5f9", borderRadius: 20, overflow: "hidden", marginBottom: 12 }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 4, height: 18, borderRadius: 2, background: section.accent }} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{section.title}</span>
                        </div>
                        <div style={{ padding: "0 20px" }}>{section.rows.map(r => <InfoRow key={r.label} icon={r.icon} label={r.label} value={r.value} color={r.color} />)}</div>
                    </div>
                ))}
            </div>
        );
    };

    const { isDark } = usePatient();
    const D = isDark;
    const NAV_LABELS = { home: t.nav.home, appointments: t.nav.appointments, records: t.nav.records, prescriptions: t.nav.prescriptions, lab: t.nav.lab, billing: t.nav.billing, profile: t.nav.profile };
    const pages = { home: <Home_ />, appointments: <Appointments_ />, records: <Records_ />, prescriptions: <Prescriptions_ />, lab: <Lab_ />, billing: <Billing_ />, profile: <Profile_ /> };

    return (
        <>
            {showAppt && <CreateAppointmentModal patient={patient} doctors={doctors} onClose={() => setShowAppt(false)} onSuccess={handleApptSuccess} />}
            {toast && <SuccessToast title={toast.title} msg={toast.msg} onClose={() => setToast(null)} />}
            {showEditProfile && <EditProfileModal onClose={() => setShowEditProfile(false)} />}
            <div style={{ minHeight: "100vh", background: D ? "#080b12" : "#f8fafc", display: "flex", fontFamily: "'Nunito',system-ui,sans-serif" }}>
                <Sidebar page={page} setPage={setPage} patient={patient} onLogout={handleLogout} onBook={() => setShowAppt(true)} collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <PatientHeader page={page} navLabels={NAV_LABELS} onMobileOpen={() => setMobileOpen(true)} onLogout={handleLogout} onOpenProfile={() => setShowEditProfile(true)} onOpenSettings={() => setPage("profile")} pendingCount={pendingApproval.length} />
                    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                        {loading
                            ? <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 14 }}>
                                <div style={{ width: 34, height: 34, borderRadius: "50%", border: `3px solid #2563eb`, borderTopColor: "transparent", animation: "spin .8s linear infinite" }} />
                                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t.loadingData}</p>
                            </div>
                            : pages[page]}
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes spin{to{transform:rotate(360deg)}}
                @keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}
                @keyframes modalIn{from{opacity:0;transform:scale(.94) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
                @keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
                @media(max-width:768px){.desktop-sidebar{display:none!important;}.hamburger-btn{display:flex!important;}.hide-sm{display:none!important;}}
            `}</style>
        </>
    );
}
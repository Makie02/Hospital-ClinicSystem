// src/components/Sidebar.jsx
import React, { useState, useEffect } from "react";
import {
    LayoutDashboard, Users, Calendar, FileText, Pill,
    TestTube, CreditCard, Settings, ChevronLeft,
    LogOut, Stethoscope, Bed, Package, ShieldCheck,
    Wrench, AlertTriangle, X,
} from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "../context/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import logomed from "../Image/logomed.png";
import logo1 from "../Image/logo1.png";

const navItems = [
    { icon: LayoutDashboard, label: "Dashboard",            id: "dashboard"    },
    { icon: Users,           label: "Patients",             id: "patients"     },
    { icon: Calendar,        label: "Appointments",         id: "appointments", pendingBadge: true },
    { icon: Stethoscope,     label: "Doctors",              id: "doctors"      },
    { icon: ShieldCheck,     label: "User Management",      id: "users"        },
    { icon: FileText,        label: "Medical Records",      id: "records"      },
    { icon: Pill,            label: "Pharmacy",             id: "pharmacy"     },
    { icon: TestTube,        label: "Laboratory",           id: "lab"          },
    { icon: CreditCard,      label: "Billing",              id: "billing"      },
    { icon: Bed,             label: "I.P.D. Center",        id: "ipd"          },
    { icon: Package,         label: "Inventory",            id: "inventory"    },
];

// ─── Maintenance Confirmation Modal ───────────────────────────────────────────
const MaintenanceModal = ({ isDark: D, onConfirm, onCancel }) => {
    const cardBg  = D ? "#0d1117" : "#ffffff";
    const textPri = D ? "#f1f5f9" : "#111827";
    const textSec = D ? "#6b7280" : "#6b7280";
    const borderC = D ? "rgba(255,255,255,0.08)" : "#e5e7eb";

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)",
            animation: "fadeIn .2s ease",
        }}>
            <div style={{
                background: cardBg,
                border: `1px solid ${borderC}`,
                borderRadius: 24,
                padding: "28px 28px 24px",
                width: "100%", maxWidth: 400,
                boxShadow: D
                    ? "0 32px 64px rgba(0,0,0,0.7)"
                    : "0 24px 60px rgba(0,0,0,0.15)",
                animation: "modalIn .25s cubic-bezier(0.34,1.56,0.64,1)",
                position: "relative",
            }}>
                {/* Close button */}
                <button onClick={onCancel} style={{
                    position: "absolute", top: 16, right: 16,
                    background: D ? "rgba(255,255,255,0.06)" : "#f3f4f6",
                    border: "none", borderRadius: 8,
                    width: 28, height: 28, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: textSec,
                }}>
                    <X size={14} />
                </button>

                {/* Icon */}
                <div style={{
                    width: 64, height: 64, borderRadius: 20,
                    background: "linear-gradient(135deg,rgba(249,115,22,0.15),rgba(239,68,68,0.15))",
                    border: "2px solid rgba(249,115,22,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 18px",
                }}>
                    <Wrench size={28} color="#f97316" />
                </div>

                {/* Text */}
                <h2 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 800, color: textPri, textAlign: "center" }}>
                    Maintenance Settings
                </h2>
                <p style={{ margin: "0 0 6px", fontSize: 13, color: textSec, textAlign: "center", lineHeight: 1.6 }}>
                    Are you sure you want to access<br />
                    <strong style={{ color: D ? "#f97316" : "#ea580c" }}>Maintenance Settings</strong>?
                </p>

                {/* Access badge */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    padding: "8px 16px", borderRadius: 10, margin: "14px 0 20px",
                    background: "rgba(249,115,22,0.08)",
                    border: "1.5px solid rgba(249,115,22,0.2)",
                }}>
                    <ShieldCheck size={13} color="#f97316" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f97316" }}>
                        Superadmin Only — Access All Modules
                    </span>
                </div>

                {/* Info list */}
                <div style={{
                    padding: "12px 14px", borderRadius: 12, marginBottom: 20,
                    background: D ? "rgba(255,255,255,0.03)" : "#f8fafc",
                    border: `1px dashed ${D ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
                }}>
                    {[
                        "Toggle any module on or off",
                        "Change system version number",
                        "Changes affect all users immediately",
                    ].map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: textSec }}>{item}</span>
                        </div>
                    ))}
                </div>

                {/* Warning */}
                <div style={{
                    display: "flex", gap: 9, alignItems: "flex-start",
                    padding: "10px 12px", borderRadius: 10, marginBottom: 20,
                    background: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.18)",
                }}>
                    <AlertTriangle size={13} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 11, color: D ? "#fca5a5" : "#b91c1c", lineHeight: 1.6 }}>
                        This area contains critical system settings. Proceed with caution.
                    </span>
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={onCancel} style={{
                        flex: 1, padding: "12px 0", borderRadius: 12,
                        border: `1.5px solid ${D ? "rgba(255,255,255,0.1)" : "#e5e7eb"}`,
                        background: D ? "rgba(255,255,255,0.04)" : "#f9fafb",
                        color: textSec, fontSize: 13, fontWeight: 700, cursor: "pointer",
                        transition: "all 0.2s",
                    }}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} style={{
                        flex: 2, padding: "12px 0", borderRadius: 12,
                        border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg,#f97316,#ef4444)",
                        color: "#fff", fontSize: 13, fontWeight: 800,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        boxShadow: "0 6px 20px rgba(249,115,22,0.35)",
                        transition: "all 0.2s",
                    }}>
                        <Wrench size={14} />
                        Yes, Open Maintenance
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
                @keyframes modalIn {
                    from { opacity:0; transform: scale(0.88) translateY(10px) }
                    to   { opacity:1; transform: scale(1)   translateY(0) }
                }
            `}</style>
        </div>
    );
};

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ active, onNavigate }) {
    const { user, profile, logout } = useAuth();
    const { isDark } = useTheme();
    const D = isDark;
    const [collapsed, setCollapsed] = useState(false);

    // ✅ Only show maintenance toggle if superadmin
    const isSuperadmin = profile?.role === "superadmin" || user?.isSuperadmin;

    // ✅ Confirmation modal state
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

    // ✅ Real-time pending appointments count
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const unsub = onValue(ref(db, "appointments"), (snap) => {
            const data = snap.val();
            if (!data) { setPendingCount(0); return; }
            const count = Object.values(data).filter(a => a.status === "Pending Approval").length;
            setPendingCount(count);
        });
        return () => unsub();
    }, []);

    const handleMaintenanceClick = () => {
        setShowMaintenanceModal(true);
    };

    const handleMaintenanceConfirm = () => {
        setShowMaintenanceModal(false);
        onNavigate("maintenance");
    };

    return (
        <>
            {/* ── Maintenance Confirmation Modal ── */}
            {showMaintenanceModal && (
                <MaintenanceModal
                    isDark={D}
                    onConfirm={handleMaintenanceConfirm}
                    onCancel={() => setShowMaintenanceModal(false)}
                />
            )}

            <aside
                className="relative flex flex-col h-screen transition-all duration-300 ease-in-out"
                style={{
                    width: collapsed ? "72px" : "240px",
                    background: D ? "#0f1117" : "#ffffff",
                    borderRight: D ? "1px solid #1f2937" : "1px solid #e5e7eb",
                    flexShrink: 0,
                    overflow: "visible",
                    zIndex: 20,
                }}
            >
                {/* Logo */}
                <div className="flex items-center justify-center px-3 py-4 mb-2">
                    {collapsed ? (
                        <div className="flex items-center justify-center" style={{ width: 40, height: 40 }}>
                            <img src={logo1} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center justify-center" style={{ background: "#ffffff", borderRadius: 14, padding: "10px 1px" }}>
                            <img src={logomed} alt="MediCore Logo" style={{ height: "82px", objectFit: "contain" }} />
                            <p style={{ marginTop: "0px", fontSize: "12px", fontWeight: "500", color: "#555" }}>
                                Clinic System Management
                            </p>
                        </div>
                    )}
                </div>

                {/* Collapse toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    style={{
                        position: "absolute", top: 28, right: -14,
                        width: 28, height: 28, borderRadius: "50%",
                        background: D ? "#0f1117" : "#ffffff",
                        border: D ? "1.5px solid #374151" : "1.5px solid #e2e8f0",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 30, transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(37,99,235,0.3)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = D ? "#374151" : "#e2e8f0"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)"; }}
                >
                    <ChevronLeft
                        size={13}
                        style={{
                            color: D ? "#9ca3af" : "#6b7280",
                            transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.3s",
                        }}
                    />
                </button>

                {/* Nav label */}
                {!collapsed && (
                    <p className={`px-4 text-[10px] font-medium uppercase tracking-widest mb-2 ${D ? "text-gray-600" : "text-gray-400"}`}>
                        Main Menu
                    </p>
                )}

                {/* Nav Items */}
                <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
                    {navItems.map(({ icon: Icon, label, id, pendingBadge }) => {
                        const isActive = active === id;
                        const showBadge = pendingBadge && pendingCount > 0;
                        return (
                            <button
                                key={id}
                                onClick={() => onNavigate(id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                                    isActive
                                        ? D ? "bg-blue-600/15 text-blue-400" : "bg-blue-50 text-blue-600"
                                        : D ? "text-gray-500 hover:text-gray-200 hover:bg-white/5" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                                }`}
                                title={collapsed ? label : undefined}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-blue-500" />
                                )}
                                <div style={{ position: "relative", flexShrink: 0 }}>
                                    <Icon
                                        className={`flex-shrink-0 transition-colors ${
                                            isActive
                                                ? "text-blue-500"
                                                : D ? "text-gray-600 group-hover:text-gray-300" : "text-gray-400 group-hover:text-gray-600"
                                        }`}
                                        size={18}
                                    />
                                    {showBadge && (
                                        <span style={{
                                            position: "absolute", top: -4, right: -4,
                                            minWidth: 14, height: 14, borderRadius: "50%",
                                            background: "linear-gradient(135deg,#f97316,#f59e0b)",
                                            fontSize: 8, fontWeight: 800, color: "#fff",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            border: `2px solid ${D ? "#0f1117" : "#ffffff"}`,
                                            padding: "0 2px", animation: "badgePop .3s ease", boxSizing: "border-box",
                                        }}>
                                            {pendingCount > 9 ? "9+" : pendingCount}
                                        </span>
                                    )}
                                </div>
                                {!collapsed && (
                                    <span className="text-sm font-medium flex-1 text-left truncate">{label}</span>
                                )}
                                {!collapsed && showBadge && (
                                    <span style={{
                                        fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 20,
                                        background: "linear-gradient(135deg,#f97316,#f59e0b)",
                                        color: "#fff", flexShrink: 0, animation: "badgePop .3s ease",
                                    }}>
                                        {pendingCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* ── Bottom section ── */}
                <div className={`px-2 pb-3 space-y-0.5 border-t pt-2 ${D ? "border-gray-800" : "border-gray-100"}`}>

                    {/* ✅ Maintenance button — SUPERADMIN ONLY */}
                    {isSuperadmin && (
                        <button
                            onClick={handleMaintenanceClick}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative ${
                                active === "maintenance"
                                    ? D ? "bg-orange-600/15 text-orange-400" : "bg-orange-50 text-orange-600"
                                    : D ? "text-gray-500 hover:text-gray-200 hover:bg-white/5" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                            }`}
                            title={collapsed ? "Maintenance Settings" : undefined}
                        >
                            {active === "maintenance" && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-orange-500" />
                            )}
                            <div style={{ position: "relative", flexShrink: 0 }}>
                                <Wrench
                                    size={18}
                                    className={`flex-shrink-0 transition-colors ${
                                        active === "maintenance"
                                            ? "text-orange-500"
                                            : D ? "text-gray-600 group-hover:text-gray-300" : "text-gray-400 group-hover:text-gray-600"
                                    }`}
                                />
                                {/* ✅ Small shield badge to indicate superadmin-only */}
                                <span style={{
                                    position: "absolute", top: -4, right: -5,
                                    width: 12, height: 12, borderRadius: "50%",
                                    background: "linear-gradient(135deg,#f97316,#ef4444)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    border: `1.5px solid ${D ? "#0f1117" : "#ffffff"}`,
                                    boxSizing: "border-box",
                                }}>
                                    <ShieldCheck size={6} color="#fff" />
                                </span>
                            </div>
                            {!collapsed && (
                                <>
                                    <span className="text-sm font-medium flex-1 text-left">Maintenance</span>
                                    {/* Superadmin pill */}
                                    <span style={{
                                        fontSize: 8, fontWeight: 800,
                                        padding: "2px 5px", borderRadius: 6,
                                        background: "rgba(249,115,22,0.15)",
                                        color: "#f97316", border: "1px solid rgba(249,115,22,0.25)",
                                        flexShrink: 0, letterSpacing: "0.3px",
                                    }}>
                                        SA
                                    </span>
                                </>
                            )}
                        </button>
                    )}

                    {/* Settings */}
                    <button
                        onClick={() => onNavigate("settings")}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                            D ? "text-gray-500 hover:text-gray-200 hover:bg-white/5" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                        }`}
                        title={collapsed ? "Settings" : undefined}
                    >
                        <Settings size={18} className="flex-shrink-0" />
                        {!collapsed && <span className="text-sm font-medium">Settings</span>}
                    </button>

                    {/* Divider */}
                    <div className={`my-1 border-t ${D ? "border-gray-800" : "border-gray-100"}`} />

                    {/* User profile */}
                    <div>
                        {!collapsed ? (
                            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${D ? "bg-white/5" : "bg-gray-50"}`}>
                                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {user?.name?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-semibold truncate ${D ? "text-gray-200" : "text-gray-700"}`}>{user?.name}</p>
                                    <p className={`text-[10px] truncate ${D ? "text-gray-500" : "text-gray-400"}`}>{user?.role}</p>
                                </div>
                                <button onClick={logout} className={`transition-colors ${D ? "text-gray-600 hover:text-red-400" : "text-gray-300 hover:text-red-500"}`} title="Logout">
                                    <LogOut size={14} />
                                </button>
                            </div>
                        ) : (
                            <button onClick={logout} className={`w-full flex items-center justify-center py-2.5 transition-colors ${D ? "text-gray-600 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`} title="Logout">
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <style>{`
                    @keyframes badgePop {
                        from { transform: scale(0); opacity: 0; }
                        to   { transform: scale(1); opacity: 1; }
                    }
                `}</style>
            </aside>
        </>
    );
}
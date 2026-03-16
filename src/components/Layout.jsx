// src/components/Layout.jsx
import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Dashboard from "./Dashboard";
import SettingsPanel from "./SettingsPanel";
import Patients from "./Patients";
import Appointments from "./Appointments";
import Doctors from "./Doctors";
import UserManagement from "./Usermanagement";
import MedicalRecords from "./Medicalrecords";
import Pharmacy from "./Pharmacy";
import Laboratory from "./Laboratory";
import Billing from "./Billing";
import IPD from "./Ipd";
import Inventory from "./Inventory";
import MaintenanceSettings from "../Maintenance/Maintenancesettings";
import MaintenanceAll from "../Maintenance/Maintenancesettings";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { ShieldAlert, LogOut } from "lucide-react";

// ─── Key used to persist the active page across reloads ──────────────────────
const PAGE_KEY = "medicore_active_page";

// ─── Page Registry ────────────────────────────────────────────────────────────
const PAGE_REGISTRY = {
  dashboard:    { component: Dashboard,           label: "Dashboard"            },
  patients:     { component: Patients,            label: "Patients"             },
  appointments: { component: Appointments,        label: "Appointments"         },
  doctors:      { component: Doctors,             label: "Doctors"              },
  records:      { component: MedicalRecords,      label: "Medical Records"      },
  pharmacy:     { component: Pharmacy,            label: "Pharmacy"             },
  lab:          { component: Laboratory,          label: "Laboratory"           },
  billing:      { component: Billing,             label: "Billing"              },
  ipd:          { component: IPD,                 label: "I.P.D. Center"        },
  inventory:    { component: Inventory,           label: "Inventory & Stock"    },
  settings:     { component: null,                label: "Settings"             },
  users:        { component: UserManagement,      label: "User Management"      },
  maintenance:  { component: MaintenanceSettings, label: "Maintenance Settings" },
  maintenanceAll:  { component: MaintenanceAll, label: "MaintenanceAll" },


  
};

const VALID_PAGES = new Set(Object.keys(PAGE_REGISTRY));

// ─── Storage helpers ──────────────────────────────────────────────────────────
function readSavedPage() {
  try {
    const v = localStorage.getItem(PAGE_KEY);
    if (v && VALID_PAGES.has(v)) return v;
  } catch {}
  return null;
}
function savePage(pageId) {
  try { localStorage.setItem(PAGE_KEY, pageId); } catch {}
}

// ─── Determine the correct initial page synchronously ─────────────────────────
// Called once during useState initializer — no async, no flash.
function resolveInitialPage(profile) {
  const saved = readSavedPage();

  // No profile yet (edge case) — just use saved or dashboard
  if (!profile) return saved || "dashboard";

  const canAccess = (id) => {
    if (!id || !VALID_PAGES.has(id)) return false;
    if (profile.role === "superadmin") return true;
    return Array.isArray(profile.modules) && profile.modules.includes(id);
  };

  // Saved page is valid for this user → use it
  if (saved && canAccess(saved)) return saved;

  // Saved page exists but user can't access it → use their first allowed module
  const fallback = profile.modules?.[0] || "dashboard";
  savePage(fallback);
  return fallback;
}

// ─── Loading screen (only shown when AuthContext hasn't resolved yet) ─────────
function LoadingScreen() {
  const { isDark: D } = useTheme();
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: D ? "#080b12" : "#f8fafc", gap: 16,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid rgba(59,130,246,0.2)",
        borderTopColor: "#3b82f6",
        animation: "spin .8s linear infinite",
      }} />
      <p style={{ margin: 0, fontSize: 13, color: "#475569", fontFamily: "system-ui" }}>
        Loading…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Suspended wall ───────────────────────────────────────────────────────────
const SuspendedWall = ({ logout }) => {
  const { isDark: D } = useTheme();
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: D ? "#080b12" : "#f8fafc",
    }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 32 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: "rgba(239,68,68,0.1)", border: "2px solid rgba(239,68,68,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
        }}>
          <ShieldAlert size={36} style={{ color: "#f87171" }} />
        </div>
        <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 700, color: D ? "#f1f5f9" : "#0f172a" }}>
          Account Suspended
        </h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: D ? "#475569" : "#64748b", lineHeight: 1.7 }}>
          Your account has been suspended.<br />
          Please contact your system administrator for assistance.
        </p>
        <button onClick={logout} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "11px 24px", borderRadius: 14, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "white",
          fontSize: 14, fontWeight: 700,
        }}>
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  );
};

// ─── Placeholder ──────────────────────────────────────────────────────────────
const PlaceholderPage = ({ name }) => {
  const { isDark } = useTheme();
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
          <span className="text-2xl">🚧</span>
        </div>
        <h2 className={`text-xl font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>{name}</h2>
        <p className={`text-sm mt-2 ${isDark ? "text-gray-600" : "text-gray-400"}`}>Coming soon — page under construction</p>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Layout() {
  const { profile, loading, hasAccess, isSuspended, logout } = useAuth();
  const { isDark } = useTheme();

  // ✅ FIX 1: Resolve the correct initial page SYNCHRONOUSLY using profile
  // that was already loaded from localStorage in AuthContext.
  // No useEffect needed — this runs once and is always correct.
  const [activePage, setActivePage] = useState(() => resolveInitialPage(profile));

  // ✅ FIX 2: Re-validate only when profile changes AFTER initial render
  // (e.g. Firebase returns fresh data that differs from cached data)
  useEffect(() => {
    if (!profile) return;

    const canAccess = (id) => {
      if (!id || !VALID_PAGES.has(id)) return false;
      if (profile.role === "superadmin") return true;
      return Array.isArray(profile.modules) && profile.modules.includes(id);
    };

    if (!canAccess(activePage)) {
      const fallback = profile.modules?.[0] || "dashboard";
      setActivePage(fallback);
      savePage(fallback);
    }
  }, [profile?.uid, profile?.role]); // only re-run if user identity changes

  // ✅ Navigate — always persist
  const handleNavigate = (pageId) => {
    if (!VALID_PAGES.has(pageId)) return;
    setActivePage(pageId);
    savePage(pageId);
  };

  const handleGoToAppointments = () => handleNavigate("appointments");

  // ✅ FIX 3: Guard against null profile — show loader, not broken UI.
  // With AuthContext fix this should be near-instant (<1 frame) from cache,
  // but keep it as a safety net.
  if (loading || !profile) return <LoadingScreen />;

  // ✅ FIX 4: Guard isSuspended() — only call when profile is not null
  if (isSuspended()) return <SuspendedWall logout={logout} />;

  const renderPage = () => {
    const page = PAGE_REGISTRY[activePage];
    if (!page) return <PlaceholderPage name={activePage} />;
    if (page.component) {
      const C = page.component;
      return <C />;
    }
    return <PlaceholderPage name={page.label} />;
  };

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? "bg-gray-950" : "bg-gray-50"}`}>
      <Sidebar active={activePage} onNavigate={handleNavigate} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header
          activePage={activePage}
          onNavigateToAppointments={handleGoToAppointments}
        />
        <main className="flex-1 overflow-y-auto relative">
          {renderPage()}
        </main>
      </div>
      <SettingsPanel onNavigateToAppointments={handleGoToAppointments} />
    </div>
  );
}
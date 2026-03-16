// src/Maintenance/MaintenanceAll.jsx
// ─── SUPERADMIN ONLY — Full Maintenance Page (Tabs) ───────────────────────────
import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, push, update, remove, get, set } from "firebase/database";
import { db } from "../context/firebase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Wrench, ShieldCheck, Tag, Save, AlertTriangle, CheckCircle2,
  Package, Users, Calendar, FileText, Pill, TestTube,
  CreditCard, Bed, BarChart3, Stethoscope, FlaskConical,
  Zap, ToggleLeft, Plus, X, Edit2, Trash2, Search,
  MapPin, Truck, LayoutGrid, Layers, Clock, ChevronRight,
  AlertCircle, Building2, Receipt, Wallet, Landmark, QrCode,
  Settings2, Sliders, Megaphone, Bell, Eye, EyeOff, Globe, Users2,
} from "lucide-react";

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — BANK / E-WALLET ICONS & TYPES (from existing MaintenanceSettings)
// ══════════════════════════════════════════════════════════════════════════════
const GCashIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#007DFE"/>
    <circle cx="20" cy="20" r="10" fill="none" stroke="white" strokeWidth="2.5"/>
    <path d="M20 14v6h6" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M22 20h4v4h-4z" fill="#00C2FF"/>
  </svg>
);
const MayaIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#00A94F"/>
    <path d="M12 26L20 12L28 26H12Z" fill="white"/>
    <circle cx="20" cy="22" r="3.5" fill="#00A94F"/>
    <circle cx="20" cy="22" r="2" fill="white"/>
  </svg>
);
const BDOIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#CC0000"/>
    <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif">BDO</text>
  </svg>
);
const BPIIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#E30613"/>
    <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial,sans-serif">BPI</text>
  </svg>
);
const UnionBankIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#001F6B"/>
    <rect x="9" y="13" width="22" height="3.5" rx="1.5" fill="#FFD700"/>
    <rect x="9" y="18.5" width="22" height="3.5" rx="1.5" fill="white"/>
    <rect x="9" y="24" width="22" height="3.5" rx="1.5" fill="#FFD700"/>
  </svg>
);
const MetrobankIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#003087"/>
    <text x="50%" y="44%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial,sans-serif">METRO</text>
    <text x="50%" y="68%" dominantBaseline="middle" textAnchor="middle" fill="#FFD700" fontSize="9" fontWeight="bold" fontFamily="Arial,sans-serif">BANK</text>
  </svg>
);
const LandbankIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#006400"/>
    <path d="M20 9L30 23H10L20 9Z" fill="#FFD700"/>
    <rect x="15" y="23" width="10" height="8" rx="1" fill="white"/>
  </svg>
);
const RCBCIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#FFD700"/>
    <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="#003087" fontSize="12" fontWeight="bold" fontFamily="Arial,sans-serif">RCBC</text>
  </svg>
);
const SecurityBankIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#1A1A2E"/>
    <path d="M20 10L29 16.5V23C29 27.97 24.97 32 20 32C15.03 32 11 27.97 11 23V16.5L20 10Z" fill="#00C9A7" opacity="0.9"/>
    <path d="M16.5 22L19.5 25L24.5 18.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const OtherBankIcon = ({ size = 28 }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
    <rect width="40" height="40" rx="10" fill="#64748b"/>
    <rect x="8" y="20" width="24" height="12" rx="2" fill="white" opacity="0.9"/>
    <path d="M8 20L20 10L32 20H8Z" fill="white" opacity="0.6"/>
    <rect x="17" y="24" width="6" height="8" rx="1" fill="#64748b" opacity="0.5"/>
  </svg>
);

const BANK_TYPES = [
  { id:"gcash",        label:"GCash",         kind:"ewallet", Icon:GCashIcon,        bg:"#007DFE", fields:[{key:"number",label:"GCash Number",placeholder:"e.g. 0917-123-4567",required:true},{key:"name",label:"Account Name",placeholder:"e.g. Juan Dela Cruz",required:true},{key:"qr",label:"QR Code Image",type:"qr",required:false}] },
  { id:"maya",         label:"Maya",          kind:"ewallet", Icon:MayaIcon,         bg:"#00A94F", fields:[{key:"number",label:"Maya Number",placeholder:"e.g. 0918-987-6543",required:true},{key:"name",label:"Account Name",placeholder:"e.g. Juan Dela Cruz",required:true},{key:"qr",label:"QR Code Image",type:"qr",required:false}] },
  { id:"bdo",          label:"BDO",           kind:"bank",    Icon:BDOIcon,          bg:"#CC0000", fields:[{key:"account",label:"Account Number",placeholder:"e.g. 1234-5678-9012",required:true},{key:"name",label:"Account Name",placeholder:"e.g. MediCore Clinic",required:true},{key:"branch",label:"Branch",placeholder:"e.g. SM Cubao Branch",required:false}] },
  { id:"bpi",          label:"BPI",           kind:"bank",    Icon:BPIIcon,          bg:"#E30613", fields:[{key:"account",label:"Account Number",placeholder:"e.g. 1234-5678-90",required:true},{key:"name",label:"Account Name",placeholder:"e.g. MediCore Clinic",required:true},{key:"branch",label:"Branch",placeholder:"e.g. Katipunan Branch",required:false}] },
  { id:"unionbank",    label:"UnionBank",     kind:"bank",    Icon:UnionBankIcon,    bg:"#001F6B", fields:[{key:"account",label:"Account Number",placeholder:"e.g. 1234567890123456",required:true},{key:"name",label:"Account Name",placeholder:"e.g. MediCore Clinic",required:true},{key:"branch",label:"Branch",placeholder:"e.g. Online Banking",required:false}] },
  { id:"metrobank",    label:"Metrobank",     kind:"bank",    Icon:MetrobankIcon,    bg:"#003087", fields:[{key:"account",label:"Account Number",placeholder:"e.g. 123-4-56789012-3",required:true},{key:"name",label:"Account Name",placeholder:"e.g. MediCore Clinic",required:true},{key:"branch",label:"Branch",placeholder:"e.g. Quezon Ave Branch",required:false}] },
  { id:"landbank",     label:"Landbank",      kind:"bank",    Icon:LandbankIcon,     bg:"#006400", fields:[{key:"account",label:"Account Number",placeholder:"e.g. 1234-5678-90",required:true},{key:"name",label:"Account Name",placeholder:"e.g. MediCore Clinic",required:true},{key:"branch",label:"Branch",placeholder:"e.g. Main Branch",required:false}] },
  { id:"rcbc",         label:"RCBC",          kind:"bank",    Icon:RCBCIcon,         bg:"#D4A017", fields:[{key:"account",label:"Account Number",placeholder:"e.g. 1234567890",required:true},{key:"name",label:"Account Name",placeholder:"e.g. MediCore Clinic",required:true},{key:"branch",label:"Branch",placeholder:"e.g. Makati Branch",required:false}] },
  { id:"securitybank", label:"Security Bank", kind:"bank",    Icon:SecurityBankIcon, bg:"#00C9A7", fields:[{key:"account",label:"Account Number",placeholder:"e.g. 0123456789",required:true},{key:"name",label:"Account Name",placeholder:"e.g. MediCore Clinic",required:true},{key:"branch",label:"Branch",placeholder:"e.g. BGC Branch",required:false}] },
  { id:"other",        label:"Other",         kind:"other",   Icon:OtherBankIcon,    bg:"#64748b", fields:[{key:"bankname",label:"Bank / Wallet Name",placeholder:"e.g. Security Bank",required:true},{key:"account",label:"Account Number",placeholder:"e.g. 1234567890",required:true},{key:"name",label:"Account Name",placeholder:"e.g. MediCore Clinic",required:true},{key:"notes",label:"Notes",placeholder:"e.g. For online transfers only",required:false}] },
];

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — MODULE TOGGLE DATA (for Tab 1)
// ══════════════════════════════════════════════════════════════════════════════
const ALL_MODULES = [
  { id:"dashboard",    label:"Dashboard",      icon:BarChart3,   color:"#3b82f6" },
  { id:"patients",     label:"Patients",       icon:Users,       color:"#10b981" },
  { id:"appointments", label:"Appointments",   icon:Calendar,    color:"#f59e0b" },
  { id:"doctors",      label:"Doctors",        icon:Stethoscope, color:"#8b5cf6" },
  { id:"users",        label:"User Mgmt",      icon:ShieldCheck, color:"#ef4444" },
  { id:"records",      label:"Medical Records",icon:FileText,    color:"#06b6d4" },
  { id:"pharmacy",     label:"Pharmacy",       icon:Pill,        color:"#ec4899" },
  { id:"lab",          label:"Laboratory",     icon:FlaskConical,color:"#f97316" },
  { id:"billing",      label:"Billing",        icon:CreditCard,  color:"#14b8a6" },
  { id:"ipd",          label:"I.P.D. Center",  icon:Bed,         color:"#6366f1" },
  { id:"inventory",    label:"Inventory",      icon:Package,     color:"#84cc16" },
];

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — DROPDOWN SETTINGS MODULES (for Tab 2)
// ══════════════════════════════════════════════════════════════════════════════
const DROPDOWN_MODULES = [
  { id:"appointments", label:"Appointments", icon:Calendar, color:"#3b82f6", glow:"rgba(59,130,246,0.2)", gradient:["#3b82f6","#6366f1"], sections:[
    { key:"appt_types",    label:"Appointment Types",    icon:Tag,          description:"Types of appointments patients can book", dbPath:"settings/appointments/types",    placeholder:"e.g. General Check-up", colorHex:"#3b82f6" },
    { key:"appt_statuses", label:"Appointment Statuses", icon:CheckCircle2, description:"Workflow statuses for appointments",        dbPath:"settings/appointments/statuses", placeholder:"e.g. Scheduled",        colorHex:"#6366f1" },
    { key:"appt_rooms",    label:"Room / Clinic",        icon:MapPin,       description:"Available rooms and clinic locations",     dbPath:"settings/appointments/rooms",    placeholder:"e.g. Room 3, OPD 1",    colorHex:"#0ea5e9" },
  ]},
  { id:"inventory", label:"Inventory", icon:Package, color:"#f59e0b", glow:"rgba(245,158,11,0.2)", gradient:["#f59e0b","#f97316"], sections:[
    { key:"inv_categories", label:"Category",         icon:LayoutGrid, description:"Item categories for stock classification", dbPath:"settings/inventory/categories", placeholder:"e.g. Medical Supplies",    colorHex:"#f59e0b" },
    { key:"inv_brands",     label:"Brand",            icon:Tag,        description:"Brands of inventory items",               dbPath:"settings/inventory/brands",     placeholder:"e.g. Unilab",             colorHex:"#f97316" },
    { key:"inv_units",      label:"Unit",             icon:Layers,     description:"Units of measurement for stock",          dbPath:"settings/inventory/units",      placeholder:"e.g. pcs, box, ml",       colorHex:"#10b981" },
    { key:"inv_suppliers",  label:"Supplier",         icon:Truck,      description:"Vendor and supplier list",                dbPath:"settings/inventory/suppliers",  placeholder:"e.g. MedSource PH",       colorHex:"#8b5cf6" },
    { key:"inv_locations",  label:"Storage Location", icon:MapPin,     description:"Where items are physically stored",       dbPath:"settings/inventory/locations",  placeholder:"e.g. Cabinet A, Shelf 2", colorHex:"#ec4899" },
  ]},
  { id:"ipd", label:"IPD Center", icon:Bed, color:"#10b981", glow:"rgba(16,185,129,0.2)", gradient:["#10b981","#059669"], sections:[
    { key:"ipd_wards",           label:"Ward",           icon:Building2,    description:"Hospital wards for patient admission",    dbPath:"settings/ipd/wards",          placeholder:"e.g. General Ward",         colorHex:"#10b981" },
    { key:"ipd_beds",            label:"Bed Number",     icon:Bed,          description:"Available bed numbers per ward",          dbPath:"settings/ipd/beds",           placeholder:"e.g. Bed 101",              colorHex:"#059669" },
    { key:"ipd_rooms",           label:"Room",           icon:MapPin,       description:"Room identifiers in the IPD",             dbPath:"settings/ipd/rooms",          placeholder:"e.g. Room 201",             colorHex:"#0ea5e9" },
    { key:"ipd_admission_types", label:"Admission Type", icon:Tag,          description:"Classification of patient admissions",    dbPath:"settings/ipd/admissionTypes", placeholder:"e.g. Emergency, Elective",  colorHex:"#f97316" },
    { key:"ipd_statuses",        label:"Status",         icon:CheckCircle2, description:"Current status of IPD patients",          dbPath:"settings/ipd/statuses",       placeholder:"e.g. Admitted, Discharged", colorHex:"#8b5cf6" },
  ]},
  { id:"laboratory", label:"Laboratory", icon:TestTube, color:"#8b5cf6", glow:"rgba(139,92,246,0.2)", gradient:["#8b5cf6","#7c3aed"], sections:[
    { key:"lab_specimens", label:"Specimen",        icon:FlaskConical, description:"Types of specimens collected for testing", dbPath:"settings/laboratory/specimens", placeholder:"e.g. Blood, Urine, Stool",    colorHex:"#8b5cf6" },
    { key:"lab_tests",     label:"Tests Requested", icon:TestTube,     description:"Available laboratory test panels",        dbPath:"settings/laboratory/tests",     placeholder:"e.g. CBC, Urinalysis, HbA1c", colorHex:"#7c3aed" },
  ]},
  { id:"pharmacy", label:"Pharmacy", icon:Pill, color:"#ec4899", glow:"rgba(236,72,153,0.2)", gradient:["#ec4899","#db2777"], sections:[
    { key:"pharma_forms", label:"Tablet / Dosage Form", icon:Pill, description:"Medicine forms and dosage types", dbPath:"settings/pharmacy/forms", placeholder:"e.g. Tablet, Capsule, Syrup", colorHex:"#ec4899" },
  ]},
  { id:"doctors", label:"Doctors", icon:Stethoscope, color:"#f97316", glow:"rgba(249,115,22,0.2)", gradient:["#f97316","#ef4444"], sections:[
    { key:"doc_specializations", label:"Specialization",  icon:Stethoscope, description:"Medical specializations for doctor profiles", dbPath:"settings/doctors/specializations", placeholder:"e.g. Cardiology, Pediatrics", colorHex:"#f97316" },
    { key:"doc_schedules",       label:"Weekly Schedule", icon:Clock,       description:"Available schedule slots for doctors",         dbPath:"settings/doctors/schedules",       placeholder:"e.g. Mon-Wed 8AM-12PM",      colorHex:"#ef4444" },
  ]},
  { id:"billing", label:"Billing", icon:CreditCard, color:"#0ea5e9", glow:"rgba(14,165,233,0.2)", gradient:["#0ea5e9","#0284c7"], hasBankSection:true, sections:[
    { key:"bill_statuses",  label:"Bill Status",     icon:CheckCircle2, description:"Workflow statuses for billing records",     dbPath:"settings/billing/statuses",       placeholder:"e.g. Unpaid, Partial, Paid",           colorHex:"#0ea5e9" },
    { key:"bill_services",  label:"Service / Item",  icon:Receipt,      description:"Billable services, procedures, and items", dbPath:"settings/billing/services",       placeholder:"e.g. Consultation, Laboratory, X-Ray", colorHex:"#0284c7" },
    { key:"bill_methods",   label:"Payment Method",  icon:Wallet,       description:"Accepted payment methods for bills",       dbPath:"settings/billing/paymentMethods", placeholder:"e.g. Cash, GCash, Maya",               colorHex:"#06b6d4" },
    { key:"bill_insurance", label:"Insurance / HMO", icon:ShieldCheck,  description:"Insurance providers and HMO partners",     dbPath:"settings/billing/insurance",      placeholder:"e.g. PhilHealth, Maxicare",            colorHex:"#2563eb" },
  ]},
];

// ══════════════════════════════════════════════════════════════════════════════
// SHARED UI HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const Toast = ({ msg, type, visible }) => (
  <div style={{
    position:"fixed", bottom:28, right:28, zIndex:9998,
    display:"flex", alignItems:"center", gap:10,
    padding:"13px 20px", borderRadius:14,
    background: type==="success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
    border:`1.5px solid ${type==="success" ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.35)"}`,
    backdropFilter:"blur(12px)",
    boxShadow:"0 8px 32px rgba(0,0,0,0.2)",
    transform: visible ? "translateY(0)" : "translateY(20px)",
    opacity: visible ? 1 : 0,
    transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
    pointerEvents:"none",
  }}>
    {type==="success" ? <CheckCircle2 size={16} color="#10b981"/> : <AlertTriangle size={16} color="#ef4444"/>}
    <span style={{ fontSize:13, fontWeight:600, color: type==="success"?"#10b981":"#ef4444" }}>{msg}</span>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — MODULE TOGGLES + VERSION
// ══════════════════════════════════════════════════════════════════════════════
const ModuleCard = ({ mod, enabled, onToggle, D }) => {
  const Icon = mod.icon;
  return (
    <div onClick={onToggle} style={{
      display:"flex", alignItems:"center", gap:12,
      padding:"13px 15px", borderRadius:14, cursor:"pointer",
      background: enabled ? D ? `${mod.color}18` : `${mod.color}10` : D ? "rgba(255,255,255,0.03)" : "#f9fafb",
      border:`1.5px solid ${enabled ? `${mod.color}40` : D ? "rgba(255,255,255,0.07)" : "#e5e7eb"}`,
      transition:"all 0.2s ease", userSelect:"none",
    }}>
      <div style={{
        width:36, height:36, borderRadius:10, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background: enabled ? `${mod.color}20` : D ? "rgba(255,255,255,0.06)" : "#f1f5f9",
        transition:"all 0.2s",
      }}>
        <Icon size={16} color={enabled ? mod.color : D ? "#4b5563" : "#9ca3af"} />
      </div>
      <span style={{
        flex:1, fontSize:12, fontWeight:700,
        color: enabled ? D?"#f1f5f9":"#111827" : D?"#4b5563":"#9ca3af",
        transition:"color 0.2s",
      }}>{mod.label}</span>
      {/* toggle pill */}
      <div style={{
        width:40, height:22, borderRadius:999, position:"relative", flexShrink:0,
        background: enabled ? `linear-gradient(135deg,${mod.color},${mod.color}cc)` : D?"#1f2937":"#e5e7eb",
        transition:"background 0.25s",
        boxShadow: enabled ? `0 0 8px ${mod.color}55` : "none",
      }}>
        <div style={{
          position:"absolute", top:2, left: enabled?21:2,
          width:18, height:18, borderRadius:"50%", background:"#fff",
          transition:"left 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow:"0 1px 4px rgba(0,0,0,0.2)",
        }}/>
      </div>
    </div>
  );
};

function TabSystem({ D, showToast }) {
  const [modules,      setModules]      = useState({});
  const [version,      setVersion]      = useState("1.0.0");
  const [editVersion,  setEditVersion]  = useState("1.0.0");
  const [reason,       setReason]       = useState("");
  const [etaDate,      setEtaDate]      = useState("");
  const [etaTime,      setEtaTime]      = useState("");
  const [saving,       setSaving]       = useState(false);
  const [loading,      setLoading]      = useState(true);

  // Live-load from Firebase
  useEffect(() => {
    const unsub = onValue(ref(db, "maintenanceSettings"), snap => {
      if (snap.exists()) {
        const d = snap.val();
        setModules(d.modules || {});
        setVersion(d.version || "1.0.0");
        setEditVersion(d.version || "1.0.0");
        setReason(d.reason || "");
        setEtaDate(d.etaDate || "");
        setEtaTime(d.etaTime || "");
      } else {
        const defaults = {};
        ALL_MODULES.forEach(m => { defaults[m.id] = true; });
        setModules(defaults);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const enabledCount = ALL_MODULES.filter(m => modules[m.id]).length;
  const hasDisabled  = Object.values(modules).some(v => v === false);

  const handleEnableAll  = () => { const a={}; ALL_MODULES.forEach(m=>{a[m.id]=true;}); setModules(a); };
  const handleDisableAll = () => { const a={}; ALL_MODULES.forEach(m=>{a[m.id]=false;}); setModules(a); };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isMaintenanceOn = Object.values(modules).some(v => v === false);
      await set(ref(db, "maintenanceSettings"), {
        modules,
        maintenanceMode: isMaintenanceOn,
        version:  editVersion.trim() || "1.0.0",
        reason:   reason.trim(),
        etaDate:  etaDate,
        etaTime:  etaTime,
        updatedAt: Date.now(),
      });
      setVersion(editVersion.trim() || "1.0.0");
      showToast(
        isMaintenanceOn
          ? "⚠️ Maintenance ON — users are now blocked!"
          : "✅ All modules active — system is live!",
        isMaintenanceOn ? "error" : "success"
      );
    } catch(e) { showToast("Failed to save.", "error"); }
    finally { setSaving(false); }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const cardBg  = D ? "#0d1117" : "#ffffff";
  const cardBdr = D ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const textPri = D ? "#f1f5f9" : "#0f172a";
  const textSec = D ? "#64748b" : "#64748b";
  const inpBg   = D ? "rgba(255,255,255,0.05)" : "#f8fafc";
  const inpBdr  = D ? "rgba(255,255,255,0.1)"  : "#e2e8f0";
  const inpClr  = D ? "#e2e8f0" : "#0f172a";

  const inputStyle = {
    width:"100%", boxSizing:"border-box",
    background: inpBg, border:`1.5px solid ${inpBdr}`,
    borderRadius:11, padding:"10px 14px",
    fontSize:13, color:inpClr,
    outline:"none", fontFamily:"inherit",
    transition:"border-color .2s",
  };
  const labelStyle = {
    display:"block", fontSize:10, fontWeight:700,
    textTransform:"uppercase", letterSpacing:".7px",
    color: textSec, marginBottom:6,
  };

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
      <div style={{ width:28,height:28,borderRadius:"50%",border:"3px solid rgba(99,102,241,0.2)",borderTopColor:"#6366f1",animation:"spin .7s linear infinite" }}/>
    </div>
  );

  // ETA display string
  const etaDisplay = etaDate
    ? `${new Date(etaDate).toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}${etaTime ? " at "+etaTime : ""}`
    : "Not set";

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20, alignItems:"start" }}>

      {/* ─── LEFT: Module toggles ───────────────────────────────────────────── */}
      <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, padding:"22px", boxShadow: D?"none":"0 1px 4px rgba(0,0,0,0.06)" }}>

        {/* Header row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
          <div>
            <h2 style={{ margin:0, fontSize:15, fontWeight:800, color:textPri }}>Module Access Control</h2>
            <p style={{ margin:"3px 0 0", fontSize:12, color:textSec }}>
              {enabledCount} of {ALL_MODULES.length} modules active
              {hasDisabled && <span style={{ marginLeft:8, padding:"2px 8px", borderRadius:20, background:"rgba(239,68,68,0.1)", color:"#ef4444", fontSize:10, fontWeight:700 }}>⚠ MAINTENANCE ON</span>}
            </p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleEnableAll} style={{ padding:"6px 12px", borderRadius:8, border:"1.5px solid rgba(16,185,129,0.3)", background:"rgba(16,185,129,0.08)", color:"#10b981", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
              <Zap size={10}/> All On
            </button>
            <button onClick={handleDisableAll} style={{ padding:"6px 12px", borderRadius:8, border:"1.5px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.08)", color:"#ef4444", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
              <ToggleLeft size={10}/> All Off
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:4, borderRadius:999, background: D?"rgba(255,255,255,0.06)":"#f1f5f9", marginBottom:16, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${(enabledCount/ALL_MODULES.length)*100}%`, background: hasDisabled ? "linear-gradient(90deg,#f97316,#ef4444)" : "linear-gradient(90deg,#3b82f6,#10b981)", borderRadius:999, transition:"width 0.4s ease, background 0.4s ease" }}/>
        </div>

        {/* Module cards grid */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
          {ALL_MODULES.map(mod => (
            <ModuleCard key={mod.id} mod={mod} enabled={!!modules[mod.id]} onToggle={() => setModules(p=>({...p,[mod.id]:!p[mod.id]}))} D={D}/>
          ))}
        </div>
      </div>

      {/* ─── RIGHT column ──────────────────────────────────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

        {/* ── Maintenance Status indicator ── */}
        <div style={{
          padding:"14px 16px", borderRadius:16,
          background: hasDisabled
            ? D ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)"
            : D ? "rgba(16,185,129,0.1)" : "rgba(16,185,129,0.06)",
          border: `1.5px solid ${hasDisabled ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}`,
          display:"flex", alignItems:"center", gap:12,
        }}>
          <div style={{
            width:40, height:40, borderRadius:12, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            background: hasDisabled ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
          }}>
            {hasDisabled
              ? <Wrench size={20} color="#ef4444"/>
              : <CheckCircle2 size={20} color="#10b981"/>
            }
          </div>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:800, color: hasDisabled ? "#ef4444" : "#10b981" }}>
              {hasDisabled ? "Maintenance Mode ON" : "System Live"}
            </p>
            <p style={{ margin:0, fontSize:11, color:textSec }}>
              {hasDisabled ? "Non-superadmin users are blocked" : "All users can access the system"}
            </p>
          </div>
        </div>

        {/* ── Version card ── */}
        <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:16, padding:"18px", boxShadow: D?"none":"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:28,height:28,borderRadius:8,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Tag size={13} color="#6366f1"/>
            </div>
            <h2 style={{ margin:0, fontSize:14, fontWeight:800, color:textPri }}>System Version</h2>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:11, background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)", marginBottom:12 }}>
            <span style={{ fontSize:11, color:"#818cf8", fontWeight:600 }}>Current version:</span>
            <span style={{ fontSize:16, fontWeight:900, color:"#6366f1", fontFamily:"monospace", marginLeft:"auto" }}>v{version}</span>
          </div>
          <label style={labelStyle}>Update to new version</label>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, fontWeight:700, color:"#6366f1" }}>v</span>
            <input
              value={editVersion}
              onChange={e => setEditVersion(e.target.value)}
              placeholder="1.0.0"
              style={{ ...inputStyle, paddingLeft:26, fontFamily:"monospace", fontWeight:700 }}
              onFocus={e=>e.target.style.borderColor="#6366f1"}
              onBlur={e=>e.target.style.borderColor=inpBdr}
            />
          </div>
          <p style={{ margin:"6px 0 0", fontSize:10, color:textSec }}>
            Format: <span style={{ fontFamily:"monospace", color:"#818cf8" }}>MAJOR.MINOR.PATCH</span>
          </p>
        </div>

        {/* ── Maintenance Reason card ── */}
        <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:16, padding:"18px", boxShadow: D?"none":"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <div style={{ width:28,height:28,borderRadius:8,background:"rgba(249,115,22,0.12)",border:"1px solid rgba(249,115,22,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <AlertTriangle size={13} color="#f97316"/>
            </div>
            <h2 style={{ margin:0, fontSize:14, fontWeight:800, color:textPri }}>Maintenance Details</h2>
          </div>

          {/* Reason */}
          <label style={labelStyle}>Reason / Dahilan</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="e.g. System update, database migration, server maintenance..."
            rows={3}
            style={{ ...inputStyle, resize:"none", lineHeight:1.6 }}
            onFocus={e=>e.target.style.borderColor="#f97316"}
            onBlur={e=>e.target.style.borderColor=inpBdr}
          />

          {/* ETA */}
          <label style={{ ...labelStyle, marginTop:12 }}>Expected Return (ETA)</label>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div>
              <label style={{ ...labelStyle, marginBottom:4, fontSize:9 }}>Date</label>
              <input
                type="date"
                value={etaDate}
                onChange={e => setEtaDate(e.target.value)}
                style={{ ...inputStyle, colorScheme: D?"dark":"light" }}
                onFocus={e=>e.target.style.borderColor="#f97316"}
                onBlur={e=>e.target.style.borderColor=inpBdr}
              />
            </div>
            <div>
              <label style={{ ...labelStyle, marginBottom:4, fontSize:9 }}>Time</label>
              <input
                type="time"
                value={etaTime}
                onChange={e => setEtaTime(e.target.value)}
                style={{ ...inputStyle, colorScheme: D?"dark":"light" }}
                onFocus={e=>e.target.style.borderColor="#f97316"}
                onBlur={e=>e.target.style.borderColor=inpBdr}
              />
            </div>
          </div>

          {/* ETA preview */}
          {(etaDate || etaTime) && (
            <div style={{ marginTop:10, padding:"8px 12px", borderRadius:10, background: D?"rgba(249,115,22,0.08)":"rgba(249,115,22,0.05)", border:"1px solid rgba(249,115,22,0.2)", display:"flex", alignItems:"center", gap:8 }}>
              <Clock size={12} color="#f97316"/>
              <span style={{ fontSize:11, color: D?"#fdba74":"#c2410c", fontWeight:600 }}>
                Expected back: {etaDisplay}
              </span>
            </div>
          )}
        </div>

        {/* ── Summary card ── */}
        <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:16, padding:"16px 18px", boxShadow: D?"none":"0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ margin:"0 0 10px", fontSize:13, fontWeight:800, color:textPri }}>Summary</p>
          {[
            { label:"System",      value:"MediCore CMS" },
            { label:"Modules",     value:`${ALL_MODULES.length} total` },
            { label:"Active",      value:`${enabledCount} enabled`,     color: hasDisabled?"#ef4444":"#10b981" },
            { label:"Version",     value:`v${version}`,                  mono:true },
            { label:"Status",      value: hasDisabled?"⚠ Maintenance":"✅ Live", color: hasDisabled?"#f97316":"#10b981" },
            { label:"Returns",     value: etaDisplay },
          ].map(item => (
            <div key={item.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}` }}>
              <span style={{ fontSize:11, color:textSec }}>{item.label}</span>
              <span style={{ fontSize:11, fontWeight:700, color: item.color||( item.mono?"#6366f1":textPri), fontFamily:item.mono?"monospace":"inherit" }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* ── Warning ── */}
        <div style={{ padding:"11px 14px", borderRadius:12, background: D?"rgba(239,68,68,0.06)":"rgba(239,68,68,0.04)", border:"1.5px solid rgba(239,68,68,0.15)", display:"flex", gap:9 }}>
          <AlertTriangle size={13} color="#f87171" style={{ flexShrink:0, marginTop:1 }}/>
          <p style={{ margin:0, fontSize:11, color: D?"#fca5a5":"#b91c1c", lineHeight:1.6 }}>
            Disabling modules blocks all non-superadmin users <strong>immediately</strong> after saving.
          </p>
        </div>

        {/* ── Save button ── */}
        <button onClick={handleSave} disabled={saving} style={{
          padding:"14px 0", borderRadius:14, border:"none",
          cursor: saving?"not-allowed":"pointer",
          background: saving
            ? "rgba(99,99,99,0.3)"
            : hasDisabled
              ? "linear-gradient(135deg,#f97316,#ef4444)"
              : "linear-gradient(135deg,#10b981,#059669)",
          color:"#fff", fontSize:14, fontWeight:800,
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          boxShadow: saving?"none": hasDisabled?"0 6px 20px rgba(249,115,22,0.35)":"0 6px 20px rgba(16,185,129,0.35)",
          transition:"all 0.3s",
        }}>
          {saving
            ? <><div style={{ width:15,height:15,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spin .7s linear infinite" }}/> Saving…</>
            : <><Save size={15}/> Save Changes</>
          }
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — DROPDOWN SETTINGS (from existing MaintenanceSettings.jsx)
// ══════════════════════════════════════════════════════════════════════════════
function BankEWalletModal({ editData, onClose, onSave, D }) {
  const [selType,    setSelType]    = useState(editData?.bankType || "gcash");
  const [form,       setForm]       = useState(editData ? { ...editData } : {});
  const [qrPreview,  setQrPreview]  = useState(editData?.qr || "");
  const [error,      setError]      = useState("");
  const fileRef = useRef();
  const typeCfg = BANK_TYPES.find(t => t.id === selType) || BANK_TYPES[0];
  const set_ = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleTypeChange = id => { setSelType(id); setForm({}); setQrPreview(""); setError(""); };
  const handleQR = e => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setQrPreview(ev.target.result); setForm(p=>({...p,qr:ev.target.result})); };
    reader.readAsDataURL(file);
  };
  const handleSave = () => {
    setError("");
    for (const f of typeCfg.fields) {
      if(f.type==="qr") continue;
      if(f.required && !form[f.key]?.trim()) { setError(`${f.label} is required.`); return; }
    }
    onSave({ ...form, bankType:selType, label:typeCfg.label, kind:typeCfg.kind });
  };

  const inp = { width:"100%", boxSizing:"border-box", background: D?"rgba(255,255,255,0.06)":"#f8fafc", border:`1.5px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:11, padding:"10px 14px", fontSize:13, color:D?"#e2e8f0":"#0f172a", outline:"none", fontFamily:"inherit" };
  const lbl = { display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", color:"#64748b", marginBottom:6 };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", padding:16 }}>
      <div style={{ background:D?"#0d1117":"#fff", borderRadius:24, width:"100%", maxWidth:540, boxShadow:"0 32px 80px rgba(0,0,0,0.35)", maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div style={{ background:"linear-gradient(135deg,#0ea5e9,#0284c7)", padding:"18px 22px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ width:40,height:40,borderRadius:12,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center" }}>
            <typeCfg.Icon size={26}/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ margin:0,fontSize:15,fontWeight:800,color:"#fff" }}>{editData?`Edit ${editData.label}`:"Add Bank / E-Wallet"}</p>
            <p style={{ margin:0,fontSize:11,color:"rgba(255,255,255,.7)" }}>Payment channel details for billing</p>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)",border:"none",cursor:"pointer",width:32,height:32,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <X size={16} color="#fff"/>
          </button>
        </div>
        <div style={{ overflowY:"auto", flex:1, padding:"20px 22px", display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={lbl}>Select Type</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
              {BANK_TYPES.map(t => {
                const active = selType===t.id;
                return (
                  <button key={t.id} onClick={()=>handleTypeChange(t.id)} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"10px 4px",borderRadius:14,cursor:"pointer",border:`2px solid ${active?t.bg:D?"rgba(255,255,255,0.07)":"#f1f5f9"}`,background:active?`${t.bg}15`:D?"rgba(255,255,255,0.03)":"#fafafa",transition:"all .15s" }}>
                    <t.Icon size={28}/>
                    <span style={{ fontSize:10,fontWeight:700,color:active?t.bg:"#64748b",textAlign:"center",lineHeight:1.2 }}>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:`${typeCfg.bg}10`,border:`1.5px solid ${typeCfg.bg}30` }}>
            <typeCfg.Icon size={28}/>
            <div style={{ flex:1 }}>
              <p style={{ margin:0,fontSize:13,fontWeight:700,color:D?"#e2e8f0":"#0f172a" }}>{typeCfg.label}</p>
              <p style={{ margin:0,fontSize:11,color:"#64748b" }}>{typeCfg.kind==="ewallet"?"E-Wallet":typeCfg.kind==="bank"?"Bank Account":"Other Channel"}</p>
            </div>
          </div>
          {error && <div style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:11,background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",fontSize:12 }}><AlertCircle size={13}/> {error}</div>}
          {typeCfg.fields.map(f => {
            if(f.type==="qr") return (
              <div key={f.key}>
                <label style={lbl}>{f.label}<span style={{ color:"#94a3b8",fontSize:10,textTransform:"none",letterSpacing:0,fontWeight:400 }}> — optional</span></label>
                <div onClick={()=>fileRef.current?.click()} style={{ border:`2px dashed ${D?"rgba(255,255,255,0.15)":"#e2e8f0"}`,borderRadius:14,padding:qrPreview?"14px":"22px 14px",textAlign:"center",cursor:"pointer",background:D?"rgba(255,255,255,0.03)":"#fafafa" }}>
                  {qrPreview
                    ? <div style={{ display:"flex",alignItems:"center",gap:14 }}><img src={qrPreview} alt="QR" style={{ width:72,height:72,objectFit:"contain",borderRadius:10 }}/><div><p style={{ margin:"0 0 4px",fontSize:13,fontWeight:700,color:"#22c55e" }}>✓ QR uploaded</p><p style={{ margin:0,fontSize:11,color:"#64748b" }}>Click to replace</p></div></div>
                    : <><QrCode size={30} color="#94a3b8" style={{ margin:"0 auto 8px",display:"block" }}/><p style={{ margin:"0 0 4px",fontSize:13,fontWeight:600,color:"#475569" }}>Upload QR Code</p><p style={{ margin:0,fontSize:11,color:"#94a3b8" }}>PNG, JPG · Click to browse</p></>
                  }
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleQR}/>
                </div>
              </div>
            );
            return (
              <div key={f.key}>
                <label style={lbl}>{f.label}{!f.required&&<span style={{ color:"#94a3b8",fontSize:10,textTransform:"none",letterSpacing:0,fontWeight:400 }}> — optional</span>}</label>
                <input type="text" value={form[f.key]||""} onChange={set_(f.key)} placeholder={f.placeholder} style={inp} onFocus={e=>e.target.style.borderColor=typeCfg.bg} onBlur={e=>e.target.style.borderColor=D?"rgba(255,255,255,0.1)":"#e2e8f0"}/>
              </div>
            );
          })}
          <div>
            <label style={lbl}>Internal Notes <span style={{ color:"#94a3b8",fontSize:10,textTransform:"none",letterSpacing:0,fontWeight:400 }}>— optional</span></label>
            <input type="text" value={form.internalNotes||""} onChange={set_("internalNotes")} placeholder="e.g. For PhilHealth reimbursements only" style={inp} onFocus={e=>e.target.style.borderColor=typeCfg.bg} onBlur={e=>e.target.style.borderColor=D?"rgba(255,255,255,0.1)":"#e2e8f0"}/>
          </div>
        </div>
        <div style={{ padding:"14px 22px",borderTop:`1px solid ${D?"rgba(255,255,255,0.06)":"#f1f5f9"}`,display:"flex",gap:10,flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:"0 0 100px",padding:"11px 0",borderRadius:12,border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`,background:"transparent",color:"#64748b",fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
          <button onClick={handleSave} style={{ flex:1,padding:"11px 0",borderRadius:12,border:"none",background:`linear-gradient(135deg,${typeCfg.bg},${typeCfg.bg}cc)`,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:`0 6px 20px ${typeCfg.bg}40` }}>
            <Save size={14}/> {editData?"Save Changes":`Add ${typeCfg.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function BankEWalletSection({ D }) {
  const [entries,   setEntries]   = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const dbPath = "settings/billing/banks";

  useEffect(() => {
    const unsub = onValue(ref(db, dbPath), snap => {
      const data = snap.val();
      if(!data) { setEntries([]); setLoading(false); return; }
      setEntries(Object.entries(data).map(([id,v])=>({id,...v})).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)));
      setLoading(false);
    });
    return ()=>unsub();
  },[]);

  const handleSave = async data => {
    if(editEntry) await update(ref(db,`${dbPath}/${editEntry.id}`),{...data,updatedAt:Date.now()});
    else await push(ref(db,dbPath),{...data,createdAt:Date.now()});
    setShowModal(false); setEditEntry(null);
  };
  const handleDelete = async id => {
    if(!window.confirm("Remove this entry?")) return;
    await remove(ref(db,`${dbPath}/${id}`));
  };

  return (
    <div style={{ background:D?"#0d1117":"#fff",border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`,borderRadius:20,overflow:"hidden" }}>
      <div style={{ padding:"14px 18px",borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`,display:"flex",alignItems:"center",gap:10,background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
        <div style={{ width:32,height:32,borderRadius:10,background:"#0ea5e915",border:"1px solid #0ea5e930",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Landmark size={15} color="#0ea5e9"/></div>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ margin:0,fontSize:13,fontWeight:700,color:D?"#e2e8f0":"#0f172a" }}>Bank / E-Wallet</p>
          <p style={{ margin:0,fontSize:10,color:"#64748b",marginTop:1 }}>GCash, Maya, BDO, BPI + more</p>
        </div>
        <span style={{ fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:"#0ea5e915",color:"#0ea5e9",border:"1px solid #0ea5e930",flexShrink:0 }}>{entries.length} item{entries.length!==1?"s":""}</span>
      </div>
      <div style={{ padding:"14px 18px" }}>
        <button onClick={()=>{setEditEntry(null);setShowModal(true);}} style={{ display:"flex",alignItems:"center",gap:8,width:"100%",padding:"10px 14px",borderRadius:12,border:`1.5px dashed ${D?"rgba(255,255,255,0.12)":"#e2e8f0"}`,background:"transparent",cursor:"pointer",color:"#64748b",fontSize:12,fontWeight:600,marginBottom:entries.length?12:0,transition:"all .2s" }} onMouseEnter={e=>{e.currentTarget.style.borderColor="#0ea5e9";e.currentTarget.style.color="#0ea5e9";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=D?"rgba(255,255,255,0.12)":"#e2e8f0";e.currentTarget.style.color="#64748b";}}>
          <Plus size={14}/> Add Bank or E-Wallet
        </button>
        {loading ? (
          <div style={{ textAlign:"center",padding:"20px 0" }}><div style={{ width:20,height:20,borderRadius:"50%",border:"2px solid #e2e8f0",borderTopColor:"#0ea5e9",animation:"spin .6s linear infinite",margin:"0 auto" }}/></div>
        ) : entries.length===0 ? (
          <p style={{ margin:0,fontSize:12,color:"#64748b",textAlign:"center",padding:"20px 0" }}>No entries yet.</p>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:300,overflowY:"auto" }}>
            {entries.map(entry=>{
              const tc = BANK_TYPES.find(t=>t.id===entry.bankType)||BANK_TYPES[BANK_TYPES.length-1];
              const detail = entry.number||entry.account||entry.bankname||"";
              return (
                <div key={entry.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:12,background:D?"rgba(255,255,255,0.03)":"#f8fafc",border:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`,transition:"all .15s" }} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${tc.bg}40`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=D?"rgba(255,255,255,0.05)":"#f1f5f9";}}>
                  <div style={{ flexShrink:0 }}><tc.Icon size={32}/></div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <p style={{ margin:0,fontSize:12,fontWeight:700,color:D?"#cbd5e1":"#0f172a" }}>{entry.label||tc.label}</p>
                      {entry.qr&&<span style={{ fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:20,background:"rgba(34,197,94,0.1)",color:"#22c55e",border:"1px solid rgba(34,197,94,0.2)" }}>QR ✓</span>}
                    </div>
                    <p style={{ margin:"2px 0 0",fontSize:11,color:"#64748b",fontFamily:"monospace" }}>{detail}{entry.name?` · ${entry.name}`:""}</p>
                  </div>
                  <button onClick={()=>{setEditEntry(entry);setShowModal(true);}} style={{ background:"none",border:"none",cursor:"pointer",color:"#60a5fa",display:"flex",padding:4 }}><Edit2 size={13}/></button>
                  <button onClick={()=>handleDelete(entry.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#f87171",display:"flex",padding:4 }}><Trash2 size={13}/></button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showModal&&<BankEWalletModal editData={editEntry} D={D} onClose={()=>{setShowModal(false);setEditEntry(null);}} onSave={handleSave}/>}
    </div>
  );
}

function SettingsSection({ section, D }) {
  const [items,   setItems]   = useState([]);
  const [input,   setInput]   = useState("");
  const [editId,  setEditId]  = useState(null);
  const [editVal, setEditVal] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const unsub = onValue(ref(db, section.dbPath), snap => {
      const data = snap.val();
      if(!data) { setItems([]); return; }
      const list = Object.entries(data).map(([id,v])=>({id,label:typeof v==="string"?v:v.label||"",createdAt:typeof v==="object"?v.createdAt:0})).sort((a,b)=>(a.label||"").localeCompare(b.label||""));
      setItems(list);
    });
    return ()=>unsub();
  },[section.dbPath]);

  const handleAdd = async () => {
    const val = input.trim(); if(!val) return;
    setSaving(true);
    try { await push(ref(db,section.dbPath),{label:val,createdAt:Date.now()}); setInput(""); inputRef.current?.focus(); }
    finally { setSaving(false); }
  };
  const handleEdit = async id => {
    const val = editVal.trim(); if(!val) return;
    await update(ref(db,`${section.dbPath}/${id}`),{label:val,updatedAt:Date.now()});
    setEditId(null); setEditVal("");
  };
  const handleDelete = async id => {
    if(!window.confirm("Remove this item?")) return;
    await remove(ref(db,`${section.dbPath}/${id}`));
  };

  const filtered = items.filter(it=>(it.label||"").toLowerCase().includes(search.toLowerCase()));
  const SectionIcon = section.icon;

  return (
    <div style={{ background:D?"#0d1117":"#fff",border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`,borderRadius:20,overflow:"hidden",display:"flex",flexDirection:"column" }}>
      <div style={{ padding:"14px 18px",borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`,display:"flex",alignItems:"center",gap:10,background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
        <div style={{ width:32,height:32,borderRadius:10,background:`${section.colorHex}18`,border:`1px solid ${section.colorHex}30`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><SectionIcon size={15} color={section.colorHex}/></div>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ margin:0,fontSize:13,fontWeight:700,color:D?"#e2e8f0":"#0f172a" }}>{section.label}</p>
          <p style={{ margin:0,fontSize:10,color:"#64748b",marginTop:1 }}>{section.description}</p>
        </div>
        <span style={{ fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,background:`${section.colorHex}15`,color:section.colorHex,border:`1px solid ${section.colorHex}30`,flexShrink:0 }}>{items.length} item{items.length!==1?"s":""}</span>
      </div>
      <div style={{ padding:"14px 18px",flex:1 }}>
        <div style={{ display:"flex",gap:8,marginBottom:12 }}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdd()} placeholder={section.placeholder} style={{ flex:1,background:D?"rgba(255,255,255,0.05)":"#f8fafc",border:`1.5px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`,borderRadius:11,padding:"9px 14px",fontSize:12,color:D?"#e2e8f0":"#0f172a",outline:"none",fontFamily:"inherit" }} onFocus={e=>{e.target.style.borderColor=section.colorHex;}} onBlur={e=>{e.target.style.borderColor=D?"rgba(255,255,255,0.1)":"#e2e8f0";}}/>
          <button onClick={handleAdd} disabled={saving||!input.trim()} style={{ width:36,height:36,borderRadius:10,border:"none",background:input.trim()?`linear-gradient(135deg,${section.colorHex},${section.colorHex}cc)`:D?"rgba(255,255,255,0.06)":"#f1f5f9",color:input.trim()?"#fff":"#94a3b8",display:"flex",alignItems:"center",justifyContent:"center",cursor:input.trim()?"pointer":"not-allowed",flexShrink:0,boxShadow:input.trim()?`0 4px 14px ${section.colorHex}40`:"none" }}>
            {saving?<div style={{ width:12,height:12,borderRadius:"50%",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",animation:"spin .6s linear infinite" }}/>:<Plus size={15}/>}
          </button>
        </div>
        {items.length>5&&(
          <div style={{ display:"flex",alignItems:"center",gap:8,background:D?"rgba(255,255,255,0.04)":"#f8fafc",border:`1px solid ${D?"rgba(255,255,255,0.07)":"#e2e8f0"}`,borderRadius:10,padding:"7px 12px",marginBottom:10 }}>
            <Search size={12} color="#64748b"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." style={{ background:"none",border:"none",outline:"none",fontSize:12,color:D?"#e2e8f0":"#0f172a",flex:1 }}/>
          </div>
        )}
        <div style={{ display:"flex",flexDirection:"column",gap:5,maxHeight:220,overflowY:"auto" }}>
          {filtered.length===0 ? (
            <p style={{ margin:0,fontSize:12,color:"#64748b",textAlign:"center",padding:"20px 0" }}>{items.length===0?"No items yet.":"No results."}</p>
          ) : filtered.map(item=>(
            <div key={item.id} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:10,background:D?"rgba(255,255,255,0.03)":"#f8fafc",border:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`,transition:"all 0.15s" }} onMouseEnter={e=>{e.currentTarget.style.borderColor=`${section.colorHex}40`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=D?"rgba(255,255,255,0.05)":"#f1f5f9";}}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:section.colorHex,flexShrink:0 }}/>
              {editId===item.id ? (
                <>
                  <input value={editVal} onChange={e=>setEditVal(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")handleEdit(item.id);if(e.key==="Escape"){setEditId(null);setEditVal("");}}} autoFocus style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:12,fontWeight:600,color:D?"#e2e8f0":"#0f172a",borderBottom:`1.5px solid ${section.colorHex}`,paddingBottom:2 }}/>
                  <button onClick={()=>handleEdit(item.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#22c55e",display:"flex" }}><Save size={13}/></button>
                  <button onClick={()=>{setEditId(null);setEditVal("");}} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",display:"flex" }}><X size={13}/></button>
                </>
              ) : (
                <>
                  <span style={{ flex:1,fontSize:12,fontWeight:600,color:D?"#cbd5e1":"#0f172a" }}>{item.label}</span>
                  <button onClick={()=>{setEditId(item.id);setEditVal(item.label);}} style={{ background:"none",border:"none",cursor:"pointer",color:"#60a5fa",display:"flex",opacity:0.7 }}><Edit2 size={12}/></button>
                  <button onClick={()=>handleDelete(item.id)} style={{ background:"none",border:"none",cursor:"pointer",color:"#f87171",display:"flex",opacity:0.7 }}><Trash2 size={12}/></button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleAccordion({ module, D }) {
  const [open, setOpen] = useState(false);
  const ModIcon = module.icon;
  const allPills = [...module.sections.map(s=>s.label),...(module.hasBankSection?["Bank / E-Wallet"]:[])];
  return (
    <div style={{ background:D?"#0d1117":"#fff",border:`1px solid ${open?`${module.color}40`:D?"rgba(255,255,255,0.06)":"#f1f5f9"}`,borderRadius:20,overflow:"hidden",transition:"border-color 0.2s",marginBottom:10 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%",display:"flex",alignItems:"center",gap:14,padding:"16px 20px",background:open?D?`${module.color}10`:`${module.color}05`:"transparent",border:"none",cursor:"pointer",borderBottom:open?`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`:"none",transition:"background 0.2s" }}>
        <div style={{ width:42,height:42,borderRadius:13,flexShrink:0,background:`linear-gradient(135deg,${module.gradient[0]},${module.gradient[1]})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 6px 20px ${module.glow}` }}>
          <ModIcon size={20} color="#fff"/>
        </div>
        <div style={{ flex:1,textAlign:"left" }}>
          <p style={{ margin:0,fontSize:15,fontWeight:700,color:D?"#f1f5f9":"#0f172a" }}>{module.label}</p>
          <p style={{ margin:0,fontSize:11,color:"#64748b",marginTop:2 }}>{allPills.length} setting group{allPills.length!==1?"s":""}</p>
        </div>
        <div style={{ display:"flex",gap:5,flexWrap:"wrap",justifyContent:"flex-end",maxWidth:240 }}>
          {allPills.map(label=>(
            <span key={label} style={{ fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:`${module.color}15`,color:module.color,border:`1px solid ${module.color}25`,whiteSpace:"nowrap" }}>{label}</span>
          ))}
        </div>
        <ChevronRight size={16} style={{ color:D?"#475569":"#94a3b8",transform:open?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.25s",flexShrink:0 }}/>
      </button>
      {open&&(
        <div style={{ padding:20,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14,animation:"fadeIn .2s ease" }}>
          {module.sections.map(section=><SettingsSection key={section.key} section={section} D={D}/>)}
          {module.hasBankSection&&<div style={{ gridColumn:"1 / -1" }}><BankEWalletSection D={D}/></div>}
        </div>
      )}
    </div>
  );
}

function DropdownSettingsTab({ D }) {
  const [globalSearch, setGlobalSearch] = useState("");
  const filtered = globalSearch
    ? DROPDOWN_MODULES.filter(m=>m.label.toLowerCase().includes(globalSearch.toLowerCase())||m.sections.some(s=>s.label.toLowerCase().includes(globalSearch.toLowerCase())))
    : DROPDOWN_MODULES;

  const textPri = D?"#f1f5f9":"#0f172a";
  const textSec = D?"#4b5563":"#6b7280";

  return (
    <div>
      {/* Search bar */}
      <div style={{ display:"flex",alignItems:"center",gap:10,background:D?"rgba(255,255,255,0.05)":"#fff",border:`1px solid ${D?"rgba(255,255,255,0.09)":"#e5e7eb"}`,borderRadius:14,padding:"10px 16px",marginBottom:20,maxWidth:440 }}>
        <Search size={14} color="#64748b"/>
        <input value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} placeholder="Search modules or settings groups…" style={{ background:"none",border:"none",outline:"none",fontSize:13,color:textPri,flex:1,fontFamily:"inherit" }}/>
        {globalSearch&&<button onClick={()=>setGlobalSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",display:"flex" }}><X size={13}/></button>}
      </div>
      {filtered.length===0
        ? <div style={{ textAlign:"center",padding:"60px 0" }}><AlertCircle size={32} style={{ margin:"0 auto 12px",display:"block",color:"#64748b",opacity:.4 }}/><p style={{ margin:0,fontSize:14,color:"#64748b" }}>No modules matched.</p></div>
        : filtered.map(module=><ModuleAccordion key={module.id} module={module} D={D}/>)
      }
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — ANNOUNCEMENT MANAGER
// ══════════════════════════════════════════════════════════════════════════════
const ANNOUNCE_TYPES = [
  { id:"info",       label:"Info",        color:"#3b82f6", bg:"rgba(59,130,246,0.1)",   border:"rgba(59,130,246,0.3)"  },
  { id:"warning",    label:"Warning",     color:"#f97316", bg:"rgba(249,115,22,0.1)",   border:"rgba(249,115,22,0.3)"  },
  { id:"critical",   label:"Critical",    color:"#ef4444", bg:"rgba(239,68,68,0.1)",    border:"rgba(239,68,68,0.3)"   },
  { id:"success",    label:"Success",     color:"#10b981", bg:"rgba(16,185,129,0.1)",   border:"rgba(16,185,129,0.3)"  },
  { id:"maintenance",label:"Maintenance", color:"#8b5cf6", bg:"rgba(139,92,246,0.1)",  border:"rgba(139,92,246,0.3)"  },
];

const ANNOUNCE_AUDIENCE = [
  { id:"all",     label:"Everyone",      icon:Globe  },
  { id:"admin",   label:"Admin & Staff", icon:Users2 },
  { id:"patient", label:"Patients Only", icon:Users  },
];

const EMPTY_FORM = {
  title:"", message:"", type:"info", audience:"all",
  showFrom:"", showUntil:"", active:true,
};

function AnnouncementTab({ D, showToast }) {
  const [announcements, setAnnouncements] = useState([]);
  const [form,          setForm]          = useState(EMPTY_FORM);
  const [editId,        setEditId]        = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [preview,       setPreview]       = useState(false);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    const unsub = onValue(ref(db, "announcements"), snap => {
      const data = snap.val();
      if (!data) { setAnnouncements([]); setLoading(false); return; }
      setAnnouncements(
        Object.entries(data)
          .map(([id,v]) => ({id,...v}))
          .sort((a,b) => (b.createdAt||0)-(a.createdAt||0))
      );
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const set_ = k => e => setForm(p => ({...p, [k]: e.target.value}));

  const handleSave = async () => {
    if (!form.title.trim())   { showToast("Title is required!", "error"); return; }
    if (!form.message.trim()) { showToast("Message is required!", "error"); return; }
    setSaving(true);
    try {
      const data = {
        ...form,
        title:   form.title.trim(),
        message: form.message.trim(),
        updatedAt: Date.now(),
      };
      if (editId) {
        await update(ref(db, `announcements/${editId}`), data);
        showToast("Announcement updated!", "success");
      } else {
        await push(ref(db, "announcements"), { ...data, createdAt: Date.now() });
        showToast("Announcement created!", "success");
      }
      setForm(EMPTY_FORM);
      setEditId(null);
      setPreview(false);
    } catch(e) { showToast("Failed to save.", "error"); }
    finally { setSaving(false); }
  };

  const handleEdit = (a) => {
    setForm({
      title:     a.title     || "",
      message:   a.message   || "",
      type:      a.type      || "info",
      audience:  a.audience  || "all",
      showFrom:  a.showFrom  || "",
      showUntil: a.showUntil || "",
      active:    a.active !== false,
    });
    setEditId(a.id);
    setPreview(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await remove(ref(db, `announcements/${id}`));
    showToast("Deleted.", "success");
  };

  const handleToggleActive = async (a) => {
    await update(ref(db, `announcements/${a.id}`), { active: !a.active, updatedAt: Date.now() });
  };

  const cardBg  = D ? "#0d1117" : "#fff";
  const cardBdr = D ? "rgba(255,255,255,0.07)" : "#e2e8f0";
  const textPri = D ? "#f1f5f9" : "#0f172a";
  const textSec = D ? "#64748b" : "#64748b";
  const inpBg   = D ? "rgba(255,255,255,0.05)" : "#f8fafc";
  const inpBdr  = D ? "rgba(255,255,255,0.1)"  : "#e2e8f0";
  const inpClr  = D ? "#e2e8f0" : "#0f172a";

  const inputStyle = { width:"100%", boxSizing:"border-box", background:inpBg, border:`1.5px solid ${inpBdr}`, borderRadius:11, padding:"10px 14px", fontSize:13, color:inpClr, outline:"none", fontFamily:"inherit", transition:"border-color .2s" };
  const labelStyle = { display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", color:textSec, marginBottom:6 };

  const selectedType = ANNOUNCE_TYPES.find(t => t.id === form.type) || ANNOUNCE_TYPES[0];

  // Is announcement currently active (considering time range)
  const isLive = (a) => {
    if (!a.active) return false;
    const now = Date.now();
    if (a.showFrom && new Date(a.showFrom).getTime() > now) return false;
    if (a.showUntil && new Date(a.showUntil).getTime() < now) return false;
    return true;
  };

  const fmtDt = (s) => s ? new Date(s).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:20, alignItems:"start" }}>

      {/* ── LEFT: Form ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

        {/* Form card */}
        <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, padding:"22px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <div style={{ width:34,height:34,borderRadius:10,background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
              <Megaphone size={16} color="#8b5cf6"/>
            </div>
            <div>
              <h2 style={{ margin:0, fontSize:14, fontWeight:800, color:textPri }}>
                {editId ? "Edit Announcement" : "Create Announcement"}
              </h2>
              <p style={{ margin:0, fontSize:11, color:textSec }}>Will appear on dashboards for selected audience</p>
            </div>
            {editId && (
              <button onClick={() => { setForm(EMPTY_FORM); setEditId(null); }} style={{ marginLeft:"auto", padding:"5px 12px", borderRadius:8, border:`1px solid ${inpBdr}`, background:"transparent", color:textSec, fontSize:11, fontWeight:600, cursor:"pointer" }}>
                Cancel Edit
              </button>
            )}
          </div>

          {/* Title */}
          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>Title *</label>
            <input value={form.title} onChange={set_("title")} placeholder="e.g. System Maintenance Notice" style={inputStyle}
              onFocus={e=>e.target.style.borderColor="#8b5cf6"} onBlur={e=>e.target.style.borderColor=inpBdr}/>
          </div>

          {/* Message */}
          <div style={{ marginBottom:12 }}>
            <label style={labelStyle}>Message *</label>
            <textarea value={form.message} onChange={set_("message")} placeholder="Describe the announcement in detail..." rows={4}
              style={{ ...inputStyle, resize:"none", lineHeight:1.6 }}
              onFocus={e=>e.target.style.borderColor="#8b5cf6"} onBlur={e=>e.target.style.borderColor=inpBdr}/>
          </div>

          {/* Type + Audience row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {ANNOUNCE_TYPES.map(t => (
                  <button key={t.id} onClick={() => setForm(p=>({...p,type:t.id}))} style={{ padding:"5px 11px", borderRadius:8, border:`1.5px solid ${form.type===t.id ? t.color : inpBdr}`, background:form.type===t.id ? t.bg : "transparent", color:form.type===t.id ? t.color : textSec, fontSize:11, fontWeight:700, cursor:"pointer", transition:"all .15s" }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Show to</label>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {ANNOUNCE_AUDIENCE.map(a => {
                  const Icon = a.icon;
                  return (
                    <button key={a.id} onClick={() => setForm(p=>({...p,audience:a.id}))} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 11px", borderRadius:9, border:`1.5px solid ${form.audience===a.id ? "#8b5cf6" : inpBdr}`, background:form.audience===a.id ? "rgba(139,92,246,0.08)" : "transparent", color:form.audience===a.id ? "#8b5cf6" : textSec, fontSize:12, fontWeight:form.audience===a.id?700:500, cursor:"pointer", transition:"all .15s", textAlign:"left" }}>
                      <Icon size={13}/> {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Schedule row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={labelStyle}>Show From <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(optional)</span></label>
              <input type="datetime-local" value={form.showFrom} onChange={set_("showFrom")} style={{ ...inputStyle, colorScheme:D?"dark":"light" }}
                onFocus={e=>e.target.style.borderColor="#8b5cf6"} onBlur={e=>e.target.style.borderColor=inpBdr}/>
            </div>
            <div>
              <label style={labelStyle}>Show Until <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(optional)</span></label>
              <input type="datetime-local" value={form.showUntil} onChange={set_("showUntil")} style={{ ...inputStyle, colorScheme:D?"dark":"light" }}
                onFocus={e=>e.target.style.borderColor="#8b5cf6"} onBlur={e=>e.target.style.borderColor=inpBdr}/>
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", borderRadius:12, background:D?"rgba(255,255,255,0.03)":"#f8fafc", border:`1px solid ${inpBdr}`, marginBottom:16 }}>
            <div onClick={() => setForm(p=>({...p,active:!p.active}))} style={{
              width:44, height:24, borderRadius:999, position:"relative", cursor:"pointer",
              background: form.active ? "linear-gradient(135deg,#10b981,#059669)" : D?"#1f2937":"#e5e7eb",
              transition:"background 0.25s",
              boxShadow: form.active ? "0 0 8px rgba(16,185,129,0.4)" : "none",
              flexShrink:0,
            }}>
              <div style={{ position:"absolute", top:3, left:form.active?23:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left 0.25s cubic-bezier(0.34,1.56,0.64,1)", boxShadow:"0 1px 4px rgba(0,0,0,0.2)" }}/>
            </div>
            <div>
              <p style={{ margin:0, fontSize:12, fontWeight:700, color:form.active?"#10b981":textSec }}>
                {form.active ? "Active — will show to users" : "Inactive — hidden from users"}
              </p>
              <p style={{ margin:0, fontSize:10, color:textSec }}>
                {form.showFrom || form.showUntil ? "Controlled by schedule above" : "Toggle to show/hide immediately"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={() => setPreview(p=>!p)} style={{ flex:"0 0 120px", padding:"11px 0", borderRadius:12, border:`1.5px solid ${inpBdr}`, background:"transparent", color:textSec, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Eye size={13}/> {preview ? "Hide" : "Preview"}
            </button>
            <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"12px 0", borderRadius:12, border:"none", cursor:saving?"not-allowed":"pointer", background:saving?"rgba(99,99,99,0.3)":"linear-gradient(135deg,#8b5cf6,#7c3aed)", color:"#fff", fontSize:13, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:saving?"none":"0 6px 20px rgba(139,92,246,0.35)", transition:"all 0.2s" }}>
              {saving ? <><div style={{ width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",animation:"spin .7s linear infinite" }}/> Saving…</> : <><Save size={14}/> {editId ? "Update" : "Publish"}</>}
            </button>
          </div>
        </div>

        {/* Preview card */}
        {preview && (
          <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, padding:"18px", animation:"fadeIn .2s ease" }}>
            <p style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:textSec, textTransform:"uppercase", letterSpacing:".7px" }}>Preview</p>
            <AnnouncementBanner announcement={{...form, id:"preview"}} onDismiss={null} compact={false} D={D}/>
          </div>
        )}
      </div>

      {/* ── RIGHT: List ── */}
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${cardBdr}`, display:"flex", alignItems:"center", gap:10, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
            <Bell size={14} color="#8b5cf6"/>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:textPri, flex:1 }}>All Announcements</p>
            <span style={{ fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:20, background:"rgba(139,92,246,0.12)", color:"#8b5cf6", border:"1px solid rgba(139,92,246,0.25)" }}>
              {announcements.length} total
            </span>
          </div>
          <div style={{ maxHeight:600, overflowY:"auto" }}>
            {loading ? (
              <div style={{ textAlign:"center", padding:"24px 0" }}>
                <div style={{ width:20,height:20,borderRadius:"50%",border:"2px solid #e2e8f0",borderTopColor:"#8b5cf6",animation:"spin .6s linear infinite",margin:"0 auto" }}/>
              </div>
            ) : announcements.length === 0 ? (
              <div style={{ textAlign:"center", padding:"32px 0" }}>
                <Megaphone size={28} style={{ margin:"0 auto 10px",display:"block",opacity:.25,color:"#94a3b8" }}/>
                <p style={{ margin:0, fontSize:12, color:"#94a3b8" }}>No announcements yet.</p>
              </div>
            ) : announcements.map((a, idx) => {
              const tc  = ANNOUNCE_TYPES.find(t => t.id === a.type) || ANNOUNCE_TYPES[0];
              const live = isLive(a);
              return (
                <div key={a.id} style={{ padding:"14px 18px", borderBottom:idx<announcements.length-1?`1px solid ${cardBdr}`:"none", transition:"background .15s" }} onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(255,255,255,0.02)":"#fafafa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                    <div style={{ width:32,height:32,borderRadius:9,background:tc.bg,border:`1px solid ${tc.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1 }}>
                      <Megaphone size={14} color={tc.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:textPri, overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160 }}>{a.title}</p>
                        <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:20, background:tc.bg, color:tc.color, border:`1px solid ${tc.border}`, flexShrink:0 }}>{tc.label}</span>
                        <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:20, background:live?"rgba(16,185,129,0.1)":"rgba(100,116,139,0.1)", color:live?"#10b981":"#64748b", border:`1px solid ${live?"rgba(16,185,129,0.3)":"rgba(100,116,139,0.2)"}`, flexShrink:0 }}>
                          {live ? "🟢 Live" : "⚫ Inactive"}
                        </span>
                      </div>
                      <p style={{ margin:"3px 0 4px", fontSize:11, color:textSec, lineHeight:1.5, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{a.message}</p>
                      <div style={{ display:"flex", gap:8, fontSize:10, color:textSec, flexWrap:"wrap" }}>
                        <span>👥 {ANNOUNCE_AUDIENCE.find(x=>x.id===a.audience)?.label || "Everyone"}</span>
                        {a.showFrom && <span>▶ {fmtDt(a.showFrom)}</span>}
                        {a.showUntil && <span>■ {fmtDt(a.showUntil)}</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:6, marginTop:10, justifyContent:"flex-end" }}>
                    {/* Active toggle */}
                    <button onClick={() => handleToggleActive(a)} style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${a.active?"rgba(16,185,129,0.3)":"rgba(100,116,139,0.2)"}`, background:a.active?"rgba(16,185,129,0.08)":"rgba(100,116,139,0.06)", color:a.active?"#10b981":"#64748b", fontSize:10, fontWeight:700, cursor:"pointer" }}>
                      {a.active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => handleEdit(a)} style={{ padding:"4px 10px", borderRadius:7, border:"1px solid rgba(96,165,250,0.3)", background:"rgba(96,165,250,0.08)", color:"#60a5fa", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                      <Edit2 size={10}/> Edit
                    </button>
                    <button onClick={() => handleDelete(a.id)} style={{ padding:"4px 10px", borderRadius:7, border:"1px solid rgba(248,113,113,0.3)", background:"rgba(248,113,113,0.08)", color:"#f87171", fontSize:10, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                      <Trash2 size={10}/> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Announcement Banner (used in Dashboards too) ──────────────────────
export function AnnouncementBanner({ announcement: a, onDismiss, compact = true, D: isDarkProp }) {
  const tc = ANNOUNCE_TYPES.find(t => t.id === a.type) || ANNOUNCE_TYPES[0];
  const D  = isDarkProp;
  const fmtDt = (s) => s ? new Date(s).toLocaleString("en-PH",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : null;
  const until = fmtDt(a.showUntil);

  return (
    <div style={{
      borderRadius:14, overflow:"hidden",
      border:`1.5px solid ${tc.border}`,
      background: D ? `rgba(${tc.color.replace('#','').match(/.{2}/g).map(x=>parseInt(x,16)).join(',')},0.08)` : tc.bg,
      animation:"fadeIn .3s ease",
    }}>
      <div style={{ padding:compact?"10px 14px":"14px 18px", display:"flex", alignItems:"flex-start", gap:12 }}>
        {/* Icon */}
        <div style={{ width:compact?32:38, height:compact?32:38, borderRadius:compact?9:11, background:`${tc.color}20`, border:`1px solid ${tc.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
          <Megaphone size={compact?14:17} color={tc.color}/>
        </div>
        {/* Content */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <p style={{ margin:0, fontSize:compact?12:14, fontWeight:800, color:tc.color }}>{a.title}</p>
            <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:20, background:`${tc.color}15`, color:tc.color, border:`1px solid ${tc.border}` }}>{tc.label.toUpperCase()}</span>
            {until && <span style={{ fontSize:9, color:"#64748b" }}>Until {until}</span>}
          </div>
          <p style={{ margin:"4px 0 0", fontSize:compact?11:13, color:D?"#94a3b8":"#475569", lineHeight:1.6 }}>{a.message}</p>
        </div>
        {/* Dismiss */}
        {onDismiss && (
          <button onClick={onDismiss} style={{ background:"none", border:"none", cursor:"pointer", color:"#94a3b8", display:"flex", padding:2, flexShrink:0 }}>
            <X size={14}/>
          </button>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — MaintenanceAll
// ══════════════════════════════════════════════════════════════════════════════
export default function MaintenanceAll() {
  const { user, profile } = useAuth();
  const { isDark: D }     = useTheme();
  const [activeTab, setActiveTab] = useState("system");
  const [toast, setToast] = useState({ msg:"", type:"success", visible:false });

  const isSuperadmin = profile?.role === "superadmin" || user?.isSuperadmin;

  const showToast = (msg, type="success") => {
    setToast({ msg, type, visible:true });
    setTimeout(()=>setToast(p=>({...p,visible:false})), 3000);
  };

  const bg      = D ? "#080b12" : "#f3f4f6";
  const textPri = D ? "#f1f5f9" : "#111827";
  const textSec = D ? "#4b5563" : "#6b7280";

  if (!isSuperadmin) return (
    <div style={{ minHeight:"100%",display:"flex",alignItems:"center",justifyContent:"center",padding:32 }}>
      <div style={{ textAlign:"center" }}>
        <ShieldCheck size={48} style={{ color:"#ef4444",marginBottom:16 }}/>
        <h2 style={{ color:textPri,margin:"0 0 8px",fontSize:20 }}>Access Denied</h2>
        <p style={{ color:textSec,fontSize:14 }}>Superadmin only.</p>
      </div>
    </div>
  );

  const TABS = [
    { id:"system",   label:"System Control", icon:Sliders,   desc:"Module toggles & version" },
    { id:"dropdowns",    label:"Dropdown Settings", icon:Settings2, desc:"Types, statuses & options" },
    { id:"announcements", label:"Announcements",     icon:Megaphone, desc:"System & clinic notices" },
  ];

  return (
    <div style={{ minHeight:"100%", background:bg, padding:"24px 28px 60px", fontFamily:"'Nunito',system-ui,sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background:D?"linear-gradient(135deg,#1e293b,#0f172a)":"linear-gradient(135deg,#1e3a8a,#1d4ed8,#0284c7)", borderRadius:24, padding:"28px 32px", marginBottom:24, position:"relative", overflow:"hidden" }}>
        {/* decorative circles */}
        {[["−15%","30%",280,.06],["70%","−10%",200,.05],["50%","72%",160,.07]].map(([top,left,sz,op],i)=>
          <div key={i} style={{ position:"absolute",top,left,width:sz,height:sz,borderRadius:"50%",background:`rgba(255,255,255,${op})`,pointerEvents:"none" }}/>
        )}
        <div style={{ position:"relative",zIndex:1,display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16 }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:6 }}>
              <div style={{ width:44,height:44,borderRadius:14,background:"rgba(255,255,255,0.15)",border:"1.5px solid rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <Wrench size={22} color="#fff"/>
              </div>
              <div>
                <p style={{ margin:0,fontSize:11,color:"rgba(255,255,255,.6)",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px" }}>Superadmin Only</p>
                <h1 style={{ margin:0,fontSize:24,fontWeight:900,color:"#fff" }}>Maintenance Settings</h1>
              </div>
            </div>
            <p style={{ margin:0,fontSize:13,color:"rgba(255,255,255,.6)" }}>Manage module access, system version, and dropdown configurations</p>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:20,background:"rgba(249,115,22,0.2)",border:"1px solid rgba(249,115,22,0.4)" }}>
            <ShieldCheck size={14} color="#fdba74"/>
            <span style={{ fontSize:12,fontWeight:800,color:"#fdba74" }}>SUPERADMIN ACCESS</span>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex",gap:8,marginBottom:24 }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} style={{
              display:"flex",alignItems:"center",gap:10,
              padding:"12px 20px",borderRadius:14,border:"none",cursor:"pointer",
              background: isActive
                ? D?"rgba(255,255,255,0.08)":"#fff"
                : D?"rgba(255,255,255,0.03)":"rgba(255,255,255,0.6)",
              boxShadow: isActive ? D?"0 0 0 1.5px rgba(255,255,255,0.12)":"0 0 0 1.5px #e2e8f0, 0 2px 8px rgba(0,0,0,0.06)" : "none",
              transition:"all 0.2s",
            }}>
              <div style={{ width:32,height:32,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",background: isActive?"linear-gradient(135deg,#f97316,#ef4444)":"transparent",transition:"background 0.2s" }}>
                <Icon size={16} color={isActive?"#fff":D?"#4b5563":"#94a3b8"}/>
              </div>
              <div style={{ textAlign:"left" }}>
                <p style={{ margin:0,fontSize:13,fontWeight:800,color:isActive?D?"#f1f5f9":"#111827":D?"#4b5563":"#94a3b8",transition:"color 0.2s" }}>{tab.label}</p>
                <p style={{ margin:0,fontSize:10,color:D?"#374151":"#cbd5e1" }}>{tab.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div style={{ animation:"fadeIn .2s ease" }} key={activeTab}>
        {activeTab==="system"    && <TabSystem D={D} showToast={showToast}/>}
        {activeTab==="dropdowns"     && <DropdownSettingsTab D={D}/>}
        {activeTab==="announcements" && <AnnouncementTab D={D} showToast={showToast}/>}
      </div>

      <Toast msg={toast.msg} type={toast.type} visible={toast.visible}/>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}
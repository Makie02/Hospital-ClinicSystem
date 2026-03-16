// src/components/Patients.jsx
import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, update, remove } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Search, Plus, X, ChevronDown, User, Phone,
  MapPin, Droplets, AlertCircle, Edit2, Trash2,
  Activity, Calendar, Clock, Check,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const BLOOD_TYPES  = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const GENDERS      = ["Male","Female","Other"];
const CIVIL_STATUS = ["Single","Married","Widowed","Separated"];
const STATUS_OPTS  = ["Active","Inactive","Critical","Discharged"];

const AVATAR_COLORS = [
  "#2563eb","#7c3aed","#059669","#d97706",
  "#dc2626","#0891b2","#c026d3","#4f46e5",
];

const EMPTY_FORM = {
  firstName:"", lastName:"", age:"", gender:"", civilStatus:"",
  contact:"", address:"", bloodType:"", allergies:"",
  emergencyContact:"", emergencyPhone:"", status:"Active",
};

const STATUS_META = {
  Active:    { hex:"#34d399" },
  Inactive:  { hex:"#94a3b8" },
  Critical:  { hex:"#f87171" },
  Discharged:{ hex:"#fbbf24" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fullName   = (p) => `${p.firstName} ${p.lastName}`.trim();
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
const fmtDate    = (ts) => ts
  ? new Date(ts).toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric" })
  : "—";

// ─── Reusable Field Components ────────────────────────────────────────────────
const TInput = ({ D, ...props }) => (
  <input
    {...props}
    className={`w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all border
      focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
      ${D ? "bg-white/5 border-white/10 text-gray-200 placeholder-gray-600"
          : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"}`}
  />
);

// ─── Custom Dropdown (no native <select>, fully dark-mode safe) ───────────────
function CDropdown({ D, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef    = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected  = options.find(o => (o.value ?? o) === value);
  const label     = selected ? (selected.label ?? selected) : (placeholder ?? "Select…");
  const menuBg    = D ? "#161b27" : "#ffffff";
  const menuBorder= D ? "rgba(255,255,255,0.1)" : "#e2e8f0";
  const hoverBg   = D ? "rgba(99,102,241,0.12)" : "#f0f4ff";
  const textColor = D ? "#e2e8f0" : "#1e293b";
  const mutedColor= D ? "#475569" : "#94a3b8";

  return (
    <div ref={containerRef} style={{ position:"relative", userSelect:"none" }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          background: D ? "rgba(255,255,255,0.06)" : "#f8fafc",
          border: `1px solid ${open ? "#3b82f6" : D ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`,
          borderRadius: 12, padding: "10px 14px", cursor: "pointer",
          boxShadow: open ? "0 0 0 3px rgba(59,130,246,0.15)" : "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
      >
        <span style={{ fontSize: 13, color: value ? textColor : mutedColor }}>{label}</span>
        <ChevronDown size={13} style={{ color: mutedColor, flexShrink: 0, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}/>
      </div>

      {/* Menu */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 999,
          background: menuBg, border: `1px solid ${menuBorder}`, borderRadius: 14,
          boxShadow: D
            ? "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)",
          maxHeight: 220, overflowY: "auto", padding: "6px",
          animation: "cdropIn 0.15s cubic-bezier(.16,1,.3,1)",
        }}>
          <style>{`@keyframes cdropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {options.map((o, i) => {
            const val       = o.value ?? o;
            const lbl       = o.label ?? o;
            const isSelected= val === value;
            return (
              <div key={i}
                onClick={() => { onChange(val); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "9px 12px", borderRadius: 9, cursor: "pointer", fontSize: 13,
                  color: isSelected ? "#818cf8" : textColor,
                  background: isSelected ? "rgba(99,102,241,0.15)" : "transparent",
                  fontWeight: isSelected ? 600 : 400, transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
              >
                {lbl}
                {isSelected && <Check size={13} style={{ color: "#818cf8", flexShrink: 0 }}/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const FLabel = ({ D, icon: Icon, children }) => (
  <label className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${D?"text-gray-500":"text-gray-400"}`}>
    {Icon && <Icon size={10} className="inline mr-1.5 mb-px"/>}
    {children}
  </label>
);

// ─── Register Modal ───────────────────────────────────────────────────────────
function PatientModal({ open, onClose, onSave, editing, D }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (open) { setForm(editing ? { ...EMPTY_FORM, ...editing } : EMPTY_FORM); setError(""); }
  }, [open, editing]);

  if (!open) return null;

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim())  return "Last name is required.";
    if (!form.age || isNaN(form.age) || +form.age < 0 || +form.age > 150) return "Enter a valid age (0–150).";
    if (!form.gender)    return "Please select a gender.";
    if (!form.bloodType) return "Please select a blood type.";
    return "";
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { setError("Failed to save. Check your connection."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,.75)", backdropFilter:"blur(8px)" }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border
          ${D ? "bg-gray-950 border-white/10" : "bg-white border-gray-200"}`}>

        <div className="h-[3px] w-full rounded-t-3xl bg-gradient-to-r from-blue-500 via-violet-500 to-cyan-400"/>

        <div className="p-7">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className={`text-xl font-bold ${D?"text-white":"text-gray-900"}`}>
                {editing ? "Edit Patient" : "Register New Patient"}
              </h2>
              <p className={`text-xs mt-1 ${D?"text-gray-500":"text-gray-400"}`}>
                {editing ? `Editing: ${fullName(editing)}` : "Fill in the patient information below"}
              </p>
            </div>
            <button onClick={onClose}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors
                ${D?"hover:bg-white/10 text-gray-500":"hover:bg-gray-100 text-gray-400"}`}>
              <X size={16}/>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 mb-5 rounded-xl
              bg-rose-500/10 border border-rose-500/25 text-rose-400 text-sm">
              <AlertCircle size={14} className="flex-shrink-0"/> {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <FLabel D={D} icon={User}>First Name</FLabel>
                <TInput D={D} placeholder="e.g. Maria" value={form.firstName} onChange={set("firstName")}/>
              </div>
              <div>
                <FLabel D={D} icon={User}>Last Name</FLabel>
                <TInput D={D} placeholder="e.g. Santos" value={form.lastName} onChange={set("lastName")}/>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <FLabel D={D}>Age</FLabel>
                <TInput D={D} type="number" placeholder="25" min="0" max="150" value={form.age} onChange={set("age")}/>
              </div>
              <div>
                <FLabel D={D}>Gender</FLabel>
                <CDropdown D={D} value={form.gender} onChange={v => setForm(p => ({...p, gender: v}))}
                  options={["", ...GENDERS].map(g => ({ value: g, label: g || "Select" }))}
                  placeholder="Select"/>
              </div>
              <div>
                <FLabel D={D}>Civil Status</FLabel>
                <CDropdown D={D} value={form.civilStatus} onChange={v => setForm(p => ({...p, civilStatus: v}))}
                  options={["", ...CIVIL_STATUS].map(c => ({ value: c, label: c || "Select" }))}
                  placeholder="Select"/>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <FLabel D={D} icon={Droplets}>Blood Type</FLabel>
                <CDropdown D={D} value={form.bloodType} onChange={v => setForm(p => ({...p, bloodType: v}))}
                  options={["", ...BLOOD_TYPES].map(b => ({ value: b, label: b || "Select" }))}
                  placeholder="Select"/>
              </div>
              <div>
                <FLabel D={D} icon={Phone}>Contact</FLabel>
                <TInput D={D} placeholder="09XXXXXXXXX" value={form.contact} onChange={set("contact")}/>
              </div>
              <div>
                <FLabel D={D}>Status</FLabel>
                <CDropdown D={D} value={form.status} onChange={v => setForm(p => ({...p, status: v}))}
                  options={STATUS_OPTS}/>
              </div>
            </div>

            <div>
              <FLabel D={D} icon={MapPin}>Address</FLabel>
              <TInput D={D} placeholder="Street, Barangay, City, Province" value={form.address} onChange={set("address")}/>
            </div>

            <div>
              <FLabel D={D} icon={AlertCircle}>Allergies (type "None" if N/A)</FLabel>
              <TInput D={D} placeholder="e.g. Penicillin, Aspirin, Ibuprofen" value={form.allergies} onChange={set("allergies")}/>
            </div>

            <div className={`grid grid-cols-2 gap-4 p-4 rounded-2xl border ${D?"border-white/8 bg-white/3":"border-gray-100 bg-gray-50"}`}>
              <div className="col-span-2">
                <p className={`text-[11px] font-bold uppercase tracking-wider mb-3 ${D?"text-gray-500":"text-gray-400"}`}>
                  Emergency Contact
                </p>
              </div>
              <div>
                <FLabel D={D}>Contact Name</FLabel>
                <TInput D={D} placeholder="Full name" value={form.emergencyContact} onChange={set("emergencyContact")}/>
              </div>
              <div>
                <FLabel D={D}>Contact Number</FLabel>
                <TInput D={D} placeholder="09XXXXXXXXX" value={form.emergencyPhone} onChange={set("emergencyPhone")}/>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-7">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white
                bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600
                transition-all active:scale-[.98] shadow-lg shadow-blue-500/20 disabled:opacity-60">
              {saving ? "Saving…" : editing ? "Update Patient" : "Register Patient"}
            </button>
            <button onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors
                ${D ? "bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-600"}`}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Info Row (line-style) ────────────────────────────────────────────────────
function InfoRow({ label, value, D, last = false }) {
  if (!value) return null;
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${!last ? `border-b ${D ? "border-white/5" : "border-gray-100"}` : ""}`}>
      <span className={`text-xs ${D ? "text-gray-500" : "text-gray-400"}`}>{label}</span>
      <span className={`text-xs font-medium text-right max-w-[58%] leading-snug ${D ? "text-gray-200" : "text-gray-700"}`}>{value}</span>
    </div>
  );
}

// ─── Info Section ─────────────────────────────────────────────────────────────
function InfoSection({ title, rows, D }) {
  const validRows = rows.filter(([, v]) => v);
  if (!validRows.length) return null;
  return (
    <div className={`rounded-xl overflow-hidden border ${D ? "border-white/8" : "border-gray-100"}`}>
      {/* Section header */}
      <div className={`px-4 py-2 border-b text-[10px] font-bold uppercase tracking-widest
        ${D ? "bg-white/[0.03] border-white/8 text-gray-500" : "bg-gray-50 border-gray-100 text-gray-400"}`}>
        {title}
      </div>
      {validRows.map(([label, value], i) => (
        <InfoRow
          key={label}
          label={label}
          value={value}
          D={D}
          last={i === validRows.length - 1}
        />
      ))}
    </div>
  );
}

// ─── Patient Drawer ───────────────────────────────────────────────────────────
function PatientDrawer({ patient, onClose, onEdit, onDelete, D }) {
  if (!patient) return null;

  const name  = fullName(patient);
  const sm    = STATUS_META[patient.status] || STATUS_META.Active;
  const color = avatarColor(name);

  return (
    <div
      className="fixed inset-0 z-[250] flex justify-end"
      style={{ background: "rgba(0,0,0,.5)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`w-[360px] h-full flex flex-col border-l shadow-2xl
          ${D ? "bg-gray-950 border-white/10" : "bg-white border-gray-200"}`}
        style={{ animation: "slideIn .26s cubic-bezier(.16,1,.3,1)" }}
      >
        {/* ── Header ── */}
        <div className="relative flex-shrink-0 overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}dd, ${color}99)` }}>
          {/* subtle radial highlight */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 80% 0%, rgba(255,255,255,.18) 0%, transparent 65%)" }}/>

          {/* Close */}
          <button onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-black/20 hover:bg-black/35 flex items-center justify-center text-white transition-colors">
            <X size={13}/>
          </button>

          <div className="px-5 pt-6 pb-5">
            {/* Avatar */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-3 border-2 border-white/25"
              style={{ background: "rgba(255,255,255,.15)", backdropFilter: "blur(4px)" }}
            >
              {name[0]}
            </div>

            {/* Name + ID */}
            <h2 className="text-lg font-bold text-white leading-tight">{name}</h2>
            <p className="text-white/50 text-[11px] font-mono mt-0.5">{patient.patientId}</p>

            {/* Status badge */}
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold
                bg-white/15 text-white border border-white/20">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80"/>
                {patient.status}
              </span>
              {patient.bloodType && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold
                  bg-white/15 text-white border border-white/20">
                  <Droplets size={9}/> {patient.bloodType}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Info Sections (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <InfoSection D={D} title="Personal Info" rows={[
            ["Age",          patient.age ? `${patient.age} years old` : null],
            ["Gender",       patient.gender],
            ["Civil Status", patient.civilStatus],
          ]}/>

          <InfoSection D={D} title="Contact" rows={[
            ["Phone",   patient.contact],
            ["Address", patient.address],
          ]}/>

          <InfoSection D={D} title="Emergency Contact" rows={[
            ["Contact Name",   patient.emergencyContact],
            ["Contact Number", patient.emergencyPhone],
          ]}/>

          <InfoSection D={D} title="Medical" rows={[
            ["Allergies", patient.allergies || "None"],
          ]}/>

          <InfoSection D={D} title="Record" rows={[
            ["Date Registered", fmtDate(patient.createdAt)],
            ["Last Updated",    fmtDate(patient.updatedAt)],
          ]}/>
        </div>

        {/* ── Actions ── */}
        <div className={`flex gap-2.5 p-4 border-t flex-shrink-0 ${D ? "border-white/8" : "border-gray-100"}`}>
          <button
            onClick={() => { onEdit(patient); onClose(); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white
              bg-blue-600 hover:bg-blue-500 transition-colors active:scale-[.98]"
          >
            <Edit2 size={13}/> Edit Patient
          </button>
          <button
            onClick={() => { if (window.confirm(`Delete ${name}?`)) { onDelete(patient.id); onClose(); } }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold
              transition-colors active:scale-[.98] border
              ${D ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200"}`}
          >
            <Trash2 size={13}/> Delete
          </button>
        </div>
      </div>

      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Patients() {
  const { isDark: D } = useTheme();
  const [patients, setPatients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filterSt, setFilterSt] = useState("All");
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [drawer,   setDrawer]   = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db, "patients"), (snap) => {
      const data = snap.val();
      setPatients(data
        ? Object.entries(data).map(([id,v]) => ({ id,...v })).sort((a,b) => (b.createdAt||0)-(a.createdAt||0))
        : []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const genId = () => `P-${String(patients.length + 1).padStart(4,"0")}`;

  const savePatient = async (form) => {
    const now = Date.now();
    if (editing) {
      await update(ref(db, `patients/${editing.id}`), { ...form, updatedAt: now });
    } else {
      await push(ref(db, "patients"), { ...form, patientId: genId(), createdAt: now, updatedAt: now });
    }
  };

  const deletePatient = (id) => remove(ref(db, `patients/${id}`));

  const counts = STATUS_OPTS.reduce((a,s) => ({ ...a, [s]: patients.filter(p => p.status===s).length }), {});

  const filtered = patients.filter(p => {
    const n = fullName(p).toLowerCase();
    return (n.includes(search.toLowerCase()) || (p.patientId||"").toLowerCase().includes(search.toLowerCase()) || (p.contact||"").includes(search))
      && (filterSt === "All" || p.status === filterSt);
  });

  return (
    <div className="p-6 space-y-5">

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-5 gap-4">
        {[
          {
            label: "Total Patients", value: patients.length,
            gradient: ["#3b82f6","#6366f1"], glow: "rgba(99,102,241,0.3)",
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
          },
          {
            label: "Active", value: counts.Active||0,
            gradient: ["#10b981","#059669"], glow: "rgba(16,185,129,0.3)",
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
          },
          {
            label: "Inactive", value: counts.Inactive||0,
            gradient: ["#64748b","#475569"], glow: "rgba(100,116,139,0.3)",
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>,
          },
          {
            label: "Critical", value: counts.Critical||0,
            gradient: ["#ef4444","#dc2626"], glow: "rgba(239,68,68,0.3)",
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
          },
          {
            label: "Discharged", value: counts.Discharged||0,
            gradient: ["#f59e0b","#d97706"], glow: "rgba(245,158,11,0.3)",
            icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
          },
        ].map(s => (
          <div key={s.label}
            style={{
              background: D ? "#0d1117" : "#ffffff",
              border: `1px solid ${D ? "rgba(255,255,255,0.07)" : "#f1f5f9"}`,
              borderRadius: 20, padding: "20px 20px 18px",
              position: "relative", overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
              cursor: "default",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 16px 40px ${s.glow}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
          >
            {/* Gradient top bar */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, borderRadius:"20px 20px 0 0", background:`linear-gradient(90deg,${s.gradient[0]},${s.gradient[1]})` }}/>
            {/* Glow orb */}
            <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle,${s.glow},transparent 70%)`, pointerEvents:"none" }}/>
            {/* Icon */}
            <div style={{ width:36, height:36, borderRadius:10, background:`linear-gradient(135deg,${s.gradient[0]},${s.gradient[1]})`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 6px 16px ${s.glow}`, marginBottom:14 }}>
              {s.icon}
            </div>
            {/* Number */}
            <p style={{ margin:0, fontSize:30, fontWeight:800, background:`linear-gradient(135deg,${s.gradient[0]},${s.gradient[1]})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              {s.value}
            </p>
            {/* Label */}
            <p style={{ margin:"4px 0 0", fontSize:12, color: D?"#334155":"#94a3b8", fontWeight:500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, background: D?"#0d1117":"#ffffff", border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`, borderRadius:14, padding:"10px 16px" }}>
          <Search size={15} style={{ color: D?"#334155":"#94a3b8", flexShrink:0 }}/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, patient ID, or contact number…"
            style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color: D?"#e2e8f0":"#1e293b" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", display:"flex" }}>
              <X size={13}/>
            </button>
          )}
        </div>

        <div style={{ width:148 }}>
          <CDropdown D={D} value={filterSt} onChange={setFilterSt}
            options={["All", ...STATUS_OPTS].map(s => ({ value:s, label: s==="All" ? "All Status" : s }))}/>
        </div>

        <button onClick={() => { setEditing(null); setModal(true); }} style={{
          display:"flex", alignItems:"center", gap:8,
          background:"linear-gradient(135deg,#3b82f6,#6366f1)",
          border:"none", borderRadius:14, padding:"10px 20px",
          color:"white", fontSize:13, fontWeight:700, cursor:"pointer",
          boxShadow:"0 8px 20px rgba(99,102,241,0.35)", whiteSpace:"nowrap",
        }}>
          <Plus size={16}/> Register Patient
        </button>
      </div>

      {/* ── Table ── */}
      <div style={{ background: D?"#0d1117":"#ffffff", border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`, borderRadius:20, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, background: D?"rgba(255,255,255,0.02)":"#fafafa" }}>
              {["Patient ID","Name","Age / Gender","Contact","Blood","Allergies","Status","Registered","Actions"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"13px 16px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color: D?"#334155":"#94a3b8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding:60, textAlign:"center" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", border:"2px solid #3b82f6", borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }}/>
                  <p style={{ color:"#475569", fontSize:13, margin:0 }}>Loading patients…</p>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding:60, textAlign:"center" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
                  <div style={{ width:52, height:52, borderRadius:16, background: D?"rgba(255,255,255,0.05)":"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={D?"#334155":"#94a3b8"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{width:22,height:22}}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <p style={{ color: D?"#475569":"#64748b", fontSize:14, fontWeight:600, margin:0 }}>No patients found</p>
                  <p style={{ color: D?"#334155":"#94a3b8", fontSize:12, margin:0 }}>Try adjusting your search or filter</p>
                </div>
              </td></tr>
            ) : filtered.map((p, idx) => {
              const name  = fullName(p);
              const sm    = STATUS_META[p.status] || STATUS_META.Active;
              const color = avatarColor(name);
              const isEven = idx % 2 === 0;
              return (
                <tr key={p.id}
                  onClick={() => setDrawer(p)}
                  style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`, transition:"background 0.15s", cursor:"pointer",
                    background: D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#ffffff":"#fafffe") }}
                  onMouseEnter={e => e.currentTarget.style.background = D?"rgba(99,102,241,0.06)":"#f0f4ff"}
                  onMouseLeave={e => e.currentTarget.style.background = D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#ffffff":"#fafffe")}
                >
                  <td style={{ padding:"13px 16px", fontFamily:"monospace", fontSize:11, color: D?"#334155":"#94a3b8" }}>{p.patientId}</td>
                  <td style={{ padding:"13px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:30, height:30, borderRadius:9, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>
                        {name[0]}
                      </div>
                      <span style={{ fontSize:13, fontWeight:600, color: D?"#e2e8f0":"#0f172a" }}>{name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"13px 16px", fontSize:12, color: D?"#64748b":"#64748b" }}>{p.age} / {p.gender}</td>
                  <td style={{ padding:"13px 16px", fontSize:12, color: D?"#475569":"#64748b" }}>{p.contact||"—"}</td>
                  <td style={{ padding:"13px 16px" }}>
                    {p.bloodType
                      ? <span style={{ padding:"3px 8px", borderRadius:7, fontSize:11, fontWeight:700, background:"rgba(248,113,113,0.12)", color:"#f87171", border:"1px solid rgba(248,113,113,0.2)" }}>{p.bloodType}</span>
                      : <span style={{ color: D?"#334155":"#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding:"13px 16px", fontSize:11, color: D?"#334155":"#94a3b8", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.allergies||"None"}</td>
                  <td style={{ padding:"13px 16px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:sm.hex+"22", color:sm.hex, border:`1px solid ${sm.hex}44` }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:sm.hex, flexShrink:0 }}/>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding:"13px 16px", fontSize:12, color: D?"#334155":"#94a3b8" }}>{fmtDate(p.createdAt)}</td>
                  <td style={{ padding:"13px 16px" }} onClick={e => e.stopPropagation()}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={() => { setEditing(p); setModal(true); }}
                        style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, background:"rgba(59,130,246,0.1)", border:"1px solid rgba(59,130,246,0.2)", color:"#60a5fa" }}>
                        <Edit2 size={10}/> Edit
                      </button>
                      <button onClick={() => { if(window.confirm(`Delete ${name}?`)) deletePatient(p.id); }}
                        style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", display:"flex", alignItems:"center" }}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, display:"flex", justifyContent:"space-between" }}>
          <span style={{ fontSize:12, color:"#334155" }}>
            Showing <span style={{ fontWeight:700, color: D?"#94a3b8":"#475569" }}>{filtered.length}</span> of <span style={{ fontWeight:700, color: D?"#94a3b8":"#475569" }}>{patients.length}</span> patients
          </span>
        </div>
      </div>

      <PatientModal open={modal} onClose={() => { setModal(false); setEditing(null); }} onSave={savePatient} editing={editing} D={D}/>
      <PatientDrawer patient={drawer} onClose={() => setDrawer(null)} onEdit={p => { setEditing(p); setModal(true); }} onDelete={deletePatient} D={D}/>
    </div>
  );
}
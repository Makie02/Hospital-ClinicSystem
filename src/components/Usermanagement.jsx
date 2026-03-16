// src/components/UserManagement.jsx
import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, update, remove } from "firebase/database";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { db, auth } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Plus, X, Search, Edit2, Trash2, ChevronDown, Check,
  AlertCircle, Phone, Mail, Shield, ShieldCheck, ShieldAlert,
  User, Eye, EyeOff, RefreshCw, Lock, Unlock,
  LayoutDashboard, Users, Calendar, Stethoscope,
  FileText, Pill, TestTube, CreditCard, Settings,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = ["superadmin", "admin", "staff"];

const ROLE_META = {
  superadmin: {
    label: "Super Admin",
    hex:   "#64748b",
    grad:  ["#475569","#334155"],
    glow:  "rgba(71,85,105,0.25)",
    icon:  ShieldAlert,
    desc:  "Full access to all modules including user management",
  },
  admin: {
    label: "Admin",
    hex:   "#3b82f6",
    grad:  ["#2563eb","#1d4ed8"],
    glow:  "rgba(37,99,235,0.25)",
    icon:  ShieldCheck,
    desc:  "Can manage patients, appointments, doctors and records",
  },
  staff: {
    label: "Staff",
    hex:   "#0d9488",
    grad:  ["#0d9488","#0f766e"],
    glow:  "rgba(13,148,136,0.25)",
    icon:  Shield,
    desc:  "Limited access based on assigned modules",
  },
};

const MODULES = [
  { id:"dashboard",    label:"Dashboard",       icon: LayoutDashboard },
  { id:"patients",     label:"Patients",        icon: Users           },
  { id:"appointments", label:"Appointments",    icon: Calendar        },
  { id:"doctors",      label:"Doctors",         icon: Stethoscope     },
  { id:"records",      label:"Medical Records", icon: FileText        },
  { id:"pharmacy",     label:"Pharmacy",        icon: Pill            },
  { id:"lab",          label:"Laboratory",      icon: TestTube        },
  { id:"billing",      label:"Billing",         icon: CreditCard      },
  { id:"settings",     label:"Settings",        icon: Settings        },
  { id:"users",        label:"User Management", icon: Shield          },
];

const DEFAULT_ACCESS = {
  superadmin: MODULES.map(m => m.id),
  admin:      ["dashboard","patients","appointments","doctors","records","pharmacy","lab","billing","settings"],
  staff:      ["dashboard","patients","appointments"],
};

const STATUS_OPTS = ["Active","Suspended"];
const STATUS_META = {
  Active:    { hex:"#22c55e" },
  Suspended: { hex:"#ef4444" },
};

const AVATAR_COLORS = [
  "#2563eb","#0d9488","#475569","#d97706",
  "#dc2626","#0891b2","#6b7280","#1d4ed8",
];

const EMPTY_FORM = {
  firstName:"", lastName:"", email:"", password:"",
  role:"staff", status:"Active",
  linkedDoctorId:"", linkedDoctorName:"",
  modules: [...DEFAULT_ACCESS.staff],
  contact:"",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fullName    = (u) => `${u.firstName} ${u.lastName}`.trim();
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0)||0) % AVATAR_COLORS.length];
const fmtDate     = (ts) => ts ? new Date(ts).toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric" }) : "—";

// ─── Custom Dropdown ──────────────────────────────────────────────────────────
function CDropdown({ D, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref2 = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref2.current && !ref2.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected   = options.find(o => (o.value ?? o) === value);
  const label      = selected ? (selected.label ?? selected) : (placeholder ?? "Select…");
  const menuBg     = D ? "#161b27" : "#ffffff";
  const menuBorder = D ? "rgba(255,255,255,0.1)" : "#e2e8f0";
  const hoverBg    = D ? "rgba(255,255,255,0.06)" : "#f1f5f9";
  const textColor  = D ? "#e2e8f0" : "#1e293b";
  const mutedColor = D ? "#475569" : "#94a3b8";
  return (
    <div ref={ref2} style={{ position:"relative", userSelect:"none" }}>
      <div onClick={() => setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background: D?"rgba(255,255,255,0.06)":"#f8fafc", border:`1px solid ${open?"#2563eb":D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:12, padding:"10px 14px", cursor:"pointer", boxShadow: open?"0 0 0 3px rgba(37,99,235,0.15)":"none", transition:"all 0.2s" }}>
        <span style={{ fontSize:13, color: value ? textColor : mutedColor }}>{label}</span>
        <ChevronDown size={13} style={{ color:mutedColor, flexShrink:0, transform: open?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s" }}/>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:999, background:menuBg, border:`1px solid ${menuBorder}`, borderRadius:14, boxShadow: D?"0 20px 60px rgba(0,0,0,0.7)":"0 12px 40px rgba(0,0,0,0.15)", maxHeight:220, overflowY:"auto", padding:"6px", animation:"cdropIn 0.15s cubic-bezier(.16,1,.3,1)" }}>
          <style>{`@keyframes cdropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {options.map((o, i) => {
            const val=o.value??o; const lbl=o.label??o; const isSel=val===value;
            return (
              <div key={i} onClick={() => { onChange(val); setOpen(false); }} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:9, cursor:"pointer", fontSize:13, color: isSel?"#2563eb":textColor, background: isSel?"rgba(37,99,235,0.1)":"transparent", fontWeight: isSel?600:400, transition:"background 0.1s" }}
                onMouseEnter={e=>{ if(!isSel) e.currentTarget.style.background=hoverBg; }}
                onMouseLeave={e=>{ if(!isSel) e.currentTarget.style.background="transparent"; }}>
                {lbl}{isSel && <Check size={13} style={{ color:"#2563eb" }}/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FLabel({ D, icon: Icon, children }) {
  return (
    <label style={{ display:"block", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6, color: D?"#475569":"#94a3b8" }}>
      {Icon && <Icon size={10} style={{ display:"inline", marginRight:5, verticalAlign:"middle" }}/>}
      {children}
    </label>
  );
}

function SInput({ D, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input {...props} style={{ width:"100%", boxSizing:"border-box", background: D?"rgba(255,255,255,0.06)":"#f8fafc", border:`1px solid ${focused?"#2563eb":D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:12, padding:"10px 14px", color: D?"#e2e8f0":"#1e293b", fontSize:13, outline:"none", boxShadow: focused?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s", ...props.style }}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}/>
  );
}

// ─── Module Access Picker ─────────────────────────────────────────────────────
function ModulePicker({ D, selectedModules, onChange, role }) {
  const toggle = (id) => {
    if (role === "superadmin") return;
    if (selectedModules.includes(id)) onChange(selectedModules.filter(m=>m!==id));
    else onChange([...selectedModules, id]);
  };
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
      {MODULES.map(mod => {
        const Icon     = mod.icon;
        const isActive = selectedModules.includes(mod.id);
        const locked   = role === "superadmin";
        return (
          <div key={mod.id} onClick={() => toggle(mod.id)} style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"10px 12px", borderRadius:12, cursor: locked?"default":"pointer",
            background: isActive ? (D?"rgba(37,99,235,0.1)":"#eff6ff") : (D?"rgba(255,255,255,0.03)":"#f8fafc"),
            border:`1px solid ${isActive ? (D?"rgba(37,99,235,0.25)":"#bfdbfe") : (D?"rgba(255,255,255,0.07)":"#e2e8f0")}`,
            transition:"all 0.15s", opacity: locked ? 0.8 : 1,
          }}>
            <div style={{ width:28, height:28, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", background: isActive?"linear-gradient(135deg,#2563eb,#1d4ed8)":"transparent", border:`1px solid ${isActive?"transparent":D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, flexShrink:0 }}>
              <Icon size={13} style={{ color: isActive?"#fff":(D?"#475569":"#94a3b8") }}/>
            </div>
            <span style={{ fontSize:12, fontWeight: isActive?600:400, color: isActive?(D?"#60a5fa":"#1d4ed8"):(D?"#475569":"#64748b"), flex:1 }}>{mod.label}</span>
            {isActive && <Check size={11} style={{ color: D?"#60a5fa":"#2563eb", flexShrink:0 }}/>}
          </div>
        );
      })}
    </div>
  );
}

// ─── User Modal ───────────────────────────────────────────────────────────────
function UserModal({ open, onClose, onSave, editing, doctors, D }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...EMPTY_FORM, ...editing, password:"" } : { ...EMPTY_FORM });
      setError(""); setShowPw(false);
    }
  }, [open, editing]);

  if (!open) return null;

  const set  = (k) => (v) => setForm(p => ({ ...p, [k]: v }));
  const setE = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleRoleChange = (role) => {
    setForm(p => ({ ...p, role, modules: [...DEFAULT_ACCESS[role]] }));
  };

  const validate = () => {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim())  return "Last name is required.";
    if (!form.email.trim())     return "Email is required.";
    if (!editing && !form.password) return "Password is required for new users.";
    if (!editing && form.password.length < 6) return "Password must be at least 6 characters.";
    return "";
  };

  const handleSave = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setSaving(true);
    try { await onSave(form, editing); onClose(); }
    catch(e) { setError(e.message || "Failed to save. Check your connection."); }
    finally { setSaving(false); }
  };

  const cardBg = D ? "#0d1117" : "#ffffff";
  const border = D ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const rm     = ROLE_META[form.role];

  const doctorOpts = [
    { value:"", label:"— None —" },
    ...doctors.map(d => ({ value:d.id, label:`Dr. ${d.firstName} ${d.lastName} (${d.specialization})` })),
  ];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:640, maxHeight:"93vh", overflowY:"auto", background:cardBg, border:`1px solid ${border}`, borderRadius:24, boxShadow:"0 40px 100px rgba(0,0,0,0.4)" }}>

        <div style={{ height:3, borderRadius:"24px 24px 0 0", background:`linear-gradient(90deg,${rm.grad[0]},${rm.grad[1]})` }}/>

        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color: D?"#f1f5f9":"#0f172a" }}>
                {editing ? "Edit User" : "Create New User"}
              </h2>
              <p style={{ margin:"4px 0 0", fontSize:12, color: D?"#475569":"#94a3b8" }}>
                {editing ? `Editing: ${fullName(editing)}` : "Set up account credentials and access permissions"}
              </p>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color: D?"#475569":"#94a3b8", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <X size={16}/>
            </button>
          </div>

          {error && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:18, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}>
              <AlertCircle size={14}/> {error}
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

            {/* Role picker */}
            <div>
              <FLabel D={D} icon={Shield}>Role</FLabel>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                {ROLES.map(r => {
                  const rm2 = ROLE_META[r];
                  const Icon2 = rm2.icon;
                  const isSel = form.role === r;
                  return (
                    <div key={r} onClick={() => handleRoleChange(r)} style={{
                      padding:"14px 12px", borderRadius:14, cursor:"pointer", textAlign:"center",
                      background: isSel ? `${rm2.grad[0]}15` : (D?"rgba(255,255,255,0.03)":"#f8fafc"),
                      border:`1.5px solid ${isSel ? rm2.grad[0] : (D?"rgba(255,255,255,0.08)":"#e2e8f0")}`,
                      boxShadow: isSel ? `0 0 0 3px ${rm2.grad[0]}20` : "none",
                      transition:"all 0.2s",
                    }}>
                      <div style={{ width:36, height:36, borderRadius:10, margin:"0 auto 8px", display:"flex", alignItems:"center", justifyContent:"center", background: isSel?`linear-gradient(135deg,${rm2.grad[0]},${rm2.grad[1]})`:( D?"rgba(255,255,255,0.07)":"#f1f5f9") }}>
                        <Icon2 size={16} style={{ color: isSel?"#fff":(D?"#475569":"#94a3b8") }}/>
                      </div>
                      <p style={{ margin:0, fontSize:13, fontWeight:700, color: isSel?rm2.hex:(D?"#64748b":"#475569") }}>{rm2.label}</p>
                      <p style={{ margin:"3px 0 0", fontSize:10, color: D?"#334155":"#94a3b8", lineHeight:1.4 }}>{rm2.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={User}>First Name</FLabel><SInput D={D} placeholder="e.g. Maria" value={form.firstName} onChange={setE("firstName")}/></div>
              <div><FLabel D={D} icon={User}>Last Name</FLabel><SInput D={D} placeholder="e.g. Santos" value={form.lastName} onChange={setE("lastName")}/></div>
            </div>

            {/* Email + Contact */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={Mail}>Email</FLabel><SInput D={D} type="email" placeholder="user@clinic.com" value={form.email} onChange={setE("email")} disabled={!!editing} style={{ opacity: editing?0.6:1 }}/></div>
              <div><FLabel D={D} icon={Phone}>Contact</FLabel><SInput D={D} placeholder="09XXXXXXXXX" value={form.contact} onChange={setE("contact")}/></div>
            </div>

            {/* Password */}
            {!editing && (
              <div>
                <FLabel D={D} icon={Lock}>Password</FLabel>
                <div style={{ position:"relative" }}>
                  <SInput D={D} type={showPw?"text":"password"} placeholder="Min. 6 characters" value={form.password} onChange={setE("password")} style={{ paddingRight:44 }}/>
                  <button onClick={()=>setShowPw(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color: D?"#475569":"#94a3b8", display:"flex" }}>
                    {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                  </button>
                </div>
              </div>
            )}

            {/* Status + Doctor */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <FLabel D={D}>Account Status</FLabel>
                <CDropdown D={D} value={form.status} onChange={set("status")} options={STATUS_OPTS}/>
              </div>
              <div>
                <FLabel D={D} icon={Stethoscope}>Link to Doctor (optional)</FLabel>
                <CDropdown D={D} value={form.linkedDoctorId} onChange={(v) => {
                  const doc = doctors.find(d=>d.id===v);
                  setForm(p => ({ ...p, linkedDoctorId:v, linkedDoctorName: doc ? `Dr. ${doc.firstName} ${doc.lastName}` : "" }));
                }} options={doctorOpts} placeholder="— None —"/>
              </div>
            </div>

            {/* Module Access */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <FLabel D={D} icon={LayoutDashboard}>Module Access</FLabel>
                {form.role !== "superadmin" && (
                  <button onClick={()=>set("modules")(DEFAULT_ACCESS[form.role])} style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"#3b82f6", display:"flex", alignItems:"center", gap:4 }}>
                    <RefreshCw size={10}/> Reset to default
                  </button>
                )}
              </div>
              {form.role === "superadmin" && (
                <div style={{ padding:"10px 14px", marginBottom:10, borderRadius:10, background:"rgba(71,85,105,0.1)", border:"1px solid rgba(71,85,105,0.25)", color: D?"#94a3b8":"#64748b", fontSize:12, display:"flex", alignItems:"center", gap:8 }}>
                  <ShieldAlert size={13}/> Super Admin has access to all modules by default
                </div>
              )}
              <ModulePicker D={D} selectedModules={form.role==="superadmin" ? MODULES.map(m=>m.id) : form.modules} onChange={set("modules")} role={form.role}/>
            </div>
          </div>

          {/* Footer */}
          <div style={{ display:"flex", gap:12, marginTop:24 }}>
            <button onClick={handleSave} disabled={saving} style={{
              flex:1, padding:"13px 0", borderRadius:14, border:"none", cursor:"pointer",
              background:`linear-gradient(135deg,${rm.grad[0]},${rm.grad[1]})`,
              color:"white", fontSize:14, fontWeight:700,
              boxShadow:`0 6px 20px ${rm.glow}`,
              opacity: saving?0.7:1, transition:"all 0.2s",
            }}>
              {saving ? "Saving…" : editing ? "Update User" : "Create User"}
            </button>
            <button onClick={onClose} style={{ flex:1, padding:"13px 0", borderRadius:14, cursor:"pointer", fontSize:14, fontWeight:600, background: D?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, color: D?"#94a3b8":"#64748b" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Drawer ──────────────────────────────────────────────────────────────
function UserDrawer({ user, onClose, onEdit, onDelete, onResetPassword, onToggleStatus, D }) {
  if (!user) return null;
  const name     = fullName(user);
  const rm       = ROLE_META[user.role] || ROLE_META.staff;
  const RoleIcon = rm.icon;
  const userModules = user.role === "superadmin" ? MODULES.map(m=>m.id) : (user.modules || []);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:250, display:"flex", justifyContent:"flex-end", background:"rgba(0,0,0,0.45)", backdropFilter:"blur(6px)" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ width:380, height:"100%", display:"flex", flexDirection:"column", background: D?"#0d1117":"#ffffff", borderLeft:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, animation:"slideIn .26s cubic-bezier(.16,1,.3,1)" }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(135deg,${rm.grad[0]},${rm.grad[1]})`, padding:"24px 20px 20px", flexShrink:0, position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute", top:16, right:16, width:28, height:28, borderRadius:9, background:"rgba(0,0,0,0.2)", border:"none", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={13}/>
          </button>
          <div style={{ width:52, height:52, borderRadius:14, background:"rgba(255,255,255,0.15)", border:"2px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:"#fff", marginBottom:12 }}>
            {name[0]}
          </div>
          <p style={{ margin:0, fontSize:17, fontWeight:700, color:"#fff" }}>{name}</p>
          <p style={{ margin:"2px 0 0", fontSize:12, color:"rgba(255,255,255,0.65)" }}>{user.email}</p>
          <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(0,0,0,0.2)", color:"#fff" }}>
              <RoleIcon size={10}/> {rm.label}
            </span>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(0,0,0,0.2)", color:"#fff" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background: user.status==="Active"?"#86efac":"#fca5a5" }}/>{user.status}
            </span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:16 }}>

          <div style={{ background: D?"rgba(255,255,255,0.03)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`, borderRadius:14, overflow:"hidden", marginBottom:12 }}>
            <div style={{ padding:"8px 16px", borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color: D?"#334155":"#94a3b8", background: D?"rgba(255,255,255,0.02)":"#fafafa" }}>Account Info</div>
            {[
              ["Role",          rm.label],
              ["Contact",       user.contact],
              ["Linked Doctor", user.linkedDoctorName || "—"],
              ["Created",       fmtDate(user.createdAt)],
              ["Last Updated",  fmtDate(user.updatedAt)],
            ].filter(([,v])=>v).map(([label, val], i, arr) => (
              <div key={label} style={{ display:"flex", justifyContent:"space-between", padding:"10px 16px", borderBottom: i<arr.length-1 ? `1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}` : "none" }}>
                <span style={{ fontSize:12, color: D?"#475569":"#94a3b8" }}>{label}</span>
                <span style={{ fontSize:12, fontWeight:500, color: D?"#e2e8f0":"#1e293b" }}>{val}</span>
              </div>
            ))}
          </div>

          <div style={{ background: D?"rgba(255,255,255,0.03)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`, borderRadius:14, overflow:"hidden", marginBottom:12 }}>
            <div style={{ padding:"8px 16px", borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color: D?"#334155":"#94a3b8", background: D?"rgba(255,255,255,0.02)":"#fafafa" }}>Module Access ({userModules.length}/{MODULES.length})</div>
            <div style={{ padding:"12px 16px", display:"flex", flexWrap:"wrap", gap:6 }}>
              {MODULES.map(mod => {
                const Icon = mod.icon;
                const has  = userModules.includes(mod.id);
                return (
                  <span key={mod.id} style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:8, fontSize:11, fontWeight:500,
                    background: has?(D?"rgba(37,99,235,0.12)":"#eff6ff"):(D?"rgba(255,255,255,0.03)":"#f8fafc"),
                    color: has?(D?"#93c5fd":"#1d4ed8"):(D?"#334155":"#cbd5e1"),
                    border:`1px solid ${has?(D?"rgba(37,99,235,0.2)":"#bfdbfe"):(D?"rgba(255,255,255,0.06)":"#f1f5f9")}` }}>
                    <Icon size={9}/> {mod.label}
                  </span>
                );
              })}
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <button onClick={()=>onResetPassword(user.email)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 16px", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:600, background: D?"rgba(37,99,235,0.08)":"#eff6ff", border:`1px solid ${D?"rgba(37,99,235,0.2)":"#bfdbfe"}`, color: D?"#93c5fd":"#1d4ed8" }}>
              <RefreshCw size={13}/> Send Password Reset Email
            </button>
            <button onClick={()=>onToggleStatus(user)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"11px 16px", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:600,
              background: user.status==="Active" ? (D?"rgba(239,68,68,0.08)":"#fef2f2") : (D?"rgba(34,197,94,0.08)":"#f0fdf4"),
              border:`1px solid ${user.status==="Active" ? (D?"rgba(239,68,68,0.2)":"#fecaca") : (D?"rgba(34,197,94,0.2)":"#bbf7d0")}`,
              color: user.status==="Active" ? "#ef4444" : "#22c55e",
            }}>
              {user.status==="Active" ? <Lock size={13}/> : <Unlock size={13}/>}
              {user.status==="Active" ? "Suspend Account" : "Activate Account"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.08)":"#f1f5f9"}`, display:"flex", gap:10, flexShrink:0 }}>
          <button onClick={()=>{ onEdit(user); onClose(); }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", fontSize:13, fontWeight:700 }}>
            <Edit2 size={13}/> Edit
          </button>
          <button onClick={()=>{ if(window.confirm(`Delete user ${name}? This cannot be undone.`)) { onDelete(user); onClose(); } }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 0", borderRadius:14, cursor:"pointer", fontSize:13, fontWeight:600, background: D?"rgba(239,68,68,0.1)":"#fef2f2", border:`1px solid ${D?"rgba(239,68,68,0.2)":"#fecaca"}`, color:"#ef4444" }}>
            <Trash2 size={13}/> Delete
          </button>
        </div>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UserManagement() {
  const { isDark: D } = useTheme();
  const [users,        setUsers]        = useState([]);
  const [doctors,      setDoctors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterRole,   setFilterRole]   = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [modal,        setModal]        = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [drawer,       setDrawer]       = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db,"users"), snap => {
      const data = snap.val();
      setUsers(data ? Object.entries(data).map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)) : []);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db,"doctors"), snap => {
      const data = snap.val();
      setDoctors(data ? Object.entries(data).map(([id,v])=>({id,...v})) : []);
    });
    return () => unsub();
  }, []);

  const saveUser = async (form, editingUser) => {
    const now = Date.now();
    const modules = form.role === "superadmin" ? MODULES.map(m=>m.id) : form.modules;
    if (editingUser) {
      await update(ref(db, `users/${editingUser.id}`), {
        firstName: form.firstName, lastName: form.lastName,
        role: form.role, status: form.status, contact: form.contact, modules,
        linkedDoctorId: form.linkedDoctorId || "", linkedDoctorName: form.linkedDoctorName || "",
        updatedAt: now,
      });
      if (form.linkedDoctorId) {
        await update(ref(db, `doctors/${form.linkedDoctorId}`), {
          linkedUserId: editingUser.id, linkedUserName: `${form.firstName} ${form.lastName}`, updatedAt: now,
        });
      }
    } else {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const uid  = cred.user.uid;
      await update(ref(db, `users/${uid}`), {
        uid, firstName: form.firstName, lastName: form.lastName, email: form.email,
        role: form.role, status: form.status, contact: form.contact, modules,
        linkedDoctorId: form.linkedDoctorId || "", linkedDoctorName: form.linkedDoctorName || "",
        createdAt: now, updatedAt: now,
      });
      if (form.linkedDoctorId) {
        await update(ref(db, `doctors/${form.linkedDoctorId}`), {
          linkedUserId: uid, linkedUserName: `${form.firstName} ${form.lastName}`, updatedAt: now,
        });
      }
    }
  };

  const deleteUser = async (user) => {
    await remove(ref(db, `users/${user.id}`));
    if (user.linkedDoctorId) {
      await update(ref(db, `doctors/${user.linkedDoctorId}`), { linkedUserId:"", linkedUserName:"" });
    }
  };

  const handleResetPassword = async (email) => {
    try { await sendPasswordResetEmail(auth, email); alert(`Password reset email sent to ${email}`); }
    catch(e) { alert("Failed to send reset email: " + e.message); }
  };

  const toggleStatus = async (user) => {
    const newStatus = user.status === "Active" ? "Suspended" : "Active";
    await update(ref(db, `users/${user.id}`), { status:newStatus, updatedAt:Date.now() });
    if (drawer?.id === user.id) setDrawer(prev => ({ ...prev, status:newStatus }));
  };

  const totalUsers      = users.length;
  const superadminCount = users.filter(u=>u.role==="superadmin").length;
  const adminCount      = users.filter(u=>u.role==="admin").length;
  const staffCount      = users.filter(u=>u.role==="staff").length;
  const suspendedCount  = users.filter(u=>u.status==="Suspended").length;

  const filtered = users.filter(u => {
    const n = fullName(u).toLowerCase();
    return (n.includes(search.toLowerCase()) || (u.email||"").toLowerCase().includes(search.toLowerCase()))
      && (filterRole==="All"   || u.role===filterRole)
      && (filterStatus==="All" || u.status===filterStatus);
  });

  const cardBg  = D ? "#0d1117" : "#ffffff";
  const cardBdr = D ? "rgba(255,255,255,0.07)" : "#f1f5f9";

  // Stat cards — no pink/violet, professional neutral palette
  const STATS = [
    { label:"Total Users",  value:totalUsers,      g1:"#2563eb", g2:"#1d4ed8", glow:"rgba(37,99,235,0.2)"  },
    { label:"Super Admins", value:superadminCount, g1:"#475569", g2:"#334155", glow:"rgba(71,85,105,0.2)"  },
    { label:"Admins",       value:adminCount,      g1:"#0891b2", g2:"#0e7490", glow:"rgba(8,145,178,0.2)"  },
    { label:"Staff",        value:staffCount,      g1:"#0d9488", g2:"#0f766e", glow:"rgba(13,148,136,0.2)" },
    { label:"Suspended",    value:suspendedCount,  g1:"#dc2626", g2:"#b91c1c", glow:"rgba(220,38,38,0.2)"  },
  ];

  return (
    <div style={{ padding:24, minHeight:"100%", background: D?"#080b12":"#f8fafc" }}>

      {/* Stat Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:20 }}>
        {STATS.map(s => (
          <div key={s.label}
            style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, padding:"20px 20px 18px", position:"relative", overflow:"hidden", transition:"transform 0.2s, box-shadow 0.2s", cursor:"default" }}
            onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 12px 32px ${s.glow}`; }}
            onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
          >
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, borderRadius:"20px 20px 0 0", background:`linear-gradient(90deg,${s.g1},${s.g2})` }}/>
            <p style={{ margin:"12px 0 4px", fontSize:28, fontWeight:800, color: D?"#f1f5f9":"#0f172a" }}>{s.value}</p>
            <p style={{ margin:0, fontSize:12, color: D?"#475569":"#94a3b8", fontWeight:500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:14, padding:"10px 16px" }}>
          <Search size={15} style={{ color: D?"#334155":"#94a3b8", flexShrink:0 }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…"
            style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color: D?"#e2e8f0":"#1e293b" }}/>
          {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", display:"flex" }}><X size={13}/></button>}
        </div>
        <div style={{ width:150 }}>
          <CDropdown D={D} value={filterRole} onChange={setFilterRole}
            options={["All","superadmin","admin","staff"].map(r=>({ value:r, label: r==="All"?"All Roles": ROLE_META[r]?.label || r }))}/>
        </div>
        <div style={{ width:140 }}>
          <CDropdown D={D} value={filterStatus} onChange={setFilterStatus}
            options={["All",...STATUS_OPTS].map(s=>({ value:s, label: s==="All"?"All Status":s }))}/>
        </div>
        <button onClick={()=>{ setEditing(null); setModal(true); }} style={{
          display:"flex", alignItems:"center", gap:8,
          background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
          border:"none", borderRadius:14, padding:"10px 20px",
          color:"white", fontSize:13, fontWeight:700, cursor:"pointer",
          boxShadow:"0 6px 18px rgba(37,99,235,0.3)", whiteSpace:"nowrap",
        }}>
          <Plus size={16}/> Create User
        </button>
      </div>

      {/* Table */}
      <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, background: D?"rgba(255,255,255,0.02)":"#fafafa" }}>
              {["User","Email","Role","Linked Doctor","Modules","Status","Created","Actions"].map(h=>(
                <th key={h} style={{ textAlign:"left", padding:"13px 16px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color: D?"#334155":"#94a3b8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding:60, textAlign:"center" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", border:"2px solid #2563eb", borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }}/>
                  <p style={{ color:"#475569", fontSize:13, margin:0 }}>Loading users…</p>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding:60, textAlign:"center" }}>
                <p style={{ color: D?"#475569":"#64748b", fontSize:14, fontWeight:600, margin:0 }}>No users found</p>
                <p style={{ color: D?"#334155":"#94a3b8", fontSize:12, margin:"4px 0 0" }}>Try adjusting your search or filter</p>
              </td></tr>
            ) : filtered.map((u, idx) => {
              const name     = fullName(u);
              const color    = avatarColor(name);
              const rm       = ROLE_META[u.role] || ROLE_META.staff;
              const sm       = STATUS_META[u.status] || STATUS_META.Active;
              const RoleIcon = rm.icon;
              const isEven   = idx % 2 === 0;
              const mods     = u.role==="superadmin" ? MODULES.map(m=>m.id) : (u.modules||[]);
              return (
                <tr key={u.id} onClick={()=>setDrawer(u)}
                  style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`, transition:"background 0.15s", cursor:"pointer",
                    background: D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#ffffff":"#fafffe") }}
                  onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(37,99,235,0.05)":"#f0f4ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#ffffff":"#fafffe")}
                >
                  <td style={{ padding:"13px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:10, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>{name[0]}</div>
                      <span style={{ fontSize:13, fontWeight:600, color: D?"#e2e8f0":"#0f172a" }}>{name}</span>
                    </div>
                  </td>
                  <td style={{ padding:"13px 16px", fontSize:12, color: D?"#475569":"#64748b" }}>{u.email}</td>
                  <td style={{ padding:"13px 16px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:8, fontSize:11, fontWeight:600, background:`${rm.grad[0]}18`, color:rm.hex, border:`1px solid ${rm.grad[0]}35` }}>
                      <RoleIcon size={9}/> {rm.label}
                    </span>
                  </td>
                  <td style={{ padding:"13px 16px", fontSize:12, color: D?"#475569":"#64748b" }}>
                    {u.linkedDoctorName
                      ? <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 8px", borderRadius:7, fontSize:11, background:"rgba(8,145,178,0.1)", color:"#0891b2", border:"1px solid rgba(8,145,178,0.2)" }}><Stethoscope size={9}/>{u.linkedDoctorName}</span>
                      : <span style={{ color: D?"#334155":"#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <span style={{ padding:"3px 10px", borderRadius:8, fontSize:12, fontWeight:700, background:"rgba(37,99,235,0.1)", color: D?"#93c5fd":"#1d4ed8", border:"1px solid rgba(37,99,235,0.15)" }}>{mods.length}/{MODULES.length}</span>
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:`${sm.hex}18`, color:sm.hex, border:`1px solid ${sm.hex}30` }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:sm.hex, flexShrink:0 }}/>{u.status}
                    </span>
                  </td>
                  <td style={{ padding:"13px 16px", fontSize:12, color: D?"#334155":"#94a3b8" }}>{fmtDate(u.createdAt)}</td>
                  <td style={{ padding:"13px 16px" }} onClick={e=>e.stopPropagation()}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{ setEditing(u); setModal(true); }}
                        style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.2)", color: D?"#93c5fd":"#1d4ed8" }}>
                        <Edit2 size={10}/> Edit
                      </button>
                      <button onClick={()=>{ if(window.confirm(`Delete ${name}?`)) deleteUser(u); }}
                        style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", display:"flex", alignItems:"center" }}>
                        <Trash2 size={11}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}` }}>
          <span style={{ fontSize:12, color: D?"#475569":"#94a3b8" }}>
            Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong> users
          </span>
        </div>
      </div>

      <UserModal open={modal} onClose={()=>{ setModal(false); setEditing(null); }} onSave={saveUser} editing={editing} doctors={doctors} D={D}/>
      <UserDrawer user={drawer} onClose={()=>setDrawer(null)} onEdit={u=>{ setEditing(u); setModal(true); }} onDelete={deleteUser} onResetPassword={handleResetPassword} onToggleStatus={toggleStatus} D={D}/>
    </div>
  );
}
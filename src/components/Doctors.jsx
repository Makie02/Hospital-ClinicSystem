// src/components/Doctors.jsx
import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, update, remove } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Plus, X, Search, Edit2, Trash2, ChevronDown,
  Check, AlertCircle, Phone, MapPin, Clock,
  Stethoscope, Calendar, User, Star, LinkIcon,
} from "lucide-react";
import { useSettingsList } from "../hooks/useSettingsList";

// ─── Static fallbacks ─────────────────────────────────────────────────────────
const FALLBACK_SPECS = [
  "General Medicine","Pediatrics","Cardiology","Dermatology",
  "Orthopedics","Neurology","OB-Gynecology","Ophthalmology",
  "ENT","Pulmonology","Gastroenterology","Urology",
  "Psychiatry","Radiology","Anesthesiology","Surgery","Other",
];
const FALLBACK_SCHEDULES = [
  "Mon–Fri 8AM–5PM","Mon–Wed–Fri 8AM–12PM","Tue–Thu 1PM–5PM",
  "Sat 8AM–12PM","By appointment only",
];

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const TIME_SLOTS = [
  "06:00","06:30","07:00","07:30","08:00","08:30","09:00","09:30",
  "10:00","10:30","11:00","11:30","12:00","12:30","13:00","13:30",
  "14:00","14:30","15:00","15:30","16:00","16:30","17:00","17:30",
  "18:00","18:30","19:00","19:30","20:00",
];
const STATUS_OPTS = ["Active","On Leave","Inactive"];

const AVATAR_COLORS = [
  "#2563eb","#0d9488","#475569","#d97706",
  "#dc2626","#0891b2","#6b7280","#1d4ed8",
];

const STATUS_META = {
  "Active":   { hex:"#22c55e" },
  "On Leave": { hex:"#f59e0b" },
  "Inactive": { hex:"#94a3b8" },
};

const EMPTY_FORM = {
  firstName:"", lastName:"", specialization:"",
  contact:"", email:"", room:"", status:"Active",
  schedule: {
    Monday:    { enabled:false, start:"08:00", end:"17:00" },
    Tuesday:   { enabled:false, start:"08:00", end:"17:00" },
    Wednesday: { enabled:false, start:"08:00", end:"17:00" },
    Thursday:  { enabled:false, start:"08:00", end:"17:00" },
    Friday:    { enabled:false, start:"08:00", end:"17:00" },
    Saturday:  { enabled:false, start:"08:00", end:"12:00" },
    Sunday:    { enabled:false, start:"08:00", end:"12:00" },
  },
  bio:"", linkedUserId:"", linkedUserName:"",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fullName    = (d) => `${d.firstName} ${d.lastName}`.trim();
const avatarColor = (name) => AVATAR_COLORS[(name?.charCodeAt(0)||0) % AVATAR_COLORS.length];
const fmtDate     = (ts) => ts ? new Date(ts).toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric" }) : "—";
const fmt12       = (t) => { if(!t) return t; const [h,m]=t.split(":").map(Number); const ap=h>=12?"PM":"AM"; const hr=h===0?12:h>12?h-12:h; return `${hr}:${String(m).padStart(2,"0")} ${ap}`; };
const activeDays  = (schedule) => schedule ? DAYS.filter(d => schedule[d]?.enabled) : [];

// ─── Dynamic spec color map ───────────────────────────────────────────────────
const SPEC_BASE_COLORS = [
  ["#2563eb","#1d4ed8"],["#0d9488","#0f766e"],["#dc2626","#b91c1c"],
  ["#d97706","#b45309"],["#475569","#334155"],["#0891b2","#0e7490"],
  ["#059669","#047857"],["#7c3aed","#6d28d9"],["#db2777","#be185d"],
];
const specGrad = (spec) => {
  if (!spec) return SPEC_BASE_COLORS[0];
  const idx = (spec.charCodeAt(0) + spec.length) % SPEC_BASE_COLORS.length;
  return SPEC_BASE_COLORS[idx];
};

// ─── Custom Dropdown ──────────────────────────────────────────────────────────
function CDropdown({ D, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find(o => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : (placeholder ?? "Select…");
  const textColor = D ? "#e2e8f0" : "#1e293b";
  const mutedColor = D ? "#475569" : "#94a3b8";
  return (
    <div ref={containerRef} style={{ position:"relative", userSelect:"none" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:D?"rgba(255,255,255,0.06)":"#f8fafc", border:`1px solid ${open?"#2563eb":D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:12, padding:"10px 14px", cursor:"pointer", boxShadow:open?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"border-color 0.2s, box-shadow 0.2s" }}>
        <span style={{ fontSize:13, color:value?textColor:mutedColor }}>{label}</span>
        <ChevronDown size={13} style={{ color:mutedColor, flexShrink:0, transition:"transform 0.2s", transform:open?"rotate(180deg)":"rotate(0deg)" }}/>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:999, background:D?"#161b27":"#ffffff", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:14, boxShadow:D?"0 20px 60px rgba(0,0,0,0.7)":"0 12px 40px rgba(0,0,0,0.15)", maxHeight:220, overflowY:"auto", padding:"6px", animation:"cdropIn 0.15s cubic-bezier(.16,1,.3,1)" }}>
          <style>{`@keyframes cdropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {options.length === 0 ? (
            <div style={{ padding:"12px 14px", textAlign:"center", fontSize:12, color:"#64748b" }}>No options yet — add in Maintenance Settings.</div>
          ) : options.map((o, i) => {
            const val=o.value??o; const lbl=o.label??o; const isSel=val===value;
            return (
              <div key={i} onClick={() => { onChange(val); setOpen(false); }} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:9, cursor:"pointer", fontSize:13, color:isSel?"#2563eb":textColor, background:isSel?"rgba(37,99,235,0.1)":"transparent", fontWeight:isSel?600:400 }}
                onMouseEnter={e => { if(!isSel) e.currentTarget.style.background=D?"rgba(255,255,255,0.06)":"#f1f5f9"; }}
                onMouseLeave={e => { if(!isSel) e.currentTarget.style.background="transparent"; }}>
                {lbl}{isSel && <Check size={13} style={{ color:"#2563eb", flexShrink:0 }}/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FLabel({ D, icon: Icon, children }) {
  return <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6, color:D?"#94a3b8":"#64748b" }}>{Icon && <Icon size={10} style={{ display:"inline", marginRight:5, verticalAlign:"middle" }}/>}{children}</label>;
}

function SInput({ D, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      <style>{`.sinput::placeholder { color: ${D ? "#64748b" : "#94a3b8"} !important; }`}</style>
      <input {...props} className="sinput" style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.09)":"#f8fafc", border:`1px solid ${focused?"#2563eb":D?"rgba(255,255,255,0.15)":"#e2e8f0"}`, borderRadius:12, padding:"10px 14px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", boxShadow:focused?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"border-color 0.2s, box-shadow 0.2s", ...props.style }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}/>
    </>
  );
}

// ─── Schedule Builder ─────────────────────────────────────────────────────────
function ScheduleBuilder({ D, schedule, onChange }) {
  const cardBg = D ? "rgba(255,255,255,0.03)" : "#f8fafc";
  const border = D ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const toggleDay = (day) => onChange({ ...schedule, [day]: { ...schedule[day], enabled: !schedule[day].enabled } });
  const setTime   = (day, field, val) => onChange({ ...schedule, [day]: { ...schedule[day], [field]: val } });

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {DAYS.map(day => {
        const s = schedule[day] || { enabled:false, start:"08:00", end:"17:00" };
        return (
          <div key={day} style={{ display:"flex", alignItems:"center", gap:12, background:s.enabled?(D?"rgba(37,99,235,0.08)":"#eff6ff"):cardBg, border:`1px solid ${s.enabled?(D?"rgba(37,99,235,0.25)":"#bfdbfe"):border}`, borderRadius:12, padding:"10px 14px", transition:"all 0.2s" }}>
            <div onClick={() => toggleDay(day)} style={{ width:36, height:20, borderRadius:10, cursor:"pointer", flexShrink:0, background:s.enabled?"linear-gradient(135deg,#2563eb,#1d4ed8)":(D?"rgba(255,255,255,0.1)":"#e2e8f0"), position:"relative", transition:"background 0.2s" }}>
              <div style={{ position:"absolute", top:2, left:s.enabled?18:2, width:16, height:16, borderRadius:"50%", background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,0.2)", transition:"left 0.2s" }}/>
            </div>
            <span style={{ fontSize:12, fontWeight:600, width:80, flexShrink:0, color:s.enabled?(D?"#93c5fd":"#1d4ed8"):(D?"#334155":"#94a3b8") }}>{day.slice(0,3)}</span>
            {s.enabled ? (
              <div style={{ display:"flex", alignItems:"center", gap:8, flex:1 }}>
                <select value={s.start} onChange={e => setTime(day,"start",e.target.value)} style={{ background:D?"#1a1f2e":"#ffffff", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:8, padding:"4px 8px", fontSize:12, color:D?"#e2e8f0":"#1e293b", outline:"none", colorScheme:D?"dark":"light", cursor:"pointer" }}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
                </select>
                <span style={{ fontSize:11, color:D?"#334155":"#94a3b8" }}>to</span>
                <select value={s.end} onChange={e => setTime(day,"end",e.target.value)} style={{ background:D?"#1a1f2e":"#ffffff", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:8, padding:"4px 8px", fontSize:12, color:D?"#e2e8f0":"#1e293b", outline:"none", colorScheme:D?"dark":"light", cursor:"pointer" }}>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{fmt12(t)}</option>)}
                </select>
              </div>
            ) : (
              <span style={{ fontSize:12, color:D?"#334155":"#cbd5e1" }}>Day off</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Doctor Modal ─────────────────────────────────────────────────────────────
function DoctorModal({ open, onClose, onSave, editing, users, D, specializations }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (open) {
      setForm(editing
        ? { ...EMPTY_FORM, ...editing, schedule: { ...EMPTY_FORM.schedule, ...(editing.schedule||{}) } }
        : { ...EMPTY_FORM });
      setError("");
    }
  }, [open, editing]);

  if (!open) return null;
  const set  = (k) => (v) => setForm(p => ({ ...p, [k]: v }));
  const setE = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    if (!form.firstName.trim()) return "First name is required.";
    if (!form.lastName.trim())  return "Last name is required.";
    if (!form.specialization)   return "Please select a specialization.";
    return "";
  };

  const handleSave = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch(e) { setError(e.message || "Failed to save. Check your connection."); }
    finally { setSaving(false); }
  };

  const userOpts = [
    { value:"", label:"— None (no user account) —" },
    ...users.filter(u => !u.linkedDoctorId || u.id === form.linkedUserId)
      .map(u => ({ value:u.id, label:`${u.firstName} ${u.lastName} (${u.role}) — ${u.email}` })),
  ];

  const cardBg = D ? "#0d1117" : "#ffffff";
  const border = D ? "rgba(255,255,255,0.08)" : "#e2e8f0";

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(14px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:620, maxHeight:"92vh", overflowY:"auto", background:cardBg, border:`1px solid ${border}`, borderRadius:24, boxShadow:"0 40px 100px rgba(0,0,0,0.5)" }}>
        <div style={{ height:3, borderRadius:"24px 24px 0 0", background:"linear-gradient(90deg,#2563eb,#0891b2)" }}/>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>{editing?"Edit Doctor":"Add New Doctor"}</h2>
              <p style={{ margin:"4px 0 0", fontSize:12, color:D?"#475569":"#94a3b8" }}>Fill in doctor details, schedule, and account link</p>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:D?"#475569":"#94a3b8", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16}/></button>
          </div>

          {error && <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:18, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}><AlertCircle size={14}/> {error}</div>}

          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={User}>First Name</FLabel><SInput D={D} placeholder="e.g. Maria" value={form.firstName} onChange={setE("firstName")}/></div>
              <div><FLabel D={D} icon={User}>Last Name</FLabel><SInput D={D} placeholder="e.g. Santos" value={form.lastName} onChange={setE("lastName")}/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div>
                <FLabel D={D} icon={Stethoscope}>Specialization</FLabel>
                {/* ✅ FROM settings/doctors/specializations */}
                <CDropdown D={D} value={form.specialization} onChange={set("specialization")} options={specializations} placeholder="Select specialization"/>
              </div>
              <div><FLabel D={D}>Status</FLabel><CDropdown D={D} value={form.status} onChange={set("status")} options={STATUS_OPTS}/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={Phone}>Contact</FLabel><SInput D={D} placeholder="09XXXXXXXXX" value={form.contact} onChange={setE("contact")}/></div>
              <div><FLabel D={D}>Email</FLabel><SInput D={D} placeholder="doctor@clinic.com" value={form.email} onChange={setE("email")}/></div>
            </div>
            <div><FLabel D={D} icon={MapPin}>Room / Clinic</FLabel><SInput D={D} placeholder="e.g. Room 3, OPD 1" value={form.room} onChange={setE("room")}/></div>
            <div>
              <FLabel D={D} icon={User}>Link to User Account</FLabel>
              <CDropdown D={D} value={form.linkedUserId} onChange={(v) => { const user=users.find(u=>u.id===v); setForm(p=>({...p,linkedUserId:v,linkedUserName:user?`${user.firstName} ${user.lastName}`:""})); }} options={userOpts} placeholder="— None —"/>
              {form.linkedUserId && <p style={{ margin:"6px 0 0", fontSize:11, color:D?"#475569":"#94a3b8" }}>✓ This doctor will be linked to the selected user account for login access.</p>}
            </div>
            <div><FLabel D={D}>Bio / Notes</FLabel><textarea value={form.bio} onChange={setE("bio")} placeholder="Brief description, credentials, or notes…" rows={2} style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.06)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:12, padding:"10px 14px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", resize:"vertical" }}/></div>
            <div>
              <FLabel D={D} icon={Calendar}>Weekly Schedule</FLabel>
              <ScheduleBuilder D={D} schedule={form.schedule} onChange={v => setForm(p => ({ ...p, schedule:v }))}/>
            </div>
          </div>

          <div style={{ display:"flex", gap:12, marginTop:24 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"13px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", fontSize:14, fontWeight:700, boxShadow:"0 8px 24px rgba(37,99,235,0.3)", opacity:saving?0.7:1, transition:"all 0.2s" }}>{saving?"Saving…":editing?"Update Doctor":"Add Doctor"}</button>
            <button onClick={onClose} style={{ flex:1, padding:"13px 0", borderRadius:14, cursor:"pointer", fontSize:14, fontWeight:600, background:D?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, color:D?"#94a3b8":"#64748b" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Doctor Drawer ────────────────────────────────────────────────────────────
function DoctorDrawer({ doctor, onClose, onEdit, onDelete, appointmentCount, D }) {
  if (!doctor) return null;
  const name = fullName(doctor);
  const grad = specGrad(doctor.specialization);
  const sm   = STATUS_META[doctor.status] || STATUS_META["Active"];
  const days = activeDays(doctor.schedule);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:250, display:"flex", justifyContent:"flex-end", background:"rgba(0,0,0,0.45)", backdropFilter:"blur(6px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:360, height:"100%", display:"flex", flexDirection:"column", background:D?"#0d1117":"#ffffff", borderLeft:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, animation:"slideIn .26s cubic-bezier(.16,1,.3,1)" }}>
        <div style={{ background:`linear-gradient(135deg,${grad[0]},${grad[1]})`, padding:"24px 20px 20px", flexShrink:0, position:"relative" }}>
          <button onClick={onClose} style={{ position:"absolute", top:16, right:16, width:28, height:28, borderRadius:9, background:"rgba(0,0,0,0.2)", border:"none", cursor:"pointer", color:"white", display:"flex", alignItems:"center", justifyContent:"center" }}><X size={13}/></button>
          <div style={{ width:52, height:52, borderRadius:14, background:"rgba(255,255,255,0.15)", border:"2px solid rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:700, color:"#fff", marginBottom:12 }}>{name[0]}</div>
          <p style={{ margin:0, fontSize:17, fontWeight:700, color:"#fff" }}>Dr. {name}</p>
          <p style={{ margin:"3px 0 0", fontSize:12, color:"rgba(255,255,255,0.65)" }}>{doctor.specialization}</p>
          <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(0,0,0,0.2)", color:"#fff" }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:doctor.status==="Active"?"#86efac":doctor.status==="On Leave"?"#fde68a":"#e2e8f0" }}/>{doctor.status}
            </span>
            {doctor.room && <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:"rgba(0,0,0,0.2)", color:"#fff" }}><MapPin size={9}/>{doctor.room}</span>}
          </div>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            {[{ label:"Appointments", value:appointmentCount, color:"#3b82f6" },{ label:"Active Days", value:days.length, color:"#22c55e" }].map(s => (
              <div key={s.label} style={{ background:D?"rgba(255,255,255,0.03)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`, borderRadius:14, padding:"14px 16px", textAlign:"center" }}>
                <p style={{ margin:0, fontSize:22, fontWeight:700, color:s.color }}>{s.value}</p>
                <p style={{ margin:"3px 0 0", fontSize:11, color:D?"#334155":"#94a3b8" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {doctor.linkedUserName && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:12, borderRadius:12, background:D?"rgba(37,99,235,0.08)":"#eff6ff", border:`1px solid ${D?"rgba(37,99,235,0.2)":"#bfdbfe"}` }}>
              <User size={13} style={{ color:D?"#93c5fd":"#2563eb", flexShrink:0 }}/>
              <div>
                <p style={{ margin:0, fontSize:11, fontWeight:700, color:D?"#93c5fd":"#1d4ed8" }}>Linked User Account</p>
                <p style={{ margin:0, fontSize:12, color:D?"#60a5fa":"#2563eb" }}>{doctor.linkedUserName}</p>
              </div>
            </div>
          )}

          {[
            { title:"Contact Info", rows:[["Phone",doctor.contact],["Email",doctor.email]] },
            { title:"Details",      rows:[["Room",doctor.room],["Bio",doctor.bio],["Added",fmtDate(doctor.createdAt)]] },
          ].map(sec => {
            const valid = sec.rows.filter(([,v])=>v);
            if (!valid.length) return null;
            return (
              <div key={sec.title} style={{ background:D?"rgba(255,255,255,0.03)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`, borderRadius:14, overflow:"hidden", marginBottom:10 }}>
                <div style={{ padding:"8px 16px", borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color:D?"#94a3b8":"#64748b", background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>{sec.title}</div>
                {valid.map(([label,val],i) => (
                  <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", padding:"10px 16px", borderBottom:i<valid.length-1?`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`:"none" }}>
                    <span style={{ fontSize:12, color:D?"#475569":"#94a3b8", flexShrink:0 }}>{label}</span>
                    <span style={{ fontSize:12, fontWeight:500, color:D?"#e2e8f0":"#1e293b", textAlign:"right", maxWidth:"60%", wordBreak:"break-word" }}>{val}</span>
                  </div>
                ))}
              </div>
            );
          })}

          <div style={{ background:D?"rgba(255,255,255,0.03)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`, borderRadius:14, overflow:"hidden" }}>
            <div style={{ padding:"8px 16px", borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color:D?"#334155":"#94a3b8", background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>Weekly Schedule</div>
            {DAYS.map((day, i) => {
              const s = doctor.schedule?.[day]; const on = s?.enabled;
              return (
                <div key={day} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 16px", borderBottom:i<6?`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`:"none" }}>
                  <span style={{ fontSize:12, color:on?(D?"#93c5fd":"#1d4ed8"):(D?"#334155":"#cbd5e1"), fontWeight:on?600:400 }}>{day.slice(0,3)}</span>
                  {on ? <span style={{ fontSize:11, fontWeight:600, color:D?"#60a5fa":"#2563eb" }}>{fmt12(s.start)} – {fmt12(s.end)}</span> : <span style={{ fontSize:11, color:D?"#334155":"#cbd5e1" }}>Day off</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.08)":"#f1f5f9"}`, display:"flex", gap:10, flexShrink:0 }}>
          <button onClick={() => { onEdit(doctor); onClose(); }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", fontSize:13, fontWeight:700 }}><Edit2 size={13}/> Edit</button>
          <button onClick={() => { if(window.confirm(`Delete Dr. ${name}?`)) { onDelete(doctor.id); onClose(); } }} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 0", borderRadius:14, cursor:"pointer", fontSize:13, fontWeight:600, background:D?"rgba(239,68,68,0.1)":"#fef2f2", border:`1px solid ${D?"rgba(239,68,68,0.2)":"#fecaca"}`, color:"#ef4444" }}><Trash2 size={13}/> Delete</button>
        </div>
      </div>
      <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Doctors() {
  const { isDark: D } = useTheme();

  // ✅ Dynamic from Firebase Maintenance Settings
  const specializations = useSettingsList("settings/doctors/specializations", FALLBACK_SPECS);

  const [doctors,      setDoctors]      = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterSpec,   setFilterSpec]   = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [modal,        setModal]        = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [drawer,       setDrawer]       = useState(null);

  useEffect(() => { const u=onValue(ref(db,"doctors"),s=>{ const d=s.val(); setDoctors(d?Object.entries(d).map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)):[]); setLoading(false); }); return()=>u(); },[]);
  useEffect(() => { const u=onValue(ref(db,"appointments"),s=>{ const d=s.val(); setAppointments(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);
  useEffect(() => { const u=onValue(ref(db,"users"),s=>{ const d=s.val(); setUsers(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);

  const genId = () => `DOC-${String(doctors.length+1).padStart(4,"0")}`;
  const saveDoctor = async (form) => {
    const now = Date.now();
    if (editing?.linkedUserId && editing.linkedUserId !== form.linkedUserId) {
      await update(ref(db,`users/${editing.linkedUserId}`), { linkedDoctorId:"", linkedDoctorName:"", updatedAt:now });
    }
    let docId = editing?.id;
    if (editing) { await update(ref(db,`doctors/${editing.id}`), { ...form, updatedAt:now }); }
    else { const pushed = await push(ref(db,"doctors"), { ...form, doctorId:genId(), createdAt:now, updatedAt:now }); docId = pushed.key; }
    if (form.linkedUserId) { await update(ref(db,`users/${form.linkedUserId}`), { linkedDoctorId:docId, linkedDoctorName:`Dr. ${form.firstName} ${form.lastName}`, updatedAt:now }); }
  };
  const deleteDoctor = async (id) => {
    const doc = doctors.find(d => d.id === id);
    if (doc?.linkedUserId) { await update(ref(db,`users/${doc.linkedUserId}`), { linkedDoctorId:"", linkedDoctorName:"", updatedAt:Date.now() }); }
    await remove(ref(db,`doctors/${id}`));
  };

  const apptCount = (name) => appointments.filter(a => a.doctor === `Dr. ${name}` || a.doctor === name).length;

  const totalDocs=doctors.length, activeDocs=doctors.filter(d=>d.status==="Active").length;
  const onLeaveDocs=doctors.filter(d=>d.status==="On Leave").length, inactiveDocs=doctors.filter(d=>d.status==="Inactive").length;

  // ✅ Dynamic filter options
  const allSpecs = ["All", ...specializations];

  const filtered = doctors.filter(d => {
    const n = fullName(d).toLowerCase();
    return (n.includes(search.toLowerCase()) || (d.doctorId||"").toLowerCase().includes(search.toLowerCase()) || (d.specialization||"").toLowerCase().includes(search.toLowerCase()))
      && (filterSpec==="All" || d.specialization===filterSpec)
      && (filterStatus==="All" || d.status===filterStatus);
  });

  const cardBg = D?"#0d1117":"#ffffff"; const cardBdr = D?"rgba(255,255,255,0.07)":"#f1f5f9";
  const STATS = [
    { label:"Total Doctors", value:totalDocs,    g1:"#2563eb", g2:"#1d4ed8", glow:"rgba(37,99,235,0.2)"   },
    { label:"Active",         value:activeDocs,   g1:"#059669", g2:"#047857", glow:"rgba(5,150,105,0.2)"   },
    { label:"On Leave",       value:onLeaveDocs,  g1:"#d97706", g2:"#b45309", glow:"rgba(217,119,6,0.2)"   },
    { label:"Inactive",       value:inactiveDocs, g1:"#475569", g2:"#334155", glow:"rgba(71,85,105,0.2)"   },
    { label:"Total Appts",    value:appointments.length, g1:"#0891b2", g2:"#0e7490", glow:"rgba(8,145,178,0.2)" },
  ];

  return (
    <div style={{ padding:24, minHeight:"100%", background:D?"#080b12":"#f8fafc" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:14, marginBottom:20 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, padding:"20px 20px 18px", position:"relative", overflow:"hidden", transition:"transform 0.2s, box-shadow 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 12px 32px ${s.glow}`;}} onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, borderRadius:"20px 20px 0 0", background:`linear-gradient(90deg,${s.g1},${s.g2})` }}/>
            <p style={{ margin:"12px 0 4px", fontSize:28, fontWeight:800, color:D?"#f1f5f9":"#0f172a" }}>{s.value}</p>
            <p style={{ margin:0, fontSize:12, color:D?"#475569":"#94a3b8", fontWeight:500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:14, padding:"10px 16px" }}>
          <Search size={15} style={{ color:D?"#334155":"#94a3b8", flexShrink:0 }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, ID, or specialization…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:D?"#e2e8f0":"#1e293b" }}/>
          {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", display:"flex" }}><X size={13}/></button>}
        </div>

        {/* ✅ Dynamic specialization filter */}
        <div style={{ width:180 }}>
          <CDropdown D={D} value={filterSpec} onChange={setFilterSpec} options={allSpecs.map(s=>({ value:s, label:s==="All"?"All Specializations":s }))}/>
        </div>
        <div style={{ width:140 }}>
          <CDropdown D={D} value={filterStatus} onChange={setFilterStatus} options={["All",...STATUS_OPTS].map(s=>({ value:s, label:s==="All"?"All Status":s }))}/>
        </div>
        <button onClick={()=>{ setEditing(null); setModal(true); }} style={{ display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#2563eb,#1d4ed8)", border:"none", borderRadius:14, padding:"10px 20px", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 6px 18px rgba(37,99,235,0.3)", whiteSpace:"nowrap" }}>
          <Plus size={16}/> Add Doctor
        </button>
      </div>

      <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
              {["ID","Doctor","Specialization","Contact","Room","Schedule","Linked User","Status","Appts","Actions"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"13px 16px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color:D?"#334155":"#94a3b8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ padding:60, textAlign:"center" }}>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", border:"2px solid #2563eb", borderTopColor:"transparent", animation:"spin 0.8s linear infinite" }}/>
                  <p style={{ color:"#475569", fontSize:13, margin:0 }}>Loading doctors…</p>
                </div>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding:60, textAlign:"center" }}>
                <p style={{ color:D?"#475569":"#64748b", fontSize:14, fontWeight:600, margin:0 }}>No doctors found</p>
              </td></tr>
            ) : filtered.map((doc, idx) => {
              const name=fullName(doc); const color=avatarColor(name);
              const grad=specGrad(doc.specialization); const sm=STATUS_META[doc.status]||STATUS_META["Active"];
              const days=activeDays(doc.schedule); const aCount=apptCount(name); const isEven=idx%2===0;
              return (
                <tr key={doc.id} onClick={()=>setDrawer(doc)}
                  style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`, transition:"background 0.15s", cursor:"pointer", background:D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#ffffff":"#fafffe") }}
                  onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(37,99,235,0.05)":"#f0f4ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#ffffff":"#fafffe")}>
                  <td style={{ padding:"13px 16px", fontFamily:"monospace", fontSize:11, color:D?"#334155":"#94a3b8" }}>{doc.doctorId}</td>
                  <td style={{ padding:"13px 16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:10, background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#fff", flexShrink:0 }}>{name[0]}</div>
                      <div>
                        <p style={{ margin:0, fontSize:13, fontWeight:600, color:D?"#e2e8f0":"#0f172a" }}>Dr. {name}</p>
                        {doc.email && <p style={{ margin:0, fontSize:11, color:D?"#334155":"#94a3b8" }}>{doc.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:8, fontSize:11, fontWeight:600, background:`${grad[0]}20`, color:grad[0], border:`1px solid ${grad[0]}35` }}>
                      <Stethoscope size={9}/> {doc.specialization}
                    </span>
                  </td>
                  <td style={{ padding:"13px 16px", fontSize:12, color:D?"#475569":"#64748b" }}>{doc.contact||"—"}</td>
                  <td style={{ padding:"13px 16px", fontSize:12, color:D?"#475569":"#64748b" }}>{doc.room||"—"}</td>
                  <td style={{ padding:"13px 16px" }}>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                      {days.length ? days.map(d => <span key={d} style={{ padding:"2px 6px", borderRadius:5, fontSize:10, fontWeight:700, background:"rgba(37,99,235,0.1)", color:D?"#93c5fd":"#1d4ed8", border:"1px solid rgba(37,99,235,0.15)" }}>{d.slice(0,2)}</span>) : <span style={{ fontSize:11, color:D?"#334155":"#cbd5e1" }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    {doc.linkedUserName
                      ? <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 9px", borderRadius:7, fontSize:11, fontWeight:600, background:"rgba(37,99,235,0.1)", color:D?"#93c5fd":"#1d4ed8", border:"1px solid rgba(37,99,235,0.2)" }}><User size={9}/>{doc.linkedUserName}</span>
                      : <span style={{ fontSize:11, color:D?"#334155":"#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:`${sm.hex}18`, color:sm.hex, border:`1px solid ${sm.hex}30` }}>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:sm.hex, flexShrink:0 }}/>{doc.status}
                    </span>
                  </td>
                  <td style={{ padding:"13px 16px" }}>
                    <span style={{ padding:"3px 10px", borderRadius:8, fontSize:12, fontWeight:700, background:"rgba(37,99,235,0.1)", color:D?"#93c5fd":"#1d4ed8", border:"1px solid rgba(37,99,235,0.15)" }}>{aCount}</span>
                  </td>
                  <td style={{ padding:"13px 16px" }} onClick={e=>e.stopPropagation()}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{ setEditing(doc); setModal(true); }} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.2)", color:D?"#93c5fd":"#1d4ed8" }}><Edit2 size={10}/> Edit</button>
                      <button onClick={()=>{ if(window.confirm(`Delete Dr. ${name}?`)) deleteDoctor(doc.id); }} style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", display:"flex", alignItems:"center" }}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}` }}>
          <span style={{ fontSize:12, color:D?"#475569":"#94a3b8" }}>Showing <strong>{filtered.length}</strong> of <strong>{doctors.length}</strong> doctors</span>
        </div>
      </div>

      <DoctorModal open={modal} onClose={()=>{ setModal(false); setEditing(null); }} onSave={saveDoctor} editing={editing} users={users} D={D} specializations={specializations}/>
      <DoctorDrawer doctor={drawer} onClose={()=>setDrawer(null)} onEdit={d=>{ setEditing(d); setModal(true); }} onDelete={deleteDoctor} appointmentCount={drawer?apptCount(fullName(drawer)):0} D={D}/>
    </div>
  );
}
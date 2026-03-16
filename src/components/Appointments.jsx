// src/components/Appointments.jsx
import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, update, remove } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Plus, X, Search, Calendar, Clock, AlertCircle,
  Edit2, Trash2, ChevronDown, CheckCircle2, Activity,
  User, Stethoscope, PlayCircle, ChevronLeft, ChevronRight, Check,
  ThumbsUp, ThumbsDown, Bell, Mail, ShieldCheck,
} from "lucide-react";

// ─── EmailJS ──────────────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";

async function sendApprovalEmail({ toEmail, patientName, apptType, apptDate, apptTime, doctor, approved, note = "" }) {
  try {
    const response = await fetch(`https://api.emailjs.com/api/v1.0/email/send`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID, template_id: EMAILJS_TEMPLATE_ID, user_id: EMAILJS_PUBLIC_KEY,
        template_params: { to_email: toEmail, patient_name: patientName, appt_type: apptType, appt_date: apptDate, appt_time: apptTime, doctor, status: approved ? "APPROVED ✅" : "CANCELLED ❌", reason_note: note || (approved ? "Your appointment has been confirmed. Please arrive 10 minutes early." : "Please contact the clinic to reschedule.") },
      }),
    });
    if (!response.ok) throw new Error("EmailJS error");
    return true;
  } catch (err) { console.warn("⚠️ Email send failed:", err.message); return false; }
}

// ─── STATIC FALLBACKS (used only if Firebase has no data yet) ─────────────────
const FALLBACK_TYPES    = ["Consultation","Follow-up","Check-up","Prenatal","Pediatric","Cardiology","Dermatology","Dental","Eye Exam","Lab Results","Surgery Consult","Emergency","Vaccination","Other"];
const FALLBACK_STATUSES = ["Pending Approval","Scheduled","Confirmed","In Progress","Done","Cancelled","No Show"];
const FALLBACK_ROOMS    = ["Room 1","Room 2","OPD 1","OPD 2"];
const FALLBACK_DOCTORS  = ["Dr. Reyes","Dr. Santos","Dr. Lim","Dr. Cruz","Dr. Garcia","Dr. Torres","Dr. Lopez","Dr. Mendoza"];

const TIME_SLOTS = ["07:00","07:30","08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30","12:00","13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];
const EMPTY_FORM = { patientName:"", doctor:"", date:"", time:"", type:"Consultation", status:"Scheduled", notes:"", room:"" };

const fmtDate = (s) => { if (!s) return "—"; return new Date(s + "T00:00:00").toLocaleDateString("en-PH",{ weekday:"short", month:"short", day:"numeric", year:"numeric" }); };
const isToday = (s) => s === new Date().toISOString().split("T")[0];
const fmt12 = (t) => { if (!t) return t; const [h,m] = t.split(":").map(Number); const ampm = h >= 12 ? "PM" : "AM"; const hr = h === 0 ? 12 : h > 12 ? h - 12 : h; return `${hr}:${String(m).padStart(2,"0")} ${ampm}`; };

// ─── ✅ Hook: load dynamic options from Firebase Maintenance Settings ──────────
function useSettingsList(dbPath, fallback = []) {
  const [items, setItems] = useState(fallback);
  useEffect(() => {
    const unsub = onValue(ref(db, dbPath), (snap) => {
      const data = snap.val();
      if (!data) { setItems(fallback); return; }
      const list = Object.values(data).map(v => (typeof v === "string" ? v : v.label || "")).filter(Boolean).sort((a, b) => a.localeCompare(b));
      setItems(list.length > 0 ? list : fallback);
    });
    return () => unsub();
  }, [dbPath]);
  return items;
}

// ─── ✅ Hook: load doctors from /doctors collection ───────────────────────────
function useDoctorOptions() {
  const [options, setOptions] = useState(FALLBACK_DOCTORS);
  useEffect(() => {
    const unsub = onValue(ref(db, "doctors"), (snap) => {
      const data = snap.val();
      if (!data) { setOptions(FALLBACK_DOCTORS); return; }
      const list = Object.values(data).filter(d => d.status === "Active" || !d.status).map(d => `Dr. ${d.firstName} ${d.lastName}`.trim()).filter(Boolean).sort();
      setOptions(list.length > 0 ? list : FALLBACK_DOCTORS);
    });
    return () => unsub();
  }, []);
  return options;
}

const STATUS_META = {
  "Pending Approval":{ dot:"#f97316", bg:"rgba(249,115,22,0.12)",  color:"#f97316", ring:"rgba(249,115,22,0.3)",  icon: Clock },
  Scheduled:         { dot:"#94a3b8", bg:"rgba(100,116,139,0.12)", color:"#94a3b8", ring:"rgba(100,116,139,0.25)",icon: Clock },
  Confirmed:         { dot:"#60a5fa", bg:"rgba(59,130,246,0.12)",  color:"#60a5fa", ring:"rgba(59,130,246,0.25)", icon: CheckCircle2 },
  "In Progress":     { dot:"#fbbf24", bg:"rgba(251,191,36,0.12)",  color:"#fbbf24", ring:"rgba(251,191,36,0.25)", icon: Activity },
  Done:              { dot:"#34d399", bg:"rgba(52,211,153,0.12)",  color:"#34d399", ring:"rgba(52,211,153,0.25)", icon: CheckCircle2 },
  Cancelled:         { dot:"#f87171", bg:"rgba(248,113,113,0.12)", color:"#f87171", ring:"rgba(248,113,113,0.25)",icon: X },
  "No Show":         { dot:"#c084fc", bg:"rgba(192,132,252,0.12)", color:"#c084fc", ring:"rgba(192,132,252,0.25)",icon: AlertCircle },
};

const STAT_CARDS = [
  { label:"Today Total",      key:"total",      gradient:["#3b82f6","#6366f1"], glow:"rgba(99,102,241,0.3)",  icon: Calendar },
  { label:"Pending Approval", key:"pending",    gradient:["#f97316","#f59e0b"], glow:"rgba(249,115,22,0.3)",  icon: Clock },
  { label:"Confirmed",        key:"confirmed",  gradient:["#10b981","#059669"], glow:"rgba(16,185,129,0.3)",  icon: CheckCircle2 },
  { label:"In Progress",      key:"inprogress", gradient:["#a855f7","#7c3aed"], glow:"rgba(168,85,247,0.3)",  icon: Activity },
];

const inputBase = (D, focused = false) => ({ width:"100%", boxSizing:"border-box", background: D ? "rgba(255,255,255,0.06)" : "#f8fafc", border: `1px solid ${focused ? "#3b82f6" : D ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, borderRadius:12, padding:"10px 14px", color: D ? "#e2e8f0" : "#1e293b", fontSize:13, outline:"none", boxShadow: focused ? "0 0 0 3px rgba(59,130,246,0.15)" : "none", transition:"border-color 0.2s, box-shadow 0.2s" });

function SInput({ D, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return <input {...props} style={{ ...inputBase(D, focused), ...style }} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />;
}

function CDropdown({ D, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const dropRef = useRef(null);
  useEffect(() => { const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);
  const selected = options.find(o => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : placeholder ?? "Select…";
  const textColor = D ? "#e2e8f0" : "#1e293b"; const mutedColor = D ? "#475569" : "#94a3b8"; const hoverBg = D ? "rgba(99,102,241,0.12)" : "#f0f4ff";
  return (
    <div ref={dropRef} style={{ position:"relative", userSelect:"none" }}>
      <div onClick={() => setOpen(o => !o)} style={{ ...inputBase(D, open), display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", paddingRight:12 }}>
        <span style={{ color: value ? textColor : mutedColor, fontSize:13 }}>{label}</span>
        <ChevronDown size={13} style={{ color: mutedColor, transition:"transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink:0 }}/>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:999, background: D?"#161b27":"#ffffff", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:14, boxShadow: D?"0 20px 60px rgba(0,0,0,0.7)":"0 12px 40px rgba(0,0,0,0.15)", maxHeight:220, overflowY:"auto", padding:"6px", animation:"dropIn 0.15s cubic-bezier(.16,1,.3,1)" }}>
          {options.length === 0 ? (
            <div style={{ padding:"12px 14px", textAlign:"center", fontSize:12, color:"#64748b" }}>No options yet — add in Maintenance Settings.</div>
          ) : options.map((o, i) => {
            const val = o.value ?? o; const lbl = o.label ?? o; const isSel = val === value;
            return (
              <div key={i} onClick={() => { onChange(val); setOpen(false); }}
                style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", borderRadius:9, cursor:"pointer", fontSize:13, color: isSel?"#818cf8":textColor, background: isSel?"rgba(99,102,241,0.15)":"transparent", fontWeight: isSel?600:400 }}
                onMouseEnter={e => { if(!isSel) e.currentTarget.style.background = hoverBg; }}
                onMouseLeave={e => { if(!isSel) e.currentTarget.style.background = "transparent"; }}
              >
                {lbl}{isSel && <Check size={13} style={{ color:"#818cf8", flexShrink:0 }}/>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FLabel({ D, icon: Icon, children }) {
  return <label style={{ display:"block", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6, color: D ? "#475569" : "#94a3b8" }}>{Icon && <Icon size={10} style={{ display:"inline", marginRight:5, verticalAlign:"middle" }}/>}{children}</label>;
}

// ─── Booking Modal ────────────────────────────────────────────────────────────
function BookingModal({ open, onClose, onSave, editing, patients, D, apptTypes, apptStatuses, apptRooms, doctors }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (open) { setForm(editing ? { ...EMPTY_FORM, ...editing } : { ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] }); setError(""); } }, [open, editing]);
  if (!open) return null;
  const set = (k) => (v) => setForm(p => ({ ...p, [k]: v }));
  const setE = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const validate = () => { if (!form.patientName.trim()) return "Patient name is required."; if (!form.doctor) return "Please select a doctor."; if (!form.date) return "Please select a date."; if (!form.time) return "Please select a time slot."; return ""; };
  const handleSave = async () => { const err = validate(); if (err) { setError(err); return; } setSaving(true); try { await onSave(form); onClose(); } catch { setError("Failed to save. Check your connection."); } finally { setSaving(false); } };
  const patientOpts = patients.map(p => ({ value: `${p.firstName} ${p.lastName}`, label: `${p.firstName} ${p.lastName} (${p.patientId})` }));
  const cardBg = D ? "#0d1117" : "#ffffff"; const border = D ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(14px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:560, maxHeight:"90vh", overflowY:"auto", background:cardBg, border:`1px solid ${border}`, borderRadius:24, boxShadow:"0 40px 100px rgba(0,0,0,0.5)" }}>
        <div style={{ height:3, borderRadius:"24px 24px 0 0", background:"linear-gradient(90deg,#3b82f6,#8b5cf6,#06b6d4)" }}/>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
            <div><h2 style={{ margin:0, fontSize:18, fontWeight:700, color: D?"#f1f5f9":"#0f172a" }}>{editing?"Edit Appointment":"Book Appointment"}</h2><p style={{ margin:"4px 0 0", fontSize:12, color: D?"#475569":"#94a3b8" }}>Fill in the details below</p></div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color: D?"#475569":"#94a3b8", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16}/></button>
          </div>
          {error && <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:18, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}><AlertCircle size={14}/> {error}</div>}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <FLabel D={D} icon={User}>Patient Name</FLabel>
              {patients.length > 0 ? <CDropdown D={D} value={form.patientName} onChange={set("patientName")} options={patientOpts} placeholder="— Select registered patient —"/> : <SInput D={D} placeholder="Patient full name" value={form.patientName} onChange={setE("patientName")}/>}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={Stethoscope}>Doctor</FLabel>
                {/* ✅ FROM /doctors collection */}
                <CDropdown D={D} value={form.doctor} onChange={set("doctor")} options={doctors} placeholder="Select doctor"/></div>
              <div><FLabel D={D}>Appointment Type</FLabel>
                {/* ✅ FROM settings/appointments/types */}
                <CDropdown D={D} value={form.type} onChange={set("type")} options={apptTypes}/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={Calendar}>Date</FLabel><SInput D={D} type="date" value={form.date} onChange={setE("date")} min={new Date().toISOString().split("T")[0]}/></div>
              <div><FLabel D={D} icon={Clock}>Time Slot</FLabel><CDropdown D={D} value={form.time} onChange={set("time")} options={TIME_SLOTS.map(t=>({ value:t, label:fmt12(t) }))} placeholder="Select time"/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D}>Room / Clinic</FLabel>
                {/* ✅ FROM settings/appointments/rooms */}
                <CDropdown D={D} value={form.room} onChange={set("room")} options={apptRooms} placeholder="Select room"/></div>
              <div><FLabel D={D}>Status</FLabel>
                {/* ✅ FROM settings/appointments/statuses */}
                <CDropdown D={D} value={form.status} onChange={set("status")} options={apptStatuses}/></div>
            </div>
            <div><FLabel D={D}>Notes / Remarks</FLabel><textarea value={form.notes} onChange={setE("notes")} placeholder="Reason for visit, special instructions…" rows={3} style={{ ...inputBase(D), resize:"vertical" }}/></div>
          </div>
          <div style={{ display:"flex", gap:12, marginTop:24 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"13px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#3b82f6,#6366f1)", color:"white", fontSize:14, fontWeight:700, boxShadow:"0 8px 24px rgba(99,102,241,0.35)", opacity: saving?0.7:1 }}>{saving?"Saving…":editing?"Update Appointment":"Book Appointment"}</button>
            <button onClick={onClose} style={{ flex:1, padding:"13px 0", borderRadius:14, cursor:"pointer", fontSize:14, fontWeight:600, background: D?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, color: D?"#94a3b8":"#64748b" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Approval Modal ───────────────────────────────────────────────────────────
function ApprovalModal({ appt, onClose, onApprove, onReject, D }) {
  const [rejectNote, setRejectNote] = useState(""); const [showRejectNote, setShowRejectNote] = useState(false); const [loading, setLoading] = useState(null);
  if (!appt) return null;
  const cardBg = D?"#0d1117":"#ffffff"; const border = D?"rgba(255,255,255,0.08)":"#e2e8f0";
  const handleApprove = async () => { setLoading("approve"); await onApprove(appt); setLoading(null); onClose(); };
  const handleReject  = async () => { setLoading("reject"); await onReject(appt, rejectNote); setLoading(null); onClose(); };
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.82)", backdropFilter:"blur(14px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:460, background:cardBg, border:`1px solid ${border}`, borderRadius:24, boxShadow:"0 40px 100px rgba(0,0,0,0.5)", overflow:"hidden" }}>
        <div style={{ height:3, background:"linear-gradient(90deg,#f97316,#f59e0b,#3b82f6)" }}/>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:14, background:"rgba(249,115,22,0.15)", border:"1px solid rgba(249,115,22,0.3)", display:"flex", alignItems:"center", justifyContent:"center" }}><ShieldCheck size={22} color="#f97316"/></div>
              <div><h2 style={{ margin:0, fontSize:17, fontWeight:700, color: D?"#f1f5f9":"#0f172a" }}>Review Appointment</h2><p style={{ margin:"3px 0 0", fontSize:11, color:"#64748b" }}>Approve or reject this patient request</p></div>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b" }}><X size={16}/></button>
          </div>
          <div style={{ background: D?"rgba(255,255,255,0.04)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.08)":"#e2e8f0"}`, borderRadius:16, padding:"16px 18px", marginBottom:20 }}>
            {[["👤 Patient",appt.patientName],["🏥 Doctor",appt.doctor],["📋 Type",appt.type],["📅 Date",fmtDate(appt.date)],["🕐 Time",fmt12(appt.time)],...(appt.reason?[["💬 Reason",appt.reason]]:[]),...(appt.notes?[["📝 Notes",appt.notes]]:[])].map(([l,v])=>(
              <div key={l} style={{ display:"flex", gap:12, marginBottom:8 }}><span style={{ fontSize:12, color:"#64748b", minWidth:90, flexShrink:0 }}>{l}</span><span style={{ fontSize:12, fontWeight:600, color: D?"#e2e8f0":"#0f172a" }}>{v}</span></div>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12, background:"rgba(59,130,246,0.07)", border:"1px solid rgba(59,130,246,0.15)", marginBottom:20 }}>
            <Mail size={13} color="#60a5fa"/><p style={{ margin:0, fontSize:11, color: D?"#93c5fd":"#1e40af" }}>Patient will automatically receive an email notification with the decision.</p>
          </div>
          {showRejectNote && (
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6, color:"#94a3b8" }}>Rejection Note (optional)</label>
              <textarea value={rejectNote} onChange={e=>setRejectNote(e.target.value)} placeholder="e.g. Doctor unavailable on this date. Please reschedule." rows={3} style={{ ...inputBase(D), resize:"none" }}/>
            </div>
          )}
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={handleApprove} disabled={!!loading} style={{ flex:1, padding:"13px 0", borderRadius:14, border:"none", cursor:loading?"not-allowed":"pointer", background:loading==="approve"?"rgba(16,185,129,0.5)":"linear-gradient(135deg,#10b981,#059669)", color:"white", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading==="approve"?<><div style={{ width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",animation:"spin .7s linear infinite" }}/> Approving…</>:<><ThumbsUp size={15}/> Approve</>}
            </button>
            <button onClick={()=>showRejectNote?handleReject():setShowRejectNote(true)} disabled={!!loading} style={{ flex:1, padding:"13px 0", borderRadius:14, border:showRejectNote?"none":"1px solid rgba(239,68,68,0.25)", cursor:loading?"not-allowed":"pointer", background:loading==="reject"?"rgba(239,68,68,0.5)":showRejectNote?"linear-gradient(135deg,#ef4444,#dc2626)":D?"rgba(239,68,68,0.12)":"rgba(239,68,68,0.08)", color:showRejectNote?"#fff":"#f87171", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {loading==="reject"?<><div style={{ width:14,height:14,borderRadius:"50%",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",animation:"spin .7s linear infinite" }}/> Rejecting…</>:<><ThumbsDown size={15}/>{showRejectNote?"Confirm Rejection":"Reject"}</>}
            </button>
          </div>
          {showRejectNote&&<button onClick={()=>setShowRejectNote(false)} style={{ marginTop:8, width:"100%", background:"none", border:"none", fontSize:12, color:"#64748b", cursor:"pointer", textDecoration:"underline" }}>← Go back</button>}
        </div>
      </div>
    </div>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────
function MiniCalendar({ appointments, selectedDate, onSelectDate, D }) {
  const [view, setView] = useState(new Date());
  const DAYS=["Su","Mo","Tu","We","Th","Fr","Sa"]; const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const y=view.getFullYear(),m=view.getMonth(); const firstDay=new Date(y,m,1).getDay(); const daysInMonth=new Date(y,m+1,0).getDate(); const todayStr=new Date().toISOString().split("T")[0];
  const cardBg=D?"#0d1117":"#ffffff"; const cardBorder=D?"rgba(255,255,255,0.07)":"#f1f5f9";
  const hasAppt=d=>{const s=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;return appointments.some(a=>a.date===s);};
  const hasPending=d=>{const s=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;return appointments.some(a=>a.date===s&&a.status==="Pending Approval");};
  const pick=d=>{const s=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;onSelectDate(selectedDate===s?null:s);};
  return (
    <div style={{ background:cardBg, border:`1px solid ${cardBorder}`, borderRadius:20, padding:18, marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:14, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>{MONTHS[m]} {y}</span>
        <div style={{ display:"flex", gap:4 }}>
          {[-1,1].map(d=><button key={d} onClick={()=>setView(new Date(y,m+d,1))} style={{ width:26,height:26,borderRadius:8,border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`,background:D?"rgba(255,255,255,0.05)":"#f8fafc",color:D?"#64748b":"#94a3b8",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>{d<0?<ChevronLeft size={12}/>:<ChevronRight size={12}/>}</button>)}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, textAlign:"center" }}>
        {DAYS.map(d=><div key={d} style={{ fontSize:10, fontWeight:700, color:D?"#334155":"#cbd5e1", paddingBottom:6 }}>{d}</div>)}
        {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth}).map((_,i)=>{
          const day=i+1; const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const isTdy=ds===todayStr,isSel=ds===selectedDate,hasA=hasAppt(day),hasP=hasPending(day);
          return (<div key={day} onClick={()=>pick(day)} style={{ position:"relative",width:28,height:28,borderRadius:"50%",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:11,background:isSel?"linear-gradient(135deg,#3b82f6,#6366f1)":isTdy?"rgba(99,102,241,0.15)":"transparent",color:isSel?"#fff":isTdy?"#818cf8":D?"#64748b":"#475569",fontWeight:isTdy||isSel?700:400 }}>
            {day}
            {hasP&&!isSel&&<span style={{ position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:3,height:3,borderRadius:"50%",background:"#f97316" }}/>}
            {hasA&&!hasP&&!isSel&&<span style={{ position:"absolute",bottom:1,left:"50%",transform:"translateX(-50%)",width:3,height:3,borderRadius:"50%",background:"#3b82f6" }}/>}
          </div>);
        })}
      </div>
      {selectedDate&&<button onClick={()=>onSelectDate(null)} style={{ marginTop:12,width:"100%",background:"none",border:"none",fontSize:11,color:"#64748b",cursor:"pointer",textDecoration:"underline" }}>Clear date filter</button>}
    </div>
  );
}

// ─── Pending Panel ────────────────────────────────────────────────────────────
function PendingPanel({ pending, onReview, D }) {
  if (pending.length===0) return null;
  const cardBg=D?"#0d1117":"#ffffff";
  return (
    <div style={{ background:cardBg, border:"1.5px solid rgba(249,115,22,0.3)", borderRadius:20, padding:18, marginBottom:12, position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle,rgba(249,115,22,0.2),transparent 70%)",pointerEvents:"none" }}/>
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
        <div style={{ width:6,height:20,borderRadius:3,background:"linear-gradient(180deg,#f97316,#f59e0b)" }}/>
        <span style={{ fontSize:13,fontWeight:700,color:D?"#f1f5f9":"#0f172a",flex:1 }}>Pending Approval</span>
        <span style={{ fontSize:11,fontWeight:800,background:"linear-gradient(135deg,#f97316,#f59e0b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",padding:"2px 8px",borderRadius:20,border:"1px solid rgba(249,115,22,0.3)" }}>{pending.length}</span>
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {pending.slice(0,5).map(a=>(
          <div key={a.id} style={{ background:D?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.05)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:12,padding:"10px 12px" }}>
            <p style={{ margin:0,fontSize:12,fontWeight:700,color:D?"#e2e8f0":"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.patientName}</p>
            <p style={{ margin:"2px 0 4px",fontSize:10,color:"#64748b" }}>{a.type} · {a.doctor}</p>
            <p style={{ margin:"0 0 6px",fontSize:10,fontWeight:600,color:"#f97316" }}>{fmtDate(a.date)} · {fmt12(a.time)}</p>
            <button onClick={()=>onReview(a)} style={{ width:"100%",padding:"7px 0",borderRadius:9,border:"none",cursor:"pointer",background:"linear-gradient(135deg,rgba(249,115,22,0.9),rgba(245,158,11,0.9))",color:"white",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <ShieldCheck size={12}/> Review Request
            </button>
          </div>
        ))}
        {pending.length>5&&<p style={{ margin:0,fontSize:11,color:"#64748b",textAlign:"center" }}>+{pending.length-5} more pending…</p>}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Appointments() {
  const { isDark: D } = useTheme();

  // ✅ All dropdowns sourced from Firebase Maintenance Settings
  const apptTypes    = useSettingsList("settings/appointments/types",    FALLBACK_TYPES);
  const apptStatuses = useSettingsList("settings/appointments/statuses", FALLBACK_STATUSES);
  const apptRooms    = useSettingsList("settings/appointments/rooms",    FALLBACK_ROOMS);
  const doctors      = useDoctorOptions();

  const [appointments, setAppointments] = useState([]);
  const [patients,     setPatients]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDoctor, setFilterDoctor] = useState("All");
  const [selectedDate, setSelectedDate] = useState(null);
  const [modal,        setModal]        = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [reviewingAppt,setReviewingAppt]= useState(null);
  const [toast,        setToast]        = useState(null);

  useEffect(() => {
    const unsub = onValue(ref(db,"appointments"), snap => {
      const data = snap.val();
      setAppointments(data?Object.entries(data).map(([id,v])=>({id,...v})).sort((a,b)=>a.date!==b.date?(a.date>b.date?1:-1):(a.time>b.time?1:-1)):[]);
      setLoading(false);
    });
    return ()=>unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db,"patients"), snap => { const data=snap.val(); setPatients(data?Object.entries(data).map(([id,v])=>({id,...v})):[]); });
    return ()=>unsub();
  }, []);

  const showToast = (title, msg, type="success") => { setToast({title,msg,type}); setTimeout(()=>setToast(null),4000); };
  const genId = () => `A-${String(appointments.length+1).padStart(4,"0")}`;
  const saveAppt = async (form) => { const now=Date.now(); if(editing) await update(ref(db,`appointments/${editing.id}`),{...form,updatedAt:now}); else await push(ref(db,"appointments"),{...form,apptId:genId(),createdAt:now,updatedAt:now}); };
  const deleteAppt  = (id) => remove(ref(db,`appointments/${id}`));
  const quickStatus = (id,status) => update(ref(db,`appointments/${id}`),{status,updatedAt:Date.now()});

  const handleApprove = async (appt) => {
    const now=Date.now();
    await update(ref(db,`appointments/${appt.id}`),{status:"Scheduled",approvedAt:now,approvedBy:"admin",updatedAt:now});
    if(appt.patientEmail) await sendApprovalEmail({toEmail:appt.patientEmail,patientName:appt.patientName,apptType:appt.type,apptDate:fmtDate(appt.date),apptTime:fmt12(appt.time),doctor:appt.doctor,approved:true});
    showToast("Appointment Approved ✅",`${appt.patientName}'s ${appt.type} on ${fmtDate(appt.date)} has been approved.`);
  };
  const handleReject = async (appt, note="") => {
    const now=Date.now();
    await update(ref(db,`appointments/${appt.id}`),{status:"Cancelled",rejectionNote:note||"",rejectedAt:now,rejectedBy:"admin",updatedAt:now});
    if(appt.patientEmail) await sendApprovalEmail({toEmail:appt.patientEmail,patientName:appt.patientName,apptType:appt.type,apptDate:fmtDate(appt.date),apptTime:fmt12(appt.time),doctor:appt.doctor,approved:false,note});
    showToast("Appointment Rejected",`${appt.patientName}'s appointment has been cancelled.`,"error");
  };

  const todayList       = appointments.filter(a=>isToday(a.date));
  const pendingApproval = appointments.filter(a=>a.status==="Pending Approval");
  const allStatuses     = ["All",...apptStatuses];
  const allDoctors      = ["All",...doctors];

  const filtered = appointments.filter(a => {
    const q=search.toLowerCase();
    return ((a.patientName||"").toLowerCase().includes(q)||(a.doctor||"").toLowerCase().includes(q)||(a.apptId||"").toLowerCase().includes(q))
      &&(filterStatus==="All"||a.status===filterStatus)&&(filterDoctor==="All"||a.doctor===filterDoctor)&&(!selectedDate||a.date===selectedDate);
  });

  const statValues = { total:todayList.length, pending:pendingApproval.length, confirmed:todayList.filter(a=>a.status==="Confirmed").length, inprogress:todayList.filter(a=>a.status==="In Progress").length };
  const pageBg=D?"#080b12":"#f8fafc"; const cardBg=D?"#0d1117":"#ffffff"; const cardBorder=D?"rgba(255,255,255,0.07)":"#f1f5f9";

  return (
    <div style={{ padding:24, background:pageBg, minHeight:"100%", display:"grid", gridTemplateColumns:"1fr 284px", gap:20 }}>
      <div style={{ minWidth:0, display:"flex", flexDirection:"column", gap:20 }}>

        {pendingApproval.length>0&&(
          <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 20px",borderRadius:16,background:D?"rgba(249,115,22,0.1)":"rgba(249,115,22,0.07)",border:"1.5px solid rgba(249,115,22,0.35)",position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",right:-10,top:"50%",transform:"translateY(-50%)",width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle,rgba(249,115,22,0.2),transparent 70%)",pointerEvents:"none" }}/>
            <div style={{ width:42,height:42,borderRadius:13,background:"rgba(249,115,22,0.15)",border:"1px solid rgba(249,115,22,0.3)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Bell size={20} color="#f97316"/></div>
            <div style={{ flex:1 }}><p style={{ margin:0,fontSize:14,fontWeight:800,color:D?"#fed7aa":"#c2410c" }}>{pendingApproval.length} Appointment Request{pendingApproval.length>1?"s":""} Awaiting Your Approval</p><p style={{ margin:"3px 0 0",fontSize:12,color:D?"#94a3b8":"#9a3412" }}>Review and approve or reject patient-submitted appointments below.</p></div>
            <button onClick={()=>setFilterStatus("Pending Approval")} style={{ padding:"8px 16px",borderRadius:10,border:"1.5px solid rgba(249,115,22,0.4)",background:"rgba(249,115,22,0.15)",color:"#f97316",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0 }}>View All →</button>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
          {STAT_CARDS.map(s=>{const Icon=s.icon;const isPendingCard=s.key==="pending";return(
            <div key={s.key} onClick={()=>isPendingCard?setFilterStatus("Pending Approval"):null}
              style={{ background:cardBg,border:isPendingCard&&statValues.pending>0?"1px solid rgba(249,115,22,0.3)":`1px solid ${cardBorder}`,borderRadius:20,padding:"20px 20px 18px",position:"relative",overflow:"hidden",transition:"transform 0.2s,box-shadow 0.2s",cursor:isPendingCard?"pointer":"default" }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 16px 40px ${s.glow}`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
              <div style={{ position:"absolute",top:0,left:0,right:0,height:3,borderRadius:"20px 20px 0 0",background:`linear-gradient(90deg,${s.gradient[0]},${s.gradient[1]})` }}/>
              <div style={{ position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`radial-gradient(circle,${s.glow},transparent 70%)`,pointerEvents:"none" }}/>
              <div style={{ width:36,height:36,borderRadius:10,background:`linear-gradient(135deg,${s.gradient[0]},${s.gradient[1]})`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 6px 16px ${s.glow}`,marginBottom:14 }}><Icon size={16} color="white"/></div>
              <p style={{ margin:0,fontSize:30,fontWeight:800,background:`linear-gradient(135deg,${s.gradient[0]},${s.gradient[1]})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>{statValues[s.key]}</p>
              <p style={{ margin:"4px 0 0",fontSize:12,color:D?"#334155":"#94a3b8",fontWeight:500 }}>{s.label}</p>
            </div>
          );})}
        </div>

        <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
          <div style={{ flex:1,minWidth:200,display:"flex",alignItems:"center",gap:10,background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:14,padding:"10px 16px" }}>
            <Search size={15} style={{ color:D?"#334155":"#94a3b8",flexShrink:0 }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient, doctor, ID…" style={{ flex:1,background:"none",border:"none",outline:"none",fontSize:13,color:D?"#e2e8f0":"#1e293b" }}/>
            {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",display:"flex" }}><X size={13}/></button>}
          </div>
          {/* ✅ Dynamic status & doctor filters */}
          <div style={{ width:165 }}><CDropdown D={D} value={filterStatus} onChange={setFilterStatus} options={allStatuses}/></div>
          <div style={{ width:155 }}><CDropdown D={D} value={filterDoctor} onChange={setFilterDoctor} options={allDoctors.map(d=>({value:d,label:d==="All"?"All Doctors":d}))}/></div>
          <button onClick={()=>{setEditing(null);setModal(true);}} style={{ display:"flex",alignItems:"center",gap:8,background:"linear-gradient(135deg,#3b82f6,#6366f1)",border:"none",borderRadius:14,padding:"10px 20px",color:"white",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 8px 20px rgba(99,102,241,0.35)",whiteSpace:"nowrap" }}>
            <Plus size={16}/> Book Appointment
          </button>
        </div>

        <div style={{ background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:20,overflow:"hidden",flex:1 }}>
          <table style={{ width:"100%",borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`,background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
                {["ID","Patient","Doctor","Date","Time","Type","Room","Status","Actions"].map(h=><th key={h} style={{ textAlign:"left",padding:"13px 16px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.8px",color:D?"#334155":"#94a3b8" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading?(
                <tr><td colSpan={9} style={{ padding:60,textAlign:"center" }}><div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:12 }}><div style={{ width:32,height:32,borderRadius:"50%",border:"2px solid #3b82f6",borderTopColor:"transparent",animation:"spin 0.8s linear infinite" }}/><p style={{ color:"#475569",fontSize:13,margin:0 }}>Loading appointments…</p></div></td></tr>
              ):filtered.length===0?(
                <tr><td colSpan={9} style={{ padding:60,textAlign:"center" }}><div style={{ fontSize:32,marginBottom:8 }}>📅</div><p style={{ color:D?"#475569":"#64748b",fontSize:14,fontWeight:600,margin:0 }}>No appointments found</p><p style={{ color:"#334155",fontSize:12,margin:"4px 0 0" }}>Try adjusting your filters</p></td></tr>
              ):filtered.map((a,idx)=>{
                const sm=STATUS_META[a.status]||STATUS_META.Scheduled; const isEven=idx%2===0; const isPending=a.status==="Pending Approval";
                return(
                  <tr key={a.id}
                    style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`,transition:"background 0.15s",background:isPending?(D?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.03)"):D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#ffffff":"#fafffe") }}
                    onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(99,102,241,0.06)":"#f0f4ff"}
                    onMouseLeave={e=>e.currentTarget.style.background=isPending?(D?"rgba(249,115,22,0.06)":"rgba(249,115,22,0.03)"):D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#ffffff":"#fafffe")}
                  >
                    <td style={{ padding:"13px 16px" }}><span style={{ fontFamily:"monospace",fontSize:11,color:D?"#334155":"#94a3b8" }}>{a.apptId}</span>{isToday(a.date)&&<span style={{ display:"block",fontSize:9,fontWeight:800,letterSpacing:"0.5px",background:"linear-gradient(90deg,#3b82f6,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>TODAY</span>}</td>
                    <td style={{ padding:"13px 16px",fontSize:13,fontWeight:600,color:D?"#e2e8f0":"#0f172a" }}>{a.patientName}</td>
                    <td style={{ padding:"13px 16px",fontSize:12,color:"#64748b" }}>{a.doctor}</td>
                    <td style={{ padding:"13px 16px",fontSize:12,color:D?"#475569":"#64748b" }}>{fmtDate(a.date)}</td>
                    <td style={{ padding:"13px 16px" }}><span style={{ padding:"3px 10px",borderRadius:8,fontSize:12,fontWeight:700,background:"rgba(59,130,246,0.12)",color:"#60a5fa",border:"1px solid rgba(59,130,246,0.2)" }}>{fmt12(a.time)}</span></td>
                    <td style={{ padding:"13px 16px" }}><span style={{ padding:"3px 10px",borderRadius:8,fontSize:11,background:"rgba(139,92,246,0.12)",color:"#a78bfa",border:"1px solid rgba(139,92,246,0.2)" }}>{a.type}</span></td>
                    <td style={{ padding:"13px 16px",fontSize:12,color:D?"#334155":"#94a3b8" }}>{a.room||"—"}</td>
                    <td style={{ padding:"13px 16px" }}><span style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:600,background:sm.bg,color:sm.color,border:`1px solid ${sm.ring}` }}><span style={{ width:6,height:6,borderRadius:"50%",background:sm.dot,flexShrink:0 }}/>{a.status}</span></td>
                    <td style={{ padding:"13px 16px" }}>
                      <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                        {isPending?(
                          <button onClick={()=>setReviewingAppt(a)} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:700,background:"linear-gradient(135deg,rgba(249,115,22,0.9),rgba(245,158,11,0.9))",border:"none",color:"#fff",whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(249,115,22,0.3)" }}><ShieldCheck size={11}/> Review</button>
                        ):(
                          <><button onClick={()=>{setEditing(a);setModal(true);}} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,cursor:"pointer",fontSize:11,fontWeight:600,background:"rgba(59,130,246,0.1)",border:"1px solid rgba(59,130,246,0.2)",color:"#60a5fa" }}><Edit2 size={10}/> Edit</button>
                          <button onClick={()=>{if(window.confirm("Delete this appointment?"))deleteAppt(a.id);}} style={{ padding:"5px 8px",borderRadius:8,cursor:"pointer",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#f87171",display:"flex",alignItems:"center" }}><Trash2 size={11}/></button></>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding:"12px 16px",borderTop:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ fontSize:12,color:"#334155" }}>Showing <strong style={{ color:D?"#94a3b8":"#475569" }}>{filtered.length}</strong> of <strong style={{ color:D?"#94a3b8":"#475569" }}>{appointments.length}</strong> appointments{selectedDate&&<span style={{ color:"#60a5fa",marginLeft:6 }}>• {fmtDate(selectedDate)}</span>}</span>
            {pendingApproval.length>0&&<span style={{ fontSize:11,fontWeight:700,padding:"3px 12px",borderRadius:20,background:"rgba(249,115,22,0.12)",color:"#f97316",border:"1px solid rgba(249,115,22,0.25)" }}>⏳ {pendingApproval.length} pending approval</span>}
          </div>
        </div>
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        <PendingPanel pending={pendingApproval} onReview={setReviewingAppt} D={D}/>
        <MiniCalendar appointments={appointments} selectedDate={selectedDate} onSelectDate={setSelectedDate} D={D}/>

        <div style={{ background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:20,padding:18 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
            <div style={{ width:6,height:20,borderRadius:3,background:"linear-gradient(180deg,#3b82f6,#6366f1)" }}/>
            <span style={{ fontSize:13,fontWeight:700,color:D?"#f1f5f9":"#0f172a" }}>Queue Today</span>
            {todayList.length>0&&<span style={{ marginLeft:"auto",fontSize:11,fontWeight:700,background:"rgba(99,102,241,0.15)",color:"#818cf8",padding:"2px 8px",borderRadius:20 }}>{todayList.length}</span>}
          </div>
          {todayList.length===0?<p style={{ fontSize:12,color:"#334155",textAlign:"center",padding:"16px 0" }}>No appointments today</p>:(
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {(()=>{const cur=todayList.find(a=>a.status==="In Progress");return cur?(<div style={{ padding:"12px 14px",borderRadius:14,background:"linear-gradient(135deg,rgba(59,130,246,0.15),rgba(99,102,241,0.1))",border:"1px solid rgba(99,102,241,0.25)",marginBottom:4 }}><p style={{ margin:0,fontSize:9,fontWeight:800,letterSpacing:"1px",color:"#6366f1",marginBottom:4 }}>NOW SERVING</p><p style={{ margin:0,fontSize:14,fontWeight:700,background:"linear-gradient(90deg,#60a5fa,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>{cur.patientName}</p><p style={{ margin:"2px 0 0",fontSize:11,color:"#475569" }}>{cur.doctor} • {fmt12(cur.time)}</p></div>):null;})()}
              {todayList.filter(a=>a.status==="Scheduled"||a.status==="Confirmed").slice(0,5).map((a,i)=>(
                <div key={a.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderRadius:12,background:D?"rgba(255,255,255,0.03)":"#f8fafc",border:`1px solid ${D?"rgba(255,255,255,0.06)":"#f1f5f9"}` }}>
                  <div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0 }}>
                    <div style={{ width:24,height:24,borderRadius:8,flexShrink:0,background:"linear-gradient(135deg,rgba(99,102,241,0.2),rgba(59,130,246,0.1))",border:"1px solid rgba(99,102,241,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:"#818cf8" }}>{i+1}</div>
                    <div style={{ minWidth:0 }}><p style={{ margin:0,fontSize:12,fontWeight:600,color:D?"#e2e8f0":"#0f172a",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.patientName}</p><p style={{ margin:0,fontSize:10,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.doctor}</p></div>
                  </div>
                  <div style={{ textAlign:"right",flexShrink:0,marginLeft:8 }}><p style={{ margin:0,fontSize:11,fontWeight:800,color:"#60a5fa" }}>{fmt12(a.time)}</p><button onClick={()=>quickStatus(a.id,"In Progress")} style={{ background:"none",border:"none",cursor:"pointer",padding:0,marginTop:2,display:"flex",alignItems:"center",gap:3,fontSize:9,fontWeight:700,color:"#34d399" }}><PlayCircle size={9}/> Start</button></div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ✅ Status Summary — dynamic from apptStatuses */}
        <div style={{ background:cardBg,border:`1px solid ${cardBorder}`,borderRadius:20,padding:18 }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:14 }}>
            <div style={{ width:6,height:20,borderRadius:3,background:"linear-gradient(180deg,#f59e0b,#ef4444)" }}/>
            <span style={{ fontSize:13,fontWeight:700,color:D?"#f1f5f9":"#0f172a" }}>Status Summary</span>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {apptStatuses.map(s=>{
              const count=appointments.filter(a=>a.status===s).length;
              const sm=STATUS_META[s]||{dot:"#94a3b8",bg:"rgba(148,163,184,0.1)",color:"#94a3b8",ring:"rgba(148,163,184,0.25)",icon:Clock};
              const Ico=sm.icon; const pct=appointments.length>0?(count/appointments.length)*100:0;
              return(<div key={s}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5 }}>
                  <span style={{ display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:500,color:sm.color }}><Ico size={11}/> {s}</span>
                  <span style={{ fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:sm.bg,color:sm.color,border:`1px solid ${sm.ring}` }}>{count}</span>
                </div>
                <div style={{ height:3,borderRadius:2,background:D?"rgba(255,255,255,0.05)":"#f1f5f9",overflow:"hidden" }}>
                  <div style={{ height:"100%",width:`${pct}%`,borderRadius:2,background:sm.dot,transition:"width 0.5s ease" }}/>
                </div>
              </div>);
            })}
          </div>
        </div>
      </div>

      <BookingModal open={modal} onClose={()=>{setModal(false);setEditing(null);}} onSave={saveAppt} editing={editing} patients={patients} D={D}
        apptTypes={apptTypes} apptStatuses={apptStatuses} apptRooms={apptRooms} doctors={doctors}/>

      {reviewingAppt&&<ApprovalModal appt={reviewingAppt} onClose={()=>setReviewingAppt(null)} onApprove={handleApprove} onReject={handleReject} D={D}/>}

      {toast&&(
        <div style={{ position:"fixed",bottom:24,right:24,zIndex:9999,background:D?"#1e293b":"#fff",border:`1px solid ${toast.type==="error"?"rgba(239,68,68,0.3)":"rgba(34,197,94,0.3)"}`,borderRadius:16,padding:"14px 18px",boxShadow:"0 16px 48px rgba(0,0,0,0.2)",display:"flex",alignItems:"center",gap:12,animation:"toastIn .3s ease",maxWidth:340 }}>
          <div style={{ width:36,height:36,borderRadius:11,background:toast.type==="error"?"rgba(239,68,68,0.1)":"rgba(34,197,94,0.1)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{toast.type==="error"?<X size={18} color="#f87171"/>:<CheckCircle2 size={18} color="#22c55e"/>}</div>
          <div style={{ flex:1 }}><p style={{ margin:"0 0 2px",fontSize:13,fontWeight:700,color:D?"#f1f5f9":"#0f172a" }}>{toast.title}</p><p style={{ margin:0,fontSize:11,color:"#64748b" }}>{toast.msg}</p></div>
          <button onClick={()=>setToast(null)} style={{ background:"none",border:"none",cursor:"pointer",color:"#94a3b8",display:"flex" }}><X size={14}/></button>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes dropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}} @keyframes toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
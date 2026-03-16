// src/components/IPD.jsx
import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, update, remove } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Plus, X, Search, Edit2, Trash2, ChevronDown, Check,
  AlertCircle, Bed, User, Calendar, Stethoscope,
  Clock, LogOut, Heart, Activity, MapPin, Phone,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const WARDS = ["General Ward","Private Room","Semi-Private","ICU","NICU","Pediatric Ward","Maternity Ward","Surgical Ward","Emergency Ward"];
const BED_STATUS = ["Available","Occupied","Reserved","Maintenance"];
const ADMISSION_TYPES = ["Emergency","Elective","Transfer","Observation"];
const PATIENT_CONDITIONS = ["Stable","Fair","Serious","Critical","Improved","Recovered"];

const STATUS_META = {
  Admitted:   { hex:"#3b82f6", bg:"rgba(59,130,246,0.1)",  ring:"rgba(59,130,246,0.25)"  },
  Discharged: { hex:"#22c55e", bg:"rgba(34,197,94,0.1)",   ring:"rgba(34,197,94,0.25)"   },
  Transferred:{ hex:"#f59e0b", bg:"rgba(245,158,11,0.1)",  ring:"rgba(245,158,11,0.25)"  },
  Expired:    { hex:"#ef4444", bg:"rgba(239,68,68,0.1)",   ring:"rgba(239,68,68,0.25)"   },
};

const WARD_COLORS = {
  "General Ward":    "#2563eb",
  "Private Room":    "#7c3aed",
  "Semi-Private":    "#0891b2",
  "ICU":             "#ef4444",
  "NICU":            "#f59e0b",
  "Pediatric Ward":  "#10b981",
  "Maternity Ward":  "#ec4899",
  "Surgical Ward":   "#6366f1",
  "Emergency Ward":  "#dc2626",
};

const EMPTY_FORM = {
  patientId:"", patientName:"", doctor:"",
  ward:"General Ward", bedNumber:"", room:"",
  admissionType:"Elective", admissionDate:"", admissionTime:"",
  diagnosis:"", condition:"Stable",
  status:"Admitted", notes:"",
  dischargeDate:"", dischargeNotes:"",
};

const fmtDate    = (s) => s ? new Date(s+"T00:00:00").toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric" }) : "—";
const fmtTs      = (ts) => ts ? new Date(ts).toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
const daysDiff   = (from) => { if(!from) return 0; const d = Math.floor((Date.now()-new Date(from+"T00:00:00").getTime())/(1000*60*60*24)); return Math.max(0,d); };

// ─── Shared Components ────────────────────────────────────────────────────────
function CDropdown({ D, value, onChange, options, placeholder }) {
  const [open,setOpen]=useState(false); const r=useRef(null);
  useEffect(()=>{ const h=(e)=>{if(r.current&&!r.current.contains(e.target))setOpen(false);}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  const sel=options.find(o=>(o.value??o)===value); const lbl=sel?(sel.label??sel):(placeholder??"Select…");
  const tc=D?"#e2e8f0":"#1e293b"; const mc=D?"#475569":"#94a3b8";
  return (
    <div ref={r} style={{ position:"relative", userSelect:"none" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${open?"#2563eb":D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", cursor:"pointer", boxShadow:open?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s" }}>
        <span style={{ fontSize:13, color:value?tc:mc }}>{lbl}</span>
        <ChevronDown size={12} style={{ color:mc, transform:open?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}/>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:999, background:D?"#161b27":"#fff", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:12, boxShadow:D?"0 20px 60px rgba(0,0,0,0.7)":"0 12px 40px rgba(0,0,0,0.12)", maxHeight:220, overflowY:"auto", padding:"4px" }}>
          {options.map((o,i)=>{ const v=o.value??o; const l=o.label??o; const s=v===value; return <div key={i} onClick={()=>{onChange(v);setOpen(false);}} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", borderRadius:8, cursor:"pointer", fontSize:13, color:s?"#2563eb":tc, background:s?"rgba(37,99,235,0.1)":"transparent", fontWeight:s?600:400 }} onMouseEnter={e=>{if(!s)e.currentTarget.style.background=D?"rgba(255,255,255,0.05)":"#f1f5f9"}} onMouseLeave={e=>{if(!s)e.currentTarget.style.background="transparent"}}>{l}{s&&<Check size={12} style={{color:"#2563eb"}}/>}</div>; })}
        </div>
      )}
    </div>
  );
}
function FLabel({ D, children, icon:Icon }) { return <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:5, color:D?"#94a3b8":"#64748b" }}>{Icon&&<Icon size={9} style={{display:"inline",marginRight:4,verticalAlign:"middle"}}/>}{children}</label>; }
function SInput({ D, ...props }) { const [f,setF]=useState(false); return <input {...props} style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${f?"#2563eb":D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", boxShadow:f?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s", ...props.style }} onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>; }

// ─── Bed Map Card ─────────────────────────────────────────────────────────────
function BedMap({ admissions, D }) {
  const wardGroups = WARDS.reduce((acc, w) => {
    acc[w] = admissions.filter(a => a.ward === w && a.status === "Admitted");
    return acc;
  }, {});

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
      {WARDS.map(ward => {
        const occupied = wardGroups[ward].length;
        const color = WARD_COLORS[ward] || "#2563eb";
        return (
          <div key={ward} style={{ background:D?"#0d1117":"#fff", border:`1px solid ${D?"rgba(255,255,255,0.07)":"#f1f5f9"}`, borderRadius:16, padding:"16px", position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:color }}/>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Bed size={14} color={color}/>
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:D?"#e2e8f0":"#0f172a" }}>{ward}</span>
              </div>
              <span style={{ fontSize:18, fontWeight:800, color }}>{occupied}</span>
            </div>
            <div style={{ fontSize:11, color:D?"#475569":"#94a3b8" }}>
              {occupied === 0 ? "No current patients" : `${occupied} patient${occupied>1?"s":""} admitted`}
            </div>
            {wardGroups[ward].slice(0,3).map(a => (
              <div key={a.id} style={{ display:"flex", alignItems:"center", gap:6, marginTop:6, padding:"5px 8px", borderRadius:8, background:D?"rgba(255,255,255,0.04)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.06)":"#f1f5f9"}` }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:color, flexShrink:0 }}/>
                <span style={{ fontSize:11, color:D?"#94a3b8":"#475569", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {a.patientName} — Bed {a.bedNumber||"?"}
                </span>
              </div>
            ))}
            {wardGroups[ward].length > 3 && (
              <div style={{ marginTop:4, fontSize:10, color:D?"#334155":"#94a3b8", paddingLeft:8 }}>+{wardGroups[ward].length-3} more</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Admission Modal ──────────────────────────────────────────────────────────
function AdmissionModal({ open, onClose, onSave, editing, patients, doctors, D }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("admission");

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...EMPTY_FORM, ...editing } : {
        ...EMPTY_FORM,
        admissionDate: new Date().toISOString().split("T")[0],
        admissionTime: new Date().toTimeString().slice(0,5),
      });
      setError(""); setTab("admission");
    }
  }, [open, editing]);

  if (!open) return null;
  const setE = (k)=>(e)=>setForm(p=>({...p,[k]:e.target.value}));
  const setV = (k)=>(v)=>setForm(p=>({...p,[k]:v}));

  const validate = () => {
    if (!form.patientName) return "Please select a patient.";
    if (!form.ward)         return "Please select a ward.";
    if (!form.bedNumber.trim()) return "Bed number is required.";
    if (!form.admissionDate) return "Admission date is required.";
    return "";
  };

  const handleSave = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch(e) { setError(e.message||"Failed to save."); }
    finally { setSaving(false); }
  };

  const patientOpts = [{value:"",label:"— Select patient —"},...patients.map(p=>({value:`${p.firstName} ${p.lastName}`,label:`${p.firstName} ${p.lastName} (${p.patientId})`}))];
  const doctorOpts  = [{value:"",label:"— Select attending doctor —"},...doctors.map(d=>({value:`Dr. ${d.firstName} ${d.lastName}`,label:`Dr. ${d.firstName} ${d.lastName} — ${d.specialization||"General"}`}))];
  const cardBg=D?"#0d1117":"#fff"; const border=D?"rgba(255,255,255,0.08)":"#e2e8f0";

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:640, maxHeight:"92vh", overflowY:"auto", background:cardBg, border:`1px solid ${border}`, borderRadius:24, boxShadow:"0 40px 100px rgba(0,0,0,0.4)" }}>
        <div style={{ height:3, borderRadius:"24px 24px 0 0", background:"linear-gradient(90deg,#2563eb,#7c3aed,#0891b2)" }}/>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>{editing?"Edit Admission":"New Admission"}</h2>
              <p style={{ margin:"4px 0 0", fontSize:12, color:D?"#475569":"#94a3b8" }}>In-patient admission record</p>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:D?"#475569":"#94a3b8", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16}/></button>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", gap:4, marginBottom:20, background:D?"rgba(255,255,255,0.05)":"#f1f5f9", borderRadius:12, padding:4 }}>
            {[["admission","Admission Details"],["medical","Medical Info"],...(editing?[["discharge","Discharge"]]:[])].map(([t,l])=>(
              <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"8px 0", borderRadius:9, border:"none", cursor:"pointer", fontSize:12, fontWeight:tab===t?700:500, background:tab===t?(D?"#1e293b":"#fff"):"transparent", color:tab===t?(D?"#f1f5f9":"#0f172a"):(D?"#475569":"#94a3b8"), boxShadow:tab===t?"0 1px 4px rgba(0,0,0,0.08)":"none", transition:"all 0.2s" }}>{l}</button>
            ))}
          </div>

          {error && <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:16, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}><AlertCircle size={14}/> {error}</div>}

          {tab === "admission" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                <div><FLabel D={D} icon={User}>Patient</FLabel><CDropdown D={D} value={form.patientName} onChange={v=>{const p=patients.find(p=>`${p.firstName} ${p.lastName}`===v);setForm(f=>({...f,patientName:v,patientId:p?.patientId||""}));}} options={patientOpts}/></div>
                <div><FLabel D={D} icon={Stethoscope}>Attending Doctor</FLabel><CDropdown D={D} value={form.doctor} onChange={setV("doctor")} options={doctorOpts}/></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                <div><FLabel D={D} icon={MapPin}>Ward</FLabel><CDropdown D={D} value={form.ward} onChange={setV("ward")} options={WARDS}/></div>
                <div><FLabel D={D} icon={Bed}>Bed Number</FLabel><SInput D={D} placeholder="e.g. B-101" value={form.bedNumber} onChange={setE("bedNumber")}/></div>
                <div><FLabel D={D}>Room</FLabel><SInput D={D} placeholder="e.g. Room 3" value={form.room} onChange={setE("room")}/></div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
                <div><FLabel D={D}>Admission Type</FLabel><CDropdown D={D} value={form.admissionType} onChange={setV("admissionType")} options={ADMISSION_TYPES}/></div>
                <div><FLabel D={D} icon={Calendar}>Admission Date</FLabel><SInput D={D} type="date" value={form.admissionDate} onChange={setE("admissionDate")}/></div>
                <div><FLabel D={D} icon={Clock}>Time</FLabel><SInput D={D} type="time" value={form.admissionTime} onChange={setE("admissionTime")}/></div>
              </div>
              <div><FLabel D={D}>Status</FLabel><CDropdown D={D} value={form.status} onChange={setV("status")} options={Object.keys(STATUS_META)}/></div>
            </div>
          )}

          {tab === "medical" && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div><FLabel D={D}>Admitting Diagnosis</FLabel><SInput D={D} placeholder="Primary diagnosis on admission" value={form.diagnosis} onChange={setE("diagnosis")}/></div>
              <div><FLabel D={D} icon={Heart}>Patient Condition</FLabel><CDropdown D={D} value={form.condition} onChange={setV("condition")} options={PATIENT_CONDITIONS}/></div>
              <div>
                <FLabel D={D}>Clinical Notes</FLabel>
                <textarea value={form.notes} onChange={setE("notes")} placeholder="Chief complaints, history, orders…" rows={4}
                  style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", resize:"vertical" }}/>
              </div>
            </div>
          )}

          {tab === "discharge" && editing && (
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ padding:"12px 16px", borderRadius:12, background:D?"rgba(34,197,94,0.08)":"#f0fdf4", border:`1px solid ${D?"rgba(34,197,94,0.2)":"#bbf7d0"}` }}>
                <p style={{ margin:0, fontSize:12, color:D?"#4ade80":"#15803d", fontWeight:600 }}>⚠️ Set status to "Discharged" after filling this tab.</p>
              </div>
              <div><FLabel D={D} icon={Calendar}>Discharge Date</FLabel><SInput D={D} type="date" value={form.dischargeDate} onChange={setE("dischargeDate")}/></div>
              <div><FLabel D={D}>Condition at Discharge</FLabel><CDropdown D={D} value={form.condition} onChange={setV("condition")} options={PATIENT_CONDITIONS}/></div>
              <div><FLabel D={D}>Discharge Status</FLabel><CDropdown D={D} value={form.status} onChange={setV("status")} options={Object.keys(STATUS_META)}/></div>
              <div>
                <FLabel D={D}>Discharge Notes / Instructions</FLabel>
                <textarea value={form.dischargeNotes} onChange={setE("dischargeNotes")} placeholder="Discharge instructions, follow-up orders…" rows={4}
                  style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", resize:"vertical" }}/>
              </div>
            </div>
          )}

          <div style={{ display:"flex", gap:12, marginTop:22 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2563eb,#7c3aed)", color:"white", fontSize:14, fontWeight:700, opacity:saving?0.7:1 }}>{saving?"Saving…":editing?"Update Admission":"Admit Patient"}</button>
            <button onClick={onClose} style={{ flex:1, padding:"12px 0", borderRadius:14, cursor:"pointer", fontSize:14, fontWeight:600, background:D?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, color:D?"#94a3b8":"#64748b" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function IPD() {
  const { isDark: D } = useTheme();
  const [admissions, setAdmissions] = useState([]);
  const [patients,   setPatients]   = useState([]);
  const [doctors,    setDoctors]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterWard,   setFilterWard]   = useState("All");
  const [modal,  setModal]  = useState(false);
  const [editing,setEditing]= useState(null);
  const [view,   setView]   = useState("list"); // "list" | "map"

  useEffect(()=>{ const u=onValue(ref(db,"admissions"),s=>{ const d=s.val(); setAdmissions(d?Object.entries(d).map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)):[]); setLoading(false); }); return()=>u(); },[]);
  useEffect(()=>{ const u=onValue(ref(db,"patients"),s=>{ const d=s.val(); setPatients(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);
  useEffect(()=>{ const u=onValue(ref(db,"doctors"), s=>{ const d=s.val(); setDoctors(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);

  const save = async (form) => {
    const now = Date.now();
    if (editing) await update(ref(db,`admissions/${editing.id}`), { ...form, updatedAt:now });
    else await push(ref(db,"admissions"), { ...form, ipdId:`IPD-${String(admissions.length+1).padStart(4,"0")}`, createdAt:now, updatedAt:now });
  };
  const del = (id) => remove(ref(db,`admissions/${id}`));
  const quickDischarge = (id) => update(ref(db,`admissions/${id}`), { status:"Discharged", dischargeDate:new Date().toISOString().split("T")[0], updatedAt:Date.now() });

  const filtered = admissions.filter(a => {
    const q = search.toLowerCase();
    return ((a.patientName||"").toLowerCase().includes(q)||(a.ipdId||"").toLowerCase().includes(q)||(a.doctor||"").toLowerCase().includes(q)||(a.bedNumber||"").toLowerCase().includes(q))
      && (filterStatus==="All"||a.status===filterStatus)
      && (filterWard==="All"||a.ward===filterWard);
  });

  const currentlyAdmitted = admissions.filter(a=>a.status==="Admitted");
  const cardBg=D?"#0d1117":"#fff"; const cardBdr=D?"rgba(255,255,255,0.07)":"#f1f5f9";

  const STATS = [
    { label:"Currently Admitted", value:currentlyAdmitted.length,                             g1:"#2563eb", g2:"#1d4ed8" },
    { label:"Discharged Today",   value:admissions.filter(a=>a.dischargeDate===new Date().toISOString().split("T")[0]).length, g1:"#22c55e", g2:"#15803d" },
    { label:"ICU Patients",       value:currentlyAdmitted.filter(a=>a.ward==="ICU").length,   g1:"#ef4444", g2:"#b91c1c" },
    { label:"Total Admissions",   value:admissions.length,                                     g1:"#7c3aed", g2:"#6d28d9" },
  ];

  return (
    <div style={{ padding:24, minHeight:"100%", background:D?"#080b12":"#f8fafc" }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {STATS.map(s=>(
          <div key={s.label} style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, padding:"20px 20px 18px", position:"relative", overflow:"hidden", transition:"transform 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${s.g1},${s.g2})` }}/>
            <p style={{ margin:"12px 0 4px", fontSize:28, fontWeight:800, color:D?"#f1f5f9":"#0f172a" }}>{s.value}</p>
            <p style={{ margin:0, fontSize:12, color:D?"#475569":"#94a3b8", fontWeight:500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:10, background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:14, padding:"10px 16px" }}>
          <Search size={15} style={{ color:D?"#334155":"#94a3b8" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient, IPD ID, bed, doctor…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:D?"#e2e8f0":"#1e293b" }}/>
          {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",display:"flex" }}><X size={13}/></button>}
        </div>
        <div style={{ width:140 }}><CDropdown D={D} value={filterStatus} onChange={setFilterStatus} options={["All",...Object.keys(STATUS_META)].map(s=>({value:s,label:s==="All"?"All Status":s}))}/></div>
        <div style={{ width:160 }}><CDropdown D={D} value={filterWard} onChange={setFilterWard} options={["All",...WARDS].map(s=>({value:s,label:s==="All"?"All Wards":s}))}/></div>
        {/* View toggle */}
        <div style={{ display:"flex", background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:12, overflow:"hidden" }}>
          {[["list","☰ List"],["map","🏥 Ward Map"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:"9px 14px", border:"none", cursor:"pointer", fontSize:12, fontWeight:view===v?700:500, background:view===v?"#2563eb":"transparent", color:view===v?"#fff":D?"#475569":"#94a3b8", transition:"all 0.2s" }}>{l}</button>
          ))}
        </div>
        <button onClick={()=>{setEditing(null);setModal(true);}} style={{ display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#2563eb,#7c3aed)", border:"none", borderRadius:14, padding:"10px 20px", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 6px 18px rgba(37,99,235,0.3)", whiteSpace:"nowrap" }}>
          <Plus size={16}/> Admit Patient
        </button>
      </div>

      {/* Ward Map View */}
      {view === "map" && (
        <div style={{ marginBottom:20 }}>
          <BedMap admissions={admissions} D={D}/>
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
                {["IPD ID","Patient","Doctor","Ward","Bed","Admission Date","Days","Diagnosis","Condition","Status","Actions"].map(h=>(
                  <th key={h} style={{ textAlign:"left", padding:"12px 14px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color:D?"#334155":"#94a3b8", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading?(
                <tr><td colSpan={11} style={{ padding:60, textAlign:"center" }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",border:"2px solid #2563eb",borderTopColor:"transparent",animation:"spin 0.8s linear infinite",margin:"0 auto 8px" }}/>
                  <p style={{ color:"#475569",fontSize:13,margin:0 }}>Loading admissions…</p>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </td></tr>
              ):filtered.length===0?(
                <tr><td colSpan={11} style={{ padding:60, textAlign:"center" }}>
                  <Bed size={32} style={{ color:D?"#334155":"#cbd5e1",margin:"0 auto 10px",display:"block" }}/>
                  <p style={{ color:D?"#475569":"#64748b",fontSize:14,fontWeight:600,margin:0 }}>No admissions found</p>
                </td></tr>
              ):filtered.map((a,idx)=>{
                const sm=STATUS_META[a.status]||STATUS_META.Admitted;
                const wColor=WARD_COLORS[a.ward]||"#2563eb";
                const days=daysDiff(a.admissionDate);
                const isEven=idx%2===0;
                const condColor=a.condition==="Critical"?"#ef4444":a.condition==="Serious"?"#f59e0b":a.condition==="Stable"?"#22c55e":"#64748b";
                return (
                  <tr key={a.id}
                    style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`, transition:"background 0.15s", background:D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe") }}
                    onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(37,99,235,0.05)":"#eff6ff"}
                    onMouseLeave={e=>e.currentTarget.style.background=D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe")}
                  >
                    <td style={{ padding:"12px 14px", fontFamily:"monospace", fontSize:11, color:D?"#334155":"#94a3b8" }}>{a.ipdId}</td>
                    <td style={{ padding:"12px 14px", fontSize:13, fontWeight:600, color:D?"#e2e8f0":"#0f172a", whiteSpace:"nowrap" }}>{a.patientName}</td>
                    <td style={{ padding:"12px 14px", fontSize:12, color:D?"#475569":"#64748b", whiteSpace:"nowrap" }}>{a.doctor||"—"}</td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:600, background:`${wColor}15`, color:wColor, border:`1px solid ${wColor}30`, whiteSpace:"nowrap" }}>{a.ward}</span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ padding:"3px 8px", borderRadius:6, fontSize:12, fontWeight:800, background:D?"rgba(255,255,255,0.08)":"#f1f5f9", color:D?"#e2e8f0":"#0f172a" }}>{a.bedNumber||"—"}</span>
                    </td>
                    <td style={{ padding:"12px 14px", fontSize:12, color:D?"#475569":"#64748b", whiteSpace:"nowrap" }}>{fmtDate(a.admissionDate)}</td>
                    <td style={{ padding:"12px 14px" }}>
                      {a.status==="Admitted" ? (
                        <span style={{ padding:"3px 10px", borderRadius:8, fontSize:12, fontWeight:700, background:"rgba(37,99,235,0.1)", color:"#3b82f6", border:"1px solid rgba(37,99,235,0.2)" }}>{days}d</span>
                      ) : <span style={{ fontSize:11, color:D?"#334155":"#94a3b8" }}>—</span>}
                    </td>
                    <td style={{ padding:"12px 14px", fontSize:12, color:D?"#94a3b8":"#475569", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.diagnosis||"—"}</td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ padding:"3px 10px", borderRadius:8, fontSize:11, fontWeight:600, background:`${condColor}15`, color:condColor, border:`1px solid ${condColor}30` }}>{a.condition||"—"}</span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:sm.bg, color:sm.hex, border:`1px solid ${sm.ring}` }}>
                        <span style={{ width:5,height:5,borderRadius:"50%",background:sm.hex }}/>{a.status}
                      </span>
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      <div style={{ display:"flex", gap:5 }}>
                        {a.status==="Admitted"&&<button onClick={()=>quickDischarge(a.id)} style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", fontSize:10, fontWeight:700, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", color:"#22c55e", whiteSpace:"nowrap" }}>↑ Discharge</button>}
                        <button onClick={()=>{setEditing(a);setModal(true);}} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 8px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.2)", color:D?"#93c5fd":"#1d4ed8" }}><Edit2 size={10}/></button>
                        <button onClick={()=>{if(window.confirm("Delete this admission record?"))del(a.id);}} style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", display:"flex", alignItems:"center" }}><Trash2 size={11}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:D?"#475569":"#94a3b8" }}>Showing <strong>{filtered.length}</strong> of <strong>{admissions.length}</strong> admissions</span>
            <span style={{ fontSize:12, color:D?"#475569":"#94a3b8" }}><strong style={{ color:D?"#3b82f6":"#2563eb" }}>{currentlyAdmitted.length}</strong> currently admitted</span>
          </div>
        </div>
      )}

      <AdmissionModal open={modal} onClose={()=>{setModal(false);setEditing(null);}} onSave={save} editing={editing} patients={patients} doctors={doctors} D={D}/>
    </div>
  );
}
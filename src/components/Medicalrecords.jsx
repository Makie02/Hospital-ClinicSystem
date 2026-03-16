// src/components/MedicalRecords.jsx
import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, update, remove } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Plus, X, Search, Edit2, Trash2, ChevronDown, Check,
  AlertCircle, FileText, User, Calendar, Stethoscope,
  Activity, Heart, Thermometer, Wind,
} from "lucide-react";

const RECORD_TYPES = ["Consultation","Follow-up","Emergency","Check-up","Surgery","Discharge Summary","Referral","Other"];
const DIAGNOSES_COMMON = ["Hypertension","Diabetes Mellitus","Upper Respiratory Tract Infection","Urinary Tract Infection","Gastroenteritis","Pneumonia","Asthma","Dengue Fever","Typhoid Fever","Other"];

const EMPTY_FORM = {
  patientId:"", patientName:"", doctor:"", date:"",
  type:"Consultation", chiefComplaint:"", diagnosis:"", treatment:"",
  vitalSigns:{ bp:"", temp:"", pulse:"", rr:"", weight:"", height:"" },
  notes:"",
};

const fmtDateStr = (s) => s ? new Date(s+"T00:00:00").toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric" }) : "—";
const fmtDate    = (ts) => ts ? new Date(ts).toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric" }) : "—";

function CDropdown({ D, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const r = useRef(null);
  useEffect(() => { const h=(e)=>{if(r.current&&!r.current.contains(e.target))setOpen(false);}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); }, []);
  const sel = options.find(o=>(o.value??o)===value);
  const lbl = sel?(sel.label??sel):(placeholder??"Select…");
  const tc=D?"#e2e8f0":"#1e293b"; const mc=D?"#475569":"#94a3b8";
  return (
    <div ref={r} style={{ position:"relative", userSelect:"none" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${open?"#2563eb":D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", cursor:"pointer", boxShadow:open?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s" }}>
        <span style={{ fontSize:13, color:value?tc:mc }}>{lbl}</span>
        <ChevronDown size={12} style={{ color:mc, transform:open?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}/>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:999, background:D?"#161b27":"#fff", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:12, boxShadow:D?"0 20px 60px rgba(0,0,0,0.7)":"0 12px 40px rgba(0,0,0,0.12)", maxHeight:200, overflowY:"auto", padding:"4px" }}>
          {options.map((o,i)=>{ const v=o.value??o; const l=o.label??o; const s=v===value; return <div key={i} onClick={()=>{onChange(v);setOpen(false);}} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", borderRadius:8, cursor:"pointer", fontSize:13, color:s?"#2563eb":tc, background:s?"rgba(37,99,235,0.1)":"transparent", fontWeight:s?600:400 }} onMouseEnter={e=>{if(!s)e.currentTarget.style.background=D?"rgba(255,255,255,0.05)":"#f1f5f9"}} onMouseLeave={e=>{if(!s)e.currentTarget.style.background="transparent"}}>{l}{s&&<Check size={12} style={{color:"#2563eb"}}/>}</div>; })}
        </div>
      )}
    </div>
  );
}
function FLabel({ D, children, icon: Icon }) { return <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:5, color:D?"#94a3b8":"#64748b" }}>{Icon&&<Icon size={9} style={{display:"inline",marginRight:4,verticalAlign:"middle"}}/>}{children}</label>; }
function SInput({ D, ...props }) { const [f,setF]=useState(false); return <input {...props} style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${f?"#2563eb":D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", boxShadow:f?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s", ...props.style }} onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>; }

// ─── Record Modal ─────────────────────────────────────────────────────────────
function RecordModal({ open, onClose, onSave, editing, patients, doctors, D }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...EMPTY_FORM, ...editing, vitalSigns:{ ...EMPTY_FORM.vitalSigns, ...(editing.vitalSigns||{}) } } : { ...EMPTY_FORM, date:new Date().toISOString().split("T")[0] });
      setError("");
    }
  }, [open, editing]);

  if (!open) return null;
  const setE = (k)=>(e)=>setForm(p=>({...p,[k]:e.target.value}));
  const setV = (k)=>(v)=>setForm(p=>({...p,[k]:v}));
  const setVital = (k)=>(e)=>setForm(p=>({...p,vitalSigns:{...p.vitalSigns,[k]:e.target.value}}));

  const validate = () => {
    if (!form.patientName) return "Please select a patient.";
    if (!form.date)        return "Date is required.";
    if (!form.chiefComplaint.trim()) return "Chief complaint is required.";
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
  const doctorOpts  = [{value:"",label:"— Select doctor —"},...doctors.map(d=>({value:`Dr. ${d.firstName} ${d.lastName}`,label:`Dr. ${d.firstName} ${d.lastName}`}))];
  const cardBg = D?"#0d1117":"#fff"; const border = D?"rgba(255,255,255,0.08)":"#e2e8f0";

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:640, maxHeight:"92vh", overflowY:"auto", background:cardBg, border:`1px solid ${border}`, borderRadius:24, boxShadow:"0 40px 100px rgba(0,0,0,0.4)" }}>
        <div style={{ height:3, borderRadius:"24px 24px 0 0", background:"linear-gradient(90deg,#2563eb,#0891b2)" }}/>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>{editing?"Edit Record":"New Medical Record"}</h2>
              <p style={{ margin:"4px 0 0", fontSize:12, color:D?"#475569":"#94a3b8" }}>Document the patient encounter</p>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:D?"#475569":"#94a3b8", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16}/></button>
          </div>

          {error && <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:16, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}><AlertCircle size={14}/> {error}</div>}

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={User}>Patient</FLabel><CDropdown D={D} value={form.patientName} onChange={v=>{const p=patients.find(p=>`${p.firstName} ${p.lastName}`===v);setForm(f=>({...f,patientName:v,patientId:p?.patientId||""}));}} options={patientOpts}/></div>
              <div><FLabel D={D} icon={Stethoscope}>Doctor</FLabel><CDropdown D={D} value={form.doctor} onChange={setV("doctor")} options={doctorOpts}/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={Calendar}>Date</FLabel><SInput D={D} type="date" value={form.date} onChange={setE("date")}/></div>
              <div><FLabel D={D}>Record Type</FLabel><CDropdown D={D} value={form.type} onChange={setV("type")} options={RECORD_TYPES}/></div>
            </div>

            <div><FLabel D={D}>Chief Complaint</FLabel><SInput D={D} placeholder="Main reason for the visit" value={form.chiefComplaint} onChange={setE("chiefComplaint")}/></div>
            <div><FLabel D={D}>Diagnosis</FLabel><CDropdown D={D} value={form.diagnosis} onChange={setV("diagnosis")} options={DIAGNOSES_COMMON} placeholder="Select or type…"/></div>
            <div>
              <FLabel D={D}>Treatment / Management</FLabel>
              <textarea value={form.treatment} onChange={setE("treatment")} placeholder="Treatment plan, medications ordered, procedures…" rows={2}
                style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", resize:"vertical" }}/>
            </div>

            {/* Vital Signs */}
            <div style={{ background:D?"rgba(255,255,255,0.03)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.08)":"#e2e8f0"}`, borderRadius:14, padding:16 }}>
              <FLabel D={D} icon={Activity}>Vital Signs</FLabel>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
                {[["bp","Blood Pressure","e.g. 120/80"],["temp","Temperature (°C)","e.g. 36.8"],["pulse","Pulse Rate","e.g. 72 bpm"],["rr","Resp. Rate","e.g. 18/min"],["weight","Weight (kg)","e.g. 65"],["height","Height (cm)","e.g. 165"]].map(([k,label,ph]) => (
                  <div key={k}><FLabel D={D}>{label}</FLabel><SInput D={D} placeholder={ph} value={form.vitalSigns[k]} onChange={setVital(k)}/></div>
                ))}
              </div>
            </div>

            <div><FLabel D={D}>Additional Notes</FLabel>
              <textarea value={form.notes} onChange={setE("notes")} placeholder="Observations, follow-up instructions…" rows={2}
                style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", resize:"vertical" }}/>
            </div>
          </div>

          <div style={{ display:"flex", gap:12, marginTop:22 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2563eb,#0891b2)", color:"white", fontSize:14, fontWeight:700, opacity:saving?0.7:1 }}>{saving?"Saving…":editing?"Update Record":"Save Record"}</button>
            <button onClick={onClose} style={{ flex:1, padding:"12px 0", borderRadius:14, cursor:"pointer", fontSize:14, fontWeight:600, background:D?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, color:D?"#94a3b8":"#64748b" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MedicalRecords() {
  const { isDark: D } = useTheme();
  const [records,   setRecords]   = useState([]);
  const [patients,  setPatients]  = useState([]);
  const [doctors,   setDoctors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [filterType,setFilterType]= useState("All");
  const [modal,     setModal]     = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [expanded,  setExpanded]  = useState(null);

  useEffect(() => { const u=onValue(ref(db,"medicalRecords"),s=>{ const d=s.val(); setRecords(d?Object.entries(d).map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)):[]); setLoading(false); }); return()=>u(); },[]);
  useEffect(() => { const u=onValue(ref(db,"patients"),s=>{ const d=s.val(); setPatients(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);
  useEffect(() => { const u=onValue(ref(db,"doctors"), s=>{ const d=s.val(); setDoctors(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);

  const save = async (form) => {
    const now = Date.now();
    if (editing) await update(ref(db,`medicalRecords/${editing.id}`), { ...form, updatedAt:now });
    else await push(ref(db,"medicalRecords"), { ...form, recordId:`MR-${String(records.length+1).padStart(4,"0")}`, createdAt:now, updatedAt:now });
  };
  const del = (id) => remove(ref(db,`medicalRecords/${id}`));

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return ((r.patientName||"").toLowerCase().includes(q)||(r.recordId||"").toLowerCase().includes(q)||(r.diagnosis||"").toLowerCase().includes(q))
      && (filterType==="All"||r.type===filterType);
  });

  const cardBg=D?"#0d1117":"#fff"; const cardBdr=D?"rgba(255,255,255,0.07)":"#f1f5f9";
  const STATS = [
    { label:"Total Records", value:records.length,                                    g1:"#2563eb", g2:"#1d4ed8" },
    { label:"This Month",    value:records.filter(r=>new Date(r.createdAt).getMonth()===new Date().getMonth()).length, g1:"#0891b2", g2:"#0e7490" },
    { label:"Consultations", value:records.filter(r=>r.type==="Consultation").length, g1:"#059669", g2:"#047857" },
    { label:"Follow-ups",    value:records.filter(r=>r.type==="Follow-up").length,    g1:"#d97706", g2:"#b45309" },
  ];

  return (
    <div style={{ padding:24, minHeight:"100%", background:D?"#080b12":"#f8fafc" }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {STATS.map(s => (
          <div key={s.label} style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, padding:"20px 20px 18px", position:"relative", overflow:"hidden", transition:"transform 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${s.g1},${s.g2})` }}/>
            <p style={{ margin:"12px 0 4px", fontSize:28, fontWeight:800, color:D?"#f1f5f9":"#0f172a" }}>{s.value}</p>
            <p style={{ margin:0, fontSize:12, color:D?"#475569":"#94a3b8", fontWeight:500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:14, padding:"10px 16px" }}>
          <Search size={15} style={{ color:D?"#334155":"#94a3b8" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient, diagnosis, record ID…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:D?"#e2e8f0":"#1e293b" }}/>
          {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", display:"flex" }}><X size={13}/></button>}
        </div>
        <div style={{ width:160 }}><CDropdown D={D} value={filterType} onChange={setFilterType} options={["All",...RECORD_TYPES].map(s=>({ value:s, label:s==="All"?"All Types":s }))}/></div>
        <button onClick={()=>{ setEditing(null); setModal(true); }} style={{ display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#2563eb,#0891b2)", border:"none", borderRadius:14, padding:"10px 20px", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 6px 18px rgba(37,99,235,0.3)", whiteSpace:"nowrap" }}>
          <Plus size={16}/> New Record
        </button>
      </div>

      {/* Table */}
      <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
              {["Record ID","Patient","Doctor","Date","Type","Chief Complaint","Diagnosis","Vitals","Actions"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"12px 16px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color:D?"#334155":"#94a3b8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding:60, textAlign:"center" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid #2563eb", borderTopColor:"transparent", animation:"spin 0.8s linear infinite", margin:"0 auto 8px" }}/>
                <p style={{ color:"#475569", fontSize:13, margin:0 }}>Loading records…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            ) : filtered.length===0 ? (
              <tr><td colSpan={9} style={{ padding:60, textAlign:"center" }}>
                <FileText size={32} style={{ color:D?"#334155":"#cbd5e1", margin:"0 auto 8px", display:"block" }}/>
                <p style={{ color:D?"#475569":"#64748b", fontSize:14, fontWeight:600, margin:0 }}>No records found</p>
              </td></tr>
            ) : filtered.map((rec, idx) => {
              const isEven = idx%2===0;
              const isExp  = expanded===rec.id;
              return (
                <React.Fragment key={rec.id}>
                  <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`, transition:"background 0.15s", cursor:"pointer", background:D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe") }}
                    onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(37,99,235,0.05)":"#eff6ff"}
                    onMouseLeave={e=>e.currentTarget.style.background=D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe")}
                    onClick={()=>setExpanded(isExp?null:rec.id)}
                  >
                    <td style={{ padding:"12px 16px", fontFamily:"monospace", fontSize:11, color:D?"#334155":"#94a3b8" }}>{rec.recordId}</td>
                    <td style={{ padding:"12px 16px", fontSize:13, fontWeight:600, color:D?"#e2e8f0":"#0f172a" }}>{rec.patientName}</td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:D?"#475569":"#64748b" }}>{rec.doctor||"—"}</td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:D?"#475569":"#64748b" }}>{fmtDateStr(rec.date)}</td>
                    <td style={{ padding:"12px 16px" }}>
                      <span style={{ padding:"3px 10px", borderRadius:8, fontSize:11, fontWeight:600, background:"rgba(37,99,235,0.1)", color:D?"#93c5fd":"#1d4ed8", border:"1px solid rgba(37,99,235,0.15)" }}>{rec.type}</span>
                    </td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:D?"#94a3b8":"#475569", maxWidth:140, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{rec.chiefComplaint||"—"}</td>
                    <td style={{ padding:"12px 16px", fontSize:12, color:D?"#94a3b8":"#475569", maxWidth:130, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{rec.diagnosis||"—"}</td>
                    <td style={{ padding:"12px 16px" }}>
                      {rec.vitalSigns?.bp ? (
                        <span style={{ fontSize:11, color:D?"#475569":"#94a3b8" }}>{rec.vitalSigns.bp} mmHg</span>
                      ) : <span style={{ color:D?"#334155":"#cbd5e1", fontSize:11 }}>—</span>}
                    </td>
                    <td style={{ padding:"12px 16px" }} onClick={e=>e.stopPropagation()}>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={()=>{ setEditing(rec); setModal(true); }} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.2)", color:D?"#93c5fd":"#1d4ed8" }}><Edit2 size={10}/> Edit</button>
                        <button onClick={()=>{ if(window.confirm("Delete this record?")) del(rec.id); }} style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", display:"flex", alignItems:"center" }}><Trash2 size={11}/></button>
                      </div>
                    </td>
                  </tr>
                  {isExp && (
                    <tr style={{ background:D?"rgba(37,99,235,0.04)":"#f0f7ff" }}>
                      <td colSpan={9} style={{ padding:"14px 20px" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
                          {rec.treatment && <div><p style={{ margin:"0 0 4px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:D?"#475569":"#94a3b8" }}>Treatment</p><p style={{ margin:0, fontSize:12, color:D?"#e2e8f0":"#1e293b", lineHeight:1.6 }}>{rec.treatment}</p></div>}
                          {rec.vitalSigns && Object.values(rec.vitalSigns).some(v=>v) && (
                            <div><p style={{ margin:"0 0 6px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:D?"#475569":"#94a3b8" }}>Vital Signs</p>
                              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 }}>
                                {[["BP",rec.vitalSigns.bp,"mmHg"],["Temp",rec.vitalSigns.temp,"°C"],["Pulse",rec.vitalSigns.pulse,"bpm"],["RR",rec.vitalSigns.rr,"/min"],["Weight",rec.vitalSigns.weight,"kg"],["Height",rec.vitalSigns.height,"cm"]].filter(([,v])=>v).map(([l,v,u])=>(
                                  <div key={l} style={{ fontSize:11 }}><span style={{ color:D?"#475569":"#94a3b8" }}>{l}: </span><span style={{ color:D?"#e2e8f0":"#1e293b", fontWeight:600 }}>{v} {u}</span></div>
                                ))}
                              </div>
                            </div>
                          )}
                          {rec.notes && <div><p style={{ margin:"0 0 4px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:D?"#475569":"#94a3b8" }}>Notes</p><p style={{ margin:0, fontSize:12, color:D?"#e2e8f0":"#1e293b", lineHeight:1.6 }}>{rec.notes}</p></div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}` }}>
          <span style={{ fontSize:12, color:D?"#475569":"#94a3b8" }}>Showing <strong>{filtered.length}</strong> of <strong>{records.length}</strong> records <span style={{ fontSize:11, color:D?"#334155":"#cbd5e1" }}>• Click a row to expand details</span></span>
        </div>
      </div>

      <RecordModal open={modal} onClose={()=>{ setModal(false); setEditing(null); }} onSave={save} editing={editing} patients={patients} doctors={doctors} D={D}/>
    </div>
  );
}
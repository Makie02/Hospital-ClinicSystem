// src/components/Pharmacy.jsx
import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, update, remove } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Plus, X, Search, Edit2, Trash2, ChevronDown, Check,
  AlertCircle, Pill, User, Calendar,
} from "lucide-react";
import { useSettingsList } from "../hooks/useSettingsList";

// ─── Static fallbacks ─────────────────────────────────────────────────────────
const FB_FORMS      = ["Tablet","Capsule","Syrup","Injectable","Topical","Drops","Inhaler","Suppository","IV Fluid","Other"];
const FB_UNITS      = ["tablet(s)","capsule(s)","ml","mg","piece(s)","sachet(s)","bottle(s)"];
const FREQUENCIES   = ["Once daily","Twice daily","Three times daily","Four times daily","Every 6 hours","Every 8 hours","As needed","Before meals","After meals"];
const STATUS_LIST   = ["Pending","Dispensed","Cancelled"];
const STATUS_META   = {
  Pending:   { hex:"#f59e0b", bg:"rgba(245,158,11,0.1)",  ring:"rgba(245,158,11,0.25)"  },
  Dispensed: { hex:"#22c55e", bg:"rgba(34,197,94,0.1)",   ring:"rgba(34,197,94,0.25)"   },
  Cancelled: { hex:"#ef4444", bg:"rgba(239,68,68,0.1)",   ring:"rgba(239,68,68,0.25)"   },
};

const EMPTY_FORM = {
  patientId:"", patientName:"", doctor:"", date:"", status:"Pending", notes:"",
  medicines:[{ name:"", qty:"", unit:"tablet(s)", frequency:"Once daily", days:"7" }],
};

const fmtDateStr = (s) => s ? new Date(s+"T00:00:00").toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric" }) : "—";

function CDropdown({ D, value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false); const r = useRef(null);
  useEffect(() => { const h=(e)=>{if(r.current&&!r.current.contains(e.target))setOpen(false);}; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  const selected=options.find(o=>(o.value??o)===value); const label=selected?(selected.label??selected):(placeholder??"Select…");
  const tc=D?"#e2e8f0":"#1e293b"; const mc=D?"#475569":"#94a3b8";
  return (
    <div ref={r} style={{ position:"relative", userSelect:"none" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:D?"rgba(255,255,255,0.06)":"#f8fafc", border:`1px solid ${open?"#2563eb":D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", cursor:"pointer", boxShadow:open?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s" }}>
        <span style={{ fontSize:13, color:value?tc:mc }}>{label}</span>
        <ChevronDown size={12} style={{ color:mc, transform:open?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}/>
      </div>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:999, background:D?"#161b27":"#fff", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:12, boxShadow:D?"0 20px 60px rgba(0,0,0,0.7)":"0 12px 40px rgba(0,0,0,0.12)", maxHeight:200, overflowY:"auto", padding:"4px" }}>
          {options.length===0
            ? <div style={{ padding:"12px 14px", textAlign:"center", fontSize:12, color:"#64748b" }}>No options yet — add in Maintenance Settings.</div>
            : options.map((o,i)=>{ const v=o.value??o; const l=o.label??o; const s=v===value; return <div key={i} onClick={()=>{onChange(v);setOpen(false);}} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", borderRadius:8, cursor:"pointer", fontSize:13, color:s?"#2563eb":tc, background:s?"rgba(37,99,235,0.1)":"transparent", fontWeight:s?600:400 }} onMouseEnter={e=>{if(!s)e.currentTarget.style.background=D?"rgba(255,255,255,0.05)":"#f1f5f9"}} onMouseLeave={e=>{if(!s)e.currentTarget.style.background="transparent"}}>{l}{s&&<Check size={12} style={{color:"#2563eb"}}/>}</div>; })}
        </div>
      )}
    </div>
  );
}
function FLabel({ D, children, icon: Icon }) { return <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:5, color:D?"#94a3b8":"#64748b" }}>{Icon&&<Icon size={9} style={{display:"inline",marginRight:4,verticalAlign:"middle"}}/>}{children}</label>; }
function SInput({ D, ...props }) { const [f,setF]=useState(false); return <input {...props} style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${f?"#2563eb":D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", boxShadow:f?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s", ...props.style }} onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>; }

// ─── Prescription Modal ───────────────────────────────────────────────────────
function PrescriptionModal({ open, onClose, onSave, editing, patients, doctors, D, medicineUnits }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(editing ? { ...EMPTY_FORM, ...editing, medicines: editing.medicines || EMPTY_FORM.medicines } : { ...EMPTY_FORM, date: new Date().toISOString().split("T")[0] });
      setError("");
    }
  }, [open, editing]);

  if (!open) return null;
  const setE = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const setV = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const addMed = () => setForm(p => ({ ...p, medicines: [...p.medicines, { name:"", qty:"", unit:medicineUnits[0]||"tablet(s)", frequency:"Once daily", days:"7" }] }));
  const removeMed = (i) => setForm(p => ({ ...p, medicines: p.medicines.filter((_,idx)=>idx!==i) }));
  const setMed = (i, k, v) => setForm(p => ({ ...p, medicines: p.medicines.map((m,idx)=>idx===i?{...m,[k]:v}:m) }));

  const validate = () => {
    if (!form.patientName) return "Please select a patient.";
    if (!form.date) return "Date is required.";
    if (!form.medicines.length || !form.medicines[0].name.trim()) return "Add at least one medicine.";
    return "";
  };
  const handleSave = async () => {
    const err = validate(); if (err) { setError(err); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch(e) { setError(e.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const patientOpts = [{ value:"", label:"— Select patient —" }, ...patients.map(p => ({ value:`${p.firstName} ${p.lastName}`, label:`${p.firstName} ${p.lastName} (${p.patientId})` }))];
  const doctorOpts  = [{ value:"", label:"— Select doctor —" }, ...doctors.map(d => ({ value:`Dr. ${d.firstName} ${d.lastName}`, label:`Dr. ${d.firstName} ${d.lastName}` }))];
  const cardBg = D ? "#0d1117" : "#fff"; const border = D ? "rgba(255,255,255,0.08)" : "#e2e8f0";

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:620, maxHeight:"92vh", overflowY:"auto", background:cardBg, border:`1px solid ${border}`, borderRadius:24, boxShadow:"0 40px 100px rgba(0,0,0,0.4)" }}>
        <div style={{ height:3, borderRadius:"24px 24px 0 0", background:"linear-gradient(90deg,#0d9488,#0891b2)" }}/>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>{editing?"Edit Prescription":"New Prescription"}</h2>
              <p style={{ margin:"4px 0 0", fontSize:12, color:D?"#475569":"#94a3b8" }}>Fill in prescription details</p>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:D?"#475569":"#94a3b8", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16}/></button>
          </div>

          {error && <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:16, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}><AlertCircle size={14}/> {error}</div>}

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={User}>Patient</FLabel><CDropdown D={D} value={form.patientName} onChange={(v)=>{const p=patients.find(p=>`${p.firstName} ${p.lastName}`===v);setForm(f=>({...f,patientName:v,patientId:p?.patientId||""}));}} options={patientOpts}/></div>
              <div><FLabel D={D} icon={User}>Doctor</FLabel><CDropdown D={D} value={form.doctor} onChange={setV("doctor")} options={doctorOpts}/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={Calendar}>Date</FLabel><SInput D={D} type="date" value={form.date} onChange={setE("date")}/></div>
              <div><FLabel D={D}>Status</FLabel><CDropdown D={D} value={form.status} onChange={setV("status")} options={STATUS_LIST}/></div>
            </div>

            {/* Medicines */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <FLabel D={D} icon={Pill}>Medicines</FLabel>
                <button onClick={addMed} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"#0d9488", background:"rgba(13,148,136,0.1)", border:"1px solid rgba(13,148,136,0.2)", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}><Plus size={11}/> Add</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {form.medicines.map((med, i) => (
                  <div key={i} style={{ background:D?"rgba(255,255,255,0.04)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.08)":"#e2e8f0"}`, borderRadius:14, padding:"14px" }}>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, marginBottom:10 }}>
                      <SInput D={D} placeholder="Medicine name" value={med.name} onChange={e=>setMed(i,"name",e.target.value)}/>
                      {form.medicines.length > 1 && <button onClick={()=>removeMed(i)} style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", borderRadius:8, cursor:"pointer", padding:"0 10px", display:"flex", alignItems:"center" }}><X size={12}/></button>}
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"80px 1fr 1fr 60px", gap:8 }}>
                      <SInput D={D} placeholder="Qty" type="number" value={med.qty} onChange={e=>setMed(i,"qty",e.target.value)} style={{ textAlign:"center" }}/>
                      {/* ✅ FROM settings/pharmacy/forms (dosage forms) */}
                      <CDropdown D={D} value={med.unit} onChange={v=>setMed(i,"unit",v)} options={medicineUnits} placeholder="Unit"/>
                      <CDropdown D={D} value={med.frequency} onChange={v=>setMed(i,"frequency",v)} options={FREQUENCIES}/>
                      <SInput D={D} placeholder="Days" type="number" value={med.days} onChange={e=>setMed(i,"days",e.target.value)} style={{ textAlign:"center" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <FLabel D={D}>Notes</FLabel>
              <textarea value={form.notes} onChange={setE("notes")} placeholder="Additional instructions…" rows={2}
                style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", resize:"vertical" }}/>
            </div>
          </div>

          <div style={{ display:"flex", gap:12, marginTop:22 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#0d9488,#0891b2)", color:"white", fontSize:14, fontWeight:700, opacity:saving?0.7:1 }}>{saving?"Saving…":editing?"Update":"Save Prescription"}</button>
            <button onClick={onClose} style={{ flex:1, padding:"12px 0", borderRadius:14, cursor:"pointer", fontSize:14, fontWeight:600, background:D?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, color:D?"#94a3b8":"#64748b" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Pharmacy() {
  const { isDark: D } = useTheme();

  // ✅ Dynamic from Firebase Maintenance Settings
  // settings/pharmacy/forms = dosage forms (Tablet, Capsule, Syrup, etc.)
  // Used as the "unit" options inside each medicine row in the prescription
  const medicineUnits = useSettingsList("settings/pharmacy/forms", FB_FORMS);

  const [prescriptions, setPrescriptions] = useState([]);
  const [patients,      setPatients]      = useState([]);
  const [doctors,       setDoctors]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [filterStatus,  setFilterStatus]  = useState("All");
  const [modal,         setModal]         = useState(false);
  const [editing,       setEditing]       = useState(null);

  useEffect(() => { const u=onValue(ref(db,"prescriptions"),s=>{ const d=s.val(); setPrescriptions(d?Object.entries(d).map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)):[]); setLoading(false); }); return()=>u(); },[]);
  useEffect(() => { const u=onValue(ref(db,"patients"),s=>{ const d=s.val(); setPatients(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);
  useEffect(() => { const u=onValue(ref(db,"doctors"), s=>{ const d=s.val(); setDoctors(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);

  const save = async (form) => {
    const now = Date.now();
    if (editing) await update(ref(db,`prescriptions/${editing.id}`), { ...form, updatedAt:now });
    else await push(ref(db,"prescriptions"), { ...form, rxId:`RX-${String(prescriptions.length+1).padStart(4,"0")}`, createdAt:now, updatedAt:now });
  };
  const del = (id) => remove(ref(db,`prescriptions/${id}`));

  const filtered = prescriptions.filter(p => {
    const q = search.toLowerCase();
    return ((p.patientName||"").toLowerCase().includes(q)||(p.rxId||"").toLowerCase().includes(q)||(p.doctor||"").toLowerCase().includes(q))
      && (filterStatus==="All"||p.status===filterStatus);
  });

  const cardBg=D?"#0d1117":"#fff"; const cardBdr=D?"rgba(255,255,255,0.07)":"#f1f5f9";
  const STATS = [
    { label:"Total Rx",   value:prescriptions.length,                                g1:"#0d9488", g2:"#0f766e" },
    { label:"Pending",    value:prescriptions.filter(p=>p.status==="Pending").length,  g1:"#d97706", g2:"#b45309" },
    { label:"Dispensed",  value:prescriptions.filter(p=>p.status==="Dispensed").length,g1:"#059669", g2:"#047857" },
    { label:"Cancelled",  value:prescriptions.filter(p=>p.status==="Cancelled").length,g1:"#dc2626", g2:"#b91c1c" },
  ];

  return (
    <div style={{ padding:24, minHeight:"100%", background:D?"#080b12":"#f8fafc" }}>
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

      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:14, padding:"10px 16px" }}>
          <Search size={15} style={{ color:D?"#334155":"#94a3b8" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient, doctor, Rx ID…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:D?"#e2e8f0":"#1e293b" }}/>
          {search && <button onClick={()=>setSearch("")} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", display:"flex" }}><X size={13}/></button>}
        </div>
        <div style={{ width:150 }}><CDropdown D={D} value={filterStatus} onChange={setFilterStatus} options={["All",...STATUS_LIST].map(s=>({ value:s, label:s==="All"?"All Status":s }))}/></div>
        <button onClick={()=>{ setEditing(null); setModal(true); }} style={{ display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#0d9488,#0891b2)", border:"none", borderRadius:14, padding:"10px 20px", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 6px 18px rgba(13,148,136,0.3)", whiteSpace:"nowrap" }}>
          <Plus size={16}/> New Prescription
        </button>
      </div>

      <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
              {["Rx ID","Patient","Doctor","Date","Medicines","Status","Actions"].map(h => (
                <th key={h} style={{ textAlign:"left", padding:"12px 16px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color:D?"#334155":"#94a3b8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding:60, textAlign:"center" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", border:"2px solid #0d9488", borderTopColor:"transparent", animation:"spin 0.8s linear infinite", margin:"0 auto 8px" }}/>
                <p style={{ color:"#475569", fontSize:13, margin:0 }}>Loading prescriptions…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding:60, textAlign:"center" }}>
                <Pill size={32} style={{ color:D?"#334155":"#cbd5e1", margin:"0 auto 8px", display:"block" }}/>
                <p style={{ color:D?"#475569":"#64748b", fontSize:14, fontWeight:600, margin:0 }}>No prescriptions found</p>
              </td></tr>
            ) : filtered.map((rx, idx) => {
              const sm = STATUS_META[rx.status] || STATUS_META.Pending; const isEven = idx%2===0;
              return (
                <tr key={rx.id}
                  style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`, transition:"background 0.15s",
                    background:D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe") }}
                  onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(13,148,136,0.05)":"#f0fdfa"}
                  onMouseLeave={e=>e.currentTarget.style.background=D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe")}>
                  <td style={{ padding:"12px 16px", fontFamily:"monospace", fontSize:11, color:D?"#334155":"#94a3b8" }}>{rx.rxId}</td>
                  <td style={{ padding:"12px 16px", fontSize:13, fontWeight:600, color:D?"#e2e8f0":"#0f172a" }}>{rx.patientName}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:D?"#475569":"#64748b" }}>{rx.doctor||"—"}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:D?"#475569":"#64748b" }}>{fmtDateStr(rx.date)}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {(rx.medicines||[]).slice(0,3).map((m,i) => (
                        <span key={i} style={{ padding:"2px 8px", borderRadius:6, fontSize:11, background:"rgba(13,148,136,0.1)", color:D?"#5eead4":"#0d9488", border:"1px solid rgba(13,148,136,0.2)" }}>{m.name}</span>
                      ))}
                      {(rx.medicines||[]).length > 3 && <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, color:D?"#475569":"#94a3b8" }}>+{rx.medicines.length-3}</span>}
                    </div>
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:sm.bg, color:sm.hex, border:`1px solid ${sm.ring}` }}>
                      <span style={{ width:5, height:5, borderRadius:"50%", background:sm.hex }}/>{rx.status}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{ setEditing(rx); setModal(true); }} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 10px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, background:"rgba(13,148,136,0.1)", border:"1px solid rgba(13,148,136,0.2)", color:D?"#5eead4":"#0d9488" }}><Edit2 size={10}/> Edit</button>
                      <button onClick={()=>{ if(window.confirm("Delete this prescription?")) del(rx.id); }} style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", display:"flex", alignItems:"center" }}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}` }}>
          <span style={{ fontSize:12, color:D?"#475569":"#94a3b8" }}>Showing <strong>{filtered.length}</strong> of <strong>{prescriptions.length}</strong> prescriptions</span>
        </div>
      </div>

      <PrescriptionModal open={modal} onClose={()=>{ setModal(false); setEditing(null); }} onSave={save} editing={editing} patients={patients} doctors={doctors} D={D} medicineUnits={medicineUnits}/>
    </div>
  );
}
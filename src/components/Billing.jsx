// src/components/Billing.jsx
import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, update, remove } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import PrintReceipt from "./Printreceipt";
import {
  Plus, X, Search, Edit2, Trash2, ChevronDown, Check,
  AlertCircle, CreditCard, User, Calendar, FileText,
  DollarSign, Receipt, Banknote, TrendingUp, Printer,
  QrCode, Landmark,
} from "lucide-react";

const STATUS_LIST  = ["Unpaid","Partial","Paid","Cancelled","Refunded"];
const PAYMENT_METHODS = ["Cash","GCash","Maya","Bank Transfer","Credit Card","Insurance","PhilHealth","Other"];
const STATUS_META  = {
  Unpaid:    { hex:"#f59e0b", bg:"rgba(245,158,11,0.1)",  ring:"rgba(245,158,11,0.25)"  },
  Partial:   { hex:"#3b82f6", bg:"rgba(59,130,246,0.1)",  ring:"rgba(59,130,246,0.25)"  },
  Paid:      { hex:"#22c55e", bg:"rgba(34,197,94,0.1)",   ring:"rgba(34,197,94,0.25)"   },
  Cancelled: { hex:"#ef4444", bg:"rgba(239,68,68,0.1)",   ring:"rgba(239,68,68,0.25)"   },
  Refunded:  { hex:"#a78bfa", bg:"rgba(167,139,250,0.1)", ring:"rgba(167,139,250,0.25)" },
};

const SERVICE_PRESETS = [
  { name:"Consultation Fee",           price:500  },
  { name:"Follow-up Consultation",     price:300  },
  { name:"CBC (Complete Blood Count)", price:350  },
  { name:"Urinalysis",                 price:150  },
  { name:"Chest X-Ray",                price:800  },
  { name:"ECG",                        price:500  },
  { name:"Nebulization",               price:200  },
  { name:"IV Insertion",               price:250  },
  { name:"Wound Dressing",             price:300  },
  { name:"Injection / Shot",           price:150  },
  { name:"Medical Certificate",        price:200  },
  { name:"Other",                      price:0    },
];

// ─── Which methods need a reference number ────────────────────────────────────
const REF_METHODS = ["GCash","Maya","Bank Transfer"];
const REF_CONFIG = {
  GCash:          { label:"GCash Reference Number",             hint:"13-digit ref from GCash app → Activity → tap transaction",      placeholder:"e.g. 1234567890123",    color:"#007DFE", emoji:"📱" },
  Maya:           { label:"Maya Reference Number",              hint:"Found in Maya app → Transaction History → Reference No.",        placeholder:"e.g. MAYA-2025-XXXXXXXX", color:"#00A94F", emoji:"💙" },
  "Bank Transfer":{ label:"Bank Transfer Trace / Ref Number",  hint:"Found on your bank receipt, deposit slip, or online banking.",    placeholder:"e.g. 0123456789",        color:"#7c3aed", emoji:"🏦" },
};

const EMPTY_ITEM = { name:"", qty:1, price:"", discount:0 };
const EMPTY_FORM = {
  patientId:"", patientName:"", doctor:"", date:"",
  status:"Unpaid", paymentMethod:"Cash",
  items:[{ ...EMPTY_ITEM }],
  amountPaid:"", referenceNumber:"", notes:"",
};

const fmtDateStr = (s) => s ? new Date(s+"T00:00:00").toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric" }) : "—";
const fmtPeso    = (n) => `₱${Number(n||0).toLocaleString("en-PH",{ minimumFractionDigits:2 })}`;
const calcTotal  = (items=[]) => items.reduce((sum,i)=>sum+((+i.price||0)*(+i.qty||1))*(1-((+i.discount||0)/100)),0);

// ─── Reusable UI ──────────────────────────────────────────────────────────────
function CDropdown({ D, value, onChange, options, placeholder }) {
  const [open,setOpen]=useState(false); const r=useRef(null);
  useEffect(()=>{ const h=(e)=>{ if(r.current&&!r.current.contains(e.target))setOpen(false); }; document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h); },[]);
  const sel=options.find(o=>(o.value??o)===value); const lbl=sel?(sel.label??sel):(placeholder??"Select…");
  const tc=D?"#e2e8f0":"#1e293b"; const mc=D?"#475569":"#94a3b8";
  return (
    <div ref={r} style={{ position:"relative", userSelect:"none" }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${open?"#2563eb":D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", cursor:"pointer", boxShadow:open?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s" }}>
        <span style={{ fontSize:13, color:value?tc:mc }}>{lbl}</span>
        <ChevronDown size={12} style={{ color:mc, transform:open?"rotate(180deg)":"none", transition:"transform 0.2s", flexShrink:0 }}/>
      </div>
      {open&&(
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:999, background:D?"#161b27":"#fff", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, borderRadius:12, boxShadow:D?"0 20px 60px rgba(0,0,0,0.7)":"0 12px 40px rgba(0,0,0,0.12)", maxHeight:220, overflowY:"auto", padding:"4px" }}>
          {options.map((o,i)=>{ const v=o.value??o; const l=o.label??o; const s=v===value; return <div key={i} onClick={()=>{onChange(v);setOpen(false);}} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", borderRadius:8, cursor:"pointer", fontSize:13, color:s?"#2563eb":tc, background:s?"rgba(37,99,235,0.1)":"transparent", fontWeight:s?600:400 }} onMouseEnter={e=>{if(!s)e.currentTarget.style.background=D?"rgba(255,255,255,0.05)":"#f1f5f9"}} onMouseLeave={e=>{if(!s)e.currentTarget.style.background="transparent"}}>{l}{s&&<Check size={12} style={{color:"#2563eb"}}/>}</div>; })}
        </div>
      )}
    </div>
  );
}
function FLabel({ D, children, icon: Icon }) { return <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:5, color:D?"#94a3b8":"#64748b" }}>{Icon&&<Icon size={9} style={{display:"inline",marginRight:4,verticalAlign:"middle"}}/>}{children}</label>; }
function SInput({ D, ...props }) { const [f,setF]=useState(false); return <input {...props} style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${f?"#2563eb":D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", boxShadow:f?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s", ...props.style }} onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>; }

// ─── Payment Section (inside BillingModal) ────────────────────────────────────
function PaymentSection({ D, form, setForm }) {
  const setE = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const setV = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const method    = form.paymentMethod;
  const isCash    = method === "Cash";
  const needsRef  = REF_METHODS.includes(method);
  const refCfg    = REF_CONFIG[method] || null;
  const total     = calcTotal(form.items);
  const balance   = total - (+form.amountPaid || 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Payment Method */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div>
          <FLabel D={D}>Payment Method</FLabel>
          <CDropdown D={D} value={method} onChange={(v) => { setV("paymentMethod")(v); setForm(p => ({ ...p, paymentMethod:v, referenceNumber:"" })); }} options={PAYMENT_METHODS}/>
        </div>
        <div>
          <FLabel D={D}>Notes</FLabel>
          <SInput D={D} placeholder="Insurance ID, HMO card, remarks…" value={form.notes} onChange={setE("notes")}/>
        </div>
      </div>

      {/* ── CASH: amount paid input ── */}
      {isCash && (
        <div style={{ background:D?"rgba(34,197,94,0.06)":"#f0fdf4", border:`1px solid ${D?"rgba(34,197,94,0.2)":"#bbf7d0"}`, borderRadius:14, padding:"14px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
            <span style={{ fontSize:18 }}>💵</span>
            <span style={{ fontSize:13, fontWeight:700, color:D?"#4ade80":"#059669" }}>Cash Payment</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <FLabel D={D}>Amount Paid (₱)</FLabel>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, fontWeight:700, color:D?"#4ade80":"#059669" }}>₱</span>
                <SInput D={D} type="number" min="0" value={form.amountPaid} onChange={setE("amountPaid")} style={{ paddingLeft:28 }} placeholder="0.00"/>
              </div>
              {/* Quick buttons */}
              <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap" }}>
                {[total, total*0.75, total*0.5].filter(v=>v>0).map((v,i)=>(
                  <button key={i} type="button" onClick={()=>setForm(p=>({...p, amountPaid:String(Math.round(v*100)/100)}))}
                    style={{ padding:"3px 8px", borderRadius:6, border:"1px solid #bbf7d0", background:"#f0fdf4", color:"#059669", fontSize:10, fontWeight:600, cursor:"pointer" }}>
                    {i===0?"Full":i===1?"75%":"50%"} ({fmtPeso(Math.round(v*100)/100)})
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FLabel D={D}>Change / Balance</FLabel>
              <div style={{ padding:"9px 12px", borderRadius:10, background:D?"rgba(255,255,255,0.04)":"#fff", border:`1px solid ${D?"rgba(255,255,255,0.08)":"#e2e8f0"}`, minHeight:40, display:"flex", alignItems:"center" }}>
                {+form.amountPaid > 0
                  ? balance > 0
                    ? <span style={{ fontSize:14, fontWeight:800, color:"#f59e0b" }}>Balance: {fmtPeso(balance)}</span>
                    : balance < 0
                      ? <span style={{ fontSize:14, fontWeight:800, color:"#22c55e" }}>Change: {fmtPeso(Math.abs(balance))}</span>
                      : <span style={{ fontSize:13, fontWeight:700, color:"#22c55e" }}>✓ Exact amount</span>
                  : <span style={{ fontSize:12, color:"#94a3b8" }}>Enter amount paid above</span>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── E-WALLET / BANK: reference number ── */}
      {needsRef && refCfg && (
        <div style={{ background:D?`${refCfg.color}10`:`${refCfg.color}08`, border:`1.5px solid ${refCfg.color}35`, borderRadius:14, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:20 }}>{refCfg.emoji}</span>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:refCfg.color }}>{refCfg.label}</p>
              <p style={{ margin:0, fontSize:11, color:D?"#64748b":"#94a3b8", marginTop:2 }}>{refCfg.hint}</p>
            </div>
          </div>
          <div>
            <SInput
              D={D}
              type="text"
              value={form.referenceNumber || ""}
              onChange={setE("referenceNumber")}
              placeholder={refCfg.placeholder}
              style={{ fontFamily:"monospace", letterSpacing:"0.5px" }}
            />
          </div>
          {/* Also show amount paid for e-wallet */}
          <div>
            <FLabel D={D}>Amount Paid (₱)</FLabel>
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, fontWeight:700, color:refCfg.color }}>₱</span>
              <SInput D={D} type="number" min="0" value={form.amountPaid} onChange={setE("amountPaid")} style={{ paddingLeft:28 }} placeholder="0.00"/>
            </div>
            <div style={{ display:"flex", gap:5, marginTop:6, flexWrap:"wrap" }}>
              {[calcTotal(form.items), calcTotal(form.items)*0.5].filter(v=>v>0).map((v,i)=>(
                <button key={i} type="button" onClick={()=>setForm(p=>({...p, amountPaid:String(Math.round(v*100)/100)}))}
                  style={{ padding:"3px 8px", borderRadius:6, border:`1px solid ${refCfg.color}30`, background:`${refCfg.color}10`, color:refCfg.color, fontSize:10, fontWeight:600, cursor:"pointer" }}>
                  {i===0?"Full amount":i===1?"50%":""} ({fmtPeso(Math.round(v*100)/100)})
                </button>
              ))}
            </div>
          </div>
          {form.referenceNumber?.trim()
            ? <p style={{ margin:0, fontSize:11, fontWeight:600, color:"#22c55e" }}>✓ Reference number entered</p>
            : <p style={{ margin:0, fontSize:11, fontWeight:600, color:"#f97316" }}>⚠ Reference number required for {method}</p>
          }
        </div>
      )}

      {/* Other methods (Credit Card, Insurance, PhilHealth, Other) */}
      {!isCash && !needsRef && (
        <div>
          <FLabel D={D}>Amount Paid (₱)</FLabel>
          <div style={{ position:"relative" }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:13, fontWeight:700, color:D?"#94a3b8":"#64748b" }}>₱</span>
            <SInput D={D} type="number" min="0" value={form.amountPaid} onChange={setE("amountPaid")} style={{ paddingLeft:28 }} placeholder="0.00"/>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Billing Modal ─────────────────────────────────────────────────────────────
function BillingModal({ open, onClose, onSave, editing, patients, doctors, D }) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(()=>{
    if(open){
      setForm(editing
        ? { ...EMPTY_FORM, ...editing, items:editing.items||[{...EMPTY_ITEM}], referenceNumber:editing.referenceNumber||"" }
        : { ...EMPTY_FORM, date:new Date().toISOString().split("T")[0] }
      );
      setError("");
    }
  },[open,editing]);

  if(!open) return null;

  const setE=(k)=>(e)=>setForm(p=>({...p,[k]:e.target.value}));
  const setV=(k)=>(v)=>setForm(p=>({...p,[k]:v}));
  const addItem=()=>setForm(p=>({...p,items:[...p.items,{...EMPTY_ITEM}]}));
  const removeItem=(i)=>setForm(p=>({...p,items:p.items.filter((_,idx)=>idx!==i)}));
  const setItem=(i,k,v)=>setForm(p=>({...p,items:p.items.map((m,idx)=>idx===i?{...m,[k]:v}:m)}));
  const setPreset=(i,name)=>{
    const preset=SERVICE_PRESETS.find(s=>s.name===name);
    setForm(p=>({...p,items:p.items.map((m,idx)=>idx===i?{...m,name,price:preset?.price||""}:m)}));
  };

  const total   = calcTotal(form.items);
  const balance = total - (+form.amountPaid||0);

  const validate=()=>{
    if(!form.patientName) return "Please select a patient.";
    if(!form.date)        return "Date is required.";
    if(!form.items.length||!form.items[0].name) return "Add at least one service item.";
    if(REF_METHODS.includes(form.paymentMethod) && +form.amountPaid > 0 && !form.referenceNumber?.trim())
      return `Reference number is required for ${form.paymentMethod} payments.`;
    return "";
  };

  const handleSave=async()=>{
    const err=validate(); if(err){setError(err);return;}
    setSaving(true);
    try{
      await onSave({
        ...form,
        total,
        balance: Math.max(0, balance),
        // auto-update status based on amount paid
        status: +form.amountPaid >= total ? "Paid"
              : +form.amountPaid > 0      ? "Partial"
              : form.status,
      });
      onClose();
    }
    catch(e){ setError(e.message||"Failed to save."); }
    finally{ setSaving(false); }
  };

  const patientOpts=[{value:"",label:"— Select patient —"},...patients.map(p=>({value:`${p.firstName} ${p.lastName}`,label:`${p.firstName} ${p.lastName} (${p.patientId})`}))];
  const doctorOpts =[{value:"",label:"— Select doctor —"},...doctors.map(d=>({value:`Dr. ${d.firstName} ${d.lastName}`,label:`Dr. ${d.firstName} ${d.lastName}`}))];
  const serviceOpts=SERVICE_PRESETS.map(s=>({value:s.name,label:s.name}));
  const cardBg=D?"#0d1117":"#fff"; const border=D?"rgba(255,255,255,0.08)":"#e2e8f0";

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:680, maxHeight:"92vh", overflowY:"auto", background:cardBg, border:`1px solid ${border}`, borderRadius:24, boxShadow:"0 40px 100px rgba(0,0,0,0.4)" }}>
        <div style={{ height:3, borderRadius:"24px 24px 0 0", background:"linear-gradient(90deg,#059669,#0891b2)" }}/>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>{editing?"Edit Bill":"New Bill"}</h2>
              <p style={{ margin:"4px 0 0", fontSize:12, color:D?"#475569":"#94a3b8" }}>Create a billing statement for the patient</p>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:D?"#475569":"#94a3b8", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16}/></button>
          </div>

          {error&&<div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:16, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}><AlertCircle size={14}/> {error}</div>}

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {/* Patient + Doctor */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={User}>Patient</FLabel><CDropdown D={D} value={form.patientName} onChange={v=>{const p=patients.find(p=>`${p.firstName} ${p.lastName}`===v);setForm(f=>({...f,patientName:v,patientId:p?.patientId||""}));}} options={patientOpts}/></div>
              <div><FLabel D={D}>Doctor</FLabel><CDropdown D={D} value={form.doctor} onChange={setV("doctor")} options={doctorOpts}/></div>
            </div>
            {/* Date + Status */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={Calendar}>Date</FLabel><SInput D={D} type="date" value={form.date} onChange={setE("date")}/></div>
              <div><FLabel D={D}>Status</FLabel><CDropdown D={D} value={form.status} onChange={setV("status")} options={STATUS_LIST}/></div>
            </div>

            {/* Services */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <FLabel D={D} icon={Receipt}>Services / Items</FLabel>
                <button onClick={addItem} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"#059669", background:"rgba(5,150,105,0.1)", border:"1px solid rgba(5,150,105,0.2)", borderRadius:8, padding:"4px 10px", cursor:"pointer" }}><Plus size={11}/> Add</button>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 60px 100px 70px 28px", gap:8, padding:"0 4px" }}>
                  {["Service","Qty","Price (₱)","Disc %",""].map(h=><span key={h} style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", color:D?"#475569":"#94a3b8" }}>{h}</span>)}
                </div>
                {form.items.map((item,i)=>(
                  <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 60px 100px 70px 28px", gap:8, alignItems:"center" }}>
                    <CDropdown D={D} value={item.name} onChange={v=>setPreset(i,v)} options={serviceOpts} placeholder="Select service…"/>
                    <SInput D={D} type="number" min="1" value={item.qty} onChange={e=>setItem(i,"qty",e.target.value)} style={{ textAlign:"center", padding:"9px 6px" }}/>
                    <SInput D={D} type="number" min="0" value={item.price} onChange={e=>setItem(i,"price",e.target.value)} style={{ textAlign:"right", padding:"9px 10px" }}/>
                    <SInput D={D} type="number" min="0" max="100" value={item.discount} onChange={e=>setItem(i,"discount",e.target.value)} style={{ textAlign:"center", padding:"9px 6px" }}/>
                    {form.items.length>1
                      ? <button onClick={()=>removeItem(i)} style={{ width:28,height:36,borderRadius:8,cursor:"pointer",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",color:"#ef4444",display:"flex",alignItems:"center",justifyContent:"center" }}><X size={11}/></button>
                      : <div/>}
                  </div>
                ))}
              </div>
            </div>

            {/* Total summary bar */}
            <div style={{ background:D?"rgba(5,150,105,0.08)":"#f0fdf4", border:`1px solid ${D?"rgba(5,150,105,0.2)":"#bbf7d0"}`, borderRadius:14, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:D?"#475569":"#94a3b8" }}>Total Amount</p>
                <p style={{ margin:0, fontSize:22, fontWeight:800, color:D?"#4ade80":"#059669" }}>{fmtPeso(total)}</p>
              </div>
              {+form.amountPaid > 0 && (
                <div style={{ textAlign:"right" }}>
                  <p style={{ margin:"0 0 2px", fontSize:10, fontWeight:700, textTransform:"uppercase", color:D?"#475569":"#94a3b8" }}>
                    {balance > 0 ? "Balance Due" : balance < 0 ? "Change" : "Status"}
                  </p>
                  <p style={{ margin:0, fontSize:16, fontWeight:800, color: balance > 0 ? "#f59e0b" : "#22c55e" }}>
                    {balance > 0 ? fmtPeso(balance) : balance < 0 ? fmtPeso(Math.abs(balance)) : "Fully Paid ✓"}
                  </p>
                </div>
              )}
            </div>

            {/* ✅ Payment Section — dynamic based on method */}
            <PaymentSection D={D} form={form} setForm={setForm} />
          </div>

          <div style={{ display:"flex", gap:12, marginTop:22 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#059669,#0891b2)", color:"white", fontSize:14, fontWeight:700, opacity:saving?0.7:1 }}>
              {saving?"Saving…":editing?"Update Bill":"Save Bill"}
            </button>
            <button onClick={onClose} style={{ flex:1, padding:"12px 0", borderRadius:14, cursor:"pointer", fontSize:14, fontWeight:600, background:D?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, color:D?"#94a3b8":"#64748b" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function Billing() {
  const { isDark: D } = useTheme();
  const [bills,        setBills]        = useState([]);
  const [patients,     setPatients]     = useState([]);
  const [doctors,      setDoctors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [modal,        setModal]        = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [printBill,    setPrintBill]    = useState(null);

  useEffect(()=>{ const u=onValue(ref(db,"bills"),s=>{ const d=s.val(); setBills(d?Object.entries(d).map(([id,v])=>({id,...v})).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)):[]); setLoading(false); }); return()=>u(); },[]);
  useEffect(()=>{ const u=onValue(ref(db,"patients"),s=>{ const d=s.val(); setPatients(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);
  useEffect(()=>{ const u=onValue(ref(db,"doctors"), s=>{ const d=s.val(); setDoctors(d?Object.entries(d).map(([id,v])=>({id,...v})):[]); }); return()=>u(); },[]);

  const save = async (form) => {
    const now=Date.now();
    if(editing) await update(ref(db,`bills/${editing.id}`),{ ...form, updatedAt:now });
    else        await push(ref(db,"bills"),{ ...form, billId:`B-${String(bills.length+1).padStart(4,"0")}`, createdAt:now, updatedAt:now });
  };
  const del     = (id) => remove(ref(db,`bills/${id}`));
  const markPaid = (id) => update(ref(db,`bills/${id}`),{ status:"Paid", updatedAt:Date.now() });

  const filtered = bills.filter(b=>{
    const q=search.toLowerCase();
    return ((b.patientName||"").toLowerCase().includes(q)||(b.billId||"").toLowerCase().includes(q)||(b.doctor||"").toLowerCase().includes(q))
      && (filterStatus==="All"||b.status===filterStatus);
  });

  const totalRevenue = bills.filter(b=>b.status==="Paid"||b.status==="Partial").reduce((s,b)=>(s+(+b.amountPaid||0)),0);
  const totalUnpaid  = bills.filter(b=>b.status==="Unpaid").reduce((s,b)=>(s+(+b.total||0)),0);
  const todayRevenue = bills.filter(b=>{
    const today=new Date().toISOString().split("T")[0];
    return b.date===today&&(b.status==="Paid"||b.status==="Partial");
  }).reduce((s,b)=>(s+(+b.amountPaid||0)),0);

  const cardBg=D?"#0d1117":"#fff"; const cardBdr=D?"rgba(255,255,255,0.07)":"#f1f5f9";
  const STATS=[
    { label:"Total Bills",     value:bills.length,  g1:"#059669", g2:"#047857", peso:false },
    { label:"Today's Revenue", value:todayRevenue,  g1:"#0891b2", g2:"#0e7490", peso:true  },
    { label:"Total Collected", value:totalRevenue,  g1:"#22c55e", g2:"#15803d", peso:true  },
    { label:"Outstanding",     value:totalUnpaid,   g1:"#f59e0b", g2:"#b45309", peso:true  },
  ];

  return (
    <div style={{ padding:24, minHeight:"100%", background:D?"#080b12":"#f8fafc" }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {STATS.map(s=>(
          <div key={s.label} style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, padding:"20px 20px 18px", position:"relative", overflow:"hidden", transition:"transform 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${s.g1},${s.g2})` }}/>
            <p style={{ margin:"12px 0 4px", fontSize:s.peso?20:28, fontWeight:800, color:D?"#f1f5f9":"#0f172a" }}>{s.peso?fmtPeso(s.value):s.value}</p>
            <p style={{ margin:0, fontSize:12, color:D?"#475569":"#94a3b8", fontWeight:500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:10, background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:14, padding:"10px 16px" }}>
          <Search size={15} style={{ color:D?"#334155":"#94a3b8" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient, doctor, Bill ID…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:D?"#e2e8f0":"#1e293b" }}/>
          {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",display:"flex" }}><X size={13}/></button>}
        </div>
        <div style={{ width:150 }}><CDropdown D={D} value={filterStatus} onChange={setFilterStatus} options={["All",...STATUS_LIST].map(s=>({value:s,label:s==="All"?"All Status":s}))}/></div>
        <button onClick={()=>{setEditing(null);setModal(true);}} style={{ display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#059669,#0891b2)", border:"none", borderRadius:14, padding:"10px 20px", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 6px 18px rgba(5,150,105,0.3)", whiteSpace:"nowrap" }}>
          <Plus size={16}/> New Bill
        </button>
      </div>

      {/* Table */}
      <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
              {["Bill ID","Patient","Doctor","Date","Services","Total","Paid","Balance","Method","Ref #","Status","Actions"].map(h=>(
                <th key={h} style={{ textAlign:"left", padding:"12px 16px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color:D?"#334155":"#94a3b8" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?(
              <tr><td colSpan={12} style={{ padding:60, textAlign:"center" }}>
                <div style={{ width:28,height:28,borderRadius:"50%",border:"2px solid #059669",borderTopColor:"transparent",animation:"spin 0.8s linear infinite",margin:"0 auto 8px" }}/>
                <p style={{ color:"#475569",fontSize:13,margin:0 }}>Loading bills…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            ):filtered.length===0?(
              <tr><td colSpan={12} style={{ padding:60, textAlign:"center" }}>
                <CreditCard size={32} style={{ color:D?"#334155":"#cbd5e1",margin:"0 auto 8px",display:"block" }}/>
                <p style={{ color:D?"#475569":"#64748b",fontSize:14,fontWeight:600,margin:0 }}>No bills found</p>
              </td></tr>
            ):filtered.map((bill,idx)=>{
              const sm=STATUS_META[bill.status]||STATUS_META.Unpaid;
              const isEven=idx%2===0;
              const balance=Math.max(0,(+bill.total||0)-(+bill.amountPaid||0));
              return (
                <tr key={bill.id}
                  style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`, transition:"background 0.15s", background:D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe") }}
                  onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(5,150,105,0.05)":"#f0fdf4"}
                  onMouseLeave={e=>e.currentTarget.style.background=D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe")}
                >
                  <td style={{ padding:"12px 16px", fontFamily:"monospace", fontSize:11, color:D?"#334155":"#94a3b8" }}>{bill.billId}</td>
                  <td style={{ padding:"12px 16px", fontSize:13, fontWeight:600, color:D?"#e2e8f0":"#0f172a" }}>{bill.patientName}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:D?"#475569":"#64748b" }}>{bill.doctor||"—"}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, color:D?"#475569":"#64748b" }}>{fmtDateStr(bill.date)}</td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ fontSize:11, color:D?"#475569":"#64748b" }}>{(bill.items||[]).length} item{(bill.items||[]).length!==1?"s":""}</span>
                  </td>
                  <td style={{ padding:"12px 16px", fontSize:13, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>{fmtPeso(bill.total||0)}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, fontWeight:600, color:"#22c55e" }}>{fmtPeso(bill.amountPaid||0)}</td>
                  <td style={{ padding:"12px 16px", fontSize:12, fontWeight:600, color:balance>0?"#f59e0b":"#475569" }}>{balance>0?fmtPeso(balance):"—"}</td>
                  <td style={{ padding:"12px 16px", fontSize:11, color:D?"#475569":"#64748b" }}>{bill.paymentMethod||"—"}</td>
                  {/* ✅ Reference number column */}
                  <td style={{ padding:"12px 16px" }}>
                    {bill.referenceNumber
                      ? <span style={{ fontFamily:"monospace", fontSize:11, background:D?"rgba(255,255,255,0.05)":"#f1f5f9", padding:"2px 7px", borderRadius:6, color:D?"#94a3b8":"#64748b" }}>{bill.referenceNumber}</span>
                      : <span style={{ fontSize:11, color:D?"#334155":"#cbd5e1" }}>—</span>
                    }
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, background:sm.bg, color:sm.hex, border:`1px solid ${sm.ring}` }}>
                      <span style={{ width:5,height:5,borderRadius:"50%",background:sm.hex }}/>{bill.status}
                    </span>
                  </td>
                  <td style={{ padding:"12px 16px" }}>
                    <div style={{ display:"flex", gap:5 }}>
                      {bill.status==="Unpaid"&&(
                        <button onClick={()=>markPaid(bill.id)} style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", fontSize:10, fontWeight:700, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.2)", color:"#22c55e", whiteSpace:"nowrap" }}>✓ Paid</button>
                      )}
                      <button onClick={()=>setPrintBill(bill)} title="Print Receipt" style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 8px", borderRadius:8, cursor:"pointer", fontSize:10, fontWeight:700, background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.2)", color:D?"#93c5fd":"#2563eb", whiteSpace:"nowrap" }}>
                        <Printer size={11}/> Print
                      </button>
                      <button onClick={()=>{setEditing(bill);setModal(true);}} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 8px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:600, background:"rgba(5,150,105,0.1)", border:"1px solid rgba(5,150,105,0.2)", color:D?"#4ade80":"#059669" }}><Edit2 size={10}/></button>
                      <button onClick={()=>{if(window.confirm("Delete this bill?"))del(bill.id);}} style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", display:"flex", alignItems:"center" }}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12, color:D?"#475569":"#94a3b8" }}>Showing <strong>{filtered.length}</strong> of <strong>{bills.length}</strong> bills</span>
          <span style={{ fontSize:12, fontWeight:700, color:D?"#4ade80":"#059669" }}>Total Collected: {fmtPeso(totalRevenue)}</span>
        </div>
      </div>

      <BillingModal open={modal} onClose={()=>{setModal(false);setEditing(null);}} onSave={save} editing={editing} patients={patients} doctors={doctors} D={D}/>

      {printBill && (
        <PrintReceipt
          bill={printBill}
          onClose={()=>setPrintBill(null)}
          clinicInfo={{
            name:    "MediCore Clinic",
            address: "Your Clinic Address, City, Province",
            contact: "+63 XXX XXX XXXX",
            email:   "clinic@medicore.ph",
            tin:     "000-000-000-000",
          }}
        />
      )}
    </div>
  );
}
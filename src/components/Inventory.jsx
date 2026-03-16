// src/components/Inventory.jsx
import React, { useState, useEffect, useRef } from "react";
import { ref, push, onValue, update, remove } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Plus, X, Search, Edit2, Trash2, ChevronDown, Check,
  AlertCircle, Package, AlertTriangle, TrendingDown, RefreshCw, Pill,
} from "lucide-react";
import { useSettingsList } from "../hooks/useSettingsList";

// ─── Static fallbacks ─────────────────────────────────────────────────────────
const FB_CATEGORIES = ["Tablet","Capsule","Syrup/Suspension","Injectable","Topical","Drops","Inhaler","Suppository","IV Fluid","Medical Supply","Other"];
const FB_UNITS      = ["pcs","tablets","capsules","bottles","vials","ampules","sachets","boxes","strips","liters","ml"];
const FB_SUPPLIERS  = ["MedSource PH","Unilab","Pfizer","Roche","Generic"];
const FB_LOCATIONS  = ["Cabinet A","Cabinet B","Shelf 1","Shelf 2","Refrigerator","Storage Room"];
const FB_BRANDS     = [];

const STATUS_LIST = ["Active","Inactive","Discontinued"];

const EMPTY_FORM = {
  name:"", genericName:"", category:"", brand:"",
  unit:"", quantity:0, reorderLevel:10, maxStock:100,
  unitPrice:"", supplier:"", expiryDate:"",
  location:"", status:"Active", notes:"",
};

const fmtDate = (s) => s ? new Date(s+"T00:00:00").toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric" }) : "—";
const fmtPeso = (n) => `₱${Number(n||0).toLocaleString("en-PH",{ minimumFractionDigits:2 })}`;
const getStockLevel = (qty, reorder, max) => {
  if (qty <= 0) return "out";
  if (qty <= reorder) return "low";
  if (qty >= max * 0.8) return "high";
  return "ok";
};
const STOCK_META = {
  out:  { label:"Out of Stock",  hex:"#ef4444", bg:"rgba(239,68,68,0.1)",  ring:"rgba(239,68,68,0.25)"  },
  low:  { label:"Low Stock",     hex:"#f59e0b", bg:"rgba(245,158,11,0.1)", ring:"rgba(245,158,11,0.25)" },
  ok:   { label:"In Stock",      hex:"#22c55e", bg:"rgba(34,197,94,0.1)",  ring:"rgba(34,197,94,0.25)"  },
  high: { label:"Well Stocked",  hex:"#3b82f6", bg:"rgba(59,130,246,0.1)", ring:"rgba(59,130,246,0.25)" },
};

// ─── Shared sub-components ────────────────────────────────────────────────────
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
          {options.length===0 ? (
            <div style={{ padding:"12px 14px", textAlign:"center", fontSize:12, color:"#64748b" }}>No options yet — add in Maintenance Settings.</div>
          ) : options.map((o,i)=>{ const v=o.value??o; const l=o.label??o; const s=v===value; return <div key={i} onClick={()=>{onChange(v);setOpen(false);}} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 10px", borderRadius:8, cursor:"pointer", fontSize:13, color:s?"#2563eb":tc, background:s?"rgba(37,99,235,0.1)":"transparent", fontWeight:s?600:400 }} onMouseEnter={e=>{if(!s)e.currentTarget.style.background=D?"rgba(255,255,255,0.05)":"#f1f5f9"}} onMouseLeave={e=>{if(!s)e.currentTarget.style.background="transparent"}}>{l}{s&&<Check size={12} style={{color:"#2563eb"}}/>}</div>; })}
        </div>
      )}
    </div>
  );
}
function FLabel({ D, children, icon:Icon }) { return <label style={{ display:"block", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:5, color:D?"#94a3b8":"#64748b" }}>{Icon&&<Icon size={9} style={{display:"inline",marginRight:4,verticalAlign:"middle"}}/>}{children}</label>; }
function SInput({ D, ...props }) { const [f,setF]=useState(false); return <input {...props} style={{ width:"100%", boxSizing:"border-box", background:D?"rgba(255,255,255,0.07)":"#f8fafc", border:`1px solid ${f?"#2563eb":D?"rgba(255,255,255,0.12)":"#e2e8f0"}`, borderRadius:10, padding:"9px 12px", color:D?"#f1f5f9":"#1e293b", fontSize:13, outline:"none", boxShadow:f?"0 0 0 3px rgba(37,99,235,0.12)":"none", transition:"all 0.2s", ...props.style }} onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>; }

// ─── Restock Modal ─────────────────────────────────────────────────────────────
function RestockModal({ item, onClose, onRestock, D }) {
  const [qty, setQty] = useState("");
  const [saving, setSaving] = useState(false);
  if (!item) return null;
  const handleRestock = async () => { if (!qty || isNaN(qty) || +qty <= 0) return; setSaving(true); try { await onRestock(item.id, +qty); onClose(); } finally { setSaving(false); } };
  const cardBg=D?"#0d1117":"#fff";
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:400, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:380, background:cardBg, border:`1px solid ${D?"rgba(255,255,255,0.08)":"#e2e8f0"}`, borderRadius:20, overflow:"hidden", boxShadow:"0 32px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ height:3, background:"linear-gradient(90deg,#0d9488,#0891b2)" }}/>
        <div style={{ padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>Restock Item</h3>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:D?"#475569":"#94a3b8" }}><X size={16}/></button>
          </div>
          <div style={{ padding:"12px 14px", borderRadius:12, background:D?"rgba(255,255,255,0.04)":"#f8fafc", border:`1px solid ${D?"rgba(255,255,255,0.08)":"#e2e8f0"}`, marginBottom:16 }}>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:D?"#e2e8f0":"#0f172a" }}>{item.name}</p>
            <p style={{ margin:"4px 0 0", fontSize:12, color:D?"#475569":"#64748b" }}>Current stock: <strong style={{ color:+item.quantity<=+item.reorderLevel?"#f59e0b":"#22c55e" }}>{item.quantity} {item.unit}</strong></p>
          </div>
          <FLabel D={D}>Quantity to Add ({item.unit})</FLabel>
          <SInput D={D} type="number" min="1" placeholder="Enter quantity" value={qty} onChange={e=>setQty(e.target.value)} style={{ marginBottom:16 }}/>
          {qty && +qty > 0 && <p style={{ margin:"0 0 16px", fontSize:12, color:D?"#4ade80":"#16a34a" }}>New stock will be: <strong>{+item.quantity + +qty} {item.unit}</strong></p>}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handleRestock} disabled={saving||!qty||+qty<=0} style={{ flex:1, padding:"11px 0", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#0d9488,#0891b2)", color:"white", fontSize:13, fontWeight:700, opacity:(!qty||+qty<=0)?0.5:1 }}>{saving?"Saving…":"Confirm Restock"}</button>
            <button onClick={onClose} style={{ flex:"0 0 90px", padding:"11px 0", borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:600, background:D?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, color:D?"#94a3b8":"#64748b" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Item Modal ────────────────────────────────────────────────────────────────
function ItemModal({ open, onClose, onSave, editing, D, categories, brands, units, suppliers, locations }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setForm(editing ? { ...EMPTY_FORM, ...editing } : EMPTY_FORM); setError(""); } }, [open, editing]);
  if (!open) return null;

  const setE=(k)=>(e)=>setForm(p=>({...p,[k]:e.target.value}));
  const setV=(k)=>(v)=>setForm(p=>({...p,[k]:v}));
  const validate=()=>{ if(!form.name.trim()) return "Item name is required."; if(!form.category) return "Category is required."; return ""; };
  const handleSave=async()=>{ const err=validate(); if(err){setError(err);return;} setSaving(true); try{ await onSave(form); onClose(); } catch(e){ setError(e.message||"Failed to save."); } finally{ setSaving(false); } };

  const cardBg=D?"#0d1117":"#fff"; const border=D?"rgba(255,255,255,0.08)":"#e2e8f0";
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:620, maxHeight:"92vh", overflowY:"auto", background:cardBg, border:`1px solid ${border}`, borderRadius:24, boxShadow:"0 40px 100px rgba(0,0,0,0.4)" }}>
        <div style={{ height:3, borderRadius:"24px 24px 0 0", background:"linear-gradient(90deg,#7c3aed,#0d9488)" }}/>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:22 }}>
            <div>
              <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:D?"#f1f5f9":"#0f172a" }}>{editing?"Edit Item":"Add Inventory Item"}</h2>
              <p style={{ margin:"4px 0 0", fontSize:12, color:D?"#475569":"#94a3b8" }}>Medicine or medical supply details</p>
            </div>
            <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:D?"#475569":"#94a3b8", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}><X size={16}/></button>
          </div>

          {error && <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", marginBottom:16, borderRadius:12, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:13 }}><AlertCircle size={14}/> {error}</div>}

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D} icon={Pill}>Medicine / Item Name</FLabel><SInput D={D} placeholder="e.g. Amoxicillin 500mg" value={form.name} onChange={setE("name")}/></div>
              <div><FLabel D={D}>Generic Name</FLabel><SInput D={D} placeholder="e.g. Amoxicillin" value={form.genericName} onChange={setE("genericName")}/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
              <div><FLabel D={D}>Category</FLabel>
                {/* ✅ FROM settings/inventory/categories */}
                <CDropdown D={D} value={form.category} onChange={setV("category")} options={categories} placeholder="Select category"/>
              </div>
              <div><FLabel D={D}>Brand</FLabel>
                {/* ✅ FROM settings/inventory/brands */}
                <CDropdown D={D} value={form.brand} onChange={setV("brand")} options={brands} placeholder="Select brand"/>
              </div>
              <div><FLabel D={D}>Unit</FLabel>
                {/* ✅ FROM settings/inventory/units */}
                <CDropdown D={D} value={form.unit} onChange={setV("unit")} options={units} placeholder="Select unit"/>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14 }}>
              <div><FLabel D={D}>Current Qty</FLabel><SInput D={D} type="number" min="0" value={form.quantity} onChange={setE("quantity")} style={{ textAlign:"center" }}/></div>
              <div><FLabel D={D}>Reorder Level</FLabel><SInput D={D} type="number" min="0" value={form.reorderLevel} onChange={setE("reorderLevel")} style={{ textAlign:"center" }}/></div>
              <div><FLabel D={D}>Max Stock</FLabel><SInput D={D} type="number" min="0" value={form.maxStock} onChange={setE("maxStock")} style={{ textAlign:"center" }}/></div>
              <div><FLabel D={D}>Unit Price (₱)</FLabel><SInput D={D} type="number" min="0" step="0.01" value={form.unitPrice} onChange={setE("unitPrice")} style={{ textAlign:"right" }}/></div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
              <div><FLabel D={D}>Supplier</FLabel>
                {/* ✅ FROM settings/inventory/suppliers */}
                <CDropdown D={D} value={form.supplier} onChange={setV("supplier")} options={suppliers} placeholder="Select supplier"/>
              </div>
              <div><FLabel D={D}>Expiry Date</FLabel><SInput D={D} type="date" value={form.expiryDate} onChange={setE("expiryDate")}/></div>
              <div><FLabel D={D}>Storage Location</FLabel>
                {/* ✅ FROM settings/inventory/locations */}
                <CDropdown D={D} value={form.location} onChange={setV("location")} options={locations} placeholder="Select location"/>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <div><FLabel D={D}>Status</FLabel><CDropdown D={D} value={form.status} onChange={setV("status")} options={STATUS_LIST}/></div>
              <div><FLabel D={D}>Notes</FLabel><SInput D={D} placeholder="Additional notes" value={form.notes} onChange={setE("notes")}/></div>
            </div>
          </div>

          <div style={{ display:"flex", gap:12, marginTop:22 }}>
            <button onClick={handleSave} disabled={saving} style={{ flex:1, padding:"12px 0", borderRadius:14, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#7c3aed,#0d9488)", color:"white", fontSize:14, fontWeight:700, opacity:saving?0.7:1 }}>{saving?"Saving…":editing?"Update Item":"Add Item"}</button>
            <button onClick={onClose} style={{ flex:1, padding:"12px 0", borderRadius:14, cursor:"pointer", fontSize:14, fontWeight:600, background:D?"rgba(255,255,255,0.05)":"#f1f5f9", border:`1px solid ${D?"rgba(255,255,255,0.1)":"#e2e8f0"}`, color:D?"#94a3b8":"#64748b" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Inventory() {
  const { isDark: D } = useTheme();

  // ✅ All dynamic from Firebase Maintenance Settings
  const categories = useSettingsList("settings/inventory/categories", FB_CATEGORIES);
  const brands     = useSettingsList("settings/inventory/brands",     FB_BRANDS);
  const units      = useSettingsList("settings/inventory/units",      FB_UNITS);
  const suppliers  = useSettingsList("settings/inventory/suppliers",  FB_SUPPLIERS);
  const locations  = useSettingsList("settings/inventory/locations",  FB_LOCATIONS);

  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [filterCat,  setFilterCat]  = useState("All");
  const [filterStock,setFilterStock]= useState("All");
  const [modal,      setModal]      = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [restocking, setRestocking] = useState(null);

  useEffect(()=>{ const u=onValue(ref(db,"inventory"),s=>{ const d=s.val(); setItems(d?Object.entries(d).map(([id,v])=>({id,...v})).sort((a,b)=>(a.name||"").localeCompare(b.name||"")):[]); setLoading(false); }); return()=>u(); },[]);

  const save=async(form)=>{ const now=Date.now(); if(editing) await update(ref(db,`inventory/${editing.id}`),{...form,updatedAt:now}); else await push(ref(db,"inventory"),{...form,itemId:`INV-${String(items.length+1).padStart(4,"0")}`,createdAt:now,updatedAt:now}); };
  const del=(id)=>remove(ref(db,`inventory/${id}`));
  const restock=async(id,qty)=>{ const item=items.find(i=>i.id===id); if(!item) return; await update(ref(db,`inventory/${id}`),{quantity:(+item.quantity||0)+qty,updatedAt:Date.now()}); };

  // ✅ Dynamic category filter
  const allCats = ["All", ...categories];

  const filtered=items.filter(i=>{
    const q=search.toLowerCase();
    const level=getStockLevel(+i.quantity||0,+i.reorderLevel||10,+i.maxStock||100);
    return ((i.name||"").toLowerCase().includes(q)||(i.genericName||"").toLowerCase().includes(q)||(i.brand||"").toLowerCase().includes(q)||(i.itemId||"").toLowerCase().includes(q))
      && (filterCat==="All"||i.category===filterCat)
      && (filterStock==="All"||level===filterStock);
  });

  const lowStock=items.filter(i=>getStockLevel(+i.quantity,+i.reorderLevel,+i.maxStock)==="low");
  const outStock=items.filter(i=>getStockLevel(+i.quantity,+i.reorderLevel,+i.maxStock)==="out");
  const totalValue=items.reduce((s,i)=>s+((+i.quantity||0)*(+i.unitPrice||0)),0);

  const cardBg=D?"#0d1117":"#fff"; const cardBdr=D?"rgba(255,255,255,0.07)":"#f1f5f9";
  const STATS=[
    { label:"Total Items",    value:items.length,    g1:"#7c3aed", g2:"#6d28d9" },
    { label:"Low Stock",      value:lowStock.length, g1:"#f59e0b", g2:"#b45309" },
    { label:"Out of Stock",   value:outStock.length, g1:"#ef4444", g2:"#b91c1c" },
    { label:"Inventory Value",value:fmtPeso(totalValue), g1:"#0d9488", g2:"#0f766e", isText:true },
  ];

  return (
    <div style={{ padding:24, minHeight:"100%", background:D?"#080b12":"#f8fafc" }}>
      {(lowStock.length>0||outStock.length>0) && (
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          {outStock.length>0&&<div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderRadius:12, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", fontSize:13, fontWeight:600 }}><AlertTriangle size={16}/> {outStock.length} item{outStock.length>1?"s":""} OUT OF STOCK: {outStock.slice(0,3).map(i=>i.name).join(", ")}{outStock.length>3?` +${outStock.length-3} more`:""}</div>}
          {lowStock.length>0&&<div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 16px", borderRadius:12, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", color:"#d97706", fontSize:13, fontWeight:600 }}><TrendingDown size={16}/> {lowStock.length} item{lowStock.length>1?"s":""} LOW STOCK</div>}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        {STATS.map(s=>(
          <div key={s.label} style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, padding:"20px 20px 18px", position:"relative", overflow:"hidden", transition:"transform 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${s.g1},${s.g2})` }}/>
            <p style={{ margin:"12px 0 4px", fontSize:s.isText?18:28, fontWeight:800, color:D?"#f1f5f9":"#0f172a" }}>{s.value}</p>
            <p style={{ margin:0, fontSize:12, color:D?"#475569":"#94a3b8", fontWeight:500 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:200, display:"flex", alignItems:"center", gap:10, background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:14, padding:"10px 16px" }}>
          <Search size={15} style={{ color:D?"#334155":"#94a3b8" }}/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search item name, generic, brand, ID…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:13, color:D?"#e2e8f0":"#1e293b" }}/>
          {search&&<button onClick={()=>setSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",display:"flex" }}><X size={13}/></button>}
        </div>
        {/* ✅ Dynamic category filter */}
        <div style={{ width:160 }}><CDropdown D={D} value={filterCat} onChange={setFilterCat} options={allCats.map(s=>({value:s,label:s==="All"?"All Categories":s}))}/></div>
        <div style={{ width:150 }}><CDropdown D={D} value={filterStock} onChange={setFilterStock} options={[{value:"All",label:"All Stock"},{value:"out",label:"Out of Stock"},{value:"low",label:"Low Stock"},{value:"ok",label:"In Stock"},{value:"high",label:"Well Stocked"}]}/></div>
        <button onClick={()=>{setEditing(null);setModal(true);}} style={{ display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg,#7c3aed,#0d9488)", border:"none", borderRadius:14, padding:"10px 20px", color:"white", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 6px 18px rgba(124,58,237,0.3)", whiteSpace:"nowrap" }}>
          <Plus size={16}/> Add Item
        </button>
      </div>

      <div style={{ background:cardBg, border:`1px solid ${cardBdr}`, borderRadius:20, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, background:D?"rgba(255,255,255,0.02)":"#fafafa" }}>
              {["Item ID","Name","Category","Stock","Reorder Lvl","Unit Price","Expiry","Location","Stock Level","Actions"].map(h=>(
                <th key={h} style={{ textAlign:"left", padding:"12px 14px", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", color:D?"#334155":"#94a3b8", whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading?(
              <tr><td colSpan={10} style={{ padding:60, textAlign:"center" }}>
                <div style={{ width:28,height:28,borderRadius:"50%",border:"2px solid #7c3aed",borderTopColor:"transparent",animation:"spin 0.8s linear infinite",margin:"0 auto 8px" }}/>
                <p style={{ color:"#475569",fontSize:13,margin:0 }}>Loading inventory…</p>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </td></tr>
            ):filtered.length===0?(
              <tr><td colSpan={10} style={{ padding:60, textAlign:"center" }}>
                <Package size={32} style={{ color:D?"#334155":"#cbd5e1",margin:"0 auto 10px",display:"block" }}/>
                <p style={{ color:D?"#475569":"#64748b",fontSize:14,fontWeight:600,margin:0 }}>No items found</p>
              </td></tr>
            ):filtered.map((item,idx)=>{
              const level=getStockLevel(+item.quantity||0,+item.reorderLevel||10,+item.maxStock||100);
              const sm=STOCK_META[level]; const isEven=idx%2===0;
              const isExpiring=item.expiryDate&&new Date(item.expiryDate)<new Date(Date.now()+30*24*60*60*1000);
              return (
                <tr key={item.id}
                  style={{ borderBottom:`1px solid ${D?"rgba(255,255,255,0.04)":"#f8fafc"}`, transition:"background 0.15s", background:D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe") }}
                  onMouseEnter={e=>e.currentTarget.style.background=D?"rgba(124,58,237,0.05)":"#faf5ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=D?(isEven?"transparent":"rgba(255,255,255,0.01)"):(isEven?"#fff":"#fafffe")}>
                  <td style={{ padding:"12px 14px", fontFamily:"monospace", fontSize:11, color:D?"#334155":"#94a3b8" }}>{item.itemId}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <p style={{ margin:0, fontSize:13, fontWeight:600, color:D?"#e2e8f0":"#0f172a" }}>{item.name}</p>
                    {item.genericName&&<p style={{ margin:0, fontSize:11, color:D?"#475569":"#94a3b8" }}>{item.genericName}</p>}
                    {item.brand&&<p style={{ margin:0, fontSize:10, color:D?"#334155":"#cbd5e1", fontStyle:"italic" }}>{item.brand}</p>}
                  </td>
                  <td style={{ padding:"12px 14px" }}><span style={{ padding:"3px 8px", borderRadius:6, fontSize:11, background:"rgba(124,58,237,0.1)", color:D?"#c4b5fd":"#7c3aed", border:"1px solid rgba(124,58,237,0.2)" }}>{item.category}</span></td>
                  <td style={{ padding:"12px 14px" }}><span style={{ fontSize:15, fontWeight:800, color:level==="out"?"#ef4444":level==="low"?"#f59e0b":"#22c55e" }}>{item.quantity||0}</span><span style={{ fontSize:11, color:D?"#475569":"#94a3b8", marginLeft:4 }}>{item.unit}</span></td>
                  <td style={{ padding:"12px 14px", fontSize:12, color:D?"#475569":"#94a3b8" }}>{item.reorderLevel||10} {item.unit}</td>
                  <td style={{ padding:"12px 14px", fontSize:13, fontWeight:600, color:D?"#e2e8f0":"#0f172a" }}>{item.unitPrice?fmtPeso(item.unitPrice):"—"}</td>
                  <td style={{ padding:"12px 14px" }}>{item.expiryDate?<span style={{ fontSize:12, color:isExpiring?"#ef4444":D?"#475569":"#64748b", fontWeight:isExpiring?700:400 }}>{isExpiring?"⚠️ ":""}{fmtDate(item.expiryDate)}</span>:<span style={{ color:D?"#334155":"#cbd5e1", fontSize:11 }}>—</span>}</td>
                  <td style={{ padding:"12px 14px", fontSize:12, color:D?"#475569":"#64748b" }}>{item.location||"—"}</td>
                  <td style={{ padding:"12px 14px" }}>
                    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:sm.bg, color:sm.hex, border:`1px solid ${sm.ring}` }}>
                      <span style={{ width:5,height:5,borderRadius:"50%",background:sm.hex }}/>{sm.label}
                    </span>
                    <div style={{ marginTop:5, height:3, borderRadius:2, background:D?"rgba(255,255,255,0.08)":"#f1f5f9", width:80, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${Math.min(100,((+item.quantity||0)/(+item.maxStock||100))*100)}%`, borderRadius:2, background:sm.hex, transition:"width 0.5s" }}/>
                    </div>
                  </td>
                  <td style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex", gap:5 }}>
                      <button onClick={()=>setRestocking(item)} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 8px", borderRadius:8, cursor:"pointer", fontSize:10, fontWeight:700, background:"rgba(13,148,136,0.1)", border:"1px solid rgba(13,148,136,0.2)", color:D?"#5eead4":"#0d9488", whiteSpace:"nowrap" }}><RefreshCw size={10}/> Restock</button>
                      <button onClick={()=>{setEditing(item);setModal(true);}} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 8px", borderRadius:8, cursor:"pointer", fontSize:11, background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.2)", color:D?"#c4b5fd":"#7c3aed" }}><Edit2 size={10}/></button>
                      <button onClick={()=>{if(window.confirm("Delete this item?"))del(item.id);}} style={{ padding:"5px 8px", borderRadius:8, cursor:"pointer", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", color:"#ef4444", display:"flex", alignItems:"center" }}><Trash2 size={11}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${D?"rgba(255,255,255,0.05)":"#f1f5f9"}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:12, color:D?"#475569":"#94a3b8" }}>Showing <strong>{filtered.length}</strong> of <strong>{items.length}</strong> items</span>
          <span style={{ fontSize:12, color:D?"#475569":"#94a3b8" }}>Total Value: <strong style={{ color:D?"#4ade80":"#059669" }}>{fmtPeso(totalValue)}</strong></span>
        </div>
      </div>

      <ItemModal open={modal} onClose={()=>{setModal(false);setEditing(null);}} onSave={save} editing={editing} D={D}
        categories={categories} brands={brands} units={units} suppliers={suppliers} locations={locations}/>
      <RestockModal item={restocking} onClose={()=>setRestocking(null)} onRestock={restock} D={D}/>
    </div>
  );
}
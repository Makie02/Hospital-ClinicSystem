// src/components/MyProfileModal.jsx
import React, { useState, useRef } from "react";
import {
    X, Camera, Edit3, Save, Loader, User, Mail, Phone, MapPin,
    PenTool, Upload, Trash2, RefreshCw, CheckCircle2,
    Instagram, Twitter, Facebook, Linkedin, Globe, Hash,
    ChevronLeft, ZoomIn, ZoomOut, ArrowLeft,
} from "lucide-react";
import { ref, update } from "firebase/database";
import { db } from "../context/firebase";

const PROFILE_KEY = "medicore_profile_local";
export const saveProfileLocal = p => { try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {} };
export const loadProfileLocal = () => { try { const r = localStorage.getItem(PROFILE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };

function removeBackground(imgEl, threshold = 240) {
    const canvas = document.createElement("canvas");
    canvas.width = imgEl.naturalWidth || imgEl.width;
    canvas.height = imgEl.naturalHeight || imgEl.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const brightness = (r + g + b) / 3;
        const isWhitish = brightness > threshold && Math.max(r,g,b) - Math.min(r,g,b) < 30;
        if (isWhitish) data[i+3] = 0;
        else { data[i] = Math.max(0,r-20); data[i+1] = Math.max(0,g-20); data[i+2] = Math.max(0,b-20); }
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/png");
}

async function processSignatureWithAI(base64DataUrl) {
    const base64 = base64DataUrl.split(",")[1];
    const mediaType = base64DataUrl.split(";")[0].split(":")[1];
    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514", max_tokens: 200,
                messages: [{ role: "user", content: [
                    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
                    { type: "text", text: 'Analyze this signature image. Reply ONLY with JSON: {"threshold": 200-250}' }
                ]}]
            })
        });
        const data = await response.json();
        const text = data.content?.[0]?.text || "{}";
        const result = JSON.parse(text.replace(/```json|```/g,"").trim());
        return result.threshold || 230;
    } catch { return 230; }
}

// ─── Image Cropper ─────────────────────────────────────────────────────────
function ImageCropper({ imageSrc, onCrop, onCancel, D }) {
    const canvasRef = useRef(null);
    const [scale, setScale] = useState(1);
    const [offset, setOffset] = useState({ x:0, y:0 });
    const [dragging, setDragging] = useState(false);
    const [lastPos, setLastPos] = useState({ x:0, y:0 });
    const imgRef = useRef(new Image());
    const SIZE = 260;

    React.useEffect(() => {
        imgRef.current.crossOrigin = "anonymous";
        imgRef.current.onload = () => {
            const { naturalWidth: w, naturalHeight: h } = imgRef.current;
            const s = Math.max(SIZE/w, SIZE/h);
            setScale(s);
            setOffset({ x:(SIZE-w*s)/2, y:(SIZE-h*s)/2 });
        };
        imgRef.current.src = imageSrc;
    }, [imageSrc]);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !imgRef.current.complete) return;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0,0,SIZE,SIZE);
        ctx.save();
        ctx.beginPath(); ctx.arc(SIZE/2,SIZE/2,SIZE/2,0,Math.PI*2); ctx.clip();
        ctx.drawImage(imgRef.current, offset.x, offset.y, imgRef.current.naturalWidth*scale, imgRef.current.naturalHeight*scale);
        ctx.restore();
        ctx.strokeStyle="#6366f1"; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(SIZE/2,SIZE/2,SIZE/2-2,0,Math.PI*2); ctx.stroke();
    }, [scale, offset]);

    const handleCrop = () => {
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = 200;
        const ctx = canvas.getContext("2d");
        ctx.beginPath(); ctx.arc(100,100,100,0,Math.PI*2); ctx.clip();
        const r = 200/SIZE;
        ctx.drawImage(imgRef.current, offset.x*r, offset.y*r, imgRef.current.naturalWidth*scale*r, imgRef.current.naturalHeight*scale*r);
        onCrop(canvas.toDataURL("image/png"));
    };

    return (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
            <p style={{ margin:0, fontSize:12, color:D?"#9ca3af":"#6b7280", textAlign:"center" }}>Drag to reposition • Scroll to zoom</p>
            <canvas ref={canvasRef} width={SIZE} height={SIZE}
                onMouseDown={e=>{ setDragging(true); setLastPos({x:e.clientX,y:e.clientY}); }}
                onMouseMove={e=>{ if(!dragging) return; const dx=e.clientX-lastPos.x, dy=e.clientY-lastPos.y; setOffset(o=>({x:o.x+dx,y:o.y+dy})); setLastPos({x:e.clientX,y:e.clientY}); }}
                onMouseUp={()=>setDragging(false)}
                onWheel={e=>{ e.preventDefault(); setScale(s=>Math.max(0.3,Math.min(5,s-e.deltaY*0.002))); }}
                style={{ borderRadius:"50%", cursor:"grab", border:"3px solid #6366f1", userSelect:"none" }}
            />
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <button onClick={()=>setScale(s=>Math.max(0.3,s-0.1))} style={{ width:32,height:32,borderRadius:8,border:`1px solid ${D?"#1f2937":"#e5e7eb"}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:D?"#9ca3af":"#6b7280" }}><ZoomOut size={14}/></button>
                <span style={{ fontSize:12,color:D?"#6b7280":"#9ca3af",minWidth:50,textAlign:"center" }}>{Math.round(scale*100)}%</span>
                <button onClick={()=>setScale(s=>Math.min(5,s+0.1))} style={{ width:32,height:32,borderRadius:8,border:`1px solid ${D?"#1f2937":"#e5e7eb"}`,background:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:D?"#9ca3af":"#6b7280" }}><ZoomIn size={14}/></button>
            </div>
            <div style={{ display:"flex", gap:10, width:"100%" }}>
                <button onClick={onCancel} style={{ flex:"0 0 90px",padding:"10px 0",borderRadius:12,border:`1px solid ${D?"#1f2937":"#e5e7eb"}`,background:"transparent",color:D?"#6b7280":"#9ca3af",fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
                <button onClick={handleCrop} style={{ flex:1,padding:"10px 0",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer" }}>✓ Apply Photo</button>
            </div>
        </div>
    );
}

// ─── Signature Pad ──────────────────────────────────────────────────────────
function SignaturePad({ onSave, isDark, existingSig }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [penColor, setPenColor] = useState("#1e3a8a");
    const [penSize, setPenSize] = useState(2.5);
    const [mode, setMode] = useState("draw");
    const [uploadSrc, setUploadSrc] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [aiThreshold, setAiThreshold] = useState(230);
    const [processedSig, setProcessedSig] = useState(null);
    const lastPos = useRef(null);
    const D = isDark;

    React.useEffect(() => {
        if (mode !== "draw") return;
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    }, [mode]);

    const getPos = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width/rect.width, sy = canvas.height/rect.height;
        const src = e.touches?.[0] || e;
        return { x:(src.clientX-rect.left)*sx, y:(src.clientY-rect.top)*sy };
    };

    const startDraw = e => { e.preventDefault(); setIsDrawing(true); setIsEmpty(false); lastPos.current = getPos(e, canvasRef.current); };
    const stopDraw  = ()  => { setIsDrawing(false); lastPos.current = null; };
    const draw = e => {
        e.preventDefault(); if (!isDrawing) return;
        const canvas = canvasRef.current, ctx = canvas.getContext("2d"), pos = getPos(e, canvas);
        ctx.beginPath(); ctx.moveTo(lastPos.current.x,lastPos.current.y); ctx.lineTo(pos.x,pos.y);
        ctx.strokeStyle=penColor; ctx.lineWidth=penSize; ctx.lineCap="round"; ctx.lineJoin="round"; ctx.stroke();
        lastPos.current = pos;
    };

    const clearPad = () => {
        const ctx = canvasRef.current.getContext("2d");
        ctx.fillStyle="#fff"; ctx.fillRect(0,0,canvasRef.current.width,canvasRef.current.height);
        setIsEmpty(true);
    };

    const saveDraw = () => {
        if (isEmpty) return;
        const imgEl = new Image();
        imgEl.onload = () => onSave(removeBackground(imgEl, 245));
        imgEl.src = canvasRef.current.toDataURL("image/png");
    };

    const handleUpload = async e => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => {
            setUploadSrc(ev.target.result); setProcessing(true); setProcessedSig(null);
            const threshold = await processSignatureWithAI(ev.target.result);
            setAiThreshold(threshold);
            const imgEl = new Image();
            imgEl.onload = () => { setProcessedSig(removeBackground(imgEl, threshold)); setProcessing(false); };
            imgEl.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    };

    const adjustThreshold = val => {
        setAiThreshold(val); if (!uploadSrc) return;
        const imgEl = new Image();
        imgEl.onload = () => setProcessedSig(removeBackground(imgEl, val));
        imgEl.src = uploadSrc;
    };

    const colors = ["#1e3a8a","#000000","#1f2937","#7f1d1d","#14532d"];

    return (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"flex",background:D?"rgba(255,255,255,0.04)":"#f8fafc",borderRadius:10,padding:3,border:D?"1px solid #1f2937":"1px solid #f1f5f9" }}>
                {[{id:"draw",label:"✏️ Draw Signature"},{id:"upload",label:"📷 Upload & AI Clean"}].map(m=>(
                    <button key={m.id} onClick={()=>setMode(m.id)} style={{ flex:1,padding:"7px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,transition:"all .2s",background:mode===m.id?(D?"#1f2937":"#fff"):"transparent",color:mode===m.id?(D?"#f1f5f9":"#111827"):(D?"#4b5563":"#9ca3af"),boxShadow:mode===m.id?"0 2px 8px rgba(0,0,0,0.1)":"none" }}>{m.label}</button>
                ))}
            </div>

            {mode==="draw" && (
                <>
                    <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                        <div style={{ display:"flex",gap:6 }}>
                            {colors.map(c=>(
                                <button key={c} onClick={()=>setPenColor(c)} style={{ width:22,height:22,borderRadius:"50%",background:c,border:`3px solid ${penColor===c?"#6366f1":"transparent"}`,cursor:"pointer",transition:"all .15s" }}/>
                            ))}
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:6,marginLeft:"auto" }}>
                            <span style={{ fontSize:11,color:D?"#6b7280":"#9ca3af" }}>Pen:</span>
                            {[1.5,2.5,4].map(s=>(
                                <button key={s} onClick={()=>setPenSize(s)} style={{ width:28,height:28,borderRadius:8,border:`1.5px solid ${penSize===s?"#6366f1":(D?"#1f2937":"#e5e7eb")}`,background:penSize===s?"rgba(99,102,241,0.1)":"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                                    <div style={{ width:s*2.5,height:s*2.5,borderRadius:"50%",background:D?"#e5e7eb":"#374151" }}/>
                                </button>
                            ))}
                        </div>
                        <button onClick={clearPad} style={{ display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:D?"1px solid #1f2937":"1px solid #e5e7eb",background:"transparent",color:"#ef4444",fontSize:11,fontWeight:600,cursor:"pointer" }}>
                            <Trash2 size={12}/> Clear
                        </button>
                    </div>
                    <div style={{ border:`2px dashed ${D?"#374151":"#e5e7eb"}`,borderRadius:14,overflow:"hidden",background:"#fff",position:"relative" }}>
                        <canvas ref={canvasRef} width={500} height={180}
                            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
                            style={{ display:"block",width:"100%",cursor:"crosshair",touchAction:"none" }}
                        />
                        {isEmpty && <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none" }}>
                            <p style={{ fontSize:14,color:"#cbd5e1",fontStyle:"italic",userSelect:"none" }}>Sign here...</p>
                        </div>}
                    </div>
                    <button onClick={saveDraw} disabled={isEmpty} style={{ width:"100%",padding:"11px 0",borderRadius:12,border:"none",background:isEmpty?(D?"#1f2937":"#f1f5f9"):"linear-gradient(135deg,#6366f1,#8b5cf6)",color:isEmpty?(D?"#4b5563":"#9ca3af"):"#fff",fontSize:13,fontWeight:700,cursor:isEmpty?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                        <Save size={14}/> Save Signature
                    </button>
                </>
            )}

            {mode==="upload" && (
                <>
                    <label style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,padding:"20px",borderRadius:14,border:`2px dashed ${D?"#374151":"#e5e7eb"}`,cursor:"pointer",background:D?"rgba(255,255,255,0.02)":"#fafafa",transition:"all .2s" }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#6366f1"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=D?"#374151":"#e5e7eb"}>
                        <Upload size={24} color="#6366f1"/>
                        <p style={{ margin:0,fontSize:13,fontWeight:600,color:D?"#e5e7eb":"#374151" }}>Upload signature image</p>
                        <p style={{ margin:0,fontSize:11,color:D?"#4b5563":"#9ca3af" }}>PNG, JPG — AI will auto-remove white background</p>
                        <input type="file" accept="image/*" onChange={handleUpload} style={{ display:"none" }}/>
                    </label>
                    {processing && (
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"16px",borderRadius:12,background:D?"rgba(99,102,241,0.08)":"#eef2ff" }}>
                            <Loader size={16} color="#6366f1" style={{ animation:"spin .7s linear infinite" }}/>
                            <span style={{ fontSize:12,fontWeight:600,color:"#6366f1" }}>AI analyzing & cleaning signature...</span>
                        </div>
                    )}
                    {processedSig && !processing && (
                        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                                <div>
                                    <p style={{ margin:"0 0 6px",fontSize:11,fontWeight:600,color:D?"#4b5563":"#9ca3af",textTransform:"uppercase" }}>Original</p>
                                    <div style={{ borderRadius:10,overflow:"hidden",border:D?"1px solid #1f2937":"1px solid #e5e7eb",background:"#fff",height:80,display:"flex",alignItems:"center",justifyContent:"center" }}>
                                        <img src={uploadSrc} style={{ maxWidth:"100%",maxHeight:76,objectFit:"contain" }} alt="original"/>
                                    </div>
                                </div>
                                <div>
                                    <p style={{ margin:"0 0 6px",fontSize:11,fontWeight:600,color:"#22c55e",textTransform:"uppercase" }}>✨ AI Cleaned</p>
                                    <div style={{ borderRadius:10,overflow:"hidden",border:"1.5px solid #22c55e",background:"repeating-conic-gradient(#e5e7eb 0% 25%,#fff 0% 50%) 0 0/12px 12px",height:80,display:"flex",alignItems:"center",justifyContent:"center" }}>
                                        <img src={processedSig} style={{ maxWidth:"100%",maxHeight:76,objectFit:"contain" }} alt="processed"/>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                                    <span style={{ fontSize:11,color:D?"#4b5563":"#9ca3af" }}>Background sensitivity</span>
                                    <span style={{ fontSize:11,fontWeight:700,color:"#6366f1" }}>{aiThreshold}</span>
                                </div>
                                <input type="range" min={150} max={255} value={aiThreshold} onChange={e=>adjustThreshold(+e.target.value)} style={{ width:"100%",accentColor:"#6366f1" }}/>
                                <div style={{ display:"flex",justifyContent:"space-between" }}>
                                    <span style={{ fontSize:10,color:D?"#374151":"#d1d5db" }}>Keep more ink</span>
                                    <span style={{ fontSize:10,color:D?"#374151":"#d1d5db" }}>Remove more bg</span>
                                </div>
                            </div>
                            <button onClick={()=>onSave(processedSig)} style={{ width:"100%",padding:"11px 0",borderRadius:12,border:"none",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                                <CheckCircle2 size={14}/> Use This Signature
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── MAIN MODAL ─────────────────────────────────────────────────────────────
export default function MyProfileModal({ onClose, profile, user, isDark: D }) {
    const [local, setLocal] = useState(() => ({ ...loadProfileLocal(), ...profile }));
    const [screen, setScreen] = useState("view"); // "view" | "edit" | "sig" | "crop"
    const [editTab, setEditTab] = useState("personal");
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [avatar, setAvatar] = useState(local.avatarUrl || null);
    const [sig, setSig] = useState(local.signature || null);
    const [cropSrc, setCropSrc] = useState(null);
    const [showSigPad, setShowSigPad] = useState(false);
    const avatarRef = useRef(null);
    const set_ = k => e => setForm(p=>({...p,[k]:e.target.value}));

    const name = `${local.firstName||""} ${local.lastName||""}`.trim() || local.email || "User";
    const ini  = [(local.firstName||"")[0],(local.lastName||"")[0]].filter(Boolean).join("").toUpperCase() || "U";

    const persist = async data => {
        setLocal(data); saveProfileLocal(data);
        try { const uid=profile?.id||user?.uid; if(uid) await update(ref(db,`users/${uid}`),data); } catch {}
    };

    const handleSave = async () => {
        setSaving(true);
        const updated = { ...local, ...form, avatarUrl:avatar, signature:sig };
        await persist(updated);
        setSaving(false); setSaved(true); setScreen("view"); setForm({});
        setTimeout(()=>setSaved(false), 2500);
    };

    const onAvatarFile = e => {
        const file=e.target.files?.[0]; if(!file) return;
        const r=new FileReader(); r.onload=ev=>{ setCropSrc(ev.target.result); setScreen("crop"); }; r.readAsDataURL(file);
        e.target.value="";
    };

    const onCropDone = async dataUrl => {
        setAvatar(dataUrl); setScreen("view");
        await persist({...local, avatarUrl:dataUrl});
    };

    const onSigSave = async s => {
        setSig(s); setShowSigPad(false);
        if (screen==="sig") setScreen("view");
        const updated = {...local, signature:s};
        await persist(updated);
    };

    const IS = { width:"100%",boxSizing:"border-box",padding:"10px 13px",borderRadius:10,border:`1.5px solid ${D?"#1f2937":"#e5e7eb"}`,background:D?"#1a1f2e":"#f9fafb",color:D?"#f1f5f9":"#111827",fontSize:13,outline:"none",transition:"border-color .2s" };
    const LS = { display:"block",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".6px",color:D?"#4b5563":"#9ca3af",marginBottom:5 };

    const SOCIALS = [
        { k:"facebook",  label:"Facebook",   ph:"https://facebook.com/username",   Icon:Facebook,  c:"#1877f2" },
        { k:"instagram", label:"Instagram",  ph:"@username or URL",                 Icon:Instagram, c:"#e1306c" },
        { k:"twitter",   label:"Twitter / X",ph:"@username",                        Icon:Twitter,   c:"#1da1f2" },
        { k:"linkedin",  label:"LinkedIn",   ph:"https://linkedin.com/in/username", Icon:Linkedin,  c:"#0a66c2" },
        { k:"website",   label:"Website",    ph:"https://yourwebsite.com",          Icon:Globe,     c:"#6366f1" },
    ];

    const Section = ({ title, children }) => (
        <div style={{ marginBottom:14 }}>
            <p style={{ margin:"0 0 8px",fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:".7px",color:D?"#374151":"#94a3b8" }}>{title}</p>
            {children}
        </div>
    );

    const InfoRow = ({ Icon, label, value, mono, accent="#6366f1" }) => (
        <div style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:12,background:D?"rgba(255,255,255,0.03)":"#f9fafb",border:`1px solid ${D?"#1f2937":"#f1f5f9"}`,marginBottom:8 }}>
            <div style={{ width:34,height:34,borderRadius:10,background:D?`rgba(99,102,241,0.1)`:"#eef2ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                <Icon size={15} color={accent}/>
            </div>
            <div style={{ minWidth:0,flex:1 }}>
                <p style={{ margin:0,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",color:D?"#4b5563":"#9ca3af" }}>{label}</p>
                <p style={{ margin:"2px 0 0",fontSize:13,fontWeight:600,color:D?"#e5e7eb":"#374151",wordBreak:"break-all",fontFamily:mono?"monospace":"inherit" }}>{value||"—"}</p>
            </div>
        </div>
    );

    const HEADER_TITLES = {
        view: { t:"My Profile",       s:`ID: ${local.id||user?.uid?.slice(0,14)||"—"}` },
        edit: { t:"Edit Profile",     s:"Update your information" },
        sig:  { t:"Digital Signature",s:"Draw or upload your signature" },
        crop: { t:"Crop Photo",       s:"Adjust your profile photo" },
    };

    return (
        <div style={{ position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.55)",backdropFilter:"blur(5px)",padding:16 }}>
            <div style={{ background:D?"#0d1117":"#ffffff",borderRadius:26,width:"100%",maxWidth:540,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:D?"0 40px 80px rgba(0,0,0,0.7)":"0 32px 80px rgba(0,0,0,0.18)",animation:"profileIn .3s cubic-bezier(.34,1.56,.64,1)" }}>

                {/* BANNER */}
                <div style={{ background:"linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#7c3aed 100%)",padding:"20px 24px 52px",position:"relative",overflow:"hidden",flexShrink:0 }}>
                    {[["120%","10%",180,.06],["-10%","60%",140,.05],["50%","110%",120,.07]].map(([l,t,s,o],i)=>(
                        <div key={i} style={{ position:"absolute",left:l,top:t,width:s,height:s,borderRadius:"50%",background:`rgba(255,255,255,${o})`,pointerEvents:"none" }}/>
                    ))}
                    <div style={{ position:"relative",zIndex:1,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                        <div>
                            <p style={{ margin:0,fontSize:17,fontWeight:800,color:"#fff" }}>{HEADER_TITLES[screen]?.t}</p>
                            <p style={{ margin:0,fontSize:11,color:"rgba(255,255,255,0.65)" }}>{HEADER_TITLES[screen]?.s}</p>
                        </div>
                        <div style={{ display:"flex",gap:8 }}>
                            {saved && <div style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:10,background:"rgba(34,197,94,0.2)",border:"1px solid rgba(34,197,94,0.3)" }}>
                                <CheckCircle2 size={13} color="#22c55e"/>
                                <span style={{ fontSize:11,fontWeight:700,color:"#22c55e" }}>Saved!</span>
                            </div>}
                            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.15)",border:"none",cursor:"pointer",width:32,height:32,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center" }}>
                                <X size={16} color="#fff"/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* AVATAR — always shown */}
                <div style={{ display:"flex",flexDirection:"column",alignItems:"center",marginTop:-44,position:"relative",zIndex:5,flexShrink:0,paddingBottom:2 }}>
                    <div style={{ position:"relative" }}>
                        <div style={{ width:88,height:88,borderRadius:"50%",border:`4px solid ${D?"#0d1117":"#fff"}`,overflow:"hidden",background:"linear-gradient(135deg,#2563eb,#6366f1)",boxShadow:"0 8px 32px rgba(0,0,0,0.25)",display:"flex",alignItems:"center",justifyContent:"center" }}>
                            {avatar?<img src={avatar} alt="avatar" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<span style={{ fontSize:30,fontWeight:800,color:"#fff" }}>{ini}</span>}
                        </div>
                        <button onClick={()=>avatarRef.current?.click()} style={{ position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:`3px solid ${D?"#0d1117":"#fff"}`,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(99,102,241,0.5)" }}>
                            <Camera size={13} color="#fff"/>
                        </button>
                        <input ref={avatarRef} type="file" accept="image/*" onChange={onAvatarFile} style={{ display:"none" }}/>
                    </div>
                    <p style={{ margin:"9px 0 2px",fontSize:17,fontWeight:800,color:D?"#f9fafb":"#111827" }}>{name}</p>
                    <div style={{ display:"flex",gap:6 }}>
                        <span style={{ fontSize:11,fontWeight:700,padding:"3px 12px",borderRadius:20,background:D?"rgba(99,102,241,0.15)":"#eef2ff",color:"#6366f1",textTransform:"capitalize" }}>{local.role||"staff"}</span>
                        {local.status==="Active"&&<span style={{ fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:"rgba(34,197,94,0.12)",color:"#22c55e" }}>● Active</span>}
                    </div>
                </div>

                {/* SCROLLABLE BODY */}
                <div style={{ flex:1,overflowY:"auto",padding:"14px 24px 24px" }}>

                    {/* ═══ VIEW SCREEN — lahat nakikita, walang tabs ═══ */}
                    {screen==="view" && (
                        <div style={{ display:"flex",flexDirection:"column",gap:0 }}>

                            {/* ── Personal Info ── */}
                            <Section title="Personal Information">
                                <InfoRow Icon={Hash}   label="User ID"    value={local.id||user?.uid||"—"} mono accent="#6366f1"/>
                                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                                    {[
                                        [Mail,   "Email",     local.email,   false],
                                        [Phone,  "Contact",   local.contact, false],
                                        [User,   "Age",       local.age?`${local.age} years old`:null, false],
                                        [User,   "Gender",    local.gender,  false],
                                        [User,   "Role",      local.role,    false],
                                        [MapPin, "Address 1", local.address1||local.address, false],
                                        [MapPin, "Address 2", local.address2, false],
                                    ].filter(([,,v])=>v).map(([Icon,label,val,mono])=>(
                                        <div key={label} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"11px 12px",borderRadius:12,background:D?"rgba(255,255,255,0.03)":"#f9fafb",border:`1px solid ${D?"#1f2937":"#f1f5f9"}` }}>
                                            <div style={{ width:30,height:30,borderRadius:9,background:D?"rgba(99,102,241,0.1)":"#eef2ff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                                                <Icon size={14} color="#6366f1"/>
                                            </div>
                                            <div style={{ minWidth:0 }}>
                                                <p style={{ margin:0,fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:".5px",color:D?"#4b5563":"#9ca3af" }}>{label}</p>
                                                <p style={{ margin:"2px 0 0",fontSize:12,fontWeight:600,color:D?"#e5e7eb":"#374151",wordBreak:"break-all",fontFamily:mono?"monospace":"inherit" }}>{val}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Section>

                            {/* ── Digital Signature ── */}
                            <Section title="Digital Signature">
                                {sig ? (
                                    <div>
                                        <div style={{ borderRadius:14,padding:14,background:"repeating-conic-gradient(#e5e7eb 0% 25%,#fff 0% 50%) 0 0/14px 14px",border:"1.5px solid #22c55e",display:"flex",alignItems:"center",justifyContent:"center",minHeight:80 }}>
                                            <img src={sig} alt="signature" style={{ maxWidth:"100%",maxHeight:72,objectFit:"contain" }}/>
                                        </div>
                                        <div style={{ display:"flex",gap:8,marginTop:8 }}>
                                            <button onClick={()=>setScreen("sig")} style={{ flex:1,padding:"9px 0",borderRadius:10,border:D?"1.5px solid #1f2937":"1.5px solid #e5e7eb",background:"transparent",color:D?"#e5e7eb":"#374151",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                                                <RefreshCw size={13}/> Update Signature
                                            </button>
                                            <button onClick={async()=>{ setSig(null); await persist({...local,signature:null}); }} style={{ padding:"9px 14px",borderRadius:10,border:"1.5px solid rgba(239,68,68,0.3)",background:"transparent",color:"#ef4444",cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
                                                <Trash2 size={13}/>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={()=>setScreen("sig")} style={{ width:"100%",padding:"11px 0",borderRadius:12,border:`1.5px dashed ${D?"#374151":"#e2e8f0"}`,background:"transparent",color:D?"#6b7280":"#9ca3af",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                                        <PenTool size={14}/> Add Digital Signature
                                    </button>
                                )}
                            </Section>

                            {/* ── Social Accounts ── */}
                            <Section title="Social Accounts">
                                {SOCIALS.filter(s=>local[s.k]).length===0 ? (
                                    <p style={{ fontSize:12,color:D?"#374151":"#d1d5db",fontStyle:"italic",margin:"4px 0 8px" }}>No social accounts added yet.</p>
                                ) : (
                                    <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:8 }}>
                                        {SOCIALS.filter(s=>local[s.k]).map(({k,label,Icon,c})=>(
                                            <a key={k} href={local[k]} target="_blank" rel="noreferrer"
                                                style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,background:`${c}14`,border:`1px solid ${c}30`,color:c,fontSize:12,fontWeight:700,textDecoration:"none" }}>
                                                <Icon size={13}/> {label}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </Section>

                            {/* ── Action Buttons ── */}
                            <div style={{ display:"flex",gap:10,marginTop:4 }}>
                                <button onClick={()=>{ setForm({...local}); setEditTab("personal"); setScreen("edit"); }} style={{ flex:1,padding:"13px 0",borderRadius:13,border:"none",background:"linear-gradient(135deg,#2563eb,#6366f1)",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 6px 20px rgba(37,99,235,0.35)" }}>
                                    <Edit3 size={14}/> Edit Profile
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ EDIT SCREEN ═══ */}
                    {screen==="edit" && (
                        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                            {/* Sub-tabs */}
                            <div style={{ display:"flex",background:D?"rgba(255,255,255,0.04)":"#f8fafc",borderRadius:10,padding:3,border:`1px solid ${D?"#1f2937":"#f1f5f9"}` }}>
                                {[{id:"personal",label:"👤 Personal Info"},{id:"social",label:"🔗 Social Links"}].map(t=>(
                                    <button key={t.id} onClick={()=>setEditTab(t.id)} style={{ flex:1,padding:"7px 0",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,transition:"all .2s",background:editTab===t.id?(D?"#1f2937":"#fff"):"transparent",color:editTab===t.id?(D?"#f1f5f9":"#111827"):(D?"#4b5563":"#9ca3af"),boxShadow:editTab===t.id?"0 2px 8px rgba(0,0,0,0.1)":"none" }}>{t.label}</button>
                                ))}
                            </div>

                            {editTab==="personal" && (
                                <>
                                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                                        {[["First Name","firstName"],["Last Name","lastName"]].map(([label,key])=>(
                                            <div key={key}>
                                                <label style={LS}>{label}</label>
                                                <input value={form[key]??local[key]??""} onChange={set_(key)} style={IS} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor=D?"#1f2937":"#e5e7eb"}/>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:10 }}>
                                        <div>
                                            <label style={LS}>Email</label>
                                            <input value={form.email??local.email??""} onChange={set_("email")} type="email" style={IS} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor=D?"#1f2937":"#e5e7eb"}/>
                                        </div>
                                        <div>
                                            <label style={LS}>Age</label>
                                            <input value={form.age??local.age??""} onChange={set_("age")} type="number" placeholder="—" style={IS} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor=D?"#1f2937":"#e5e7eb"}/>
                                        </div>
                                    </div>
                                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                                        <div>
                                            <label style={LS}>Contact / Phone</label>
                                            <input value={form.contact??local.contact??""} onChange={set_("contact")} placeholder="09XXXXXXXXX" style={IS} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor=D?"#1f2937":"#e5e7eb"}/>
                                        </div>
                                        <div>
                                            <label style={LS}>Gender</label>
                                            <select value={form.gender??local.gender??""} onChange={set_("gender")} style={{...IS,cursor:"pointer"}} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor=D?"#1f2937":"#e5e7eb"}>
                                                <option value="">Select</option>
                                                {["Male","Female","Other"].map(g=><option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={LS}>Address 1</label>
                                        <input value={form.address1??local.address1??local.address??""} onChange={set_("address1")} placeholder="Street, Barangay" style={IS} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor=D?"#1f2937":"#e5e7eb"}/>
                                    </div>
                                    <div>
                                        <label style={LS}>Address 2 <span style={{ fontWeight:400,textTransform:"none",color:D?"#374151":"#d1d5db" }}>(optional)</span></label>
                                        <input value={form.address2??local.address2??""} onChange={set_("address2")} placeholder="City, Province, ZIP" style={IS} onFocus={e=>e.target.style.borderColor="#6366f1"} onBlur={e=>e.target.style.borderColor=D?"#1f2937":"#e5e7eb"}/>
                                    </div>
                                </>
                            )}

                            {editTab==="social" && (
                                <>
                                    <p style={{ margin:"0 0 4px",fontSize:12,color:D?"#4b5563":"#9ca3af" }}>All fields are optional.</p>
                                    {SOCIALS.map(({k,label,ph,Icon,c})=>(
                                        <div key={k}>
                                            <label style={{ ...LS,display:"flex",alignItems:"center",gap:5 }}><Icon size={11} color={c}/>{label}</label>
                                            <div style={{ position:"relative" }}>
                                                <div style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:24,height:24,borderRadius:6,background:`${c}18`,display:"flex",alignItems:"center",justifyContent:"center" }}>
                                                    <Icon size={13} color={c}/>
                                                </div>
                                                <input value={form[k]??local[k]??""} onChange={set_(k)} placeholder={ph} style={{...IS,paddingLeft:44}} onFocus={e=>e.target.style.borderColor=c} onBlur={e=>e.target.style.borderColor=D?"#1f2937":"#e5e7eb"}/>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}

                            <div style={{ display:"flex",gap:10,marginTop:4 }}>
                                <button onClick={()=>{ setScreen("view"); setForm({}); }} style={{ flex:"0 0 90px",padding:"11px 0",borderRadius:12,border:`1.5px solid ${D?"#1f2937":"#e5e7eb"}`,background:"transparent",color:D?"#6b7280":"#9ca3af",fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
                                <button onClick={handleSave} disabled={saving} style={{ flex:1,padding:"11px 0",borderRadius:12,border:"none",background:saving?"rgba(99,99,99,.3)":"linear-gradient(135deg,#2563eb,#6366f1)",color:"#fff",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                                    {saving?<Loader size={14} style={{ animation:"spin .7s linear infinite" }}/>:<Save size={14}/>}
                                    {saving?"Saving...":"Save Changes"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ═══ SIGNATURE SCREEN ═══ */}
                    {screen==="sig" && (
                        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                            <button onClick={()=>setScreen("view")} style={{ alignSelf:"flex-start",display:"flex",alignItems:"center",gap:5,padding:"5px 10px",borderRadius:8,border:`1px solid ${D?"#1f2937":"#e5e7eb"}`,background:"transparent",color:D?"#9ca3af":"#6b7280",fontSize:12,cursor:"pointer" }}>
                                <ChevronLeft size={12}/> Back to Profile
                            </button>
                            <SignaturePad isDark={D} existingSig={sig} onSave={onSigSave}/>
                        </div>
                    )}

                    {/* ═══ CROP SCREEN ═══ */}
                    {screen==="crop" && cropSrc && (
                        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                            <p style={{ margin:0,fontSize:14,fontWeight:700,color:D?"#f9fafb":"#111827",textAlign:"center" }}>📷 Crop Profile Photo</p>
                            <ImageCropper imageSrc={cropSrc} onCrop={onCropDone} onCancel={()=>{ setScreen("view"); setCropSrc(null); }} D={D}/>
                        </div>
                    )}

                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg) } }
                @keyframes profileIn { from { opacity:0; transform: scale(0.93) translateY(16px) } to { opacity:1; transform: scale(1) translateY(0) } }
            `}</style>
        </div>
    );
}
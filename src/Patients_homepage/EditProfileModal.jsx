import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Check, AlertCircle, User, Edit3, Phone, Mail, MapPin, Droplets, Activity, Calendar } from "lucide-react";
import { usePatient } from "../context/PatientContext";

// ── Fixed Avatar Cropper ────────────────────────────────────────────────────
function AvatarCropper({ src, onConfirm, onCancel, isDark }) {
  const D = isDark;
  const containerSize = 240;
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale,  setScale]  = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const dragging = useRef(false);
  const last     = useRef({ x: 0, y: 0 });
  const imgRef   = useRef(null);

  // Auto-fit image to fill circle on load
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImgSize({ w: img.width, h: img.height });
      // Auto scale so shorter side fills the container
      const autoScale = containerSize / Math.min(img.width, img.height);
      setScale(autoScale);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  const renderedW = imgSize.w * scale;
  const renderedH = imgSize.h * scale;

  // Clamp offset so image always covers the circle
  const clamp = (val, min, max) => Math.min(Math.max(val, min), max);
  const clampedX = clamp(offset.x, -(renderedW - containerSize) / 2, (renderedW - containerSize) / 2);
  const clampedY = clamp(offset.y, -(renderedH - containerSize) / 2, (renderedH - containerSize) / 2);

  const onMouseDown = e => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  };
  const onMouseMove = e => {
    if (!dragging.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    setOffset(p => ({
      x: clamp(p.x + dx, -(renderedW - containerSize) / 2, (renderedW - containerSize) / 2),
      y: clamp(p.y + dy, -(renderedH - containerSize) / 2, (renderedH - containerSize) / 2),
    }));
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onMouseUp = () => { dragging.current = false; };

  // Touch support
  const onTouchStart = e => {
    dragging.current = true;
    last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchMove = e => {
    if (!dragging.current) return;
    const dx = e.touches[0].clientX - last.current.x;
    const dy = e.touches[0].clientY - last.current.y;
    setOffset(p => ({
      x: clamp(p.x + dx, -(renderedW - containerSize) / 2, (renderedW - containerSize) / 2),
      y: clamp(p.y + dy, -(renderedH - containerSize) / 2, (renderedH - containerSize) / 2),
    }));
    last.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleConfirm = () => {
    const size = 300;
    const canvas = document.createElement("canvas");
    canvas.width  = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // Scale factor between canvas output and preview container
      const factor = size / containerSize;
      const drawW  = renderedW * factor;
      const drawH  = renderedH * factor;
      const drawX  = (size - drawW) / 2 + clampedX * factor;
      const drawY  = (size - drawH) / 2 + clampedY * factor;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      canvas.toBlob(blob => onConfirm(blob), "image/jpeg", 0.92);
    };
    img.src = src;
  };

  const minScale = imgSize.w && imgSize.h
    ? containerSize / Math.min(imgSize.w, imgSize.h)
    : 0.5;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)" }}>
      <div style={{ background:D?"#1e293b":"#fff", borderRadius:28, padding:32, maxWidth:400, width:"calc(100% - 32px)", boxShadow:"0 40px 100px rgba(0,0,0,0.5)" }}>
        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <div>
            <p style={{ margin:0, fontSize:17, fontWeight:800, color:D?"#f1f5f9":"#0f172a" }}>Crop Photo</p>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"#64748b" }}>Drag to reposition · pinch or slider to zoom</p>
          </div>
          <button onClick={onCancel}
            style={{ width:32, height:32, borderRadius:"50%", border:`1px solid ${D?"#334155":"#e2e8f0"}`, background:D?"#0f172a":"#f8fafc", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={16} color="#64748b" />
          </button>
        </div>

        {/* Circle crop area */}
        <div style={{ display:"flex", justifyContent:"center", marginBottom:24 }}>
          <div style={{ position:"relative", width:containerSize, height:containerSize }}>
            {/* Outer dimmed ring */}
            <div style={{
              position:"absolute", inset:-20, borderRadius:"50%",
              background:"rgba(0,0,0,0.5)",
              clipPath:`path('M 0 0 L ${containerSize+40} 0 L ${containerSize+40} ${containerSize+40} L 0 ${containerSize+40} Z M 20 20 A ${containerSize/2} ${containerSize/2} 0 1 0 ${containerSize+20} ${containerSize+20} A ${containerSize/2} ${containerSize/2} 0 1 0 20 20')`,
              pointerEvents:"none", zIndex:2
            }} />
            {/* Circle border */}
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid #2563eb", zIndex:3, pointerEvents:"none", boxShadow:"0 0 0 4px rgba(37,99,235,0.2)" }} />
            {/* Draggable image area */}
            <div
              style={{ width:containerSize, height:containerSize, borderRadius:"50%", overflow:"hidden", cursor:"grab", background:"#000", userSelect:"none" }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onMouseUp}>
              {imgSize.w > 0 && (
                <img
                  ref={imgRef}
                  src={src}
                  draggable={false}
                  style={{
                    position:"absolute",
                    width: renderedW,
                    height: renderedH,
                    left: (containerSize - renderedW) / 2 + clampedX,
                    top:  (containerSize - renderedH) / 2 + clampedY,
                    userSelect:"none",
                    pointerEvents:"none",
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Zoom slider */}
        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".7px" }}>Zoom</label>
            <span style={{ fontSize:11, color:"#94a3b8" }}>{Math.round(scale * 100)}%</span>
          </div>
          <input type="range"
            min={minScale} max={minScale * 4} step="0.01"
            value={scale}
            onChange={e => {
              const newScale = parseFloat(e.target.value);
              setScale(newScale);
              // Re-clamp offset with new scale
              const newW = imgSize.w * newScale;
              const newH = imgSize.h * newScale;
              setOffset(p => ({
                x: clamp(p.x, -(newW - containerSize) / 2, (newW - containerSize) / 2),
                y: clamp(p.y, -(newH - containerSize) / 2, (newH - containerSize) / 2),
              }));
            }}
            style={{ width:"100%", accentColor:"#2563eb", height:6 }} />
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
            <span style={{ fontSize:10, color:"#94a3b8" }}>Fit</span>
            <span style={{ fontSize:10, color:"#94a3b8" }}>4×</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onCancel}
            style={{ flex:"0 0 100px", padding:"12px 0", borderRadius:13, border:`1.5px solid ${D?"#334155":"#e2e8f0"}`, background:D?"#0f172a":"#f8fafc", color:D?"#94a3b8":"#64748b", fontSize:13, fontWeight:600, cursor:"pointer" }}>
            Cancel
          </button>
          <button onClick={handleConfirm}
            style={{ flex:1, padding:"13px 0", borderRadius:13, border:"none", background:"linear-gradient(135deg,#1d4ed8,#0284c7)", color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:"0 6px 20px rgba(37,99,235,.4)" }}>
            <Check size={15} /> Use this photo
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Profile Modal ──────────────────────────────────────────────────────
export default function EditProfileModal({ onClose }) {
  const { patient, updateProfile, isDark } = usePatient();
  const D = isDark;

  const [form, setForm] = useState({
    firstName: patient.firstName  || "",
    lastName:  patient.lastName   || "",
    contact:   patient.contact    || "",
    email:     patient.email      || "",
    address:   patient.address    || "",
    gender:    patient.gender     || "",
    bloodType: patient.bloodType  || "",
    allergies: patient.allergies  || "",
    age:       patient.age        || "",
  });
  const [saving,        setSaving]        = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState(false);
  const [cropSrc,       setCropSrc]       = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(patient.avatarUrl || null);
  const [avatarBlob,    setAvatarBlob]    = useState(null);
  const fileRef = useRef(null);

  const set_ = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFileChange = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("File too large — max 5MB."); return; }
    setError("");
    const reader = new FileReader();
    reader.onload = ev => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = blob => {
    setAvatarBlob(blob);
    setAvatarPreview(URL.createObjectURL(blob));
    setCropSrc(null);
  };

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true); setError(""); setSuccess(false);
    try {
      let avatarUrl = patient.avatarUrl || null;
      if (avatarBlob) {
        try {
          const { ref: sRef, uploadBytes, getDownloadURL } = await import("firebase/storage");
          const { storage } = await import("../context/firebase");
          const path = `avatars/${patient.id || patient.patientId}_${Date.now()}.jpg`;
          await uploadBytes(sRef(storage, path), avatarBlob);
          avatarUrl = await getDownloadURL(sRef(storage, path));
        } catch {
          avatarUrl = avatarPreview; // base64 fallback
        }
      }
      await updateProfile({ ...form, avatarUrl });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1000);
    } catch (err) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.firstName?.[0] || "") + (form.lastName?.[0] || "");
  const BLOOD_TYPES = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
  const GENDERS     = ["Male","Female","Non-binary","Prefer not to say"];

  const inputStyle = {
    width:"100%", boxSizing:"border-box",
    background:D?"#0f172a":"#f8fafc",
    border:`1.5px solid ${D?"#334155":"#e2e8f0"}`,
    borderRadius:11, padding:"11px 14px",
    fontSize:13, color:D?"#e2e8f0":"#0f172a",
    outline:"none", fontFamily:"inherit", transition:"border-color .2s",
  };
  const labelStyle = {
    display:"block", fontSize:10, fontWeight:700,
    textTransform:"uppercase", letterSpacing:".8px",
    marginBottom:6, color:"#64748b",
  };
  const Section = ({ title }) => (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"20px 0 12px" }}>
      <div style={{ height:1, flex:1, background:D?"#1e293b":"#f1f5f9" }} />
      <span style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color:"#94a3b8", whiteSpace:"nowrap" }}>{title}</span>
      <div style={{ height:1, flex:1, background:D?"#1e293b":"#f1f5f9" }} />
    </div>
  );

  return (
    <>
      {cropSrc && (
        <AvatarCropper
          src={cropSrc} isDark={D}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropSrc(null); if (fileRef.current) fileRef.current.value = ""; }}
        />
      )}

      <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.6)", backdropFilter:"blur(6px)", padding:16 }}>
        <div style={{ background:D?"#1e293b":"#fff", borderRadius:28, width:"100%", maxWidth:540, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 40px 100px rgba(0,0,0,0.4)", animation:"modalIn .25s ease" }}>

          {/* Gradient header */}
          <div style={{ background:"linear-gradient(135deg,#1e3a8a,#1d4ed8,#0284c7)", padding:"24px 24px 60px", position:"relative", overflow:"hidden" }}>
            {/* Decorative circles */}
            {[[-20,200,160,0.07],[60,-30,120,0.06],[200,100,100,0.05]].map(([t,l,s,o],i)=>
              <div key={i} style={{ position:"absolute", top:t, left:l, width:s, height:s, borderRadius:"50%", background:`rgba(255,255,255,${o})`, pointerEvents:"none" }} />
            )}
            <div style={{ position:"relative", zIndex:1, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <p style={{ margin:0, fontSize:18, fontWeight:800, color:"#fff" }}>Edit Profile</p>
                <p style={{ margin:"3px 0 0", fontSize:12, color:"rgba(255,255,255,.65)" }}>Update your personal information</p>
              </div>
              <button onClick={onClose}
                style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", width:34, height:34, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)" }}>
                <X size={16} color="#fff" />
              </button>
            </div>
          </div>

          {/* Avatar — overlapping the gradient */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginTop:-48, marginBottom:8, position:"relative", zIndex:5 }}>
            <div style={{ position:"relative" }}>
              <div style={{ width:96, height:96, borderRadius:"50%", border:`4px solid ${D?"#1e293b":"#fff"}`, boxShadow:"0 8px 32px rgba(0,0,0,0.2)", overflow:"hidden", background:"linear-gradient(135deg,#1d4ed8,#0284c7)" }}>
                {avatarPreview
                  ? <img src={avatarPreview} alt="avatar" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, fontWeight:800, color:"#fff" }}>{initials}</div>
                }
              </div>
              <button onClick={() => fileRef.current?.click()}
                style={{ position:"absolute", bottom:2, right:2, width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#0284c7)", border:`3px solid ${D?"#1e293b":"#fff"}`, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(37,99,235,.4)" }}>
                <Camera size={13} color="#fff" />
              </button>
            </div>
            <button onClick={() => fileRef.current?.click()}
              style={{ marginTop:8, fontSize:12, color:"#2563eb", fontWeight:700, background:"none", border:"none", cursor:"pointer" }}>
              Change Photo
            </button>
            <p style={{ margin:"2px 0 0", fontSize:10, color:"#94a3b8" }}>JPG, PNG or WebP · max 5MB</p>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display:"none" }} onChange={handleFileChange} />
          </div>

          {/* Form */}
          <div style={{ padding:"0 24px 24px" }}>
            {error && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:11, background:"rgba(239,68,68,.07)", border:"1px solid rgba(239,68,68,.2)", color:"#ef4444", fontSize:12, marginBottom:14 }}>
                <AlertCircle size={13} />{error}
              </div>
            )}

            <Section title="Personal Information" />
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { key:"firstName", label:"First Name *", placeholder:"First name", type:"text" },
                { key:"lastName",  label:"Last Name *",  placeholder:"Last name",  type:"text" },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  <input type={f.type} value={form[f.key]} onChange={set_(f.key)} style={inputStyle} placeholder={f.placeholder}
                    onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor=D?"#334155":"#e2e8f0"} />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Age</label>
                <input type="number" value={form.age} onChange={set_("age")} style={inputStyle} placeholder="Age" min="0" max="150"
                  onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor=D?"#334155":"#e2e8f0"} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <select value={form.gender} onChange={set_("gender")} style={{ ...inputStyle, cursor:"pointer" }}>
                  <option value="">Select…</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Blood Type</label>
                <select value={form.bloodType} onChange={set_("bloodType")} style={{ ...inputStyle, cursor:"pointer" }}>
                  <option value="">Select…</option>
                  {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Allergies</label>
                <input value={form.allergies} onChange={set_("allergies")} style={inputStyle} placeholder="e.g. Penicillin, Aspirin"
                  onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor=D?"#334155":"#e2e8f0"} />
              </div>
            </div>

            <Section title="Contact Information" />
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input value={form.contact} onChange={set_("contact")} style={inputStyle} placeholder="+63 9XX XXX XXXX"
                  onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor=D?"#334155":"#e2e8f0"} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={form.email} onChange={set_("email")} style={inputStyle} placeholder="email@example.com"
                  onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor=D?"#334155":"#e2e8f0"} />
              </div>
              <div>
                <label style={labelStyle}>Address</label>
                <textarea value={form.address} onChange={set_("address")} rows={2}
                  style={{ ...inputStyle, resize:"none", lineHeight:1.6 }} placeholder="Home address…"
                  onFocus={e=>e.target.style.borderColor="#2563eb"} onBlur={e=>e.target.style.borderColor=D?"#334155":"#e2e8f0"} />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              <button onClick={onClose}
                style={{ flex:"0 0 110px", padding:"13px 0", borderRadius:13, border:`1.5px solid ${D?"#334155":"#e2e8f0"}`, background:D?"#0f172a":"#f8fafc", color:D?"#94a3b8":"#64748b", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving||success}
                style={{ flex:1, padding:"13px 0", borderRadius:13, border:"none", background:success?"linear-gradient(135deg,#059669,#10b981)":saving?"rgba(99,99,99,.3)":"linear-gradient(135deg,#1d4ed8,#0284c7)", color:"#fff", fontSize:13, fontWeight:700, cursor:saving?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:saving||success?"none":"0 6px 24px rgba(37,99,235,.4)", transition:"all .3s" }}>
                {success
                  ? <><Check size={15} /> Saved!</>
                  : saving
                  ? <><div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", animation:"spin .7s linear infinite" }} />Saving…</>
                  : <><Check size={14} /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
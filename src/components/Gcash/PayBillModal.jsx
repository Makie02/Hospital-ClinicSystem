// ══════════════════════════════════════════════════════════════════════════════
//  PATCH — PatientDashboard.jsx
//  Hanapin ang "function PayBillModal" sa iyong file at PALITAN ng code sa ibaba.
//  Lahat ng ibang bahagi ng PatientDashboard ay hindi binabago.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Brand Icons (ilagay BAGO ang function PayBillModal) ─────────────────────
const BRAND_ICON_MAP = {
  gcash: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#007DFE"/>
      <circle cx="18" cy="18" r="9" fill="none" stroke="white" strokeWidth="2.2"/>
      <path d="M18 13v5h5" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
      <rect x="19.5" y="18" width="4" height="4" rx="1" fill="#00C2FF"/>
    </svg>
  ),
  maya: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#00A94F"/>
      <path d="M10 26L18 11L26 26H10Z" fill="white"/>
      <circle cx="18" cy="21" r="3" fill="#00A94F"/>
      <circle cx="18" cy="21" r="1.8" fill="white"/>
    </svg>
  ),
  bdo: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#CC0000"/>
      <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Arial">BDO</text>
    </svg>
  ),
  bpi: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#E30613"/>
      <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial">BPI</text>
    </svg>
  ),
  unionbank: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#001F6B"/>
      <rect x="7" y="11" width="22" height="3" rx="1.5" fill="#FFD700"/>
      <rect x="7" y="16.5" width="22" height="3" rx="1.5" fill="white"/>
      <rect x="7" y="22" width="22" height="3" rx="1.5" fill="#FFD700"/>
    </svg>
  ),
  metrobank: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#003087"/>
      <text x="50%" y="42%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">METRO</text>
      <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fill="#FFD700" fontSize="8" fontWeight="bold" fontFamily="Arial">BANK</text>
    </svg>
  ),
  landbank: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#006400"/>
      <path d="M18 8L27 21H9L18 8Z" fill="#FFD700"/>
      <rect x="13" y="21" width="10" height="7" rx="1" fill="white"/>
    </svg>
  ),
  rcbc: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#D4A017"/>
      <text x="50%" y="57%" dominantBaseline="middle" textAnchor="middle" fill="#003087" fontSize="11" fontWeight="bold" fontFamily="Arial">RCBC</text>
    </svg>
  ),
  securitybank: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#1A1A2E"/>
      <path d="M18 9L26 14.5V20C26 24.4 22.4 28 18 28C13.6 28 10 24.4 10 20V14.5L18 9Z" fill="#00C9A7" opacity="0.9"/>
      <path d="M14.5 20L17 22.5L22 17" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  other: (
    <svg viewBox="0 0 36 36" width="36" height="36" fill="none">
      <rect width="36" height="36" rx="9" fill="#64748b"/>
      <rect x="6" y="18" width="24" height="11" rx="2" fill="white" opacity="0.9"/>
      <path d="M6 18L18 9L30 18H6Z" fill="white" opacity="0.6"/>
    </svg>
  ),
};

// Methods na nangangailangan ng reference number
const PAY_REF_METHODS = ["GCash", "Maya", "Bank Transfer"];
const PAY_REF_CFG = {
  GCash:           { label: "GCash Reference Number",           hint: "13-digit ref — GCash app → Activity → tap transaction → Reference No.", placeholder: "e.g. 1234567890123",      color: "#007DFE", emoji: "📱" },
  Maya:            { label: "Maya Reference Number",            hint: "Maya app → Transaction History → Reference No.",                         placeholder: "e.g. MAYA-2025-XXXXXXXX", color: "#00A94F", emoji: "💙" },
  "Bank Transfer": { label: "Bank Transfer Trace / Ref Number", hint: "Found on bank receipt, deposit slip, or online banking.",                 placeholder: "e.g. 0123456789",         color: "#7c3aed", emoji: "🏦" },
};

// ─── PayBillModal ─────────────────────────────────────────────────────────────
function PayBillModal({ bill, onClose, onSuccess }) {
    const { t } = useLang();
    const balance = Math.max(0, (+bill.total || 0) - (+bill.amountPaid || 0));

    const [amount, setAmount]       = useState(String(balance));
    const [method, setMethod]       = useState("Cash");
    const [refNum, setRefNum]       = useState("");
    const [selWallet, setSelWallet] = useState(null);  // selected e-wallet entry from Firebase
    const [ewallets, setEwallets]   = useState([]);    // fetched from settings/billing/banks
    const [loadingWallets, setLoadingWallets] = useState(true);
    const [paying, setPaying]       = useState(false);
    const [error, setError]         = useState("");

    // ── Fetch clinic's e-wallet/bank settings ─────────────────────────────────
    useEffect(() => {
        const unsub = onValue(ref(db, "settings/billing/banks"), (snap) => {
            const data = snap.val();
            if (!data) { setEwallets([]); setLoadingWallets(false); return; }
            setEwallets(
                Object.entries(data)
                    .map(([id, v]) => ({ id, ...v }))
                    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
            );
            setLoadingWallets(false);
        });
        return () => unsub();
    }, []);

    const needsRef     = PAY_REF_METHODS.includes(method);
    const refCfg       = PAY_REF_CFG[method] || null;

    // filter matching e-wallets for current method
    const matchingWallets = ewallets.filter(e => {
        const bt = (e.bankType || "").toLowerCase();
        if (method === "GCash")         return bt === "gcash";
        if (method === "Maya")          return bt === "maya";
        if (method === "Bank Transfer") return ["bdo","bpi","unionbank","metrobank","landbank","rcbc","securitybank","other"].includes(bt);
        return false;
    });

    const handleMethodChange = (m) => {
        setMethod(m);
        setRefNum("");
        setSelWallet(null);
        setError("");
    };

    const handlePay = async () => {
        setError("");
        const num = parseFloat(amount);
        if (!amount || isNaN(num) || num <= 0) {
            setError(t.errPayAmount || "Please enter a valid amount.");
            return;
        }
        if (num > balance + 0.001) {
            setError(t.errPayMax ? t.errPayMax(fmtPeso(balance)) : `Amount exceeds balance of ${fmtPeso(balance)}`);
            return;
        }
        if (needsRef && !refNum.trim()) {
            setError(`Please enter the ${refCfg.label} before proceeding.`);
            return;
        }
        setPaying(true);
        try {
            const newAmountPaid = (+bill.amountPaid || 0) + num;
            const newStatus     = newAmountPaid >= +bill.total ? "Paid" : "Partial";
            await update(ref(db, `bills/${bill.id}`), {
                amountPaid:          newAmountPaid,
                status:              newStatus,
                updatedAt:           Date.now(),
                lastPaymentMethod:   method,
                lastPaymentAt:       Date.now(),
                ...(refNum.trim() ? { lastReferenceNumber: refNum.trim() } : {}),
            });
            onSuccess({ amount: num, method, refNum: refNum.trim(), newStatus });
        } catch {
            setError(t.errPaySave || "Failed to save payment. Please try again.");
        } finally {
            setPaying(false);
        }
    };

    const ALL_METHODS = ["Cash", "GCash", "Maya", "Bank Transfer", "Credit Card", "Debit Card", "PhilHealth", "HMO", "Insurance", "Other"];
    const METHOD_EMOJI = { Cash:"💵", GCash:"📱", Maya:"💙", "Bank Transfer":"🏦", "Credit Card":"💳", "Debit Card":"🏧", PhilHealth:"🏥", HMO:"🏢", Insurance:"🛡️", Other:"💰" };

    const labelStyle  = { display:"block", fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".7px", marginBottom:6, color:"#64748b" };
    const inputStyle  = { width:"100%", boxSizing:"border-box", background:"#f8fafc", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"11px 14px", fontSize:13, color:"#0f172a", outline:"none", fontFamily:"inherit", transition:"border-color .2s" };

    return (
        <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", padding:16 }}>
            <div style={{ background:"#fff", borderRadius:24, width:"100%", maxWidth:460, boxShadow:"0 32px 80px rgba(0,0,0,0.3)", overflow:"hidden", animation:"modalIn .25s ease", maxHeight:"92vh", display:"flex", flexDirection:"column" }}>

                {/* ── Header ── */}
                <div style={{ background:"linear-gradient(135deg,#92400e,#d97706,#f59e0b)", padding:"18px 22px", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
                    <div style={{ width:38, height:38, borderRadius:12, background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <CreditCard size={18} color="#fff" />
                    </div>
                    <div style={{ flex:1 }}>
                        <p style={{ margin:0, fontSize:15, fontWeight:800, color:"#fff" }}>{t.payModalTitle || "Pay Bill"}</p>
                        <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,.75)" }}>
                            {bill.billId}{bill.service ? ` · ${bill.service}` : ""}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none", cursor:"pointer", width:32, height:32, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <X size={16} color="#fff" />
                    </button>
                </div>

                {/* ── Scrollable body ── */}
                <div style={{ overflowY:"auto", flex:1, padding:"18px 22px", display:"flex", flexDirection:"column", gap:14 }}>

                    {/* Bill summary */}
                    <div style={{ background:"linear-gradient(135deg,#fffbeb,#fef3c7)", border:"1px solid #fde68a", borderRadius:14, padding:"12px 16px" }}>
                        {[
                            [t.totalBillLabel  || "Total Bill",   fmtPeso(bill.total || 0)],
                            [t.amountPaidLabel || "Amount Paid",  fmtPeso(bill.amountPaid || 0)],
                            [t.balanceRemLabel || "Balance Due",   fmtPeso(balance)],
                        ].map(([label, val], i) => (
                            <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom: i < 2 ? "1px solid rgba(217,119,6,.15)" : "none" }}>
                                <span style={{ fontSize:12, color:"#92400e" }}>{label}</span>
                                <span style={{ fontSize: i===2?16:13, fontWeight: i===2?800:600, color: i===2?"#d97706":"#0f172a" }}>{val}</span>
                            </div>
                        ))}
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", borderRadius:11, background:"rgba(239,68,68,.07)", border:"1px solid rgba(239,68,68,.2)", color:"#ef4444", fontSize:12 }}>
                            <AlertCircle size={13}/>{error}
                        </div>
                    )}

                    {/* Amount input */}
                    <div>
                        <label style={labelStyle}>{t.payAmountLabel || "Amount to Pay (₱)"}</label>
                        <div style={{ position:"relative" }}>
                            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, fontWeight:700, color:"#d97706" }}>₱</span>
                            <input
                                type="number" value={amount} onChange={e=>setAmount(e.target.value)}
                                min="0" max={balance} step="0.01"
                                style={{ ...inputStyle, padding:"11px 14px 11px 30px", fontSize:16, fontWeight:700 }}
                                onFocus={e=>e.target.style.borderColor="#d97706"}
                                onBlur={e=>e.target.style.borderColor="#e2e8f0"}
                            />
                        </div>
                        <div style={{ display:"flex", gap:6, marginTop:7, flexWrap:"wrap" }}>
                            {[balance, balance*0.75, balance*0.5].filter(v=>v>0).map((v,i)=>(
                                <button key={i} type="button" onClick={()=>setAmount(String(Math.round(v*100)/100))}
                                    style={{ padding:"4px 9px", borderRadius:8, border:"1px solid #fde68a", background:"#fffbeb", color:"#92400e", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                                    {i===0?(t.fullBtn||"Full"):i===1?"75%":"50%"} ({fmtPeso(Math.round(v*100)/100)})
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payment method picker */}
                    <div>
                        <label style={labelStyle}>{t.payMethodLabel || "Payment Method"}</label>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                            {ALL_METHODS.map(m => (
                                <button key={m} type="button" onClick={()=>handleMethodChange(m)}
                                    style={{ padding:"7px 12px", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:600, transition:"all .15s", border:`1.5px solid ${method===m?"#d97706":"#e2e8f0"}`, background:method===m?"linear-gradient(135deg,#d97706,#f59e0b)":"#f8fafc", color:method===m?"#fff":"#64748b" }}>
                                    {METHOD_EMOJI[m]||"💳"} {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ✅ E-WALLET SECTION: Matching accounts from Firebase */}
                    {needsRef && (
                        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                            {/* Header label */}
                            <label style={labelStyle}>
                                {method === "Bank Transfer" ? "Select Bank Account" : `Pay via ${method}`}
                            </label>

                            {loadingWallets ? (
                                <div style={{ padding:"16px 0", textAlign:"center" }}>
                                    <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid #e2e8f0", borderTopColor:"#d97706", animation:"spin .6s linear infinite", margin:"0 auto" }}/>
                                </div>
                            ) : matchingWallets.length > 0 ? (
                                <>
                                    {/* Wallet cards — clickable */}
                                    {matchingWallets.map(w => {
                                        const isSelected = selWallet?.id === w.id;
                                        const detail     = w.number || w.account || w.bankname || "";
                                        const icon       = BRAND_ICON_MAP[w.bankType] || BRAND_ICON_MAP.other;
                                        return (
                                            <div
                                                key={w.id}
                                                onClick={() => setSelWallet(isSelected ? null : w)}
                                                style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:14, cursor:"pointer", border:`2px solid ${isSelected?"#d97706":"#f1f5f9"}`, background:isSelected?"#fffbeb":"#fafafa", transition:"all .15s" }}
                                            >
                                                {/* Brand icon */}
                                                <div style={{ flexShrink:0 }}>{icon}</div>

                                                {/* Account details */}
                                                <div style={{ flex:1, minWidth:0 }}>
                                                    <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#0f172a" }}>{w.label || w.bankType}</p>
                                                    <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748b", fontFamily:"monospace" }}>
                                                        {detail}{w.name ? ` · ${w.name}` : ""}
                                                    </p>
                                                </div>

                                                {/* QR thumbnail */}
                                                {w.qr && (
                                                    <img src={w.qr} alt="QR"
                                                        style={{ width:44, height:44, objectFit:"contain", borderRadius:8, border:"1px solid #f1f5f9", flexShrink:0 }}/>
                                                )}

                                                {isSelected && (
                                                    <span style={{ fontSize:18, color:"#d97706", flexShrink:0 }}>✓</span>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Full QR display when wallet selected */}
                                    {selWallet?.qr && (
                                        <div style={{ padding:"16px", borderRadius:14, background:"#f8fafc", border:"1px solid #f1f5f9", display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                                            <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#0f172a" }}>
                                                Scan QR Code to Pay via {selWallet.label || selWallet.bankType}
                                            </p>
                                            <img src={selWallet.qr} alt="QR Code"
                                                style={{ width:180, height:180, objectFit:"contain", borderRadius:12, border:"2px solid #e2e8f0" }}/>
                                            <div style={{ textAlign:"center" }}>
                                                <p style={{ margin:0, fontSize:12, fontWeight:700, color:"#0f172a" }}>
                                                    {selWallet.number || selWallet.account || ""}
                                                </p>
                                                {selWallet.name && (
                                                    <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748b" }}>{selWallet.name}</p>
                                                )}
                                            </div>
                                            <p style={{ margin:0, fontSize:11, color:"#94a3b8", textAlign:"center" }}>
                                                After payment, enter the reference number below ↓
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // No wallets configured — show info banner
                                <div style={{ padding:"12px 14px", borderRadius:12, background:"rgba(245,158,11,.07)", border:"1px solid rgba(245,158,11,.2)", fontSize:12, color:"#92400e" }}>
                                    ℹ️ No {method} account configured by the clinic yet. You may still proceed and enter your reference number manually.
                                </div>
                            )}

                            {/* Reference number input */}
                            {refCfg && (
                                <div style={{ padding:"12px 14px", borderRadius:14, background:`${refCfg.color}08`, border:`1.5px solid ${refCfg.color}30`, display:"flex", flexDirection:"column", gap:8 }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                        <span style={{ fontSize:20 }}>{refCfg.emoji}</span>
                                        <div>
                                            <p style={{ margin:0, fontSize:13, fontWeight:700, color:refCfg.color }}>{refCfg.label}</p>
                                            <p style={{ margin:"2px 0 0", fontSize:11, color:"#64748b" }}>{refCfg.hint}</p>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={refNum}
                                        onChange={e=>setRefNum(e.target.value)}
                                        placeholder={refCfg.placeholder}
                                        style={{ ...inputStyle, fontFamily:"monospace", letterSpacing:"0.5px", borderColor: refNum.trim() ? refCfg.color : "#e2e8f0" }}
                                        onFocus={e=>e.target.style.borderColor=refCfg.color}
                                        onBlur={e=>e.target.style.borderColor=refNum.trim()?refCfg.color:"#e2e8f0"}
                                    />
                                    {refNum.trim()
                                        ? <p style={{ margin:0, fontSize:11, fontWeight:600, color:"#22c55e" }}>✓ Reference number entered</p>
                                        : <p style={{ margin:0, fontSize:11, fontWeight:600, color:"#f97316" }}>⚠ Required for {method} payments</p>
                                    }
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer buttons ── */}
                <div style={{ padding:"0 22px 18px", display:"flex", gap:10, flexShrink:0 }}>
                    <button onClick={onClose}
                        style={{ flex:"0 0 90px", padding:"11px 0", borderRadius:12, border:"1.5px solid #e2e8f0", background:"#f8fafc", color:"#64748b", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                        {t.cancelBtn || "Cancel"}
                    </button>
                    <button onClick={handlePay} disabled={paying}
                        style={{ flex:1, padding:"12px 0", borderRadius:12, border:"none", background:paying?"rgba(99,99,99,.3)":"linear-gradient(135deg,#d97706,#f59e0b)", color:"#fff", fontSize:13, fontWeight:700, cursor:paying?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, boxShadow:paying?"none":"0 6px 20px rgba(217,119,6,.35)" }}>
                        {paying
                            ? <><div style={{ width:14, height:14, borderRadius:"50%", border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", animation:"spin .7s linear infinite" }}/>{t.processingText||"Processing..."}</>
                            : <><CreditCard size={14}/>{t.payNowBtn||"Pay Now"}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════════════
//  Sa Billing_ function, i-update din ang onSuccess callback:
//
//   onSuccess={({ amount, method, refNum, newStatus }) => {
//       setPayingBill(null);
//       showToast(
//           t.payModalTitle || "Payment Recorded!",
//           `${fmtPeso(amount)} via ${method}${refNum ? ` · Ref: ${refNum}` : ""} — ${newStatus}`
//       );
//   }}
// ══════════════════════════════════════════════════════════════════════════════
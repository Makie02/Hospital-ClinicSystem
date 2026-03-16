// src/components/PrintReceipt.jsx
// Usage: <PrintReceipt bill={billObject} clinicInfo={...} onClose={fn} />
import React, { useRef } from "react";

const fmtDate  = (s) => s ? new Date(s+"T00:00:00").toLocaleDateString("en-PH",{ month:"long", day:"numeric", year:"numeric" }) : "—";
const fmtTs    = (ts) => ts ? new Date(ts).toLocaleDateString("en-PH",{ month:"long", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "—";
const fmtPeso  = (n) => `₱${Number(n||0).toLocaleString("en-PH",{ minimumFractionDigits:2 })}`;
const calcItem = (item) => (+item.price||0)*(+item.qty||1)*(1-((+item.discount||0)/100));

const DEFAULT_CLINIC = {
  name: "MediCore Clinic",
  address: "Clinic Address, City, Province",
  contact: "+63 XXX XXX XXXX",
  email: "clinic@medicore.ph",
  tin: "000-000-000-000",
};

export default function PrintReceipt({ bill, clinicInfo, onClose }) {
  const printRef = useRef(null);
  if (!bill) return null;

  const clinic = { ...DEFAULT_CLINIC, ...clinicInfo };
  const items  = bill.items || [];
  const total  = +bill.total || items.reduce((s,i)=>s+calcItem(i),0);
  const paid   = +bill.amountPaid || 0;
  const balance= Math.max(0, total - paid);
  const change = paid > total ? paid - total : 0;

  const STATUS_COLOR = {
    Paid:      "#22c55e",
    Unpaid:    "#f59e0b",
    Partial:   "#3b82f6",
    Cancelled: "#ef4444",
    Refunded:  "#a78bfa",
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=800,height=900");
    const content = printRef.current.innerHTML;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt — ${bill.billId || "Bill"}</title>
          <style>
            * { margin:0; padding:0; box-sizing:border-box; }
            body { font-family:'Segoe UI',Arial,sans-serif; background:#fff; color:#1e293b; }
            .receipt { width:100%; max-width:420px; margin:0 auto; padding:32px 28px; }
            .clinic-name { font-size:22px; font-weight:800; color:#1e293b; text-align:center; }
            .clinic-sub  { font-size:12px; color:#64748b; text-align:center; line-height:1.8; }
            .divider     { border:none; border-top:1px dashed #cbd5e1; margin:16px 0; }
            .divider-solid{ border:none; border-top:2px solid #1e293b; margin:16px 0; }
            .row         { display:flex; justify-content:space-between; align-items:flex-start; margin:5px 0; }
            .label       { font-size:11px; color:#64748b; }
            .value       { font-size:12px; font-weight:600; color:#1e293b; text-align:right; }
            .section-title{ font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; margin:12px 0 6px; }
            .item-row    { padding:6px 0; border-bottom:1px dotted #f1f5f9; }
            .item-name   { font-size:13px; font-weight:600; color:#0f172a; }
            .item-detail { font-size:11px; color:#64748b; }
            .total-row   { display:flex; justify-content:space-between; padding:5px 0; }
            .total-label { font-size:13px; color:#475569; }
            .total-value { font-size:13px; font-weight:700; color:#0f172a; }
            .grand-total { font-size:18px; font-weight:800; color:#2563eb; }
            .balance     { color:#f59e0b; }
            .paid-stamp  { text-align:center; margin:16px 0; }
            .paid-box    { display:inline-block; padding:8px 24px; border:3px solid #22c55e; border-radius:8px; font-size:20px; font-weight:900; color:#22c55e; letter-spacing:4px; transform:rotate(-5deg); }
            .unpaid-box  { display:inline-block; padding:8px 24px; border:3px solid #f59e0b; border-radius:8px; font-size:20px; font-weight:900; color:#f59e0b; letter-spacing:4px; transform:rotate(-5deg); }
            .footer      { text-align:center; font-size:11px; color:#94a3b8; margin-top:20px; line-height:1.8; }
            .bill-id     { font-family:monospace; font-size:12px; color:#64748b; }
            @media print {
              body { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">${content}</div>
          <script>window.onload=()=>{ window.print(); window.onafterprint=()=>window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:16, background:"rgba(0,0,0,0.75)", backdropFilter:"blur(10px)" }}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ display:"flex", flexDirection:"column", gap:12, maxHeight:"95vh", overflow:"hidden" }}>

        {/* Action buttons */}
        <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={handlePrint} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 22px", borderRadius:12, border:"none", cursor:"pointer", background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"white", fontSize:13, fontWeight:700, boxShadow:"0 6px 20px rgba(37,99,235,0.4)" }}>
            🖨️ Print Receipt
          </button>
          <button onClick={onClose} style={{ padding:"10px 18px", borderRadius:12, border:"1px solid rgba(255,255,255,0.2)", cursor:"pointer", background:"rgba(255,255,255,0.1)", color:"white", fontSize:13, fontWeight:600 }}>
            ✕ Close
          </button>
        </div>

        {/* Receipt Preview */}
        <div style={{ overflowY:"auto", borderRadius:16, boxShadow:"0 32px 80px rgba(0,0,0,0.5)" }}>
          <div ref={printRef} style={{ width:420, background:"#fff", padding:"32px 28px", fontFamily:"'Segoe UI',Arial,sans-serif", color:"#1e293b" }}>

            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:16 }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#1e293b", marginBottom:4 }}>{clinic.name}</div>
              <div style={{ fontSize:12, color:"#64748b", lineHeight:1.8 }}>
                {clinic.address}<br/>
                📞 {clinic.contact} · ✉ {clinic.email}<br/>
                TIN: {clinic.tin}
              </div>
            </div>

            <hr style={{ border:"none", borderTop:"2px solid #1e293b", margin:"16px 0" }}/>

            {/* Receipt title + Bill ID */}
            <div style={{ textAlign:"center", marginBottom:12 }}>
              <div style={{ fontSize:16, fontWeight:800, letterSpacing:2, textTransform:"uppercase", color:"#0f172a" }}>Official Receipt</div>
              <div style={{ fontFamily:"monospace", fontSize:12, color:"#64748b", marginTop:4 }}>
                {bill.billId} · {fmtDate(bill.date)}
              </div>
            </div>

            <hr style={{ border:"none", borderTop:"1px dashed #cbd5e1", margin:"12px 0" }}/>

            {/* Patient & Doctor */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#94a3b8", marginBottom:6 }}>Patient Information</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:11, color:"#64748b" }}>Patient Name</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#0f172a" }}>{bill.patientName || "—"}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:11, color:"#64748b" }}>Attending Doctor</span>
                <span style={{ fontSize:12, fontWeight:600, color:"#0f172a" }}>{bill.doctor || "—"}</span>
              </div>
            </div>

            <hr style={{ border:"none", borderTop:"1px dashed #cbd5e1", margin:"12px 0" }}/>

            {/* Items */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:1, color:"#94a3b8", marginBottom:8 }}>Services Rendered</div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:10, fontWeight:700, color:"#94a3b8", flex:3 }}>DESCRIPTION</span>
                <span style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textAlign:"center", flex:1 }}>QTY</span>
                <span style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textAlign:"center", flex:1 }}>DISC</span>
                <span style={{ fontSize:10, fontWeight:700, color:"#94a3b8", textAlign:"right", flex:2 }}>AMOUNT</span>
              </div>
              {items.map((item, i) => (
                <div key={i} style={{ padding:"7px 0", borderBottom:"1px dotted #f1f5f9" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <span style={{ fontSize:13, fontWeight:600, color:"#0f172a", flex:3 }}>{item.name}</span>
                    <span style={{ fontSize:12, color:"#475569", textAlign:"center", flex:1 }}>{item.qty||1}</span>
                    <span style={{ fontSize:11, color:"#f59e0b", textAlign:"center", flex:1 }}>{+item.discount>0?`${item.discount}%`:"—"}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:"#0f172a", textAlign:"right", flex:2 }}>{fmtPeso(calcItem(item))}</span>
                  </div>
                  <span style={{ fontSize:11, color:"#94a3b8" }}>{fmtPeso(item.price)} × {item.qty||1}{+item.discount>0?` (-${item.discount}%)`:""}</span>
                </div>
              ))}
            </div>

            <hr style={{ border:"none", borderTop:"1px dashed #cbd5e1", margin:"12px 0" }}/>

            {/* Totals */}
            <div style={{ marginBottom:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
                <span style={{ fontSize:13, color:"#475569" }}>Subtotal</span>
                <span style={{ fontSize:13, fontWeight:600, color:"#0f172a" }}>{fmtPeso(total)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
                <span style={{ fontSize:13, color:"#475569" }}>Amount Paid</span>
                <span style={{ fontSize:13, fontWeight:700, color:"#22c55e" }}>{fmtPeso(paid)}</span>
              </div>
              {bill.paymentMethod && (
                <div style={{ display:"flex", justifyContent:"space-between", padding:"3px 0" }}>
                  <span style={{ fontSize:11, color:"#94a3b8" }}>Payment Method</span>
                  <span style={{ fontSize:11, color:"#475569" }}>{bill.paymentMethod}</span>
                </div>
              )}
              {change > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
                  <span style={{ fontSize:13, color:"#475569" }}>Change</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#3b82f6" }}>{fmtPeso(change)}</span>
                </div>
              )}
              <hr style={{ border:"none", borderTop:"2px solid #1e293b", margin:"10px 0 8px" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
                <span style={{ fontSize:16, fontWeight:800, color:"#0f172a" }}>TOTAL</span>
                <span style={{ fontSize:18, fontWeight:800, color:"#2563eb" }}>{fmtPeso(total)}</span>
              </div>
              {balance > 0 && (
                <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0" }}>
                  <span style={{ fontSize:13, color:"#f59e0b", fontWeight:600 }}>Balance Due</span>
                  <span style={{ fontSize:14, fontWeight:800, color:"#f59e0b" }}>{fmtPeso(balance)}</span>
                </div>
              )}
            </div>

            {/* Paid stamp */}
            <div style={{ textAlign:"center", margin:"16px 0" }}>
              {bill.status === "Paid" ? (
                <div style={{ display:"inline-block", padding:"8px 24px", border:"3px solid #22c55e", borderRadius:8, fontSize:20, fontWeight:900, color:"#22c55e", letterSpacing:4, transform:"rotate(-5deg)" }}>PAID</div>
              ) : bill.status === "Unpaid" ? (
                <div style={{ display:"inline-block", padding:"8px 24px", border:"3px solid #f59e0b", borderRadius:8, fontSize:20, fontWeight:900, color:"#f59e0b", letterSpacing:4, transform:"rotate(-5deg)" }}>UNPAID</div>
              ) : bill.status === "Partial" ? (
                <div style={{ display:"inline-block", padding:"8px 24px", border:"3px solid #3b82f6", borderRadius:8, fontSize:18, fontWeight:900, color:"#3b82f6", letterSpacing:3, transform:"rotate(-5deg)" }}>PARTIAL</div>
              ) : null}
            </div>

            {/* Notes */}
            {bill.notes && (
              <>
                <hr style={{ border:"none", borderTop:"1px dashed #cbd5e1", margin:"12px 0" }}/>
                <div style={{ fontSize:11, color:"#64748b", lineHeight:1.6 }}>
                  <strong>Notes:</strong> {bill.notes}
                </div>
              </>
            )}

            <hr style={{ border:"none", borderTop:"1px dashed #cbd5e1", margin:"16px 0 12px" }}/>

            {/* Footer */}
            <div style={{ textAlign:"center", fontSize:11, color:"#94a3b8", lineHeight:1.8 }}>
              <div style={{ marginBottom:4 }}>Thank you for trusting {clinic.name}!</div>
              <div style={{ fontFamily:"monospace", fontSize:10, color:"#cbd5e1" }}>
                Printed: {new Date().toLocaleDateString("en-PH",{ month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" })}
              </div>
              <div style={{ fontSize:10, color:"#cbd5e1", marginTop:4 }}>
                This receipt is computer-generated and valid without signature.
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
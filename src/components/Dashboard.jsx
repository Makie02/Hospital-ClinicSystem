// src/components/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../context/firebase";
import { useTheme } from "../context/ThemeContext";
import {
  Users, Calendar, Stethoscope, TrendingUp,
  ArrowUpRight, ArrowDownRight, Activity,
  Clock, CheckCircle2, AlertCircle, X,
  TestTube, Pill, FileText, CreditCard,
  Banknote, FlaskConical,
} from "lucide-react";
import AnnouncementWidget from "./Announcementwidget";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const fmtPeso = (n) => `₱${Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0 })}`;
const fmtDate = (ts) =>
  ts ? new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—";
const isThisMonth = (ts) => {
  if (!ts) return false;
  const d = new Date(ts);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};
const isToday = (s) => s === todayStr();

const APPT_STATUS_CFG = {
  Scheduled: { label: "Scheduled", dot: "#94a3b8", bg: "rgba(148,163,184,.12)", color: "#94a3b8" },
  Confirmed: { label: "Confirmed", dot: "#60a5fa", bg: "rgba(96,165,250,.12)", color: "#60a5fa" },
  "In Progress": { label: "In Progress", dot: "#fbbf24", bg: "rgba(251,191,36,.12)", color: "#fbbf24" },
  Done: { label: "Done", dot: "#34d399", bg: "rgba(52,211,153,.12)", color: "#34d399" },
  Cancelled: { label: "Cancelled", dot: "#f87171", bg: "rgba(248,113,113,.12)", color: "#f87171" },
  "No Show": { label: "No Show", dot: "#c084fc", bg: "rgba(192,132,252,.12)", color: "#c084fc" },
};

const fmt12 = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const hr = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hr}:${String(m).padStart(2, "0")} ${ap}`;
};

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "", duration = 900 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = null;
    const from = 0;
    const to = Number(value) || 0;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * ease));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, duration]);
  return <>{prefix}{display.toLocaleString("en-PH")}{suffix}</>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, prefix = "", suffix = "", change, up, icon: Icon, g1, g2, glow, D }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: D ? "#0d1117" : "#fff",
        border: `1px solid ${D ? "rgba(255,255,255,0.07)" : "#f1f5f9"}`,
        borderRadius: 20,
        padding: "20px 20px 18px",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? `0 16px 40px ${glow}` : "none",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: "20px 20px 0 0", background: `linear-gradient(90deg,${g1},${g2})` }} />
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `radial-gradient(circle,${glow},transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${g1},${g2})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 6px 16px ${glow}`, marginBottom: 14 }}>
        <Icon size={16} color="white" />
      </div>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 800, background: `linear-gradient(135deg,${g1},${g2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        <AnimatedNumber value={value} prefix={prefix} suffix={suffix} />
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: D ? "#334155" : "#94a3b8", fontWeight: 500 }}>{label}</p>
      {change && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, fontWeight: 600, color: up ? "#22c55e" : "#ef4444" }}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {change}
        </div>
      )}
    </div>
  );
}

// ─── Mini Progress Bar ────────────────────────────────────────────────────────
function ProgressBar({ label, value, max, color, D }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: D ? "#475569" : "#64748b", marginBottom: 5 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: D ? "#e2e8f0" : "#0f172a" }}>{value}/{max}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: D ? "rgba(255,255,255,0.06)" : "#f1f5f9", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color, transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function SCard({ title, children, D, action }) {
  const cardBg = D ? "#0d1117" : "#fff";
  const cardBdr = D ? "rgba(255,255,255,0.07)" : "#f1f5f9";
  return (
    <div style={{ background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 20, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${cardBdr}` }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: D ? "#f1f5f9" : "#0f172a" }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, cfg }) {
  const s = cfg[status] || Object.values(cfg)[0];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.dot}30`, whiteSpace: "nowrap" }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
      {s.label || status}
    </span>
  );
}

// ─── Mini Bar Chart (pure CSS/SVG, no library needed) ─────────────────────────
function MiniBarChart({ data, labels, colors, D }) {
  const max = Math.max(...data, 1);
  const H = 80, W = 100;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: H }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, color: D ? "#475569" : "#94a3b8", fontWeight: 600 }}>{v}</span>
          <div style={{ width: "100%", height: Math.max((v / max) * (H - 24), 4), borderRadius: "4px 4px 0 0", background: colors[i % colors.length], transition: "height 1s cubic-bezier(.4,0,.2,1)" }} />
          <span style={{ fontSize: 9, color: D ? "#334155" : "#94a3b8", textAlign: "center" }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isDark: D } = useTheme();

  // ── Raw data from Firebase ──
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [bills, setBills] = useState([]);
  const [labRequests, setLabRequests] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Live clock ──
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  // ── Firebase listeners ──
  useEffect(() => {
    let done = 0;
    const check = () => { if (++done >= 7) setLoading(false); };

    const u1 = onValue(ref(db, "patients"), s => { const d = s.val(); setPatients(d ? Object.entries(d).map(([id, v]) => ({ id, ...v })) : []); check(); });
    const u2 = onValue(ref(db, "appointments"), s => { const d = s.val(); setAppointments(d ? Object.entries(d).map(([id, v]) => ({ id, ...v })) : []); check(); });
    const u3 = onValue(ref(db, "doctors"), s => { const d = s.val(); setDoctors(d ? Object.entries(d).map(([id, v]) => ({ id, ...v })) : []); check(); });
    const u4 = onValue(ref(db, "bills"), s => { const d = s.val(); setBills(d ? Object.entries(d).map(([id, v]) => ({ id, ...v })) : []); check(); });
    const u5 = onValue(ref(db, "labRequests"), s => { const d = s.val(); setLabRequests(d ? Object.entries(d).map(([id, v]) => ({ id, ...v })) : []); check(); });
    const u6 = onValue(ref(db, "prescriptions"), s => { const d = s.val(); setPrescriptions(d ? Object.entries(d).map(([id, v]) => ({ id, ...v })) : []); check(); });
    const u7 = onValue(ref(db, "medicalRecords"), s => { const d = s.val(); setRecords(d ? Object.entries(d).map(([id, v]) => ({ id, ...v })) : []); check(); });

    return () => { u1(); u2(); u3(); u4(); u5(); u6(); u7(); };
  }, []);

  // ── Derived analytics ──
  const today = todayStr();

  // Patients
  const activePatients = patients.filter(p => p.status === "Active").length;
  const criticalPatients = patients.filter(p => p.status === "Critical").length;
  const newThisMonth = patients.filter(p => isThisMonth(p.createdAt)).length;

  // Appointments
  const todayAppts = appointments.filter(a => a.date === today);
  const todayDone = todayAppts.filter(a => a.status === "Done").length;
  const todayInProg = todayAppts.filter(a => a.status === "In Progress").length;
  const todayWaiting = todayAppts.filter(a => a.status === "Scheduled" || a.status === "Confirmed").length;
  const todayCancelled = todayAppts.filter(a => a.status === "Cancelled").length;
  const upcomingAppts = appointments.filter(a => a.date > today).length;

  // Doctors
  const activeDoctors = doctors.filter(d => d.status === "Active").length;
  const onLeaveDoctors = doctors.filter(d => d.status === "On Leave").length;

  // Billing
  const totalCollected = bills
    .filter(b => b.status === "Paid" || b.status === "Partial")
    .reduce((s, b) => s + (+b.amountPaid || 0), 0);
  const todayRevenue = bills
    .filter(b => b.date === today && (b.status === "Paid" || b.status === "Partial"))
    .reduce((s, b) => s + (+b.amountPaid || 0), 0);
  const totalOutstanding = bills
    .filter(b => b.status === "Unpaid" || b.status === "Partial")
    .reduce((s, b) => s + (Math.max(0, (+b.total || 0) - (+b.amountPaid || 0))), 0);
  const paidBills = bills.filter(b => b.status === "Paid").length;
  const unpaidBills = bills.filter(b => b.status === "Unpaid").length;

  // Lab
  const labPending = labRequests.filter(r => r.status === "Pending").length;
  const labProcessing = labRequests.filter(r => r.status === "Processing").length;
  const labCompleted = labRequests.filter(r => r.status === "Completed").length;
  const labToday = labRequests.filter(r => r.date === today).length;

  // Pharmacy
  const rxPending = prescriptions.filter(p => p.status === "Pending").length;
  const rxDispensed = prescriptions.filter(p => p.status === "Dispensed").length;

  // Medical Records
  const recordsThisMonth = records.filter(r => isThisMonth(r.createdAt)).length;

  // Weekly appointment data (last 7 days)
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d.toISOString().split("T")[0];
  });
  const weekLabels = last7.map(d => { const dt = new Date(d + "T00:00:00"); return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][dt.getDay()]; });
  const weekAppts = last7.map(d => appointments.filter(a => a.date === d).length);
  const weekDone = last7.map(d => appointments.filter(a => a.date === d && a.status === "Done").length);

  // Status summary counts
  const apptStatusCounts = Object.keys(APPT_STATUS_CFG).map(s => ({
    label: s,
    value: appointments.filter(a => a.status === s).length,
    ...APPT_STATUS_CFG[s],
  }));

  // Sort today's appointments by time
  const sortedTodayAppts = [...todayAppts].sort((a, b) => (a.time > b.time ? 1 : -1));

  // Recent patients (last 5)
  const recentPatients = [...patients]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  // Specialization breakdown
  const specMap = {};
  doctors.forEach(d => {
    const s = d.specialization || "Other";
    specMap[s] = (specMap[s] || 0) + 1;
  });
  const specEntries = Object.entries(specMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const pageBg = D ? "#080b12" : "#f8fafc";
  const cardBg = D ? "#0d1117" : "#fff";
  const cardBdr = D ? "rgba(255,255,255,0.07)" : "#f1f5f9";

  const DAYS_PH = ["Linggo", "Lunes", "Martes", "Miyerkules", "Huwebes", "Biyernes", "Sabado"];
  const MONTHS_PH = ["Enero", "Pebrero", "Marso", "Abril", "Mayo", "Hunyo", "Hulyo", "Agosto", "Setyembre", "Oktubre", "Nobyembre", "Disyembre"];
  const timeStr = time.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = `${DAYS_PH[time.getDay()]}, ${time.getDate()} ${MONTHS_PH[time.getMonth()]} ${time.getFullYear()}`;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", background: pageBg }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #2563eb", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 14, color: D ? "#475569" : "#64748b", margin: 0 }}>Loading dashboard…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, minHeight: "100%", background: pageBg, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Welcome Banner ── */}
      <div style={{ background: "linear-gradient(135deg,#1a56db,#1e3a8a)", borderRadius: 20, padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", right: -30, top: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.07)" }} />
        <div style={{ position: "absolute", right: 80, bottom: -20, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ margin: "0 0 3px", fontSize: 12, color: "rgba(255,255,255,.65)" }}>Clinic Management System</p>
          <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 800, color: "#fff" }}>Analytics Dashboard</h2>
          <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.75)" }}>
            Ngayon: <span style={{ color: "#fff", fontWeight: 700 }}>{todayAppts.length} appointments</span>
            {" · "}
            <span style={{ color: "#86efac" }}>{todayDone} done</span>
            {" · "}
            <span style={{ color: "#fde68a" }}>{todayInProg} in progress</span>
            {" · "}
            <span style={{ color: "#bfdbfe" }}>{todayWaiting} waiting</span>
          </p>
        </div>
        <div style={{ position: "relative", zIndex: 1, textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginBottom: 2 }}>{dateStr}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "1px" }}>{timeStr}</div>
        </div>
      </div>
      <AnnouncementWidget audience="admin" D={D} />

      {/* ── KPI Cards Row 1: Patients & Appointments ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard label="Total Patients" value={patients.length} icon={Users} g1="#3b82f6" g2="#6366f1" glow="rgba(99,102,241,.25)" change={`+${newThisMonth} this month`} up D={D} />
        <StatCard label="Active Patients" value={activePatients} icon={Activity} g1="#059669" g2="#047857" glow="rgba(5,150,105,.25)" change={`${criticalPatients} critical`} up={criticalPatients === 0} D={D} />
        <StatCard label="Today's Appts" value={todayAppts.length} icon={Calendar} g1="#0891b2" g2="#0e7490" glow="rgba(8,145,178,.25)" change={`${upcomingAppts} upcoming`} up D={D} />
        <StatCard label="Active Doctors" value={activeDoctors} icon={Stethoscope} g1="#8b5cf6" g2="#7c3aed" glow="rgba(139,92,246,.25)" change={`${onLeaveDoctors} on leave`} up={onLeaveDoctors === 0} D={D} />
      </div>

      {/* ── KPI Cards Row 2: Revenue & Clinical ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard label="Today's Revenue" value={todayRevenue} prefix="₱" icon={TrendingUp} g1="#059669" g2="#047857" glow="rgba(5,150,105,.25)" D={D} />
        <StatCard label="Total Collected" value={totalCollected} prefix="₱" icon={Banknote} g1="#0891b2" g2="#0e7490" glow="rgba(8,145,178,.25)" D={D} />
        <StatCard label="Lab Requests" value={labRequests.length} icon={TestTube} g1="#f59e0b" g2="#d97706" glow="rgba(245,158,11,.25)" change={`${labPending} pending`} up={labPending === 0} D={D} />
        <StatCard label="Prescriptions" value={prescriptions.length} icon={Pill} g1="#ec4899" g2="#db2777" glow="rgba(236,72,153,.25)" change={`${rxPending} pending`} up={rxPending === 0} D={D} />
      </div>

      {/* ── Main content grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 340px", gap: 14 }}>

        {/* Today's Appointments */}
        <SCard title={`Appointments  (${todayAppts.length})`} D={D}>
          {sortedTodayAppts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: D ? "#334155" : "#94a3b8", fontSize: 13 }}>
              <Calendar size={28} style={{ margin: "0 auto 8px", display: "block", opacity: .4 }} />
              No appointments
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {sortedTodayAppts.slice(0, 7).map((a, i) => {
                const sc = APPT_STATUS_CFG[a.status] || APPT_STATUS_CFG.Scheduled;
                return (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < Math.min(sortedTodayAppts.length, 7) - 1 ? `1px solid ${D ? "rgba(255,255,255,.04)" : "#f8fafc"}` : "none" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, color: D ? "#334155" : "#94a3b8", width: 44, flexShrink: 0 }}>{fmt12(a.time)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: D ? "#e2e8f0" : "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.patientName}</p>
                      <p style={{ margin: 0, fontSize: 11, color: D ? "#334155" : "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.doctor} · {a.type}</p>
                    </div>
                    <StatusBadge status={a.status} cfg={APPT_STATUS_CFG} />
                  </div>
                );
              })}
              {sortedTodayAppts.length > 7 && (
                <p style={{ margin: "8px 0 0", fontSize: 11, color: D ? "#334155" : "#94a3b8", textAlign: "center" }}>
                  +{sortedTodayAppts.length - 7} more appointments
                </p>
              )}
            </div>
          )}
        </SCard>

        {/* Recent Patients */}
        <SCard title="New patients" D={D}>
          {recentPatients.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 0", color: D ? "#334155" : "#94a3b8", fontSize: 13 }}>
              <Users size={28} style={{ margin: "0 auto 8px", display: "block", opacity: .4 }} />
              No patients
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {recentPatients.map((p, i) => {
                const name = `${p.firstName} ${p.lastName}`.trim();
                const initials = (p.firstName?.[0] || "") + (p.lastName?.[0] || "");
                const colors = ["#2563eb", "#7c3aed", "#059669", "#d97706", "#0891b2"];
                const col = colors[name.charCodeAt(0) % colors.length];
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < recentPatients.length - 1 ? `1px solid ${D ? "rgba(255,255,255,.04)" : "#f8fafc"}` : "none" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: D ? "#e2e8f0" : "#0f172a" }}>{name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: D ? "#334155" : "#94a3b8" }}>{p.patientId} · {p.age}y {p.gender}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: p.status === "Active" ? "rgba(34,197,94,.1)" : p.status === "Critical" ? "rgba(239,68,68,.1)" : "rgba(148,163,184,.1)", color: p.status === "Active" ? "#22c55e" : p.status === "Critical" ? "#ef4444" : "#94a3b8", fontWeight: 600 }}>{p.status}</span>
                      <p style={{ margin: "2px 0 0", fontSize: 10, color: D ? "#334155" : "#94a3b8" }}>{fmtDate(p.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SCard>

        {/* Right sidebar: Appointment Status + Quick Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Appointment Status Summary */}
          <div style={{ background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 20, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 5, height: 18, borderRadius: 3, background: "linear-gradient(180deg,#3b82f6,#8b5cf6)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: D ? "#f1f5f9" : "#0f172a" }}>Appointment Status </span>
            </div>
            {apptStatusCounts.filter(s => s.value > 0).length === 0 ? (
              <p style={{ fontSize: 12, color: D ? "#334155" : "#94a3b8", textAlign: "center", padding: "12px 0" }}>Wala pang data</p>
            ) : apptStatusCounts.map(s => {
              const total = appointments.length || 1;
              const pct = ((s.value / total) * 100).toFixed(0);
              return (
                <div key={s.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: s.color, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot, flexShrink: 0 }} />
                      {s.label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: D ? "#e2e8f0" : "#0f172a" }}>{s.value}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: D ? "rgba(255,255,255,.05)" : "#f1f5f9", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: s.dot, borderRadius: 2, transition: "width .8s ease" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lab & Pharmacy */}
          <div style={{ background: cardBg, border: `1px solid ${cardBdr}`, borderRadius: 20, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 5, height: 18, borderRadius: 3, background: "linear-gradient(180deg,#f59e0b,#ec4899)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: D ? "#f1f5f9" : "#0f172a" }}>Lab & Pharmacy</span>
            </div>
            <ProgressBar label="Lab — Pending" value={labPending} max={labRequests.length || 1} color="#f59e0b" D={D} />
            <ProgressBar label="Lab — Processing" value={labProcessing} max={labRequests.length || 1} color="#3b82f6" D={D} />
            <ProgressBar label="Lab — Completed" value={labCompleted} max={labRequests.length || 1} color="#22c55e" D={D} />
            <div style={{ borderTop: `1px solid ${cardBdr}`, margin: "10px 0" }} />
            <ProgressBar label="Rx — Pending" value={rxPending} max={prescriptions.length || 1} color="#ec4899" D={D} />
            <ProgressBar label="Rx — Dispensed" value={rxDispensed} max={prescriptions.length || 1} color="#22c55e" D={D} />
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Weekly chart + Billing + Doctors ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>

        {/* Weekly appointments bar chart */}
        <SCard title="Appointments — last 7 days" D={D}>
          {weekAppts.every(v => v === 0) ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: D ? "#334155" : "#94a3b8", fontSize: 12 }}>Not Found appointment data</div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 14, marginBottom: 12, fontSize: 11, color: D ? "#475569" : "#94a3b8" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#3b82f6", display: "inline-block" }} />Total</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#22c55e", display: "inline-block" }} />Done</span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
                {weekAppts.map((v, i) => {
                  const maxW = Math.max(...weekAppts, 1);
                  const h = Math.max((v / maxW) * 80, v > 0 ? 6 : 0);
                  const hd = Math.max((weekDone[i] / maxW) * 80, weekDone[i] > 0 ? 4 : 0);
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 10, color: D ? "#475569" : "#94a3b8", fontWeight: 600, height: 14 }}>{v > 0 ? v : ""}</span>
                      <div style={{ width: "100%", position: "relative", height: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                        <div style={{ width: "100%", height: h, borderRadius: "4px 4px 0 0", background: D ? "rgba(59,130,246,.3)" : "#dbeafe" }} />
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: hd, borderRadius: "4px 4px 0 0", background: "#22c55e", opacity: .8 }} />
                      </div>
                      <span style={{ fontSize: 9, color: D ? "#334155" : "#94a3b8" }}>{weekLabels[i]}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </SCard>

        {/* Billing breakdown */}
        <SCard title="Billing overview" D={D}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Total bills", value: bills.length, color: "#3b82f6" },
              { label: "Paid", value: paidBills, color: "#22c55e" },
              { label: "Unpaid", value: unpaidBills, color: "#f59e0b" },
              { label: "Cancelled", value: bills.filter(b => b.status === "Cancelled").length, color: "#ef4444" },
            ].map(s => (
              <div key={s.label} style={{ background: D ? "rgba(255,255,255,.03)" : "#f8fafc", border: `1px solid ${cardBdr}`, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                <p style={{ margin: "0 0 3px", fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: 11, color: D ? "#475569" : "#94a3b8" }}>{s.label}</p>
              </div>
            ))}
          </div>
          <div style={{ borderTop: `1px solid ${cardBdr}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Total collected", value: fmtPeso(totalCollected), color: "#22c55e" },
              { label: "Outstanding", value: fmtPeso(totalOutstanding), color: "#f59e0b" },
              { label: "Today's revenue", value: fmtPeso(todayRevenue), color: "#3b82f6" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: D ? "#475569" : "#64748b" }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
        </SCard>

        {/* Doctors specialization */}
        <SCard title="Doctors by specialization" D={D}>
          {specEntries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: D ? "#334155" : "#94a3b8", fontSize: 12 }}>
              <Stethoscope size={28} style={{ margin: "0 auto 8px", display: "block", opacity: .4 }} />
              Not found doctors
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {specEntries.map(([spec, count], i) => {
                const max = specEntries[0][1] || 1;
                const colors = ["#3b82f6", "#8b5cf6", "#0891b2", "#059669", "#f59e0b", "#ec4899"];
                return (
                  <div key={spec}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: D ? "#94a3b8" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "80%" }}>{spec}</span>
                      <span style={{ fontWeight: 700, color: colors[i % colors.length], flexShrink: 0 }}>{count}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: D ? "rgba(255,255,255,.05)" : "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(count / max) * 100}%`, background: colors[i % colors.length], borderRadius: 2, transition: "width .8s ease" }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop: `1px solid ${cardBdr}`, marginTop: 6, paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: D ? "#475569" : "#64748b" }}>On Leave</span>
                <span style={{ fontWeight: 700, color: "#f59e0b" }}>{onLeaveDoctors}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: D ? "#475569" : "#64748b" }}>Medical Records (buwan)</span>
                <span style={{ fontWeight: 700, color: "#3b82f6" }}>{recordsThisMonth}</span>
              </div>
            </div>
          )}
        </SCard>
      </div>

    </div>
  );
}
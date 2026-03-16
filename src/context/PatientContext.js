import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "./firebase";

const PatientContext = createContext(null);

export function PatientProvider({ patient: initialPatient, children }) {
  const [patient, setPatient]             = useState(initialPatient);
  const [notifications, setNotifications] = useState([]);
  const [isDark, setIsDark]               = useState(
    () => localStorage.getItem("patientTheme") === "dark"
  );

  // ── Real-time profile sync ─────────────────────────────────────
  useEffect(() => {
    if (!initialPatient?.id) return;
    const unSub = onValue(ref(db, `patients/${initialPatient.id}`), snap => {
      if (snap.exists()) setPatient(p => ({ ...p, ...snap.val(), id: initialPatient.id }));
    });
    return () => unSub();
  }, [initialPatient?.id]);

  // ── Real-time notifications from appointments + bills ──────────
  useEffect(() => {
    if (!initialPatient?.firstName) return;
    const patName = `${initialPatient.firstName} ${initialPatient.lastName}`.trim();

    const unSub = onValue(ref(db, "appointments"), snap => {
      const d = snap.val();
      const notifs = [];

      if (d) {
        Object.entries(d)
          .map(([id, v]) => ({ id, ...v }))
          .filter(a => a.patientName === patName)
          .forEach(a => {
            if (a.status === "Confirmed")
              notifs.push({ id: `conf-${a.id}`, type: "success", title: "Appointment Confirmed",  msg: `${a.type} on ${a.date} at ${a.time}`, read: false });
            if (a.status === "Cancelled")
              notifs.push({ id: `canc-${a.id}`, type: "error",   title: "Appointment Cancelled",  msg: `${a.type} on ${a.date} has been cancelled.`, read: false });
            if (a.status === "Done")
              notifs.push({ id: `done-${a.id}`, type: "info",    title: "Appointment Completed",  msg: `${a.type} on ${a.date} is marked done.`, read: false });
          });
      }

      // Bills
      onValue(ref(db, "bills"), bSnap => {
        const bd = bSnap.val();
        if (bd) {
          Object.entries(bd)
            .map(([id, v]) => ({ id, ...v }))
            .filter(b => b.patientName === patName && (b.status === "Unpaid" || b.status === "Partial"))
            .forEach(b => {
              const bal = Math.max(0, (+b.total || 0) - (+b.amountPaid || 0));
              if (bal > 0)
                notifs.push({ id: `bill-${b.id}`, type: "warning", title: "Outstanding Balance", msg: `Bill ${b.billId}: ₱${Number(bal).toLocaleString("en-PH", { minimumFractionDigits: 2 })} remaining.`, read: false });
            });
        }
        setNotifications(notifs);
      }, { onlyOnce: true });
    });

    return () => unSub();
  }, [initialPatient?.firstName, initialPatient?.lastName]);

  const toggleTheme = () => {
    setIsDark(d => {
      const next = !d;
      localStorage.setItem("patientTheme", next ? "dark" : "light");
      return next;
    });
  };

  const updateProfile = useCallback(async (data) => {
    if (!initialPatient?.id) return;
    await update(ref(db, `patients/${initialPatient.id}`), { ...data, updatedAt: Date.now() });
    setPatient(p => ({ ...p, ...data }));
  }, [initialPatient?.id]);

  const markAllRead = () => setNotifications(n => n.map(x => ({ ...x, read: true })));

  return (
    <PatientContext.Provider value={{ patient, notifications, isDark, toggleTheme, updateProfile, markAllRead }}>
      {children}
    </PatientContext.Provider>
  );
}

export const usePatient = () => useContext(PatientContext);
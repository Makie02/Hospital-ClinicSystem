// src/hooks/useSettingsList.js
// ─── Shared hook: loads a list of string values from Firebase Maintenance Settings ───
import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../context/firebase";

/**
 * Subscribes to a Firebase path and returns an array of string labels.
 * Falls back to the provided fallback array if Firebase has no data yet.
 *
 * Usage:
 *   const specializations = useSettingsList("settings/doctors/specializations", FALLBACK_SPECS);
 */
export function useSettingsList(dbPath, fallback = []) {
  const [items, setItems] = useState(fallback);

  useEffect(() => {
    const unsub = onValue(ref(db, dbPath), (snap) => {
      const data = snap.val();
      if (!data) { setItems(fallback); return; }
      const list = Object.values(data)
        .map(v => (typeof v === "string" ? v : v?.label || ""))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setItems(list.length > 0 ? list : fallback);
    });
    return () => unsub();
  }, [dbPath]);

  return items;
}
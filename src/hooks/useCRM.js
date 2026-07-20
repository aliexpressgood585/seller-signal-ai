import { useState, useCallback } from "react";

const KEY = "seller_crm_v1";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch { return {}; }
}

export function useCRM() {
  const [logs, setLogs] = useState(load);

  const addLog = useCallback((entityId, entry) => {
    setLogs(prev => {
      const next = {
        ...prev,
        [entityId]: [
          { ...entry, id: Date.now(), ts: new Date().toISOString() },
          ...(prev[entityId] || []),
        ],
      };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getLogs = useCallback((entityId) => logs[entityId] || [], [logs]);

  return { addLog, getLogs };
}

export const CRM_TYPES = {
  call:     { icon: "📞", label: "שיחה",    color: "#2979FF" },
  whatsapp: { icon: "💬", label: "WhatsApp", color: "#00BFA5" },
  visit:    { icon: "🏠", label: "ביקור",   color: "#FFA000" },
  offer:    { icon: "💰", label: "הצעה",    color: "#FF5722" },
  note:     { icon: "📝", label: "הערה",    color: "rgba(255,255,255,0.4)" },
};

export function fmtTs(ts) {
  const d = new Date(ts);
  const diff = Date.now() - d;
  if (diff < 60000)   return "עכשיו";
  if (diff < 3600000) return `לפני ${Math.floor(diff / 60000)} דק׳`;
  if (diff < 86400000) return `לפני ${Math.floor(diff / 3600000)} שע׳`;
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
}

import { useState } from "react";
import { SIGNALS, BUYERS, PIPELINE, INIT_TASKS } from "../lib/data";

function useLS(key, seed) {
  const [data, setData] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : seed;
    } catch { return seed; }
  });
  function set(next) {
    const val = typeof next === "function" ? next(data) : next;
    setData(val);
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
  return [data, set];
}

function uid(prefix) { return prefix + Date.now() + Math.random().toString(36).slice(2, 5); }

export function useSignals() {
  const [signals, setSignals] = useLS("seller_signals_v3", SIGNALS);
  return {
    signals,
    addSignal:    (s)       => setSignals(p => [{ ...s, id: uid("s") }, ...p]),
    updateSignal: (id, upd) => setSignals(p => p.map(s => s.id === id ? { ...s, ...upd } : s)),
    deleteSignal: (id)      => setSignals(p => p.filter(s => s.id !== id)),
  };
}

export function useBuyers() {
  const [buyers, setBuyers] = useLS("seller_buyers_v3", BUYERS);
  return {
    buyers,
    addBuyer:    (b)       => setBuyers(p => [{ ...b, id: uid("b") }, ...p]),
    updateBuyer: (id, upd) => setBuyers(p => p.map(b => b.id === id ? { ...b, ...upd } : b)),
    deleteBuyer: (id)      => setBuyers(p => p.filter(b => b.id !== id)),
  };
}

export function usePipeline() {
  const [deals, setDeals] = useLS("seller_pipeline_v3", PIPELINE);
  return {
    deals,
    addDeal:    (d)         => setDeals(p => [{ ...d, id: uid("p"), commissionRate: d.commissionRate ?? 2 }, ...p]),
    updateDeal: (id, upd)   => setDeals(p => p.map(d => d.id === id ? { ...d, ...upd } : d)),
    deleteDeal: (id)        => setDeals(p => p.filter(d => d.id !== id)),
    moveStage:  (id, stage) => setDeals(p => p.map(d => d.id === id ? { ...d, stage } : d)),
  };
}

export function useTasks() {
  const [tasks, setTasks] = useLS("seller_tasks_v3", INIT_TASKS);
  return {
    tasks,
    addTask:    (t)       => setTasks(p => [{ ...t, id: uid("t"), done: false }, ...p]),
    updateTask: (id, upd) => setTasks(p => p.map(t => t.id === id ? { ...t, ...upd } : t)),
    deleteTask: (id)      => setTasks(p => p.filter(t => t.id !== id)),
    toggleDone: (id)      => setTasks(p => p.map(t => t.id === id ? { ...t, done: !t.done } : t)),
  };
}

export function matchScore(buyer, signal) {
  const inPrice = signal.price >= buyer.bMin * 0.95 && signal.price <= buyer.bMax * 1.05;
  const inRooms = signal.rooms >= buyer.rMin - 0.5 && signal.rooms <= buyer.rMax + 0.5;
  if (!inPrice || !inRooms) return 0;
  let score = 40;
  if (signal.price >= buyer.bMin && signal.price <= buyer.bMax) score += 20;
  if (signal.rooms >= buyer.rMin && signal.rooms <= buyer.rMax) score += 20;
  score += Math.round(signal.score * 0.2);
  return Math.min(100, score);
}

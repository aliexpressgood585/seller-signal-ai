// src/pages/index.jsx  — all pages exported
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Ring, Spinner, Card, AIBox, Btn } from "../components/UI";
import { askGemini, PROMPTS } from "../hooks/useGemini";
import { SIGNALS, PIPELINE, BUYERS, INIT_TASKS, fmt, fmtFull, sColor, stColor, stLabel, waLink, STAGES } from "../lib/data";
import { useCRM, CRM_TYPES, fmtTs } from "../hooks/useCRM";

// ─── shared toast state ──────────────────────────────────────
// Each page calls window.__toast__ if it needs toast.
// The App component provides it via context.

// ─── Dashboard ───────────────────────────────────────────────
export function Dashboard() {
  const nav = useNavigate();
  const hot = SIGNALS.filter(s => s.score >= 85);
  const exp = PIPELINE.reduce((s, d) => s + d.value * d.prob / 100, 0);
  const todayTasks = INIT_TASKS.filter(t => !t.done && t.today);

  return (
    <div style={{ padding:18, display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontSize:19, fontWeight:800, color:"#fff", margin:0 }}>שלום, יעקב 👋</h1>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", margin:"4px 0 0" }}>
            <span style={{ color:"#F44336", fontWeight:600 }}>{hot.length} סיגנלים חמים</span> · {todayTasks.length} משימות להיום
          </p>
        </div>
        <Btn onClick={() => nav("/signals")}>⚡ סיגנלים</Btn>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { icon:"⚡", label:"סיגנלים",  v:SIGNALS.length, sub:`${hot.length} חמים 🔥`, c:"#FF5722", to:"/signals"  },
          { icon:"🔀", label:"עסקאות",   v:PIPELINE.length, sub:fmt(exp)+" צפי",         c:"#7C4DFF", to:"/pipeline" },
          { icon:"👥", label:"קונים",    v:BUYERS.length,   sub:"2 חמים",                c:"#2979FF", to:"/buyers"  },
          { icon:"📈", label:"עמלות",    v:"₪285K",         sub:"+18% החודש",            c:"#00BFA5", to:""         },
        ].map((k, i) => (
          <Card key={i} onClick={() => k.to && nav(k.to)} style={{ padding:14, cursor:k.to ? "pointer" : "default" }}>
            <div style={{ fontSize:20, marginBottom:8 }}>{k.icon}</div>
            <div style={{ fontSize:21, fontWeight:800, color:"#fff" }}>{k.v}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{k.label}</div>
            <div style={{ fontSize:11, color:k.c, fontWeight:600, marginTop:4 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Hot signals */}
      <Card style={{ padding:14 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:11 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>🔥 סיגנלים חמים</span>
          <button onClick={() => nav("/signals")} style={{ background:"none", border:"none", color:"#FF5722", fontSize:12, fontWeight:600, cursor:"pointer" }}>כולם →</button>
        </div>
        {SIGNALS.slice(0, 4).map(s => (
          <div key={s.id} onClick={() => nav("/signals")} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 11px", background:"#070B17", borderRadius:10, border:"1px solid #1E2D45", cursor:"pointer", marginBottom:7 }}>
            <Ring score={s.score} size={44}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                <span style={{ fontSize:12, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{s.address}</span>
                <span style={{ fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:99, background:`${sColor(s.score)}15`, color:sColor(s.score), flexShrink:0 }}>{s.tag}</span>
              </div>
              <div style={{ display:"flex", gap:8, fontSize:11 }}>
                <span style={{ fontWeight:700, color:"#fff" }}>{fmt(s.price)}</span>
                {s.change && <span style={{ color:"#F44336", fontWeight:700 }}>↓{fmt(s.change)}</span>}
                <span style={{ color:"#00BFA5", marginRight:"auto" }}>👥{s.matchingBuyers}</span>
              </div>
            </div>
          </div>
        ))}
      </Card>

      {/* Tasks */}
      <Card style={{ padding:14 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>🔔 משימות להיום</span>
          <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, background:"rgba(255,160,0,0.12)", color:"#FFA000", border:"1px solid rgba(255,160,0,0.2)" }}>{todayTasks.length}</span>
        </div>
        {INIT_TASKS.filter(t => !t.done).slice(0, 4).map(t => (
          <div key={t.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 10px", background:"#070B17", borderRadius:9, border:"1px solid #1E2D45", marginBottom:6 }}>
            <span style={{ fontSize:14 }}>{t.type==="call"?"📞":t.type==="whatsapp"?"💬":"🏠"}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.contact}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.note}</div>
            </div>
            <span style={{ fontSize:9, color:t.today?"#FFA000":"rgba(255,255,255,0.3)", flexShrink:0 }}>{t.due.replace("היום ","")}</span>
          </div>
        ))}
        <button onClick={() => nav("/tasks")} style={{ width:"100%", marginTop:8, padding:"7px", background:"rgba(255,255,255,0.03)", border:"1px solid #1E2D45", borderRadius:9, color:"rgba(255,255,255,0.4)", fontSize:11, cursor:"pointer" }}>
          כל המשימות →
        </button>
      </Card>
    </div>
  );
}

// ─── Signals ─────────────────────────────────────────────────
export function Signals() {
  const [expanded, setExpanded] = useState(null);
  const [insights, setInsights] = useState({});
  const [analyzing, setAnalyzing] = useState(null);
  const [saved, setSaved] = useState({});
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const filtered = SIGNALS.filter(s => {
    if (filter === "all") return true;
    if (filter === "hot") return s.score >= 85;
    return s.type === filter;
  });

  async function toggleSignal(s) {
    if (expanded === s.id) { setExpanded(null); return; }
    setExpanded(s.id);
    if (insights[s.id]) return;
    setAnalyzing(s.id);
    try {
      const txt = await askGemini(PROMPTS.signalInsight(s));
      setInsights(prev => ({ ...prev, [s.id]: txt }));
    } catch(e) {
      setInsights(prev => ({ ...prev, [s.id]: "⚠️ " + e.message }));
    }
    setAnalyzing(null);
  }

  return (
    <div style={{ padding:18 }}>
      {toast && <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"#0D1526", border:"1px solid rgba(255,87,34,0.4)", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:500, zIndex:9999, whiteSpace:"nowrap" }}>✓ {toast}</div>}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <h1 style={{ fontSize:19, fontWeight:800, color:"#fff", margin:0 }}>⚡ סיגנלים</h1>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)", margin:"3px 0 0" }}>{SIGNALS.length} נכסים · {SIGNALS.filter(s=>s.score>=80).length} חמים · תל אביב</p>
        </div>
        <Btn variant="secondary" onClick={() => showToast("מרענן...")}>🔄 רענן</Btn>
      </div>

      <div style={{ display:"flex", gap:7, marginBottom:14, flexWrap:"wrap" }}>
        {[["all","הכל"],["hot","🔥 חמים"],["price_drop","📉 ירידת מחיר"],["long_market","⏳ זמן רב"],["new_listing","✨ חדשים"],["motivated_seller","💡 מוטיבציה"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding:"5px 12px", borderRadius:9, border:"1px solid", fontSize:11, fontWeight:500, cursor:"pointer", transition:"all 0.15s", background:filter===k?"#FF5722":"#0D1526", borderColor:filter===k?"#FF5722":"#1E2D45", color:filter===k?"#fff":"rgba(255,255,255,0.45)" }}>{l}</button>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(s => {
          const open = expanded === s.id;
          const isSaved = !!saved[s.id];
          return (
            <div key={s.id} style={{ background:"#0D1526", border:`1px solid ${open?"rgba(255,87,34,0.3)":"#1E2D45"}`, borderRadius:15, overflow:"hidden", transition:"all 0.2s" }}>
              <div onClick={() => toggleSignal(s)} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 15px", cursor:"pointer" }}>
                <Ring score={s.score} size={50}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{s.address}</span>
                    <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:99, background:`${sColor(s.score)}12`, color:sColor(s.score), border:`1px solid ${sColor(s.score)}20` }}>{s.tag}</span>
                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)", marginRight:"auto" }}>{s.lastActivity}</span>
                  </div>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,0.5)", margin:"0 0 7px", lineHeight:1.4 }}>{s.reason}</p>
                  <div style={{ display:"flex", gap:10, flexWrap:"wrap", fontSize:11 }}>
                    <span style={{ color:"rgba(255,255,255,0.4)" }}>{s.rooms} חד׳ · {s.size}מ"ר · ק׳{s.floor}</span>
                    <span style={{ fontWeight:700, color:"#fff" }}>{fmtFull(s.price)}</span>
                    {s.change && <span style={{ color:"#F44336", fontWeight:700 }}>↓{fmtFull(s.change)}</span>}
                    <span style={{ color:"rgba(255,255,255,0.3)" }}>{s.daysOnMarket} ימים</span>
                    <span style={{ color:"#00BFA5", fontWeight:600, marginRight:"auto" }}>👥{s.matchingBuyers}</span>
                  </div>
                </div>
                <span style={{ color:"rgba(255,255,255,0.2)", flexShrink:0 }}>{open?"▴":"▾"}</span>
              </div>

              {open && (
                <div style={{ borderTop:"1px solid #1E2D45", padding:"13px 15px", display:"flex", flexDirection:"column", gap:11 }}>
                  <AIBox text={insights[s.id] || ""} loading={analyzing === s.id}/>
                  <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                    <Btn href={`tel:${s.ownerPhone}`} style={{ flex:1, minWidth:110 }}>📞 {s.ownerName}</Btn>
                    <Btn variant="green" href={waLink(s.ownerPhone)} target="_blank">💬 WhatsApp</Btn>
                    <button onClick={() => showToast(`נמצאו ${s.matchingBuyers} קונים תואמים`)} style={{ background:"rgba(41,121,255,0.1)", color:"#2979FF", border:"1px solid rgba(41,121,255,0.2)", borderRadius:10, padding:"10px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>👥 {s.matchingBuyers}</button>
                    <button onClick={() => { setSaved(p => ({ ...p, [s.id]:!p[s.id] })); showToast(isSaved?"הוסר":"נשמר ✓"); }} style={{ background:isSaved?"rgba(0,191,165,0.1)":"rgba(255,255,255,0.04)", color:isSaved?"#00BFA5":"rgba(255,255,255,0.4)", border:`1px solid ${isSaved?"rgba(0,191,165,0.25)":"#1E2D45"}`, borderRadius:10, padding:"10px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>{isSaved?"✓":"🔖"}</button>
                  </div>
                  <button onClick={() => nav(`/signals/${s.id}`)} style={{ width:"100%", padding:"8px", background:"rgba(255,255,255,0.03)", border:"1px solid #1E2D45", borderRadius:9, color:"rgba(255,255,255,0.4)", fontSize:11, cursor:"pointer" }}>
                    פרטים מלאים + היסטוריה + CRM →
                  </button>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.2)", borderTop:"1px solid #1E2D45", paddingTop:8 }}>
                    מקור: {s.source} · ציון: {s.score}/100 · {s.daysOnMarket} ימים
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pipeline ────────────────────────────────────────────────
export function Pipeline() {
  const [deals, setDeals] = useState(PIPELINE);
  const [toast, setToast] = useState("");
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const total = deals.reduce((s,d)=>s+d.value,0);
  const exp   = deals.reduce((s,d)=>s+d.value*d.prob/100,0);

  function move(id, dir) {
    setDeals(p => p.map(d => {
      if (d.id !== id) return d;
      const i = STAGES.indexOf(d.stage);
      return { ...d, stage: STAGES[Math.max(0, Math.min(STAGES.length-1, i+dir))] };
    }));
    showToast(dir > 0 ? "הועבר קדימה ✓" : "הועבר אחורה");
  }

  return (
    <div style={{ padding:18 }}>
      {toast && <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"#0D1526", border:"1px solid rgba(255,87,34,0.4)", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:500, zIndex:9999 }}>✓ {toast}</div>}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <h1 style={{ fontSize:19, fontWeight:800, color:"#fff", margin:0 }}>🔀 פייפליין</h1>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)", margin:"3px 0 0" }}>כולל: <span style={{ color:"#fff", fontWeight:600 }}>{fmt(total)}</span> · צפי: <span style={{ color:"#00BFA5", fontWeight:600 }}>{fmt(exp)}</span></p>
        </div>
        <Btn onClick={() => showToast("בקרוב")}>+ חדש</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:7, marginBottom:14 }}>
        {STAGES.map(stage => (
          <Card key={stage} style={{ padding:"9px 6px", textAlign:"center" }}>
            <div style={{ fontSize:17, fontWeight:800, color:"#fff" }}>{deals.filter(d=>d.stage===stage).length}</div>
            <div style={{ fontSize:9, fontWeight:700, color:stColor(stage), marginTop:2 }}>{stLabel(stage)}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:9, overflowX:"auto" }}>
        {STAGES.map(stage => {
          const col = stColor(stage);
          return (
            <div key={stage}>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:7 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:col }}/>
                <span style={{ fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.45)" }}>{stLabel(stage)}</span>
              </div>
              {deals.filter(d => d.stage === stage).map(d => (
                <Card key={d.id} style={{ padding:11, marginBottom:8 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#fff", marginBottom:2 }}>{d.title}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>{d.owner}</div>
                  <div style={{ fontSize:13, fontWeight:800, color:"#fff", marginBottom:7 }}>{fmt(d.value)}</div>
                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>סבירות</span>
                      <span style={{ fontSize:9, fontWeight:700, color:col }}>{d.prob}%</span>
                    </div>
                    <div style={{ height:3, background:"#1E2D45", borderRadius:2 }}>
                      <div style={{ height:"100%", width:`${d.prob}%`, background:col, borderRadius:2 }}/>
                    </div>
                  </div>
                  <div style={{ background:"#070B17", border:"1px solid #1E2D45", borderRadius:7, padding:"7px 8px", marginBottom:8 }}>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)" }}>הבא</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.7)", marginTop:1 }}>{d.next}</div>
                    <div style={{ fontSize:9, color:"#FFA000", marginTop:1 }}>{d.date}</div>
                  </div>
                  <div style={{ display:"flex", gap:5 }}>
                    <a href={`tel:${d.phone}`} style={{ flex:1, padding:"5px", background:"rgba(255,255,255,0.04)", border:"1px solid #1E2D45", borderRadius:7, color:"rgba(255,255,255,0.5)", fontSize:10, textDecoration:"none", textAlign:"center" }}>📞</a>
                    <button onClick={() => move(d.id,-1)} style={{ padding:"5px 8px", background:"rgba(41,121,255,0.08)", border:"1px solid rgba(41,121,255,0.15)", borderRadius:7, color:"#2979FF", fontSize:10, cursor:"pointer" }}>←</button>
                    <button onClick={() => move(d.id, 1)} style={{ padding:"5px 8px", background:"rgba(255,87,34,0.08)", border:"1px solid rgba(255,87,34,0.15)", borderRadius:7, color:"#FF5722", fontSize:10, cursor:"pointer" }}>→</button>
                  </div>
                </Card>
              ))}
              <button onClick={() => showToast("בקרוב")} style={{ width:"100%", padding:"8px", border:"1px dashed #1E2D45", borderRadius:9, background:"none", color:"rgba(255,255,255,0.2)", fontSize:11, cursor:"pointer" }}>+</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Buyers ──────────────────────────────────────────────────
function BuyerCRMLog({ buyerId }) {
  const { addLog, getLogs } = useCRM();
  const [note, setNote] = useState("");
  const [type, setType] = useState("call");
  const logs = getLogs(`buyer_${buyerId}`);

  function add() {
    if (!note.trim()) return;
    addLog(`buyer_${buyerId}`, { type, note: note.trim() });
    setNote("");
  }

  return (
    <Card style={{ padding:14 }}>
      <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:11 }}>📋 יומן פעילות</div>
      <div style={{ display:"flex", gap:7, marginBottom:10 }}>
        <select value={type} onChange={e=>setType(e.target.value)} style={{ background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"8px 9px", color:"#fff", fontSize:11, outline:"none", flexShrink:0 }}>
          {Object.entries(CRM_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
        </select>
        <input value={note} onChange={e=>setNote(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="הוסף פעילות..." style={{ flex:1, background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"8px 11px", color:"#fff", fontSize:11, outline:"none", direction:"rtl" }}/>
        <button onClick={add} disabled={!note.trim()} style={{ padding:"8px 12px", background:note.trim()?"linear-gradient(135deg,#FF5722,#FFA000)":"#1E2D45", border:"none", borderRadius:9, color:"#fff", fontSize:14, cursor:note.trim()?"pointer":"default" }}>+</button>
      </div>
      {logs.length===0
        ? <div style={{ textAlign:"center", padding:"16px 0", color:"rgba(255,255,255,0.2)", fontSize:11 }}>אין פעילות עדיין</div>
        : <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {logs.map(log=>{
              const t=CRM_TYPES[log.type]||CRM_TYPES.note;
              return (
                <div key={log.id} style={{ display:"flex", gap:8, padding:"9px 11px", background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, alignItems:"flex-start" }}>
                  <span style={{ fontSize:13, flexShrink:0 }}>{t.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.85)" }}>{log.note}</div>
                    <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{fmtTs(log.ts)}</div>
                  </div>
                  <span style={{ fontSize:8, fontWeight:700, color:t.color, padding:"1px 6px", borderRadius:99, background:`${t.color}15`, whiteSpace:"nowrap" }}>{t.label}</span>
                </div>
              );
            })}
          </div>
      }
    </Card>
  );
}

export function Buyers() {
  const [sel, setSel] = useState(null);
  const [matchTxt, setMatchTxt] = useState("");
  const [matching, setMatching] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const buyer = BUYERS.find(b => b.id === sel);
  const matches = buyer ? SIGNALS.filter(s => s.price >= buyer.bMin && s.price <= buyer.bMax && s.rooms >= buyer.rMin && s.rooms <= buyer.rMax) : [];

  async function sendToClient(b, s) {
    setMatching(true); setMatchTxt("");
    try {
      const txt = await askGemini(PROMPTS.buyerMatch(b, s));
      setMatchTxt(txt);
    } catch(e) { setMatchTxt("שגיאה: " + e.message); }
    setMatching(false);
  }

  return (
    <div style={{ padding:18 }}>
      {toast && <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"#0D1526", border:"1px solid rgba(255,87,34,0.4)", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:500, zIndex:9999 }}>✓ {toast}</div>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <h1 style={{ fontSize:19, fontWeight:800, color:"#fff", margin:0 }}>👥 קונים</h1>
        <Btn onClick={() => showToast("בקרוב")}>+ חדש</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0,2fr) minmax(0,3fr)", gap:14 }}>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {BUYERS.map(b => (
            <Card key={b.id} onClick={() => { setSel(sel===b.id?null:b.id); setMatchTxt(""); }} style={{ padding:13, cursor:"pointer", border:`1px solid ${sel===b.id?"rgba(41,121,255,0.35)":"#1E2D45"}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <div style={{ width:38, height:38, borderRadius:"50%", background:b.status==="hot"?"linear-gradient(135deg,#F44336,#FF5722)":"linear-gradient(135deg,#2979FF,#7C4DFF)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, color:"#fff", flexShrink:0 }}>{b.name[0]}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:12, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.name}</span>
                    {b.status==="hot"&&<span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:99, background:"rgba(244,67,54,0.12)", color:"#F44336" }}>🔥</span>}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{fmt(b.bMin)}–{fmt(b.bMax)}</div>
                  <div style={{ fontSize:10, color:"#00BFA5", fontWeight:600, marginTop:3 }}>⚡ {SIGNALS.filter(s=>s.price>=b.bMin&&s.price<=b.bMax&&s.rooms>=b.rMin&&s.rooms<=b.rMax).length} תואמים</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        <div>
          {buyer ? (
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <Card style={{ padding:16 }}>
                <div style={{ display:"flex", alignItems:"start", justifyContent:"space-between", marginBottom:14 }}>
                  <h2 style={{ fontSize:15, fontWeight:800, color:"#fff", margin:0 }}>{buyer.name}</h2>
                  <div style={{ display:"flex", gap:7 }}>
                    <Btn href={`tel:${buyer.phone}`} style={{ padding:"7px 13px", fontSize:12 }}>📞</Btn>
                    <Btn variant="green" href={waLink(buyer.phone)} target="_blank" style={{ padding:"7px 13px", fontSize:12 }}>💬</Btn>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:11 }}>
                  {[{l:"תקציב",v:`${fmt(buyer.bMin)}–${fmt(buyer.bMax)}`},{l:"חדרים",v:`${buyer.rMin}–${buyer.rMax} חד׳`}].map(({l,v})=>(
                    <div key={l} style={{ background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"8px 10px" }}>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginBottom:2 }}>{l}</div>
                      <div style={{ fontSize:12, fontWeight:500, color:"#fff" }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background:"rgba(255,160,0,0.06)", border:"1px solid rgba(255,160,0,0.15)", borderRadius:9, padding:10 }}>
                  <div style={{ fontSize:9, color:"#FFA000", fontWeight:700, marginBottom:3 }}>הערות</div>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.7)", margin:0 }}>{buyer.notes}</p>
                </div>
              </Card>
              <Card style={{ padding:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:11 }}>
                  <span>⚡</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>נכסים תואמים</span>
                  {matches.length>0&&<span style={{ fontSize:9, fontWeight:700, padding:"1px 7px", borderRadius:99, background:"rgba(244,67,54,0.12)", color:"#F44336" }}>{matches.length}</span>}
                </div>
                {matches.slice(0,3).map(s=>(
                  <div key={s.id} style={{ background:"#070B17", border:"1px solid #1E2D45", borderRadius:10, padding:11, marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:matchTxt?8:0 }}>
                      <div style={{ width:36, height:36, borderRadius:9, background:`${sColor(s.score)}12`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:sColor(s.score), flexShrink:0 }}>{s.score}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{s.address}</div>
                        <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>{s.rooms} חד׳ · {fmtFull(s.price)}</div>
                      </div>
                      <button onClick={() => sendToClient(buyer,s)} disabled={matching} style={{ background:"rgba(0,191,165,0.1)", color:"#00BFA5", border:"1px solid rgba(0,191,165,0.2)", borderRadius:8, padding:"6px 11px", fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
                        {matching?<Spinner size={12}/>:"שלח ללקוח"}
                      </button>
                    </div>
                    {matchTxt&&(
                      <>
                        <div style={{ background:"rgba(255,87,34,0.06)", border:"1px solid rgba(255,87,34,0.15)", borderRadius:9, padding:11, marginTop:8 }}>
                          <p style={{ fontSize:12, color:"rgba(255,255,255,0.8)", lineHeight:1.7, margin:0, whiteSpace:"pre-wrap" }}>{matchTxt}</p>
                        </div>
                        <Btn variant="green" href={waLink(buyer.phone)+`?text=${encodeURIComponent(matchTxt)}`} target="_blank" style={{ width:"100%", marginTop:8, padding:"8px", fontSize:12 }}>📤 שלח ב-WhatsApp</Btn>
                      </>
                    )}
                  </div>
                ))}
              </Card>
            </div>
          ) : (
            <Card style={{ height:200, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", color:"rgba(255,255,255,0.2)" }}>
              <span style={{ fontSize:32, marginBottom:8 }}>👥</span>
              <p style={{ fontSize:13 }}>בחר קונה לצפייה</p>
            </Card>
          )}
          {buyer && <BuyerCRMLog buyerId={buyer.id} />}
        </div>
      </div>
    </div>
  );
}

// ─── Tasks ───────────────────────────────────────────────────
export function Tasks() {
  const [items, setItems] = useState(INIT_TASKS);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ contact:"", phone:"", type:"call", due:"", note:"" });
  const [toast, setToast] = useState("");
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };
  const TICON  = { call:"📞", whatsapp:"💬", visit:"🏠" };
  const TCOLOR = { call:"#2979FF", whatsapp:"#00BFA5", visit:"#FFA000" };

  function markDone(id) { setItems(p => p.map(t => t.id===id?{...t,done:true}:t)); showToast("סומן כבוצע ✓"); }
  function addTask() {
    if (!form.contact) return;
    setItems(p => [{ ...form, id:`t${Date.now()}`, today:true, done:false }, ...p]);
    setForm({ contact:"", phone:"", type:"call", due:"", note:"" });
    setShowAdd(false); showToast("משימה נוספה ✓");
  }

  const pending = items.filter(t => !t.done);
  const done    = items.filter(t => t.done);

  return (
    <div style={{ padding:18 }}>
      {toast && <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"#0D1526", border:"1px solid rgba(255,87,34,0.4)", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:500, zIndex:9999 }}>✓ {toast}</div>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
        <div>
          <h1 style={{ fontSize:19, fontWeight:800, color:"#fff", margin:0 }}>🔔 פולו-אפ</h1>
          <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)", margin:"3px 0 0" }}><span style={{ color:"#FFA000", fontWeight:600 }}>{pending.filter(t=>t.today).length} להיום</span> · {pending.filter(t=>!t.today).length} קרובים</p>
        </div>
        <Btn onClick={() => setShowAdd(!showAdd)}>+ חדש</Btn>
      </div>

      {showAdd && (
        <Card style={{ padding:15, marginBottom:14, border:"1px solid rgba(255,87,34,0.2)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
            {[{k:"contact",l:"שם",ph:"דוד כהן"},{k:"phone",l:"טלפון",ph:"054-0000000"},{k:"due",l:"מועד",ph:"היום 18:00"}].map(f=>(
              <div key={f.k}>
                <label style={{ fontSize:10, color:"rgba(255,255,255,0.4)", display:"block", marginBottom:3 }}>{f.l}</label>
                <input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={{ width:"100%", background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"9px 12px", color:"#fff", fontSize:12, outline:"none", direction:"rtl" }}/>
              </div>
            ))}
            <div>
              <label style={{ fontSize:10, color:"rgba(255,255,255,0.4)", display:"block", marginBottom:3 }}>סוג</label>
              <select value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))} style={{ width:"100%", background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"9px 12px", color:"#fff", fontSize:12, outline:"none" }}>
                <option value="call">📞 שיחה</option><option value="whatsapp">💬 WhatsApp</option><option value="visit">🏠 ביקור</option>
              </select>
            </div>
          </div>
          <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="הערה..." rows={2} style={{ width:"100%", background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"9px 12px", color:"#fff", fontSize:12, outline:"none", resize:"none", marginBottom:10, direction:"rtl" }}/>
          <div style={{ display:"flex", gap:8 }}>
            <Btn onClick={addTask}>הוסף</Btn>
            <Btn variant="ghost" onClick={() => setShowAdd(false)}>ביטול</Btn>
          </div>
        </Card>
      )}

      {[{label:"⚡ להיום",items:pending.filter(t=>t.today),color:"#FFA000"},{label:"📅 קרובים",items:pending.filter(t=>!t.today),color:"rgba(255,255,255,0.4)"}].map(group => group.items.length===0 ? null : (
        <div key={group.label} style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:group.color, marginBottom:8 }}>{group.label}</div>
          {group.items.map(t => (
            <Card key={t.id} style={{ padding:13, display:"flex", alignItems:"center", gap:11, marginBottom:8 }}>
              <div style={{ width:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, background:`${TCOLOR[t.type]||"#2979FF"}12`, flexShrink:0 }}>{TICON[t.type]||"📞"}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{t.contact}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.55)", marginTop:2 }}>{t.note}</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:5, flexShrink:0 }}>
                <span style={{ fontSize:9, fontWeight:600, color:t.today?"#FFA000":"rgba(255,255,255,0.3)" }}>{t.due}</span>
                <div style={{ display:"flex", gap:5 }}>
                  <a href={`tel:${t.phone}`} style={{ width:28, height:28, borderRadius:7, background:"rgba(41,121,255,0.1)", border:"1px solid rgba(41,121,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", fontSize:12 }}>📞</a>
                  <button onClick={() => markDone(t.id)} style={{ width:28, height:28, borderRadius:7, background:"rgba(0,191,165,0.1)", border:"1px solid rgba(0,191,165,0.2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:12 }}>✓</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}

      {done.length > 0 && (
        <div style={{ opacity:0.45 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.25)", marginBottom:8 }}>✓ בוצעו</div>
          {done.map(t => (
            <Card key={t.id} style={{ padding:13, display:"flex", alignItems:"center", gap:11, marginBottom:8 }}>
              <div style={{ width:38, height:38, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, background:"#1E2D45" }}>{TICON[t.type]}</div>
              <div style={{ flex:1 }}>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)", textDecoration:"line-through" }}>{t.contact}</span>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)" }}>{t.note}</div>
              </div>
              <span style={{ color:"#00BFA5", fontSize:16 }}>✓</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI Tools ────────────────────────────────────────────────
export function AITools() {
  const [tool, setTool] = useState("pitch");
  const [form, setForm] = useState({ address:"", owner:"", phone:"", days:"", price:"", rooms:"", size:"", floor:"" });
  const [sigId, setSigId] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  function loadSig(id) {
    const s = SIGNALS.find(x => x.id === id);
    if (!s) return;
    setSigId(id);
    setForm({ address:s.address, owner:s.ownerName, phone:s.ownerPhone, days:String(s.daysOnMarket), price:String(s.price), rooms:String(s.rooms), size:String(s.size), floor:String(s.floor) });
  }

  async function run() {
    if (!form.address) return;
    setLoading(true); setOut("");
    const { address, owner, days, price, rooms, size, floor } = form;
    const p = Number(price);
    const prompts = {
      pitch:    PROMPTS.pitch(address, owner, days, p),
      valuation:PROMPTS.valuation(address, rooms, size, floor, p),
      analyze:  PROMPTS.analyze(address, rooms, size, p, days),
      whatsapp: PROMPTS.whatsapp(owner, address, days),
    };
    try { setOut(await askGemini(prompts[tool])); }
    catch(e) { setOut("שגיאה: " + e.message); }
    setLoading(false);
  }

  async function copy() { await navigator.clipboard.writeText(out); setCopied(true); showToast("הועתק ✓"); setTimeout(()=>setCopied(false),2000); }

  const TOOLS = [
    {id:"pitch",icon:"🎯",label:"Pitch בלעדיות",color:"#FF5722"},
    {id:"valuation",icon:"🏠",label:"דוח שמאות",color:"#2979FF"},
    {id:"analyze",icon:"📊",label:"ניתוח נכס",color:"#FFA000"},
    {id:"whatsapp",icon:"💬",label:"הודעת WhatsApp",color:"#00BFA5"},
  ];

  return (
    <div style={{ padding:18 }}>
      {toast && <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"#0D1526", border:"1px solid rgba(255,87,34,0.4)", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:500, zIndex:9999 }}>✓ {toast}</div>}
      <div style={{ marginBottom:14 }}>
        <h1 style={{ fontSize:19, fontWeight:800, color:"#fff", margin:0 }}>🤖 כלי AI</h1>
        <p style={{ fontSize:11, color:"rgba(255,255,255,0.35)", margin:"3px 0 0" }}>מופעל על Gemini 2.0 Flash · חינמי</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:9, marginBottom:16 }}>
        {TOOLS.map(t => (
          <Card key={t.id} onClick={() => { setTool(t.id); setOut(""); }} style={{ padding:13, cursor:"pointer", border:`1px solid ${tool===t.id?`${t.color}45`:"#1E2D45"}` }}>
            <div style={{ fontSize:26, marginBottom:7 }}>{t.icon}</div>
            <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{t.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card style={{ padding:15 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff", marginBottom:11 }}>פרטי הנכס</div>
          <div style={{ marginBottom:11 }}>
            <label style={{ fontSize:10, color:"rgba(255,255,255,0.4)", display:"block", marginBottom:3 }}>טעינה מסיגנל</label>
            <select value={sigId} onChange={e=>loadSig(e.target.value)} style={{ width:"100%", background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"9px 12px", color:"#fff", fontSize:12, outline:"none", direction:"rtl" }}>
              <option value="">בחר סיגנל...</option>
              {SIGNALS.map(s=><option key={s.id} value={s.id}>{s.address.slice(0,28)} · {s.score}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
            {[{k:"address",l:"כתובת",ph:"רחוב ויצמן 14"},{k:"owner",l:"שם בעל נכס",ph:"דוד כהן"},{k:"price",l:"מחיר (₪)",ph:"3200000"},{k:"days",l:"ימים בשוק",ph:"67"},{k:"rooms",l:"חדרים",ph:"3.5"},{k:"size",l:"שטח מ\"ר",ph:"88"}].map(f=>(
              <div key={f.k}>
                <label style={{ fontSize:10, color:"rgba(255,255,255,0.4)", display:"block", marginBottom:3 }}>{f.l}</label>
                <input value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={{ width:"100%", background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"9px 12px", color:"#fff", fontSize:12, outline:"none", direction:"rtl" }}
                  onFocus={e=>e.target.style.borderColor="rgba(255,87,34,0.4)"} onBlur={e=>e.target.style.borderColor="#1E2D45"}/>
              </div>
            ))}
          </div>
          <Btn onClick={run} disabled={loading||!form.address} style={{ width:"100%", marginTop:13, padding:"11px", fontSize:13, justifyContent:"center", opacity:loading||!form.address?0.5:1 }}>
            {loading?<><Spinner size={14}/> מייצר...</>:`✨ יצור ${TOOLS.find(t=>t.id===tool)?.label}`}
          </Btn>
        </Card>

        <Card style={{ padding:15, display:"flex", flexDirection:"column" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:11 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>תוצאה</span>
            {out && <button onClick={copy} style={{ padding:"4px 11px", background:"rgba(255,255,255,0.05)", border:"1px solid #1E2D45", borderRadius:7, color:copied?"#00BFA5":"rgba(255,255,255,0.5)", fontSize:11, cursor:"pointer" }}>{copied?"✓ הועתק":"📋 העתק"}</button>}
          </div>
          <div style={{ background:"#070B17", border:"1px solid #1E2D45", borderRadius:11, padding:13, flex:1, minHeight:280 }}>
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, gap:12 }}>
                <Spinner size={24}/>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)" }}>Gemini מעבד...</span>
              </div>
            ) : out ? (
              <pre style={{ fontSize:13, color:"rgba(255,255,255,0.82)", lineHeight:1.8, whiteSpace:"pre-wrap", fontFamily:"inherit", margin:0 }}>{out}</pre>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, color:"rgba(255,255,255,0.15)", textAlign:"center" }}>
                <span style={{ fontSize:36, marginBottom:8 }}>✨</span>
                <p style={{ fontSize:13 }}>הזן פרטים ולחץ יצור</p>
              </div>
            )}
          </div>
          {out && form.phone && (
            <Btn variant="green" href={waLink(form.phone)+`?text=${encodeURIComponent(out)}`} target="_blank" style={{ width:"100%", marginTop:11, padding:"10px", fontSize:13, justifyContent:"center" }}>
              📤 שלח WhatsApp
            </Btn>
          )}
        </Card>
      </div>
    </div>
  );
}

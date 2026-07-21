import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fmt, fmtFull, sColor, stColor, stLabel, waLink, STAGES } from "../lib/data";
import { Ring, Spinner, AIBox, Btn, Card, Toast } from "../components/UI";
import { askGemini, PROMPTS, getGeminiKey, setGeminiKey } from "../hooks/useGemini";
import { useCRM, CRM_TYPES, fmtTs } from "../hooks/useCRM";
import { useSignals, useBuyers, usePipeline, useTasks, matchScore } from "../hooks/useStore";

// ─── Shared styles ────────────────────────────────────────────
const S = {
  input: { width:"100%", background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"10px 12px", color:"#fff", fontSize:13, outline:"none", direction:"rtl", boxSizing:"border-box" },
  label: { fontSize:11, color:"rgba(255,255,255,0.45)", marginBottom:4, display:"block" },
  row:   { display:"flex", flexDirection:"column", gap:4, marginBottom:12 },
  sel:   { width:"100%", background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, padding:"10px 12px", color:"#fff", fontSize:13, outline:"none", boxSizing:"border-box" },
};

// ─── Modal ────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:"#0D1526", border:"1px solid #1E2D45", borderRadius:"18px 18px 0 0", width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto", padding:20, direction:"rtl" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <span style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.4)", fontSize:20, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────
function Confirm({ msg, onYes, onNo }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1100, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#0D1526", border:"1px solid #1E2D45", borderRadius:16, padding:24, maxWidth:320, width:"100%", textAlign:"center", direction:"rtl" }}>
        <div style={{ fontSize:14, color:"rgba(255,255,255,0.8)", marginBottom:20 }}>{msg}</div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          <Btn onClick={onYes} variant="primary" style={{ minWidth:80 }}>מחק</Btn>
          <Btn onClick={onNo} variant="ghost" style={{ minWidth:80 }}>ביטול</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Signal form ──────────────────────────────────────────────
const TYPE_OPTIONS = [
  { v:"price_drop",       l:"ירידת מחיר" },
  { v:"new_listing",      l:"מודעה חדשה" },
  { v:"long_market",      l:"זמן רב בשוק" },
  { v:"motivated_seller", l:"חם מאוד" },
  { v:"hot_area",         l:"אזור חם" },
];
const TAG_MAP = { price_drop:"ירידת מחיר", new_listing:"חדש", long_market:"זמן רב", motivated_seller:"חם מאוד", hot_area:"אזור חם" };
const REASON_MAP = {
  price_drop:       () => "ירידת מחיר — בעל נכס בלחץ",
  new_listing:      () => "מודעה חדשה — מתחת למחיר שוק",
  long_market:      (f) => `${f.daysOnMarket} יום בשוק — ממוצע האזור 42 יום`,
  motivated_seller: () => 'שינוי תיאור מודעה — "סיבות אישיות"',
  hot_area:         () => "אזור חם — עסקאות רבות לאחרונה",
};

function SignalForm({ initial, onSave, onClose }) {
  const blank = { address:"", area:"", rooms:"3", size:"", floor:"1", price:"", prevPrice:"", ownerName:"", ownerPhone:"", type:"price_drop", daysOnMarket:"1", source:"יד2 / מדלן" };
  const [f, setF] = useState(initial ? {
    ...initial,
    rooms: String(initial.rooms), size: String(initial.size), floor: String(initial.floor),
    price: String(initial.price), prevPrice: initial.prevPrice ? String(initial.prevPrice) : "",
    daysOnMarket: String(initial.daysOnMarket),
  } : blank);
  function ch(k, v) { setF(p => ({ ...p, [k]: v })); }
  function save() {
    if (!f.address.trim() || !f.price) return;
    const price = Number(f.price);
    const prevPrice = f.prevPrice ? Number(f.prevPrice) : null;
    const daysOnMarket = Number(f.daysOnMarket) || 1;
    onSave({
      ...initial,
      address: f.address.trim(), area: f.area.trim() || f.address.split(",")[0],
      rooms: Number(f.rooms) || 3, size: Number(f.size) || 80, floor: Number(f.floor) || 1,
      price, prevPrice, change: prevPrice ? prevPrice - price : null,
      daysOnMarket, type: f.type, tag: TAG_MAP[f.type], reason: REASON_MAP[f.type](f),
      ownerName: f.ownerName.trim() || "בעל נכס", ownerPhone: f.ownerPhone.trim() || "050-0000000",
      source: f.source || "יד2 / מדלן", lastActivity: "עכשיו", matchingBuyers: 0,
      score: Math.min(97, 50 + (prevPrice ? 18 : 0) + (daysOnMarket > 60 ? 20 : daysOnMarket < 3 ? 8 : 0) + (f.type === "motivated_seller" ? 10 : 0)),
    });
  }
  return (
    <div>
      <div style={S.row}><label style={S.label}>כתובת *</label><input style={S.input} value={f.address} onChange={e => ch("address", e.target.value)} placeholder="רחוב הרצל 15, תל אביב" /></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div style={S.row}><label style={S.label}>אזור</label><input style={S.input} value={f.area} onChange={e => ch("area", e.target.value)} placeholder="רמת גן" /></div>
        <div style={S.row}><label style={S.label}>סוג סיגנל</label><select style={S.sel} value={f.type} onChange={e => ch("type", e.target.value)}>{TYPE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
        <div style={S.row}><label style={S.label}>מחיר (₪) *</label><input style={S.input} type="number" value={f.price} onChange={e => ch("price", e.target.value)} placeholder="3500000" /></div>
        <div style={S.row}><label style={S.label}>מחיר קודם (₪)</label><input style={S.input} type="number" value={f.prevPrice} onChange={e => ch("prevPrice", e.target.value)} placeholder="אופציונלי" /></div>
        <div style={S.row}><label style={S.label}>חדרים</label><input style={S.input} type="number" step="0.5" value={f.rooms} onChange={e => ch("rooms", e.target.value)} /></div>
        <div style={S.row}><label style={S.label}>שטח מ"ר</label><input style={S.input} type="number" value={f.size} onChange={e => ch("size", e.target.value)} /></div>
        <div style={S.row}><label style={S.label}>קומה</label><input style={S.input} type="number" value={f.floor} onChange={e => ch("floor", e.target.value)} /></div>
        <div style={S.row}><label style={S.label}>ימים בשוק</label><input style={S.input} type="number" value={f.daysOnMarket} onChange={e => ch("daysOnMarket", e.target.value)} /></div>
        <div style={S.row}><label style={S.label}>שם בעל נכס</label><input style={S.input} value={f.ownerName} onChange={e => ch("ownerName", e.target.value)} placeholder="ישראל ישראלי" /></div>
        <div style={S.row}><label style={S.label}>טלפון בעל נכס</label><input style={S.input} value={f.ownerPhone} onChange={e => ch("ownerPhone", e.target.value)} placeholder="052-0000000" /></div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <Btn onClick={save} style={{ flex:1, justifyContent:"center" }} disabled={!f.address.trim() || !f.price}>{initial ? "שמור שינויים" : "הוסף נכס"}</Btn>
        <Btn variant="ghost" onClick={onClose} style={{ flex:1, justifyContent:"center" }}>ביטול</Btn>
      </div>
    </div>
  );
}

// ─── Buyer form ───────────────────────────────────────────────
function BuyerForm({ initial, onSave, onClose }) {
  const blank = { name:"", phone:"", bMin:"", bMax:"", rMin:"2", rMax:"4", status:"active", notes:"" };
  const [f, setF] = useState(initial ? { ...initial, bMin:String(initial.bMin), bMax:String(initial.bMax), rMin:String(initial.rMin), rMax:String(initial.rMax) } : blank);
  function ch(k, v) { setF(p => ({ ...p, [k]: v })); }
  function save() {
    if (!f.name.trim() || !f.bMin || !f.bMax) return;
    onSave({ ...initial, name:f.name.trim(), phone:f.phone.trim(), bMin:Number(f.bMin), bMax:Number(f.bMax), rMin:Number(f.rMin)||2, rMax:Number(f.rMax)||4, status:f.status, notes:f.notes.trim() });
  }
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div style={{ ...S.row, gridColumn:"1/-1" }}><label style={S.label}>שם קונה *</label><input style={S.input} value={f.name} onChange={e => ch("name", e.target.value)} placeholder="ישראל ישראלי" /></div>
        <div style={S.row}><label style={S.label}>טלפון</label><input style={S.input} value={f.phone} onChange={e => ch("phone", e.target.value)} placeholder="052-0000000" /></div>
        <div style={S.row}><label style={S.label}>סטטוס</label><select style={S.sel} value={f.status} onChange={e => ch("status", e.target.value)}><option value="hot">🔥 חם</option><option value="active">✅ פעיל</option><option value="passive">😴 פסיבי</option></select></div>
        <div style={S.row}><label style={S.label}>תקציב מינימום (₪)</label><input style={S.input} type="number" value={f.bMin} onChange={e => ch("bMin", e.target.value)} placeholder="2000000" /></div>
        <div style={S.row}><label style={S.label}>תקציב מקסימום (₪)</label><input style={S.input} type="number" value={f.bMax} onChange={e => ch("bMax", e.target.value)} placeholder="4000000" /></div>
        <div style={S.row}><label style={S.label}>חדרים מינימום</label><input style={S.input} type="number" step="0.5" value={f.rMin} onChange={e => ch("rMin", e.target.value)} /></div>
        <div style={S.row}><label style={S.label}>חדרים מקסימום</label><input style={S.input} type="number" step="0.5" value={f.rMax} onChange={e => ch("rMax", e.target.value)} /></div>
        <div style={{ ...S.row, gridColumn:"1/-1" }}><label style={S.label}>הערות</label><textarea style={{ ...S.input, minHeight:72, resize:"vertical" }} value={f.notes} onChange={e => ch("notes", e.target.value)} placeholder="דרישות מיוחדות, אזורים מועדפים..." /></div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <Btn onClick={save} style={{ flex:1, justifyContent:"center" }} disabled={!f.name.trim() || !f.bMin || !f.bMax}>{initial ? "שמור שינויים" : "הוסף קונה"}</Btn>
        <Btn variant="ghost" onClick={onClose} style={{ flex:1, justifyContent:"center" }}>ביטול</Btn>
      </div>
    </div>
  );
}

// ─── Deal form ────────────────────────────────────────────────
function DealForm({ initial, onSave, onClose }) {
  const blank = { title:"", owner:"", phone:"", value:"", stage:"lead", commissionRate:"2", next:"", date:"" };
  const [f, setF] = useState(initial ? { ...initial, value:String(initial.value), commissionRate:String(initial.commissionRate ?? 2) } : blank);
  function ch(k, v) { setF(p => ({ ...p, [k]: v })); }
  const commission = f.value && f.commissionRate ? Math.round(Number(f.value) * Number(f.commissionRate) / 100) : 0;
  function save() {
    if (!f.title.trim() || !f.value) return;
    const prob = { lead:20, contact:35, visit:50, offer:65, exclusive:80, contract:92 }[f.stage] || 50;
    onSave({ ...initial, title:f.title.trim(), owner:f.owner.trim(), phone:f.phone.trim(), value:Number(f.value), stage:f.stage, commissionRate:Number(f.commissionRate)||2, next:f.next.trim(), date:f.date.trim(), prob });
  }
  return (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div style={{ ...S.row, gridColumn:"1/-1" }}><label style={S.label}>כתובת / שם נכס *</label><input style={S.input} value={f.title} onChange={e => ch("title", e.target.value)} placeholder="רחוב הרצל 15" /></div>
        <div style={S.row}><label style={S.label}>שם בעל נכס</label><input style={S.input} value={f.owner} onChange={e => ch("owner", e.target.value)} /></div>
        <div style={S.row}><label style={S.label}>טלפון</label><input style={S.input} value={f.phone} onChange={e => ch("phone", e.target.value)} /></div>
        <div style={S.row}><label style={S.label}>שווי עסקה (₪) *</label><input style={S.input} type="number" value={f.value} onChange={e => ch("value", e.target.value)} /></div>
        <div style={S.row}><label style={S.label}>עמלה (%)</label><input style={S.input} type="number" step="0.1" min="0" max="5" value={f.commissionRate} onChange={e => ch("commissionRate", e.target.value)} /></div>
        {commission > 0 && <div style={{ gridColumn:"1/-1", fontSize:12, color:"#00BFA5", fontWeight:700, marginBottom:4 }}>עמלה צפויה: {fmtFull(commission)}</div>}
        <div style={S.row}><label style={S.label}>שלב</label><select style={S.sel} value={f.stage} onChange={e => ch("stage", e.target.value)}>{STAGES.map(s => <option key={s} value={s}>{stLabel(s)}</option>)}</select></div>
        <div style={S.row}><label style={S.label}>פעולה הבאה</label><input style={S.input} value={f.next} onChange={e => ch("next", e.target.value)} placeholder="שיחת מעקב" /></div>
        <div style={{ ...S.row, gridColumn:"1/-1" }}><label style={S.label}>תאריך פעולה</label><input style={S.input} value={f.date} onChange={e => ch("date", e.target.value)} placeholder="מחר 10:00" /></div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:4 }}>
        <Btn onClick={save} style={{ flex:1, justifyContent:"center" }} disabled={!f.title.trim() || !f.value}>{initial ? "שמור" : "הוסף עסקה"}</Btn>
        <Btn variant="ghost" onClick={onClose} style={{ flex:1, justifyContent:"center" }}>ביטול</Btn>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────
export function Dashboard() {
  const nav = useNavigate();
  const { signals } = useSignals();
  const { buyers } = useBuyers();
  const { deals } = usePipeline();
  const { tasks } = useTasks();

  const hotSignals = signals.filter(s => s.score >= 85).length;
  const todayTasks = tasks.filter(t => t.today && !t.done).length;
  const activeDeals = deals.filter(d => d.stage !== "contract").length;
  const forecastCommission = deals.reduce((sum, d) => sum + d.value * (d.commissionRate ?? 2) / 100 * d.prob / 100, 0);
  const wonCommission = deals.filter(d => d.stage === "contract").reduce((sum, d) => sum + d.value * (d.commissionRate ?? 2) / 100, 0);

  const topSignals = [...signals].sort((a, b) => b.score - a.score).slice(0, 3);
  const todayList = tasks.filter(t => t.today && !t.done).slice(0, 4);

  const KPIS = [
    { label:"סיגנלים חמים",  value:hotSignals,              color:"#F44336", icon:"🔥" },
    { label:"עסקאות פעילות", value:activeDeals,             color:"#2979FF", icon:"📊" },
    { label:"קונים במערכת",  value:buyers.length,           color:"#7C4DFF", icon:"👥" },
    { label:"עמלה צפויה",    value:fmt(forecastCommission), color:"#00BFA5", icon:"💰" },
  ];

  return (
    <div style={{ padding:18, display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ fontSize:18, fontWeight:800, color:"#fff", margin:0 }}>שלום, יעקב 👋</h1>
          <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", margin:"4px 0 0" }}>סיכום יום</p>
        </div>
        {todayTasks > 0 && (
          <div onClick={() => nav("/tasks")} style={{ background:"rgba(255,87,34,0.12)", border:"1px solid rgba(255,87,34,0.3)", borderRadius:10, padding:"8px 12px", cursor:"pointer" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#FF5722" }}>{todayTasks} משימות היום</span>
          </div>
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {KPIS.map(k => (
          <Card key={k.label} style={{ padding:"14px 16px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:k.color }}>{k.value}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:3 }}>{k.label}</div>
              </div>
              <span style={{ fontSize:22 }}>{k.icon}</span>
            </div>
          </Card>
        ))}
      </div>

      {wonCommission > 0 && (
        <Card style={{ padding:"12px 16px", background:"rgba(0,191,165,0.07)", borderColor:"rgba(0,191,165,0.2)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.55)" }}>עמלות שנסגרו</span>
            <span style={{ fontSize:16, fontWeight:900, color:"#00BFA5" }}>{fmtFull(wonCommission)}</span>
          </div>
        </Card>
      )}

      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>🔥 סיגנלים חמים</span>
          <span onClick={() => nav("/signals")} style={{ fontSize:11, color:"#FF5722", cursor:"pointer" }}>הכל →</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {topSignals.map(s => (
            <Card key={s.id} onClick={() => nav(`/signals/${s.id}`)} style={{ padding:"12px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
              <Ring score={s.score} size={46} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.address}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{fmtFull(s.price)} · {s.daysOnMarket} יום</div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, padding:"3px 8px", borderRadius:99, background:`${sColor(s.score)}15`, color:sColor(s.score), border:`1px solid ${sColor(s.score)}25`, flexShrink:0 }}>{s.tag}</span>
            </Card>
          ))}
        </div>
      </div>

      {todayList.length > 0 && (
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>📋 משימות להיום</span>
            <span onClick={() => nav("/tasks")} style={{ fontSize:11, color:"#FF5722", cursor:"pointer" }}>הכל →</span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {todayList.map(t => (
              <Card key={t.id} style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:16 }}>{CRM_TYPES[t.type]?.icon || "📌"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:"#fff" }}>{t.contact}</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.note}</div>
                </div>
                <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", flexShrink:0 }}>{t.due}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div>
        <span style={{ fontSize:13, fontWeight:700, color:"#fff", display:"block", marginBottom:10 }}>📊 פיפליין</span>
        <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
          {STAGES.map(stage => {
            const count = deals.filter(d => d.stage === stage).length;
            return (
              <div key={stage} onClick={() => nav("/pipeline")} style={{ flex:"0 0 auto", minWidth:60, background:"#0D1526", border:"1px solid #1E2D45", borderRadius:10, padding:"10px 12px", textAlign:"center", cursor:"pointer" }}>
                <div style={{ fontSize:15, fontWeight:800, color:stColor(stage) }}>{count}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{stLabel(stage)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Signals ──────────────────────────────────────────────────
export function Signals() {
  const nav = useNavigate();
  const { signals, addSignal, updateSignal, deleteSignal } = useSignals();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editSig, setEditSig] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState("");
  const [savedIds, setSavedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem("seller_saved_v1") || "[]"); } catch { return []; }
  });

  function toggleSave(id) {
    const next = savedIds.includes(id) ? savedIds.filter(x => x !== id) : [...savedIds, id];
    setSavedIds(next);
    localStorage.setItem("seller_saved_v1", JSON.stringify(next));
  }

  const TYPE_FILTERS = [
    { k:"all", l:"הכל" }, { k:"price_drop", l:"ירידת מחיר" }, { k:"new_listing", l:"חדש" },
    { k:"long_market", l:"זמן רב" }, { k:"motivated_seller", l:"חם מאוד" }, { k:"hot_area", l:"אזור חם" },
  ];

  const visible = signals
    .filter(s => filter === "all" || s.type === filter)
    .filter(s => !search || s.address.includes(search) || (s.area || "").includes(search));

  return (
    <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      {addOpen && <Modal title="הוסף נכס חדש" onClose={() => setAddOpen(false)}><SignalForm onSave={s => { addSignal(s); setAddOpen(false); setToast("נכס נוסף ✓"); }} onClose={() => setAddOpen(false)} /></Modal>}
      {editSig && <Modal title="עריכת נכס" onClose={() => setEditSig(null)}><SignalForm initial={editSig} onSave={s => { updateSignal(s.id, s); setEditSig(null); setToast("נכס עודכן ✓"); }} onClose={() => setEditSig(null)} /></Modal>}
      {confirmDel && <Confirm msg={`למחוק את "${confirmDel.address}"?`} onYes={() => { deleteSignal(confirmDel.id); setConfirmDel(null); setToast("נכס נמחק"); }} onNo={() => setConfirmDel(null)} />}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:0 }}>סיגנלים <span style={{ color:"rgba(255,255,255,0.3)", fontWeight:400 }}>({visible.length})</span></h2>
        <Btn onClick={() => setAddOpen(true)} style={{ padding:"8px 14px" }}>+ הוסף נכס</Btn>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 חיפוש לפי כתובת / אזור..." style={{ ...S.input, padding:"10px 14px" }} />

      <div style={{ display:"flex", gap:7, overflowX:"auto", paddingBottom:2 }}>
        {TYPE_FILTERS.map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{ padding:"6px 13px", borderRadius:9, border:"1px solid", fontSize:11, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, background: filter === f.k ? "#FF5722" : "#0D1526", borderColor: filter === f.k ? "#FF5722" : "#1E2D45", color: filter === f.k ? "#fff" : "rgba(255,255,255,0.45)" }}>
            {f.l}
          </button>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {visible.map(s => {
          const col = sColor(s.score);
          const isSaved = savedIds.includes(s.id);
          return (
            <Card key={s.id} style={{ padding:"14px 15px" }}>
              <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                <Ring score={s.score} size={50} />
                <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => nav(`/signals/${s.id}`)}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:3 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{s.address}</span>
                    <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:99, background:`${col}12`, color:col, border:`1px solid ${col}20` }}>{s.tag}</span>
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginBottom:6 }}>{s.reason}</div>
                  <div style={{ display:"flex", gap:12, fontSize:12, flexWrap:"wrap" }}>
                    <span style={{ fontWeight:800, color:"#fff" }}>{fmtFull(s.price)}</span>
                    {s.change && <span style={{ color:"#F44336", fontWeight:700 }}>↓{fmt(s.change)}</span>}
                    <span style={{ color:"rgba(255,255,255,0.35)" }}>{s.rooms} חד׳ · {s.size}מ"ר · {s.daysOnMarket} ימים</span>
                  </div>
                </div>
              </div>
              <div style={{ display:"flex", gap:7, marginTop:11 }}>
                <Btn href={waLink(s.ownerPhone)} target="_blank" variant="green" style={{ flex:1, justifyContent:"center", padding:"8px 10px" }}>💬 WA</Btn>
                <Btn onClick={() => nav(`/signals/${s.id}`)} variant="secondary" style={{ flex:1, justifyContent:"center", padding:"8px 10px" }}>פרטים</Btn>
                <button onClick={() => toggleSave(s.id)} style={{ padding:"8px 11px", background: isSaved ? "rgba(0,191,165,0.1)" : "rgba(255,255,255,0.04)", color: isSaved ? "#00BFA5" : "rgba(255,255,255,0.4)", border:`1px solid ${isSaved ? "rgba(0,191,165,0.25)" : "#1E2D45"}`, borderRadius:9, fontSize:14, cursor:"pointer" }}>{isSaved ? "✓" : "🔖"}</button>
                <button onClick={() => setEditSig(s)} style={{ padding:"8px 11px", background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.4)", border:"1px solid #1E2D45", borderRadius:9, fontSize:13, cursor:"pointer" }}>✏️</button>
                <button onClick={() => setConfirmDel(s)} style={{ padding:"8px 11px", background:"rgba(244,67,54,0.06)", color:"#F44336", border:"1px solid rgba(244,67,54,0.15)", borderRadius:9, fontSize:13, cursor:"pointer" }}>🗑</button>
              </div>
            </Card>
          );
        })}
        {visible.length === 0 && <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,0.2)", fontSize:13 }}>אין סיגנלים תואמים</div>}
      </div>
    </div>
  );
}

// ─── Pipeline ─────────────────────────────────────────────────
export function Pipeline() {
  const { deals, addDeal, updateDeal, deleteDeal, moveStage } = usePipeline();
  const [addOpen, setAddOpen] = useState(false);
  const [editDeal, setEditDeal] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState("");

  const totalCommission = deals.reduce((s, d) => s + d.value * (d.commissionRate ?? 2) / 100, 0);
  const forecastCommission = deals.reduce((s, d) => s + d.value * (d.commissionRate ?? 2) / 100 * d.prob / 100, 0);

  return (
    <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      {addOpen && <Modal title="הוסף עסקה" onClose={() => setAddOpen(false)}><DealForm onSave={d => { addDeal(d); setAddOpen(false); setToast("עסקה נוספה ✓"); }} onClose={() => setAddOpen(false)} /></Modal>}
      {editDeal && <Modal title="עריכת עסקה" onClose={() => setEditDeal(null)}><DealForm initial={editDeal} onSave={d => { updateDeal(d.id, d); setEditDeal(null); setToast("עסקה עודכנה ✓"); }} onClose={() => setEditDeal(null)} /></Modal>}
      {confirmDel && <Confirm msg={`למחוק את "${confirmDel.title}"?`} onYes={() => { deleteDeal(confirmDel.id); setConfirmDel(null); setToast("עסקה נמחקה"); }} onNo={() => setConfirmDel(null)} />}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:0 }}>פיפליין</h2>
        <Btn onClick={() => setAddOpen(true)} style={{ padding:"8px 14px" }}>+ הוסף עסקה</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Card style={{ padding:"12px 14px" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginBottom:4 }}>עמלה כוללת</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#00BFA5" }}>{fmt(totalCommission)}</div>
        </Card>
        <Card style={{ padding:"12px 14px" }}>
          <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginBottom:4 }}>עמלה משוקללת (צפי)</div>
          <div style={{ fontSize:16, fontWeight:800, color:"#FFA000" }}>{fmt(forecastCommission)}</div>
        </Card>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage);
          const col = stColor(stage);
          return (
            <div key={stage}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:col, flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{stLabel(stage)}</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginRight:"auto" }}>{stageDeals.length}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginRight:18 }}>
                {stageDeals.map(d => {
                  const comm = Math.round(d.value * (d.commissionRate ?? 2) / 100);
                  const stageIdx = STAGES.indexOf(d.stage);
                  return (
                    <Card key={d.id} style={{ padding:"13px 14px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{d.title}</div>
                          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{d.owner}</div>
                        </div>
                        <div style={{ textAlign:"left", flexShrink:0 }}>
                          <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>{fmt(d.value)}</div>
                          <div style={{ fontSize:10, color:"#00BFA5", fontWeight:700 }}>עמלה: {fmt(comm)}</div>
                        </div>
                      </div>
                      <div style={{ height:4, background:"#1E2D45", borderRadius:4, marginBottom:10, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${d.prob}%`, background:`linear-gradient(90deg,${col},${col}aa)`, borderRadius:4 }} />
                      </div>
                      {d.next && <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginBottom:8 }}>▶ {d.next} {d.date && <span style={{ color:"rgba(255,255,255,0.25)" }}>· {d.date}</span>}</div>}
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        {stageIdx > 0 && <button onClick={() => moveStage(d.id, STAGES[stageIdx-1])} style={{ padding:"5px 9px", fontSize:10, fontWeight:600, background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.4)", border:"1px solid #1E2D45", borderRadius:7, cursor:"pointer" }}>← חזרה</button>}
                        {stageIdx < STAGES.length - 1 && <button onClick={() => moveStage(d.id, STAGES[stageIdx+1])} style={{ padding:"5px 9px", fontSize:10, fontWeight:600, background:`${col}12`, color:col, border:`1px solid ${col}25`, borderRadius:7, cursor:"pointer" }}>קדם → {stLabel(STAGES[stageIdx+1])}</button>}
                        {d.phone && <a href={waLink(d.phone)} target="_blank" rel="noreferrer" style={{ padding:"5px 9px", fontSize:10, fontWeight:600, background:"rgba(0,191,165,0.08)", color:"#00BFA5", border:"1px solid rgba(0,191,165,0.2)", borderRadius:7, textDecoration:"none" }}>💬</a>}
                        <button onClick={() => setEditDeal(d)} style={{ padding:"5px 9px", fontSize:10, background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.4)", border:"1px solid #1E2D45", borderRadius:7, cursor:"pointer" }}>✏️</button>
                        <button onClick={() => setConfirmDel(d)} style={{ padding:"5px 9px", fontSize:10, background:"rgba(244,67,54,0.06)", color:"#F44336", border:"1px solid rgba(244,67,54,0.15)", borderRadius:7, cursor:"pointer" }}>🗑</button>
                      </div>
                    </Card>
                  );
                })}
                {stageDeals.length === 0 && <div style={{ padding:"14px 16px", background:"rgba(255,255,255,0.02)", border:"1px dashed #1E2D45", borderRadius:12, fontSize:11, color:"rgba(255,255,255,0.18)", textAlign:"center" }}>אין עסקאות בשלב זה</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Buyers ───────────────────────────────────────────────────
export function Buyers() {
  const { buyers, addBuyer, updateBuyer, deleteBuyer } = useBuyers();
  const { signals } = useSignals();
  const [addOpen, setAddOpen] = useState(false);
  const [editBuyer, setEditBuyer] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [pitches, setPitches] = useState({});
  const [loadingId, setLoadingId] = useState(null);
  const [toast, setToast] = useState("");

  const STATUS_COLORS = { hot:"#F44336", active:"#00BFA5", passive:"rgba(255,255,255,0.3)" };
  const STATUS_LABELS = { hot:"🔥 חם", active:"✅ פעיל", passive:"😴 פסיבי" };

  async function genPitch(buyer) {
    const best = [...signals].filter(s => matchScore(buyer, s) > 0).sort((a, b) => matchScore(buyer, b) - matchScore(buyer, a))[0];
    if (!best) { setToast("אין נכסים תואמים לקונה זה"); return; }
    setLoadingId(buyer.id);
    try {
      const txt = await askGemini(PROMPTS.buyerMatch(buyer, best));
      setPitches(p => ({ ...p, [buyer.id]: txt }));
    } catch (e) {
      if (e.message === "NO_KEY") setToast("⚠️ הגדר מפתח Gemini בעמוד AI");
      else setToast("⚠️ " + e.message);
    }
    setLoadingId(null);
  }

  return (
    <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      {addOpen && <Modal title="הוסף קונה" onClose={() => setAddOpen(false)}><BuyerForm onSave={b => { addBuyer(b); setAddOpen(false); setToast("קונה נוסף ✓"); }} onClose={() => setAddOpen(false)} /></Modal>}
      {editBuyer && <Modal title="עריכת קונה" onClose={() => setEditBuyer(null)}><BuyerForm initial={editBuyer} onSave={b => { updateBuyer(b.id, b); setEditBuyer(null); setToast("קונה עודכן ✓"); }} onClose={() => setEditBuyer(null)} /></Modal>}
      {confirmDel && <Confirm msg={`למחוק את "${confirmDel.name}"?`} onYes={() => { deleteBuyer(confirmDel.id); setConfirmDel(null); setToast("קונה נמחק"); }} onNo={() => setConfirmDel(null)} />}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:0 }}>קונים <span style={{ color:"rgba(255,255,255,0.3)", fontWeight:400 }}>({buyers.length})</span></h2>
        <Btn onClick={() => setAddOpen(true)} style={{ padding:"8px 14px" }}>+ הוסף קונה</Btn>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {buyers.map(b => {
          const matches = signals.filter(s => matchScore(b, s) > 0);
          const isExpanded = expandedId === b.id;
          const statusColor = STATUS_COLORS[b.status] || "#fff";
          const pitch = pitches[b.id];
          return (
            <Card key={b.id} style={{ padding:"14px 15px" }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <div style={{ width:42, height:42, borderRadius:"50%", background: b.status === "hot" ? "linear-gradient(135deg,#F44336,#FF5722)" : b.status === "active" ? "linear-gradient(135deg,#2979FF,#7C4DFF)" : "#1E2D45", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:800, color:"#fff", flexShrink:0 }}>
                  {b.name[0]}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{b.name}</span>
                    <span style={{ fontSize:9, fontWeight:700, color:statusColor }}>{STATUS_LABELS[b.status]}</span>
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{fmt(b.bMin)}–{fmt(b.bMax)} · {b.rMin}–{b.rMax} חד׳</div>
                  {matches.length > 0 && <div style={{ fontSize:11, color:"#00BFA5", marginTop:2, fontWeight:600 }}>{matches.length} נכסים תואמים</div>}
                </div>
                <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                  <a href={`tel:${b.phone}`} style={{ width:30, height:30, borderRadius:8, background:"rgba(41,121,255,0.1)", border:"1px solid rgba(41,121,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", fontSize:13 }}>📞</a>
                  <a href={waLink(b.phone)} target="_blank" rel="noreferrer" style={{ width:30, height:30, borderRadius:8, background:"rgba(0,191,165,0.1)", border:"1px solid rgba(0,191,165,0.2)", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", fontSize:13 }}>💬</a>
                  <button onClick={() => setExpandedId(isExpanded ? null : b.id)} style={{ width:30, height:30, borderRadius:8, background:"rgba(255,255,255,0.04)", border:"1px solid #1E2D45", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:11, color:"rgba(255,255,255,0.45)" }}>{isExpanded ? "▲" : "▼"}</button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop:12, borderTop:"1px solid #1E2D45", paddingTop:12 }}>
                  <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", margin:"0 0 10px", lineHeight:1.5 }}>{b.notes}</p>
                  {matches.length > 0 && (
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#fff", marginBottom:7 }}>נכסים תואמים:</div>
                      {matches.slice(0, 3).map(s => {
                        const ms = matchScore(b, s);
                        return (
                          <div key={s.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", background:"#070B17", border:"1px solid #1E2D45", borderRadius:9, marginBottom:6 }}>
                            <Ring score={ms} size={36} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:12, fontWeight:600, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.address}</div>
                              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>{fmtFull(s.price)} · {s.rooms} חד׳</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {pitch && <AIBox text={pitch} loading={false} />}
                  {loadingId === b.id && <AIBox text="" loading={true} />}
                  <div style={{ display:"flex", gap:7, marginTop:10 }}>
                    <Btn onClick={() => genPitch(b)} disabled={loadingId === b.id} variant={pitch ? "secondary" : "primary"} style={{ flex:1, justifyContent:"center" }}>
                      {loadingId === b.id ? "יוצר..." : pitch ? "🔄 חדש" : "🤖 Pitch AI"}
                    </Btn>
                    <Btn onClick={() => setEditBuyer(b)} variant="secondary" style={{ flex:1, justifyContent:"center" }}>✏️ עריכה</Btn>
                    <Btn onClick={() => setConfirmDel(b)} variant="ghost" style={{ color:"#F44336" }}>🗑</Btn>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
        {buyers.length === 0 && <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,0.2)", fontSize:13 }}>אין קונים — הוסף קונה ראשון</div>}
      </div>
    </div>
  );
}

// ─── Tasks ────────────────────────────────────────────────────
const TASK_TYPES = [
  { v:"call", l:"📞 שיחה" }, { v:"whatsapp", l:"💬 WhatsApp" },
  { v:"visit", l:"🏠 ביקור" }, { v:"email", l:"📧 מייל" }, { v:"offer", l:"📄 הצעה" },
];

export function Tasks() {
  const { tasks, addTask, deleteTask, toggleDone } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ contact:"", phone:"", type:"call", due:"", today:true, note:"" });
  const [toast, setToast] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  function ch(k, v) { setF(p => ({ ...p, [k]: v })); }
  function submit() {
    if (!f.contact.trim()) return;
    addTask({ ...f, contact:f.contact.trim(), phone:f.phone.trim(), note:f.note.trim() });
    setF({ contact:"", phone:"", type:"call", due:"", today:true, note:"" });
    setShowForm(false);
    setToast("משימה נוספה ✓");
  }

  const pending  = tasks.filter(t => !t.done);
  const done     = tasks.filter(t => t.done);
  const todayT   = pending.filter(t => t.today);
  const upcoming = pending.filter(t => !t.today);

  function TaskRow({ t }) {
    const ct = CRM_TYPES[t.type] || CRM_TYPES.call;
    return (
      <Card style={{ padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start", opacity: t.done ? 0.5 : 1 }}>
        <button onClick={() => toggleDone(t.id)} style={{ width:22, height:22, borderRadius:"50%", border:`2px solid ${t.done ? "#00BFA5" : "#1E2D45"}`, background: t.done ? "#00BFA5" : "none", cursor:"pointer", flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11 }}>
          {t.done ? "✓" : ""}
        </button>
        <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{ct.icon}</span>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{t.contact}</span>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", flexShrink:0 }}>{t.due}</span>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.note}</div>
        </div>
        <div style={{ display:"flex", gap:5, flexShrink:0 }}>
          {t.phone && <a href={waLink(t.phone)} target="_blank" rel="noreferrer" style={{ width:28, height:28, borderRadius:7, background:"rgba(0,191,165,0.08)", border:"1px solid rgba(0,191,165,0.2)", display:"flex", alignItems:"center", justifyContent:"center", textDecoration:"none", fontSize:12 }}>💬</a>}
          <button onClick={() => setConfirmDel(t)} style={{ width:28, height:28, borderRadius:7, background:"rgba(244,67,54,0.06)", border:"1px solid rgba(244,67,54,0.15)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:12, color:"#F44336" }}>🗑</button>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      {confirmDel && <Confirm msg={`למחוק משימה של "${confirmDel.contact}"?`} onYes={() => { deleteTask(confirmDel.id); setConfirmDel(null); setToast("משימה נמחקה"); }} onNo={() => setConfirmDel(null)} />}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:0 }}>משימות <span style={{ color:"rgba(255,255,255,0.3)", fontWeight:400 }}>({pending.length})</span></h2>
        <Btn onClick={() => setShowForm(!showForm)} style={{ padding:"8px 14px" }}>{showForm ? "✕ סגור" : "+ הוסף"}</Btn>
      </div>

      {showForm && (
        <Card style={{ padding:16 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={{ ...S.row, gridColumn:"1/-1" }}><label style={S.label}>איש קשר *</label><input style={S.input} value={f.contact} onChange={e => ch("contact", e.target.value)} placeholder="שם הלקוח" /></div>
            <div style={S.row}><label style={S.label}>טלפון</label><input style={S.input} value={f.phone} onChange={e => ch("phone", e.target.value)} placeholder="052-..." /></div>
            <div style={S.row}><label style={S.label}>סוג</label><select style={S.sel} value={f.type} onChange={e => ch("type", e.target.value)}>{TASK_TYPES.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
            <div style={S.row}><label style={S.label}>מועד</label><input style={S.input} value={f.due} onChange={e => ch("due", e.target.value)} placeholder="היום 18:00" /></div>
            <div style={S.row}><label style={S.label}>לו"ז</label><select style={S.sel} value={String(f.today)} onChange={e => ch("today", e.target.value === "true")}><option value="true">היום</option><option value="false">עתידי</option></select></div>
            <div style={{ ...S.row, gridColumn:"1/-1" }}><label style={S.label}>הערה</label><input style={S.input} value={f.note} onChange={e => ch("note", e.target.value)} placeholder="פרטים..." /></div>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            <Btn onClick={submit} style={{ flex:1, justifyContent:"center" }} disabled={!f.contact.trim()}>הוסף משימה</Btn>
            <Btn onClick={() => setShowForm(false)} variant="ghost" style={{ flex:1, justifyContent:"center" }}>ביטול</Btn>
          </div>
        </Card>
      )}

      {todayT.length > 0 && <div><div style={{ fontSize:12, fontWeight:700, color:"#FF5722", marginBottom:8 }}>היום ({todayT.length})</div><div style={{ display:"flex", flexDirection:"column", gap:7 }}>{todayT.map(t => <TaskRow key={t.id} t={t} />)}</div></div>}
      {upcoming.length > 0 && <div><div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.45)", marginBottom:8 }}>עתידי ({upcoming.length})</div><div style={{ display:"flex", flexDirection:"column", gap:7 }}>{upcoming.map(t => <TaskRow key={t.id} t={t} />)}</div></div>}
      {done.length > 0 && <div><div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.25)", marginBottom:8 }}>הושלם ({done.length})</div><div style={{ display:"flex", flexDirection:"column", gap:7 }}>{done.map(t => <TaskRow key={t.id} t={t} />)}</div></div>}
      {tasks.length === 0 && <div style={{ textAlign:"center", padding:"32px 0", color:"rgba(255,255,255,0.2)", fontSize:13 }}>אין משימות — הוסף משימה ראשונה</div>}
    </div>
  );
}

// ─── AI Tools ─────────────────────────────────────────────────
const AI_TOOLS = [
  { id:"pitch",     icon:"✉️",  label:"Pitch ראשוני",   desc:"פנייה אישית לבעל נכס" },
  { id:"valuation", icon:"📊",  label:"הערכת שווי",     desc:"דוח שמאות מהיר" },
  { id:"analyze",   icon:"🔍",  label:"ניתוח נכס",      desc:"חוזקות, חולשות, המלצה" },
  { id:"whatsapp",  icon:"💬",  label:"הודעת WhatsApp", desc:"הודעה לתיאום שיחה" },
];

function GeminiKeySetup({ onSaved }) {
  const [k, setK] = useState("");
  function save() {
    if (!k.trim()) return;
    setGeminiKey(k.trim());
    onSaved();
  }
  return (
    <Card style={{ padding:20, border:"1px solid rgba(255,160,0,0.3)", background:"rgba(255,160,0,0.05)" }}>
      <div style={{ fontSize:28, textAlign:"center", marginBottom:10 }}>🤖</div>
      <div style={{ fontSize:14, fontWeight:700, color:"#fff", textAlign:"center", marginBottom:6 }}>הגדר מפתח Gemini AI</div>
      <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", textAlign:"center", marginBottom:16, lineHeight:1.6 }}>
        כדי להשתמש בכלי ה-AI נדרש מפתח API מ-Google Gemini.<br />
        המפתח נשמר רק במכשיר שלך — לא נשלח לשום שרת.
      </div>
      <div style={S.row}>
        <label style={S.label}>מפתח Gemini API</label>
        <input
          style={{ ...S.input, fontFamily:"monospace", fontSize:11 }}
          value={k}
          onChange={e => setK(e.target.value)}
          placeholder="AIza..."
          type="password"
          autoComplete="off"
        />
      </div>
      <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginBottom:14, textAlign:"center" }}>
        קבל מפתח חינמי בכתובת: <span style={{ color:"#FFA000" }}>aistudio.google.com</span>
      </div>
      <Btn onClick={save} disabled={!k.trim()} style={{ width:"100%", justifyContent:"center" }}>שמור והפעל AI ✓</Btn>
    </Card>
  );
}

export function AITools() {
  const { signals } = useSignals();
  const [hasKey, setHasKey] = useState(() => !!getGeminiKey());
  const [tool, setTool] = useState("pitch");
  const [selId, setSelId] = useState(signals[0]?.id || "");
  const [extra, setExtra] = useState({ owner:"", days:"", price:"" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [showKeyEdit, setShowKeyEdit] = useState(false);

  const sig = signals.find(s => s.id === selId) || signals[0];

  async function run() {
    if (!sig) return;
    setLoading(true); setResult("");
    try {
      const owner = extra.owner || sig.ownerName;
      const days  = extra.days  || String(sig.daysOnMarket);
      const price = extra.price || String(sig.price);
      let prompt;
      if (tool === "pitch")     prompt = PROMPTS.pitch(sig.address, owner, days, price);
      if (tool === "valuation") prompt = PROMPTS.valuation(sig.address, sig.rooms, sig.size, sig.floor, price);
      if (tool === "analyze")   prompt = PROMPTS.analyze(sig.address, sig.rooms, sig.size, price, days);
      if (tool === "whatsapp")  prompt = PROMPTS.whatsapp(owner, sig.address, days);
      setResult(await askGemini(prompt));
    } catch (e) {
      if (e.message === "NO_KEY") { setHasKey(false); }
      else { setResult("⚠️ " + e.message); }
    }
    setLoading(false);
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => setToast("הועתק ✓"));
  }

  function clearKey() {
    setGeminiKey("");
    setHasKey(false);
    setResult("");
    setShowKeyEdit(false);
  }

  return (
    <div style={{ padding:18, display:"flex", flexDirection:"column", gap:14 }}>
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h2 style={{ fontSize:16, fontWeight:800, color:"#fff", margin:0 }}>🤖 כלי AI</h2>
        {hasKey && (
          <button onClick={() => setShowKeyEdit(!showKeyEdit)} style={{ fontSize:11, color:"rgba(255,255,255,0.3)", background:"none", border:"none", cursor:"pointer" }}>
            ⚙️ מפתח API
          </button>
        )}
      </div>

      {showKeyEdit && hasKey && (
        <Card style={{ padding:14 }}>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:10 }}>מפתח פעיל: AIza•••••••••</div>
          <Btn onClick={clearKey} variant="ghost" style={{ color:"#F44336", width:"100%", justifyContent:"center" }}>🗑 מחק מפתח</Btn>
        </Card>
      )}

      {!hasKey ? (
        <GeminiKeySetup onSaved={() => { setHasKey(true); setShowKeyEdit(false); }} />
      ) : (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {AI_TOOLS.map(t => (
              <Card key={t.id} onClick={() => { setTool(t.id); setResult(""); }} style={{ padding:"12px 14px", cursor:"pointer", border: tool === t.id ? "1px solid #FF5722" : "1px solid #1E2D45", background: tool === t.id ? "rgba(255,87,34,0.08)" : "#0D1526" }}>
                <div style={{ fontSize:20, marginBottom:5 }}>{t.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color: tool === t.id ? "#FF5722" : "#fff" }}>{t.label}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{t.desc}</div>
              </Card>
            ))}
          </div>

          <div style={S.row}>
            <label style={S.label}>בחר נכס</label>
            <select style={S.sel} value={selId} onChange={e => { setSelId(e.target.value); setResult(""); }}>
              {signals.map(s => <option key={s.id} value={s.id}>{s.address} — {fmt(s.price)}</option>)}
            </select>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div style={S.row}><label style={S.label}>שם בעל נכס (אופציונלי)</label><input style={S.input} value={extra.owner} onChange={e => setExtra(p => ({ ...p, owner:e.target.value }))} placeholder={sig?.ownerName || ""} /></div>
            {(tool !== "valuation") && <div style={S.row}><label style={S.label}>ימים בשוק (אופציונלי)</label><input style={S.input} type="number" value={extra.days} onChange={e => setExtra(p => ({ ...p, days:e.target.value }))} placeholder={String(sig?.daysOnMarket || "")} /></div>}
            {(tool !== "whatsapp") && <div style={S.row}><label style={S.label}>מחיר (אופציונלי)</label><input style={S.input} type="number" value={extra.price} onChange={e => setExtra(p => ({ ...p, price:e.target.value }))} placeholder={String(sig?.price || "")} /></div>}
          </div>

          <Btn onClick={run} disabled={loading || !sig} style={{ width:"100%", justifyContent:"center" }}>
            {loading ? <><Spinner size={14} /> מייצר...</> : `✨ יצור ${AI_TOOLS.find(t => t.id === tool)?.label}`}
          </Btn>

          {(result || loading) && (
            <div>
              <AIBox text={result} loading={loading} />
              {result && (
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <Btn onClick={copy} variant="secondary" style={{ flex:1, justifyContent:"center" }}>📋 העתק</Btn>
                  {tool === "whatsapp" && sig && <Btn href={waLink(sig.ownerPhone)} target="_blank" variant="green" style={{ flex:1, justifyContent:"center" }}>💬 שלח ב-WA</Btn>}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

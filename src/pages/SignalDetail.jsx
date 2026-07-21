import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fmt, fmtFull, sColor, waLink, getPriceHistory } from "../lib/data";
import { Ring, Spinner, AIBox, Btn, Card } from "../components/UI";
import { askGemini, PROMPTS } from "../hooks/useGemini";
import { useCRM, CRM_TYPES, fmtTs } from "../hooks/useCRM";
import { useSignals, useBuyers, matchScore } from "../hooks/useStore";

// ─── Price chart ─────────────────────────────────────────────
function PriceChart({ signal }) {
  const pts = getPriceHistory(signal);
  const W = 320, H = 110, PX = 28, PY = 18;
  const prices = pts.map(p => p.price);
  const min = Math.min(...prices) * 0.975;
  const max = Math.max(...prices) * 1.025;
  const cx = (i) => PX + (i / (pts.length - 1)) * (W - PX * 2);
  const cy = (p) => H - PY - ((p - min) / (max - min || 1)) * (H - PY * 2);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${cx(i)} ${cy(p.price)}`).join(" ");
  const area = `${path} L ${cx(pts.length - 1)} ${H} L ${cx(0)} ${H} Z`;
  const hasDrop = !!signal.prevPrice;
  const lineColor = hasDrop ? "#F44336" : "#00BFA5";

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#cg)" />
        <path d={path} fill="none" stroke={lineColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={cx(i)} cy={cy(p.price)} r={i === pts.length - 1 ? 4 : 3}
              fill={i === pts.length - 1 ? lineColor : "#0D1526"}
              stroke={lineColor} strokeWidth="2" />
            <text x={cx(i)} y={H - 3} textAnchor="middle"
              fill="rgba(255,255,255,0.3)" fontSize="8.5">{p.label}</text>
            {(i === 0 || i === pts.length - 1) && (
              <text x={cx(i)} y={cy(p.price) - 8} textAnchor={i === 0 ? "start" : "end"}
                fill={i === pts.length - 1 ? lineColor : "rgba(255,255,255,0.35)"}
                fontSize="9" fontWeight="700">{fmt(p.price)}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── CRM log component ────────────────────────────────────────
function CRMLog({ entityId }) {
  const { addLog, getLogs } = useCRM();
  const [note, setNote] = useState("");
  const [type, setType] = useState("call");
  const logs = getLogs(entityId);

  function add() {
    if (!note.trim()) return;
    addLog(entityId, { type, note: note.trim() });
    setNote("");
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 11 }}>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          style={{ background: "#070B17", border: "1px solid #1E2D45", borderRadius: 9, padding: "9px 10px", color: "#fff", fontSize: 12, outline: "none", flexShrink: 0 }}
        >
          {Object.entries(CRM_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="הוסף פעילות..."
          style={{ flex: 1, background: "#070B17", border: "1px solid #1E2D45", borderRadius: 9, padding: "9px 12px", color: "#fff", fontSize: 12, outline: "none", direction: "rtl" }}
        />
        <button
          onClick={add}
          disabled={!note.trim()}
          style={{ padding: "9px 14px", background: note.trim() ? "linear-gradient(135deg,#FF5722,#FFA000)" : "#1E2D45", border: "none", borderRadius: 9, color: "#fff", fontSize: 16, cursor: note.trim() ? "pointer" : "default", flexShrink: 0 }}
        >+</button>
      </div>

      {logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
          אין פעילות עדיין — התחל לתעד
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {logs.map(log => {
            const t = CRM_TYPES[log.type] || CRM_TYPES.note;
            return (
              <div key={log.id} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "#070B17", border: "1px solid #1E2D45", borderRadius: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{t.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>{log.note}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>{fmtTs(log.ts)}</div>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: t.color, flexShrink: 0, padding: "2px 7px", borderRadius: 99, background: `${t.color}15`, border: `1px solid ${t.color}25`, whiteSpace: "nowrap" }}>{t.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export function SignalDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { signals } = useSignals();
  const { buyers } = useBuyers();
  const signal = signals.find(s => s.id === id);

  const [tab, setTab] = useState("ai");
  const [insight, setInsight] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const matchingBuyers = signal
    ? buyers.filter(b => matchScore(b, signal) > 0)
    : [];

  async function loadInsight() {
    if (insight || analyzing) return;
    setAnalyzing(true);
    try {
      const txt = await askGemini(PROMPTS.signalInsight(signal));
      setInsight(txt);
    } catch (e) {
      setInsight("⚠️ " + e.message);
    }
    setAnalyzing(false);
  }

  if (!signal) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
        <p>נכס לא נמצא</p>
        <Btn onClick={() => nav("/signals")} style={{ marginTop: 12 }}>← חזרה לסיגנלים</Btn>
      </div>
    );
  }

  const col = sColor(signal.score);

  const TABS = [
    { id: "ai",      label: "🤖 ניתוח AI"       },
    { id: "price",   label: "📈 היסטוריית מחיר" },
    { id: "buyers",  label: `👥 קונים (${matchingBuyers.length})` },
    { id: "crm",     label: "📋 CRM"             },
  ];

  return (
    <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#0D1526", border: "1px solid rgba(255,87,34,0.4)", borderRadius: 12, padding: "10px 20px", color: "#fff", fontSize: 13, fontWeight: 500, zIndex: 9999, whiteSpace: "nowrap" }}>
          ✓ {toast}
        </div>
      )}

      {/* Back */}
      <button onClick={() => nav("/signals")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", textAlign: "right", padding: 0, display: "flex", alignItems: "center", gap: 5 }}>
        ← חזרה לסיגנלים
      </button>

      {/* Header card */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
          <Ring score={signal.score} size={60} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
              <h1 style={{ fontSize: 16, fontWeight: 800, color: "#fff", margin: 0 }}>{signal.address}</h1>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: `${col}12`, color: col, border: `1px solid ${col}20`, whiteSpace: "nowrap" }}>{signal.tag}</span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: "0 0 10px", lineHeight: 1.5 }}>{signal.reason}</p>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
              <span style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>{fmtFull(signal.price)}</span>
              {signal.change && (
                <span style={{ color: "#F44336", fontWeight: 700 }}>↓ {fmtFull(signal.change)} ({Math.round(signal.change / signal.prevPrice * 100)}%)</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Details grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 9 }}>
        {[
          { label: "חדרים",   value: signal.rooms },
          { label: 'שטח מ"ר', value: signal.size  },
          { label: "קומה",    value: signal.floor  },
          { label: "ימים",    value: signal.daysOnMarket },
        ].map(({ label, value }) => (
          <Card key={label} style={{ padding: "11px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{value}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{label}</div>
          </Card>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <Btn href={`tel:${signal.ownerPhone}`} style={{ flex: 1, justifyContent: "center" }}>
          📞 {signal.ownerName}
        </Btn>
        <Btn variant="green" href={waLink(signal.ownerPhone)} target="_blank" style={{ flex: 1, justifyContent: "center" }}>
          💬 WhatsApp
        </Btn>
        <button
          onClick={() => { setSaved(p => !p); showToast(saved ? "הוסר" : "נשמר ✓"); }}
          style={{ padding: "10px 14px", background: saved ? "rgba(0,191,165,0.1)" : "rgba(255,255,255,0.04)", color: saved ? "#00BFA5" : "rgba(255,255,255,0.4)", border: `1px solid ${saved ? "rgba(0,191,165,0.25)" : "#1E2D45"}`, borderRadius: 10, fontSize: 14, cursor: "pointer" }}
        >{saved ? "✓" : "🔖"}</button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === "ai") loadInsight(); }}
            style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s", background: tab === t.id ? "#FF5722" : "#0D1526", borderColor: tab === t.id ? "#FF5722" : "#1E2D45", color: tab === t.id ? "#fff" : "rgba(255,255,255,0.45)" }}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      <Card style={{ padding: 16 }}>
        {tab === "ai" && (
          <div>
            {!insight && !analyzing && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Btn onClick={loadInsight}>🤖 נתח עם Gemini AI</Btn>
              </div>
            )}
            {(insight || analyzing) && <AIBox text={insight} loading={analyzing} />}
            {insight && (
              <div style={{ marginTop: 12 }}>
                <Btn
                  onClick={() => nav(`/ai?sig=${signal.id}`)}
                  variant="secondary"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  ✨ יצור Pitch / WhatsApp / דוח שמאות
                </Btn>
              </div>
            )}
          </div>
        )}

        {tab === "price" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>היסטוריית מחיר</span>
              {signal.prevPrice && (
                <span style={{ fontSize: 11, color: "#F44336", fontWeight: 700 }}>
                  ירד {Math.round(signal.change / signal.prevPrice * 100)}% ↓
                </span>
              )}
            </div>
            <PriceChart signal={signal} />
            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <div style={{ flex: 1, background: "#070B17", border: "1px solid #1E2D45", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>מחיר נוכחי</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{fmtFull(signal.price)}</div>
              </div>
              {signal.prevPrice && (
                <div style={{ flex: 1, background: "#070B17", border: "1px solid #1E2D45", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>מחיר מקורי</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.45)", textDecoration: "line-through" }}>{fmtFull(signal.prevPrice)}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "buyers" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              {matchingBuyers.length > 0
                ? `${matchingBuyers.length} קונים תואמים לנכס זה`
                : "אין קונים תואמים כרגע"}
            </div>
            {matchingBuyers.map(b => (
              <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", background: "#070B17", border: "1px solid #1E2D45", borderRadius: 11, marginBottom: 8 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: b.status === "hot" ? "linear-gradient(135deg,#F44336,#FF5722)" : "linear-gradient(135deg,#2979FF,#7C4DFF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{b.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{fmt(b.bMin)}–{fmt(b.bMax)} · {b.rMin}–{b.rMax} חד׳</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.notes}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <a href={`tel:${b.phone}`} style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(41,121,255,0.1)", border: "1px solid rgba(41,121,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 14 }}>📞</a>
                  <a href={waLink(b.phone)} target="_blank" rel="noreferrer" style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(0,191,165,0.1)", border: "1px solid rgba(0,191,165,0.2)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 14 }}>💬</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "crm" && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
              📋 יומן פעילות — {signal.ownerName}
            </div>
            <CRMLog entityId={`signal_${signal.id}`} />
          </div>
        )}
      </Card>

      {/* Source */}
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>
        מקור: {signal.source} · עודכן {signal.lastActivity} · ציון {signal.score}/100
      </div>
    </div>
  );
}

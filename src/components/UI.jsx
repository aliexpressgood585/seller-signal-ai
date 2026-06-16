// src/components/UI.jsx
import { useEffect } from "react";
import { sColor } from "../lib/data";

export function Ring({ score, size = 50 }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  const col = sColor(score);
  return (
    <div style={{ position:"relative", width:size, height:size, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
      <svg width={size} height={size} style={{ position:"absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1E2D45" strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={5}
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transformOrigin:"center", transform:"rotate(-90deg)", transition:"stroke-dashoffset 0.8s" }}/>
      </svg>
      <span style={{ position:"relative", fontSize: size > 44 ? 13 : 10, fontWeight:700, color:col }}>{score}</span>
    </div>
  );
}

export function Spinner({ size = 16 }) {
  return (
    <div style={{ width:size, height:size, border:"2px solid rgba(255,255,255,0.1)", borderTopColor:"#FF5722", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }}/>
  );
}

export function Toast({ msg, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2500); return () => clearTimeout(t); });
  return (
    <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"#0D1526", border:"1px solid rgba(255,87,34,0.4)", borderRadius:12, padding:"10px 20px", color:"#fff", fontSize:13, fontWeight:500, zIndex:9999, whiteSpace:"nowrap", boxShadow:"0 8px 40px rgba(0,0,0,0.5)" }}>
      ✓ {msg}
    </div>
  );
}

export function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{ background:"#0D1526", border:"1px solid #1E2D45", borderRadius:14, ...style }}>
      {children}
    </div>
  );
}

export function AIBox({ text, loading }) {
  return (
    <div style={{ background:"rgba(255,87,34,0.06)", border:"1px solid rgba(255,87,34,0.15)", borderRadius:12, padding:13 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
        <span>🤖</span>
        <span style={{ fontSize:11, fontWeight:700, color:"#FF5722" }}>ניתוח Gemini AI</span>
      </div>
      {loading
        ? <div style={{ display:"flex", alignItems:"center", gap:8 }}><Spinner/><span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>מנתח...</span></div>
        : <p style={{ fontSize:13, color:"rgba(255,255,255,0.82)", lineHeight:1.75, margin:0, whiteSpace:"pre-wrap" }}>{text}</p>
      }
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", style = {}, disabled = false, href, target }) {
  const base = { display:"inline-flex", alignItems:"center", justifyContent:"center", gap:7, fontWeight:600, borderRadius:10, fontSize:13, cursor: disabled ? "default" : "pointer", border:"none", textDecoration:"none", transition:"all 0.15s", ...style };
  const variants = {
    primary:   { background: disabled ? "#1E2D45" : "linear-gradient(135deg,#FF5722,#FFA000)", color:"#fff", padding:"10px 16px" },
    secondary: { background:"#1E2D45", color:"rgba(255,255,255,0.7)", padding:"9px 14px" },
    green:     { background:"rgba(0,191,165,0.12)", color:"#00BFA5", border:"1px solid rgba(0,191,165,0.25)", padding:"9px 14px" },
    ghost:     { background:"rgba(255,255,255,0.04)", color:"rgba(255,255,255,0.5)", border:"1px solid #1E2D45", padding:"9px 14px" },
  };
  const s = { ...base, ...variants[variant] };
  if (href) return <a href={href} target={target} rel="noreferrer" style={s}>{children}</a>;
  return <button onClick={onClick} disabled={disabled} style={s}>{children}</button>;
}

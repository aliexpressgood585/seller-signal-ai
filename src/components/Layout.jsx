// src/components/Layout.jsx
import { Outlet, useNavigate, useLocation } from "react-router-dom";

const NAV = [
  { path:"/",         icon:"🏠", label:"דשבורד"   },
  { path:"/signals",  icon:"⚡", label:"סיגנלים", badge:3 },
  { path:"/pipeline", icon:"🔀", label:"פייפליין" },
  { path:"/buyers",   icon:"👥", label:"קונים"    },
  { path:"/tasks",    icon:"🔔", label:"פולו-אפ", badge:4 },
  { path:"/ai",       icon:"🤖", label:"AI"       },
];

function SidebarItem({ item, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 11px", borderRadius:10,
      border: active ? "1px solid rgba(255,87,34,0.2)" : "1px solid transparent",
      background: active ? "rgba(255,87,34,0.09)" : "transparent",
      color: active ? "#FF5722" : "rgba(255,255,255,0.4)",
      fontSize:13, fontWeight: active ? 600 : 500, cursor:"pointer", textAlign:"right", width:"100%",
    }}>
      <span style={{ fontSize:16 }}>{item.icon}</span>
      <span style={{ flex:1 }}>{item.label}</span>
      {item.badge && <span style={{ minWidth:17, height:17, borderRadius:99, background:"#F44336", color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>{item.badge}</span>}
    </button>
  );
}

export default function Layout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isActive = (path) => path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#070B17", fontFamily:"'Inter',system-ui,sans-serif", direction:"rtl" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0D1526; }
        ::-webkit-scrollbar-thumb { background: #1E2D45; border-radius: 2px; }
        .sidebar { display: flex; }
        .btmnav  { display: none; }
        .mobtop  { display: none; }
        @media (max-width: 767px) {
          .sidebar { display: none !important; }
          .btmnav  { display: flex !important; }
          .mobtop  { display: flex !important; }
          .main    { padding-bottom: 80px !important; }
        }
      `}</style>

      {/* Desktop Sidebar */}
      <aside className="sidebar" style={{ width:216, background:"#070B17", borderLeft:"1px solid #1E2D45", flexDirection:"column", flexShrink:0, height:"100vh", position:"sticky", top:0 }}>
        <div style={{ padding:"17px 15px 13px", borderBottom:"1px solid #1E2D45" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, cursor:"pointer" }} onClick={() => nav("/")}>
            <div style={{ width:33, height:33, borderRadius:10, background:"linear-gradient(135deg,#FF5722,#FFA000)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17 }}>⚡</div>
            <div>
              <div style={{ fontSize:13, fontWeight:800, color:"#fff" }}>SellerSignal</div>
              <div style={{ fontSize:9, color:"#FF5722", fontWeight:700 }}>AI PLATFORM</div>
            </div>
          </div>
        </div>
        <nav style={{ flex:1, padding:"10px 9px", display:"flex", flexDirection:"column", gap:2, overflowY:"auto" }}>
          {NAV.map(n => <SidebarItem key={n.path} item={n} active={isActive(n.path)} onClick={() => nav(n.path)}/>)}
        </nav>
        <div style={{ padding:"10px 9px 14px", borderTop:"1px solid #1E2D45" }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, padding:"10px 11px", background:"#0D1526", borderRadius:11, border:"1px solid #1E2D45" }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"linear-gradient(135deg,#FF5722,#FFA000)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:"#fff", flexShrink:0 }}>י</div>
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:"#fff" }}>יעקב אביש׳יד</div>
              <div style={{ fontSize:9, color:"#FFA000", fontWeight:700 }}>⭐ Pro</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main" style={{ flex:1, minWidth:0, overflowY:"auto" }}>
        {/* Mobile topbar */}
        <div className="mobtop" style={{ padding:"12px 15px", borderBottom:"1px solid #1E2D45", background:"rgba(7,11,23,0.96)", backdropFilter:"blur(20px)", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:27, height:27, borderRadius:8, background:"linear-gradient(135deg,#FF5722,#FFA000)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>⚡</div>
            <span style={{ fontSize:14, fontWeight:800, color:"#fff" }}>SellerSignal</span>
          </div>
          <div style={{ width:27, height:27, borderRadius:"50%", background:"linear-gradient(135deg,#FF5722,#FFA000)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff" }}>י</div>
        </div>

        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="btmnav" style={{ position:"fixed", bottom:0, right:0, left:0, background:"rgba(7,11,23,0.97)", borderTop:"1px solid #1E2D45", backdropFilter:"blur(20px)", zIndex:100, padding:"6px 0 10px", flexDirection:"row" }}>
        {NAV.map(n => {
          const active = isActive(n.path);
          return (
            <button key={n.path} onClick={() => nav(n.path)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2, padding:"4px 2px", background:"none", border:"none", cursor:"pointer", position:"relative" }}>
              <span style={{ fontSize:21 }}>{n.icon}</span>
              <span style={{ fontSize:9, fontWeight: active ? 700 : 400, color: active ? "#FF5722" : "rgba(255,255,255,0.3)" }}>{n.label}</span>
              {n.badge && <span style={{ position:"absolute", top:1, right:"50%", transform:"translateX(8px)", minWidth:14, height:14, background:"#F44336", borderRadius:99, fontSize:8, fontWeight:700, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", padding:"0 3px" }}>{n.badge}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

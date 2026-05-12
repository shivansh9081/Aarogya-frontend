import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  ResponsiveContainer, Legend, LineChart, Line, CartesianGrid,
} from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";
import { Analytics, Complaint } from "../types";
import toast from "react-hot-toast";
import { fadeUp, scaleIn, slideRight, staggerContainer } from "../utils/animations";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ── Constants ── */
const PIE_COLORS   = ["#7060c0","#F97316","#d4706a","#60b070","#c08050","#6090d0"];
const ease         = [0.22, 1, 0.36, 1] as const;
const TABS         = ["Overview","Complaints","Users","Departments","Heatmap"] as const;
type Tab = typeof TABS[number];

/* ── useCountUp ── */
function useCountUp(target: number, active = true, duration = 1000) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    if (!active) return;
    setVal(0);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, active, duration]);
  return val;
}

/* ── Top progress bar ── */
const ProgressBar: React.FC<{ loading: boolean }> = ({ loading }) => (
  <AnimatePresence>
    {loading && (
      <motion.div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]"
        style={{ background: "rgba(0,0,0,0.1)" }}>
        <motion.div className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg,#F97316,#ea6a0a)" }}
          initial={{ width: "0%" }}
          animate={{ width: "85%" }}
          exit={{ width: "100%", opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }} />
      </motion.div>
    )}
  </AnimatePresence>
);

/* ── Custom tooltip ── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-sm px-3 py-2 text-xs text-[#f0ece8]">
      <p className="font-bold">{label}</p>
      <p style={{ color: "#F97316" }}>{payload[0].value} complaints</p>
    </div>
  );
};

/* ── Tab panel animation ── */
const tabPanel = {
  hidden:  { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease } },
  exit:    { opacity: 0, x: -10, transition: { duration: 0.2, ease } },
};

/* ── Stat card ── */
const StatCard: React.FC<{
  label: string; value: number; icon: string; color: string; active: boolean;
}> = ({ label, value, icon, color, active }) => {
  const count = useCountUp(value, active);
  return (
    <motion.div variants={scaleIn}
      className="glass-sm p-5 flex items-center gap-4"
      whileHover={{ y: -5, boxShadow: "0 14px 38px rgba(0,0,0,0.35)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}>
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-extrabold text-[#f0ece8] leading-none">{count}</p>
        <p className="text-[11px] text-[#b8aec8] mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
};

/* ── Overview Tab ── */
const OverviewTab: React.FC<{ analytics: Analytics | null }> = ({ analytics }) => {
  const a = analytics;
  const categoryData = a ? Object.entries(a.by_category).map(([name, value]) => ({ name, value })) : [];
  const statusData   = a ? Object.entries(a.by_status).map(([name, value]) => ({ name: name.replace("_"," "), value })) : [];
  const priorityData = a ? Object.entries(a.by_priority).map(([name, value]) => ({ name, value })) : [];
  const lineData     = categoryData.map((d, i) => ({ ...d, trend: Math.round((d.value as number) * (0.7 + i * 0.1)) }));

  const STATS = [
    { label: "Total",       value: a?.total_complaints || 0,       icon: "📋", color: "#7060c0" },
    { label: "Resolved",    value: a?.by_status?.resolved || 0,    icon: "✅", color: "#60b070" },
    { label: "In Progress", value: a?.by_status?.in_progress || 0, icon: "⚙️", color: "#F97316" },
    { label: "Escalated",   value: a?.by_status?.escalated || 0,   icon: "🚨", color: "#e08080" },
    { label: "High Priority",value: a?.by_priority?.high || 0,     icon: "🔴", color: "#d4706a" },
    { label: "Avg Days",    value: Math.round(a?.avg_resolution_days || 0), icon: "⏱️", color: "#c08050" },
  ];

  return (
    <motion.div variants={tabPanel} initial="hidden" animate="visible" exit="exit" className="space-y-5">
      {/* Stats */}
      <motion.div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3"
        variants={staggerContainer} initial="hidden" animate="visible">
        {STATS.map(s => <StatCard key={s.label} {...s} active={true} />)}
      </motion.div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar chart */}
        <motion.div className="glass p-5" variants={fadeUp} initial="hidden" animate="visible">
          <p className="section-label mb-4">Category Distribution</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#b8aec8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#b8aec8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6,6,0,0]}
                isAnimationActive animationDuration={800} animationEasing="ease-out">
                {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Pie chart */}
        <motion.div className="glass p-5" variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.08 }}>
          <p className="section-label mb-4">Status Breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={70} innerRadius={35}
                isAnimationActive animationBegin={0} animationDuration={900}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#b8aec8" }} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Line chart */}
        <motion.div className="glass p-5" variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.16 }}>
          <p className="section-label mb-4">Trend by Category</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#b8aec8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#b8aec8" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" stroke="#F97316" strokeWidth={2} dot={{ fill: "#F97316", r: 3 }}
                isAnimationActive animationDuration={1200} animationEasing="ease-out" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Priority bubbles */}
      <motion.div className="glass p-5" variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
        <p className="section-label mb-5">Priority Distribution</p>
        <div className="flex items-end justify-center gap-8 h-[120px]">
          {priorityData.map((d, i) => {
            const size = Math.max(44, Math.min(96, 44 + (d.value as number) * 10));
            const c = ({ high: "#d4706a", medium: "#F97316", low: "#60b070" } as any)[d.name] || "#7060c0";
            return (
              <motion.div key={d.name} className="flex flex-col items-center gap-2"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.12, type: "spring", stiffness: 260, damping: 18 }}>
                <motion.div className="bubble-data"
                  style={{ width: size, height: size, fontSize: size > 60 ? 16 : 13,
                    background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3) 0%, ${c} 50%, rgba(0,0,0,0.2) 100%)`,
                    boxShadow: `0 6px 20px ${c}55` }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}>
                  {d.value}
                </motion.div>
                <span className="text-[11px] text-[#b8aec8] capitalize">{d.name}</span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ── Complaints Tab ── */
const ComplaintsTab: React.FC<{ navigate: (p: string) => void }> = ({ navigate }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter]         = useState({ status: "", category: "", priority: "" });
  const [loading, setLoading]       = useState(false);
  const [selected, setSelected]     = useState<Set<number>>(new Set());
  const [exporting, setExporting]   = useState(false);
  const [listKey, setListKey]       = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filter.status)   p.append("status",   filter.status);
      if (filter.category) p.append("category", filter.category);
      if (filter.priority) p.append("priority", filter.priority);
      const { data } = await api.get(`/complaints/?${p}&limit=100`);
      setComplaints(data);
      setListKey(k => k + 1);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleSelect = (id: number) => {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const exportCSV = () => {
    setExporting(true);
    const rows = [["ID","Title","Category","Status","Priority","Date"],
      ...complaints.map(c => [c.complaint_id, c.title, c.category||"", c.status, c.priority, new Date(c.created_at).toLocaleDateString()])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv);
    a.download = "complaints.csv"; a.click();
    setTimeout(() => setExporting(false), 800);
  };

  return (
    <motion.div variants={tabPanel} initial="hidden" animate="visible" exit="exit" className="space-y-4">
      <ProgressBar loading={loading} />
      <div className="glass p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="font-semibold text-[#f0ece8]">
            All Complaints <span className="text-[#b8aec8] font-normal text-sm">({complaints.length})</span>
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { key: "status",   opts: ["submitted","assigned","in_progress","escalated","resolved"] },
              { key: "category", opts: ["water","electricity","road","sanitation","others"] },
              { key: "priority", opts: ["high","medium","low"] },
            ].map(({ key, opts }) => (
              <select key={key} className="glass-input w-auto text-xs py-1.5"
                value={(filter as any)[key]} onChange={e => setFilter({ ...filter, [key]: e.target.value })}>
                <option value="">All {key}</option>
                {opts.map(o => <option key={o} value={o}>{o.replace("_"," ")}</option>)}
              </select>
            ))}
            <motion.button onClick={exportCSV}
              className="btn-ghost text-xs px-4 py-1.5 flex items-center gap-1.5"
              whileTap={{ scale: 0.96 }}
              animate={exporting ? { scale: [1, 1.06, 1] } : {}}
              transition={{ duration: 0.3 }}>
              <motion.span animate={exporting ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 0.6 }}>📤</motion.span>
              Export CSV
            </motion.button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th className="py-2 px-3 w-8"><input type="checkbox" className="opacity-50" /></th>
                {["ID","Title","Category","Status","Priority","User","Date",""].map(h => (
                  <th key={h} className="text-left py-2 px-3 section-label">{h}</th>
                ))}
              </tr>
            </thead>
            <motion.tbody key={listKey} variants={staggerContainer} initial="hidden" animate="visible">
              {complaints.map((c, i) => {
                const isSel = selected.has(c.id);
                return (
                  <motion.tr key={c.id} variants={fadeUp} custom={i}
                    className="relative transition-colors hover:bg-white/3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {/* Orange left border on select */}
                    <td className="py-2.5 px-3 relative">
                      <AnimatePresence>
                        {isSel && (
                          <motion.div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full"
                            style={{ background: "#F97316", originY: 0 }}
                            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} exit={{ scaleY: 0 }}
                            transition={{ duration: 0.2, ease }} />
                        )}
                      </AnimatePresence>
                      <input type="checkbox" checked={isSel} onChange={() => toggleSelect(c.id)} className="opacity-60" />
                    </td>
                    <td className="py-2.5 px-3"><code className="text-[11px] text-[#b8aec8]">{c.complaint_id}</code></td>
                    <td className="py-2.5 px-3 max-w-[140px] truncate text-[#f0ece8] text-xs">{c.title}</td>
                    <td className="py-2.5 px-3 text-xs capitalize text-[#b8aec8]">{c.category || "N/A"}</td>
                    <td className="py-2.5 px-3">
                      <motion.span layout className={`pill pill-${c.status}`}>{c.status.replace("_"," ")}</motion.span>
                    </td>
                    <td className="py-2.5 px-3"><span className={`pill pill-${c.priority}`}>{c.priority}</span></td>
                    <td className="py-2.5 px-3 text-xs text-[#b8aec8]">{c.user?.name || "N/A"}</td>
                    <td className="py-2.5 px-3 text-xs text-[#b8aec8]">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-2.5 px-3">
                      <button onClick={() => navigate(`/complaints/${c.complaint_id}`)}
                        className="text-xs text-[#F97316] hover:underline font-medium">View</button>
                    </td>
                  </motion.tr>
                );
              })}
            </motion.tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Users Tab ── */
const UsersTab: React.FC = () => {
  const [users, setUsers]   = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get("/admin/users").then(r => setUsers(r.data)).catch(() => toast.error("Failed to load users")).finally(() => setLoading(false));
  }, []);

  const ROLE_COLORS: Record<string, string> = { citizen: "#7060c0", officer: "#F97316", admin: "#d4706a" };

  return (
    <motion.div variants={tabPanel} initial="hidden" animate="visible" exit="exit">
      <ProgressBar loading={loading} />
      <div className="glass p-5">
        <p className="font-semibold text-[#f0ece8] mb-4">Users <span className="text-[#b8aec8] font-normal text-sm">({users.length})</span></p>
        <motion.div className="space-y-2" variants={staggerContainer} initial="hidden" animate="visible">
          {users.map((u, i) => {
            const rc = ROLE_COLORS[u.role] || "#b8aec8";
            return (
              <motion.div key={u.id} variants={slideRight} custom={i}
                className="flex items-center justify-between p-3 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                whileHover={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: `${rc}33`, border: `1px solid ${rc}55`, color: rc }}>
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f0ece8]">{u.name}</p>
                    <p className="text-[11px] text-[#b8aec8]">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AnimatePresence mode="wait">
                    <motion.span key={u.role}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ background: `${rc}22`, color: rc, border: `1px solid ${rc}44` }}
                      initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2, ease }}>
                      {u.role}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-[11px] text-[#b8aec8]">{new Date(u.created_at).toLocaleDateString()}</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
};

/* ── Departments Tab ── */
const DepartmentsTab: React.FC = () => {
  const [load, setLoad]     = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get("/routing/department-load").then(r => setLoad(r.data)).catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  }, []);

  const CAT_ICONS: Record<string, string> = { water:"💧", electricity:"⚡", road:"🛣️", sanitation:"🗑️", healthcare:"🏥", others:"📋" };

  return (
    <motion.div variants={tabPanel} initial="hidden" animate="visible" exit="exit">
      <ProgressBar loading={loading} />
      <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        variants={staggerContainer} initial="hidden" animate="visible">
        {load.map((d, i) => (
          <motion.div key={d.department_id} variants={scaleIn} custom={i}
            className="glass-sm p-5"
            whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xl">{CAT_ICONS[d.category] || "📋"}</span>
              <div>
                <p className="font-bold text-[#f0ece8] text-sm">{d.department_name}</p>
                <p className="text-[11px] text-[#b8aec8]">{d.total} total · {d.pending} pending</p>
              </div>
            </div>
            <div className="h-2 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: d.load_pct > 80 ? "#e08080" : d.load_pct > 50 ? "#F97316" : "#70c090" }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(d.load_pct, 100)}%` }}
                transition={{ duration: 0.9, ease }} />
            </div>
            <div className="flex justify-between text-[11px] text-[#b8aec8]">
              <span>{d.load_pct}% load</span>
              <span>{d.resolved} resolved</span>
              <span>~{d.avg_resolution_days}d avg</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

/* ── Heatmap Tab ── */
const PRIORITY_COLORS: Record<string, string> = {
  high: "#e05050", medium: "#F97316", low: "#4ade80",
};
const CAT_COLORS: Record<string, string> = {
  water: "#60a5fa", electricity: "#fbbf24", road: "#94a3b8",
  sanitation: "#4ade80", healthcare: "#f87171", others: "#a78bfa",
};
const CAT_ICONS_MAP: Record<string, string> = {
  water:"💧", electricity:"⚡", road:"🛣️", sanitation:"🗑️", healthcare:"🏥", others:"📋",
};

function makeMarkerIcon(priority: string) {
  const color = PRIORITY_COLORS[priority] || "#b8aec8";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${color};border:2px solid rgba(255,255,255,0.8);
      box-shadow:0 0 8px ${color}99;
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

const HeatmapTab: React.FC = () => {
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [priFilter, setPriFilter] = useState("all");
  const [days, setDays]         = useState(90);

  const mapDivRef   = useRef<HTMLDivElement>(null);
  const mapRef      = useRef<L.Map | null>(null);
  const layerRef    = useRef<L.LayerGroup | null>(null);

  // Fetch heatmap data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { days };
      if (catFilter !== "all") params.category = catFilter;
      if (priFilter !== "all") params.priority = priFilter;
      const { data: res } = await api.get("/admin/heatmap/data", { params });
      setData(res);
    } catch {
      toast.error("Failed to load heatmap data");
    } finally {
      setLoading(false);
    }
  }, [days, catFilter, priFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Init Leaflet map once
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;

    const map = L.map(mapDivRef.current, { zoomControl: true })
      .setView([30.9010, 75.8490], 8); // Punjab center

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapRef.current || !layerRef.current || !data) return;

    layerRef.current.clearLayers();
    const points: any[] = data.points || [];

    if (points.length === 0) return;

    points.forEach((pt: any) => {
      const color = PRIORITY_COLORS[pt.priority] || "#b8aec8";
      const catColor = CAT_COLORS[pt.category] || "#b8aec8";

      // Glow circle (heatmap effect)
      L.circle([pt.latitude, pt.longitude], {
        radius: 1800,
        color: "transparent",
        fillColor: color,
        fillOpacity: 0.12,
        weight: 0,
      }).addTo(layerRef.current!);

      // Dot marker
      const marker = L.marker([pt.latitude, pt.longitude], {
        icon: makeMarkerIcon(pt.priority),
      });

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;padding:4px 0">
          <div style="font-weight:700;font-size:13px;color:#f0fdf4;margin-bottom:6px">
            ${CAT_ICONS_MAP[pt.category] || "📋"} ${pt.title}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
            <span style="background:${catColor}22;color:${catColor};border:1px solid ${catColor}44;
              padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600">
              ${pt.category}
            </span>
            <span style="background:${color}22;color:${color};border:1px solid ${color}44;
              padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600">
              ${pt.priority}
            </span>
          </div>
          <div style="font-size:11px;color:#6ee7b7">📍 ${pt.area || pt.city || "—"}, ${pt.city || ""}</div>
          <div style="font-size:10px;color:#4b7a5e;margin-top:3px;font-family:monospace">
            ${pt.complaint_id}
          </div>
        </div>
      `, { maxWidth: 240 });

      marker.addTo(layerRef.current!);
    });

    // Fit map to markers
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p: any) => [p.latitude, p.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }, [data]);

  const points = data?.points || [];
  const topCities = data?.top_cities || [];
  const topStates = data?.top_states || [];
  const byPriority = data?.by_priority || {};
  const byCategory = data?.by_category || {};
  const COLORS = ["#7060c0","#F97316","#d4706a","#60b070","#c08050","#6090d0"];

  return (
    <motion.div variants={tabPanel} initial="hidden" animate="visible" exit="exit" className="space-y-5">
      <ProgressBar loading={loading} />

      {/* ── Filters ── */}
      <motion.div className="flex flex-wrap gap-3 items-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <select className="glass-input w-auto text-xs py-1.5"
          value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {["water","electricity","road","sanitation","healthcare","others"].map(c => (
            <option key={c} value={c}>{CAT_ICONS_MAP[c]} {c}</option>
          ))}
        </select>
        <select className="glass-input w-auto text-xs py-1.5"
          value={priFilter} onChange={e => setPriFilter(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
        <select className="glass-input w-auto text-xs py-1.5"
          value={days} onChange={e => setDays(Number(e.target.value))}>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>All time</option>
        </select>
        <span className="text-xs text-[#b8aec8] ml-auto">
          {points.length} geo-tagged complaint{points.length !== 1 ? "s" : ""}
        </span>
      </motion.div>

      {/* ── Stat pills ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Pinned", value: points.length, color: "#4ade80", icon: "📍" },
          { label: "High Priority", value: byPriority.high || 0, color: "#e05050", icon: "🔴" },
          { label: "Medium", value: byPriority.medium || 0, color: "#F97316", icon: "🟡" },
          { label: "Low", value: byPriority.low || 0, color: "#4ade80", icon: "🟢" },
        ].map(({ label, value, color, icon }) => (
          <motion.div key={label} className="glass-sm p-4 text-center"
            whileHover={{ y: -3, boxShadow: `0 8px 24px ${color}22` }}>
            <div className="text-xl mb-1">{icon}</div>
            <p className="text-2xl font-extrabold" style={{ color }}>{value}</p>
            <p className="text-[11px] text-[#b8aec8] mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Map ── */}
      <motion.div className="glass overflow-hidden"
        style={{ borderRadius: 20, border: "1px solid rgba(74,222,128,0.2)" }}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>

        {/* Map header */}
        <div className="flex items-center justify-between px-4 py-2.5"
          style={{ background: "rgba(14,31,18,0.9)", borderBottom: "1px solid rgba(74,222,128,0.15)" }}>
          <div className="flex items-center gap-2">
            <span>🗺️</span>
            <span className="text-xs font-semibold text-[#6ee7b7]">Complaint Heatmap — Punjab, India</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[#4b7a5e]">
            {[["high","#e05050"],["medium","#F97316"],["low","#4ade80"]].map(([p, c]) => (
              <span key={p} className="flex items-center gap-1">
                <span style={{ width:8,height:8,borderRadius:"50%",background:c,display:"inline-block" }} />
                {p}
              </span>
            ))}
          </div>
        </div>

        {/* Map container */}
        <div style={{ position: "relative" }}>
          <div ref={mapDivRef} style={{ height: 420, width: "100%" }} />

          {/* Empty state overlay */}
          {!loading && points.length === 0 && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: "rgba(8,15,10,0.75)", backdropFilter: "blur(4px)",
              zIndex: 500,
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📍</div>
              <p style={{ color: "#6ee7b7", fontSize: 14, fontWeight: 600 }}>No geo-tagged complaints yet</p>
              <p style={{ color: "#4b7a5e", fontSize: 12, marginTop: 6 }}>
                Submit complaints with location to see them here
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Location bars ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[
          { title: "Top Cities", items: topCities.map((c: any) => ({ name: c.city, value: c.count })) },
          { title: "Top States", items: topStates.map((s: any) => ({ name: s.state, value: s.count })) },
        ].map(({ title, items }) => (
          <motion.div key={title} className="glass p-5" variants={fadeUp} initial="hidden" animate="visible">
            <p className="section-label mb-4">{title}</p>
            {items.length === 0 ? (
              <p className="text-xs text-[#b8aec8]">No data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {items.slice(0, 8).map(({ name, value }: any, i: number) => {
                  const max = items[0]?.value || 1;
                  const pct = Math.round((value / max) * 100);
                  const c = COLORS[i % COLORS.length];
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs text-[#b8aec8] w-28 truncate">{name}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: c }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, delay: i * 0.05, ease }} />
                      </div>
                      <span className="text-xs font-bold w-6 text-right" style={{ color: c }}>{value}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ── Category breakdown ── */}
      {Object.keys(byCategory).length > 0 && (
        <motion.div className="glass p-5" variants={fadeUp} initial="hidden" animate="visible">
          <p className="section-label mb-4">Category Breakdown</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(byCategory).map(([cat, count]: any) => (
              <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: `${CAT_COLORS[cat] || "#b8aec8"}15`, border: `1px solid ${CAT_COLORS[cat] || "#b8aec8"}30` }}>
                <span>{CAT_ICONS_MAP[cat] || "📋"}</span>
                <span className="text-xs font-semibold capitalize" style={{ color: CAT_COLORS[cat] || "#b8aec8" }}>{cat}</span>
                <span className="text-xs font-black" style={{ color: CAT_COLORS[cat] || "#b8aec8" }}>{count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Geo table ── */}
      {points.length > 0 && (
        <motion.div className="glass p-5" variants={fadeUp} initial="hidden" animate="visible">
          <p className="section-label mb-3">Geo-tagged Complaints ({points.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["ID","Category","Priority","Area","City","Coordinates","Status"].map(h => (
                    <th key={h} className="text-left py-2 px-2 section-label">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {points.slice(0, 15).map((r: any) => (
                  <tr key={r.complaint_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                    className="hover:bg-white/3 transition-colors">
                    <td className="py-2 px-2 font-mono text-[#b8aec8] text-[10px]">{r.complaint_id}</td>
                    <td className="py-2 px-2">
                      <span className="flex items-center gap-1 capitalize text-[#f0ece8]">
                        {CAT_ICONS_MAP[r.category]} {r.category}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`pill pill-${r.priority}`}>{r.priority}</span>
                    </td>
                    <td className="py-2 px-2 text-[#b8aec8]">{r.area || "—"}</td>
                    <td className="py-2 px-2 text-[#b8aec8]">{r.city || "—"}</td>
                    <td className="py-2 px-2 font-mono text-[#4b7a5e] text-[10px]">
                      {r.latitude?.toFixed(4)}, {r.longitude?.toFixed(4)}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`pill pill-${r.status}`}>{r.status?.replace("_"," ")}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

/* ── Main AdminDashboard ── */
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab]           = useState<Tab>("Overview");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/admin/analytics")
      .then(r => setAnalytics(r.data))
      .catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5" style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <ProgressBar loading={loading} />

      {/* ── Page header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}>
        <h1 className="text-2xl font-extrabold" style={{ color: "var(--text)" }}>⚙️ Admin Dashboard</h1>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>Platform overview, complaints, users, departments, heatmap</p>
      </motion.div>

      {/* ── Tab bar ── */}
      <motion.div className="flex gap-1 p-1 rounded-2xl relative"
        style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="relative px-4 py-2 rounded-xl text-xs font-semibold transition-colors z-10"
            style={{ color: tab === t ? "#fff" : "var(--text-2)" }}>
            {tab === t && (
              <motion.div layoutId="tab-indicator" className="absolute inset-0 rounded-xl z-[-1]"
                style={{ background: "linear-gradient(135deg,#2d7a2d,#1a5c1a)" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }} />
            )}
            {t}
          </button>
        ))}
      </motion.div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {tab === "Overview"    && <OverviewTab    key="overview"    analytics={analytics} />}
        {tab === "Complaints"  && <ComplaintsTab  key="complaints"  navigate={navigate} />}
        {tab === "Users"       && <UsersTab       key="users" />}
        {tab === "Departments" && <DepartmentsTab key="departments" />}
        {tab === "Heatmap"     && <HeatmapTab     key="heatmap" />}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

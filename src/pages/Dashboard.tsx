import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { Complaint } from "../types";
import toast from "react-hot-toast";

const CAT_ICONS:  Record<string, string> = { water: "💧", electricity: "⚡", road: "🛣️", sanitation: "🗑️", healthcare: "🏥", others: "📋" };
const CAT_COLORS: Record<string, string> = { water: "#3b82f6", electricity: "#f59e0b", road: "#6b7280", sanitation: "#22c55e", healthcare: "#ef4444", others: "#7c3aed" };
const STATUS_COLORS: Record<string, string> = { submitted: "#F97316", assigned: "#3b82f6", in_progress: "#7c3aed", resolved: "#22c55e", escalated: "#ef4444" };
const ease = [0.22, 1, 0.36, 1] as const;

function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target]);
  return val;
}

const StatCard: React.FC<{ label: string; value: number; icon: string; color: string; suffix?: string }> =
  ({ label, value, icon, color, suffix = "" }) => {
    const count = useCountUp(value);
    return (
      <motion.div className="card p-5 flex items-center gap-4"
        whileHover={{ y: -3, boxShadow: "var(--shadow-lg)" }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-black leading-none" style={{ color }}>{count}{suffix}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{label}</p>
        </div>
      </motion.div>
    );
  };

const PulsingDot: React.FC<{ color: string }> = ({ color }) => (
  <span className="relative inline-flex w-2 h-2 mr-1.5 flex-shrink-0">
    <motion.span className="absolute inset-0 rounded-full" style={{ background: color }}
      animate={{ scale: [1, 2, 1], opacity: [0.6, 0, 0.6] }}
      transition={{ duration: 1.5, repeat: Infinity }} />
    <span className="relative w-2 h-2 rounded-full" style={{ background: color }} />
  </span>
);

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState({ status: "", category: "", priority: "" });
  const [search, setSearch]         = useState("");
  const [trackId, setTrackId]       = useState("");
  const [tracked, setTracked]       = useState<Complaint | null>(null);
  const [tracking, setTracking]     = useState(false);

  useEffect(() => { fetchComplaints(); }, [filter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filter.status)   p.append("status",   filter.status);
      if (filter.category) p.append("category", filter.category);
      if (filter.priority) p.append("priority", filter.priority);
      const { data } = await api.get(`/complaints/?${p}`);
      setComplaints(data);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  const handleTrack = async () => {
    if (!trackId.trim()) return;
    setTracking(true);
    try {
      const { data } = await api.get(`/complaints/${trackId.trim()}`);
      setTracked(data);
    } catch { toast.error("Complaint not found"); setTracked(null); }
    finally { setTracking(false); }
  };

  const filtered = complaints.filter(c =>
    !search ||
    c.complaint_id.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const total      = complaints.length;
  const resolved   = complaints.filter(c => c.status === "resolved").length;
  const inProgress = complaints.filter(c => c.status === "in_progress").length;
  const high       = complaints.filter(c => c.priority === "high").length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6" style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* Header */}
      <motion.div className="flex flex-wrap items-center justify-between gap-4"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text)" }}>My Complaints</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>{complaints.length} total complaints</p>
        </div>
        <motion.button onClick={() => navigate("/complaints/new")}
          className="btn-glow px-6 py-2.5 text-sm"
          whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}>
          + Report Issue
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <StatCard label="Total"          value={total}      icon="📋" color="#7c3aed" />
        <StatCard label="Resolved"       value={resolved}   icon="✅" color="#22c55e" />
        <StatCard label="In Progress"    value={inProgress} icon="⚙️" color="#F97316" />
        <StatCard label="High Priority"  value={high}       icon="🔴" color="#ef4444" />
      </motion.div>

      {/* Track by ID */}
      <motion.div className="card p-5"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <p className="section-label mb-3">🔍 Track by Complaint ID</p>
        <div className="flex gap-2">
          <input className="glass-input flex-1" placeholder="e.g. CMP-202506-A1B2C3"
            value={trackId} onChange={e => setTrackId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleTrack()} />
          <motion.button onClick={handleTrack} disabled={tracking || !trackId.trim()}
            className="btn-glow px-5 py-2 text-sm flex-shrink-0"
            whileTap={{ scale: 0.96 }}>
            {tracking ? "…" : "Track"}
          </motion.button>
        </div>

        <AnimatePresence>
          {tracked && (
            <motion.div className="mt-4 p-4 rounded-2xl"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-mono text-xs font-bold mb-0.5" style={{ color: "var(--orange)" }}>{tracked.complaint_id}</p>
                  <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{tracked.title}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`pill pill-${tracked.status}`}>{tracked.status.replace("_", " ")}</span>
                  <span className={`pill pill-${tracked.priority}`}>{tracked.priority}</span>
                </div>
              </div>
              <div className="space-y-2 mb-3">
                {tracked.status_logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: STATUS_COLORS[log.status] || "#6b7280" }} />
                    <div>
                      <p className="text-xs font-semibold capitalize" style={{ color: "var(--text)" }}>{log.status.replace("_", " ")}</p>
                      {log.note && <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{log.note}</p>}
                      <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate(`/complaints/${tracked.complaint_id}`)}
                className="text-xs font-semibold" style={{ color: "var(--orange)" }}>
                View full details →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Filters */}
      <motion.div className="flex flex-wrap gap-3"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <input className="glass-input flex-1 min-w-[180px]" placeholder="🔍 Search by ID or title…"
          value={search} onChange={e => setSearch(e.target.value)} />
        {[
          { key: "status",   opts: ["submitted","assigned","in_progress","escalated","resolved"] },
          { key: "category", opts: ["water","electricity","road","sanitation","healthcare","others"] },
          { key: "priority", opts: ["high","medium","low"] },
        ].map(({ key, opts }) => (
          <select key={key} className="glass-input w-auto"
            value={(filter as any)[key]} onChange={e => setFilter({ ...filter, [key]: e.target.value })}>
            <option value="">All {key}</option>
            {opts.map(o => <option key={o} value={o}>{o.replace("_", " ")}</option>)}
          </select>
        ))}
      </motion.div>

      {/* Complaint grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center gap-4">
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}>
            <span style={{ fontSize: 56 }}>📭</span>
          </motion.div>
          <p style={{ color: "var(--text-3)" }}>No complaints found.</p>
          <motion.button onClick={() => navigate("/complaints/new")}
            className="btn-glow px-6 py-2.5 text-sm"
            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
            Submit your first complaint
          </motion.button>
        </div>
      ) : (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          {filtered.map((c, i) => {
            const catColor = CAT_COLORS[c.category || "others"];
            const statusColor = STATUS_COLORS[c.status] || "#6b7280";
            const isActive = c.status === "in_progress";
            return (
              <motion.div key={c.id}
                onClick={() => navigate(`/complaints/${c.complaint_id}`)}
                className="card p-5 cursor-pointer group relative overflow-hidden"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease }}
                whileHover={{ y: -4, boxShadow: "var(--shadow-lg)" }}>

                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: `linear-gradient(90deg, ${catColor}, ${statusColor})` }} />

                {/* Header row */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${catColor}12`, border: `1px solid ${catColor}25` }}>
                    {CAT_ICONS[c.category || "others"]}
                  </div>
                  <span className="font-mono text-[11px] flex-1 truncate" style={{ color: "var(--text-3)" }}>
                    {c.complaint_id}
                  </span>
                  <span className={`pill pill-${c.status} flex items-center`}>
                    {isActive && <PulsingDot color={statusColor} />}
                    {c.status.replace("_", " ")}
                  </span>
                </div>

                <h4 className="font-semibold text-sm mb-1 line-clamp-1" style={{ color: "var(--text)" }}>{c.title}</h4>
                <p className="text-xs line-clamp-2 mb-3 leading-relaxed" style={{ color: "var(--text-3)" }}>{c.description}</p>

                {c.location_city && (
                  <p className="text-[11px] mb-2 flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                    <span>📍</span>
                    {[c.location_area, c.location_city, c.location_state].filter(Boolean).join(", ")}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <span className={`pill pill-${c.priority}`}>{c.priority}</span>
                  <span className="text-[11px]" style={{ color: "var(--text-3)" }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </span>
                </div>

                {c.is_duplicate && (
                  <div className="mt-2 text-[11px] px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(249,115,22,0.08)", color: "var(--orange)", border: "1px solid rgba(249,115,22,0.2)" }}>
                    ⚠️ Similar to {c.duplicate_of}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;

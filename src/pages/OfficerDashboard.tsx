import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { fadeUp, scaleIn, slideRight, staggerContainer } from "../utils/animations";

/* ── Types ── */
interface RoutingMeta {
  department_name?: string; office_name?: string; office_city?: string;
  office_zone?: string; officer_name?: string; distance_km?: number;
  routing_method?: string; department_email?: string; office_phone?: string;
}
interface Complaint {
  id: number; complaint_id: string; title: string; description: string;
  category?: string; status: string; priority: string; severity_score?: number;
  estimated_resolution_days?: number; location_area?: string; location_city?: string;
  location_state?: string; latitude?: number; longitude?: number;
  created_at: string; escalated_at?: string;
  routing_metadata?: RoutingMeta;
  user?: { name: string; email: string; phone?: string };
}

/* ── Constants ── */
const STATUS_COLORS: Record<string, string> = {
  submitted: "#f0a070", assigned: "#a090e0", in_progress: "#6090d0",
  escalated: "#e08080", resolved: "#70c090",
};
const PRIORITY_COLORS: Record<string, string> = { high: "#e08080", medium: "#f0a060", low: "#70c090" };
const CAT_ICONS: Record<string, string> = {
  water: "💧", electricity: "⚡", road: "🛣️", sanitation: "🗑️", healthcare: "🏥", others: "📋",
};
const ease = [0.22, 1, 0.36, 1] as const;

/* ── useCountUp ── */
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
  }, [target, duration]);
  return val;
}

/* ── Stat Card ── */
const StatCard: React.FC<{
  label: string; value: number; icon: string; color: string; pulse?: boolean;
}> = ({ label, value, icon, color, pulse }) => {
  const count = useCountUp(value);
  return (
    <motion.div variants={scaleIn}
      className="glass-sm p-5 flex items-center gap-4 relative overflow-hidden"
      whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.38)" }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-extrabold text-[#f0ece8] leading-none">{count}</p>
        <p className="text-[11px] text-[#b8aec8] mt-0.5">{label}</p>
      </div>
      {pulse && value > 0 && (
        <span className="absolute top-3 right-3">
          <motion.span className="absolute inline-flex w-3 h-3 rounded-full"
            style={{ background: "#e08080" }}
            animate={{ scale: [1, 1.9, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity }} />
          <span className="relative inline-flex w-3 h-3 rounded-full" style={{ background: "#e08080" }} />
        </span>
      )}
    </motion.div>
  );
};

/* ── Escalate Confirm Modal ── */
const EscalateModal: React.FC<{
  complaintId: string;
  onConfirm: (note: string) => void;
  onClose: () => void;
}> = ({ complaintId, onConfirm, onClose }) => {
  const [note, setNote] = useState("");
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={onClose}>
      <motion.div className="glass p-6 w-full max-w-sm"
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        onClick={e => e.stopPropagation()}>
        <p className="text-sm font-bold text-[#e08080] mb-1">🚨 Escalate Complaint</p>
        <p className="text-xs text-[#b8aec8] mb-4 font-mono">{complaintId}</p>
        <textarea className="glass-input w-full text-xs resize-none mb-4" rows={3}
          placeholder="Reason for escalation (optional)"
          value={note} onChange={e => setNote(e.target.value)} />
        <div className="flex gap-2 justify-end">
          <motion.button className="btn-ghost text-xs px-4 py-2" onClick={onClose} whileTap={{ scale: 0.96 }}>
            Cancel
          </motion.button>
          <motion.button
            className="btn-glow text-xs px-4 py-2"
            style={{ background: "linear-gradient(135deg,#e08080,#c05050)" }}
            onClick={() => onConfirm(note)}
            whileTap={{ scale: 0.96 }}>
            Escalate
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

/* ── Complaint Card ── */
const ComplaintCard: React.FC<{
  complaint: Complaint;
  onUpdate: (id: string, status: string, note: string) => Promise<void>;
  onView: () => void;
}> = ({ complaint: c, onUpdate, onView }) => {
  const [note, setNote]           = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [expanded, setExpanded]   = useState(false);
  const [updating, setUpdating]   = useState(false);
  const [flash, setFlash]         = useState(false);
  const [checkmark, setCheckmark] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const r = c.routing_metadata;

  const handleUpdate = async (status: string, n: string) => {
    setUpdating(true);
    try {
      await onUpdate(c.complaint_id, status, n);
      setFlash(true);
      setCheckmark(true);
      setTimeout(() => setFlash(false), 600);
      setTimeout(() => setCheckmark(false), 1200);
      setNote(""); setNewStatus("");
    } finally { setUpdating(false); }
  };

  const statusColor = STATUS_COLORS[c.status] || "#b8aec8";
  const priColor    = PRIORITY_COLORS[c.priority] || "#b8aec8";

  return (
    <>
      <AnimatePresence>
        {showEscalate && (
          <EscalateModal
            complaintId={c.complaint_id}
            onConfirm={(n) => { setShowEscalate(false); handleUpdate("escalated", n); }}
            onClose={() => setShowEscalate(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        variants={fadeUp}
        className="glass-sm p-5 relative overflow-hidden"
        style={{ borderLeft: `3px solid ${priColor}` }}
        whileHover={{ y: -2, boxShadow: "0 10px 32px rgba(0,0,0,0.3)" }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {/* Green flash overlay on success */}
        <AnimatePresence>
          {flash && (
            <motion.div className="absolute inset-0 rounded-[inherit] pointer-events-none z-10"
              style={{ background: "rgba(112,192,144,0.15)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }} />
          )}
        </AnimatePresence>

        {/* Floating checkmark toast */}
        <AnimatePresence>
          {checkmark && (
            <motion.div className="absolute right-4 top-3 text-sm font-bold z-20 pointer-events-none"
              style={{ color: "#70c090" }}
              initial={{ opacity: 1, y: 0 }} animate={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.9, ease }}>
              ✓ Updated
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-xl mt-0.5">{CAT_ICONS[c.category || "others"]}</span>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <code className="text-[11px] text-[#b8aec8]">{c.complaint_id}</code>

                {/* Status badge with layout animation */}
                <motion.span layout className="pill text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{
                    background: `${statusColor}22`,
                    color: statusColor,
                    border: `1px solid ${statusColor}44`,
                  }}>
                  {c.status === "in_progress" && (
                    <motion.span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                      style={{ background: statusColor }}
                      animate={{ scale: [1, 1.7, 1], opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.3, repeat: Infinity }} />
                  )}
                  {c.status.replace("_", " ")}
                </motion.span>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${priColor}22`, color: priColor, border: `1px solid ${priColor}44` }}>
                  {c.priority}
                </span>
                {c.escalated_at && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(224,128,128,0.2)", color: "#e08080", border: "1px solid rgba(224,128,128,0.3)" }}>
                    🚨 ESCALATED
                  </span>
                )}
              </div>
              <p className="font-semibold text-[#f0ece8] text-sm">{c.title}</p>
              {c.user && <p className="text-[11px] text-[#b8aec8] mt-0.5">By: {c.user.name} · {c.user.email}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <motion.button onClick={() => setExpanded(e => !e)}
              className="btn-ghost text-xs px-3 py-1.5" whileTap={{ scale: 0.95 }}>
              {expanded ? "▲ Less" : "▼ Details"}
            </motion.button>
            <button onClick={onView} className="text-xs text-[#F97316] hover:underline font-medium self-center">
              Full View →
            </button>
          </div>
        </div>

        {/* Location + routing */}
        <div className="flex flex-wrap gap-3 mb-3">
          {(c.location_area || c.location_city) && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#b8aec8]">
              <span>📍</span>
              <span>{[c.location_area, c.location_city, c.location_state].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {r?.office_name && (
            <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "#a090e0" }}>
              <span>🏢</span><span>{r.office_name}</span>
              {r.distance_km && <span className="text-[#b8aec8]">({r.distance_km}km)</span>}
            </div>
          )}
          <div className="text-[11px] text-[#b8aec8]">
            {new Date(c.created_at).toLocaleDateString()} · ~{c.estimated_resolution_days}d
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div className="mt-3 space-y-3"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease }}>
              <p className="text-xs text-[#b8aec8] leading-relaxed p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {c.description}
              </p>
              {r && (
                <div className="p-3 rounded-2xl space-y-1.5"
                  style={{ background: "rgba(160,144,224,0.1)", border: "1px solid rgba(160,144,224,0.2)" }}>
                  <p className="section-label mb-2">🔀 Routing Details</p>
                  {[
                    ["Department", r.department_name],
                    ["Office", r.office_name],
                    ["City / Zone", `${r.office_city || ""}${r.office_zone ? " · " + r.office_zone : ""}`],
                    ["Officer", r.officer_name],
                    ["Contact", r.office_phone || r.department_email],
                    ["Method", r.routing_method],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label as string} className="flex justify-between text-xs">
                      <span className="text-[#b8aec8]">{label}</span>
                      <span className="text-[#f0ece8] font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status update controls */}
        {c.status !== "resolved" && (
          <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-white/8">
            <select className="glass-input w-auto text-xs py-1.5" value={newStatus}
              onChange={e => setNewStatus(e.target.value)}>
              <option value="">Update status...</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <input className="glass-input flex-1 min-w-[140px] text-xs py-1.5"
              placeholder="Add note (optional)" value={note} onChange={e => setNote(e.target.value)} />
            <motion.button
              onClick={() => { if (newStatus) handleUpdate(newStatus, note); }}
              disabled={!newStatus || updating}
              className="btn-glow text-xs px-4 py-1.5 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#F97316,#ea6a0a)" }}
              whileTap={{ scale: 0.96 }}>
              {updating ? "..." : "Update"}
            </motion.button>
            <motion.button
              onClick={() => setShowEscalate(true)}
              className="text-xs px-4 py-1.5 rounded-full font-semibold"
              style={{ background: "rgba(224,128,128,0.15)", color: "#e08080", border: "1px solid rgba(224,128,128,0.3)" }}
              whileHover={{ background: "rgba(224,128,128,0.25)" }}
              whileTap={{ scale: 0.96 }}>
              🚨 Escalate
            </motion.button>
          </div>
        )}
      </motion.div>
    </>
  );
};

/* ── Main Dashboard ── */
const OfficerDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [complaints, setComplaints]       = useState<Complaint[]>([]);
  const [deptComplaints, setDeptComplaints] = useState<Complaint[]>([]);
  const [load, setLoad]                   = useState<any[]>([]);
  const [tab, setTab]                     = useState<"mine" | "dept" | "load">("mine");
  const [filter, setFilter]               = useState({ status: "", priority: "" });
  const [loading, setLoading]             = useState(true);
  const [listKey, setListKey]             = useState(0); // forces re-mount on filter change

  useEffect(() => { fetchAll(); }, [filter]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filter.status)   p.append("status",   filter.status);
      if (filter.priority) p.append("priority", filter.priority);
      const [mine, dept, loadData] = await Promise.all([
        api.get(`/routing/my-complaints?${p}`),
        api.get(`/routing/department-complaints?${p}`),
        api.get("/routing/department-load"),
      ]);
      setComplaints(mine.data);
      setDeptComplaints(dept.data);
      setLoad(loadData.data);
      setListKey(k => k + 1); // trigger stagger re-enter
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };

  const handleStatusUpdate = async (complaint_id: string, status: string, note: string) => {
    await api.patch(`/routing/complaints/${complaint_id}/status`, { status, note });
    toast.success(`Status → ${status}`);
    fetchAll();
  };

  const displayed = tab === "mine" ? complaints : deptComplaints;
  const escalated = displayed.filter(c => c.status === "escalated").length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5" style={{ background: "var(--bg)", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <motion.div className="card p-5 flex flex-wrap items-center justify-between gap-4"
        variants={slideRight} initial="hidden" animate="visible">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
            style={{ background: "rgba(45,122,45,0.12)", border: "1px solid rgba(45,122,45,0.25)" }}>🛡️</div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: "var(--text)" }}>My Assigned Complaints</h1>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>{user?.name} · {user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["mine", "dept", "load"] as const).map(t => (
            <motion.button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all`}
              style={tab === t
                ? { background: "linear-gradient(135deg,#2d7a2d,#1a5c1a)", color: "#fff", boxShadow: "0 4px 14px rgba(45,122,45,0.35)" }
                : { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-2)" }}
              whileTap={{ scale: 0.96 }}>
              {t === "mine" ? "My Complaints" : t === "dept" ? "Department" : "Load Stats"}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Stats row ── */}
      <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-3"
        variants={staggerContainer} initial="hidden" animate="visible">
        <StatCard label="Assigned"          value={complaints.length}                                    icon="📋" color="#b8aec8" />
        <StatCard label="In Progress"       value={complaints.filter(c => c.status === "in_progress").length} icon="⚙️" color="#F97316" />
        <StatCard label="Resolved"          value={complaints.filter(c => c.status === "resolved").length}    icon="✅" color="#70c090" />
        <StatCard label="Pending Escalation" value={escalated} icon="🚨" color="#e08080" pulse />
      </motion.div>

      {/* ── Filters ── */}
      {tab !== "load" && (
        <motion.div className="flex gap-3 flex-wrap"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <select className="glass-input w-auto" value={filter.status}
            onChange={e => setFilter({ ...filter, status: e.target.value })}>
            <option value="">All Status</option>
            {["submitted","assigned","in_progress","escalated","resolved"].map(s => (
              <option key={s} value={s}>{s.replace("_", " ")}</option>
            ))}
          </select>
          <select className="glass-input w-auto" value={filter.priority}
            onChange={e => setFilter({ ...filter, priority: e.target.value })}>
            <option value="">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="text-xs text-[#b8aec8] self-center">{displayed.length} complaints</span>
        </motion.div>
      )}

      {/* ── Load Stats Tab ── */}
      {tab === "load" && (
        <motion.div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          variants={staggerContainer} initial="hidden" animate="visible">
          {load.map((d, i) => (
            <motion.div key={d.department_id} variants={fadeUp} custom={i}
              className="glass-sm p-5"
              whileHover={{ y: -3, boxShadow: "0 12px 32px rgba(0,0,0,0.3)" }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{CAT_ICONS[d.category] || "📋"}</span>
                <div>
                  <p className="font-bold text-[#f0ece8] text-sm">{d.department_name}</p>
                  <p className="text-[11px] text-[#b8aec8]">{d.total} total · {d.pending} pending</p>
                </div>
              </div>
              <div className="h-2 rounded-full mb-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                <motion.div className="h-full rounded-full"
                  style={{ background: d.load_pct > 80 ? "#e08080" : d.load_pct > 50 ? "#f0a060" : "#70c090" }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(d.load_pct, 100)}%` }}
                  transition={{ duration: 0.8, ease }} />
              </div>
              <div className="flex justify-between text-[11px] text-[#b8aec8]">
                <span>{d.load_pct}% load</span>
                <span>{d.resolved} resolved</span>
                <span>~{d.avg_resolution_days}d avg</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Complaints list ── */}
      {tab !== "load" && (
        loading ? (
          <div className="text-center py-16 text-[#b8aec8]">Loading...</div>
        ) : displayed.length === 0 ? (
          <div className="glass p-12 text-center flex flex-col items-center gap-4">
            <motion.div style={{ fontSize: 52 }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}>
              📭
            </motion.div>
            <p className="text-[#b8aec8] text-sm">No complaints assigned.</p>
          </div>
        ) : (
          <motion.div key={listKey} className="space-y-3"
            variants={staggerContainer} initial="hidden" animate="visible">
            {displayed.map(c => (
              <ComplaintCard
                key={c.id}
                complaint={c}
                onUpdate={handleStatusUpdate}
                onView={() => navigate(`/complaints/${c.complaint_id}`)}
              />
            ))}
          </motion.div>
        )
      )}
    </div>
  );
};

export default OfficerDashboard;

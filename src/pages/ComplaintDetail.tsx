import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import { Complaint } from "../types";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const TL_COLORS: Record<string, string> = { submitted: "#f0a070", assigned: "#a090e0", in_progress: "#6090d0", escalated: "#e08080", resolved: "#70c090" };

interface Media {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

const formatSize = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

const ComplaintDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [upd, setUpd] = useState({ status: "", priority: "", note: "" });

  // Media state
  const [media, setMedia] = useState<Media[]>([]);
  const [lightbox, setLightbox] = useState<Media | null>(null);

  useEffect(() => {
    api.get(`/complaints/${id}`)
      .then(r => {
        setComplaint(r.data);
        setMedia(r.data.media || []);
      })
      .catch((err) => {
        const status = err.response?.status;
        if (status === 404) toast.error("Complaint not found.");
        else if (status === 403) toast.error("You don't have access to this complaint.");
        else toast.error("Failed to load complaint. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const { data } = await api.patch(`/complaints/${id}`, upd);
      setComplaint(data);
      toast.success("Updated!");
      setUpd({ status: "", priority: "", note: "" });
    } catch { toast.error("Update failed"); }
    finally { setUpdating(false); }
  };

  const handleDeleteMedia = async (mediaId: number) => {
    try {
      await api.delete(`/complaints/${id}/media/${mediaId}`);
      setMedia(prev => prev.filter(m => m.id !== mediaId));
      toast.success("File removed");
    } catch { toast.error("Failed to delete file"); }
  };

  if (loading) return <div className="text-center py-20 text-[#b8aec8]">Loading...</div>;
  if (!complaint) return <div className="text-center py-20 text-[#b8aec8]">Not found</div>;

  const canUpdate = user?.role === "admin" || user?.role === "officer";
  const apiBase = (process.env.REACT_APP_API_URL || "http://localhost:8000/api").replace(/\/api$/, "");

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate(-1)} className="text-sm text-[#f0a070] hover:underline mb-5 flex items-center gap-1">
        ← Back
      </button>

      <div className="glass p-6 space-y-6 animate-slide-up">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-[#b8aec8] mb-1">{complaint.complaint_id}</p>
            <h2 className="text-xl font-extrabold text-[#f0ece8]">{complaint.title}</h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={`pill pill-${complaint.status}`}>{complaint.status.replace("_", " ")}</span>
            <span className={`pill pill-${complaint.priority}`}>{complaint.priority} priority</span>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Category", value: complaint.category?.toUpperCase() || "N/A" },
            { label: "Location", value: complaint.location || "Not specified" },
            { label: "Est. Resolution", value: `${complaint.estimated_resolution_days || "N/A"} days` },
            { label: "Submitted", value: new Date(complaint.created_at).toLocaleDateString() },
          ].map(({ label, value }) => (
            <div key={label} className="p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-[11px] text-[#b8aec8] mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-[#f0ece8]">{value}</p>
            </div>
          ))}
        </div>

        {/* Routing info */}
        {complaint.routing_metadata && (complaint.routing_metadata as any).routed && (
          <div>
            <p className="section-label mb-3">🔀 Routing Details</p>
            <div className="p-4 rounded-2xl space-y-2"
              style={{ background: "rgba(160,144,224,0.1)", border: "1px solid rgba(160,144,224,0.2)" }}>
              {(() => {
                const r = complaint.routing_metadata as any;
                const rows: [string, string][] = [
                  ["Department", r.department_name],
                  ["Office", r.office_name],
                  ["City / Zone", [r.office_city, r.office_zone].filter(Boolean).join(" · ")],
                  ["Assigned Officer", r.officer_name],
                  ["Contact", r.office_phone || r.department_email],
                  ["Distance", r.distance_km ? `${r.distance_km} km` : ""],
                  ["Method", r.routing_method],
                ];
                return rows.filter(([, v]) => v).map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-xs text-[#b8aec8]">{label}</span>
                    <span className="text-xs font-semibold text-[#f0ece8]">{value}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Escalation notice */}
        {(complaint as any).escalated_at && (
          <div className="p-3 rounded-2xl text-sm"
            style={{ background: "rgba(224,128,128,0.12)", border: "1px solid rgba(224,128,128,0.25)", color: "#e08080" }}>
            🚨 <strong>Escalated</strong> — {(complaint as any).escalation_reason}
          </div>
        )}

        {complaint.is_duplicate && (
          <div className="p-3 rounded-2xl text-sm" style={{ background: "rgba(232,128,58,0.12)", border: "1px solid rgba(232,128,58,0.25)", color: "#f0a060" }}>
            ⚠️ Similar to <strong>{complaint.duplicate_of}</strong>
          </div>
        )}

        {/* Description */}
        <div>
          <p className="section-label mb-2">Description</p>
          <div className="p-4 rounded-2xl text-sm text-[#b8aec8] leading-relaxed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {complaint.description}
          </div>
        </div>

        {/* ── Media Attachments ── */}
        {media.length > 0 && (
          <div>
            <p className="section-label mb-3">📎 Attachments ({media.length})</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {media.map((m, i) => (
                <motion.div key={m.id}
                  initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-2xl overflow-hidden relative group"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {/* Thumbnail */}
                  {m.mime_type.startsWith("image") ? (
                    <img
                      src={`${apiBase}/api/complaints/${id}/media/${m.id}/download`}
                      alt={m.file_name}
                      className="w-full h-28 object-cover cursor-pointer"
                      onClick={() => setLightbox(m)}
                    />
                  ) : (
                    <div className="w-full h-28 flex items-center justify-center text-4xl cursor-pointer"
                      style={{ background: "rgba(249,115,22,0.1)" }}
                      onClick={() => window.open(`${apiBase}/api/complaints/${id}/media/${m.id}/download`, "_blank")}>
                      📄
                    </div>
                  )}
                  {/* Info bar */}
                  <div className="p-2">
                    <p className="text-[11px] font-semibold text-[#f0ece8] truncate">{m.file_name}</p>
                    <p className="text-[10px] text-[#b8aec8]">{formatSize(m.file_size)}</p>
                  </div>
                  {/* Delete button (uploader or admin) */}
                  {(user?.role === "admin" || user?.role === "officer") && (
                    <button
                      onClick={() => handleDeleteMedia(m.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(224,80,80,0.85)", color: "#fff" }}>
                      ✕
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <p className="section-label mb-3">Status Timeline</p>
          <div className="space-y-3">
            {complaint.status_logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                  style={{ background: TL_COLORS[log.status] || "#b8aec8", boxShadow: `0 0 8px ${TL_COLORS[log.status] || "#b8aec8"}66` }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold capitalize text-[#f0ece8]">{log.status.replace("_", " ")}</span>
                    <span className="text-[11px] text-[#b8aec8]">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  {log.note && <p className="text-xs text-[#b8aec8] mt-0.5">{log.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Update form */}
        {canUpdate && (
          <div className="pt-5 border-t border-white/8">
            <p className="section-label mb-3">Update Complaint</p>
            <form onSubmit={handleUpdate} className="flex flex-wrap gap-3">
              <select className="glass-input w-auto" value={upd.status} onChange={e => setUpd({ ...upd, status: e.target.value })}>
                <option value="">Keep status</option>
                <option value="submitted">Submitted</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <select className="glass-input w-auto" value={upd.priority} onChange={e => setUpd({ ...upd, priority: e.target.value })}>
                <option value="">Keep priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <input className="glass-input flex-1 min-w-[160px]" placeholder="Add a note (optional)"
                value={upd.note} onChange={e => setUpd({ ...upd, note: e.target.value })} />
              <button type="submit" disabled={updating} className="btn-glow px-5 py-2 text-sm">
                {updating ? "..." : "Update"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}>
            <motion.img
              src={`${apiBase}/api/complaints/${id}/media/${lightbox.id}/download`}
              alt={lightbox.file_name}
              className="max-w-full max-h-[85vh] rounded-2xl object-contain"
              initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
              onClick={e => e.stopPropagation()}
            />
            <button className="absolute top-4 right-4 text-white text-2xl font-bold"
              onClick={() => setLightbox(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComplaintDetail;

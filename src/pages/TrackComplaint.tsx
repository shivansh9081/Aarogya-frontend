import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import toast from "react-hot-toast";

const STATUS_ICONS: Record<string, string> = {
  submitted: "📝", assigned: "✅", in_progress: "🔧", resolved: "✨", escalated: "⚠️",
};
const STATUS_COLORS: Record<string, string> = {
  submitted: "#f0a070", assigned: "#a090e0", in_progress: "#6090d0", resolved: "#4ade80", escalated: "#e05050",
};
// FIX: Removed unused `ease` constant (was declared but never referenced).

const TrackComplaint: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate  = useNavigate();

  const [publicData, setPublicData]   = useState<any>(null);
  const [fullData, setFullData]       = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [otpLoading, setOtpLoading]   = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [phone, setPhone]   = useState("");
  const [otp, setOtp]       = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  // FIX: Removed unused sessionToken state. The session is persisted directly
  // via sessionStorage inside loadFullDetails — the React state was never read.

  useEffect(() => {
    if (!code) return;
    api.get(`/anonymous/track/${code}`)
      .then(r => setPublicData(r.data))
      .catch(() => toast.error("Complaint not found"))
      .finally(() => setLoading(false));

    // Auto-load full details if session token cached
    const cached = sessionStorage.getItem(`anon_session_${code}`);
    if (cached) loadFullDetails(cached);
  }, [code]);

  const loadFullDetails = async (token: string) => {
    try {
      const { data } = await api.post("/anonymous/status", {
        tracking_code: code, session_token: token,
      });
      setFullData(data);
      // FIX: Persist directly to sessionStorage (removed dead setSessionToken call)
      sessionStorage.setItem(`anon_session_${code}`, token);
    } catch { /* session expired */ }
  };

  const handleSendOtp = async () => {
    if (phone.replace(/\D/g, "").length < 10) { toast.error("Enter valid phone number"); return; }
    setOtpLoading(true);
    try {
      const { data } = await api.post("/anonymous/send-otp", {
        tracking_code: code, phone_number: phone.replace(/\D/g, ""),
      });
      setOtpSent(true);
      if (data.dev_otp) setDevOtp(data.dev_otp);
      toast.success("OTP sent!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send OTP");
    } finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error("Enter 6-digit OTP"); return; }
    setVerifyLoading(true);
    try {
      const { data: vData } = await api.post("/anonymous/verify-otp", {
        tracking_code: code, phone_number: phone.replace(/\D/g, ""), otp_code: otp,
      });
      await loadFullDetails(vData.session_token);
      toast.success("Verified!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
    } finally { setVerifyLoading(false); }
  };

  if (loading) return <div className="text-center py-20 text-[#b8aec8]">Loading...</div>;
  if (!publicData) return (
    <div className="text-center py-20 space-y-4">
      <p className="text-[#b8aec8]">Complaint not found</p>
      <button onClick={() => navigate("/anonymous")} className="btn-glow px-6 py-2 text-sm">
        Submit Anonymous Complaint
      </button>
    </div>
  );

  const statusColor = STATUS_COLORS[publicData.status] || "#b8aec8";

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="orb orb-amber w-10 h-10 text-lg flex-shrink-0">🔍</div>
          <div>
            <h1 className="text-lg font-extrabold text-[#f0ece8]">Track Complaint</h1>
            <p className="font-mono text-xs text-[#b8aec8]">{code}</p>
          </div>
          <button onClick={() => navigate("/anonymous")}
            className="ml-auto text-xs px-3 py-1.5 rounded-full btn-ghost">
            + New
          </button>
        </div>

        {/* Public status card */}
        <div className="glass p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{STATUS_ICONS[publicData.status] || "📋"}</span>
            <div>
              <p className="font-black text-lg capitalize" style={{ color: statusColor }}>
                {publicData.status.replace("_", " ")}
              </p>
              <p className="text-xs text-[#b8aec8]">{publicData.days_pending} days since submission</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Category", value: publicData.category },
              { label: "Priority",  value: publicData.priority },
              { label: "Submitted", value: new Date(publicData.created_at).toLocaleDateString() },
              { label: "Status",    value: publicData.status },
            ].map(({ label, value }) => (
              <div key={label} className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[10px] text-[#b8aec8]">{label}</p>
                <p className="text-sm font-bold text-[#f0ece8] capitalize">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Full details (after OTP) */}
        <AnimatePresence>
          {fullData ? (
            <motion.div key="full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4">

              <div className="glass p-5 rounded-2xl space-y-3">
                <p className="section-label">📋 Complaint Details</p>
                <h2 className="text-base font-extrabold text-[#f0ece8]">{fullData.title}</h2>
                <p className="text-sm text-[#b8aec8] leading-relaxed">{fullData.description}</p>
                {fullData.location && (
                  <p className="text-xs text-[#b8aec8]">📍 {fullData.location}</p>
                )}
                {fullData.assigned_department && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-[#b8aec8]">Assigned to:</span>
                    <span className="text-xs font-bold text-[#a78bfa]">{fullData.assigned_department}</span>
                  </div>
                )}
              </div>

              {/* Status timeline */}
              {fullData.status_history?.length > 0 && (
                <div className="glass p-5 rounded-2xl space-y-3">
                  <p className="section-label">📅 Status Timeline</p>
                  {fullData.status_history.map((log: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                        style={{ background: STATUS_COLORS[log.new_status] || "#b8aec8" }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold capitalize text-[#f0ece8]">
                            {log.new_status?.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-[#b8aec8]">
                            {new Date(log.changed_at).toLocaleString()}
                          </span>
                        </div>
                        {log.reason && <p className="text-[11px] text-[#b8aec8] mt-0.5">{log.reason}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            /* OTP verification panel */
            <motion.div key="otp" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass p-5 rounded-2xl space-y-4">
              <p className="section-label">🔐 Verify to see full details</p>
              <p className="text-xs text-[#b8aec8]">Enter the phone number you used when submitting</p>

              {!otpSent ? (
                <div className="space-y-3">
                  <input className="glass-input w-full" type="tel" placeholder="10-digit phone number"
                    value={phone} onChange={e => setPhone(e.target.value)} />
                  <motion.button onClick={handleSendOtp} disabled={otpLoading}
                    className="w-full py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: "rgba(96,144,208,0.2)", border: "1px solid rgba(96,144,208,0.4)", color: "#6090d0" }}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    {otpLoading ? "Sending..." : "📲 Send OTP"}
                  </motion.button>
                </div>
              ) : (
                <div className="space-y-3">
                  {devOtp && (
                    <div className="p-2 rounded-xl text-center text-xs"
                      style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                      🧪 Dev OTP: <span className="font-mono font-bold text-base">{devOtp}</span>
                    </div>
                  )}
                  <input className="glass-input w-full text-center text-2xl font-mono tracking-widest"
                    placeholder="000000" maxLength={6}
                    value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                  <motion.button onClick={handleVerifyOtp} disabled={verifyLoading || otp.length !== 6}
                    className="btn-glow w-full py-2.5 text-sm font-bold"
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    {verifyLoading ? "Verifying..." : "✅ Verify OTP"}
                  </motion.button>
                  <button onClick={handleSendOtp} className="w-full text-xs text-[#b8aec8]">🔄 Resend</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
};

export default TrackComplaint;

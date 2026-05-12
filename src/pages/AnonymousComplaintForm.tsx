import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Image, FileIcon, X, PlusCircle, MapPin } from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";
import LocationPicker, { LocationData } from "../components/LocationPicker";

type Step = "form" | "confirm" | "done";

const CATEGORIES = [
  { value: "water",       icon: "💧", label: "Water Supply" },
  { value: "electricity", icon: "⚡", label: "Electricity" },
  { value: "road",        icon: "🛣️", label: "Roads" },
  { value: "sanitation",  icon: "🧹", label: "Sanitation" },
  { value: "healthcare",  icon: "🏥", label: "Healthcare" },
  { value: "others",      icon: "📝", label: "Others" },
];

const ease = [0.22, 1, 0.36, 1] as const;

const ALLOWED_TYPES = ["image/jpeg","image/png","image/gif","video/mp4","video/quicktime","application/pdf"];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB for video support

const AnonymousComplaintForm: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep]           = useState<Step>("form");
  const [loading, setLoading]     = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSent, setOtpSent]     = useState(false);

  // Form
  const [title, setTitle]         = useState("");
  const [desc, setDesc]           = useState("");
  const [category, setCategory]   = useState("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [phone, setPhone]         = useState("");

  // Media upload
  const [files, setFiles]         = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);

  // Post-submit
  const [trackingCode, setTrackingCode] = useState("");
  const [sessionToken, setSessionToken] = useState("");
  const [otp, setOtp]             = useState("");
  const [devOtp, setDevOtp]       = useState("");

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valid: File[] = [];
    for (const f of Array.from(e.target.files || [])) {
      if (f.size > MAX_SIZE) { toast.error(`${f.name} exceeds 50 MB`); continue; }
      if (!ALLOWED_TYPES.includes(f.type)) { toast.error(`${f.name}: unsupported format`); continue; }
      valid.push(f);
    }
    setFiles(p => [...p, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFiles = async (trackCode: string) => {
    if (!files.length) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      try {
        await api.post(`/anonymous/${trackCode}/upload-media`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: ev => {
            setUploadPct(Math.round(((i * 100) + ((ev.loaded / (ev.total || 1)) * 100)) / files.length));
          },
        });
      } catch { /* non-critical — complaint already saved */ }
    }
    setUploading(false); setUploadPct(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, "").length < 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/anonymous/submit", {
        title, description: desc, category,
        phone_number: phone.replace(/\D/g, ""),
        location: locationData?.display || null,
        location_area: locationData?.area || null,
        location_city: locationData?.city || null,
        location_state: locationData?.state || null,
        latitude: locationData?.latitude || null,
        longitude: locationData?.longitude || null,
      });
      setTrackingCode(data.tracking_code);
      setSessionToken(data.session_token);
      // Upload media after complaint is created
      if (files.length) await uploadFiles(data.tracking_code);
      setStep("confirm");
      toast.success("Complaint submitted!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally { setLoading(false); }
  };

  const handleSendOtp = async () => {
    setOtpLoading(true);
    try {
      const { data } = await api.post("/anonymous/send-otp", {
        tracking_code: trackingCode,
        phone_number: phone.replace(/\D/g, ""),
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
    setLoading(true);
    try {
      await api.post("/anonymous/verify-otp", {
        tracking_code: trackingCode,
        phone_number: phone.replace(/\D/g, ""),
        otp_code: otp,
      });
      setStep("done");
      toast.success("OTP verified!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid OTP");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="orb orb-amber w-12 h-12 text-xl flex-shrink-0">🔒</div>
          <div>
            <h1 className="text-xl font-extrabold text-[#f0ece8]">Anonymous Complaint</h1>
            <p className="text-xs text-[#b8aec8]">No account needed · Phone number never stored</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex gap-2">
          {(["form", "confirm", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: step === s ? "#F97316" : (["form","confirm","done"].indexOf(step) > i ? "rgba(249,115,22,0.4)" : "rgba(255,255,255,0.1)"),
                  color: "#fff",
                }}>
                {["form","confirm","done"].indexOf(step) > i ? "✓" : i + 1}
              </div>
              <span className="text-[11px] text-[#b8aec8] capitalize hidden sm:block">{s}</span>
              {i < 2 && <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ── STEP 1: Form ── */}
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease }}>
              <form onSubmit={handleSubmit} className="glass p-6 rounded-2xl space-y-5">

                {/* Title */}
                <div>
                  <p className="section-label mb-2">Title *</p>
                  <input className="glass-input w-full" placeholder="e.g. No water supply for 3 days"
                    value={title} onChange={e => setTitle(e.target.value)} required />
                </div>

                {/* Category */}
                <div>
                  <p className="section-label mb-2">Category *</p>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(c => (
                      <motion.button key={c.value} type="button"
                        onClick={() => setCategory(c.value)}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-semibold transition-colors"
                        style={{
                          background: category === c.value ? "rgba(249,115,22,0.2)" : "rgba(255,255,255,0.06)",
                          border: category === c.value ? "1px solid #F97316" : "1px solid rgba(255,255,255,0.1)",
                          color: category === c.value ? "#F97316" : "#b8aec8",
                        }}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <span className="text-lg">{c.icon}</span>
                        <span>{c.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="section-label mb-2">Description *</p>
                  <textarea className="glass-input w-full" style={{ minHeight: 100, resize: "vertical" }}
                    placeholder="Describe the issue in detail — what, where, how long?"
                    value={desc} onChange={e => setDesc(e.target.value)} required />
                </div>

                {/* ── Location with Leaflet map ── */}
                <div>
                  <p className="section-label mb-2 flex items-center gap-1.5">
                    <MapPin size={12} strokeWidth={2} /> Location (Optional)
                  </p>
                  <LocationPicker
                    value={locationData}
                    onChange={setLocationData}
                    placeholder="Search area, city, state..."
                    mapHeight={260}
                  />
                </div>

                {/* ── Photo / Video Upload ── */}
                <div>
                  <p className="section-label mb-2">📎 Photos / Videos (Optional)</p>
                  <motion.button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                    style={{
                      border: "1.5px dashed rgba(249,115,22,0.4)",
                      background: "rgba(249,115,22,0.05)",
                      color: "#F97316",
                    }}
                    whileHover={{ background: "rgba(249,115,22,0.1)", borderColor: "#F97316" }}
                    whileTap={{ scale: 0.98 }}>
                    <PlusCircle size={16} strokeWidth={2} />
                    Add Photos / Videos / Documents
                  </motion.button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.mp4,.mov,.pdf"
                    onChange={addFiles}
                    style={{ display: "none" }}
                  />
                  <p className="text-[11px] text-[#b8aec8] mt-1.5 pl-1">
                    JPG, PNG, GIF, MP4, MOV, PDF — Max 50 MB each
                  </p>

                  {/* File previews */}
                  <AnimatePresence>
                    {files.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8, marginTop: 10 }}>
                        {files.map((file, idx) => (
                          <motion.div
                            key={`${file.name}-${idx}`}
                            initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.85 }}
                            style={{
                              position: "relative", height: 80, borderRadius: 10,
                              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                              display: "flex", flexDirection: "column",
                              alignItems: "center", justifyContent: "center", overflow: "hidden",
                            }}>
                            {file.type.startsWith("image") ? (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                            ) : file.type.startsWith("video") ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 24 }}>🎥</span>
                                <span style={{ fontSize: 9, color: "#b8aec8", textAlign: "center", padding: "0 4px",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 72 }}>
                                  {file.name}
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <FileIcon size={24} color="#b8aec8" strokeWidth={1.5} />
                                <span style={{ fontSize: 9, color: "#b8aec8", textAlign: "center", padding: "0 4px",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 72 }}>
                                  {file.name}
                                </span>
                              </div>
                            )}
                            {/* Delete button */}
                            <motion.button
                              type="button"
                              onClick={() => setFiles(p => p.filter((_, i) => i !== idx))}
                              initial={{ opacity: 0 }} whileHover={{ opacity: 1 }}
                              style={{
                                position: "absolute", top: 3, right: 3,
                                width: 18, height: 18, borderRadius: "50%",
                                background: "rgba(239,68,68,0.9)", border: "none",
                                color: "#fff", cursor: "pointer",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                              <X size={10} strokeWidth={3} />
                            </motion.button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Upload progress */}
                  {uploading && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 3, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                        <motion.div
                          style={{ height: "100%", background: "#F97316", borderRadius: 99 }}
                          animate={{ width: `${uploadPct}%` }} transition={{ duration: 0.3 }} />
                      </div>
                      <p className="text-[11px] text-[#b8aec8] mt-1">Uploading… {uploadPct}%</p>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <p className="section-label mb-1">Phone Number *</p>
                  <p className="text-[10px] text-[#b8aec8] mb-2">
                    🔒 Hashed with SHA-256 immediately — never stored as plain text. Used only for OTP.
                  </p>
                  <input className="glass-input w-full" type="tel" placeholder="10-digit mobile number"
                    value={phone} onChange={e => setPhone(e.target.value)} required />
                </div>

                <div className="p-3 rounded-xl text-xs text-[#b8aec8]"
                  style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)" }}>
                  🛡️ Your identity is fully protected. No name, no account, no personal data stored.
                </div>

                <motion.button type="submit" disabled={loading || !category}
                  className="btn-glow w-full py-3 text-sm font-bold"
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  {loading ? "Submitting..." : "🔒 Submit Anonymously →"}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── STEP 2: Confirm + OTP ── */}
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease }}
              className="glass p-6 rounded-2xl space-y-5">

              <div className="text-center">
                <div className="text-4xl mb-2">✅</div>
                <h2 className="text-lg font-extrabold text-[#f0ece8]">Complaint Submitted!</h2>
                <p className="text-xs text-[#b8aec8] mt-1">Save your tracking code</p>
              </div>

              {/* Tracking code */}
              <div className="p-4 rounded-2xl text-center"
                style={{ background: "rgba(249,115,22,0.12)", border: "2px solid rgba(249,115,22,0.4)" }}>
                <p className="text-[11px] text-[#b8aec8] mb-1">Your Tracking Code</p>
                <p className="text-2xl font-black font-mono text-[#F97316]">{trackingCode}</p>
                <motion.button
                  onClick={() => { navigator.clipboard.writeText(trackingCode); toast.success("Copied!"); }}
                  className="mt-2 text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ background: "rgba(249,115,22,0.2)", color: "#F97316" }}
                  whileTap={{ scale: 0.95 }}>
                  📋 Copy Code
                </motion.button>
              </div>

              {/* OTP section */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-[#f0ece8]">Verify your phone to check status later</p>

                {!otpSent ? (
                  <motion.button onClick={handleSendOtp} disabled={otpLoading}
                    className="w-full py-3 rounded-xl text-sm font-bold"
                    style={{ background: "rgba(96,144,208,0.2)", border: "1px solid rgba(96,144,208,0.4)", color: "#6090d0" }}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                    {otpLoading ? "Sending..." : "📲 Send OTP"}
                  </motion.button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    {devOtp && (
                      <div className="p-2 rounded-xl text-center text-xs"
                        style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}>
                        🧪 Dev mode OTP: <span className="font-mono font-bold text-base">{devOtp}</span>
                      </div>
                    )}
                    <input className="glass-input w-full text-center text-2xl font-mono tracking-widest"
                      placeholder="000000" maxLength={6}
                      value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} />
                    <motion.button onClick={handleVerifyOtp} disabled={loading || otp.length !== 6}
                      className="btn-glow w-full py-3 text-sm font-bold"
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                      {loading ? "Verifying..." : "✅ Verify OTP"}
                    </motion.button>
                    <button onClick={handleSendOtp} className="w-full text-xs text-[#b8aec8] hover:text-[#f0ece8]">
                      🔄 Resend OTP
                    </button>
                  </motion.div>
                )}
              </div>

              <button onClick={() => navigate(`/track/${trackingCode}`)}
                className="w-full text-xs text-[#b8aec8] hover:text-[#f0ece8] py-2">
                Skip for now → Track complaint publicly
              </button>
            </motion.div>
          )}

          {/* ── STEP 3: Done ── */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease }}
              className="glass p-8 rounded-2xl text-center space-y-5">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-extrabold text-[#f0ece8]">You're all set!</h2>
              <p className="text-sm text-[#b8aec8]">Your complaint is registered and your phone is verified.</p>
              <div className="p-3 rounded-xl font-mono text-[#F97316] font-bold text-lg"
                style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)" }}>
                {trackingCode}
              </div>
              <div className="flex gap-3">
                <motion.button onClick={() => navigate(`/track/${trackingCode}`)}
                  className="btn-glow flex-1 py-3 text-sm font-bold"
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  🔍 Track Complaint
                </motion.button>
                <motion.button onClick={() => navigate("/")}
                  className="btn-ghost flex-1 py-3 text-sm font-semibold"
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  Home
                </motion.button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default AnonymousComplaintForm;

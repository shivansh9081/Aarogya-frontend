import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, AlignLeft, MapPin, Paperclip, Bot, Send,
  CheckCircle2, TriangleAlert, Image, FileIcon,
  X, Loader2, Info, Map, PlusCircle,
} from "lucide-react";
import api from "../services/api";
import toast from "react-hot-toast";
import LocationPicker, { LocationData } from "../components/LocationPicker";

/* ─── Design tokens (spec §3.4) ─── */
const T = {
  bgPrimary:   "#0f172a",
  bgSecondary: "#1a2332",
  text:        "#ffffff",
  textSub:     "#a0afc0",
  textMuted:   "#7a8a98",
  border:      "#2a3f5f",
  accent:      "#10b981",
  accentHover: "#059669",
  accentDim:   "rgba(16,185,129,0.08)",
  accentBorder:"rgba(16,185,129,0.35)",
  error:       "#ef4444",
  errorDim:    "rgba(239,68,68,0.05)",
  disabled:    "#4a5f7f",
} as const;

const ALLOWED_TYPES = ["image/jpeg","image/png","image/gif","application/pdf"];
const MAX_SIZE      = 10 * 1024 * 1024;
const MAX_DESC      = 500;
const MIN_DESC      = 10;
const MIN_TITLE     = 5;

const PRIORITY_COLORS: Record<string,string> = {
  high:"#ef4444", medium:"#f97316", low:"#22c55e",
};

/* ─── Helpers ─── */
function fieldStyle(focused: boolean, error: boolean, filled: boolean): React.CSSProperties {
  return {
    width: "100%", boxSizing: "border-box",
    background: T.bgSecondary,
    border: `${focused || error ? 2 : 1}px solid ${error ? T.error : focused ? T.accent : filled ? T.accent : T.border}`,
    borderRadius: 6,
    color: T.text,
    fontSize: 14,
    fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
    outline: "none",
    transition: "border-color 0.15s,box-shadow 0.15s",
    boxShadow: focused
      ? error ? "0 0 0 3px rgba(239,68,68,0.12)" : "0 0 0 3px rgba(16,185,129,0.1)"
      : "none",
    lineHeight: 1.5,
  };
}

const Label: React.FC<{ children: React.ReactNode; required?: boolean; suffix?: string }> = ({ children, required, suffix }) => (
  <label style={{ display:"flex", alignItems:"center", gap:4, marginBottom:8, fontSize:14, fontWeight:600, color:T.text }}>
    {children}
    {required && <span style={{ color:T.error, fontWeight:700 }}>*</span>}
    {suffix && <span style={{ fontSize:12, color:T.textMuted, fontWeight:400, marginLeft:2 }}>{suffix}</span>}
  </label>
);

const FieldError: React.FC<{ msg: string }> = ({ msg }) => (
  <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
    style={{ fontSize:12, color:T.error, marginTop:4, marginLeft:4, display:"flex", alignItems:"center", gap:4 }}>
    <TriangleAlert size={12} strokeWidth={2} />{msg}
  </motion.p>
);

const Divider = () => <div style={{ height:1, background:T.border, margin:"4px 0" }} />;

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
const ComplaintForm: React.FC = () => {
  const navigate     = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle]         = useState("");
  const [desc,  setDesc]          = useState("");
  const [location, setLocation]   = useState<LocationData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [result,  setResult]      = useState<any>(null);
  const [files,   setFiles]       = useState<File[]>([]);
  const [uploadPct, setUploadPct] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [titleFocus, setTitleFocus] = useState(false);
  const [descFocus,  setDescFocus]  = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  /* validation */
  const validate = useCallback(() => {
    const e: Record<string,string> = {};
    if (!title.trim())                       e.title = "Title is required";
    else if (title.trim().length < MIN_TITLE) e.title = `Title must be at least ${MIN_TITLE} characters`;
    if (!desc.trim())                        e.desc  = "Description is required";
    else if (desc.trim().length < MIN_DESC)  e.desc  = `Please provide at least ${MIN_DESC} characters`;
    if (!location)                           e.loc   = "Please select a location on the map";
    return e;
  }, [title, desc, location]);

  const errs = submitted ? validate() : {};

  /* file handling */
  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valid: File[] = [];
    for (const f of Array.from(e.target.files || [])) {
      if (f.size > MAX_SIZE)               { toast.error(`${f.name} exceeds 10 MB`); continue; }
      if (!ALLOWED_TYPES.includes(f.type)) { toast.error(`${f.name}: unsupported format`); continue; }
      valid.push(f);
    }
    setFiles(p => [...p, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFiles = async (id: string) => {
    if (!files.length) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const fd = new FormData();
      fd.append("file", files[i]);
      await api.post(`/complaints/${id}/upload-media`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: ev => {
          setUploadPct(Math.round(((i * 100) + ((ev.loaded / (ev.total || 1)) * 100)) / files.length));
        },
      });
    }
    setUploading(false); setUploadPct(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate()).length) return;
    setLoading(true);
    try {
      const { data } = await api.post("/complaints/", {
        title: title.trim(), description: desc.trim(),
        location: location?.display || "",
        location_area: location?.area || null, location_city: location?.city || null,
        location_state: location?.state || null, location_country: location?.country || "India",
        latitude: location?.latitude || null, longitude: location?.longitude || null,
      });
      if (files.length) await uploadFiles(data.complaint_id);
      setResult(data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Submission failed");
    } finally { setLoading(false); }
  };

  const reset = () => {
    setResult(null); setTitle(""); setDesc(""); setLocation(null);
    setFiles([]); setSubmitted(false);
  };

  /* ══ SUCCESS ══ */
  if (result) return (
    <div style={{ minHeight:"calc(100vh - 64px)", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:T.bgPrimary }}>
      <motion.div initial={{ opacity:0, scale:0.94, y:16 }} animate={{ opacity:1, scale:1, y:0 }}
        transition={{ type:"spring", stiffness:280, damping:24 }}
        style={{ background:T.bgSecondary, border:`1px solid ${T.border}`, borderRadius:16,
          padding:"40px 32px", width:"100%", maxWidth:440, textAlign:"center",
          boxShadow:"0 24px 64px rgba(0,0,0,0.5)" }}>
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }}
          transition={{ type:"spring", stiffness:300, damping:20, delay:0.1 }}
          style={{ width:72, height:72, borderRadius:"50%", background:"rgba(16,185,129,0.15)",
            border:"2px solid rgba(16,185,129,0.4)", display:"flex", alignItems:"center",
            justifyContent:"center", margin:"0 auto 20px" }}>
          <CheckCircle2 size={36} color="#10b981" strokeWidth={1.8} />
        </motion.div>
        <h2 style={{ fontSize:22, fontWeight:700, color:T.text, marginBottom:6 }}>Complaint Submitted!</h2>
        <p style={{ fontSize:13, color:T.textSub, marginBottom:28 }}>AI has classified and routed your complaint</p>
        <div style={{ textAlign:"left", marginBottom:28 }}>
          {[
            { label:"Complaint ID", value:result.complaint_id, mono:true, accent:true },
            { label:"Category",     value:result.category?.toUpperCase() },
            { label:"Priority",     value:`${result.priority?.toUpperCase()} · ${result.estimated_resolution_days}d`, color:PRIORITY_COLORS[result.priority] },
            result.location_city && { label:"Location", value:[result.location_area,result.location_city,result.location_state].filter(Boolean).join(", ") },
            result.latitude && { label:"Coordinates", value:`${result.latitude?.toFixed(4)}, ${result.longitude?.toFixed(4)}`, mono:true },
            result.is_duplicate && { label:"Note", value:`Similar to ${result.duplicate_of}`, color:"#f97316" },
          ].filter(Boolean).map((row:any, i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"10px 0", borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:12, color:T.textSub }}>{row.label}</span>
              <span style={{ fontSize:13, fontWeight:600, color:row.accent ? T.accent : row.color || T.text,
                fontFamily:row.mono ? "monospace" : "inherit" }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <motion.button onClick={() => navigate("/dashboard")}
            style={{ flex:1, padding:"12px 0", borderRadius:8, border:"none", background:T.accent,
              color:"#000", fontSize:14, fontWeight:600, cursor:"pointer",
              boxShadow:"0 4px 16px rgba(16,185,129,0.35)" }}
            whileHover={{ y:-1, boxShadow:"0 6px 20px rgba(16,185,129,0.5)" }} whileTap={{ scale:0.97 }}>
            View Dashboard
          </motion.button>
          <motion.button onClick={reset}
            style={{ flex:1, padding:"12px 0", borderRadius:8, border:`1px solid ${T.border}`,
              background:"transparent", color:T.textSub, fontSize:14, fontWeight:600, cursor:"pointer" }}
            whileHover={{ borderColor:T.accent, color:T.text }} whileTap={{ scale:0.97 }}>
            Report Another
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  /* ══ MAIN LAYOUT ══ */
  return (
    <>
      {/* Responsive CSS injected once */}
      <style>{`
        .cf-grid {
          display: flex;
          height: calc(100vh - 64px);
          background: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
        }
        .cf-form-panel {
          width: 40%;
          min-width: 320px;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          background: #0f172a;
          border-right: 1px solid #2a3f5f;
          display: flex;
          flex-direction: column;
          scrollbar-width: thin;
          scrollbar-color: #4a5f7f #0f172a;
        }
        .cf-form-panel::-webkit-scrollbar { width: 6px; }
        .cf-form-panel::-webkit-scrollbar-track { background: #0f172a; }
        .cf-form-panel::-webkit-scrollbar-thumb { background: #4a5f7f; border-radius: 99px; }
        .cf-form-panel::-webkit-scrollbar-thumb:hover { background: #7a8a98; }
        .cf-map-panel {
          flex: 1;
          height: 100%;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.2);
        }
        .cf-input::placeholder { color: #7a8a98; opacity: 0.8; font-style: normal; }
        .cf-upload-btn:hover {
          border-color: #10b981 !important;
          background: rgba(16,185,129,0.05) !important;
        }
        .cf-submit-btn:hover:not(:disabled) {
          background: #059669 !important;
          box-shadow: 0 4px 12px rgba(16,185,129,0.3) !important;
          transform: translateY(-1px);
        }
        .cf-submit-btn:active:not(:disabled) {
          transform: translateY(0) !important;
          box-shadow: 0 2px 6px rgba(16,185,129,0.2) !important;
          opacity: 0.95;
        }
        @media (min-width: 768px) and (max-width: 1399px) {
          .cf-form-panel { width: 45%; }
        }
        @media (max-width: 767px) {
          .cf-grid { flex-direction: column; height: auto; overflow: visible; }
          .cf-form-panel { width: 100%; height: auto; max-height: 50vh; border-right: none; border-bottom: 1px solid #2a3f5f; }
          .cf-map-panel { width: 100%; height: 50vh; flex: none; }
        }
      `}</style>

      <div className="cf-grid">

        {/* ════════════════════════════════════
            LEFT — Form panel (40%)
        ════════════════════════════════════ */}
        <div className="cf-form-panel">
          <div style={{ padding:"24px 28px 0" }}>
            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:44, height:44, borderRadius:10, flexShrink:0,
                background:"linear-gradient(135deg,#f59e0b,#d97706)",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"0 4px 14px rgba(245,158,11,0.3)" }}>
                <FileText size={22} color="#fff" strokeWidth={2} />
              </div>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700, color:T.text, lineHeight:1.3, margin:0 }}>
                  Report an Issue
                </h2>
                <p style={{ fontSize:12, color:T.textSub, margin:"2px 0 0" }}>
                  AI classifies and routes automatically
                </p>
              </div>
            </div>
            <Divider />
          </div>

          <form onSubmit={handleSubmit} noValidate
            style={{ padding:"20px 28px 32px", display:"flex", flexDirection:"column", gap:24, flex:1 }}>

            {/* ── Title ── */}
            <div>
              <Label required>Title</Label>              <input
                className="cf-input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onFocus={() => setTitleFocus(true)}
                onBlur={() => setTitleFocus(false)}
                placeholder="Brief description of the issue"
                aria-required="true"
                aria-invalid={!!errs.title}
                style={{ ...fieldStyle(titleFocus, !!errs.title, title.length > 0), padding:"12px 16px", fontSize:16, height:48 }}
              />
              <AnimatePresence>{errs.title && <FieldError msg={errs.title} />}</AnimatePresence>
            </div>

            <Divider />

            {/* ── Description ── */}
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <Label required>Description</Label>
                <span style={{ fontSize:12, color: desc.length >= MAX_DESC ? T.error : desc.length >= MIN_DESC ? T.accent : T.textMuted,
                  fontVariantNumeric:"tabular-nums" }}>
                  {desc.length}/{MAX_DESC}
                </span>
              </div>
              <textarea
                className="cf-input"
                value={desc}
                onChange={e => { if (e.target.value.length <= MAX_DESC) setDesc(e.target.value); }}
                onFocus={() => setDescFocus(true)}
                onBlur={() => setDescFocus(false)}
                placeholder="Provide detailed information (min 10 characters)"
                aria-required="true"
                aria-invalid={!!errs.desc}
                style={{ ...fieldStyle(descFocus, !!errs.desc, desc.length > 0),
                  padding:"12px 16px", minHeight:140, maxHeight:180, resize:"none", lineHeight:1.5 }}
              />
              {desc.length > 0 && desc.length < MIN_DESC && (
                <div style={{ marginTop:6 }}>
                  <div style={{ height:3, borderRadius:99, background:T.border, overflow:"hidden" }}>
                    <motion.div style={{ height:"100%", background:T.error, borderRadius:99 }}
                      animate={{ width:`${(desc.length / MIN_DESC) * 100}%` }} transition={{ duration:0.2 }} />
                  </div>
                  <p style={{ fontSize:11, color:T.textMuted, marginTop:3 }}>
                    {MIN_DESC - desc.length} more characters needed
                  </p>
                </div>
              )}
              <AnimatePresence>{errs.desc && <FieldError msg={errs.desc} />}</AnimatePresence>
            </div>

            <Divider />

            {/* ── Location ── */}
            <div>
              <Label required>Location</Label>
              <LocationPicker
                value={location}
                onChange={loc => { setLocation(loc); }}
                placeholder="Search area, city, state..."
                mapHeight={0}
              />
              {/* Selected chips */}
              <AnimatePresence>
                {location && (
                  <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                    style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:8 }}>
                    {[
                      location.area  && { label:location.area,  color:"#a78bfa" },
                      location.city  && { label:location.city,  color:T.accent },
                      location.state && { label:location.state, color:"#6ee7b7" },
                    ].filter(Boolean).map((chip:any, i) => (
                      <span key={i} style={{ fontSize:11, padding:"3px 10px", borderRadius:999, fontWeight:500,
                        background:`${chip.color}18`, border:`1px solid ${chip.color}40`, color:chip.color }}>
                        {chip.label}
                      </span>
                    ))}
                    {location.latitude && (
                      <span style={{ fontSize:10, padding:"3px 8px", borderRadius:999,
                        background:T.bgSecondary, color:T.textMuted, fontFamily:"monospace" }}>
                        {location.latitude.toFixed(4)}, {location.longitude?.toFixed(4)}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>{errs.loc && <FieldError msg={errs.loc} />}</AnimatePresence>
            </div>

            <Divider />

            {/* ── Attachments ── */}
            <div>
              <Label suffix="(Optional)">
                <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <Paperclip size={14} strokeWidth={2} color={T.accent} /> Attachments
                </span>
              </Label>
              <button
                type="button"
                className="cf-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                style={{ width:"100%", height:44, borderRadius:6,
                  border:`1px dashed ${T.border}`, background:"transparent",
                  color:T.accent, fontSize:14, fontWeight:500, cursor:"pointer",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  transition:"border-color 0.15s, background 0.15s" }}>
                <PlusCircle size={18} strokeWidth={2} />
                Add Photos / Documents
              </button>
              <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.pdf"
                onChange={addFiles} style={{ display:"none" }} aria-label="Add file attachments" />
              <p style={{ fontSize:12, color:T.textMuted, marginTop:8, paddingLeft:4 }}>
                JPG, PNG, GIF, PDF — Max 10 MB each
              </p>

              {/* File grid */}
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                    style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12,
                      maxHeight: files.length > 4 ? 224 : "none", overflowY: files.length > 4 ? "auto" : "visible" }}>
                    {files.map((file, idx) => (
                      <motion.div key={`${file.name}-${idx}`}
                        initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }}
                        exit={{ opacity:0, scale:0.88 }}
                        style={{ position:"relative", height:100, borderRadius:6,
                          background:T.bgSecondary, border:`1px solid ${T.border}`,
                          display:"flex", flexDirection:"column", alignItems:"center",
                          justifyContent:"center", overflow:"hidden" }}
                        className="group">
                        <span style={{ fontSize:28 }}>
                          {file.type.startsWith("image") ? <Image size={28} color={T.accent} strokeWidth={1.5} /> : <FileIcon size={28} color={T.textSub} strokeWidth={1.5} />}
                        </span>
                        <p style={{ fontSize:11, color:T.textMuted, marginTop:6, maxWidth:"88%",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"center" }}>
                          {file.name}
                        </p>
                        <motion.button type="button" onClick={() => setFiles(p => p.filter((_,i) => i !== idx))}
                          initial={{ opacity:0 }} whileHover={{ opacity:1 }}
                          style={{ position:"absolute", top:5, right:5, width:20, height:20,
                            borderRadius:"50%", background:T.error, border:"none",
                            color:"#fff", fontSize:10, fontWeight:700, cursor:"pointer",
                            display:"flex", alignItems:"center", justifyContent:"center" }}><X size={10} strokeWidth={3} /></motion.button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {uploading && (
                <div style={{ marginTop:10 }}>
                  <div style={{ height:4, borderRadius:99, background:T.border, overflow:"hidden" }}>
                    <motion.div style={{ height:"100%", background:T.accent, borderRadius:99 }}
                      animate={{ width:`${uploadPct}%` }} transition={{ duration:0.3 }} />
                  </div>
                  <p style={{ fontSize:11, color:T.textSub, marginTop:4 }}>Uploading… {uploadPct}%</p>
                </div>
              )}
            </div>

            <Divider />

            {/* ── AI banner ── */}
            <div style={{ padding:"12px 16px", background:T.accentDim,
              borderLeft:`3px solid ${T.accent}`, borderRadius:"0 4px 4px 0",
              display:"flex", alignItems:"flex-start", gap:8 }}>
              <Info size={16} color={T.accent} strokeWidth={2} style={{ flexShrink:0, marginTop:1 }} />
              <p style={{ fontSize:12, color:"#e0e0e0", lineHeight:1.4, margin:0 }}>
                AI will auto-detect category, priority and route to the right department
              </p>
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || uploading}
              className="cf-submit-btn"
              style={{ width:"100%", height:48, borderRadius:8, border:"none",
                background: loading || uploading ? T.disabled : T.accent,
                color: loading || uploading ? "#fff" : "#000",
                fontSize:15, fontWeight:600,
                cursor: loading || uploading ? "not-allowed" : "pointer",
                opacity: loading || uploading ? 0.6 : 1,
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                boxShadow: loading || uploading ? "none" : "0 4px 16px rgba(16,185,129,0.3)",
                transition:"background 0.15s, opacity 0.15s, box-shadow 0.15s, transform 0.15s" }}>
              {loading ? (
                <>
                  <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                  Submitting...
                </>
              ) : uploading ? `Uploading… ${uploadPct}%` : (
                <>
                  <Send size={15} strokeWidth={2} />
                  Submit Complaint
                </>
              )}
            </button>
          </form>
        </div>

        {/* ════════════════════════════════════
            RIGHT — Map panel (60%)
        ════════════════════════════════════ */}
        <div className="cf-map-panel">
          <div style={{ position:"absolute", top:12, left:"50%", transform:"translateX(-50%)",
            zIndex:600, pointerEvents:"none" }}>
            <div style={{ background:"rgba(0,0,0,0.6)", padding:"8px 16px", borderRadius:4,
              display:"flex", alignItems:"center", gap:6 }}>
              <Map size={13} color="#10b981" strokeWidth={2} />
              <span style={{ fontSize:12, fontWeight:500, color:"#10b981", letterSpacing:"0.04em" }}>
                PICK LOCATION ON MAP
              </span>
            </div>
            <p style={{ fontSize:11, color:"#7a8a98", textAlign:"center", marginTop:4 }}>
              Click anywhere · drag the pin · or use GPS
            </p>
          </div>

          {/* Full-height map */}
          <LocationPicker
            value={location}
            onChange={setLocation}
            placeholder=""
            mapHeight={-1}
            className="h-full"
          />
        </div>
      </div>
    </>
  );
};

export default ComplaintForm;

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import api from "../services/api";
import toast from "react-hot-toast";
import { staggerContainer, fadeUp } from "../utils/animations";
import LocationPicker, { LocationData } from "../components/LocationPicker";

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */
interface HealthResult {
  report_id?: string;
  is_health_related: boolean;
  diseases: string[];
  symptoms: string[];
  conditions: string[];
  risk_level: string;
  severity_score: number;
  urgency: string;
  guidance: string;
  entities: { text: string; type: string; weight: number }[];
  fhir_resource?: any;
  ml_prediction: string;
  ml_confidence: number;
  risk_source: string;
  nearby_facilities: Facility[];
}
interface Facility {
  name: string; address?: string; distance_km: number;
  phone?: string; department?: string; lat?: number; lon?: number; is_open: boolean;
}
type Phase = "input" | "loading" | "result";

/* ─────────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as const;

const RISK_CONFIG: Record<string, { bg: string; border: string; text: string; label: string; icon: string }> = {
  critical: { bg: "rgba(224,80,80,0.18)", border: "#e05050", text: "#ff8080", label: "CRITICAL — Call 108 immediately", icon: "🚨" },
  high:     { bg: "rgba(249,115,22,0.18)", border: "#F97316", text: "#fb923c", label: "HIGH RISK — Go to ER now", icon: "🔴" },
  medium:   { bg: "rgba(234,179,8,0.15)",  border: "#ca8a04", text: "#fbbf24", label: "MODERATE — See a doctor today", icon: "🟡" },
  low:      { bg: "rgba(34,197,94,0.15)",  border: "#16a34a", text: "#4ade80", label: "LOW RISK — Rest and monitor", icon: "🟢" },
};
const ENTITY_COLORS: Record<string, string> = {
  DISEASE: "#f87171", SYMPTOM: "#fb923c", CONDITION: "#a78bfa",
};
const URGENCY_ICONS: Record<string, string> = {
  critical: "📞", high: "🏥", medium: "🩺", low: "💊",
};
const CHIPS = ["Fever","Chest Pain","Headache","Difficulty Breathing","Nausea","Fatigue","Rash","Abdominal Pain","Dizziness","Cough"];
const CONDITION_CHIPS = ["Pregnant","Elderly","Diabetic","Infant","Immunocompromised","Asthmatic","On Blood Thinners","Cancer Patient","Bedridden"];
const PLACEHOLDERS = [
  "I have high fever and chest pain since morning...",
  "My child has been vomiting since last night...",
  "I feel dizzy and have blurred vision...",
  "Severe headache and stiff neck for 2 days...",
  "Difficulty breathing and rapid heartbeat...",
];
const LOADING_STEPS = ["Reading symptoms...", "Running NER...", "Scoring severity...", "Generating guidance..."];

/* ─────────────────────────────────────────────────────────────────────────────
   Hooks
───────────────────────────────────────────────────────────────────────────── */
function useAnimatedScore(target: number, active: boolean) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!active) return;
    mv.set(target);
    const unsub = spring.on("change", v => setDisplay(Math.round(v)));
    return unsub;
  }, [target, active]);
  return display;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SVG Arc Gauge
───────────────────────────────────────────────────────────────────────────── */
const ArcGauge: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const R = 52, C = 2 * Math.PI * R;
  const pct = score / 100;
  const [dash, setDash] = useState(C);
  useEffect(() => {
    const t = setTimeout(() => setDash(C - pct * C), 80);
    return () => clearTimeout(t);
  }, [score]);
  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dash}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color }}>{score}</span>
        <span className="text-[10px] text-[#b8aec8] tracking-widest uppercase">severity</span>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Quick Action Cards (shown on input phase sidebar)
───────────────────────────────────────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { icon: "🚨", label: "Emergency",      sub: "Call 108 now",          color: "#e05050", action: () => window.open("tel:108") },
  { icon: "🩺", label: "My Profile",     sub: "Update health info",    color: "#a78bfa", link: "/health-profile" },
  { icon: "📋", label: "My Reports",     sub: "View past analyses",    color: "#F97316", link: "/healthcare/reports" },
  { icon: "🏥", label: "Find Hospitals", sub: "Near me on Google Maps", color: "#4ade80", action: () => window.open("https://www.google.com/maps/search/hospitals+near+me") },
  { icon: "💊", label: "Drug Check",     sub: "Check interactions",    color: "#6090d0", link: "/health-profile" },
];

const HOW_IT_WORKS = [
  { step: "1", text: "Describe symptoms in your own words" },
  { step: "2", text: "AI runs NER + ML risk classification" },
  { step: "3", text: "Get risk level, guidance & nearby facilities" },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Phase 1 — Input  (two-panel layout)
───────────────────────────────────────────────────────────────────────────── */
const InputPhase: React.FC<{
  onSubmit: (text: string, location: string, locData?: LocationData | null) => void;
}> = ({ onSubmit }) => {
  const [text, setText]           = useState("");
  const [locData, setLocData]     = useState<LocationData | null>(null);
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [phIdx, setPhIdx]         = useState(0);
  const [focused, setFocused]     = useState(false);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const id = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 3000);
    return () => clearInterval(id);
  }, []);

  const toggleChip = (chip: string) => {
    const lower = chip.toLowerCase();
    setSelected(s => {
      const n = new Set(s);
      if (n.has(chip)) {
        n.delete(chip);
        setText(t => t.replace(new RegExp(",?\\s*" + chip, "gi"), "").trim());
      } else {
        n.add(chip);
        setText(t => t ? `${t}, ${lower}` : lower);
      }
      return n;
    });
  };

  const canSubmit = text.trim().length >= 10;

  return (
    <motion.div className="w-full max-w-[1100px] mx-auto"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16, scale: 0.97 }}
      transition={{ duration: 0.45, ease }}>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* ── LEFT: Main input panel ── */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <h1 className="text-3xl font-black text-[#f0ece8] leading-tight">
              Describe your symptoms
            </h1>
            <p className="text-[#b8aec8] text-sm mt-1">
              Type freely — AI will detect diseases, symptoms and assess your risk
            </p>
          </div>

          {/* Textarea */}
          <motion.div className="glass rounded-2xl overflow-hidden"
            animate={{ boxShadow: focused ? "0 0 0 2px #F97316" : "0 0 0 1px rgba(255,255,255,0.1)" }}
            transition={{ duration: 0.2 }}>
            <div className="relative">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent text-[#f0ece8] text-base leading-relaxed resize-none outline-none p-5"
                style={{ minHeight: 140, fontFamily: "inherit" }}
                value={text}
                onChange={e => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              {!text && (
                <div className="absolute top-5 left-5 pointer-events-none select-none">
                  <AnimatePresence mode="wait">
                    <motion.span key={phIdx} className="text-[#b8aec8] text-base"
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.3, ease }}>
                      {PLACEHOLDERS[phIdx]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
              {/* Char count */}
              <div className="absolute bottom-3 right-4 text-[10px] text-[#b8aec8] opacity-60">
                {text.length} chars
              </div>
            </div>

            {/* Quick symptom chips */}
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              <p className="text-[10px] text-[#b8aec8] mb-2 uppercase tracking-wider">Quick add</p>
              <div className="flex flex-wrap gap-1.5">
                {CHIPS.map(chip => {
                  const on = selected.has(chip);
                  return (
                    <motion.button key={chip} onClick={() => toggleChip(chip)}
                      className="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
                      style={{
                        background: on ? "#F97316" : "rgba(255,255,255,0.07)",
                        color: on ? "#fff" : "#b8aec8",
                        border: on ? "1px solid #F97316" : "1px solid rgba(255,255,255,0.1)",
                      }}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      {on ? "✓ " : ""}{chip}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Location — Leaflet map picker */}
          <LocationPicker
            value={locData}
            onChange={setLocData}
            placeholder="📍 Location (optional — for nearby facilities)"
            mapHeight={240}
          />

          {/* Analyze button */}
          <motion.button
            onClick={() => canSubmit && onSubmit(text, locData?.display || "", locData)}
            disabled={!canSubmit}
            className="w-full py-4 rounded-2xl text-base font-bold relative overflow-hidden"
            style={{
              background: canSubmit ? "linear-gradient(135deg,#F97316,#ea580c)" : "rgba(255,255,255,0.06)",
              color: canSubmit ? "#fff" : "#b8aec8",
            }}
            animate={canSubmit ? { boxShadow: ["0 0 0 0 rgba(249,115,22,0)", "0 0 0 10px rgba(249,115,22,0.18)", "0 0 0 0 rgba(249,115,22,0)"] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            whileHover={canSubmit ? { scale: 1.01 } : {}}
            whileTap={canSubmit ? { scale: 0.98 } : {}}>
            {canSubmit ? "🧠 Analyze Symptoms" : "Type at least 10 characters to analyze"}
          </motion.button>

          {/* How it works */}
          <div className="glass-sm p-4 rounded-2xl">
            <p className="text-[11px] text-[#b8aec8] uppercase tracking-wider mb-3">How it works</p>
            <div className="space-y-2">
              {HOW_IT_WORKS.map(({ step, text: t }) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(249,115,22,0.2)", color: "#F97316" }}>{step}</span>
                  <span className="text-xs text-[#b8aec8]">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="glass-sm p-4 rounded-2xl space-y-3">
            <p className="text-[11px] text-[#b8aec8] uppercase tracking-wider">Quick Actions</p>
            {QUICK_ACTIONS.map(({ icon, label, sub, color, action, link }) => (
              link ? (
                <Link key={label} to={link}>
                  <motion.div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                    whileHover={{ background: "rgba(255,255,255,0.09)", x: 2 }}>
                    <span className="text-xl w-8 text-center">{icon}</span>
                    <div>
                      <p className="text-xs font-bold text-[#f0ece8]">{label}</p>
                      <p className="text-[10px]" style={{ color }}>{sub}</p>
                    </div>
                  </motion.div>
                </Link>
              ) : (
                <motion.div key={label} onClick={action}
                  className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                  style={{ background: `${color}18`, border: `1px solid ${color}44` }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <span className="text-xl w-8 text-center">{icon}</span>
                  <div>
                    <p className="text-xs font-bold" style={{ color }}>{label}</p>
                    <p className="text-[10px] text-[#b8aec8]">{sub}</p>
                  </div>
                </motion.div>
              )
            ))}
          </div>

          {/* Risk level guide */}
          <div className="glass-sm p-4 rounded-2xl space-y-2">
            <p className="text-[11px] text-[#b8aec8] uppercase tracking-wider mb-3">Risk Levels</p>
            {Object.entries(RISK_CONFIG).map(([level, cfg]) => (
              <div key={level} className="flex items-center gap-2.5 p-2 rounded-xl"
                style={{ background: cfg.bg }}>
                <span className="text-base">{cfg.icon}</span>
                <div>
                  <p className="text-[11px] font-bold capitalize" style={{ color: cfg.text }}>{level}</p>
                  <p className="text-[10px] text-[#b8aec8]">{cfg.label.split("—")[1]?.trim()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="p-3 rounded-xl text-[10px] text-[#b8aec8] leading-relaxed"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            ⚠️ This AI provides guidance only. Always consult a qualified doctor for medical decisions.
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Phase 2 — Loading
───────────────────────────────────────────────────────────────────────────── */
const LoadingPhase: React.FC = () => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const ids = LOADING_STEPS.map((_, i) =>
      setTimeout(() => setStep(i + 1), i * 500 + 300)
    );
    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="w-full max-w-[480px] mx-auto"
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.4, ease }}>
      <div className="glass p-10 flex flex-col items-center gap-8">
        {/* Pulsing cross */}
        <motion.div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
          style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)" }}
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}>
          ✚
        </motion.div>

        {/* Step indicators */}
        <div className="w-full space-y-3">
          {LOADING_STEPS.map((s, i) => (
            <motion.div key={s} className="flex items-center gap-3"
              initial={{ opacity: 0.3 }} animate={{ opacity: step > i ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}>
              <motion.div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                style={{ background: step > i ? "#F97316" : "rgba(255,255,255,0.1)" }}
                animate={step > i ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}>
                {step > i ? "✓" : ""}
              </motion.div>
              <span className="text-sm" style={{ color: step > i ? "#f0ece8" : "#b8aec8" }}>{s}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Phase 3 — Result  (two-panel)
───────────────────────────────────────────────────────────────────────────── */
const ResultPhase: React.FC<{
  result: HealthResult;
  onReset: () => void;
}> = ({ result: r, onReset }) => {
  const [showFhir, setShowFhir] = useState(false);
  const cfg                     = RISK_CONFIG[r.risk_level] || RISK_CONFIG.low;
  const scoreDisplay            = useAnimatedScore(Math.round(r.severity_score * 100), true);

  return (
    <motion.div className="w-full max-w-[1100px] mx-auto"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.45, ease }}>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">

        {/* LEFT */}
        <div className="space-y-4">

          {/* Risk banner */}
          <motion.div className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: cfg.bg, border: `2px solid ${cfg.border}` }}
            initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}>
            <span className="text-4xl">{cfg.icon}</span>
            <div className="flex-1">
              <p className="font-black text-xl" style={{ color: cfg.text }}>{cfg.label}</p>
              <p className="text-xs mt-1" style={{ color: cfg.text + "aa" }}>
                Urgency: <span className="font-bold capitalize">{r.urgency}</span>
                {r.report_id && <span className="ml-3 font-mono opacity-60">· {r.report_id}</span>}
              </p>
            </div>
            <ArcGauge score={scoreDisplay} color={cfg.border} />
          </motion.div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-3">
            {r.risk_level === "critical" && (
              <motion.a href="tel:108"
                className="col-span-3 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black"
                style={{ background: "linear-gradient(135deg,#e05050,#c03030)", color: "#fff" }}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                animate={{ boxShadow: ["0 0 0 0 rgba(224,80,80,0)", "0 0 0 10px rgba(224,80,80,0.25)", "0 0 0 0 rgba(224,80,80,0)"] }}
                transition={{ duration: 1.5, repeat: Infinity }}>
                📞 Call 108 — Emergency
              </motion.a>
            )}
            <motion.button onClick={onReset}
              className="flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold btn-ghost"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              ← Analyze Again
            </motion.button>
            <Link to="/health-profile">
              <motion.div className="flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}
                whileHover={{ scale: 1.02 }}>
                🩺 Update Profile
              </motion.div>
            </Link>
            <Link to="/complaints/new">
              <motion.div className="flex items-center justify-center py-2.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.3)", color: "#F97316" }}
                whileHover={{ scale: 1.02 }}>
                📝 File Complaint
              </motion.div>
            </Link>
          </div>

          {/* Guidance */}
          <motion.div className="glass p-4 flex items-start gap-4"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}44` }}>
              {URGENCY_ICONS[r.urgency] || "💊"}
            </div>
            <div>
              <p className="section-label mb-1">Guidance</p>
              <p className="text-sm text-[#f0ece8] leading-relaxed font-medium">{r.guidance}</p>
            </div>
          </motion.div>

          {/* Entities */}
          {r.is_health_related && (
            <motion.div className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              variants={staggerContainer} initial="hidden" animate="visible">
              {[
                { label: "Diseases",   items: r.diseases,   color: ENTITY_COLORS.DISEASE,   icon: "🦠", hint: "" },
                { label: "Symptoms",   items: r.symptoms,   color: ENTITY_COLORS.SYMPTOM,   icon: "🌡️", hint: "" },
              ].map(({ label, items, color, icon, hint }) => (
                <motion.div key={label} variants={fadeUp} className="glass-sm p-4 space-y-2">
                  <p className="section-label">{icon} {label}
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{ background: `${color}22`, color }}>{items.length}</span>
                  </p>
                  {items.length === 0 ? (
                    <div>
                      <p className="text-xs text-[#b8aec8]">None detected</p>
                      {hint && <p className="text-[10px] text-[#b8aec8] mt-1 opacity-60">{hint}</p>}
                    </div>
                  ) : items.map(item => {
                    const entity = r.entities.find(e => e.text === item);
                    const w = entity ? entity.weight : 0;
                    return (
                      <div key={item}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full"
                            style={{ background: `${color}18`, color, border: `1px solid ${color}33` }}>
                            {item}
                          </span>
                          <span className="text-[10px] text-[#b8aec8]">{Math.round(w * 100)}%</span>
                        </div>
                        <div className="h-1 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
                          <motion.div className="h-full rounded-full" style={{ background: color }}
                            initial={{ width: 0 }} animate={{ width: `${w * 100}%` }}
                            transition={{ duration: 0.7, ease }} />
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ML row */}
          {r.ml_prediction && (
            <motion.div className="glass-sm px-4 py-3 flex flex-wrap items-center gap-3 text-xs"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <span className="text-[#b8aec8]">Rule engine:</span>
              <span className="font-bold capitalize" style={{ color: cfg.text }}>{r.risk_level}</span>
              <span className="text-[#b8aec8]">·</span>
              <span className="text-[#b8aec8]">ML:</span>
              <span className="font-bold capitalize" style={{ color: RISK_CONFIG[r.ml_prediction]?.text || "#b8aec8" }}>{r.ml_prediction}</span>
              <span className="px-2 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(249,115,22,0.15)", color: "#F97316", border: "1px solid rgba(249,115,22,0.3)" }}>
                {Math.round(r.ml_confidence * 100)}% conf
              </span>
              <span className="px-2 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(160,144,224,0.15)", color: "#a78bfa", border: "1px solid rgba(160,144,224,0.3)" }}>
                {r.risk_source}
              </span>
            </motion.div>
          )}

          {/* FHIR */}
          {r.fhir_resource && (
            <motion.div className="glass-sm p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <motion.button onClick={() => setShowFhir(f => !f)}
                className="flex items-center justify-between w-full text-sm font-semibold text-[#b8aec8]"
                whileTap={{ scale: 0.98 }}>
                <span>🔬 FHIR R4 Output</span>
                <motion.span animate={{ rotate: showFhir ? 180 : 0 }} transition={{ duration: 0.2 }}>▼</motion.span>
              </motion.button>
              <AnimatePresence>
                {showFhir && (
                  <motion.pre className="mt-3 text-[11px] text-[#b8aec8] overflow-auto max-h-60 p-3 rounded-xl"
                    style={{ background: "rgba(0,0,0,0.3)", fontFamily: "monospace", lineHeight: 1.5 }}
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                    {JSON.stringify(r.fhir_resource, null, 2)}
                  </motion.pre>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* RIGHT sidebar */}
        <div className="space-y-4">

          {/* Nearby facilities */}
          {r.nearby_facilities?.length > 0 ? (
            <motion.div className="glass-sm p-4 space-y-3"
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <p className="section-label">🏥 Nearby Facilities</p>
              {r.nearby_facilities.map((f, i) => (
                <div key={i} className="p-3 rounded-xl space-y-1"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">{(f as any).icon || "🏥"}</span>
                    <p className="text-xs font-bold text-[#f0ece8] truncate flex-1">{f.name}</p>
                    {(f as any).emergency && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
                        style={{ background: "rgba(224,80,80,0.2)", color: "#e05050", border: "1px solid rgba(224,80,80,0.3)" }}>
                        24/7
                      </span>
                    )}
                  </div>
                  {f.address && <p className="text-[10px] text-[#b8aec8] truncate">{f.address}</p>}
                  {(f as any).opening_hours && (
                    <p className="text-[10px] text-[#b8aec8]">⏰ {(f as any).opening_hours}</p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold" style={{ color: cfg.text }}>{f.distance_km} km</span>
                    {f.lat && f.lon && (
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lon}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[10px] px-2.5 py-1 rounded-full font-semibold"
                        style={{ background: "linear-gradient(135deg,#F97316,#ea580c)", color: "#fff" }}>
                        🗺 Go
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {/* Find more button */}
              {r.nearby_facilities.length > 0 && (
                <a href={`https://www.google.com/maps/search/hospitals+near+me`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#b8aec8" }}>
                  🔍 Find more hospitals on Google Maps
                </a>
              )}
            </motion.div>
          ) : (
            <div className="glass-sm p-4 rounded-2xl text-center space-y-2">
              <p className="text-2xl">🏥</p>
              <p className="text-xs text-[#b8aec8]">Enable GPS to find nearby healthcare facilities</p>
              <a href="https://www.google.com/maps/search/hospitals+near+me"
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-[#F97316] underline block">
                Search on Google Maps →
              </a>
            </div>
          )}

          {/* Risk summary */}
          <motion.div className="glass-sm p-4 space-y-2"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
            <p className="section-label">📊 Risk Summary</p>
            {[
              { label: "Severity Score", value: `${Math.round(r.severity_score * 100)}%`, color: cfg.text },
              { label: "Risk Level",     value: r.risk_level.toUpperCase(),               color: cfg.text },
              { label: "Urgency",        value: r.urgency.toUpperCase(),                  color: cfg.text },
              { label: "Diseases",       value: String(r.diseases.length),                color: ENTITY_COLORS.DISEASE },
              { label: "Symptoms",       value: String(r.symptoms.length),                color: ENTITY_COLORS.SYMPTOM },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-1 border-b border-white/5 last:border-0">
                <span className="text-[11px] text-[#b8aec8]">{label}</span>
                <span className="text-xs font-bold" style={{ color }}>{value}</span>
              </div>
            ))}
          </motion.div>

          {/* Emergency numbers */}
          <motion.div className="glass-sm p-4 space-y-2"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <p className="section-label">📞 Emergency Numbers</p>
            {[
              { label: "Ambulance",      number: "108",  color: "#e05050" },
              { label: "Police",         number: "100",  color: "#6090d0" },
              { label: "Fire",           number: "101",  color: "#F97316" },
              { label: "Women Helpline", number: "1091", color: "#a78bfa" },
            ].map(({ label, number, color }) => (
              <a key={label} href={`tel:${number}`}
                className="flex items-center justify-between p-2 rounded-xl"
                style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
                <span className="text-xs text-[#b8aec8]">{label}</span>
                <span className="text-sm font-black" style={{ color }}>{number}</span>
              </a>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────────── */
const HealthcareAI: React.FC = () => {
  const [phase, setPhase]       = useState<Phase>("input");
  const [result, setResult]     = useState<HealthResult | null>(null);
  const [userCoords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const pendingRef              = useRef<{ text: string; location: string } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {}, { timeout: 5000 },
    );
  }, []);

  const handleSubmit = useCallback(async (text: string, location: string, locData?: LocationData | null) => {
    pendingRef.current = { text, location };
    setPhase("loading");
    try {
      const body: any = { text, location, save_report: true };
      // Prefer coords from the map picker, fall back to GPS auto-detect
      const lat = locData?.latitude  ?? userCoords?.lat;
      const lon = locData?.longitude ?? userCoords?.lon;
      if (lat && lon) { body.location_lat = lat; body.location_lon = lon; }
      const { data } = await api.post("/healthcare/analyze", body);
      setResult(data);
      setPhase("result");
      if (!data.is_health_related) toast("No health entities detected", { icon: "ℹ️" });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Analysis failed");
      setPhase("input");
    }
  }, [userCoords]);

  const handleReset = () => { setPhase("input"); setResult(null); };

  return (
    <div className="min-h-screen px-4 py-8">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6 max-w-[1100px] mx-auto"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease }}>
        <div className="orb orb-coral w-10 h-10 text-lg flex-shrink-0">🏥</div>
        <div>
          <p className="text-xs font-bold text-[#F97316] tracking-widest uppercase">AarogyaCivic</p>
          <p className="text-[11px] text-[#b8aec8]">Healthcare AI · NER · ML Risk · FHIR R4</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link to="/health-profile"
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}>
            🩺 My Health Profile
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-[#b8aec8]">AI Online</span>
          </div>
        </div>
      </motion.div>

      {/* Phase switcher */}
      <AnimatePresence mode="wait">
        {phase === "input"   && <InputPhase   key="input"   onSubmit={handleSubmit} />}
        {phase === "loading" && <LoadingPhase key="loading" />}
        {phase === "result"  && result && <ResultPhase key="result" result={result} onReset={handleReset} />}
      </AnimatePresence>
    </div>
  );
};

export default HealthcareAI;

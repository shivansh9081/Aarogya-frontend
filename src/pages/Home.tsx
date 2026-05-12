import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion, useInView } from "framer-motion";

/* ─── Design tokens ─── */
const C = {
  bgBase:      "#080f0a",
  bgSurface:   "#0e1f12",
  bgElevated:  "#152a19",
  accent:      "#22c55e",
  accentGlow:  "#4ade80",
  accentMuted: "#16a34a",
  heading:     "#f0fdf4",
  body:        "#bbf7d0",
  muted:       "#6ee7b7",
  subtle:      "#4b7a5e",
  borderSubtle:"rgba(74,222,128,0.12)",
  borderGlow:  "rgba(74,222,128,0.35)",
  shadowGlow:  "0 0 40px rgba(1, 255, 94, 0.15)",
} as const;

const ease = [0.22, 1, 0.36, 1] as const;
const reveal = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease } },
};
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const HERO_IMG  = "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1600&q=80&auto=format&fit=crop";
const ABOUT_IMG = "https://images.unsplash.com/photo-1599930113854-d6d7fd521f10?w=600&q=80&auto=format&fit=crop";

const FEATURE_CARDS = [
  { img: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=500&q=75&auto=format&fit=crop", icon: "��️", title: "Report Civic Issues",    desc: "Water, electricity, roads, sanitation — AI classifies and routes instantly",    btn: "Report Now",          path: "/complaints/new", tag: "AI-Powered" },
  { img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500&q=75&auto=format&fit=crop", icon: "🏥", title: "Healthcare AI",           desc: "Describe symptoms, get risk assessment and nearby hospital directions",         btn: "Check Health",        path: "/healthcare",     tag: "FHIR R4"    },
  { img: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=500&q=75&auto=format&fit=crop", icon: "🔒", title: "Anonymous Complaints",    desc: "Submit without an account — phone-verified, fully private",                   btn: "Submit Anonymously",  path: "/anonymous",      tag: "Private"    },
];

const STATS = [
  { value: "98%", label: "Resolution Rate", icon: "✅" },
  { value: "5d",  label: "Avg Resolution",  icon: "⚡" },
  { value: "94%", label: "AI Accuracy",     icon: "🧠" },
  { value: "23",  label: "Govt. Offices",   icon: "🏛️" },
];

const HOW_STEPS = [
  { n: "01", icon: "✍️", title: "Describe",        desc: "Type your complaint in plain language"    },
  { n: "02", icon: "🧠", title: "AI Classifies",   desc: "Category, priority, department assigned"  },
  { n: "03", icon: "🛡️", title: "Officer Acts",    desc: "Nearest officer resolves the issue"       },
  { n: "04", icon: "✅", title: "You're Notified", desc: "Track status at every step"               },
];

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} variants={reveal} initial="hidden" animate={inView ? "visible" : "hidden"} transition={{ delay }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Shared style helpers ─── */
const sectionLabel: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", fontWeight: 600,
  letterSpacing: "0.18em", textTransform: "uppercase", color: "#4ade80", marginBottom: 12,
};
const sectionHeading: React.CSSProperties = {
  fontFamily: "'Sora', sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.8rem)",
  fontWeight: 700, color: "#f0fdf4", letterSpacing: "-0.02em",
};
const dividerLine = (
  <div style={{
    position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
    width: "60%", height: 1,
    background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.22), transparent)",
  }} />
);

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ minHeight: "100vh", fontFamily: "'DM Sans', sans-serif", position: "relative" }}>

      {/* Ambient glows */}
      <div style={{ position: "fixed", top: -200, left: -200, width: 600, height: 600, zIndex: 0, pointerEvents: "none", background: "radial-gradient(circle, rgba(34,197,94,0.08), transparent 70%)" }} />
      <div style={{ position: "fixed", bottom: -200, right: -200, width: 500, height: 500, zIndex: 0, pointerEvents: "none", background: "radial-gradient(circle, rgba(74,222,128,0.05), transparent 70%)" }} />

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden" style={{ minHeight: "92vh", display: "flex", alignItems: "center" }}>
        <div className="absolute inset-0">
          <img src={HERO_IMG} alt="Indian rural village" className="w-full h-full object-cover" style={{ objectPosition: "center 60%", filter: "brightness(0.32) saturate(0.75)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 70% 40%, rgba(34,197,94,0.12) 0%, transparent 70%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(8,15,10,0.88) 0%, rgba(8,15,10,0.52) 55%, rgba(8,15,10,0.1) 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-40" style={{ background: "linear-gradient(to bottom, transparent, #080f0a)" }} />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 md:px-16 py-24">
          <div style={{ maxWidth: 640 }}>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease, delay: 0.05 }}
              className="inline-flex items-center gap-2 mb-7 px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", backdropFilter: "blur(12px)", letterSpacing: "0.06em", fontFamily: "'DM Sans', sans-serif" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
              AI-Powered Civic Platform · Punjab, India
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease, delay: 0.15 }}
              style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 800, color: "#f0fdf4", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1.25rem" }}>
              Your City,{" "}
              <span style={{ background: "linear-gradient(135deg, #4ade80, #22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Smarter</span>
              <br />Every Day
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.3 }}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1rem", color: "#bbf7d0", lineHeight: 1.75, maxWidth: 480, marginBottom: "2.25rem" }}>
              Report civic issues and health concerns. AI classifies, routes, and tracks every complaint to resolution — in real time.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.45 }} className="flex flex-wrap gap-3">
              <motion.button onClick={() => navigate(user ? "/complaints/new" : "/signup")}
                style={{ background: "#22c55e", color: "#000", borderRadius: 999, padding: "12px 28px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem", border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(34,197,94,0.4)" }}
                whileHover={{ boxShadow: "0 0 30px rgba(34,197,94,0.6)", y: -2 }} whileTap={{ scale: 0.97 }}>
                Get Started →
              </motion.button>
              <motion.button onClick={() => navigate("/healthcare")}
                style={{ border: "1.5px solid #22c55e", color: "#22c55e", background: "transparent", borderRadius: 999, padding: "12px 28px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" }}
                whileHover={{ background: "rgba(34,197,94,0.1)", y: -2 }} whileTap={{ scale: 0.97 }}>
                🏥 Health AI
              </motion.button>
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
              style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "#4b7a5e", fontFamily: "'DM Sans', sans-serif" }}>
              Trusted by 10,000+ citizens · Powered by FastAPI + React · FHIR R4 compliant
            </motion.p>
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section style={{ padding: "0 1rem 5rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              {STATS.map(({ value, label, icon }) => (
                <motion.div key={label}
                  style={{ background: "#152a19", border: "1px solid rgba(74,222,128,0.12)", borderRadius: 16, padding: "28px 24px", textAlign: "center", cursor: "default" }}
                  whileHover={{ y: -4, borderColor: "rgba(74,222,128,0.35)", boxShadow: "0 0 40px rgba(34,197,94,0.15)" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{icon}</div>
                  <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "2.5rem", color: "#4ade80", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 6 }}>{value}</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#6ee7b7", fontSize: "0.85rem", letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</p>
                </motion.div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══ ABOUT ══ */}
      <section style={{ padding: "4rem 1rem 5rem", position: "relative", zIndex: 1 }}>
        {dividerLine}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <FadeUp>
            <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", height: 340, boxShadow: "0 0 40px rgba(34,197,94,0.15)", border: "1px solid rgba(74,222,128,0.12)" }}>
              <img src={ABOUT_IMG} alt="Civic services" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(8,15,10,0.7) 100%)" }} />
              <div style={{ position: "absolute", top: 16, left: 16, display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(34,197,94,0.9)", color: "#000", fontSize: "0.75rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" }}>
                <img src="/logo-icon.svg" alt="" style={{ width:16, height:16, borderRadius:"50%" }} /> AarogyaCivic
              </div>
              <motion.div style={{ position: "absolute", bottom: 16, right: 16, padding: "12px 18px", borderRadius: 14, textAlign: "center", background: "rgba(14,31,18,0.92)", backdropFilter: "blur(12px)", border: "1px solid rgba(74,222,128,0.35)" }}
                animate={{ y: [0, -5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <p style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1.6rem", color: "#22c55e", lineHeight: 1 }}>98%</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", color: "#6ee7b7", marginTop: 3 }}>Resolution Rate</p>
              </motion.div>
            </div>
          </FadeUp>
          <FadeUp delay={0.12}>
            <p style={sectionLabel}>Welcome to AarogyaCivic</p>
            <h2 style={{ ...sectionHeading, marginBottom: 18 }}>Connecting Citizens<br />with Government</h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "1rem", color: "#bbf7d0", lineHeight: 1.75, marginBottom: 28 }}>
              AarogyaCivic is an AI-powered platform that makes it easy to report civic issues — water, electricity, roads, sanitation — and get real-time health risk assessments. Every complaint is automatically classified, prioritized, and routed to the nearest officer.
            </p>
            <div className="flex flex-wrap gap-3">
              <motion.button onClick={() => navigate(user ? "/complaints/new" : "/signup")}
                style={{ background: "#22c55e", color: "#000", borderRadius: 999, padding: "12px 28px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem", border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(34,197,94,0.35)" }}
                whileHover={{ boxShadow: "0 0 30px rgba(34,197,94,0.55)", y: -2 }} whileTap={{ scale: 0.97 }}>
                📝 Get Started
              </motion.button>
              <motion.button onClick={() => navigate("/healthcare")}
                style={{ border: "1.5px solid #22c55e", color: "#22c55e", background: "transparent", borderRadius: 999, padding: "12px 28px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" }}
                whileHover={{ background: "rgba(34,197,94,0.1)", y: -2 }} whileTap={{ scale: 0.97 }}>
                🏥 Health AI
              </motion.button>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══ FEATURE CARDS ══ */}
      <section style={{ padding: "5rem 1rem", position: "relative", zIndex: 1 }}>
        {dividerLine}
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp className="text-center mb-12">
            <p style={sectionLabel}>What can you do?</p>
            <h2 style={sectionHeading}>3 Ways to Make a Difference</h2>
          </FadeUp>
          <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-5" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            {FEATURE_CARDS.map(({ img, icon, title, desc, btn, path, tag }) => (
              <motion.div key={title} variants={reveal}
                style={{ background: "#152a19", border: "1px solid rgba(74,222,128,0.12)", borderRadius: 20, overflow: "hidden", cursor: "pointer" }}
                whileHover={{ y: -8, borderColor: "rgba(74,222,128,0.35)", boxShadow: "0 0 40px rgba(34,197,94,0.15)" }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}>
                <div style={{ position: "relative", height: 200, overflow: "hidden" }}>
                  <img src={img} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.72) saturate(0.85)" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(21,42,25,0.88) 100%)" }} />
                  <div style={{ position: "absolute", top: 12, right: 12, padding: "4px 10px", borderRadius: 999, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80", fontSize: "0.7rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.05em" }}>{tag}</div>
                  <div style={{ position: "absolute", bottom: 12, left: 14, fontSize: "1.5rem" }}>{icon}</div>
                </div>
                <div style={{ padding: "20px 20px 22px" }}>
                  <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1rem", color: "#f0fdf4", marginBottom: 8 }}>{title}</h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem", color: "#bbf7d0", lineHeight: 1.65, marginBottom: 18 }}>{desc}</p>
                  <motion.button onClick={() => navigate(path)}
                    style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #16a34a, #22c55e)", color: "#fff", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", boxShadow: "0 4px 16px rgba(34,197,94,0.25)" }}
                    whileHover={{ boxShadow: "0 6px 24px rgba(34,197,94,0.45)", y: -1 }} whileTap={{ scale: 0.97 }}>
                    {btn}
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ HOW IT WORKS ══ */}
      <section style={{ padding: "5rem 1rem", position: "relative", zIndex: 1 }}>
        {dividerLine}
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp className="text-center mb-12">
            <p style={sectionLabel}>Process</p>
            <h2 style={sectionHeading}>How It Works</h2>
          </FadeUp>
          <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}>
            {HOW_STEPS.map(({ n, icon, title, desc }, i) => (
              <motion.div key={n} variants={reveal}
                style={{ position: "relative", background: "#0e1f12", border: "1px solid rgba(74,222,128,0.12)", borderRadius: 16, padding: "28px 20px", textAlign: "center" }}
                whileHover={{ borderColor: "rgba(74,222,128,0.35)", boxShadow: "0 0 40px rgba(34,197,94,0.15)", y: -4 }}>
                {i < 3 && <div className="hidden md:block" style={{ position: "absolute", top: 36, right: -8, width: 16, height: 1, background: "rgba(74,222,128,0.3)", zIndex: 10 }} />}
                <div style={{ width: 48, height: 48, borderRadius: 14, margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}>{icon}</div>
                <div style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#4ade80", letterSpacing: "0.1em", marginBottom: 6 }}>{n}</div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: "0.95rem", color: "#f0fdf4", marginBottom: 6 }}>{title}</h3>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "#bbf7d0", lineHeight: 1.6 }}>{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section style={{ padding: "4rem 1rem 6rem", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <FadeUp>
            <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", padding: "64px 48px", textAlign: "center", background: "linear-gradient(135deg, #0a1f0d 0%, #0e2e14 40%, #122e16 70%, #0a1f0d 100%)", border: "1px solid rgba(74,222,128,0.35)", boxShadow: "0 0 60px rgba(34,197,94,0.12)" }}>
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(34,197,94,0.1) 0%, transparent 70%)" }} />
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.4, backgroundImage: "radial-gradient(rgba(74,222,128,0.08) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <div style={{ position: "relative" }}>
                <p style={{ ...sectionLabel, marginBottom: 16 }}>Join the movement</p>
                <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 800, color: "#f0fdf4", letterSpacing: "-0.02em", marginBottom: 14 }}>Ready to improve your city?</h2>
                <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#bbf7d0", fontSize: "1rem", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
                  Join thousands of citizens already using AarogyaCivic to make their communities better.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <motion.button onClick={() => navigate(user ? "/complaints/new" : "/signup")}
                    style={{ background: "#22c55e", color: "#000", borderRadius: 999, padding: "14px 32px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem", border: "none", cursor: "pointer", boxShadow: "0 0 24px rgba(34,197,94,0.45)" }}
                    whileHover={{ boxShadow: "0 0 36px rgba(34,197,94,0.65)", y: -2 }} whileTap={{ scale: 0.97 }}>
                    Get Started →
                  </motion.button>
                  <motion.button onClick={() => navigate("/login")}
                    style={{ border: "1.5px solid rgba(74,222,128,0.5)", color: "#4ade80", background: "transparent", borderRadius: 999, padding: "14px 32px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" }}
                    whileHover={{ background: "rgba(34,197,94,0.1)", y: -2 }} whileTap={{ scale: 0.97 }}>
                    Sign In
                  </motion.button>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{
        borderTop: "1px solid rgba(74,222,128,0.12)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          maxWidth: 1000,
          margin: "0 auto",
          padding: "20px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          rowGap: 8,
          columnGap: 24,
        }}>
          {/* Left — copyright */}
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "0.78rem",
            color: "#4b7a5e",
            margin: 0,
            whiteSpace: "nowrap",
          }}>
            © 2026 AarogyaCivic · AI-Powered Civic Platform · Punjab, India
          </p>

          {/* Right — developer credit */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.78rem",
              color: "#6ee7b7",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}>
              Shivansh Chauhan
            </span>
            <span style={{ color: "rgba(74,222,128,0.25)", fontSize: "0.7rem" }}>·</span>
            <a href="mailto:chauhanshiv5579@gmail.com" style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.75rem",
              color: "#6ee7b7",
              textDecoration: "underline",
              textUnderlineOffset: 3,
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "#4ade80"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#6ee7b7"; }}>
              chauhanshiv5579@gmail.com
            </a>
            <span style={{ color: "rgba(74,222,128,0.25)", fontSize: "0.7rem" }}>·</span>
            <a href="tel:+917009154919" style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.75rem",
              color: "#4b7a5e",
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "#4ade80")}
              onMouseLeave={e => (e.currentTarget.style.color = "#4b7a5e")}>
              +91 7009154919
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

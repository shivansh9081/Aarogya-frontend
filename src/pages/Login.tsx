import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const ease = [0.22, 1, 0.36, 1] as const;

const DEMOS = [
  { role: "Admin",   email: "admin@city.gov",        pass: "Admin@123",   icon: "⚙️", color: "#7c3aed" },
  { role: "Officer", email: "officer.road.lud@city.gov", pass: "Road@123", icon: "🛡️", color: "#F97316" },
  { role: "Citizen", email: "citizen@example.com",   pass: "Citizen@123", icon: "👤", color: "#22c55e" },
];

const Login: React.FC = () => {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg orb orb-purple">🏛️</div>
            <span className="font-bold text-lg" style={{ color: "var(--text)" }}>AarogyaCivic</span>
          </div>

          <h1 className="text-2xl font-black mb-1" style={{ color: "var(--text)" }}>Sign in</h1>
          <p className="text-sm mb-7" style={{ color: "var(--text-3)" }}>
            New here?{" "}
            <Link to="/signup" className="font-semibold" style={{ color: "var(--orange)" }}>Create an account</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: "email",    label: "Email",    type: "email",    placeholder: "you@example.com" },
              { key: "password", label: "Password", type: "password", placeholder: "••••••••" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-2)" }}>{label}</label>
                <motion.input
                  className="glass-input"
                  type={type}
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  onFocus={() => setFocused(key)}
                  onBlur={() => setFocused(null)}
                  animate={{ boxShadow: focused === key ? "0 0 0 3px rgba(249,115,22,0.15)" : "none" }}
                  required
                />
              </div>
            ))}

            <motion.button type="submit" disabled={loading}
              className="btn-glow w-full py-3 text-sm font-bold mt-2"
              whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>⟳</motion.span>
                  Signing in…
                </span>
              ) : "Sign In →"}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--text-3)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (res) => {
                try { await googleLogin(res.credential!); toast.success("Welcome!"); navigate("/dashboard"); }
                catch { toast.error("Google sign-in failed"); }
              }}
              onError={() => toast.error("Google sign-in failed")}
              theme="outline" shape="rectangular" width="100%"
            />
          </div>

          {/* Demo credentials */}
          <div className="mt-7 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="section-label mb-3">Quick demo access</p>
            <div className="space-y-2">
              {DEMOS.map(d => (
                <motion.button key={d.role}
                  onClick={() => setForm({ email: d.email, password: d.pass })}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                  style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
                  whileHover={{ borderColor: d.color, background: `${d.color}08` }}
                  whileTap={{ scale: 0.98 }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: `${d.color}15`, border: `1px solid ${d.color}30` }}>
                    {d.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold" style={{ color: d.color }}>{d.role}</p>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-3)" }}>{d.email}</p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-3)" }}>↗</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const Signup: React.FC = () => {
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await signup(form);
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Signup failed");
    } finally { setLoading(false); }
  };

  const FIELDS = [
    { label: "Full Name", key: "name", type: "text", placeholder: "John Citizen", required: true },
    { label: "Email", key: "email", type: "email", placeholder: "you@example.com", required: true },
    { label: "Password", key: "password", type: "password", placeholder: "Min 6 characters", required: true },
    { label: "Phone", key: "phone", type: "tel", placeholder: "+91 98765 43210", required: false },
    { label: "Address", key: "address", type: "text", placeholder: "Your area / locality", required: false },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-slide-up">
        <div className="glass p-8">
          <div className="text-center mb-8">
            <div className="orb orb-amber w-16 h-16 text-2xl mx-auto mb-4">✨</div>
            <h2 className="text-2xl font-extrabold text-[#f0ece8]">Create Account</h2>
            <p className="text-sm text-[#b8aec8] mt-1">Join AarogyaCivic today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map(({ label, key, type, placeholder, required }) => (
              <div key={key}>
                <label className="section-label block mb-2">{label}{!required && " (optional)"}</label>
                <input className="glass-input" type={type} placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  required={required} />
              </div>
            ))}
            <button type="submit" disabled={loading} className="btn-glow w-full py-3 text-sm mt-2">
              {loading ? "Creating account..." : "Create Account →"}
            </button>
          </form>

          <p className="text-center text-sm text-[#b8aec8] mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-[#f0a070] font-semibold hover:underline">Sign in</Link>
          </p>

          {/* Google Sign-Up */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center w-full gap-3 my-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-[#b8aec8]">or sign up with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <GoogleLogin
              onSuccess={async (res) => {
                try {
                  await googleLogin(res.credential!);
                  toast.success("Account created!");
                  navigate("/dashboard");
                } catch {
                  toast.error("Google sign-up failed");
                }
              }}
              onError={() => toast.error("Google sign-up failed")}
              theme="filled_black"
              shape="pill"
              width="100%"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

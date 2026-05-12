import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare, LayoutDashboard, Stethoscope, HeartPulse,
  PlusCircle, Shield, Settings, LogIn, Lock, LogOut,
  Menu, X, User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import LanguageSelector from "./LanguageSelector";

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (p: string) => location.pathname === p;

  const navItem = (to: string, Icon: React.ElementType, labelKey: string) => (
    <Link to={to} key={to}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
      style={{
        color: isActive(to) ? "#4ade80" : "rgba(255,255,255,0.6)",
        background: isActive(to) ? "rgba(74,222,128,0.12)" : "transparent",
        border: isActive(to) ? "1px solid rgba(74,222,128,0.25)" : "1px solid transparent",
        fontWeight: isActive(to) ? 700 : 500,
      }}>
      <Icon size={15} strokeWidth={isActive(to) ? 2.2 : 1.8} />
      <span className="hidden sm:block">{t(labelKey)}</span>
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 px-4 pt-3 pb-2">
      <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between"
        style={{
          background: "rgba(15,26,15,0.85)",
          backdropFilter: "blur(20px)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>

        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo-icon.svg" alt="AarogyaCivic" className="w-9 h-9 flex-shrink-0 rounded-full object-contain" />
          <span className="font-bold text-base hidden sm:block" style={{ color: "var(--text)" }}>AarogyaCivic</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {user ? (
            <>
              {navItem("/chatbot",        MessageSquare,  "navbar.chatbot")}
              {navItem("/dashboard",      LayoutDashboard,"navbar.dashboard")}
              {navItem("/healthcare",     Stethoscope,    "navbar.healthcare")}
              {navItem("/health-profile", HeartPulse,     "navbar.healthProfile")}
              {navItem("/complaints/new", PlusCircle,     "navbar.report")}
              {user.role === "officer" && navItem("/officer", Shield, "navbar.myCases")}
              {(user.role === "admin" || user.role === "officer") && navItem("/admin", Settings, "navbar.admin")}
            </>
          ) : (
            <>
              {navItem("/login",     LogIn, "auth.login")}
              {navItem("/anonymous", Lock,  "navbar.anonymous")}
            </>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <LanguageSelector />

          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--text)" }}>{user.name.split(" ")[0]}</span>
                <span className="text-xs capitalize" style={{ color: "var(--text-3)" }}>· {user.role}</span>
              </div>
              <button onClick={() => { logout(); navigate("/login"); }}
                className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
                <LogOut size={13} strokeWidth={2} />
                <span>{t("navbar.logout")}</span>
              </button>
            </>
          ) : (
            <Link to="/signup">
              <motion.button className="text-sm px-5 py-2 rounded-full font-bold text-white flex items-center gap-1.5"
                style={{ background: "#2d7a2d", boxShadow: "0 4px 14px rgba(45,122,45,0.35)" }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <User size={14} strokeWidth={2} />
                {t("auth.signup")}
              </motion.button>
            </Link>
          )}

          {/* Mobile toggle */}
          <button onClick={() => setMenuOpen(o => !o)}
            className="md:hidden btn-ghost w-9 h-9 flex items-center justify-center">
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && user && (
        <div className="md:hidden mt-2 max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1 animate-fade-in rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow)" }}>
          {([
            ["/chatbot",        MessageSquare,  t("navbar.chatbot")],
            ["/dashboard",      LayoutDashboard,t("navbar.dashboard")],
            ["/healthcare",     Stethoscope,    t("navbar.healthcare")],
            ["/complaints/new", PlusCircle,     t("navbar.report")],
            ...(user.role === "officer" ? [["/officer", Shield, t("navbar.myCases")]] : []),
            ...(user.role !== "citizen" ? [["/admin", Settings, t("navbar.admin")]] : []),
          ] as [string, React.ElementType, string][]).map(([to, Icon, label]) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 text-sm py-2.5 px-2 font-medium rounded-xl transition-colors hover:bg-white/5"
              style={{ color: "var(--text-2)", borderBottom: "1px solid var(--border)" }}>
              <Icon size={15} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;

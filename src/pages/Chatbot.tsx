import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import LocationPicker, { LocationData } from "../components/LocationPicker";

type Sender = "user" | "bot";
type FlowStep = "welcome" | "category" | "location" | "describe" | "processing" | "done" | "open";

interface Option { label: string; value: string; icon: string; color?: string }
interface Message {
  id: number; text: string; sender: Sender;
  options?: Option[]; result?: ComplaintResult; timestamp: Date;
  showLocationPicker?: boolean;
}
interface ComplaintResult {
  complaint_id: string; category: string; priority: string;
  estimated_resolution_days: number; is_duplicate: boolean; duplicate_of?: string;
  location_city?: string; location_state?: string;
}

const CATEGORIES: Option[] = [
  { label: "Water Issue", value: "water", icon: "💧", color: "#6090d0" },
  { label: "Electricity", value: "electricity", icon: "⚡", color: "#e8a030" },
  { label: "Road Damage", value: "road", icon: "🛣️", color: "#8090a0" },
  { label: "Sanitation", value: "sanitation", icon: "🗑️", color: "#60b070" },
  { label: "Other", value: "others", icon: "📋", color: "#9070c0" },
];

const PRIORITY_COLORS: Record<string, string> = { high: "#e08080", medium: "#f0a060", low: "#70c090" };
const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const Chatbot: React.FC = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<FlowStep>("welcome");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const addMsg = useCallback((text: string, sender: Sender, extras?: Partial<Message>) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), text, sender, timestamp: new Date(), ...extras }]);
  }, []);

  useEffect(() => {
    setTimeout(() => addMsg("👋 Hello! I'm *AarogyaCivic*, your AI-powered public service assistant.", "bot"), 300);
    setTimeout(() => addMsg("What kind of problem are you facing today?", "bot", { options: CATEGORIES }), 900);
    setStep("category");
  }, [addMsg]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const handleCategorySelect = (opt: Option) => {
    if (step !== "category") return;
    setSelectedCategory(opt.value);
    addMsg(`${opt.icon} ${opt.label}`, "user");
    setTimeout(() => {
      addMsg("📍 Where is this issue located? Search for your area or use current location.", "bot", { showLocationPicker: true });
      setStep("location");
    }, 400);
  };

  const handleLocationConfirm = (loc: LocationData | null) => {
    if (loc) {
      setSelectedLocation(loc);
      addMsg(`📍 ${loc.display}`, "user");
    } else {
      addMsg("📍 Location skipped", "user");
    }
    setTimeout(() => {
      addMsg(`Got it! Now please describe your *${selectedCategory}* issue in detail.`, "bot");
      setStep("describe");
      inputRef.current?.focus();
    }, 400);
  };

  const handleDescriptionSubmit = async () => {
    const text = input.trim();
    if (text.length < 10) { toast.error("Please describe your issue (min 10 characters)"); return; }
    addMsg(text, "user");
    setInput("");
    setStep("processing");
    setLoading(true);
    try {
      const { data } = await api.post("/complaints/", {
        title: `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} issue via chatbot`,
        description: text,
        location: selectedLocation?.display || "",
        location_area: selectedLocation?.area || null,
        location_city: selectedLocation?.city || null,
        location_state: selectedLocation?.state || null,
        location_country: selectedLocation?.country || "India",
        latitude: selectedLocation?.latitude || null,
        longitude: selectedLocation?.longitude || null,
      });
      setTimeout(() => {
        setLoading(false);
        addMsg("✅ Your complaint has been registered!", "bot", {
          result: {
            complaint_id: data.complaint_id, category: data.category,
            priority: data.priority, estimated_resolution_days: data.estimated_resolution_days || 7,
            is_duplicate: data.is_duplicate, duplicate_of: data.duplicate_of,
          }
        });
        setTimeout(() => {
          addMsg("What would you like to do next?", "bot", {
            options: [
              { label: "Report another", value: "restart", icon: "🔄", color: "#7060c0" },
              { label: "Track complaint", value: "track", icon: "🔍", color: "#e8803a" },
              { label: "Dashboard", value: "dashboard", icon: "📊", color: "#60b070" },
            ]
          });
          setStep("done");
        }, 600);
      }, 1500);
    } catch (err: any) {
      setLoading(false);
      toast.error(err.response?.data?.detail || "Failed to submit");
      setStep("describe");
    }
  };

  const handleFree = async () => {
    const text = input.trim();
    if (!text) return;
    addMsg(text, "user");
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/chatbot/", { message: text });
      setTimeout(() => {
        setLoading(false);
        addMsg(data.response, "bot");
        if (data.redirect_to_health) {
          setTimeout(() => {
            addMsg("Would you like me to run a full health risk analysis?", "bot", {
              options: [
                { label: "Yes, analyze health risk", value: "health", icon: "🏥", color: "#d4706a" },
                { label: "No, thanks", value: "no", icon: "❌" },
              ]
            });
          }, 400);
        }
      }, 700);
    } catch { setLoading(false); toast.error("Chatbot unavailable"); }
  };

  const handleSend = () => {
    if (step === "describe") handleDescriptionSubmit();
    else if (step === "open") handleFree();
  };

  const handleOption = (opt: Option) => {
    if (step === "category") { handleCategorySelect(opt); return; }
    if (step === "done") {
      if (opt.value === "restart") {
        setMessages([]);
        setSelectedCategory("");
        setSelectedLocation(null);
        setTimeout(() => { addMsg("What kind of problem are you facing today?", "bot", { options: CATEGORIES }); setStep("category"); }, 300);
      } else { navigate("/dashboard"); }
    }
  };

  const disabled = step === "category" || step === "location" || step === "processing" || loading;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-2xl flex flex-col animate-fade-in"
        style={{ height: "84vh", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 24, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 relative"
            style={{ background: "linear-gradient(135deg, #86efac, #2d7a2d)", boxShadow: "0 4px 14px rgba(45,122,45,0.3)" }}>
            🤖
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: "var(--text)" }}>AarogyaCivic Bot</p>
            <p className="text-[11px]" style={{ color: "var(--text-3)" }}>AI-powered · Online</p>
          </div>
          <button onClick={() => { setStep("open"); addMsg("Switched to open chat. Ask me anything!", "bot"); }}
            className="btn-ghost text-xs px-3 py-1.5">
            Open Chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col animate-slide-up ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[80%] px-4 py-3 relative ${
                msg.sender === "user"
                  ? "rounded-3xl rounded-br-lg text-white"
                  : "rounded-3xl rounded-bl-lg"
              }`}
                style={msg.sender === "user"
                  ? { background: "linear-gradient(135deg, #2d7a2d, #1a5c1a)", boxShadow: "0 4px 16px rgba(45,122,45,0.35)", color: "#fff" }
                  : { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }
                }>

                {/* Text with bold */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text.split(/\*(.*?)\*/g).map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}
                </p>

                {/* Complaint result */}
                {msg.result && (
                  <div className="mt-3 rounded-2xl p-3 space-y-2"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#b8aec8]">Complaint ID</span>
                      <span className="font-mono font-bold text-[#f0a070] text-sm">{msg.result.complaint_id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#b8aec8]">Category</span>
                      <span className="text-xs font-semibold capitalize text-[#f0ece8]">{msg.result.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#b8aec8]">Priority</span>
                      <span className="text-xs font-bold capitalize" style={{ color: PRIORITY_COLORS[msg.result.priority] }}>
                        {msg.result.priority} · {msg.result.estimated_resolution_days} days
                      </span>
                    </div>
                    {msg.result.is_duplicate && (
                      <div className="text-[11px] rounded-xl px-2 py-1"
                        style={{ background: "rgba(232,128,58,0.15)", color: "#f0a060" }}>
                        ⚠️ Similar to {msg.result.duplicate_of}
                      </div>
                    )}
                  </div>
                )}

                {/* Options */}
                {msg.options && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {msg.options.map(opt => (
                      <button key={opt.value} onClick={() => handleOption(opt)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95"
                        style={{
                          background: opt.color ? `${opt.color}33` : "rgba(255,255,255,0.12)",
                          border: `1px solid ${opt.color ? `${opt.color}55` : "rgba(255,255,255,0.2)"}`,
                          color: opt.color || "#f0ece8",
                        }}>
                        <span>{opt.icon}</span><span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Inline location picker */}
                {msg.showLocationPicker && step === "location" && (
                  <div className="mt-3 animate-fade-in" onClick={e => e.stopPropagation()}>
                    <LocationPicker
                      value={selectedLocation}
                      onChange={setSelectedLocation}
                      placeholder="Search area, city..."
                    />
                    <button onClick={() => handleLocationConfirm(selectedLocation)}
                      className="btn-glow text-xs px-4 py-2 w-full mt-3">
                      {selectedLocation ? "✓ Confirm Location" : "Skip →"}
                    </button>
                  </div>
                )}

                <p className="text-[10px] mt-1.5 opacity-50 text-right">{fmt(msg.timestamp)}</p>
              </div>
            </div>
          ))}

          {/* Typing */}
          {loading && (
            <div className="flex items-start animate-fade-in">
              <div className="px-4 py-3 rounded-3xl rounded-bl-lg"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-2 h-2 rounded-full bg-[#b8aec8] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
          {step === "describe" && (
            <p className="text-[11px] mb-2 font-medium" style={{ color: "#2d7a2d" }}>
              📝 Describe your {selectedCategory} issue in detail...
            </p>
          )}
          <div className="flex gap-2 items-end">
            <textarea ref={inputRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={
                step === "category" ? "Select a category above..." :
                step === "location" ? "Use the location picker above..." :
                step === "describe" ? "Describe your issue here..." :
                step === "processing" ? "Processing your complaint..." :
                "Type a message..."
              }
              disabled={disabled}
              rows={2}
              className="flex-1 resize-none rounded-2xl px-4 py-2.5 text-sm outline-none transition-all glass-input"
            />
            <button onClick={handleSend}
              disabled={!input.trim() || disabled}
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #2d7a2d, #1a5c1a)", boxShadow: "0 4px 16px rgba(45,122,45,0.4)" }}>
              <svg className="w-4 h-4 rotate-90 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

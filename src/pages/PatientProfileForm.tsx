import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import toast from "react-hot-toast";

const CHRONIC_DISEASES = ["Diabetes", "Hypertension", "Asthma", "COPD", "Heart Disease",
  "Kidney Disease", "Liver Disease", "Thyroid", "Cancer", "HIV/AIDS"];
const ALLERGIES = ["Penicillin", "Aspirin", "Ibuprofen", "Peanuts", "Shellfish", "Dust", "Pollen", "Latex"];
const MEDICATIONS = ["Aspirin", "Metformin", "Lisinopril", "Atorvastatin", "Warfarin", "Ibuprofen", "Paracetamol", "Insulin"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

interface Profile {
  age: number; gender: string; height: number; weight: number; blood_group: string;
  chronic_diseases: string[]; allergies: string[]; medications: string[];
  pregnancy_status: boolean; pregnancy_trimester: number | null;
  immunocompromised: boolean; immunocompromised_reason: string;
  smoking_status: string; alcohol_consumption: string;
}

const DEFAULT: Profile = {
  age: 0, gender: "M", height: 170, weight: 70, blood_group: "",
  chronic_diseases: [], allergies: [], medications: [],
  pregnancy_status: false, pregnancy_trimester: null,
  immunocompromised: false, immunocompromised_reason: "",
  smoking_status: "never", alcohol_consumption: "none",
};

const ChipGroup: React.FC<{ items: string[]; selected: string[]; onToggle: (v: string) => void; color: string }> =
  ({ items, selected, onToggle, color }) => (
    <div className="flex flex-wrap gap-2">
      {items.map(item => {
        const on = selected.includes(item);
        return (
          <motion.button key={item} type="button" onClick={() => onToggle(item)}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="text-xs px-3 py-1.5 rounded-full font-semibold transition-colors"
            style={{
              background: on ? color : "rgba(255,255,255,0.07)",
              color: on ? "#fff" : "#b8aec8",
              border: on ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.12)",
            }}>
            {item}
          </motion.button>
        );
      })}
    </div>
  );

const Section: React.FC<{ icon: string; title: string; children: React.ReactNode }> =
  ({ icon, title, children }) => (
    <div className="glass-sm p-5 rounded-2xl space-y-4">
      <p className="text-sm font-bold text-[#f0ece8] flex items-center gap-2">
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  );

const PatientProfileForm: React.FC = () => {
  const [profile, setProfile] = useState<Profile>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    api.get("/healthcare/patient-profile")
      .then(r => setProfile({ ...DEFAULT, ...r.data }))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const toggle = (field: "chronic_diseases" | "allergies" | "medications", val: string) =>
    setProfile(p => ({
      ...p,
      [field]: p[field].includes(val) ? p[field].filter(x => x !== val) : [...p[field], val],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/healthcare/patient-profile", profile);
      toast.success("Health profile saved!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to save profile");
    } finally { setLoading(false); }
  };

  if (fetching) return <div className="text-center py-20 text-[#b8aec8]">Loading...</div>;

  return (
    <div className="min-h-screen px-4 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="orb orb-coral w-12 h-12 text-xl flex-shrink-0">🩺</div>
          <div>
            <h1 className="text-xl font-extrabold text-[#f0ece8]">Health Profile</h1>
            <p className="text-xs text-[#b8aec8]">Helps AI give you more accurate risk assessments</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Basic Info */}
          <Section icon="👤" title="Basic Information">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Age", field: "age", type: "number" },
                { label: "Height (cm)", field: "height", type: "number" },
                { label: "Weight (kg)", field: "weight", type: "number" },
              ].map(({ label, field, type }) => (
                <div key={field}>
                  <p className="text-[11px] text-[#b8aec8] mb-1">{label}</p>
                  <input type={type} className="glass-input w-full"
                    value={(profile as any)[field] || ""}
                    onChange={e => setProfile(p => ({ ...p, [field]: parseInt(e.target.value) || 0 }))} />
                </div>
              ))}
              <div>
                <p className="text-[11px] text-[#b8aec8] mb-1">Gender</p>
                <select className="glass-input w-full" value={profile.gender}
                  onChange={e => setProfile(p => ({ ...p, gender: e.target.value }))}>
                  <option value="M">Male</option>
                  <option value="F">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <p className="text-[11px] text-[#b8aec8] mb-1">Blood Group</p>
                <select className="glass-input w-full" value={profile.blood_group}
                  onChange={e => setProfile(p => ({ ...p, blood_group: e.target.value }))}>
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
            </div>
          </Section>

          {/* Chronic Diseases */}
          <Section icon="🏥" title="Chronic Diseases">
            <ChipGroup items={CHRONIC_DISEASES} selected={profile.chronic_diseases}
              onToggle={v => toggle("chronic_diseases", v)} color="#e05050" />
          </Section>

          {/* Allergies */}
          <Section icon="⚠️" title="Allergies">
            <ChipGroup items={ALLERGIES} selected={profile.allergies}
              onToggle={v => toggle("allergies", v)} color="#F97316" />
          </Section>

          {/* Medications */}
          <Section icon="💊" title="Current Medications">
            <ChipGroup items={MEDICATIONS} selected={profile.medications}
              onToggle={v => toggle("medications", v)} color="#a78bfa" />
          </Section>

          {/* Special Status */}
          <Section icon="✨" title="Special Status">
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={profile.pregnancy_status}
                  onChange={e => setProfile(p => ({ ...p, pregnancy_status: e.target.checked }))}
                  className="w-4 h-4 accent-orange-500" />
                <span className="text-sm text-[#f0ece8]">Currently pregnant</span>
              </label>
              <AnimatePresence>
                {profile.pregnancy_status && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="ml-7">
                    <p className="text-[11px] text-[#b8aec8] mb-1">Trimester</p>
                    <select className="glass-input w-full"
                      value={profile.pregnancy_trimester || ""}
                      onChange={e => setProfile(p => ({ ...p, pregnancy_trimester: parseInt(e.target.value) }))}>
                      <option value="">Select</option>
                      <option value="1">1st Trimester</option>
                      <option value="2">2nd Trimester</option>
                      <option value="3">3rd Trimester</option>
                    </select>
                  </motion.div>
                )}
              </AnimatePresence>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={profile.immunocompromised}
                  onChange={e => setProfile(p => ({ ...p, immunocompromised: e.target.checked }))}
                  className="w-4 h-4 accent-orange-500" />
                <span className="text-sm text-[#f0ece8]">Immunocompromised</span>
              </label>
              <AnimatePresence>
                {profile.immunocompromised && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }} className="ml-7">
                    <input className="glass-input w-full" placeholder="Reason (e.g. HIV, chemotherapy)"
                      value={profile.immunocompromised_reason}
                      onChange={e => setProfile(p => ({ ...p, immunocompromised_reason: e.target.value }))} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Section>

          {/* Lifestyle */}
          <Section icon="🚬" title="Lifestyle">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-[#b8aec8] mb-1">Smoking</p>
                <select className="glass-input w-full" value={profile.smoking_status}
                  onChange={e => setProfile(p => ({ ...p, smoking_status: e.target.value }))}>
                  <option value="never">Never</option>
                  <option value="current">Current</option>
                  <option value="former">Former</option>
                </select>
              </div>
              <div>
                <p className="text-[11px] text-[#b8aec8] mb-1">Alcohol</p>
                <select className="glass-input w-full" value={profile.alcohol_consumption}
                  onChange={e => setProfile(p => ({ ...p, alcohol_consumption: e.target.value }))}>
                  <option value="none">None</option>
                  <option value="occasional">Occasional</option>
                  <option value="regular">Regular</option>
                </select>
              </div>
            </div>
          </Section>

          <motion.button type="submit" disabled={loading}
            className="btn-glow w-full py-3 text-sm font-bold"
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            {loading ? "Saving..." : "✅ Save Health Profile"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default PatientProfileForm;

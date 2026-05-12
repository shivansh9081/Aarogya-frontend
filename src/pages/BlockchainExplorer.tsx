import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../services/api";
import toast from "react-hot-toast";

const ease = [0.22, 1, 0.36, 1] as const;

const STATUS_COLORS: Record<string, string> = {
  submitted: "#f0a070", assigned: "#a090e0", in_progress: "#6090d0",
  resolved: "#4ade80", escalated: "#e05050",
};

const BlockchainExplorer: React.FC = () => {
  const [query, setQuery]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [netInfo, setNetInfo]   = useState<any>(null);
  const [record, setRecord]     = useState<any>(null);
  const [history, setHistory]   = useState<any[]>([]);
  const [verifyResult, setVerify] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"record" | "history" | "verify">("record");

  useEffect(() => {
    api.get("/blockchain/status")
      .then(r => setNetInfo(r.data))
      .catch(() => setNetInfo({ status: "disabled" }));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setRecord(null);
    setHistory([]);
    setVerify(null);
    try {
      const { data } = await api.get(`/blockchain/complaint/${query.trim()}`);
      setRecord(data);
      toast.success("Record found");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Not found");
    } finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/blockchain/complaint/${query.trim()}/history`);
      setHistory(data.status_history || []);
      setActiveTab("history");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed");
    } finally { setLoading(false); }
  };

  const fetchVerify = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/blockchain/complaint/${query.trim()}/verify`);
      setVerify(data);
      setActiveTab("verify");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Verification failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="orb orb-coral w-12 h-12 text-xl flex-shrink-0">⛓️</div>
          <div>
            <h1 className="text-xl font-extrabold text-[#f0ece8]">Blockchain Explorer</h1>
            <p className="text-xs text-[#b8aec8]">Verify complaints on Polygon · Immutable audit trail</p>
          </div>
        </div>

        {/* Network status */}
        {netInfo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-sm p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${netInfo.status === "connected" ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
                <span className="text-xs font-bold text-[#f0ece8] capitalize">{netInfo.status}</span>
              </div>
              {netInfo.network && (
                <span className="text-xs text-[#b8aec8]">Network: <span className="text-[#f0ece8] font-semibold capitalize">{netInfo.network}</span></span>
              )}
              {netInfo.latest_block && (
                <span className="text-xs text-[#b8aec8]">Block: <span className="font-mono text-[#F97316]">#{netInfo.latest_block}</span></span>
              )}
              {netInfo.total_complaints_on_chain !== undefined && (
                <span className="text-xs text-[#b8aec8]">On-chain: <span className="font-bold text-[#4ade80]">{netInfo.total_complaints_on_chain}</span> complaints</span>
              )}
              {netInfo.status === "disabled" && (
                <span className="text-xs text-[#b8aec8]">{netInfo.reason}</span>
              )}
            </div>
          </motion.div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="glass p-5 rounded-2xl space-y-3">
          <p className="section-label">🔍 Search by Complaint ID</p>
          <div className="flex gap-3">
            <input className="glass-input flex-1" placeholder="e.g. CMP-202506-A1B2C3"
              value={query} onChange={e => setQuery(e.target.value)} />
            <motion.button type="submit" disabled={loading}
              className="btn-glow px-5 py-2 text-sm font-bold flex-shrink-0"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              {loading ? "…" : "Search"}
            </motion.button>
          </div>

          {record && (
            <div className="flex gap-2 pt-1">
              {[
                { label: "📜 History",  fn: fetchHistory },
                { label: "✅ Verify",   fn: fetchVerify  },
              ].map(({ label, fn }) => (
                <motion.button key={label} type="button" onClick={fn} disabled={loading}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "#b8aec8" }}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  {label}
                </motion.button>
              ))}
            </div>
          )}
        </form>

        {/* Results */}
        <AnimatePresence mode="wait">
          {record && (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.35, ease }}
              className="space-y-4">

              {/* Tab bar */}
              <div className="flex gap-2">
                {(["record", "history", "verify"] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className="text-xs px-3 py-1.5 rounded-full font-semibold capitalize transition-colors"
                    style={{
                      background: activeTab === tab ? "#F97316" : "rgba(255,255,255,0.07)",
                      color: activeTab === tab ? "#fff" : "#b8aec8",
                      border: activeTab === tab ? "1px solid #F97316" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Record tab */}
              {activeTab === "record" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="glass p-5 rounded-2xl space-y-4">
                  <p className="section-label">⛓️ Blockchain Record</p>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Complaint ID",   value: record.complaint_id },
                      { label: "Chain Synced",   value: record.chain_synced ? "✅ Yes" : "⏳ Pending" },
                      { label: "On-chain ID",    value: record.chain_id_on_contract ?? "—" },
                      { label: "NFT Minted",     value: record.nft_minted ? `✅ #${record.nft_token_id}` : "Not yet" },
                      { label: "CIVIC Tokens",   value: `${record.tokens_minted} CIVIC` },
                      { label: "Status",         value: record.db_record?.status },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-xl"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        <p className="text-[10px] text-[#b8aec8]">{label}</p>
                        <p className="text-sm font-bold text-[#f0ece8] capitalize">{String(value)}</p>
                      </div>
                    ))}
                  </div>

                  {record.chain_tx_hash && (
                    <div className="p-3 rounded-xl space-y-1"
                      style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                      <p className="text-[10px] text-[#b8aec8]">Transaction Hash</p>
                      <p className="text-xs font-mono text-[#4ade80] break-all">{record.chain_tx_hash}</p>
                      {record.explorer_url && (
                        <a href={record.explorer_url} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-[#4ade80] underline">
                          View on PolygonScan →
                        </a>
                      )}
                    </div>
                  )}

                  {record.chain_ipfs_hash && (
                    <div className="p-3 rounded-xl space-y-1"
                      style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
                      <p className="text-[10px] text-[#b8aec8]">IPFS Hash</p>
                      <p className="text-xs font-mono text-[#a78bfa] break-all">{record.chain_ipfs_hash}</p>
                      <a href={`https://ipfs.io/ipfs/${record.chain_ipfs_hash}`} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-[#a78bfa] underline">
                        View on IPFS →
                      </a>
                    </div>
                  )}

                  {record.chain_record && !record.chain_record.error && (
                    <div className="space-y-2">
                      <p className="section-label">📋 On-chain Data</p>
                      {[
                        ["Title",    record.chain_record.title],
                        ["Category", record.chain_record.category],
                        ["Status",   record.chain_record.status],
                        ["Filed by", record.chain_record.filed_by],
                        ["Block",    record.chain_record.block_number],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                          <span className="text-[11px] text-[#b8aec8]">{k}</span>
                          <span className="text-xs font-semibold text-[#f0ece8] font-mono truncate max-w-[200px]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* History tab */}
              {activeTab === "history" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="glass p-5 rounded-2xl space-y-3">
                  <p className="section-label">📜 Immutable Status History</p>
                  {history.length === 0 ? (
                    <p className="text-xs text-[#b8aec8]">
                      {record.chain_synced ? "No updates recorded on-chain yet" : "Complaint not yet filed on-chain"}
                    </p>
                  ) : history.map((u, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                      <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                        style={{ background: STATUS_COLORS[u.new_status] || "#b8aec8" }} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#f0ece8] capitalize">
                            {u.old_status} → {u.new_status}
                          </span>
                          <span className="text-[10px] text-[#b8aec8]">
                            {new Date(u.timestamp * 1000).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#b8aec8] mt-0.5 font-mono">
                          by {u.updated_by?.slice(0, 6)}…{u.updated_by?.slice(-4)}
                        </p>
                        <p className="text-[10px] text-[#4ade80] mt-0.5">⛓️ Blockchain verified</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Verify tab */}
              {activeTab === "verify" && verifyResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="glass p-5 rounded-2xl space-y-3">
                  <p className="section-label">✅ Data Integrity Verification</p>
                  <div className="p-4 rounded-2xl text-center"
                    style={{
                      background: verifyResult.verified === true ? "rgba(74,222,128,0.1)" : verifyResult.verified === false ? "rgba(224,80,80,0.1)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${verifyResult.verified === true ? "rgba(74,222,128,0.3)" : verifyResult.verified === false ? "rgba(224,80,80,0.3)" : "rgba(255,255,255,0.1)"}`,
                    }}>
                    <p className="text-2xl mb-2">
                      {verifyResult.verified === true ? "✅" : verifyResult.verified === false ? "❌" : "ℹ️"}
                    </p>
                    <p className="text-sm font-bold text-[#f0ece8]">{verifyResult.message}</p>
                    {verifyResult.reason && <p className="text-xs text-[#b8aec8] mt-1">{verifyResult.reason}</p>}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info cards */}
        {!record && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "🔒", title: "Immutable Records", desc: "Every complaint is hashed and stored on Polygon blockchain — no one can alter or delete it" },
              { icon: "🪙", title: "CIVIC Tokens", desc: "Citizens earn CIVIC tokens for filing complaints and participating in DAO governance" },
              { icon: "🏆", title: "NFT Certificates", desc: "Resolved complaints generate an ERC-721 NFT certificate as proof of resolution" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="glass-sm p-4 rounded-2xl space-y-2">
                <span className="text-2xl">{icon}</span>
                <p className="text-sm font-bold text-[#f0ece8]">{title}</p>
                <p className="text-xs text-[#b8aec8] leading-relaxed">{desc}</p>
              </div>
            ))}
          </motion.div>
        )}

      </motion.div>
    </div>
  );
};

export default BlockchainExplorer;

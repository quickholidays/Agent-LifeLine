"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const GLOBAL_STYLES = `
  @keyframes fadeSlideIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  @keyframes popIn { 0%{opacity:0;transform:scale(0.85)} 70%{transform:scale(1.03)} 100%{opacity:1;transform:scale(1)} }
  @keyframes glowPulse { 0%,100%{box-shadow:0 0 6px rgba(99,102,241,0.3)} 50%{box-shadow:0 0 20px rgba(99,102,241,0.75)} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  @keyframes typingDot { 0%,80%,100%{transform:scale(0.8);opacity:0.3} 40%{transform:scale(1.2);opacity:1} }

  .ghl-btn { transition: all 0.22s cubic-bezier(.4,0,.2,1) !important; }
  .ghl-btn:hover { transform: translateY(-2px) !important; filter: brightness(1.18) !important; }
  .ghl-btn:active { transform: scale(0.97) !important; }
  .ghl-btn:disabled { opacity: 0.45 !important; cursor: not-allowed !important; transform: none !important; }

  .btn-today:hover  { background: rgba(99,102,241,0.28) !important; box-shadow: 0 6px 24px rgba(99,102,241,0.35) !important; }
  .btn-info:hover   { background: rgba(14,165,233,0.22) !important; box-shadow: 0 4px 16px rgba(14,165,233,0.35) !important; border-color: #38bdf8 !important; }
  .btn-purple:hover { background: rgba(139,92,246,0.22) !important; box-shadow: 0 4px 16px rgba(139,92,246,0.4) !important; border-color: #a78bfa !important; }
  .btn-green:hover  { background: rgba(16,185,129,0.22) !important; box-shadow: 0 4px 16px rgba(16,185,129,0.35) !important; border-color: #34d399 !important; }
  .btn-amber:hover  { background: rgba(245,158,11,0.22) !important; box-shadow: 0 4px 16px rgba(245,158,11,0.35) !important; border-color: #fbbf24 !important; }
  .btn-gold:hover   { background: rgba(251,191,36,0.22) !important; box-shadow: 0 4px 16px rgba(251,191,36,0.35) !important; border-color: #fde68a !important; }
  .btn-red:hover    { background: rgba(239,68,68,0.22) !important; box-shadow: 0 4px 16px rgba(239,68,68,0.35) !important; border-color: #f87171 !important; }
  .btn-pink:hover   { background: rgba(236,72,153,0.22) !important; box-shadow: 0 4px 16px rgba(236,72,153,0.35) !important; border-color: #f472b6 !important; }

  .msg-inbound  { border-left: 3px solid #22c55e; }
  .msg-outbound { border-left: 3px solid #818cf8; }
  .msg-activity { border-left: 3px solid #f59e0b; }

  .conv-card { animation: fadeSlideIn 0.35s ease forwards; transition: box-shadow 0.2s, transform 0.2s !important; }
  .conv-card:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 30px rgba(0,0,0,0.28) !important; }

  .ghl-input:focus { outline: none !important; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.2) !important; }

  .loading-bar { height: 3px; background: #6366f1; border-radius: 2px; }
`;

// ── Helpers ──────────────────────────────────────────────────────────────────
function toBST(ms) {
  if (!ms) return "—";
  const d = new Date(typeof ms === "string" ? ms : Number(ms));
  const h = String(d.getUTCHours() + 1).padStart(2, "0");
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatsBadge({ label, value, r, g, b }) {
  return (
    <div style={{ flex: 1, background: `rgba(${r},${g},${b},0.1)`, border: `1px solid rgba(${r},${g},${b},0.25)`, borderRadius: "10px", padding: "0.7rem 0.9rem", textAlign: "center", animation: "popIn 0.4s ease both" }}>
      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: `rgb(${r},${g},${b})` }}>{value}</div>
      <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", fontWeight: 600, marginTop: "2px" }}>{label}</div>
    </div>
  );
}

function MsgBubble({ msg, index }) {
  const isAct = (msg.type || "").includes("ACTIVITY");
  const cls = isAct ? "msg-activity" : msg.direction === "inbound" ? "msg-inbound" : "msg-outbound";
  const bg = isAct ? "rgba(245,158,11,0.06)" : msg.direction === "inbound" ? "rgba(34,197,94,0.06)" : "rgba(99,102,241,0.06)";
  const clr = isAct ? "#f59e0b" : msg.direction === "inbound" ? "#22c55e" : "#818cf8";
  const icon = isAct ? "⚙️" : msg.direction === "inbound" ? "👤" : "🤖";
  return (
    <div className={cls} style={{ background: bg, borderRadius: "0 8px 8px 0", padding: "0.45rem 0.7rem", marginBottom: "0.32rem", display: "flex", gap: "0.55rem", alignItems: "flex-start", animation: `fadeSlideIn 0.25s ease ${index * 35}ms both` }}>
      <span style={{ fontSize: "0.67rem", color: clr, fontWeight: 700, minWidth: "42px", paddingTop: "2px" }}>{msg.timeBST || "—"}</span>
      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", minWidth: "56px", paddingTop: "2px", fontWeight: 600 }}>{icon} {isAct ? "event" : msg.direction}</span>
      <span style={{ fontSize: "0.78rem", color: "var(--text-primary)", flex: 1, lineHeight: 1.45 }}>{msg.body || "[No text]"}</span>
    </div>
  );
}

function ConvCard({ conv, index }) {
  const [open, setOpen] = useState(false);
  const hue = ((conv.fullName || "A").charCodeAt(0) * 7) % 360;
  return (
    <div className="conv-card" onClick={() => setOpen(v => !v)} style={{ opacity: 0, animationDelay: `${index * 55}ms`, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "0.9rem 1.15rem", marginBottom: "0.65rem", cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: `hsl(${hue},62%,52%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.95rem", color: "#fff", flexShrink: 0 }}>
          {(conv.fullName || "?")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{conv.fullName || "Unknown"}</span>
            {conv.lastActivityBST && (
              <span style={{ fontSize: "0.69rem", color: "var(--text-secondary)", whiteSpace: "nowrap", background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: "99px" }}>{conv.lastActivityBST} BST</span>
            )}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px", display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
            {conv.phone && <span>📞 {conv.phone}</span>}
            {(conv.agentName || conv.assignedTo) && <span style={{ color: "#a78bfa" }}>👤 {conv.agentName || conv.assignedTo}</span>}
            <span style={{ color: "#6ee7b7" }}>💬 {conv.totalMessages ?? conv.messagesCount ?? 0}</span>
          </div>
          {conv.lastMessage && (
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.68 }}>
              &ldquo;{conv.lastMessage}&rdquo;
            </div>
          )}
        </div>
        <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}>▼</span>
      </div>

      {open && (
        <div style={{ marginTop: "0.78rem", paddingTop: "0.78rem", borderTop: "1px solid var(--card-border)", animation: "fadeSlideIn 0.22s ease" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.45rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Message History ({conv.messages?.length || 0} messages)
          </div>
          {conv.messages && conv.messages.length > 0
            ? conv.messages.map((m, i) => <MsgBubble key={m.id || i} msg={m} index={i} />)
            : <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", textAlign: "center", fontStyle: "italic", padding: "0.5rem 0" }}>No messages loaded</div>
          }
        </div>
      )}
    </div>
  );
}

function OutputRenderer({ data }) {
  if (!data) return null;

  // Today BST view
  if (data.totalTodayConversations !== undefined || (data.conversations && data.conversations[0]?.lastActivityBST)) {
    return (
      <div style={{ animation: "fadeSlideIn 0.35s ease" }}>
        <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <StatsBadge label="Total Today" value={data.totalTodayConversations ?? data.conversations?.length} r={99} g={102} b={241} />
          <StatsBadge label="Showing" value={data.conversations?.length ?? 0} r={14} g={165} b={233} />
          <StatsBadge label="Date" value={data.date || "Today BST"} r={16} g={185} b={129} />
        </div>
        {(data.conversations || []).map((c, i) => <ConvCard key={c.conversationId || i} conv={c} index={i} />)}
      </div>
    );
  }

  // Search / deep fetch
  if (data.matches || (data.results && data.results[0]?.conversations)) {
    const items = data.matches || (data.results || []).flatMap(r => (r.conversations || []).map(c => ({ ...c, fullName: r.fullName, phone: r.phone })));
    return (
      <div style={{ animation: "fadeSlideIn 0.35s ease" }}>
        <div style={{ display: "flex", gap: "0.65rem", marginBottom: "1rem" }}>
          <StatsBadge label="Matches" value={data.totalMatchesFound ?? data.contactsFound ?? items.length} r={139} g={92} b={246} />
          <StatsBadge label="Query" value={data.searchQuery || "—"} r={14} g={165} b={233} />
        </div>
        {items.map((c, i) => <ConvCard key={c.conversationId || i} conv={c} index={i} />)}
      </div>
    );
  }

  // Users list
  if (data.users) {
    return (
      <div style={{ animation: "fadeSlideIn 0.35s ease" }}>
        <div style={{ marginBottom: "1rem" }}>
          <StatsBadge label="Total Agents" value={data.users.length} r={139} g={92} b={246} />
        </div>
        {data.users.map((u, i) => {
          const name = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim();
          const hue = ((name.charCodeAt(0) || 65) * 9) % 360;
          return (
            <div key={u.id} className="conv-card" style={{ opacity: 0, animationDelay: `${i * 45}ms`, background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "12px", padding: "0.8rem 1.1rem", marginBottom: "0.55rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `hsl(${hue},62%,52%)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "0.88rem", flexShrink: 0 }}>
                {(name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "var(--text-primary)" }}>{name}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{u.email}{u.role ? ` · ${u.role}` : ""}</div>
              </div>
              <span style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "#6366f1", background: "rgba(99,102,241,0.08)", padding: "2px 7px", borderRadius: "6px" }}>{(u.id || "").slice(0, 10)}…</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback JSON
  return (
    <pre style={{ margin: 0, padding: "1rem", borderRadius: "10px", background: "#0a0f1e", color: "#7dd3fc", overflow: "auto", maxHeight: "560px", border: "1px solid rgba(99,102,241,0.15)", animation: "fadeIn 0.3s ease", fontFamily: "'Consolas','Monaco',monospace", fontSize: "0.77rem", lineHeight: 1.55 }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GHLTestPage() {
  const [token, setToken] = useState("pit-e77e6c88-2517-4053-96cd-6be512e3b847");
  const [locationId, setLocationId] = useState("");
  const [responseOutput, setResponseOutput] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [endpointCalled, setEndpointCalled] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [searchName, setSearchName] = useState("Iqbal Hossen");
  const [convId, setConvId] = useState("gCr3FJTylSWPTvuQjR6V");
  const [loadingStep, setLoadingStep] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setLocationId(localStorage.getItem("ghl_test_location") || "");
  }, []);

  const ghlFetch = async (endpoint, params = {}) => {
    const res = await fetch("/api/ghl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint, token, params }) });
    return res.json();
  };

  const getMsgs = async (convId) => {
    const md = await ghlFetch(`/conversations/${convId}/messages`, { limit: 100 });
    const raw = (md.messages && md.messages.messages) ? md.messages.messages : (Array.isArray(md.messages) ? md.messages : []);
    return raw.filter(m => m.messageType !== "TYPE_ACTIVITY_OPPORTUNITY")
      .sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded))
      .map(m => ({ id: m.id, timeBST: toBST(m.dateAdded), direction: m.direction, type: m.messageType || m.type, body: m.body || "[Media/Attachment]", callDetails: m.call || undefined }));
  };

  const run = (label, fn) => {
    setIsLoading(true); setErrorMsg(""); setResponseOutput(null); setEndpointCalled(label); setLoadingStep("Connecting…");
    localStorage.setItem("ghl_test_location", locationId);
    fn().catch(err => setErrorMsg(err.message || "Error")).finally(() => { setIsLoading(false); setLoadingStep(""); });
  };

  const handleCopy = () => { if (!responseOutput) return; navigator.clipboard.writeText(JSON.stringify(responseOutput, null, 2)); setCopied(true); setTimeout(() => setCopied(false), 2200); };

  // Button style factory
  const B = (cls, bg, border, color) => ({
    className: `ghl-btn ${cls}`,
    style: { width: "100%", padding: "0.65rem 1rem", background: bg, border: `1.5px solid ${border}`, color, fontWeight: 700, borderRadius: "10px", cursor: "pointer", fontSize: "0.82rem", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }
  });

  return (
    <>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ maxWidth: "1300px", margin: "0 auto", padding: "2rem 1.5rem", fontFamily: "'Outfit','Inter',sans-serif" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", animation: "fadeSlideIn 0.5s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ width: 44, height: 44, borderRadius: "13px", backgroundColor: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem", animation: "glowPulse 2.5s ease infinite" }}>🛰</div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 900, background: "linear-gradient(90deg,#6366f1,#38bdf8,#22c55e)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundSize: "200% 100%", animation: "gradientShift 4s linear infinite" }}>
                GHL API Sandbox
              </h1>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-secondary)" }}>Live API testing · Real-time conversation explorer</p>
            </div>
          </div>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.3)", padding: "0.5rem 1rem", borderRadius: "10px", textDecoration: "none", color: "var(--text-primary)", fontWeight: 700, fontSize: "0.81rem" }}>
            ← Dashboard
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "390px 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Left Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", animation: "fadeSlideIn 0.5s ease 0.1s both", opacity: 0 }}>

            {/* Credentials */}
            <div className="card" style={{ padding: "1.2rem" }}>
              <h3 style={{ margin: "0 0 0.9rem 0", fontSize: "0.73rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", fontWeight: 800 }}>🔑 Credentials</h3>
              {[
                { label: "Access Token", val: token, set: setToken, mono: true, ph: "pit-xxxx" },
                { label: "Location ID", val: locationId, set: setLocationId, mono: true, ph: "GHL Location ID (required)" },
                { label: "Search Contact Name", val: searchName, set: setSearchName, mono: false, ph: "e.g. Iqbal Hossen" },
                { label: "Conversation ID (Direct Fetch)", val: convId, set: setConvId, mono: true, ph: "e.g. gCr3FJTylSW…" }
              ].map(({ label, val, set, mono, ph }) => (
                <div key={label} style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "3px" }}>{label}</label>
                  <input className="ghl-input" type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{ width: "100%", padding: "0.48rem 0.7rem", borderRadius: "8px", background: "var(--input-bg)", border: "1.5px solid var(--input-border)", color: "var(--text-primary)", fontSize: mono ? "0.73rem" : "0.81rem", fontFamily: mono ? "monospace" : "inherit", boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s" }} />
                </div>
              ))}
            </div>

            {/* Buttons */}
            <div className="card" style={{ padding: "1.2rem" }}>
              <h3 style={{ margin: "0 0 0.9rem 0", fontSize: "0.73rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", fontWeight: 800 }}>⚡ Test Endpoints</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>

                {/* Today BST hero button */}
                <button className="ghl-btn btn-today" disabled={isLoading || !locationId}
                  style={{ width: "100%", padding: "0.78rem 1rem", backgroundColor: "rgba(99,102,241,0.12)", border: "2px solid #6366f1", color: "#a5b4fc", fontWeight: 800, borderRadius: "10px", cursor: "pointer", fontSize: "0.85rem", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  onClick={() => run("TODAY — BST Conversations", async () => {
                    const nowUTC = new Date();
                    const bstMidnightMs = Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate()) - 3600000;
                    const bstLabel = nowUTC.toISOString().slice(0, 10) + " (BST)";
                    setLoadingStep("Resolving agent names…");
                    const ud = await ghlFetch("/users/", { locationId });
                    const agentMap = {}; (ud.users || []).forEach(u => { agentMap[u.id] = u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim(); });
                    setLoadingStep("Fetching today's conversations…");
                    const cd = await ghlFetch("/conversations/search", { locationId, limit: 100, status: "all", sortBy: "last_message_date", sort: "desc" });
                    if (cd.error) throw new Error(cd.error);
                    const todayConvs = (cd.conversations || []).filter(c => { const lmd = typeof c.lastMessageDate === "number" ? c.lastMessageDate : parseInt(c.lastMessageDate, 10); return lmd >= bstMidnightMs; });
                    const results = [];
                    for (let i = 0; i < Math.min(10, todayConvs.length); i++) {
                      const c = todayConvs[i];
                      setLoadingStep(`Fetching messages ${i + 1}/${Math.min(10, todayConvs.length)} — ${c.fullName || "contact"}…`);
                      const messages = await getMsgs(c.id);
                      results.push({ rank: i + 1, conversationId: c.id, lastActivityBST: toBST(c.lastMessageDate), fullName: c.fullName || "Unknown", phone: c.phone || "N/A", agentName: agentMap[c.assignedTo] || c.assignedTo || "Unassigned", channelType: c.type, lastMessage: c.lastMessageBody || "[No text]", totalMessages: messages.length, messages });
                    }
                    setResponseOutput({ date: bstLabel, totalTodayConversations: todayConvs.length, showing: `Top ${results.length}`, conversations: results });
                  })}>
                  <span>🗓 Today&apos;s Conversations (BST)</span>
                  <i className="fa-solid fa-calendar-day"></i>
                </button>

                <button {...B("btn-info", "rgba(14,165,233,0.08)", "#0ea5e9", "#38bdf8")} disabled={isLoading || !locationId}
                  onClick={() => run(`GET /locations/${locationId}`, async () => { const d = await ghlFetch(`/locations/${locationId}`); if (d.error) throw new Error(d.error); setResponseOutput(d); })}>
                  <span>1. Location Details</span><i className="fa-solid fa-circle-nodes"></i>
                </button>

                <button {...B("btn-purple", "rgba(139,92,246,0.08)", "#8b5cf6", "#a78bfa")} disabled={isLoading || !locationId}
                  onClick={() => run("GET /users/", async () => { const d = await ghlFetch("/users/", { locationId }); if (d.error) throw new Error(d.error); setResponseOutput(d); })}>
                  <span>2. Pull Agents / Users</span><i className="fa-solid fa-users"></i>
                </button>

                <button {...B("btn-green", "rgba(16,185,129,0.08)", "#10b981", "#34d399")} disabled={isLoading || !locationId}
                  onClick={() => run("PULL CONVERSATIONS + CALL LOGS", async () => {
                    setLoadingStep("Fetching conversations…");
                    const cd = await ghlFetch("/conversations/search", { locationId, limit: 100, status: "all" });
                    if (cd.error) throw new Error(cd.error);
                    const result = []; let fetched = 0;
                    for (const c of (cd.conversations || [])) {
                      const isCall = c.lastMessageType === "TYPE_CALL";
                      let callLogs = [];
                      if (isCall || fetched < 15) {
                        if (!isCall) fetched++;
                        const md = await ghlFetch(`/conversations/${c.id}/messages`, { limit: 50 });
                        const msgs = (md.messages && md.messages.messages) ? md.messages.messages : (Array.isArray(md.messages) ? md.messages : []);
                        msgs.filter(m => m.messageType === "TYPE_CALL" || m.type === 6).forEach(m => { const d2 = m.call || {}; const ds = parseInt(d2.duration, 10); const f = `${isNaN(ds) ? "00" : String(Math.floor(ds / 60)).padStart(2, "0")}:${isNaN(ds) ? "00" : String(ds % 60).padStart(2, "0")}`; callLogs.push({ messageId: m.id, direction: m.direction, dateAdded: m.dateAdded, status: d2.status || "Answered", duration: f, recordingUrl: d2.recordingUrl || null }); });
                      }
                      result.push({ conversationId: c.id, fullName: c.fullName || "Contact", phone: c.phone || "N/A", channelType: c.type, lastActivity: c.lastMessageBody || "[No activity]", callLogsCount: callLogs.length, callLogs: callLogs.length > 0 ? callLogs : undefined });
                    }
                    setResponseOutput({ conversationsCount: result.length, conversations: result });
                  })}>
                  <span>3. Pull Conversations (100)</span><i className="fa-solid fa-comments"></i>
                </button>

                <button {...B("btn-amber", "rgba(245,158,11,0.08)", "#f59e0b", "#fbbf24")} disabled={isLoading || !locationId}
                  onClick={() => run("PULL CALL LOGS", async () => {
                    setLoadingStep("Fetching conversations…");
                    const cd = await ghlFetch("/conversations/search", { locationId, limit: 15, status: "all" });
                    if (cd.error) throw new Error(cd.error);
                    const callLogs = [];
                    for (const c of (cd.conversations || [])) {
                      setLoadingStep(`Scanning ${c.fullName || "contact"}…`);
                      const md = await ghlFetch(`/conversations/${c.id}/messages`, { limit: 50 });
                      const msgs = (md.messages && md.messages.messages) ? md.messages.messages : (Array.isArray(md.messages) ? md.messages : []);
                      msgs.filter(m => m.messageType === "TYPE_CALL" || m.type === 6).forEach(m => { callLogs.push({ contactName: c.fullName || "Contact", contactPhone: c.phone || "N/A", messageId: m.id, direction: m.direction, dateAdded: m.dateAdded, callDetails: m.call || { duration: m.duration || "N/A", status: m.status || "N/A", recordingUrl: m.recordingUrl || null } }); });
                    }
                    setResponseOutput({ totalStandardCallsFound: callLogs.length, callLogs });
                  })}>
                  <span>4. Pull Call Messages</span><i className="fa-solid fa-phone"></i>
                </button>

                <button {...B("btn-pink", "rgba(236,72,153,0.08)", "#ec4899", "#f472b6")} disabled={isLoading || !locationId}
                  onClick={() => run("SCAN FB/IG THREADS", async () => {
                    let scanned = 0, found = [], hasMore = true, page = 0;
                    while (hasMore) {
                      page++; setLoadingStep(`Scanning page ${page}… (${scanned} checked, ${found.length} FB/IG found)`);
                      const cd = await ghlFetch("/conversations/search", { locationId, limit: 100, status: "all" });
                      if (cd.error) throw new Error(cd.error);
                      if (!cd.conversations || !cd.conversations.length) break;
                      scanned += cd.conversations.length;
                      const matches = cd.conversations.filter(c => c.type === "TYPE_FB_MESSENGER" || c.type === "TYPE_IG_DIRECT" || c.lastMessageType === "TYPE_FB_MESSENGER" || c.lastMessageType === "TYPE_IG_DIRECT");
                      for (const c of matches) {
                        const md = await ghlFetch(`/conversations/${c.id}/messages`, { limit: 30 });
                        const msgs = (md.messages && md.messages.messages) ? md.messages.messages : (Array.isArray(md.messages) ? md.messages : []);
                        found.push({ conversationId: c.id, fullName: c.fullName || "Contact", channelType: c.type, lastMessage: c.lastMessageBody, messages: msgs.map(m => ({ id: m.id, body: m.body || "[Media]", direction: m.direction, dateAdded: m.dateAdded })) });
                      }
                      if (cd.conversations.length < 100) hasMore = false;
                    }
                    setResponseOutput({ status: "Scan Complete", totalConversationsScanned: scanned, totalFbIgThreadsFound: found.length, threads: found });
                  })}>
                  <span>5. Scan FB &amp; IG Threads</span><i className="fa-brands fa-instagram"></i>
                </button>

                <button {...B("btn-green", "rgba(16,185,129,0.08)", "#10b981", "#34d399")} disabled={isLoading || !locationId || !searchName}
                  onClick={() => run(`SEARCH: ${searchName}`, async () => {
                    setLoadingStep("Searching…");
                    const cd = await ghlFetch("/conversations/search", { locationId, query: searchName, limit: 100, status: "all" });
                    if (cd.error) throw new Error(cd.error);
                    const results = [];
                    for (const c of (cd.conversations || [])) {
                      setLoadingStep(`Fetching messages for ${c.fullName || "contact"}…`);
                      const messages = await getMsgs(c.id);
                      results.push({ conversationId: c.id, fullName: c.fullName || "Contact", phone: c.phone || "N/A", email: c.email || "N/A", channelType: c.type, lastMessage: c.lastMessageBody || "[No text]", totalMessages: messages.length, messages });
                    }
                    if (!results.length) throw new Error(`No conversations found for: "${searchName}"`);
                    setResponseOutput({ searchQuery: searchName, totalMatchesFound: results.length, matches: results });
                  })}>
                  <span>6. Search Contact Convos</span><i className="fa-solid fa-magnifying-glass"></i>
                </button>

                <button {...B("btn-gold", "rgba(251,191,36,0.08)", "#f59e0b", "#fbbf24")} disabled={isLoading || !locationId || !searchName}
                  onClick={() => run(`DEEP FETCH: ${searchName}`, async () => {
                    setLoadingStep("Searching contacts…");
                    const contactData = await ghlFetch("/contacts/", { locationId, query: searchName, limit: 20 });
                    if (contactData.error) throw new Error(contactData.error);
                    const contacts = contactData.contacts || [];
                    if (!contacts.length) throw new Error(`No contacts found for "${searchName}"`);
                    const allResults = [];
                    for (const contact of contacts) {
                      setLoadingStep(`Found ${contact.firstName} — fetching conversations…`);
                      const cd = await ghlFetch("/conversations/search", { locationId, contactId: contact.id, limit: 20 });
                      const conversations = [];
                      for (const c of (cd.conversations || [])) {
                        setLoadingStep(`Fetching messages for conv ${c.id.slice(0, 8)}…`);
                        const messages = await getMsgs(c.id);
                        conversations.push({ conversationId: c.id, channelType: c.type, lastMessage: c.lastMessageBody, totalMessages: messages.length, messages });
                      }
                      allResults.push({ contactId: contact.id, fullName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(), email: contact.email, phone: contact.phone, totalConversations: conversations.length, conversations });
                    }
                    setResponseOutput({ searchQuery: searchName, contactsFound: allResults.length, results: allResults });
                  })}>
                  <span>7. Deep Fetch via Contacts ✨</span><i className="fa-solid fa-address-book"></i>
                </button>

                <button {...B("btn-red", "rgba(239,68,68,0.08)", "#ef4444", "#f87171")} disabled={isLoading || !convId}
                  onClick={() => run(`MSG: ${convId}`, async () => {
                    setLoadingStep("Fetching messages…");
                    const md = await ghlFetch(`/conversations/${convId}/messages`, { limit: 100 });
                    if (md.error) throw new Error(md.error);
                    setResponseOutput({ conversationId: convId, raw: md });
                  })}>
                  <span>8. Raw Messages by Conv ID</span><i className="fa-solid fa-envelope-open-text"></i>
                </button>

              </div>
            </div>

            <div className="card" style={{ padding: "0.85rem 1rem", background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.15)", animation: "fadeSlideIn 0.5s ease 0.3s both", opacity: 0 }}>
              <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                🛡 <strong style={{ color: "#34d399" }}>$0.00 API Cost</strong> — Read-only calls are free on GHL.
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="card" style={{ padding: "1.5rem", minHeight: "600px", display: "flex", flexDirection: "column", animation: "fadeSlideIn 0.5s ease 0.15s both", opacity: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid var(--card-border)" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-secondary)", fontWeight: 800 }}>Response Output Console</h3>
                {endpointCalled && <div style={{ marginTop: "4px", fontSize: "0.73rem", fontFamily: "monospace", color: "#818cf8", animation: "fadeSlideIn 0.3s ease" }}>↗ {endpointCalled}</div>}
              </div>
              {responseOutput && (
                <button onClick={handleCopy} style={{ padding: "0.32rem 0.75rem", border: "1px solid var(--card-border)", borderRadius: "8px", background: copied ? "rgba(16,185,129,0.15)" : "rgba(0,0,0,0.04)", fontSize: "0.73rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", color: copied ? "#34d399" : "var(--text-primary)", transition: "all 0.2s" }}>
                  {copied ? "✅ Copied!" : "📋 Copy JSON"}
                </button>
              )}
            </div>

            {isLoading && <div className="loading-bar" style={{ marginBottom: "1rem" }} />}

            <div style={{ flex: 1, overflow: "auto" }}>
              {isLoading ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1.5rem" }}>
                  <div style={{ width: 52, height: 52, border: "4px solid rgba(99,102,241,0.2)", borderTop: "4px solid #6366f1", borderRadius: "50%", animation: "spin 0.85s linear infinite" }} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.3rem" }}>Connecting to GoHighLevel…</div>
                    {loadingStep && (
                      <div style={{ fontSize: "0.78rem", color: "#818cf8", animation: "fadeIn 0.3s ease", display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "center" }}>
                        <span style={{ display: "inline-flex", gap: "3px" }}>
                          {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#6366f1", animation: `typingDot 1.2s ${i * 0.2}s ease infinite`, display: "inline-block" }} />)}
                        </span>
                        {loadingStep}
                      </div>
                    )}
                  </div>
                </div>
              ) : errorMsg ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem", padding: "2rem", textAlign: "center", animation: "popIn 0.3s ease" }}>
                  <div style={{ fontSize: "3rem", animation: "pulse 2s ease infinite" }}>⚠️</div>
                  <h4 style={{ margin: 0, color: "#f87171" }}>API Error</h4>
                  <div style={{ fontSize: "0.8rem", color: "#fca5a5", background: "rgba(239,68,68,0.08)", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid rgba(239,68,68,0.2)", fontFamily: "monospace", maxWidth: "480px", lineHeight: 1.5 }}>{errorMsg}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", maxWidth: "360px" }}>Check your Location ID, token scopes (conversations, users, contacts), and that the key is not expired.</div>
                </div>
              ) : responseOutput ? (
                <OutputRenderer data={responseOutput} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.75rem", color: "var(--text-secondary)", textAlign: "center", animation: "fadeIn 0.5s ease" }}>
                  <div style={{ fontSize: "3.5rem", opacity: 0.12 }}>🛰</div>
                  <h4 style={{ margin: 0, opacity: 0.45 }}>Console Idle</h4>
                  <p style={{ margin: 0, fontSize: "0.78rem", maxWidth: "280px", opacity: 0.35 }}>Enter your Location ID and click any endpoint button to fire a live API call.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

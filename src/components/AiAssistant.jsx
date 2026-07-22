"use client";

import React, { useState, useEffect, useRef } from "react";

export default function AiAssistant({
  agents = [],
  bstCallsList = [],
  bstUpdatesList = [],
  ghlMessages = [],
  reportDate = "",
  userRole = ""
}) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello. I am your **Operations AI Assistant**. I have parsed today's performance metrics, note audit logs, and phone calls. Ask me any operations queries like:\n\n* *'Who is the top performing agent today?'*\n* *'What was the longest phone call duration?'*\n* *'Which agents made 0 calls today?'*\n* *'Show me a breakdown of interested leads by agent.'*"
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [outOfContextCount, setOutOfContextCount] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [unresolvedList, setUnresolvedList] = useState([]);
  
  const threadEndRef = useRef(null);

  // Initialize and check context rules lockouts
  useEffect(() => {
    const cachedCount = parseInt(localStorage.getItem("ai_out_of_context_count") || "0", 10);
    const lockedTime = localStorage.getItem("ai_lockout_until");

    if (lockedTime) {
      const lockTimestamp = parseInt(lockedTime, 10);
      if (Date.now() < lockTimestamp) {
        setIsLocked(true);
      } else {
        localStorage.removeItem("ai_lockout_until");
        localStorage.setItem("ai_out_of_context_count", "0");
        setOutOfContextCount(0);
        setIsLocked(false);
      }
    } else {
      setOutOfContextCount(cachedCount);
    }

    // Fetch unresolved queries list if special user
    if (userRole === "special") {
      fetchUnresolvedQueries();
    }
  }, [userRole]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const fetchUnresolvedQueries = async () => {
    try {
      const res = await fetch("/api/unresolved");
      if (res.ok) {
        const data = await res.json();
        setUnresolvedList(data);
      }
    } catch (e) {
      console.error("Failed to load unresolved queries:", e);
    }
  };

  const handleSuggestClick = (suggestion) => {
    if (isLocked || isLoading) return;
    setInputText(suggestion);
  };

  const parseInlineStyles = (txt) => {
    if (!txt) return "";
    let formatted = txt;
    
    // Bold replacement (**text** or __text__)
    formatted = formatted.replace(/\*\?(.*?)\*\?/g, "<strong>$1</strong>"); // fallback
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/__(.*?)__/g, "<strong>$1</strong>");
    
    // Italic replacement (*text* or _text_)
    formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");
    formatted = formatted.replace(/_(.*?)_/g, "<em>$1</em>");

    // Inline code replacement (`code`)
    formatted = formatted.replace(/`(.*?)`/g, "<code style='background: rgba(255,255,255,0.08); padding: 0.1rem 0.3rem; borderRadius: 4px; font-family: monospace;'>$1</code>");

    return formatted;
  };

  const formatText = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    
    return lines.map((line, idx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={idx} style={{ height: "0.5rem" }} />;

      // 1. Headers (###, ##, #)
      if (trimmed.startsWith("###")) {
        const headerText = trimmed.replace(/^###\s*/, "");
        return <h4 key={idx} style={{ margin: "0.75rem 0 0.35rem 0", fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }} dangerouslySetInnerHTML={{ __html: parseInlineStyles(headerText) }} />;
      }
      if (trimmed.startsWith("##")) {
        const headerText = trimmed.replace(/^##\s*/, "");
        return <h3 key={idx} style={{ margin: "1rem 0 0.5rem 0", fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }} dangerouslySetInnerHTML={{ __html: parseInlineStyles(headerText) }} />;
      }
      if (trimmed.startsWith("#")) {
        const headerText = trimmed.replace(/^#\s*/, "");
        return <h2 key={idx} style={{ margin: "1.25rem 0 0.75rem 0", fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)" }} dangerouslySetInnerHTML={{ __html: parseInlineStyles(headerText) }} />;
      }

      // 2. Unordered lists (* or -)
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const listText = trimmed.replace(/^[\*\-]\s*/, "");
        return (
          <li key={idx} style={{ marginLeft: "1.2rem", marginBottom: "0.25rem", listStyleType: "disc" }}>
            <span dangerouslySetInnerHTML={{ __html: parseInlineStyles(listText) }} />
          </li>
        );
      }

      // 3. Tables (| cell | cell |)
      if (trimmed.startsWith("|")) {
        const cells = trimmed.split("|").map(c => c.trim()).filter(c => c !== "");
        if (cells.length > 0) {
          if (cells.every(c => c.match(/^[\s\-.:]+$/))) return null;
          return (
            <div key={idx} style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0.35rem 0", fontSize: "0.8rem", width: "100%" }}>
              {cells.map((cell, cIdx) => (
                <div key={cIdx} style={{ flex: 1, fontWeight: trimmed.includes("Agent") || trimmed.includes("Metric") ? 700 : 400 }} dangerouslySetInnerHTML={{ __html: parseInlineStyles(cell) }} />
              ))}
            </div>
          );
        }
      }

      // 4. Standard text paragraph
      return (
        <p key={idx} style={{ margin: "0 0 0.5rem 0", lineHeight: "1.45" }} dangerouslySetInnerHTML={{ __html: parseInlineStyles(trimmed) }} />
      );
    });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading || isLocked) return;

    const userMessage = { role: "user", content: inputText };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    setIsLoading(true);

    // Build today's structured database context payload
    const contextData = {
      reportDate,
      totalAgents: agents.length,
      agentsList: agents.map(a => ({
        name: a.name,
        margin_added_today: a.margin_added_today || 0,
        converted_today: a.converted_today || 0,
        call_metrics: {
          outboundCount: a.call_metrics?.outboundCount || 0,
          outboundAttended: a.call_metrics?.outboundAttended || 0,
          outboundMissed: a.call_metrics?.outboundMissed || 0,
          outboundMinutes: a.call_metrics?.outboundMinutes || 0,
          outboundAvgDuration: a.call_metrics?.outboundAvgDuration || 0,
          inboundCount: a.call_metrics?.inboundCount || 0,
          inboundAttended: a.call_metrics?.inboundAttended || 0,
          inboundMissed: a.call_metrics?.inboundMissed || 0,
          inboundMinutes: a.call_metrics?.inboundMinutes || 0,
          inboundAvgDuration: a.call_metrics?.inboundAvgDuration || 0
        },
        notes_count: a.notes_count || 0,
        stage_interested_today: a.stage_interested_today || 0,
        stage_contacted_today: a.stage_contacted_today || 0,
        general_conv_rate: a.today_conv_rate || 0
      })),
      recentCalls: bstCallsList.slice(0, 35).map(c => ({
        agent: c.agent,
        time: c.time,
        status: c.status,
        duration: c.duration,
        direction: c.direction,
        contactName: c.contactName
      })),
      recentGhlUpdates: bstUpdatesList.slice(0, 35).map(u => ({
        agent: u.agent,
        time: u.time,
        module: u.module,
        action: u.action,
        label: u.label
      }))
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          contextData
        })
      });

      if (!res.ok) throw new Error("Failed to contact query assistant API");

      const data = await res.json();
      const rawResponse = data.choices?.[0]?.message?.content || "I am unable to process your request.";
      
      let finalContent = rawResponse;
      let wasOutOfContext = false;
      let wasUnresolved = false;

      // Handle lock routing flags
      if (rawResponse.startsWith("[OUT_OF_CONTEXT]")) {
        wasOutOfContext = true;
        finalContent = rawResponse.replace("[OUT_OF_CONTEXT]", "").trim();
      } else if (rawResponse.startsWith("[UNRESOLVED_DATA]")) {
        wasUnresolved = true;
        finalContent = rawResponse.replace("[UNRESOLVED_DATA]", "").trim();
      }

      console.log("AI Operations Assistant Response:\n", finalContent);
      setMessages(prev => [...prev, { role: "assistant", content: finalContent }]);

      if (wasOutOfContext) {
        const nextCount = outOfContextCount + 1;
        setOutOfContextCount(nextCount);
        localStorage.setItem("ai_out_of_context_count", nextCount.toString());

        if (nextCount >= 3) {
          // Lock for the day (ends at 11:59:59 PM today)
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);
          const lockoutTimestamp = endOfDay.getTime();
          
          localStorage.setItem("ai_lockout_until", lockoutTimestamp.toString());
          setTimeout(() => {
            setIsLocked(true);
          }, 3000); // Give 3s to read the final warning message
        }
      }

      // If unresolved queries logged, update the list on the UI
      if (wasUnresolved && userRole === "special") {
        fetchUnresolvedQueries();
      }

    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Error: Connection failed. Please check your network and API key settings." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", height: "calc(100vh - 120px)" }}>
      
      {/* Admin unresolved queries notifications for Special Role */}
      {userRole === "special" && unresolvedList.length > 0 && (
        <section className="card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--primary)", background: "rgba(209, 92, 46, 0.05)" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--primary)" }}>
            <i className="fa-solid fa-triangle-exclamation"></i> Unresolved Data Requests Log
          </h3>
          <p style={{ margin: "0.25rem 0 0.75rem", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
            These user queries failed due to missing dashboard fields or database integrations. Update your import source files to resolve them.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "110px", overflowY: "auto", paddingRight: "0.5rem" }}>
            {unresolvedList.map((q, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", padding: "0.3rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "var(--text-primary)", fontStyle: "italic" }}>"{q.query}"</span>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem" }}>{new Date(q.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Chat Assistant Workspace */}
      <section className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
        
        {/* Header */}
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.005)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--primary)", fontSize: "1.2rem" }}></i>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>AI Operations Assistant</h2>
          </div>
          {outOfContextCount > 0 && !isLocked && (
            <span style={{ fontSize: "0.72rem", color: "var(--danger)", background: "rgba(239, 68, 68, 0.08)", padding: "0.15rem 0.5rem", borderRadius: "10px", fontWeight: 700 }}>
              Warnings: {outOfContextCount}/3
            </span>
          )}
        </div>

        {isLocked ? (
          /* Lockout Screen */
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", textAlign: "center", gap: "1rem" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(239, 68, 68, 0.08)", display: "flex", alignItems: "center", justify: "center", margin: "0 auto", display: "flex", justifyContent: "center" }}>
              <i className="fa-solid fa-lock" style={{ fontSize: "1.75rem", color: "#ef4444", alignSelf: "center" }}></i>
            </div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--text-primary)" }}>Assistant Locked for Today</h3>
            <p style={{ margin: 0, maxWidth: "360px", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
              The AI Operations Assistant has been locked out for today due to repeated (3+) out-of-context inquiries. Access will automatically reset tomorrow morning.
            </p>
          </div>
        ) : (
          /* Normal Chat panel */
          <>
            {/* Conversation Thread */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                    width: "100%"
                  }}
                >
                  <div
                    style={{
                      maxWidth: "75%",
                      padding: "0.85rem 1.1rem",
                      borderRadius: "12px",
                      background: m.role === "user" ? "var(--primary)" : "rgba(255,255,255,0.02)",
                      border: m.role === "user" ? "none" : "1px solid rgba(255,255,255,0.06)",
                      color: m.role === "user" ? "white" : "var(--text-primary)",
                      fontSize: "0.85rem"
                    }}
                  >
                    {formatText(m.content)}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div style={{ display: "flex", justify: "flex-start", width: "100%" }}>
                  <div style={{ maxWidth: "75%", padding: "0.85rem 1.1rem", borderRadius: "12px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ color: "var(--primary)" }}></i>
                    <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>AI is analyzing today's logs...</span>
                  </div>
                </div>
              )}
              <div ref={threadEndRef} />
            </div>

            {/* Quick suggestions row */}
            {messages.length === 1 && (
              <div style={{ padding: "0.5rem 1.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                {[
                  "Who is the best agent today?",
                  "Which agents made 0 calls?",
                  "What was the maximum call duration?",
                  "Summarize note updates today"
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestClick(sug)}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      color: "var(--text-secondary)",
                      fontSize: "0.74rem",
                      padding: "0.35rem 0.75rem",
                      borderRadius: "15px",
                      cursor: "pointer",
                      fontWeight: 600,
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--primary)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Form Input Footer */}
            <form onSubmit={handleSend} style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <input
                type="text"
                placeholder={isLoading ? "AI is processing..." : "Ask your operations query..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  outline: "none"
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                style={{
                  background: "var(--primary)",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.75rem 1.25rem",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  opacity: (isLoading || !inputText.trim()) ? 0.5 : 1
                }}
              >
                <i className="fa-solid fa-paper-plane" style={{ marginRight: "0.35rem" }}></i> Send
              </button>
            </form>
          </>
        )}

      </section>
    </div>
  );
}

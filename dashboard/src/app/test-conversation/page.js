"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { parseCSV } from "@/utils/csvParser";

export default function TestConversationPage() {
  const [theme, setTheme] = useState("dark");
  const [ghlToken, setGhlToken] = useState("");
  const [ghlLocationId, setGhlLocationId] = useState("");
  const [targetDate, setTargetDate] = useState(() => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const year = yesterday.getUTCFullYear();
    const month = String(yesterday.getUTCMonth() + 1).padStart(2, "0");
    const day = String(yesterday.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  
  // File state
  const [contactsFile, setContactsFile] = useState(null);
  const [contactsRows, setContactsRows] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");

  // Sync state
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Loaded conversation states
  const [chatThreads, setChatThreads] = useState([]); // [{ contactId, name, messages: [...] }]
  const [selectedThreadIndex, setSelectedThreadIndex] = useState(null);
  const [listPage, setListPage] = useState(1);

  // Custom modal states
  const [alertMessage, setAlertMessage] = useState("");

  // Load defaults on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") || "dark";
      setTheme(savedTheme);
      if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        document.body.classList.remove("dark-mode");
      } else {
        document.body.classList.add("dark-mode");
        document.body.classList.remove("light-mode");
      }

      setGhlToken(localStorage.getItem("ghl_token") || process.env.NEXT_PUBLIC_GHL_TOKEN || "");
      setGhlLocationId(localStorage.getItem("ghl_location_id") || process.env.NEXT_PUBLIC_GHL_LOCATION_ID || "");
    }
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setContactsFile(file);
    try {
      const text = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
      const rows = parseCSV(text);
      setContactsRows(rows);

      // Extract unique "Assigned To" values
      const agents = Array.from(new Set(rows.map(r => r["Assigned To"] || r["assignedTo"] || "").filter(Boolean))).sort();
      setAgentsList(agents);
      setSelectedAgent("All Agents");
    } catch (err) {
      console.error(err);
      setAlertMessage("Failed to parse contacts CSV file.");
    }
  };

  const handleFetchConversations = async () => {
    if (!ghlToken || !ghlLocationId) {
      setAlertMessage("Please configure GHL Location ID and GHL token.");
      return;
    }
    if (contactsRows.length === 0) {
      setAlertMessage("Please upload a Contacts Export CSV file first.");
      return;
    }
    if (!selectedAgent) {
      setAlertMessage("Please select an Agent.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setChatThreads([]);
    setSelectedThreadIndex(null);
    setListPage(1);

    try {
      // 1. Fetch GHL Users to build map
      setLoadingStatus("Fetching GHL user mappings...");
      const usersRes = await fetch("/api/ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/users/",
          token: ghlToken,
          params: { locationId: ghlLocationId }
        })
      });
      const usersData = await usersRes.json();
      const userMap = {};
      if (usersData.users) {
        usersData.users.forEach(u => {
          userMap[u.id] = u.name;
        });
      }

      const parseLastActivity = (str) => {
        if (!str) return "";
        const d = new Date(str);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().split("T")[0];
      };

      // 2. Filter contacts assigned to selected agent where Last Activity is exactly targetDate
      const targetContacts = contactsRows.filter(row => {
        const assignedTo = row["Assigned To"] || row["assignedTo"] || "";
        const isAllAgents = selectedAgent === "All Agents";
        const isSameAgent = isAllAgents || (assignedTo.trim().toLowerCase() === selectedAgent.trim().toLowerCase());
        if (!isSameAgent) return false;

        const lastActivityVal = row["Last Activity"] || row["lastActivity"] || "";
        const lastActivityDate = parseLastActivity(lastActivityVal);

        return lastActivityDate === targetDate;
      });

      if (targetContacts.length === 0) {
        setLoading(false);
        setAlertMessage(`No contacts found assigned to ${selectedAgent} with Last Activity on ${targetDate}.`);
        return;
      }

      const threads = [];

      const fetchAndAddThread = async (conv, contact) => {
        const msgRes = await fetch("/api/ghl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/conversations/${conv.id}/messages`,
            token: ghlToken,
            params: { limit: 100 }
          })
        });

        if (!msgRes.ok) return;
        const msgData = await msgRes.json();
        const rawMessages = (msgData.messages && msgData.messages.messages) || [];

        // Sort messages chronologically, excluding opportunity-related messages and call/phone type logs
        const messagesList = rawMessages
          .filter(m => {
            const bodyLower = String(m.body || "").toLowerCase();
            const typeLower = String(m.type || m.messageType || "").toLowerCase();

            // Exclude opportunity-related messages
            if (typeLower.includes("opportunity") || bodyLower.includes("opportunity")) {
              return false;
            }
            // Exclude phone or call type logs
            if (
              typeLower.includes("phone") || 
              typeLower.includes("call") || 
              typeLower.includes("type_phone") || 
              typeLower.includes("type_call")
            ) {
              return false;
            }
            // Exclude empty messages
            if (!m.body || !m.body.trim()) {
              return false;
            }
            return true;
          })
          .map(m => {
            const time = new Date(m.dateAdded);
            return {
              id: m.id,
              body: m.body || "",
              direction: m.direction || "outbound", // inbound / outbound
              type: m.type || m.messageType || "message",
              date: time,
              dateStr: time.toLocaleString("en-GB", { hour12: false }),
              hour: time.getHours()
            };
          })
          .sort((a, b) => a.date - b.date);

        // Filter messages to keep only those matching targetDate
        const dayMessages = messagesList.filter(m => {
          if (!m.date) return false;
          const datePart = m.date.toISOString().split("T")[0];
          return datePart === targetDate;
        });

        if (dayMessages.length > 0) {
          threads.push({
            contactId: conv.contactId,
            name: `${contact?.["First Name"] || ""} ${contact?.["Last Name"] || ""}`.trim() || conv.contactName || "Contact",
            email: contact?.["Email"] || "",
            phone: contact?.["Phone"] || "",
            created: contact?.["Created"] || conv.dateCreated || "",
            messages: dayMessages
          });
        }
      };

      if (targetContacts.length <= 35) {
        // Mode A: Loop through contact IDs (fast for small subsets)
        let count = 0;
        for (const contact of targetContacts) {
          count++;
          const contactId = contact["Contact Id"] || contact["contactId"] || contact["id"] || "";
          if (!contactId) continue;

          setLoadingStatus(`Querying GHL thread for ${contact["First Name"] || ""} (${count}/${targetContacts.length})...`);

          const searchRes = await fetch("/api/ghl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: "/conversations/search",
              token: ghlToken,
              params: {
                locationId: ghlLocationId,
                contactId
              }
            })
          });

          if (!searchRes.ok) continue;
          const searchData = await searchRes.json();
          const conversations = searchData.conversations || [];
          if (conversations.length === 0) continue;

          await fetchAndAddThread(conversations[0], contact);
        }
      } else {
        // Mode B: Query GHL conversations paginated (efficient for large sets)
        let currentStartAfterDate = null;
        let hasMore = true;
        let pageCount = 0;
        const matchedContactIds = new Set(targetContacts.map(c => c["Contact Id"] || c["contactId"] || c["id"] || "").filter(Boolean));

        while (hasMore && pageCount < 8) {
          pageCount++;
          setLoadingStatus(`Loading conversations list (Page ${pageCount})...`);

          const params = {
            locationId: ghlLocationId,
            limit: 50,
            status: "all",
            sortBy: "last_message_date",
            sort: "desc"
          };
          if (currentStartAfterDate) {
            params.startAfterDate = currentStartAfterDate;
          }

          const convRes = await fetch("/api/ghl", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              endpoint: "/conversations/search",
              token: ghlToken,
              params
            })
          });

          if (!convRes.ok) break;
          const convData = await convRes.json();
          const conversations = convData.conversations || [];
          if (conversations.length === 0) break;

          for (const conv of conversations) {
            if (matchedContactIds.has(conv.contactId)) {
              const contact = targetContacts.find(c => (c["Contact Id"] || c["contactId"] || c["id"]) === conv.contactId);
              await fetchAndAddThread(conv, contact);
            }
          }

          const lastConv = conversations[conversations.length - 1];
          const lastDateVal = lastConv.dateUpdated || lastConv.dateCreated || lastConv.lastMessageDate;
          
          let lastDateStr = "";
          if (typeof lastDateVal === "string") {
            lastDateStr = lastDateVal;
          } else if (typeof lastDateVal === "number") {
            lastDateStr = new Date(lastDateVal).toISOString();
          } else if (lastDateVal instanceof Date) {
            lastDateStr = lastDateVal.toISOString();
          }

          if (lastDateStr) {
            const datePart = lastDateStr.split("T")[0];
            if (datePart < targetDate) {
              hasMore = false;
            } else {
              currentStartAfterDate = lastDateVal;
            }
          } else {
            hasMore = false;
          }

          if (conversations.length < 50) {
            hasMore = false;
          }
        }
      }

      setChatThreads(threads);
      if (threads.length > 0) {
        setSelectedThreadIndex(0);
      } else {
        setAlertMessage(`Successfully searched contacts, but no conversations matched the selected target date ${targetDate}.`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred during synchronization.");
    } finally {
      setLoading(false);
      setLoadingStatus("");
    }
  };

  // Compile hourly counts for selected thread (messages activity graph)
  const activeThread = selectedThreadIndex !== null ? chatThreads[selectedThreadIndex] : null;
  
  const hourlyData = React.useMemo(() => {
    if (!activeThread) return Array(24).fill(0).map((_, i) => ({ hour: i, inbound: 0, outbound: 0, total: 0 }));
    
    const counts = Array(24).fill(0).map((_, i) => ({ hour: i, inbound: 0, outbound: 0, total: 0 }));
    activeThread.messages.forEach(m => {
      const hr = m.hour;
      if (hr >= 0 && hr < 24) {
        if (m.direction === "inbound") {
          counts[hr].inbound++;
        } else {
          counts[hr].outbound++;
        }
          counts[hr].total++;
      }
    });
    return counts;
  }, [activeThread]);

  const maxMessageCount = Math.max(...hourlyData.map(h => h.total), 4);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-color)", color: "var(--text-primary)", fontFamily: "var(--font-stack)", display: "flex", flexDirection: "column" }}>
      {/* Sticky Header */}
      <header style={{ borderBottom: "1px solid var(--card-border)", padding: "1.2rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, backgroundColor: "var(--bg-color)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fa-solid fa-comments" style={{ color: "#000" }}></i>
          </div>
          <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>GHL Conversation Tester</h1>
        </div>
        <Link href="/" className="btn-secondary" style={{ textDecoration: "none", padding: "0.5rem 1rem", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, border: "1px solid var(--card-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <i className="fa-solid fa-arrow-left"></i> Dashboard
        </Link>
      </header>

      {/* Main Grid Layout */}
      <main style={{ flex: 1, padding: "2rem", display: "grid", gridTemplateColumns: "360px 1fr", gap: "2rem", height: "calc(100vh - 70px)", overflow: "hidden" }}>
        
        {/* Left Column: Form & Contacts List */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem", height: "100%", overflowY: "auto", paddingRight: "0.5rem" }}>
          
          {/* Card 1: Configuration Form */}
          <div className="card" style={{ padding: "1.5rem", border: "1px solid var(--card-border)", borderRadius: "12px", backgroundColor: "var(--card-bg)", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fa-solid fa-sliders" style={{ color: "var(--primary)" }}></i> Configurations
            </h2>

            {/* Target Date */}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Target Select Date (On/After)
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)", fontSize: "0.88rem" }}
              />
            </div>

            {/* Upload File */}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Upload Contacts Export
              </label>
              <div className="custom-file-input-wrapper" style={{ cursor: "pointer" }}>
                <input type="file" accept=".csv" onChange={handleFileChange} style={{ width: "100%" }} />
                <div className="custom-file-label" style={{ padding: "0.6rem 0.8rem", borderLeft: "3px solid var(--primary)", fontSize: "0.82rem" }}>
                  <i className="fa-solid fa-file-csv"></i> {contactsFile ? contactsFile.name : "Choose Contacts CSV..."}
                </div>
              </div>
            </div>

            {/* Select Agent dropdown */}
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                Select Agent (Assigned To)
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                disabled={agentsList.length === 0}
                style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)", fontSize: "0.88rem", outline: "none" }}
              >
                {agentsList.length === 0 ? (
                  <option>Upload Contacts CSV first...</option>
                ) : (
                  <>
                    <option value="All Agents">All Agents</option>
                    {agentsList.map(a => <option key={a} value={a}>{a}</option>)}
                  </>
                )}
              </select>
            </div>

            {/* Test Action button */}
            <button
              onClick={handleFetchConversations}
              disabled={loading || contactsRows.length === 0}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "8px",
                border: "none",
                backgroundColor: loading || contactsRows.length === 0 ? "rgba(255,255,255,0.05)" : "var(--primary)",
                color: loading || contactsRows.length === 0 ? "var(--text-secondary)" : "#000",
                fontWeight: 700,
                fontSize: "0.85rem",
                cursor: loading || contactsRows.length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s"
              }}
            >
              {loading ? (
                <span>
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading...
                </span>
              ) : (
                <span>
                  <i className="fa-solid fa-sync"></i> Pull Conversations
                </span>
              )}
            </button>
          </div>

          {/* Card 2: Contacts List */}
          <div className="card" style={{ flex: 1, padding: "1.5rem", border: "1px solid var(--card-border)", borderRadius: "12px", backgroundColor: "var(--card-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Conversations ({chatThreads.length})</span>
              <i className="fa-solid fa-user-group" style={{ color: "var(--text-secondary)" }}></i>
            </h3>
            
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem", maxHeight: "380px" }}>
              {chatThreads.slice((listPage - 1) * 5, listPage * 5).map((thread, idx) => {
                const threadIndexInFull = (listPage - 1) * 5 + idx;
                return (
                  <div
                    key={thread.contactId}
                    onClick={() => setSelectedThreadIndex(threadIndexInFull)}
                    style={{
                      padding: "0.8rem 1rem",
                      borderRadius: "8px",
                      border: `1px solid ${selectedThreadIndex === threadIndexInFull ? "var(--primary)" : "var(--card-border)"}`,
                      backgroundColor: selectedThreadIndex === threadIndexInFull ? "rgba(209, 92, 46, 0.08)" : "rgba(255,255,255,0.02)",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                      <strong style={{ fontSize: "0.88rem", color: selectedThreadIndex === threadIndexInFull ? "var(--primary)" : "var(--text-primary)" }}>
                        {thread.name}
                      </strong>
                      <span style={{ fontSize: "0.72rem", background: "rgba(255,255,255,0.08)", padding: "0.1rem 0.4rem", borderRadius: "12px", color: "var(--text-secondary)" }}>
                        {thread.messages.length} msg
                      </span>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "flex", justifyContent: "space-between" }}>
                      <span>{thread.phone || "No phone"}</span>
                      <span>Created: {thread.created.split("T")[0]}</span>
                    </div>
                  </div>
                );
              })}
              {chatThreads.length === 0 && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "150px", color: "var(--text-secondary)", opacity: 0.6, fontSize: "0.82rem", textAlign: "center", padding: "1rem" }}>
                  <i className="fa-regular fa-comment-dots fa-2x" style={{ marginBottom: "0.5rem" }}></i>
                  No active conversation threads loaded yet.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {chatThreads.length > 5 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", borderTop: "1px solid var(--card-border)", paddingTop: "0.8rem" }}>
                <button
                  disabled={listPage === 1}
                  onClick={() => setListPage(prev => Math.max(prev - 1, 1))}
                  className="btn-secondary"
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "1px solid var(--card-border)",
                    backgroundColor: "transparent",
                    color: listPage === 1 ? "var(--text-secondary)" : "var(--text-primary)",
                    cursor: listPage === 1 ? "not-allowed" : "pointer",
                    opacity: listPage === 1 ? 0.4 : 1
                  }}
                >
                  <i className="fa-solid fa-chevron-left"></i> Prev
                </button>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                  Page {listPage} of {Math.ceil(chatThreads.length / 5)}
                </span>
                <button
                  disabled={listPage === Math.ceil(chatThreads.length / 5)}
                  onClick={() => setListPage(prev => Math.min(prev + 1, Math.ceil(chatThreads.length / 5)))}
                  className="btn-secondary"
                  style={{
                    padding: "0.4rem 0.8rem",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    border: "1px solid var(--card-border)",
                    backgroundColor: "transparent",
                    color: listPage === Math.ceil(chatThreads.length / 5) ? "var(--text-secondary)" : "var(--text-primary)",
                    cursor: listPage === Math.ceil(chatThreads.length / 5) ? "not-allowed" : "pointer",
                    opacity: listPage === Math.ceil(chatThreads.length / 5) ? 0.4 : 1
                  }}
                >
                  Next <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Graphs & Bubbles */}
        <section style={{ display: "grid", gridTemplateRows: "250px 1fr", gap: "2rem", height: "100%", overflow: "hidden" }}>
          
          {/* Card 3: Hourly Activity Graph */}
          <div className="card" style={{ padding: "1.5rem", border: "1px solid var(--card-border)", borderRadius: "12px", backgroundColor: "var(--card-bg)", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fa-solid fa-chart-bar" style={{ color: "var(--primary)" }}></i> 
              Hourly Message Density {activeThread ? `for ${activeThread.name}` : ""}
            </h3>
            
            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", paddingBottom: "1.5rem", paddingLeft: "1.2rem", paddingRight: "1rem" }}>
              {/* Y Axis Grid Lines */}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: "1.5rem", width: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ borderTop: "1px dashed rgba(255, 255, 255, 0.05)", width: "100%", position: "relative" }}>
                    <span style={{ position: "absolute", right: "100%", top: "-6px", fontSize: "0.65rem", paddingRight: "4px", color: "var(--text-secondary)", opacity: 0.6 }}>
                      {Math.round(maxMessageCount * (4 - i) / 4)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Render Bars */}
              {hourlyData.map(h => {
                const heightPercent = maxMessageCount > 0 ? (h.total / maxMessageCount) * 100 : 0;
                const inboundPercent = h.total > 0 ? (h.inbound / h.total) * 100 : 0;
                const outboundPercent = h.total > 0 ? (h.outbound / h.total) * 100 : 0;

                return (
                  <div
                    key={h.hour}
                    className="graph-bar-wrapper"
                    style={{
                      flex: 1,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      position: "relative",
                      zIndex: 10
                    }}
                  >
                    {/* Floating Info Tooltip */}
                    <div className="graph-bar-tooltip" style={{
                      position: "absolute",
                      bottom: `${heightPercent + 5}%`,
                      background: "var(--card-bg)",
                      border: "1px solid var(--card-border)",
                      color: "var(--text-primary)",
                      padding: "0.4rem 0.6rem",
                      borderRadius: "6px",
                      fontSize: "0.68rem",
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                      opacity: 0,
                      transition: "opacity 0.15s ease-in-out",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                      zIndex: 50
                    }}>
                      <strong>{h.hour}:00</strong><br />
                      Total: {h.total} msgs<br />
                      <span style={{ color: "var(--primary)" }}>Outbound: {h.outbound}</span><br />
                      <span style={{ color: "var(--info)" }}>Inbound: {h.inbound}</span>
                    </div>

                    {/* Bar Fill */}
                    {h.total > 0 ? (
                      <div
                        style={{
                          width: "min(28px, 60%)",
                          height: `${heightPercent}%`,
                          borderRadius: "4px 4px 0 0",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                          transition: "height 0.3s ease"
                        }}
                      >
                        {/* Outbound Stack */}
                        <div style={{ height: `${outboundPercent}%`, width: "100%", backgroundColor: "var(--primary)" }} />
                        {/* Inbound Stack */}
                        <div style={{ height: `${inboundPercent}%`, width: "100%", backgroundColor: "var(--info)" }} />
                      </div>
                    ) : (
                      <div style={{ width: "min(28px, 60%)", height: "4px", backgroundColor: "rgba(255,255,255,0.02)", borderRadius: "4px 4px 0 0" }} />
                    )}

                    {/* X Label */}
                    <span style={{ position: "absolute", top: "102%", fontSize: "0.62rem", color: "var(--text-secondary)", opacity: 0.6 }}>
                      {String(h.hour).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 4: Chat History Bubbles */}
          <div className="card" style={{ padding: "1.5rem", border: "1px solid var(--card-border)", borderRadius: "12px", backgroundColor: "var(--card-bg)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {activeThread ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Contact Subheader */}
                <div style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "1rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>{activeThread.name}</h3>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                      {activeThread.email} • {activeThread.phone}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.05)", padding: "0.3rem 0.6rem", borderRadius: "8px", border: "1px solid var(--card-border)", color: "var(--text-secondary)" }}>
                    Created on: {activeThread.created.split("T")[0]}
                  </span>
                </div>

                {/* Bubbles Area */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem", paddingRight: "0.5rem" }}>
                  {activeThread.messages.map((m) => {
                    const isInbound = m.direction === "inbound";
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: "flex",
                          justifyContent: isInbound ? "flex-start" : "flex-end",
                          width: "100%"
                        }}
                      >
                        <div
                          style={{
                            maxWidth: "70%",
                            padding: "0.8rem 1.2rem",
                            borderRadius: "14px",
                            borderRadiusTopLeft: isInbound ? "0" : "14px",
                            borderRadiusTopRight: isInbound ? "14px" : "0",
                            backgroundColor: isInbound ? "rgba(255, 255, 255, 0.05)" : "var(--primary-glow)",
                            border: `1px solid ${isInbound ? "var(--card-border)" : "var(--primary)"}`,
                            color: "var(--text-primary)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.4rem"
                          }}
                        >
                          <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.45, whiteSpace: "pre-line" }}>
                            {m.body}
                          </p>
                          <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", opacity: 0.6, alignSelf: isInbound ? "flex-start" : "flex-end" }}>
                            {m.dateStr} ({m.direction === "inbound" ? "Customer" : "Agent"})
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", opacity: 0.6 }}>
                <i className="fa-solid fa-comments fa-3x" style={{ marginBottom: "1rem" }}></i>
                <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>No Thread Selected</p>
                <p style={{ fontSize: "0.8rem", margin: 0 }}>Please select a contact thread from the left menu to view the bubbles.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Sync Status Banner Overlay */}
      {loading && (
        <div style={{ position: "fixed", bottom: "2rem", right: "2rem", padding: "1rem 2rem", borderRadius: "12px", border: "1px solid var(--card-border)", backgroundColor: "var(--card-bg)", boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", gap: "1rem", zIndex: 99999 }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ color: "var(--primary)" }}></i>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{loadingStatus}</span>
        </div>
      )}

      {/* Custom Alert Modal popup */}
      {alertMessage && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.65)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100000 }}>
          <div className="card" style={{ width: "min(400px, 90%)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)", backgroundColor: "var(--card-bg)", boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)", display: "flex", flexDirection: "column", gap: "1.2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "rgba(209, 92, 46, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                <i className="fa-solid fa-circle-info fa-lg"></i>
              </div>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>Notification</h3>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
              {alertMessage}
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.4rem" }}>
              <button
                onClick={() => setAlertMessage("")}
                className="btn-primary"
                style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", border: "none", backgroundColor: "var(--primary)", color: "#000", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled graph bar hover rules */}
      <style>{`
        .graph-bar-wrapper:hover .graph-bar-tooltip {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}

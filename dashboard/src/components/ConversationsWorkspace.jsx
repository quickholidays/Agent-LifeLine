"use client";

import React, { useState, useEffect, useRef } from "react";

// Mock/Simulated Conversations Database
const MOCK_CONVERSATIONS = [
  {
    id: "conv_1",
    agentName: "Lisa Evans",
    fullName: "John Smith",
    phone: "+44 7700 900077",
    email: "john.smith@gmail.com",
    channel: "TYPE_SMS", // SMS
    lastMessage: "Yes, works for me.",
    lastTime: "15:35",
    messages: [
      { id: "m1_1", body: "Hi, I saw your ad about the visa application. How much is the fee?", direction: "inbound", timestamp: "15:30" },
      { id: "m1_2", body: "Hello John! The government visa fee is £180. We also charge a documentation service fee. Let me know if you would like to book a call to check your eligibility?", direction: "outbound", timestamp: "15:32" },
      { id: "m1_3", body: "Yes please, any slots today?", direction: "inbound", timestamp: "15:33" },
      { id: "m1_4", body: "I have a slot at 3:45 PM BST. Does that work?", direction: "outbound", timestamp: "15:34" },
      { id: "m1_5", body: "Yes, works for me.", direction: "inbound", timestamp: "15:35" },
      { id: "m1_6", body: "Phone Call Log Event", direction: "outbound", timestamp: "15:40", isCallEvent: true, callStatus: "Answered", callDuration: "02:45", recordingUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" }
    ]
  },
  {
    id: "conv_2",
    agentName: "Lisa Evans",
    fullName: "Maria Santos",
    phone: "+44 7700 900122",
    email: "maria.santos@outlook.com",
    channel: "TYPE_IG_DIRECT", // Instagram
    lastMessage: "Excellent choice. We have a dedicated team for UK student visas.",
    lastTime: "16:15",
    messages: [
      { id: "m2_1", body: "Hi! Direct messaging you from Instagram. Do you help with student visas?", direction: "inbound", timestamp: "16:05" },
      { id: "m2_2", body: "Yes Maria, we do! Which university are you looking at?", direction: "outbound", timestamp: "16:10" },
      { id: "m2_3", body: "I'm applying to UCL.", direction: "inbound", timestamp: "16:12" },
      { id: "m2_4", body: "Excellent choice. We have a dedicated team for UK student visas.", direction: "outbound", timestamp: "16:15" }
    ]
  },
  {
    id: "conv_3",
    agentName: "Amber Williams",
    fullName: "Charity Mwaniki",
    phone: "+254 712 345678",
    email: "charity.m@yahoo.com",
    channel: "TYPE_FB_MESSENGER", // Facebook Messenger
    lastMessage: "I will keep you updated. Have a great day!",
    lastTime: "12:20",
    messages: [
      { id: "m3_1", body: "Hello, I sent my documents yesterday. Can you confirm if you received them?", direction: "inbound", timestamp: "12:15" },
      { id: "m3_2", body: "Hi Charity! Yes, I received them. They are currently being verified by our compliance team.", direction: "outbound", timestamp: "12:17" },
      { id: "m3_3", body: "Perfect. Let me know if you need anything else.", direction: "inbound", timestamp: "12:19" },
      { id: "m3_4", body: "I will keep you updated. Have a great day!", direction: "outbound", timestamp: "12:20" }
    ]
  },
  {
    id: "conv_4",
    agentName: "Amber Williams",
    fullName: "David Vance",
    phone: "+1 202 555 0143",
    email: "david.vance@gmail.com",
    channel: "TYPE_WHATSAPP", // WhatsApp
    lastMessage: "Awesome, thank you!",
    lastTime: "10:45",
    messages: [
      { id: "m4_1", body: "Hey Amber, what's the update on my appointment?", direction: "inbound", timestamp: "10:40" },
      { id: "m4_2", body: "Hi David! It's booked for July 25th at 10 AM.", direction: "outbound", timestamp: "10:42" },
      { id: "m4_3", body: "Awesome, thank you!", direction: "inbound", timestamp: "10:45" }
    ]
  },
  {
    id: "conv_5",
    agentName: "Jasmine Taylor",
    fullName: "Sarah Connor",
    phone: "+44 7700 900554",
    email: "sconnor@cyberdyne.com",
    channel: "TYPE_EMAIL", // Email
    lastMessage: "You should receive a confirmation email shortly.",
    lastTime: "14:15",
    messages: [
      { id: "m5_1", body: "Hello team, I need to postpone my appointment scheduled for tomorrow.", direction: "inbound", timestamp: "14:00" },
      { id: "m5_2", body: "Hi Sarah, no problem. I have rescheduled it to next Monday at 2 PM. You should receive a confirmation email shortly.", direction: "outbound", timestamp: "14:15" }
    ]
  },
  {
    id: "conv_6",
    agentName: "Jasmine Taylor",
    fullName: "Alan Walker",
    phone: "+47 900 12 345",
    email: "alan@faded.no",
    channel: "TYPE_SMS", // SMS
    lastMessage: "Hello Alan, our documentation fee is non-refundable.",
    lastTime: "09:12",
    messages: [
      { id: "m6_1", body: "Hi, can I get a refund if my application is rejected?", direction: "inbound", timestamp: "09:05" },
      { id: "m6_2", body: "Hello Alan, our documentation fee is non-refundable as it covers our manual verification and filing services. However, we ensure a 99% success rate before we submit.", direction: "outbound", timestamp: "09:12" }
    ]
  },
  {
    id: "conv_7",
    agentName: "Lisa Evans",
    fullName: "Jasmine Adams",
    phone: "+44 7700 900888",
    email: "-",
    channel: "TYPE_CALL", // Call Log
    lastMessage: "Phone call: outbound (Answered)",
    lastTime: "11:20",
    messages: [
      { id: "m7_1", body: "Phone Call Log Event", direction: "outbound", timestamp: "11:20", isCallEvent: true, callStatus: "Answered", callDuration: "03:12" }
    ]
  }
];

export default function ConversationsWorkspace({ agents = [] }) {
  // Credentials loaded from localStorage
  const [token, setToken] = useState("");
  const [locationId, setLocationId] = useState("");
  const [selectedDate, setSelectedDate] = useState("2026-07-17");
  const [isSimulated, setIsSimulated] = useState(true);

  // Loaded and processed data
  const [conversations, setConversations] = useState([]);
  const [activeAgent, setActiveAgent] = useState("");
  const [activeConv, setActiveConv] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const chatEndRef = useRef(null);

  // Persist GHL credentials in local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("ghl_token") || "");
      setLocationId(localStorage.getItem("ghl_location") || "");
      const savedSim = localStorage.getItem("ghl_simulated");
      if (savedSim !== null) {
        setIsSimulated(savedSim === "true");
      }
    }
  }, []);

  const saveCredentials = (t, loc, sim) => {
    localStorage.setItem("ghl_token", t);
    localStorage.setItem("ghl_location", loc);
    localStorage.setItem("ghl_simulated", String(sim));
  };

  // Scroll to bottom of chat list on change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeConv]);

  // Pull conversations list
  const handlePullConversations = async () => {
    setIsLoading(true);
    setErrorMsg("");
    setConversations([]);
    setActiveConv(null);

    // Save active configuration
    saveCredentials(token, locationId, isSimulated);

    if (isSimulated) {
      // Simulate API latency
      setTimeout(() => {
        setConversations(MOCK_CONVERSATIONS);
        const uniqueAgents = Array.from(new Set(MOCK_CONVERSATIONS.map(c => c.agentName)));
        if (uniqueAgents.length > 0) {
          setActiveAgent(uniqueAgents[0]);
        }
        setIsLoading(false);
      }, 800);
      return;
    }

    if (!token || !locationId) {
      setErrorMsg("Please enter both the API Token/Key and the Location ID.");
      setIsLoading(false);
      return;
    }

    try {
      // Step 1: Fetch GHL Users to map GHL assignedTo ID to agent names
      const usersRes = await fetch("/api/ghl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/users/",
          token,
          params: { locationId }
        })
      });
      const usersData = await usersRes.json();
      if (usersData.error) throw new Error(usersData.error);
      const userMap = {}; // userId -> userName
      if (usersData.users) {
        usersData.users.forEach(u => {
          userMap[u.id] = u.name;
        });
      }

      // Step 2: Fetch GHL Conversations with pagination filtered by target date
      const targetDateStr = selectedDate; // "YYYY-MM-DD"
      const mappedConvs = [];
      let currentStartAfterDate = null;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && pageCount < 10) { // Limit pagination depth to avoid hitting API rate limits
        pageCount++;
        const params = {
          locationId,
          limit: 25,
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
            token,
            params
          })
        });

        const convData = await convRes.json();
        if (convData.error) throw new Error(convData.error);
        if (!convData.conversations || convData.conversations.length === 0) {
          break;
        }

        let foundOlder = false;

        for (const c of convData.conversations) {
          const lastMsgDate = c.lastMessageDate || c.dateUpdated || c.dateCreated;
          if (!lastMsgDate) continue;

          const dateStr = lastMsgDate.split("T")[0];

          if (dateStr === targetDateStr) {
            const assignedUserId = c.assignedTo;
            const mappedAgentName = userMap[assignedUserId] || "Unassigned";

            // Fetch messages for each matching conversation
            const msgRes = await fetch("/api/ghl", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: `/conversations/${c.id}/messages`,
                token,
                params: { limit: 50 }
              })
            });
            const msgData = await msgRes.json();
            const threadMessages = [];
            if (msgData.messages && Array.isArray(msgData.messages)) {
              // Sort messages chronologically
              const sortedMsgs = [...msgData.messages].sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
              sortedMsgs.forEach(m => {
                const timeObj = new Date(m.dateAdded);
                const timeStr = timeObj.getUTCHours().toString().padStart(2, "0") + ":" + timeObj.getUTCMinutes().toString().padStart(2, "0");
                
                const isCall = m.type === "TYPE_CALL" || m.messageType === "TYPE_CALL";
                const formatDuration = (sec) => {
                  if (!sec || isNaN(sec)) return "00:00";
                  const min = Math.floor(sec / 60).toString().padStart(2, "0");
                  const secLeft = (sec % 60).toString().padStart(2, "0");
                  return `${min}:${secLeft}`;
                };

                threadMessages.push({
                  id: m.id,
                  body: m.body || (isCall ? "Phone Call Log Event" : "[Media or Template Attachment]"),
                  direction: m.direction, // inbound/outbound
                  timestamp: timeStr,
                  isCallEvent: isCall,
                  callStatus: m.call?.status || m.status || "Answered",
                  callDuration: m.call?.duration ? formatDuration(m.call.duration) : "00:00",
                  recordingUrl: m.call?.recordingUrl || m.recordingUrl || null
                });
              });
            }

            const lastMsgTimeObj = new Date(lastMsgDate);
            const lastMsgTimeStr = lastMsgTimeObj.getUTCHours().toString().padStart(2, "0") + ":" + lastMsgTimeObj.getUTCMinutes().toString().padStart(2, "0");

            mappedConvs.push({
              id: c.id,
              agentName: mappedAgentName,
              fullName: c.fullName || "GHL Contact",
              phone: c.phone || "-",
              email: c.email || "-",
              channel: c.type || "TYPE_SMS",
              lastMessage: c.lastMessageBody || "[System Action]",
              lastTime: lastMsgTimeStr,
              messages: threadMessages
            });
          } else if (new Date(dateStr) < new Date(targetDateStr)) {
            foundOlder = true;
          }
        }

        if (foundOlder) {
          break;
        }

        // Advance cursor to the last item on the page
        const lastItem = convData.conversations[convData.conversations.length - 1];
        currentStartAfterDate = lastItem.lastMessageDate || lastItem.dateUpdated || lastItem.dateCreated;
      }

      setConversations(mappedConvs);
      const uniqueAgents = Array.from(new Set(mappedConvs.map(c => c.agentName)));
      if (uniqueAgents.length > 0) {
        setActiveAgent(uniqueAgents[0]);
      } else {
        setErrorMsg(`No active conversations recorded on ${selectedDate} for this sub-account.`);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Failed to fetch conversations.");
    } finally {
      setIsLoading(false);
    }
  };

  // Merge live/simulated GHL conversations with CSV call logs
  const mergedConversations = React.useMemo(() => {
    if (!conversations || conversations.length === 0) return [];

    // Clone conversations so we don't mutate state directly
    const cloned = conversations.map(c => ({
      ...c,
      messages: [...c.messages]
    }));

    // Find all calls for all agents and group them by agent name
    const callsByAgent = {};
    agents.forEach(a => {
      callsByAgent[a.name] = a.calls || [];
    });

    // Match and merge call logs into existing chat threads
    cloned.forEach(c => {
      const agentCalls = callsByAgent[c.agentName] || [];
      const contactCalls = agentCalls.filter(call => 
        call.contact_name && call.contact_name.toLowerCase().trim() === c.fullName.toLowerCase().trim()
      );

      contactCalls.forEach(call => {
        const timeObj = new Date(call.timestamp);
        const timeStr = timeObj.getUTCHours().toString().padStart(2, "0") + ":" + timeObj.getUTCMinutes().toString().padStart(2, "0");
        
        // Add a call event to the message list if not already present
        const callMsgId = `call_${call.timestamp}_${call.duration}`;
        if (!c.messages.some(m => m.id === callMsgId)) {
          c.messages.push({
            id: callMsgId,
            body: `Phone Call Log Event`,
            direction: call.direction,
            timestamp: timeStr,
            isCallEvent: true,
            callStatus: call.status,
            callDuration: call.duration,
            callTimeRaw: call.timestamp
          });
        }
      });

      // Sort messages chronologically
      c.messages.sort((a, b) => {
        const getMinutes = (timeStr) => {
          const parts = timeStr.split(":");
          return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        };
        
        const rawA = a.callTimeRaw ? new Date(a.callTimeRaw).getTime() : 0;
        const rawB = b.callTimeRaw ? new Date(b.callTimeRaw).getTime() : 0;
        
        if (rawA && rawB) return rawA - rawB;
        return getMinutes(a.timestamp) - getMinutes(b.timestamp);
      });
    });

    // Add standalone call threads for contacts who had phone calls but no GHL chat threads
    const uniqueAgentNames = Array.from(new Set(conversations.map(c => c.agentName)));
    
    agents.forEach(a => {
      if (uniqueAgentNames.length > 0 && !uniqueAgentNames.includes(a.name)) return;
      
      const agentCalls = a.calls || [];
      const groupedCalls = {}; 
      
      agentCalls.forEach(call => {
        if (!call.contact_name) return;
        
        const hasThread = cloned.some(c => 
          c.agentName === a.name && c.fullName.toLowerCase().trim() === call.contact_name.toLowerCase().trim()
        );
        if (hasThread) return;

        if (!groupedCalls[call.contact_name]) {
          groupedCalls[call.contact_name] = [];
        }
        groupedCalls[call.contact_name].push(call);
      });

      Object.entries(groupedCalls).forEach(([contactName, calls]) => {
        const threadMessages = calls.map(call => {
          const timeObj = new Date(call.timestamp);
          const timeStr = timeObj.getUTCHours().toString().padStart(2, "0") + ":" + timeObj.getUTCMinutes().toString().padStart(2, "0");
          return {
            id: `call_${call.timestamp}_${call.duration}`,
            body: `Phone Call Log Event`,
            direction: call.direction,
            timestamp: timeStr,
            isCallEvent: true,
            callStatus: call.status,
            callDuration: call.duration,
            callTimeRaw: call.timestamp
          };
        });

        threadMessages.sort((a, b) => new Date(a.callTimeRaw).getTime() - new Date(b.callTimeRaw).getTime());

        const lastCall = calls[calls.length - 1];
        const lastCallTimeObj = new Date(lastCall.timestamp);
        const lastCallTimeStr = lastCallTimeObj.getUTCHours().toString().padStart(2, "0") + ":" + lastCallTimeObj.getUTCMinutes().toString().padStart(2, "0");

        cloned.push({
          id: `conv_call_${a.name}_${contactName.replace(/\s+/g, "_")}`,
          agentName: a.name,
          fullName: contactName,
          phone: lastCall.phone || "-",
          email: "-",
          channel: "TYPE_CALL",
          lastMessage: `Phone call: ${lastCall.direction} (${lastCall.status})`,
          lastTime: lastCallTimeStr,
          messages: threadMessages
        });
      });
    });

    return cloned;
  }, [conversations, agents]);

  // Group conversations by agent name
  const agentsMap = {};
  mergedConversations.forEach(c => {
    if (!agentsMap[c.agentName]) {
      agentsMap[c.agentName] = [];
    }
    agentsMap[c.agentName].push(c);
  });

  const activeAgentConvs = agentsMap[activeAgent] || [];

  // Helper to render channel badges/icons
  const getChannelBadge = (channel) => {
    switch (channel) {
      case "TYPE_IG_DIRECT":
        return {
          icon: <i className="fa-brands fa-instagram"></i>,
          label: "Instagram",
          style: { backgroundColor: "#e1306c", color: "white" }
        };
      case "TYPE_FB_MESSENGER":
        return {
          icon: <i className="fa-brands fa-facebook-messenger"></i>,
          label: "Messenger",
          style: { backgroundColor: "#0084ff", color: "white" }
        };
      case "TYPE_WHATSAPP":
        return {
          icon: <i className="fa-brands fa-whatsapp"></i>,
          label: "WhatsApp",
          style: { backgroundColor: "#25d366", color: "white" }
        };
      case "TYPE_EMAIL":
        return {
          icon: <i className="fa-solid fa-envelope"></i>,
          label: "Email",
          style: { backgroundColor: "#8b5cf6", color: "white" }
        };
      case "TYPE_CALL":
        return {
          icon: <i className="fa-solid fa-phone"></i>,
          label: "Call Log",
          style: { backgroundColor: "#db8324", color: "white" }
        };
      default:
        return {
          icon: <i className="fa-solid fa-comment-sms"></i>,
          label: "SMS",
          style: { backgroundColor: "#64748b", color: "white" }
        };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minHeight: "100%" }}>
      {/* ── Configuration Settings Bar ────────────────────────────────────────── */}
      <section className="card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--card-border)", paddingBottom: "1rem", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <i className="fa-solid fa-comments" style={{ color: "var(--primary)" }}></i> Live GHL Conversation Hub
          </h2>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button
              className={`tab-btn ${isSimulated ? "active" : ""}`}
              onClick={() => setIsSimulated(true)}
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
            >
              Simulated Mode
            </button>
            <button
              className={`tab-btn ${!isSimulated ? "active" : ""}`}
              onClick={() => setIsSimulated(false)}
              style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
            >
              Live GHL API
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "flex-end" }}>
          {!isSimulated && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>GHL API Access Token (v2):</label>
                <input
                  type="password"
                  placeholder="Enter GHL Bearer Access Token..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  style={{ width: "100%", padding: "0.45rem 0.75rem", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)", fontSize: "0.82rem" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>Location ID:</label>
                <input
                  type="text"
                  placeholder="Enter GHL Location ID..."
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  style={{ width: "100%", padding: "0.45rem 0.75rem", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)", fontSize: "0.82rem" }}
                />
              </div>
            </>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>Select Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: "100%", padding: "0.45rem 0.75rem", borderRadius: "8px", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)", fontSize: "0.82rem" }}
            />
          </div>

          <div>
            <button
              onClick={handlePullConversations}
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.55rem 1.25rem",
                borderRadius: "8px",
                background: "var(--primary)",
                color: "white",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "0.85rem",
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin"></i> Pulling Threads...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-down"></i> Pull GHL Conversations
                </>
              )}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ color: "var(--danger)", fontSize: "0.8rem", marginTop: "0.75rem", background: "rgba(239, 68, 68, 0.08)", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.2)" }}>
            <i className="fa-solid fa-circle-exclamation"></i> {errorMsg}
          </div>
        )}
      </section>

      {/* ── 3-Column Chat Browser Workspace ──────────────────────────────────── */}
      {conversations.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "240px 320px 1fr", gap: "1.25rem", height: "650px", alignItems: "stretch" }}>
          
          {/* Column 1: Agent selector */}
          <section className="card" style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 800, marginTop: 0, marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
              Agents Handling Chats
            </h3>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {Object.keys(agentsMap).map((agName) => {
                const agConvs = agentsMap[agName];
                const isActive = activeAgent === agName;
                return (
                  <button
                    key={agName}
                    onClick={() => {
                      setActiveAgent(agName);
                      setActiveConv(agConvs[0] || null);
                    }}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.6rem 0.8rem",
                      borderRadius: "8px",
                      background: isActive ? "var(--primary-light)" : "transparent",
                      border: "none",
                      color: isActive ? "var(--primary)" : "var(--text-primary)",
                      fontWeight: isActive ? 700 : 500,
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "0.84rem"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: isActive ? "var(--primary)" : "#64748b", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700 }}>
                        {agName.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px" }}>{agName}</span>
                    </div>
                    <span style={{ fontSize: "0.7rem", background: isActive ? "var(--primary)" : "rgba(255,255,255,0.08)", color: isActive ? "white" : "var(--text-secondary)", padding: "2px 6px", borderRadius: "10px", fontWeight: 700 }}>
                      {agConvs.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Column 2: Contacts/Threads list */}
          <section className="card" style={{ display: "flex", flexDirection: "column", padding: "1rem" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 800, marginTop: 0, marginBottom: "0.75rem", paddingBottom: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
              Conversations ({activeAgentConvs.length})
            </h3>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activeAgentConvs.map((conv) => {
                const badge = getChannelBadge(conv.channel);
                const isActive = activeConv && activeConv.id === conv.id;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConv(conv)}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      background: isActive ? "rgba(var(--primary-rgb, 14), 165, 233, 0.06)" : "transparent",
                      border: isActive ? "1px solid var(--primary)" : "1px solid var(--card-border)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px" }}>
                        {conv.fullName}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                        {conv.lastTime}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.76rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", wordBreak: "break-all" }}>
                      {conv.lastMessage}
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "2px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.64rem", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, ...badge.style }}>
                        {badge.icon} {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Column 3: Chat Viewer */}
          {activeConv ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "1.25rem", height: "100%", alignItems: "stretch" }}>
              
              {/* Message stream panel */}
              <section className="card" style={{ display: "flex", flexDirection: "column", padding: "1rem", overflow: "hidden" }}>
                {/* Chat window Header */}
                <div style={{ borderBottom: "1px solid var(--card-border)", paddingBottom: "0.75rem", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "0.96rem", fontWeight: 800 }}>{activeConv.fullName}</h3>
                    <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>Assigned to {activeConv.agentName}</span>
                  </div>
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", fontSize: "0.7rem", padding: "3px 8px", borderRadius: "6px", fontWeight: 700, ...getChannelBadge(activeConv.channel).style }}>
                      {getChannelBadge(activeConv.channel).icon} {getChannelBadge(activeConv.channel).label} Thread
                    </span>
                  </div>
                </div>

                {/* Message logs area */}
                <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", paddingRight: "0.5rem", marginBottom: "0.5rem" }}>
                  {activeConv.messages && activeConv.messages.length > 0 ? (
                    activeConv.messages.map((m) => {
                      if (m.isCallEvent) {
                        const isAnswered = m.callStatus === "Answered";
                        const callColor = isAnswered ? "var(--success)" : "var(--danger)";
                        return (
                          <div
                            key={m.id}
                            style={{
                              alignSelf: "center",
                              width: "85%",
                              margin: "0.5rem 0",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center"
                            }}
                          >
                            <div
                              style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "0.6rem 1rem",
                                borderRadius: "10px",
                                background: "rgba(0, 0, 0, 0.15)",
                                border: `1px solid ${isAnswered ? "rgba(113, 167, 88, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                                color: "var(--text-primary)",
                                fontSize: "0.82rem"
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <i className="fa-solid fa-phone" style={{ color: callColor, transform: m.direction === "inbound" ? "none" : "scaleX(-1)" }}></i>
                                <span style={{ fontWeight: 700 }}>
                                  {m.direction === "inbound" ? "Inbound Call" : "Outbound Call"}
                                </span>
                                <span style={{ color: callColor, fontWeight: 700, fontSize: "0.72rem", background: isAnswered ? "rgba(113, 167, 88, 0.12)" : "rgba(239, 68, 68, 0.12)", padding: "1px 6px", borderRadius: "4px", textTransform: "uppercase" }}>
                                  {m.callStatus}
                                </span>
                              </div>
                              <div style={{ color: "var(--text-secondary)", fontSize: "0.76rem" }}>
                                Duration: <strong style={{ color: "var(--text-primary)" }}>{m.callDuration}</strong>
                              </div>
                            </div>
                            {m.recordingUrl && (
                              <div style={{ width: "100%", marginTop: "0.5rem", background: "rgba(0,0,0,0.12)", borderRadius: "8px", padding: "0.6rem 0.8rem", display: "flex", flexDirection: "column", gap: "0.4rem", border: "1px solid var(--card-border)" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                  <i className="fa-solid fa-headphones" style={{ color: "var(--primary)" }}></i> Call Recording Audio:
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", width: "100%" }}>
                                  <audio src={m.recordingUrl} controls style={{ flex: 1, height: "30px", minWidth: "150px" }} />
                                  <a
                                    href={m.recordingUrl}
                                    download={`recording-${m.id}.mp3`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      padding: "0.35rem 0.65rem",
                                      background: "var(--primary)",
                                      color: "white",
                                      borderRadius: "6px",
                                      fontSize: "0.72rem",
                                      textDecoration: "none",
                                      fontWeight: 700,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.2rem",
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    <i className="fa-solid fa-download"></i> Download
                                  </a>
                                </div>
                              </div>
                            )}
                            <span style={{ fontSize: "0.64rem", color: "var(--text-secondary)", marginTop: "3px" }}>
                              {m.timestamp} BST
                            </span>
                          </div>
                        );
                      }

                      const isAgent = m.direction === "outbound";
                      return (
                        <div
                          key={m.id}
                          style={{
                            alignSelf: isAgent ? "flex-end" : "flex-start",
                            maxWidth: "75%",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isAgent ? "flex-end" : "flex-start"
                          }}
                        >
                          <div
                            style={{
                              padding: "0.55rem 0.85rem",
                              borderRadius: isAgent ? "14px 14px 2px 14px" : "14px 14px 14px 2px",
                              background: isAgent ? "var(--primary)" : "rgba(255,255,255,0.06)",
                              border: isAgent ? "none" : "1px solid var(--card-border)",
                              color: isAgent ? "white" : "var(--text-primary)",
                              fontSize: "0.84rem",
                              lineHeight: 1.4,
                              wordBreak: "break-word"
                            }}
                          >
                            {m.body}
                          </div>
                          <span style={{ fontSize: "0.64rem", color: "var(--text-secondary)", marginTop: "3px", padding: "0 4px" }}>
                            {m.timestamp} {isAgent ? `· Sent by ${activeConv.agentName}` : ""}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-secondary)", gap: "0.5rem" }}>
                      <i className="fa-solid fa-circle-question" style={{ fontSize: "2rem" }}></i>
                      <span>No conversation bubbles found for this thread today.</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </section>

              {/* Sidebar with contact details */}
              <section className="card" style={{ display: "flex", flexDirection: "column", padding: "1.25rem", gap: "1rem" }}>
                <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-secondary)", fontWeight: 800, margin: 0, paddingBottom: "0.5rem", borderBottom: "1px solid var(--card-border)" }}>
                  Contact Details
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700 }}>FULL NAME:</span>
                  <span style={{ fontSize: "0.86rem", fontWeight: 750, color: "var(--text-primary)" }}>{activeConv.fullName}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700 }}>PHONE NUMBER:</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontFamily: "monospace" }}>{activeConv.phone}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700 }}>EMAIL ADDRESS:</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-primary)", wordBreak: "break-all" }}>{activeConv.email}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700 }}>ASSIGNED AGENT:</span>
                  <span style={{ fontSize: "0.84rem", color: "var(--primary)", fontWeight: 700 }}>{activeConv.agentName}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700 }}>CONVERSATION ID:</span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", wordBreak: "break-all", fontFamily: "monospace" }}>{activeConv.id}</span>
                </div>
              </section>

            </div>
          ) : (
            <section className="card" style={{ gridColumn: "3 / 4", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
              <i className="fa-solid fa-message animate-pulse" style={{ fontSize: "3rem", color: "var(--primary-light)", marginBottom: "1rem" }}></i>
              <h3>Select a Conversation</h3>
              <p style={{ maxWidth: "300px", textAlign: "center", fontSize: "0.82rem" }}>Choose any contact from the thread list on the left to read messages and check contact metadata.</p>
            </section>
          )}

        </div>
      ) : (
        <section className="card" style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <i className="fa-solid fa-comments-dollar" style={{ fontSize: "4rem", color: "rgba(255,255,255,0.05)" }}></i>
          <h3>No Conversations Loaded Yet</h3>
          <p style={{ maxWidth: "420px", fontSize: "0.85rem", margin: 0 }}>Configure simulated mode or key in your sub-account credentials above, then click <strong>Pull GHL Conversations</strong> to load threads.</p>
        </section>
      )}
    </div>
  );
}

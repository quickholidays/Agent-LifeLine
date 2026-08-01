"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mergeRawStats } from "@/utils/analysisEngine";

export default function ManageAgentsWorkspace({
  agents,
  rawAnalysisData,
  reportDate,
  saveReportData
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingAgent, setEditingAgent] = useState(null); // name of the agent currently being edited
  const [editName, setEditName] = useState("");
  const [agentToDelete, setAgentToDelete] = useState(null);
  const [showConfirm1, setShowConfirm1] = useState(false);
  const [showConfirm2, setShowConfirm2] = useState(false);
  
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error' | 'loading', text: string }
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [sourceAgent, setSourceAgent] = useState("");
  const [targetType, setTargetType] = useState("existing"); // "existing" | "new"
  const [targetAgent, setTargetAgent] = useState("");
  const [newTargetName, setNewTargetName] = useState("");

  // Filter agents based on search
  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditing = (agentName) => {
    setEditingAgent(agentName);
    setEditName(agentName);
  };

  const cancelEditing = () => {
    setEditingAgent(null);
    setEditName("");
  };

  const handleEditSave = async (oldName) => {
    const trimmedNewName = editName.trim();
    if (!trimmedNewName) {
      setStatusMessage({ type: "error", text: "Agent name cannot be empty." });
      return;
    }
    if (trimmedNewName.toLowerCase() === oldName.toLowerCase()) {
      setEditingAgent(null);
      return;
    }

    // Check if new name already exists
    const nameExists = agents.some(
      (a) => a.name.toLowerCase() === trimmedNewName.toLowerCase() && a.name.toLowerCase() !== oldName.toLowerCase()
    );
    if (nameExists) {
      setStatusMessage({ type: "error", text: `An agent named "${trimmedNewName}" already exists.` });
      return;
    }

    setStatusMessage({ type: "loading", text: "Updating agent name..." });

    try {
      const updatedData = { ...rawAnalysisData };

      // 1. Rename in agents list/dictionary
      if (updatedData.agents) {
        if (Array.isArray(updatedData.agents)) {
          updatedData.agents = updatedData.agents.map((stats) => {
            const statsName = stats.name || stats.name_raw;
            if (statsName && statsName.toLowerCase() === oldName.toLowerCase()) {
              return { ...stats, name: trimmedNewName, name_raw: trimmedNewName };
            }
            return stats;
          });
        } else if (typeof updatedData.agents === "object") {
          const agentsObj = { ...updatedData.agents };
          // Find key (could be case mismatch)
          const matchedKey = Object.keys(agentsObj).find(
            (k) => k.toLowerCase() === oldName.toLowerCase()
          );
          if (matchedKey) {
            const agentStats = agentsObj[matchedKey];
            delete agentsObj[matchedKey];
            agentsObj[trimmedNewName] = {
              ...agentStats,
              name: trimmedNewName,
              name_raw: trimmedNewName
            };
          }
          updatedData.agents = agentsObj;
        }
      } else if (Array.isArray(updatedData)) {
        // If the whole root is an array of agents
        // We'll update the root level array in saveReportData
      }

      // 2. Rename in calls
      if (Array.isArray(updatedData.calls)) {
        updatedData.calls = updatedData.calls.map((c) => {
          if (c.agent && c.agent.toLowerCase() === oldName.toLowerCase()) {
            return { ...c, agent: trimmedNewName };
          }
          return c;
        });
      }
      if (Array.isArray(updatedData.bstCallsList)) {
        updatedData.bstCallsList = updatedData.bstCallsList.map((c) => {
          if (c.agent && c.agent.toLowerCase() === oldName.toLowerCase()) {
            return { ...c, agent: trimmedNewName };
          }
          return c;
        });
      }

      // 3. Rename in audit_logs
      if (Array.isArray(updatedData.audit_logs)) {
        updatedData.audit_logs = updatedData.audit_logs.map((act) => {
          if (act.agent && act.agent.toLowerCase() === oldName.toLowerCase()) {
            return { ...act, agent: trimmedNewName };
          }
          return act;
        });
      }
      if (Array.isArray(updatedData.bstUpdatesList)) {
        updatedData.bstUpdatesList = updatedData.bstUpdatesList.map((act) => {
          if (act.agent && act.agent.toLowerCase() === oldName.toLowerCase()) {
            return { ...act, agent: trimmedNewName };
          }
          return act;
        });
      }

      // 4. Rename in GHL messages
      const renameMessages = (msgs) => {
        if (!Array.isArray(msgs)) return msgs;
        return msgs.map((m) => {
          if (m.agent && m.agent.toLowerCase() === oldName.toLowerCase()) {
            return { ...m, agent: trimmedNewName };
          }
          if (m.agent_name && m.agent_name.toLowerCase() === oldName.toLowerCase()) {
            return { ...m, agent_name: trimmedNewName };
          }
          return m;
        });
      };

      if (updatedData.ghl_outbound_messages) {
        updatedData.ghl_outbound_messages = renameMessages(updatedData.ghl_outbound_messages);
      }
      if (updatedData.ghlMessages) {
        updatedData.ghlMessages = renameMessages(updatedData.ghlMessages);
      }

      // Call save handler
      await saveReportData(updatedData);

      setStatusMessage({ type: "success", text: `Successfully renamed agent from "${oldName}" to "${trimmedNewName}".` });
      setEditingAgent(null);
    } catch (err) {
      setStatusMessage({ type: "error", text: `Failed to update agent: ${err.message}` });
    }
  };

  const initiateDelete = (agentName) => {
    setAgentToDelete(agentName);
    setShowConfirm1(true);
  };

  const cancelDelete = () => {
    setAgentToDelete(null);
    setShowConfirm1(false);
    setShowConfirm2(false);
  };

  const proceedToDeleteStep2 = () => {
    setShowConfirm1(false);
    setShowConfirm2(true);
  };

  const executeDelete = async () => {
    if (!agentToDelete) return;

    setStatusMessage({ type: "loading", text: `Deleting agent "${agentToDelete}" and all records...` });
    setShowConfirm2(false);

    try {
      const updatedData = { ...rawAnalysisData };

      // 1. Remove from agents list/dictionary
      if (updatedData.agents) {
        if (Array.isArray(updatedData.agents)) {
          updatedData.agents = updatedData.agents.filter((stats) => {
            const statsName = stats.name || stats.name_raw;
            return !statsName || statsName.toLowerCase() !== agentToDelete.toLowerCase();
          });
        } else if (typeof updatedData.agents === "object") {
          const agentsObj = { ...updatedData.agents };
          const matchedKey = Object.keys(agentsObj).find(
            (k) => k.toLowerCase() === agentToDelete.toLowerCase()
          );
          if (matchedKey) {
            delete agentsObj[matchedKey];
          }
          updatedData.agents = agentsObj;
        }
      }

      // 2. Remove from calls
      if (Array.isArray(updatedData.calls)) {
        updatedData.calls = updatedData.calls.filter(
          (c) => !c.agent || c.agent.toLowerCase() !== agentToDelete.toLowerCase()
        );
      }
      if (Array.isArray(updatedData.bstCallsList)) {
        updatedData.bstCallsList = updatedData.bstCallsList.filter(
          (c) => !c.agent || c.agent.toLowerCase() !== agentToDelete.toLowerCase()
        );
      }

      // 3. Remove from audit logs
      if (Array.isArray(updatedData.audit_logs)) {
        updatedData.audit_logs = updatedData.audit_logs.filter(
          (act) => !act.agent || act.agent.toLowerCase() !== agentToDelete.toLowerCase()
        );
      }
      if (Array.isArray(updatedData.bstUpdatesList)) {
        updatedData.bstUpdatesList = updatedData.bstUpdatesList.filter(
          (act) => !act.agent || act.agent.toLowerCase() !== agentToDelete.toLowerCase()
        );
      }

      // 4. Remove from messages
      const filterMessages = (msgs) => {
        if (!Array.isArray(msgs)) return msgs;
        return msgs.filter((m) => {
          const agentRef = m.agent || m.agent_name;
          return !agentRef || agentRef.toLowerCase() !== agentToDelete.toLowerCase();
        });
      };

      if (updatedData.ghl_outbound_messages) {
        updatedData.ghl_outbound_messages = filterMessages(updatedData.ghl_outbound_messages);
      }
      if (updatedData.ghlMessages) {
        updatedData.ghlMessages = filterMessages(updatedData.ghlMessages);
      }

      // Call save handler
      await saveReportData(updatedData);

      setStatusMessage({ type: "success", text: `Agent "${agentToDelete}" and all associated data have been completely deleted.` });
      setAgentToDelete(null);
    } catch (err) {
      setStatusMessage({ type: "error", text: `Failed to delete agent: ${err.message}` });
    }
  };



  const handleCombineSave = async () => {
    const src = sourceAgent;
    let target = targetType === "existing" ? targetAgent : newTargetName.trim();

    if (!src) {
      setStatusMessage({ type: "error", text: "Please select a source agent." });
      return;
    }
    if (!target) {
      setStatusMessage({ type: "error", text: "Please select or enter a target agent name." });
      return;
    }
    if (src.toLowerCase() === target.toLowerCase()) {
      setStatusMessage({ type: "error", text: "Source and target agents cannot be the same." });
      return;
    }

    setStatusMessage({ type: "loading", text: `Combining "${src}" into "${target}"...` });
    setShowCombineModal(false);

    try {
      const updatedData = { ...rawAnalysisData };

      // 1. Merge in agents list/dictionary
      if (updatedData.agents) {
        if (Array.isArray(updatedData.agents)) {
          let srcStats = null;
          let targetStats = null;
          
          updatedData.agents.forEach((stats) => {
            const statsName = stats.name || stats.name_raw;
            if (statsName && statsName.toLowerCase() === src.toLowerCase()) {
              srcStats = stats;
            }
            if (statsName && statsName.toLowerCase() === target.toLowerCase()) {
              targetStats = stats;
            }
          });

          // Filter out source agent from the list
          updatedData.agents = updatedData.agents.filter((stats) => {
            const statsName = stats.name || stats.name_raw;
            return !statsName || statsName.toLowerCase() !== src.toLowerCase();
          });

          if (srcStats) {
            if (targetStats) {
              // Merge srcStats into targetStats
              updatedData.agents = updatedData.agents.map((stats) => {
                const statsName = stats.name || stats.name_raw;
                if (statsName && statsName.toLowerCase() === target.toLowerCase()) {
                  return {
                    ...mergeRawStats(srcStats, stats),
                    name: target,
                    name_raw: target
                  };
                }
                return stats;
              });
            } else {
              // Target does not exist yet. Just rename sourceStats to target.
              const newStats = {
                ...srcStats,
                name: target,
                name_raw: target
              };
              updatedData.agents.push(newStats);
            }
          }
        } else if (typeof updatedData.agents === "object") {
          const agentsObj = { ...updatedData.agents };
          
          const srcKey = Object.keys(agentsObj).find(k => k.toLowerCase() === src.toLowerCase());
          const targetKey = Object.keys(agentsObj).find(k => k.toLowerCase() === target.toLowerCase());

          const srcStats = srcKey ? agentsObj[srcKey] : null;
          const targetStats = targetKey ? agentsObj[targetKey] : null;

          if (srcKey) {
            delete agentsObj[srcKey];
          }

          if (srcStats) {
            if (targetStats) {
              agentsObj[targetKey || target] = {
                ...mergeRawStats(srcStats, targetStats),
                name: target,
                name_raw: target
              };
            } else {
              agentsObj[target] = {
                ...srcStats,
                name: target,
                name_raw: target
              };
            }
          }
          updatedData.agents = agentsObj;
        }
      }

      // 2. Rename agent in calls / bstCallsList
      if (Array.isArray(updatedData.calls)) {
        updatedData.calls = updatedData.calls.map((c) => {
          if (c.agent && c.agent.toLowerCase() === src.toLowerCase()) {
            return { ...c, agent: target };
          }
          return c;
        });
      }
      if (Array.isArray(updatedData.bstCallsList)) {
        updatedData.bstCallsList = updatedData.bstCallsList.map((c) => {
          if (c.agent && c.agent.toLowerCase() === src.toLowerCase()) {
            return { ...c, agent: target };
          }
          return c;
        });
      }

      // 3. Rename agent in audit_logs / bstUpdatesList
      if (Array.isArray(updatedData.audit_logs)) {
        updatedData.audit_logs = updatedData.audit_logs.map((act) => {
          if (act.agent && act.agent.toLowerCase() === src.toLowerCase()) {
            return { ...act, agent: target };
          }
          return act;
        });
      }
      if (Array.isArray(updatedData.bstUpdatesList)) {
        updatedData.bstUpdatesList = updatedData.bstUpdatesList.map((act) => {
          if (act.agent && act.agent.toLowerCase() === src.toLowerCase()) {
            return { ...act, agent: target };
          }
          return act;
        });
      }

      // 4. Rename agent in GHL messages
      const renameMessages = (msgs) => {
        if (!Array.isArray(msgs)) return msgs;
        return msgs.map((m) => {
          if (m.agent && m.agent.toLowerCase() === src.toLowerCase()) {
            return { ...m, agent: target };
          }
          if (m.agent_name && m.agent_name.toLowerCase() === src.toLowerCase()) {
            return { ...m, agent_name: target };
          }
          return m;
        });
      };

      if (updatedData.ghl_outbound_messages) {
        updatedData.ghl_outbound_messages = renameMessages(updatedData.ghl_outbound_messages);
      }
      if (updatedData.ghlMessages) {
        updatedData.ghlMessages = renameMessages(updatedData.ghlMessages);
      }

      // Call save handler
      await saveReportData(updatedData);

      setStatusMessage({
        type: "success",
        text: `Successfully combined "${src}" into "${target}".`
      });
      
      // Reset state
      setSourceAgent("");
      setTargetAgent("");
      setNewTargetName("");
      setTargetType("existing");
    } catch (err) {
      setStatusMessage({ type: "error", text: `Failed to combine agents: ${err.message}` });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Search & Actions Header Card */}
      <section className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <i className="fa-solid fa-users-gear" style={{ color: "var(--primary)" }}></i> Manage Agent Records
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0.2rem 0 0 0" }}>
              Renaming or deleting agents will update all metrics, calls, actions, and chat logs for <strong>{reportDate}</strong>.
            </p>
          </div>
          
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => {
                setShowCombineModal(true);
                if (filteredAgents.length > 0) {
                  setSourceAgent(filteredAgents[0].name);
                }
              }}
              style={{
                padding: "0.65rem 1.25rem",
                borderRadius: "30px",
                background: "var(--primary-glow)",
                border: "1px solid var(--primary)",
                color: "var(--text-primary)",
                fontSize: "0.88rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--primary)";
                e.currentTarget.style.color = "var(--bg-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--primary-glow)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
            >
              <i className="fa-solid fa-code-merge"></i> Combine Agents
            </button>
            <div style={{ position: "relative", minWidth: "260px" }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: "0.9rem" }}></i>
              <input
                type="text"
                placeholder="Search agent name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.65rem 1rem 0.65rem 2.5rem",
                  borderRadius: "30px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                  color: "var(--text-primary)",
                  fontSize: "0.88rem",
                  outline: "none"
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main List Card */}
      <section className="card table-card" style={{ padding: "1.5rem" }}>
        <div className="table-container">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                <th style={{ textAlign: "left", padding: "1rem" }}>AGENT NAME</th>
                <th style={{ textAlign: "center", padding: "1rem" }}>ACTIONS RECORDED</th>
                <th style={{ textAlign: "center", padding: "1rem" }}>CALLS LOGGED</th>
                <th style={{ textAlign: "right", padding: "1rem" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent) => {
                const isEditing = editingAgent === agent.name;
                return (
                  <tr key={agent.name} style={{ borderBottom: "1px solid var(--card-border)", transition: "all 0.2s" }} className="table-row-hover">
                    <td style={{ padding: "1rem" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            style={{
                              padding: "0.4rem 0.8rem",
                              borderRadius: "6px",
                              background: "var(--input-bg)",
                              border: "1px solid var(--primary)",
                              color: "var(--text-primary)",
                              fontSize: "0.9rem",
                              outline: "none",
                              width: "200px"
                            }}
                            autoFocus
                          />
                          <button
                            onClick={() => handleEditSave(agent.name)}
                            style={{
                              padding: "0.4rem 0.8rem",
                              background: "var(--success)",
                              color: "var(--bg-color)",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: 700
                            }}
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                          <button
                            onClick={cancelEditing}
                            style={{
                              padding: "0.4rem 0.8rem",
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid var(--card-border)",
                              color: "var(--text-primary)",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.8rem"
                            }}
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{agent.name}</span>
                      )}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center", color: "var(--primary)", fontWeight: 700 }}>
                      {agent.actions}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center", color: "var(--text-secondary)" }}>
                      {agent.calls?.length || 0}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      {!isEditing && (
                        <div style={{ display: "inline-flex", gap: "0.6rem" }}>
                          <button
                            onClick={() => startEditing(agent.name)}
                            style={{
                              padding: "0.45rem 0.95rem",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              borderRadius: "8px",
                              border: "1px solid var(--card-border)",
                              background: "rgba(255,255,255,0.03)",
                              color: "var(--text-primary)",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "var(--primary)";
                              e.currentTarget.style.backgroundColor = "var(--primary-glow)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "var(--card-border)";
                              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";
                            }}
                            title="Rename Agent"
                          >
                            <i className="fa-solid fa-pen-to-square"></i> Rename
                          </button>
                          <button
                            onClick={() => initiateDelete(agent.name)}
                            style={{
                              padding: "0.45rem 0.75rem",
                              backgroundColor: "var(--danger-glow)",
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                              color: "var(--danger)",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.25)"}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--danger-glow)"}
                          >
                            <i className="fa-solid fa-trash-can"></i> Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              
              {filteredAgents.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                    <i className="fa-solid fa-users-slash" style={{ fontSize: "2rem", marginBottom: "0.8rem", display: "block" }}></i>
                    No agents matched your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Status Toasts/Dialogs */}
      {statusMessage && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          padding: "1rem 1.5rem",
          borderRadius: "12px",
          backgroundColor: statusMessage.type === "success" 
            ? "var(--success-glow)" 
            : statusMessage.type === "error" 
              ? "var(--danger-glow)" 
              : "var(--primary-glow)",
          border: `1px solid ${statusMessage.type === "success" 
            ? "var(--success)" 
            : statusMessage.type === "error" 
              ? "var(--danger)" 
              : "var(--primary)"}`,
          color: "var(--text-primary)",
          boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
          zIndex: 100001,
          display: "flex",
          alignItems: "center",
          gap: "0.8rem",
          animation: "popupSlideUp 0.3s ease-out"
        }}>
          {statusMessage.type === "loading" && <i className="fa-solid fa-circle-notch fa-spin"></i>}
          {statusMessage.type === "success" && <i className="fa-solid fa-circle-check" style={{ color: "var(--success)" }}></i>}
          {statusMessage.type === "error" && <i className="fa-solid fa-circle-xmark" style={{ color: "var(--danger)" }}></i>}
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{statusMessage.text}</span>
          {statusMessage.type !== "loading" && (
            <button 
              onClick={() => setStatusMessage(null)}
              style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", marginLeft: "0.5rem" }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>
      )}

      {/* ==================== DELETE MODAL 1 ==================== */}
      <AnimatePresence>
        {showConfirm1 && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000
          }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card" 
              style={{
                width: "min(400px, 90%)",
                padding: "2rem",
                borderRadius: "16px",
                border: "1px solid var(--card-border)",
                backgroundColor: "var(--card-bg)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  backgroundColor: "var(--danger-glow)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--danger)"
                }}>
                  <i className="fa-solid fa-triangle-exclamation fa-lg"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Delete Agent?</h3>
              </div>

              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
                Are you sure you want to delete the record for <strong>{agentToDelete}</strong>?
              </p>

              <div style={{ display: "flex", gap: "0.8rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  onClick={cancelDelete}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    border: "1px solid var(--card-border)",
                    backgroundColor: "transparent",
                    color: "var(--text-primary)"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={proceedToDeleteStep2}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    border: "none",
                    backgroundColor: "var(--danger)",
                    color: "#ffffff"
                  }}
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== DELETE MODAL 2 (Double confirmation) ==================== */}
      <AnimatePresence>
        {showConfirm2 && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100005
          }}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card" 
              style={{
                width: "min(440px, 90%)",
                padding: "2.2rem 2rem",
                borderRadius: "16px",
                border: "2px solid var(--danger)",
                backgroundColor: "var(--card-bg)",
                boxShadow: "0 25px 50px rgba(0, 0, 0, 0.6)",
                display: "flex",
                flexDirection: "column",
                gap: "1.4rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                <div style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--danger)",
                  border: "1px solid var(--danger)"
                }}>
                  <i className="fa-solid fa-skull-crossbones fa-lg fa-bounce"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 900, color: "var(--danger)" }}>Final Confirmation</h3>
              </div>

              <div style={{ fontSize: "0.92rem", lineHeight: 1.5, color: "var(--text-primary)" }}>
                <p style={{ margin: "0 0 0.8rem 0" }}>
                  This is a **destructive operation** and cannot be undone.
                </p>
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                  Do you want to delete this record? This will completely erase <strong>{agentToDelete}</strong> along with all of their calls, audit logs, and outbound messages from today&apos;s report.
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.8rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  onClick={cancelDelete}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    border: "1px solid var(--card-border)",
                    backgroundColor: "transparent",
                    color: "var(--text-primary)"
                  }}
                >
                  No, Keep Agent
                </button>
                <button
                  onClick={executeDelete}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    border: "none",
                    backgroundColor: "var(--danger)",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
                  }}
                >
                  Yes, Delete Completely
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== COMBINE MODAL ==================== */}
      <AnimatePresence>
        {showCombineModal && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(5px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100000
          }}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="card" 
              style={{
                width: "min(460px, 90%)",
                padding: "2rem",
                borderRadius: "16px",
                border: "1px solid var(--card-border)",
                backgroundColor: "var(--card-bg)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "1.2rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "10px",
                  backgroundColor: "var(--primary-glow)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary)"
                }}>
                  <i className="fa-solid fa-code-merge fa-lg"></i>
                </div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>Combine Agents</h3>
              </div>

              <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
                Merge all metrics, calls, audit logs, and messages from a source agent into a target agent. The source agent will be removed.
              </p>

              {/* Source Agent Field */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>SOURCE AGENT</label>
                <select
                  value={sourceAgent}
                  onChange={(e) => setSourceAgent(e.target.value)}
                  style={{
                    padding: "0.65rem 0.8rem",
                    borderRadius: "8px",
                    background: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  <option value="" disabled>Select Source Agent...</option>
                  {agents.map((a) => (
                    <option key={a.name} value={a.name}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Target Type choice */}
              <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginTop: "0.2rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.88rem" }}>
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "existing"}
                    onChange={() => setTargetType("existing")}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  Merge into Existing Agent
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.88rem" }}>
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === "new"}
                    onChange={() => setTargetType("new")}
                    style={{ accentColor: "var(--primary)" }}
                  />
                  Merge into New Name
                </label>
              </div>

              {/* Target Agent Field */}
              {targetType === "existing" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>TARGET AGENT</label>
                  <select
                    value={targetAgent}
                    onChange={(e) => setTargetAgent(e.target.value)}
                    style={{
                      padding: "0.65rem 0.8rem",
                      borderRadius: "8px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                      outline: "none",
                      cursor: "pointer"
                    }}
                  >
                    <option value="" disabled>Select Target Agent...</option>
                    {agents
                      .filter((a) => a.name.toLowerCase() !== sourceAgent.toLowerCase())
                      .map((a) => (
                        <option key={a.name} value={a.name}>{a.name}</option>
                      ))}
                  </select>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>NEW AGENT NAME</label>
                  <input
                    type="text"
                    placeholder="Enter new agent name..."
                    value={newTargetName}
                    onChange={(e) => setNewTargetName(e.target.value)}
                    style={{
                      padding: "0.65rem 0.8rem",
                      borderRadius: "8px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--text-primary)",
                      fontSize: "0.9rem",
                      outline: "none"
                    }}
                  />
                </div>
              )}

              {/* Footer Buttons */}
              <div style={{ display: "flex", gap: "0.8rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  onClick={() => setShowCombineModal(false)}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    border: "1px solid var(--card-border)",
                    backgroundColor: "transparent",
                    color: "var(--text-primary)"
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCombineSave}
                  style={{
                    padding: "0.6rem 1.2rem",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    border: "none",
                    backgroundColor: "var(--primary)",
                    color: "var(--bg-color)"
                  }}
                >
                  Combine & Sync
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

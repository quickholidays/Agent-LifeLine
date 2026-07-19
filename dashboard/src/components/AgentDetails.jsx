"use client";

import React, { useState, useEffect, useRef } from "react";
import PieChart from "./PieChart";

export default function AgentDetails({ agent, onClose }) {
  const chartColors = ["#4f46e5", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
  
  // Interactive filters
  const [eventTypeFilter, setEventTypeFilter] = useState("all"); // all, ghl, calls
  const [ghlModuleFilter, setGhlModuleFilter] = useState("all"); // all, NOTE, OPPORTUNITY, CONTACT, etc.
  const [callDirectionFilter, setCallDirectionFilter] = useState("all"); // all, inbound, outbound, missed

  // Reset filters when agent changes
  useEffect(() => {
    setEventTypeFilter("all");
    setGhlModuleFilter("all");
    setCallDirectionFilter("all");
  }, [agent]);

  const formatSecondsToTime = (seconds) => {
    const sec = Math.round(seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const formatIsoToTime = (isoStr) => {
    const dateObj = new Date(isoStr);
    return (
      dateObj.getUTCHours().toString().padStart(2, "0") +
      ":" +
      dateObj.getUTCMinutes().toString().padStart(2, "0")
    );
  };

  const getActionSummary = (act) => {
    if (!act.details) return null;
    try {
      const details = typeof act.details === "string" ? JSON.parse(act.details) : act.details;
      
      if (act.module === "NOTE") {
        if (details.body) {
          const cleanText = details.body.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ").trim();
          return cleanText ? `Note: "${cleanText}"` : null;
        }
      }
      
      if (act.module === "OPPORTUNITY") {
        const parts = [];
        if (details.pipelineStageName) {
          parts.push(`Stage: ${details.pipelineStageName}`);
        }
        if (details.status) {
          parts.push(`Status: ${details.status}`);
        }
        if (details.source) {
          parts.push(`Source: ${details.source}`);
        }
        if (details.name) {
          parts.push(`Opp: ${details.name}`);
        }
        return parts.join(" | ") || null;
      }
      
      if (act.module === "CONTACT") {
        const parts = [];
        if (details.firstName || details.lastName) {
          parts.push(`Contact: ${[details.firstName, details.lastName].filter(Boolean).join(" ")}`);
        }
        if (details.phone) {
          parts.push(`Phone: ${details.phone}`);
        }
        if (details.email) {
          parts.push(`Email: ${details.email}`);
        }
        return parts.join(" | ") || null;
      }
    } catch (e) {
      if (typeof act.details === "string") {
        return act.details.substring(0, 50);
      }
    }
    return null;
  };

  if (!agent) {
    return (
      <section className="card details-card" id="details-panel" style={{ flex: 1 }}>
        <div id="details-default-state" className="details-empty">
          <i className="fa-solid fa-user-gear empty-icon animate-pulse"></i>
          <h3>Select an Agent</h3>
          <p>Click on any agent in the table or timeline to view detailed activity breakdown, modules focus, and break history.</p>
        </div>
      </section>
    );
  }

  const details = agent.details;
  const actionsList = details.actions_list || [];
  const callsList = agent.calls || [];

  // Combine and label all events
  const allEvents = [
    ...actionsList.map(a => ({
      ...a,
      type: "ghl",
      timeObj: new Date(a.timestamp),
    })),
    ...callsList.map(c => ({
      ...c,
      type: "calls",
      timeObj: new Date(c.timestamp),
      module: "CALL",
      action: c.direction.toUpperCase()
    }))
  ];

  // Sort events chronologically
  allEvents.sort((a, b) => a.timeObj.getTime() - b.timeObj.getTime());

  // Filter GHL modules list dynamically
  const uniqueGhlModules = Array.from(new Set(actionsList.map(a => a.module).filter(Boolean)));

  // Filter events based on active selectors
  const filteredEvents = allEvents.filter(ev => {
    // 1. Event type filter
    if (eventTypeFilter === "ghl" && ev.type !== "ghl") return false;
    if (eventTypeFilter === "calls" && ev.type !== "calls") return false;

    // 2. Module specific filter
    if (eventTypeFilter === "ghl" && ghlModuleFilter !== "all" && ev.module !== ghlModuleFilter) return false;

    // 3. Call specific filter
    if (eventTypeFilter === "calls" && callDirectionFilter !== "all") {
      if (callDirectionFilter === "missed") {
        if (ev.status === "Answered") return false;
      } else {
        if (ev.direction !== callDirectionFilter) return false;
        if (ev.status !== "Answered") return false; // answered inbound/outbound only
      }
    }

    return true;
  });

  // Calculate hourly event counts for mini graph (9:00 to 20:00)
  const hourlyCounts = Array(12).fill(0); // 9am is index 0, 8pm is index 11
  filteredEvents.forEach(ev => {
    const hr = ev.timeObj.getUTCHours(); // UTC hours correspond to BST when shift is applied
    if (hr >= 9 && hr <= 20) {
      hourlyCounts[hr - 9]++;
    }
  });
  const maxHourlyCount = Math.max(...hourlyCounts, 1);

  return (
    <section className="card details-card" id="details-panel" style={{ flex: 1, minHeight: "880px", maxHeight: "100vh", overflowY: "auto" }}>
      <div id="details-active-state" className="details-content">
        <div className="details-header">
          <div className="agent-avatar" id="agent-avatar-char" style={{ background: "var(--primary)" }}>
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div className="agent-title-info">
            <h2 id="inspect-agent-name" style={{ margin: 0 }}>{agent.name}</h2>
            <p style={{ margin: "2px 0 0 0" }}>
              <span className="badge" id="inspect-agent-opps" style={{ background: "rgba(209, 92, 46, 0.15)", color: "var(--primary)", fontWeight: 700 }}>
                {agent.opps} Opportunities
              </span>
            </p>
          </div>
          <button id="close-inspect" className="btn-close" title="Close Details" onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="details-grid">
          <div className="mini-stat-box">
            <span className="mini-title">Total Actions</span>
            <span className="mini-value" id="inspect-total-actions">{agent.actions}</span>
          </div>
          <div className="mini-stat-box">
            <span className="mini-title">Workday Span</span>
            <span className="mini-value" id="inspect-workday-span">{formatSecondsToTime(agent.span)}</span>
          </div>
          <div className="mini-stat-box">
            <span className="mini-title">Active Time</span>
            <span className="mini-value" id="inspect-active-duration">{formatSecondsToTime(agent.active)}</span>
          </div>
          <div className="mini-stat-box">
            <span className="mini-title">Total Breaks</span>
            <span className="mini-value" id="inspect-breaks-count">{agent.breaks}</span>
          </div>
        </div>

        {/* Modules focus piecharts */}
        <div className="details-section" style={{ borderTop: "1px solid var(--card-border)", paddingTop: "1rem", marginTop: "0.75rem" }}>
          <h3>
            <i className="fa-solid fa-chart-pie"></i> Modules Focus & Action Types
          </h3>
          <div className="charts-row">
            <PieChart dataDict={details.module_counts} colors={chartColors} size={130} />
            <PieChart dataDict={details.action_counts} colors={[...chartColors].reverse()} size={130} />
          </div>
        </div>

        {/* Dynamic Activity Filter Panel & Mini Activity Bar Chart */}
        <div className="details-section" style={{ borderTop: "1px solid var(--card-border)", paddingTop: "1rem", marginTop: "0.75rem" }}>
          <h3 style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span><i className="fa-solid fa-filter"></i> Per-Agent Activity Inspector</span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{filteredEvents.length} events matching</span>
          </h3>

          {/* Filtering Dropdowns */}
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", margin: "0.5rem 0" }}>
            <div style={{ flex: 1, minWidth: "110px" }}>
              <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: "4px" }}>Source:</label>
              <select 
                value={eventTypeFilter} 
                onChange={(e) => setEventTypeFilter(e.target.value)}
                style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)", fontSize: "0.78rem" }}
              >
                <option value="all">All Sources</option>
                <option value="ghl">GHL Logs</option>
                <option value="calls">Call Logs</option>
              </select>
            </div>

            {eventTypeFilter === "ghl" && (
              <div style={{ flex: 1, minWidth: "110px" }}>
                <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: "4px" }}>GHL Module:</label>
                <select 
                  value={ghlModuleFilter} 
                  onChange={(e) => setGhlModuleFilter(e.target.value)}
                  style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)", fontSize: "0.78rem" }}
                >
                  <option value="all">All Modules</option>
                  {uniqueGhlModules.map(mod => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              </div>
            )}

            {eventTypeFilter === "calls" && (
              <div style={{ flex: 1, minWidth: "110px" }}>
                <label style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: "4px" }}>Call Filter:</label>
                <select 
                  value={callDirectionFilter} 
                  onChange={(e) => setCallDirectionFilter(e.target.value)}
                  style={{ width: "100%", padding: "0.4rem", borderRadius: "6px", background: "var(--input-bg)", border: "1px solid var(--input-border)", color: "var(--text-primary)", fontSize: "0.78rem" }}
                >
                  <option value="all">All Calls</option>
                  <option value="inbound">Answered Inbound</option>
                  <option value="outbound">Answered Outbound</option>
                  <option value="missed">Missed/Failed Calls</option>
                </select>
              </div>
            )}
          </div>

          {/* Mini Hourly Activity Graph */}
          <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "0.75rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.4rem", fontWeight: 700 }}>
              HOURLY EVENT DISTRIBUTION (09:00 - 20:00 BST)
            </span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "45px", gap: "3px" }}>
              {hourlyCounts.map((cnt, idx) => {
                const percent = (cnt / maxHourlyCount) * 100;
                return (
                  <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div 
                      style={{ 
                        width: "100%", 
                        height: `${percent}%`, 
                        minHeight: cnt > 0 ? "4px" : "1px",
                        background: cnt > 0 ? "var(--primary)" : "rgba(255,255,255,0.05)",
                        borderRadius: "2px 2px 0 0",
                        transition: "height 0.2s ease"
                      }}
                      title={`${idx + 9}:00 - ${cnt} events`}
                    ></div>
                    <span style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginTop: "4px" }}>
                      {idx + 9}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Details Logs List */}
          <div style={{ maxHeight: "100px", overflowY: "auto", border: "1px solid var(--card-border)", borderRadius: "8px", background: "var(--bg-color)" }}>
            {filteredEvents.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--card-border)", background: "rgba(255,255,255,0.02)" }}>
                    <th style={{ padding: "0.5rem", textAlign: "left", color: "var(--text-secondary)" }}>Time</th>
                    <th style={{ padding: "0.5rem", textAlign: "left", color: "var(--text-secondary)" }}>Module</th>
                    <th style={{ padding: "0.5rem", textAlign: "left", color: "var(--text-secondary)" }}>Action</th>
                    <th style={{ padding: "0.5rem", textAlign: "left", color: "var(--text-secondary)" }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((ev, idx) => {
                    const isCall = ev.type === "calls";
                    let rowColor = "var(--text-primary)";
                    let statusLabel = "";

                    if (isCall) {
                      if (ev.status !== "Answered") {
                        rowColor = "var(--danger)"; // Missed is Red
                        statusLabel = " [MISSED]";
                      } else {
                        rowColor = ev.direction === "inbound" ? "var(--success)" : "var(--primary)";
                      }
                    }

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)", color: rowColor }}>
                        <td style={{ padding: "0.5rem", fontWeight: 600 }}>{formatIsoToTime(ev.timestamp)}</td>
                        <td style={{ padding: "0.5rem", fontWeight: 700 }}>{ev.module}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <span style={{ fontSize: "0.72rem", background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: "4px" }}>
                            {ev.action}{statusLabel}
                          </span>
                        </td>
                        <td style={{ padding: "0.5rem", color: "var(--text-secondary)", fontSize: "0.74rem" }}>
                          {isCall ? (
                            <span>{ev.contact_name} ({ev.duration})</span>
                          ) : (
                            <span>{getActionSummary(ev) || `${ev.action} event triggered`}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)" }}>
                No events matching this filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* Breaks Timeline */}
        <div className="details-section" style={{ borderTop: "1px solid var(--card-border)", paddingTop: "1rem", marginTop: "0.75rem" }}>
          <h3>
            <i className="fa-solid fa-mug-hot"></i> Workday Break Timeline
          </h3>
          <div className="timeline-list-container">
            <ul className="timeline-list" id="inspect-breaks-list">
              {details.breaks && details.breaks.length > 0 ? (
                details.breaks.map((b, idx) => (
                  <li key={idx}>
                    <span>
                      Break {idx + 1}: <span className="break-time">{formatIsoToTime(b.start)} - {formatIsoToTime(b.end)}</span>
                    </span>
                    <span className="break-duration">{formatSecondsToTime(b.duration)}</span>
                  </li>
                ))
              ) : (
                <li style={{ borderLeftColor: "var(--success)" }}>
                  <span style={{ color: "var(--text-secondary)" }}>No major breaks recorded.</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

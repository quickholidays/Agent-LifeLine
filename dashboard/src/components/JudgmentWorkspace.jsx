"use client";

import React, { useState, useEffect } from "react";
import JudgmentTimeline from "./JudgmentTimeline";
import PieChart from "./PieChart";

export default function JudgmentWorkspace({ agents, currentAgentName, onSelectAgent, reportDate = "2026-07-17" }) {
  const [startHour, setStartHour] = useState(0);
  const [endHour, setEndHour] = useState(24);
  const [notes, setNotes] = useState("");
  const [notesStatus, setNotesStatus] = useState("");

  const chartColors = ["#4f46e5", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];

  const activeAgent = agents.find((a) => a.name === currentAgentName) || agents[0];

  useEffect(() => {
    if (activeAgent) {
      const savedNotes = localStorage.getItem(`audit_notes_${activeAgent.name}`);
      setNotes(savedNotes || "");
      setNotesStatus("");
    }
  }, [activeAgent]);

  if (!activeAgent) {
    return (
      <div className="tab-content">
        <div className="card" style={{ padding: "3rem", textAlign: "center" }}>
          <h3>No Agent Data Available</h3>
        </div>
      </div>
    );
  }

  const formatSecondsToTime = (seconds) => {
    const sec = Math.round(seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const getAnsweredCalls = () => {
    return activeAgent.calls ? activeAgent.calls.filter((c) => c.status === "Answered").length : 0;
  };

  const handleSaveNotes = () => {
    localStorage.setItem(`audit_notes_${activeAgent.name}`, notes);
    setNotesStatus("success");
    setTimeout(() => {
      setNotesStatus("");
    }, 2000);
  };

  const getUnifiedFeed = () => {
    const feedItems = [];

    // 1. Add GHL Actions
    if (activeAgent.details.actions_list) {
      activeAgent.details.actions_list.forEach((act) => {
        feedItems.push({
          type: "action",
          timestamp: new Date(act.timestamp),
          module: act.module,
          actionName: act.action,
          data: act,
        });
      });
    }

    // 2. Add calls
    if (activeAgent.calls) {
      activeAgent.calls.forEach((call) => {
        feedItems.push({
          type: "call",
          timestamp: new Date(call.timestamp),
          contact: call.contact_name,
          duration: call.duration,
          status: call.status,
          direction: call.direction,
          data: call,
        });
      });
    }

    // 3. Sort chronologically
    feedItems.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return feedItems;
  };

  const unifiedFeed = getUnifiedFeed();

  return (
    <div id="agent-judgment-tab" className="tab-content">
      {/* Selector & Title Controls */}
      <div className="judgment-controls card">
        <div className="selector-row">
          <div className="control-group">
            <label htmlFor="judgment-agent-select">Select Agent to Inspect:</label>
            <select
              id="judgment-agent-select"
              className="dropdown-select"
              value={activeAgent.name}
              onChange={(e) => onSelectAgent(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a.name} value={a.name}>
                  {a.name} ({a.actions} actions, {a.calls ? a.calls.length : 0} calls)
                </option>
              ))}
            </select>
          </div>
          <div className="judgment-agent-badge">
            <i className="fa-solid fa-user-shield"></i> Focus Mode: Agent Judgment & Quality Audit
          </div>
        </div>
      </div>

      {/* Agent Judgment KPI Cards */}
      <section className="kpi-grid" id="judgment-kpis">
        <div className="kpi-card" id="kpi-judg-actions">
          <div className="kpi-icon">
            <i className="fa-solid fa-circle-nodes"></i>
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Audit Actions</span>
            <h3 className="kpi-value" id="val-judg-actions">
              {activeAgent.actions}
            </h3>
            <p className="kpi-subtext">Logged on GoHighLevel</p>
          </div>
        </div>
        <div className="kpi-card" id="kpi-judg-calls">
          <div className="kpi-icon">
            <i className="fa-solid fa-phone-volume"></i>
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Total Daily Calls</span>
            <h3 className="kpi-value" id="val-judg-calls">
              {activeAgent.calls ? activeAgent.calls.length : 0}
            </h3>
            <p className="kpi-subtext" id="sub-judg-calls">
              {getAnsweredCalls()} answered calls
            </p>
          </div>
        </div>
        <div className="kpi-card" id="kpi-judg-active">
          <div className="kpi-icon">
            <i className="fa-solid fa-business-time"></i>
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Net Active Hours</span>
            <h3 className="kpi-value" id="val-judg-active">
              {formatSecondsToTime(activeAgent.active)}
            </h3>
            <p className="kpi-subtext">Logged working blocks</p>
          </div>
        </div>
        <div className="kpi-card" id="kpi-judg-breaks">
          <div className="kpi-icon">
            <i className="fa-solid fa-bed"></i>
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Breaks Taken</span>
            <h3 className="kpi-value" id="val-judg-breaks">
              {activeAgent.breaks}
            </h3>
            <p className="kpi-subtext" id="sub-judg-breaks">
              {formatSecondsToTime(activeAgent.breakDuration)} total away
            </p>
          </div>
        </div>
      </section>

      {/* Agent Judgment Main Grid */}
      <div className="judgment-grid">
        {/* Left Column: Unified Timeline & Logs */}
        <div className="judgment-left" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Unified Gantt Chart with Call times */}
          <div className="card">
            <div className="card-header">
              <h2>
                <i className="fa-solid fa-chart-gantt"></i> Work Activity & Call Correlation Timeline
              </h2>
              <div className="timeline-controls-row">
                <div className="timeline-controls">
                  <label>
                    <i className="fa-solid fa-hourglass-start"></i> Start:{" "}
                    <select
                      id="judg-start-hour"
                      className="mini-select"
                      value={startHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setStartHour(val);
                        if (val >= endHour) setEndHour(Math.min(24, val + 1));
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i.toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <i className="fa-solid fa-hourglass-end"></i> End:{" "}
                    <select
                      id="judg-end-hour"
                      className="mini-select"
                      value={endHour}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setEndHour(val);
                        if (val <= startHour) setStartHour(Math.max(0, val - 1));
                      }}
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {(i + 1).toString().padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="timeline-legend">
                  <span className="legend-item">
                    <span className="legend-color legend-active"></span>Active Sessions
                  </span>
                  <span className="legend-item">
                    <span className="legend-color legend-call"></span>Phone Calls
                  </span>
                  <span className="legend-item">
                    <span className="legend-color legend-break"></span>Breaks
                  </span>
                </div>
              </div>
            </div>
            <JudgmentTimeline agent={activeAgent} startHour={startHour} endHour={endHour} reportDate={reportDate} />
            <div className="timeline-tip">
              <i className="fa-solid fa-circle-question"></i> Swimlanes separate: 1. Active Blocks & Breaks, 2. Audit Actions (Notes/Opps/Contacts), 3. Calls. Hover blocks/markers for details.
            </div>
          </div>

          {/* Chronological Unified Audit Feed */}
          <div className="card">
            <div className="card-header">
              <h2>
                <i className="fa-solid fa-list-ul"></i> Chronological Activity & Call Feed
              </h2>
              <span className="badge" id="feed-items-count">
                {unifiedFeed.length} entries
              </span>
            </div>
            <div className="unified-feed-container">
              <div className="feed-timeline" id="unified-feed">
                {unifiedFeed.length === 0 ? (
                  <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                    No logs or calls recorded.
                  </div>
                ) : (
                  unifiedFeed.map((item, idx) => {
                    const ts = item.timestamp;
                    const timeStr =
                      ts.getUTCHours().toString().padStart(2, "0") +
                      ":" +
                      ts.getUTCMinutes().toString().padStart(2, "0") +
                      ":" +
                      ts.getUTCSeconds().toString().padStart(2, "0");

                    if (item.type === "action") {
                      const modClass = `badge-${item.module.toLowerCase()}`;
                      const feedClass = `feed-action-${item.module.toLowerCase()}`;
                      let icon = "fa-circle-dot";
                      if (item.module === "NOTE") icon = "fa-note-sticky";
                      else if (item.module === "OPPORTUNITY") icon = "fa-file-invoice-dollar";
                      else if (item.module === "CONTACT") icon = "fa-address-book";

                      return (
                        <div key={`act-${idx}`} className={`feed-item ${feedClass}`}>
                          <div className="feed-icon">
                            <i className={`fa-solid ${icon}`}></i>
                          </div>
                          <div className="feed-content">
                            <div className="feed-text">
                              <h4>
                                GHL {item.module} {item.actionName}
                              </h4>
                              <p>Agent performed standard operation in HighLevel</p>
                            </div>
                            <div className="feed-meta">
                              <span className="feed-time-badge">{timeStr} UTC</span>
                              <span className={`feed-item-badge ${modClass}`}>{item.module}</span>
                            </div>
                          </div>
                        </div>
                      );
                    } else {
                      const callStatusClass = `feed-call-${item.status.toLowerCase().replace(/\s+/g, "-")}`;
                      const dirBadge = item.direction === "inbound" ? "badge-call-in" : "badge-call-out";
                      const isAnswered = item.status === "Answered";
                      const callIcon = isAnswered ? "fa-phone-flip" : "fa-phone-slash";

                      return (
                        <div key={`call-${idx}`} className={`feed-item ${callStatusClass}`}>
                          <div className="feed-icon">
                            <i className={`fa-solid ${callIcon}`}></i>
                          </div>
                          <div className="feed-content">
                            <div className="feed-text">
                              <h4>Phone Call with {item.contact || "Unknown Contact"}</h4>
                              <p>
                                Status: <strong>{item.status}</strong>{" "}
                                {isAnswered ? `| Duration: ${item.duration}` : ""}
                              </p>
                            </div>
                            <div className="feed-meta">
                              <span className="feed-time-badge">{timeStr} UTC</span>
                              <span className={`feed-item-badge ${dirBadge}`}>{item.direction}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Focus Pie Chart & Quality Assessment */}
        <div className="judgment-right" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Area of Focus (Mostly Worked) Pie Chart */}
          <div className="card">
            <div className="card-header">
              <h2>
                <i className="fa-solid fa-pie-chart"></i> Mostly Worked Area Focus
              </h2>
            </div>
            <div className="chart-wrapper-large">
              <PieChart dataDict={activeAgent.details.module_counts} colors={chartColors} size={200} />
            </div>
          </div>

          {/* Action Breakdown Pie Chart */}
          <div className="card">
            <div className="card-header">
              <h2>
                <i className="fa-solid fa-chart-column"></i> Action Types Breakdown
              </h2>
            </div>
            <div className="chart-wrapper-large">
              <PieChart dataDict={activeAgent.details.action_counts} colors={[...chartColors].reverse()} size={200} />
            </div>
          </div>

          {/* Judgment Notes Box */}
          <div className="card">
            <div className="card-header">
              <h2>
                <i className="fa-solid fa-gavel"></i> Auditor Judgment & Notes
              </h2>
            </div>
            <div className="judgment-notes-area">
              <p className="notes-tip">
                Review the unified timeline above to evaluate this agent's work continuity, break patterns, GHL audit
                trail, and phone call engagement.
              </p>
              <textarea
                id="auditor-notes"
                className="notes-textarea"
                placeholder="Type quality assessment notes here... (Saves locally in current session)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              ></textarea>
              <div className="notes-actions">
                <button id="save-notes-btn" className="btn-primary-small" onClick={handleSaveNotes}>
                  <i className="fa-solid fa-floppy-disk"></i> Save Audit Notes
                </button>
                {notesStatus === "success" && (
                  <span id="notes-status" className="status-msg success" style={{ opacity: 1, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                    <i className="fa-solid fa-circle-check"></i> Notes Saved!
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

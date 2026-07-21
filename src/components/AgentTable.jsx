"use client";

import React, { useState } from "react";

export default function AgentTable({ 
  agents, 
  selectedAgent, 
  onSelectAgent, 
  ghlMessages = [], 
  reportDate, 
  breakThresholdMinutes, 
  setBreakThresholdMinutes 
}) {
  const [sortColumn, setSortColumn] = useState("actions");
  const [sortAsc, setSortAsc] = useState(false); // Default sort desc by actions like original

  const getDynamicBreakCount = (agent, threshold) => {
    const details = agent.details || {};
    const actionsList = details.actions_list || [];
    const callsList = agent.calls || [];

    // Construct workday bounds (09:00 to 20:00) using reportDate
    const targetDateStr = reportDate || "2026-07-17";
    const parts = targetDateStr.split("-");
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const workdayStart = new Date(Date.UTC(year, month, day, 9, 0, 0));
    const workdayEnd = new Date(Date.UTC(year, month, day, 20, 0, 0));

    // Combine all activities
    const list = [
      ...actionsList.map(a => new Date(a.timestamp)),
      ...callsList.map(c => new Date(c.timestamp))
    ];

    if (ghlMessages) {
      const agentMsgs = ghlMessages.filter(m => m.agent === agent.name);
      agentMsgs.forEach(m => {
        list.push(new Date(m.time));
      });
    }

    // Sort chronologically
    list.sort((a, b) => a.getTime() - b.getTime());

    const getWorkdayClampedGap = (rawStart, rawEnd) => {
      const startMs = Math.max(rawStart.getTime(), workdayStart.getTime());
      const endMs = Math.min(rawEnd.getTime(), workdayEnd.getTime());
      if (endMs > startMs) {
        return endMs - startMs;
      }
      return 0;
    };

    let breaksCount = 0;

    // If there are no activities, the agent is on break for the entire workday
    if (list.length === 0) {
      const fullDayGap = getWorkdayClampedGap(workdayStart, workdayEnd);
      if (fullDayGap / (60 * 1000) >= threshold) {
        breaksCount++;
      }
      return breaksCount;
    }

    // 1. Initial Gap
    const initialGapMs = getWorkdayClampedGap(workdayStart, list[0]);
    if (initialGapMs / (60 * 1000) >= threshold) {
      breaksCount++;
    }

    // 2. Intermediate Gaps
    for (let i = 1; i < list.length; i++) {
      const intermediateGapMs = getWorkdayClampedGap(list[i - 1], list[i]);
      if (intermediateGapMs / (60 * 1000) >= threshold) {
        breaksCount++;
      }
    }

    // 3. Final Gap
    const finalGapMs = getWorkdayClampedGap(list[list.length - 1], workdayEnd);
    if (finalGapMs / (60 * 1000) >= threshold) {
      breaksCount++;
    }

    return breaksCount;
  };

  const formatSecondsToTime = (seconds) => {
    const sec = Math.round(seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(column);
      setSortAsc(column === "name"); // Default name to ascending, others descending
    }
  };

  const getSortedAgents = () => {
    const sorted = [...agents];
    sorted.sort((a, b) => {
      let valA, valB;
      switch (sortColumn) {
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "actions":
          valA = a.actions;
          valB = b.actions;
          break;
        case "opps":
          valA = a.opps;
          valB = b.opps;
          break;
        case "span":
          valA = a.span;
          valB = b.span;
          break;
        case "active":
          valA = a.active;
          valB = b.active;
          break;
        case "breaks":
          valA = getDynamicBreakCount(a, breakThresholdMinutes);
          valB = getDynamicBreakCount(b, breakThresholdMinutes);
          break;
        default:
          valA = a.name;
          valB = b.name;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  const getSortIcon = (column) => {
    if (sortColumn !== column) return <i className="fa-solid fa-sort"></i>;
    return sortAsc ? <i className="fa-solid fa-sort-up"></i> : <i className="fa-solid fa-sort-down"></i>;
  };

  const sortedAgents = getSortedAgents();

  return (
    <section className="card table-card" style={{ flex: 1.3 }}>
      <div className="card-header split-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <h2>
          <i className="fa-solid fa-list-check"></i> Agent Comparison Table
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700 }}>Break Threshold:</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <input
              type="number"
              min="1"
              max="1440"
              value={breakThresholdMinutes}
              onChange={(e) => {
                const val = Math.max(1, parseInt(e.target.value, 10) || 0);
                setBreakThresholdMinutes(val);
              }}
              style={{
                padding: "0.3rem 0.5rem",
                borderRadius: "6px",
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                color: "var(--text-primary)",
                fontSize: "0.78rem",
                width: "60px",
                outline: "none"
              }}
            />
            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 600 }}>min</span>
          </div>
        </div>
      </div>
      <div className="table-container">
        <table id="agent-table">
          <thead>
            <tr>
              <th onClick={() => handleSort("name")} className={`sortable ${sortColumn === "name" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Agent Name {getSortIcon("name")}
              </th>
              <th onClick={() => handleSort("actions")} className={`sortable ${sortColumn === "actions" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Actions {getSortIcon("actions")}
              </th>
              <th onClick={() => handleSort("opps")} className={`sortable ${sortColumn === "opps" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Opps {getSortIcon("opps")}
              </th>
              <th onClick={() => handleSort("span")} className={`sortable ${sortColumn === "span" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Span {getSortIcon("span")}
              </th>
              <th onClick={() => handleSort("active")} className={`sortable ${sortColumn === "active" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Net Active {getSortIcon("active")}
              </th>
              <th onClick={() => handleSort("breaks")} className={`sortable ${sortColumn === "breaks" ? (sortAsc ? "sorted-asc" : "sorted-desc") : ""}`}>
                Breaks {getSortIcon("breaks")}
              </th>
            </tr>
          </thead>
          <tbody id="agent-table-body">
            {sortedAgents.map((agent) => {
              const isSelected = selectedAgent && selectedAgent.name === agent.name;
              return (
                <tr
                  key={agent.name}
                  className={isSelected ? "selected" : ""}
                  onClick={() => onSelectAgent(agent)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{agent.name}</td>
                  <td style={{ fontWeight: 700, color: "var(--primary)" }}>{agent.actions}</td>
                  <td>{agent.opps}</td>
                  <td>{formatSecondsToTime(agent.span)}</td>
                  <td style={{ fontWeight: 700, color: "var(--success)" }}>{formatSecondsToTime(agent.active)}</td>
                  <td>
                    <span className="badge" style={{ backgroundColor: "var(--warning-glow)", color: "var(--warning)" }}>
                      {getDynamicBreakCount(agent, breakThresholdMinutes)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sortedAgents.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                  No agents found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

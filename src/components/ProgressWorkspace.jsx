"use client";

import React, { useState } from "react";

export default function ProgressWorkspace({ agents }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState("newLeads");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  const getSortedAgents = () => {
    let filtered = agents.filter((a) => a.name.toLowerCase().includes(searchQuery.toLowerCase()));

    filtered.sort((a, b) => {
      let valA, valB;
      const getVal = (agentObj, key) => {
        const seg = agentObj.segmentations || {};
        switch (key) {
          case "name":
            return agentObj.name.toLowerCase();
          case "newLeads":
            return seg.newLeads || 0;
          case "bookedLeads":
            return seg.bookedLeads || 0;
          case "apptBooked":
            return seg.apptBookedLeads || 0;
          case "closedLeads":
            return seg.closedLeads || 0;
          case "total":
            return (seg.newLeads || 0) + (seg.bookedLeads || 0) + (seg.apptBookedLeads || 0) + (seg.closedLeads || 0);
          default:
            return 0;
        }
      };

      valA = getVal(a, sortCol);
      valB = getVal(b, sortCol);

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const sortedAgents = getSortedAgents();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Search Header */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem" }}>
        <h2>
          <i className="fa-solid fa-chart-line"></i> Agent Progress & Segmentations
        </h2>
        <div className="search-box" style={{ margin: 0 }}>
          <i className="fa-solid fa-magnifying-glass search-icon"></i>
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid Comparison */}
      <section className="card">
        <div className="table-container">
          <table id="agent-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("name")} className="sortable">
                  Agent Name {sortCol === "name" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("newLeads")} className="sortable">
                  New Leads {sortCol === "newLeads" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("bookedLeads")} className="sortable">
                  Booked Leads {sortCol === "bookedLeads" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("apptBooked")} className="sortable">
                  Appt Booked {sortCol === "apptBooked" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("closedLeads")} className="sortable">
                  Closed Leads {sortCol === "closedLeads" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th onClick={() => handleSort("total")} className="sortable">
                  Leads Share & Pipeline Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAgents.map((agent) => {
                const seg = agent.segmentations || {};
                const newCount = seg.newLeads || 0;
                const bookedCount = seg.bookedLeads || 0;
                const apptCount = seg.apptBookedLeads || 0;
                const closedCount = seg.closedLeads || 0;
                const total = newCount + bookedCount + apptCount + closedCount;

                const newPct = total > 0 ? (newCount / total) * 100 : 0;
                const bookedPct = total > 0 ? (bookedCount / total) * 100 : 0;
                const apptPct = total > 0 ? (apptCount / total) * 100 : 0;
                const closedPct = total > 0 ? (closedCount / total) * 100 : 0;

                return (
                  <tr key={agent.name}>
                    <td style={{ fontWeight: 700 }}>{agent.name}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: "var(--info-glow)", color: "var(--info)" }}>
                        {newCount}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: "var(--success-glow)", color: "var(--success)" }}>
                        {bookedCount}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: "var(--warning-glow)", color: "var(--warning)" }}>
                        {apptCount}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                        {closedCount}
                      </span>
                    </td>
                    <td>
                      {total > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", width: "100%", minWidth: "150px" }}>
                          {/* Stacked Progress Bar */}
                          <div style={{ display: "flex", height: "10px", borderRadius: "5px", overflow: "hidden", background: "rgba(0,0,0,0.05)" }}>
                            <div style={{ width: `${newPct}%`, backgroundColor: "var(--info)" }} title={`New: ${newCount}`} />
                            <div style={{ width: `${bookedPct}%`, backgroundColor: "var(--success)" }} title={`Booked: ${bookedCount}`} />
                            <div style={{ width: `${apptPct}%`, backgroundColor: "var(--warning)" }} title={`Appt: ${apptCount}`} />
                            <div style={{ width: `${closedPct}%`, backgroundColor: "var(--danger)" }} title={`Closed: ${closedCount}`} />
                          </div>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                            {total} total assigned segmentations
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          No leads assigned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedAgents.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "var(--text-secondary)", padding: "2rem" }}>
                    No agent progress records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

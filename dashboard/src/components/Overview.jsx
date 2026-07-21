"use client";

import React from "react";
import PieChart from "./PieChart";

export default function Overview({ agents, stageChanges = {}, reportDate = "2026-07-17" }) {
  const [selectedAgentName, setSelectedAgentName] = React.useState("all");
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const chartColors = ["#4f46e5", "#8b5cf6", "#0ea5e9", "#71a758", "#c9b336", "#db8324", "#ef4444"];

  // Team summary aggregates
  const totalMargin = agents.reduce((sum, a) => sum + (a.margin_added_today || 0), 0);
  const totalOpps = agents.reduce((sum, a) => sum + (a.opps || 0), 0);

  const totalBooked = agents.reduce((sum, a) => sum + (a.segmentations?.bookedLeads || 0), 0);
  const totalClosed = agents.reduce((sum, a) => sum + (a.segmentations?.closedLeads || 0), 0);
  const totalApptBooked = agents.reduce((sum, a) => sum + (a.segmentations?.apptBookedLeads || 0), 0);

  const eligibleBase = totalOpps - totalClosed - totalApptBooked;
  const teamGeneralConvRate = eligibleBase > 0 ? (totalBooked / eligibleBase) * 100 : 0.0;

  const totalNewLeadsToday = agents.reduce((sum, a) => sum + (a.new_leads_today || 0), 0);
  const totalConvertedToday = agents.reduce((sum, a) => sum + (a.converted_today || 0), 0);
  const teamTodayConvRate = totalNewLeadsToday > 0 ? (totalConvertedToday / totalNewLeadsToday) * 100 : 0.0;

  // Pipeline stage changes distribution (transitions to Interested, Contacted, Visa Status etc.)
  const displayStageDistribution = stageChanges && Object.keys(stageChanges).length > 0
    ? stageChanges
    : {
        "New Leads": agents.reduce((sum, a) => sum + (a.segmentations?.newLeads || 0), 0),
        "Booked Leads": totalBooked,
        "Appt Booked": totalApptBooked,
        "Closed Leads": totalClosed,
      };

  // Source distribution
  const sourceCounts = {};
  const agentsToProcess = selectedAgentName === "all" 
    ? agents 
    : agents.filter(a => a.name === selectedAgentName);

  agentsToProcess.forEach((a) => {
    const list = a.details?.actions_list || [];
    list.forEach((act) => {
      sourceCounts[act.module] = (sourceCounts[act.module] || 0) + 1;
    });
  });

  // Support alerts checklist
  const alerts = [
    { text: "Inspect Agent 8's 08h 17m break pattern", resolved: false, label: "Break Alert" },
    { text: "Verify Agent 11's 68 assigned opportunities conversion", resolved: false, label: "Audit" },
    { text: "Check Agent 4's missed call count (23 calls total)", resolved: true, label: "System ok" },
    { text: "Standardize formatting on Agent 13's notes details", resolved: false, label: "Notes" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Cards Row (Mirroring NexaVerse layout) */}
      <div className="overview-grid">
        <div className="kpi-card overview-card-1" style={{ color: "white" }}>
          <div className="kpi-icon" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white" }}>
            <i className="fa-solid fa-dollar-sign"></i>
          </div>
          <div className="kpi-info">
            <span className="kpi-title" style={{ color: "rgba(255,255,255,0.8)" }}>Margin Generated Today</span>
            <h3 className="kpi-value">${totalMargin.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <p className="kpi-subtext" style={{ color: "rgba(255,255,255,0.7)" }}>
              {new Date(reportDate).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} BST additions
            </p>
          </div>
        </div>

        <div className="kpi-card overview-card-2" style={{ color: "#2a1209" }}>
          <div className="kpi-icon" style={{ backgroundColor: "rgba(42,18,9,0.08)", color: "#2a1209" }}>
            <i className="fa-solid fa-users"></i>
          </div>
          <div className="kpi-info">
            <span className="kpi-title" style={{ color: "rgba(42,18,9,0.7)" }}>Total Opportunity Leads</span>
            <h3 className="kpi-value">{totalOpps.toLocaleString()}</h3>
            <p className="kpi-subtext" style={{ color: "rgba(42,18,9,0.6)" }}>Opportunities database size</p>
          </div>
        </div>

        <div className="kpi-card overview-card-3" style={{ color: "white" }}>
          <div className="kpi-icon" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "white" }}>
            <i className="fa-solid fa-percent"></i>
          </div>
          <div className="kpi-info">
            <span className="kpi-title" style={{ color: "rgba(255,255,255,0.8)" }}>General Conversion Rate</span>
            <h3 className="kpi-value">{teamGeneralConvRate.toFixed(1)}%</h3>
            <p className="kpi-subtext" style={{ color: "rgba(255,255,255,0.7)" }}>Open pipeline conversion</p>
          </div>
        </div>

        <div className="kpi-card overview-card-4">
          <div className="kpi-icon" style={{ backgroundColor: "var(--primary-glow)", color: "var(--primary)" }}>
            <i className="fa-solid fa-fire-flame-curved"></i>
          </div>
          <div className="kpi-info">
            <span className="kpi-title">Today's Conversion Rate</span>
            <h3 className="kpi-value">{teamTodayConvRate.toFixed(1)}%</h3>
            <p className="kpi-subtext">Immediate conversion sprints</p>
          </div>
        </div>
      </div>

      {/* Main Charts Split */}
      <div className="dashboard-split" style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {/* Left Side: Trends Column Bar Graph (Actions vs Calls) */}
        <section className="card" style={{ flex: 1.5, minWidth: "350px" }}>
          <div className="card-header">
            <h2>
              <i className="fa-solid fa-chart-simple"></i> Agent Engagement (Actions vs Calls)
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
              marginTop: "0.5rem",
              maxHeight: "350px",
              overflowY: "auto",
              paddingRight: "0.5rem",
            }}
          >
            {agents.map((agent) => {
              const maxVal = Math.max(...agents.map((a) => a.actions + (a.calls ? a.calls.length : 0)));
              const actionPercent = (agent.actions / maxVal) * 100;
              const callsPercent = ((agent.calls ? agent.calls.length : 0) / maxVal) * 100;

              return (
                <div key={agent.name} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", fontWeight: 700 }}>
                    <span>{agent.name}</span>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {agent.actions} actions | {agent.calls ? agent.calls.length : 0} calls
                    </span>
                  </div>
                  {/* Bar tracks */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", background: "rgba(0,0,0,0.05)", borderRadius: "4px", padding: "2px" }}>
                    <div
                      style={{
                        width: `${actionPercent}%`,
                        height: "8px",
                        backgroundColor: "var(--primary)",
                        borderRadius: "2px",
                        transition: "width 0.3s ease",
                      }}
                      title="GHL Actions"
                    ></div>
                    <div
                      style={{
                        width: `${callsPercent}%`,
                        height: "8px",
                        backgroundColor: "var(--info)",
                        borderRadius: "2px",
                        transition: "width 0.3s ease",
                      }}
                      title="Phone Calls"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Side: Lead Segmentations 2x2 Grid (replacing Stage Distribution doughnut) */}
        <section className="card" style={{ flex: 1.2, minWidth: "300px" }}>
          <div className="card-header">
            <h2>
              <i className="fa-solid fa-layer-group"></i> Lead Segmentations Sums
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
            <div style={{ background: "rgba(14, 165, 233, 0.04)", border: "1px solid rgba(14, 165, 233, 0.15)", borderRadius: "12px", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700 }}>New Leads</span>
              <h3 style={{ fontSize: "2.3rem", fontWeight: 800, color: "#38bdf8", margin: 0 }}>
                {agents.reduce((sum, a) => sum + (a.segmentations?.newLeads || 0), 0)}
              </h3>
            </div>
            <div style={{ background: "rgba(113, 167, 88, 0.04)", border: "1px solid rgba(113, 167, 88, 0.15)", borderRadius: "12px", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700 }}>Booked Leads</span>
              <h3 style={{ fontSize: "2.3rem", fontWeight: 800, color: "var(--success)", margin: 0 }}>{totalBooked}</h3>
            </div>
            <div style={{ background: "rgba(201, 179, 54, 0.04)", border: "1px solid rgba(201, 179, 54, 0.15)", borderRadius: "12px", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700 }}>Appointment Booked</span>
              <h3 style={{ fontSize: "2.3rem", fontWeight: 800, color: "var(--warning)", margin: 0 }}>{totalApptBooked}</h3>
            </div>
            <div style={{ background: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.15)", borderRadius: "12px", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.5rem", textAlign: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700 }}>Closed Leads</span>
              <h3 style={{ fontSize: "2.3rem", fontWeight: 800, color: "var(--danger)", margin: 0 }}>{totalClosed}</h3>
            </div>
          </div>
        </section>
      </div>

      {/* Source breakdown bar list */}
      <section className="card" style={{ width: "100%" }}>
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <h2>
            <i className="fa-solid fa-circle-nodes"></i> Source Distribution
          </h2>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="custom-select-small"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                padding: "0.45rem 1rem",
                borderRadius: "8px",
                background: "var(--input-bg)",
                border: "1px solid var(--input-border)",
                color: "var(--text-primary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                minWidth: "160px"
              }}
            >
              <span>{selectedAgentName === "all" ? "All Agents" : selectedAgentName}</span>
              <i className={`fa-solid fa-chevron-down`} style={{ fontSize: "0.7rem", color: "var(--text-secondary)", transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "none" }}></i>
            </button>
            
            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  bottom: "105%",
                  right: 0,
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "8px",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 200,
                  minWidth: "180px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  padding: "0.3rem"
                }}
              >
                <div
                  onClick={() => {
                    setSelectedAgentName("all");
                    setDropdownOpen(false);
                  }}
                  style={{
                    padding: "0.45rem 0.75rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    fontWeight: selectedAgentName === "all" ? 700 : 500,
                    background: selectedAgentName === "all" ? "rgba(var(--primary-rgb, 14), 165, 233, 0.08)" : "transparent",
                    color: selectedAgentName === "all" ? "var(--primary)" : "var(--text-primary)",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => { if (selectedAgentName !== "all") e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                  onMouseLeave={(e) => { if (selectedAgentName !== "all") e.currentTarget.style.background = "transparent"; }}
                >
                  All Agents
                </div>
                {agents.map(a => (
                  <div
                    key={a.name}
                    onClick={() => {
                      setSelectedAgentName(a.name);
                      setDropdownOpen(false);
                    }}
                    style={{
                      padding: "0.45rem 0.75rem",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: selectedAgentName === a.name ? 700 : 500,
                      background: selectedAgentName === a.name ? "rgba(var(--primary-rgb, 14), 165, 233, 0.08)" : "transparent",
                      color: selectedAgentName === a.name ? "var(--primary)" : "var(--text-primary)",
                      transition: "all 0.15s ease"
                    }}
                    onMouseEnter={(e) => { if (selectedAgentName !== a.name) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                    onMouseLeave={(e) => { if (selectedAgentName !== a.name) e.currentTarget.style.background = "transparent"; }}
                  >
                    {a.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {Object.keys(sourceCounts).length > 0 ? (
            Object.entries(sourceCounts).map(([source, count], idx) => {
              const maxCount = Math.max(...Object.values(sourceCounts));
              const pct = (count / maxCount) * 100;
              return (
                <div key={source} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700 }}>
                    <span>{source}</span>
                    <span>{count} operations</span>
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "rgba(0,0,0,0.04)", borderRadius: "4px" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        backgroundColor: chartColors[idx % chartColors.length],
                        borderRadius: "4px",
                      }}
                    ></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              No operations recorded for {selectedAgentName === "all" ? "the team" : selectedAgentName} on this date.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

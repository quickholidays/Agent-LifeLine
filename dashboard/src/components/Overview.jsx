"use client";

import React from "react";
import PieChart from "./PieChart";

export default function Overview({ agents, stageChanges = {} }) {
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
  agents.forEach((a) => {
    const list = a.details?.actions_list || [];
    list.forEach((act) => {
      sourceCounts[act.module] = (sourceCounts[act.module] || 0) + 1;
    });
  });

  // Support alerts checklist
  const alerts = [
    { text: "Inspect Jasmine Taylor's 08h 17m break pattern", resolved: false, label: "Break Alert" },
    { text: "Verify Lisa Evans's 68 assigned opportunities conversion", resolved: false, label: "Audit" },
    { text: "Check Chris Morgan's missed call count (23 calls total)", resolved: true, label: "System ok" },
    { text: "Standardize formatting on Nancy Watson's notes details", resolved: false, label: "Notes" },
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
            <p className="kpi-subtext" style={{ color: "rgba(255,255,255,0.7)" }}>July 17 BST additions</p>
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

      {/* Support & Source Split */}
      <div className="dashboard-split" style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
        {/* Support Alerts Checklist */}
        <section className="card" style={{ flex: 1, minWidth: "300px" }}>
          <div className="card-header">
            <h2>
              <i className="fa-solid fa-list-check"></i> Quality Control Checklist
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.6rem 0.8rem",
                  background: "rgba(0,0,0,0.02)",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${alert.resolved ? "var(--success)" : "var(--primary)"}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <i
                    className={`fa-regular ${alert.resolved ? "fa-circle-check" : "fa-circle"}`}
                    style={{ color: alert.resolved ? "var(--success)" : "var(--text-secondary)" }}
                  ></i>
                  <span
                    style={{
                      fontSize: "0.82rem",
                      textDecoration: alert.resolved ? "line-through" : "none",
                      color: alert.resolved ? "var(--text-secondary)" : "var(--text-primary)",
                    }}
                  >
                    {alert.text}
                  </span>
                </div>
                <span className="badge" style={{ fontSize: "0.7rem", backgroundColor: alert.resolved ? "var(--success-glow)" : "var(--primary-glow)", color: alert.resolved ? "var(--success)" : "var(--primary)" }}>
                  {alert.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Source breakdown bar list */}
        <section className="card" style={{ flex: 1, minWidth: "300px" }}>
          <div className="card-header">
            <h2>
              <i className="fa-solid fa-circle-nodes"></i> Source Distribution
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            {Object.entries(sourceCounts).map(([source, count], idx) => {
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
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

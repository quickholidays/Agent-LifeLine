"use client";

import React from "react";

export default function KpiGrid({ agents }) {
  if (agents.length === 0) return null;

  const formatSecondsToTime = (seconds) => {
    const sec = Math.round(seconds);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  };

  // Calculations
  const totalAgents = agents.length;

  const topAgent = agents.reduce(
    (max, agent) => (agent.actions > max.actions ? agent : max),
    agents[0]
  );

  const totalActions = agents.reduce((sum, agent) => sum + agent.actions, 0);

  const totalActiveSecs = agents.reduce((sum, agent) => sum + agent.active, 0);
  const avgActiveSecs = totalActiveSecs / totalAgents;

  return (
    <section className="kpi-grid">
      <div className="kpi-card" id="kpi-total-agents">
        <div className="kpi-icon">
          <i className="fa-solid fa-users"></i>
        </div>
        <div className="kpi-info">
          <span className="kpi-title">Active Agents</span>
          <h3 className="kpi-value" id="val-total-agents">
            {totalAgents}
          </h3>
          <p className="kpi-subtext">Working on GHL today</p>
        </div>
      </div>
      <div className="kpi-card" id="kpi-most-active">
        <div className="kpi-icon">
          <i className="fa-solid fa-fire"></i>
        </div>
        <div className="kpi-info">
          <span className="kpi-title">Most Active Agent</span>
          <h3 className="kpi-value" id="val-most-active">
            {topAgent ? topAgent.name : "-"}
          </h3>
          <p className="kpi-subtext" id="sub-most-active">
            {topAgent ? `${topAgent.actions} actions` : "-"}
          </p>
        </div>
      </div>
      <div className="kpi-card" id="kpi-avg-active">
        <div className="kpi-icon">
          <i className="fa-solid fa-hourglass-half"></i>
        </div>
        <div className="kpi-info">
          <span className="kpi-title">Avg. Active Time</span>
          <h3 className="kpi-value" id="val-avg-active">
            {formatSecondsToTime(avgActiveSecs)}
          </h3>
          <p className="kpi-subtext">Focused work per agent</p>
        </div>
      </div>
      <div className="kpi-card" id="kpi-total-actions">
        <div className="kpi-icon">
          <i className="fa-solid fa-clipboard-check"></i>
        </div>
        <div className="kpi-info">
          <span className="kpi-title">Total Daily Actions</span>
          <h3 className="kpi-value" id="val-total-actions">
            {totalActions}
          </h3>
          <p className="kpi-subtext">Creates, Updates, Deletes</p>
        </div>
      </div>
    </section>
  );
}

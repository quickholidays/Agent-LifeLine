"use client";

import React from "react";
import {
  NewLeadsChart,
  ReferralsChart,
  BookedLeadsChart,
  ApptBookedLeadsChart,
  ClosedLeadsChart,
  MarginContributedChart
} from "./charts";

export default function AgentCharts({ agents }) {
  return (
    <div className="tab-content" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Title & Context Header */}
      <section className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>
          <i className="fa-solid fa-chart-bar" style={{ color: "var(--primary)", marginRight: "0.5rem" }}></i> 
          Agent Stage Progression & Booking Metrics
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
          Vertical progression analytics for each lead status segment and financial margins. Hover over any bar to review individual counts.
        </p>
      </section>

      {/* 2x2 Grid for the Lead Stages + Referrals + Margin Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(480px, 100%), 1fr))", gap: "1.5rem" }}>
        <NewLeadsChart agents={agents} />
        <ReferralsChart agents={agents} />
        <BookedLeadsChart agents={agents} />
        <ApptBookedLeadsChart agents={agents} />
        <ClosedLeadsChart agents={agents} />
        <MarginContributedChart agents={agents} />
      </div>
    </div>
  );
}

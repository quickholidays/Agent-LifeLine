"use client";

import React from "react";
import ProgressBarChart from "./ProgressBarChart";

export default function AgentCharts({ agents }) {
  // Extract and sort data for each metrics stage in descending order (highest first)
  const newLeadsData = agents
    .map(a => ({ name: a.name, value: a.segmentations?.newLeads || 0 }))
    .sort((a, b) => b.value - a.value);

  const bookedLeadsData = agents
    .map(a => ({ name: a.name, value: a.segmentations?.bookedLeads || 0 }))
    .sort((a, b) => b.value - a.value);

  const apptBookedData = agents
    .map(a => ({ name: a.name, value: a.segmentations?.apptBookedLeads || 0 }))
    .sort((a, b) => b.value - a.value);

  const closedLeadsData = agents
    .map(a => ({ name: a.name, value: a.segmentations?.closedLeads || 0 }))
    .sort((a, b) => b.value - a.value);

  const marginData = agents
    .map(a => ({ name: a.name, value: a.margin_added_today || 0 }))
    .sort((a, b) => b.value - a.value);

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

      {/* 2x2 Grid for the 4 Lead Stages + Margin Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(480px, 100%), 1fr))", gap: "1.5rem" }}>
        
        {/* 1. New Leads Chart */}
        <ProgressBarChart
          title="New Leads"
          data={newLeadsData}
          color="#3b82f6" /* themed blue */
          yLabel="Count of Opportunity"
        />

        {/* 2. Booked Leads Chart */}
        <ProgressBarChart
          title="Booked Leads"
          data={bookedLeadsData}
          color="var(--success)" /* themed green */
          yLabel="Count of Opportunity"
        />

        {/* 3. Appointment Booked Chart */}
        <ProgressBarChart
          title="Appointment Booked Leads"
          data={apptBookedData}
          color="var(--warning)" /* themed yellow */
          yLabel="Count of Opportunity"
        />

        {/* 4. Closed Leads Chart */}
        <ProgressBarChart
          title="Closed Leads"
          data={closedLeadsData}
          color="var(--danger)" /* themed red */
          yLabel="Count of Opportunity"
        />

        {/* 5. Margin Contributed Today Chart */}
        <div style={{ gridColumn: "1 / -1" }}>
          <ProgressBarChart
            title="Margin Contributed Today ($)"
            data={marginData}
            color="var(--success-glow)" /* light caramel / green theme blend */
            yLabel="Amount ($)"
            isCurrency={true}
          />
        </div>

      </div>
    </div>
  );
}

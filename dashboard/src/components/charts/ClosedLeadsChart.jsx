"use client";

import React from "react";
import ProgressBarChart from "../ProgressBarChart";

export default function ClosedLeadsChart({ agents }) {
  const data = agents
    .map(a => ({ name: a.name, value: a.segmentations?.closedLeadsToday || 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <ProgressBarChart
      title="Closed Leads"
      data={data}
      color="var(--danger)"
      yLabel="Count of Opportunity"
    />
  );
}

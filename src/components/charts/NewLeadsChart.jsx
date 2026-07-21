"use client";

import React from "react";
import ProgressBarChart from "../ProgressBarChart";

export default function NewLeadsChart({ agents }) {
  const data = agents
    .map(a => ({ name: a.name, value: a.segmentations?.newLeadsToday || 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <ProgressBarChart
      title="New Leads"
      data={data}
      color="#3b82f6"
      yLabel="Count of Opportunity"
    />
  );
}

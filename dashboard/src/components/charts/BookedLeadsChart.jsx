"use client";

import React from "react";
import ProgressBarChart from "../ProgressBarChart";

export default function BookedLeadsChart({ agents }) {
  const data = agents
    .map(a => ({ name: a.name, value: a.segmentations?.bookedLeadsToday || 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <ProgressBarChart
      title="Booked Leads"
      data={data}
      color="var(--success)"
      yLabel="Count of Opportunity"
    />
  );
}

"use client";

import React from "react";
import ProgressBarChart from "../ProgressBarChart";

export default function ApptBookedLeadsChart({ agents }) {
  const data = agents
    .map(a => ({ name: a.name, value: a.segmentations?.apptBookedLeadsToday || 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <ProgressBarChart
      title="Appointment Booked Leads"
      data={data}
      color="var(--warning)"
      yLabel="Count of Opportunity"
    />
  );
}

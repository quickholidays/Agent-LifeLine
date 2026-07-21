"use client";

import React from "react";
import ProgressBarChart from "../ProgressBarChart";

export default function ReferralsChart({ agents }) {
  const data = agents
    .map(a => ({ name: a.name, value: a.segmentations?.referralsToday || 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <ProgressBarChart
      title="Referrals"
      data={data}
      color="#818cf8"
      yLabel="Count of Opportunity"
    />
  );
}

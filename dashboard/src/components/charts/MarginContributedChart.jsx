"use client";

import React from "react";
import ProgressBarChart from "../ProgressBarChart";

export default function MarginContributedChart({ agents }) {
  const data = agents
    .map(a => ({ name: a.name, value: a.margin_added_today || 0 }))
    .sort((a, b) => b.value - a.value);

  return (
    <ProgressBarChart
      title="Margin Contributed Today (£)"
      data={data}
      color="var(--success-glow)"
      yLabel="Amount (£)"
      isCurrency={true}
    />
  );
}

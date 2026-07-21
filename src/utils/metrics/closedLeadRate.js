export function calculateClosedLeadRate(selectedAgent) {
  const seg = selectedAgent.segmentations || {};
  const denominator = (seg.newLeadsToday || 0) - (seg.referralsToday || 0);
  const closedRateVal = denominator > 0 ? (seg.closedLeadsToday / denominator) * 100 : 0;
  return `${parseFloat(closedRateVal).toFixed(1)}%`;
}

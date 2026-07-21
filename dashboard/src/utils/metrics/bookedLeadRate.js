export function calculateBookedLeadRate(selectedAgent) {
  const seg = selectedAgent.segmentations || {};
  const denominator = (seg.newLeadsToday || 0) - (seg.referralsToday || 0);
  const bookedRateVal = denominator > 0 ? (seg.bookedLeadsToday / denominator) * 100 : 0;
  return `${parseFloat(bookedRateVal).toFixed(1)}%`;
}

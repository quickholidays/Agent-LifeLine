export function calculateReferrals(selectedAgent) {
  const seg = selectedAgent.segmentations || {};
  return seg.referralsToday || 0;
}

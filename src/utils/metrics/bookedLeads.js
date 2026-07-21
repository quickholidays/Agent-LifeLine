export function calculateBookedLeads(selectedAgent) {
  const seg = selectedAgent.segmentations || {};
  return seg.bookedLeadsToday || 0;
}

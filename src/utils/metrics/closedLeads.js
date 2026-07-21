export function calculateClosedLeads(selectedAgent) {
  const seg = selectedAgent.segmentations || {};
  return seg.closedLeadsToday || 0;
}

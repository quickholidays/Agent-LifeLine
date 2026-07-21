export function calculateNewLeads(selectedAgent) {
  const seg = selectedAgent.segmentations || {};
  return seg.newLeadsToday || 0;
}

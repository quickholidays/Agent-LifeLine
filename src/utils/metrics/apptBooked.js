export function calculateApptBooked(selectedAgent) {
  const seg = selectedAgent.segmentations || {};
  return seg.apptBookedLeadsToday || 0;
}

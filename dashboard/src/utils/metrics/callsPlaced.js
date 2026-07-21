export function calculateCallsPlaced(selectedAgent) {
  const callM = selectedAgent.call_metrics || {};
  return (callM.outboundCount || 0) + (callM.inboundCount || 0);
}

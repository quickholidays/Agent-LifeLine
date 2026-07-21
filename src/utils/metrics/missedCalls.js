export function calculateMissedCalls(selectedAgent) {
  const callM = selectedAgent.call_metrics || {};
  return callM.inboundMissed || 0;
}

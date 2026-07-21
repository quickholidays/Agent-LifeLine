export function calculateInterestedStage(selectedAgent) {
  return selectedAgent.stage_interested_today || 0;
}

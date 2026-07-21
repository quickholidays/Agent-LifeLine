export function calculateContactedStage(selectedAgent) {
  return selectedAgent.stage_contacted_today || 0;
}

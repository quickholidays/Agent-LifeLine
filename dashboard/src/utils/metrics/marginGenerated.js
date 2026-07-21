export function calculateMarginGenerated(selectedAgent) {
  return selectedAgent.margin_added_today || 0;
}

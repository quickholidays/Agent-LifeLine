export function calculateInteractedLeads(selectedAgent) {
  return selectedAgent.interacted_leads_today || 0;
}

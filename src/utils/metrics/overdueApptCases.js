export function calculateOverdueApptCases(selectedAgent) {
  if (!selectedAgent) return 0;
  return selectedAgent.overdue_appt_cases_count || 0;
}

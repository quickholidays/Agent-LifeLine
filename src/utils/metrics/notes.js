export function calculateNotes(selectedAgent) {
  return selectedAgent.notes_updated_today || 0;
}

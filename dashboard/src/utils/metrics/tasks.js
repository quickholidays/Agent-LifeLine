export function calculateTasks(selectedAgent) {
  return selectedAgent.tasks_added_today || 0;
}

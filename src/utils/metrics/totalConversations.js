export function calculateTotalConversations(selectedAgentName, rawAnalysisData) {
  const allMessages = rawAnalysisData.ghl_outbound_messages || rawAnalysisData.ghlMessages || [];
  if (selectedAgentName === "All Agents") {
    const uniqueContactsMessaged = new Set(allMessages.map((m) => m.contactName));
    return uniqueContactsMessaged.size;
  }
  const agentMessages = allMessages.filter(
    (msg) => msg.agent && msg.agent.toLowerCase() === selectedAgentName.toLowerCase()
  );
  const uniqueContactsMessaged = new Set(agentMessages.map((m) => m.contactName));
  return uniqueContactsMessaged.size;
}

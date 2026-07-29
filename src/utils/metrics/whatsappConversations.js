export function calculateWhatsAppConversations(selectedAgentName, rawAnalysisData) {
  const allMessages = rawAnalysisData.ghl_outbound_messages || rawAnalysisData.ghlMessages || [];
  const whatsappMessages = allMessages.filter(m => m.type === "whatsapp");
  if (selectedAgentName === "All Agents") {
    const uniqueContactsMessaged = new Set(whatsappMessages.map((m) => m.contactName));
    return uniqueContactsMessaged.size;
  }
  const agentMessages = whatsappMessages.filter(
    (msg) => msg.agent && msg.agent.toLowerCase() === selectedAgentName.toLowerCase()
  );
  const uniqueContactsMessaged = new Set(agentMessages.map((m) => m.contactName));
  return uniqueContactsMessaged.size;
}

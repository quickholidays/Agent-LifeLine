export function calculateGeneralConversion(selectedAgent) {
  const generalRate = parseFloat(selectedAgent.general_conv_rate || 0).toFixed(1);
  return `${generalRate}%`;
}

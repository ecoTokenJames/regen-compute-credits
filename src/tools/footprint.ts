import { estimateFootprint } from "../services/estimator.js";

export async function estimateSessionFootprint(
  sessionMinutes: number,
  toolCalls?: number,
  agentMode?: boolean
) {
  const estimate = estimateFootprint(sessionMinutes, toolCalls, agentMode);

  const text = [
    `## Estimated Session Ecological Footprint`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Session duration | ${estimate.session_minutes} minutes |`,
    `| Session type | ${estimate.agent_mode ? "AI agent (e.g. Claude Code, Cursor)" : "Standard AI chat"} |`,
    `| Estimated queries | ~${estimate.estimated_queries} |`,
    `| Energy consumption | ~${estimate.energy_kwh} kWh |`,
    `| CO2 equivalent | ~${estimate.co2_kg} kg |`,
    `| Equivalent carbon credits | ~${estimate.equivalent_carbon_credits} credits |`,
    `| Estimated retirement cost | ~$${estimate.equivalent_cost_usd} |`,
    ``,
    `> **Note**: ${estimate.methodology_note}`,
    ``,
    `To fund ecological regeneration equivalent to this session's footprint, `,
    `use the \`retire_credits\` tool to retire ecocredits on Regen Network.`,
  ].join("\n");

  return { content: [{ type: "text" as const, text }] };
}

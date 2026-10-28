/** Equal split of a reward in whole Creds; any leftover Creds go to the submitter. */
export function computeSplit(reward: number, participantIds: string[], submitterId: string): Record<string, number> {
  const n = participantIds.length;
  if (n === 0) return {};
  const base = Math.floor(reward / n);
  const remainder = reward - base * n;
  const out: Record<string, number> = {};
  for (const id of participantIds) out[id] = base;
  const target = participantIds.includes(submitterId) ? submitterId : participantIds[0];
  out[target] += remainder;
  return out;
}

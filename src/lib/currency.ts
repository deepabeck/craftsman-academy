/**
 * The app's reward currency. Change the name or icon here and the shared
 * pieces (icon map, flying animation default) follow. Visible text in pages is
 * still written out inline, so search for the old name after changing it.
 * Database objects and code identifiers (points_log, get_cogs_balances,
 * awardManualCogs, ...) keep their original names on purpose.
 */
export const CURRENCY = {
  singular: "Cred",
  plural: "Creds",
  icon: "/assets/icon_creds.png",
} as const;

export function formatCreds(n: number): string {
  return `${n.toLocaleString()} ${n === 1 ? CURRENCY.singular : CURRENCY.plural}`;
}

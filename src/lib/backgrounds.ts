/**
 * Catalog of unlockable background art.
 *
 * Images live in /public/assets/unlockable-backgrounds/ as <id>.webp (1536x1024,
 * transparent, art hugging the right edge) plus <id>-thumb.webp (384x256) for the
 * collection grid. To add a background: drop both files in that folder and add a
 * line below. Students keep everything they've unlocked; new entries simply join
 * the pool of mystery unlocks.
 *
 * Safe to import from client and server code (no server-only imports here).
 */

export interface BackgroundDef {
  id: string;
  name: string;
}

export const BACKGROUNDS: BackgroundDef[] = [
  { id: "emerald-hillside", name: "Emerald Hillside" },
  { id: "autumn-forest", name: "Autumn Forest" },
  { id: "lunar-horizon", name: "Lunar Horizon" },
  { id: "lotus-pond", name: "Lotus Pond" },
  { id: "library-shelf", name: "Library Shelf" },
  { id: "snowy-cabin", name: "Snowy Cabin" },
  { id: "coral-reef", name: "Coral Reef" },
  { id: "terracotta-canyon", name: "Terracotta Canyon" },
  { id: "tropical-beach", name: "Tropical Beach" },
  { id: "rocky-mountains", name: "Rocky Mountains" },
  { id: "golden-aspens", name: "Golden Aspens" },
];

/**
 * First Monday that can earn a weekly unlock. Weeks starting before this date
 * never award a background (the weekly-bonus code re-runs for past weeks).
 */
export const BACKGROUND_UNLOCK_START = "2026-10-26";

export function backgroundUrl(id: string): string {
  return `/assets/unlockable-backgrounds/${id}.webp`;
}

export function backgroundThumbUrl(id: string): string {
  return `/assets/unlockable-backgrounds/${id}-thumb.webp`;
}

export function getBackground(id: string | null | undefined): BackgroundDef | null {
  if (!id) return null;
  return BACKGROUNDS.find((b) => b.id === id) ?? null;
}

import type { LotoDraw } from "./types.js";

// LOTO draws on Monday, Wednesday and Saturday: the longest normal gap is 3 days,
// so a week without a new draw means the FDJ source or the import is broken.
export const MAX_DRAW_AGE_DAYS = 7;

export function drawAgeDays(draws: LotoDraw[], today: Date): number {
  const latest = draws.reduce((max, draw) => draw.date > max ? draw.date : max, "");
  if (!latest) throw new Error("Dataset contains no draw.");
  return Math.floor((today.getTime() - Date.parse(`${latest}T00:00:00Z`)) / 86_400_000);
}

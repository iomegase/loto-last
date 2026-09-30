import { readFile, stat } from "node:fs/promises";
import type { Dataset } from "../frontend/model.js";
import type { Prizes } from "../frontend/model.js";
import type { LotoDraw } from "./types.js";
import { validateDataset } from "./validation.js";

export async function readFrontendData(path = "data/processed/loto-master.json"): Promise<Dataset> {
  const draws = JSON.parse(await readFile(path, "utf8")) as LotoDraw[];
  const errors = validateDataset(draws).filter(issue => issue.level === "error");
  if(errors.length) throw new Error(`Dataset invalid: ${errors[0].message}`);
  return {
    schemaVersion: 1, updatedAt: (await stat(path)).mtime.toISOString(),
    draws: draws.map(draw => ({
      id: draw.drawId, date: draw.date,
      regime: draw.ruleSet === "modern-5-plus-chance" ? "modern" : "historic",
      numbers: draw.numbers, bonus: draw.chanceNumber ?? draw.complementaryNumber!,
      second: draw.secondDraw?.numbers ?? null,
      prizes: compactPrizes(draw),
      secondPayouts: secondPayouts(draw)
    }))
  };
}

function secondPayouts(draw: LotoDraw): number[] | null {
  const tiers=[...draw.secondDraw?.prizeTiers ?? []].sort((a,b)=>a.rank-b.rank);
  if(tiers.length!==4||tiers.some((t,i)=>t.rank!==i+1||t.payout===null)) return null;
  return tiers.map(t=>t.payout!);
}

// Only the modern 9-rank grid (since March 2017) has comparable winners and payouts.
function compactPrizes(draw: LotoDraw): Prizes | null {
  if(draw.ruleSet!=="modern-5-plus-chance"||draw.prizeTiers.length!==9) return null;
  const tiers=[...draw.prizeTiers].sort((a,b)=>a.rank-b.rank);
  if(tiers.some((t,i)=>t.rank!==i+1||t.winners===null||t.payout===null)) return null;
  return { winners: tiers.map(t=>t.winners!), payouts: tiers.map(t=>t.payout!) };
}

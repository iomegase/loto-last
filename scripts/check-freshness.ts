import { readDraws } from "../src/io.js";
import { drawAgeDays, MAX_DRAW_AGE_DAYS } from "../src/freshness.js";

async function main() {
  const draws = await readDraws("data/processed/loto-master.json");
  const age = drawAgeDays(draws, new Date());
  if (age > MAX_DRAW_AGE_DAYS) throw new Error(`Latest draw is ${age} days old (max ${MAX_DRAW_AGE_DAYS}): FDJ data is not being updated.`);
  console.log(`Freshness OK: latest draw is ${age} day(s) old.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

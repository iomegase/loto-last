import assert from "node:assert/strict";
import test from "node:test";
import { drawAgeDays } from "../src/freshness.js";
import type { LotoDraw } from "../src/types.js";

test("draw age is measured from the most recent draw", () => {
  const draws = ["2026-09-26", "2026-09-28", "2026-09-23"].map(date => ({ date }) as LotoDraw);
  assert.equal(drawAgeDays(draws, new Date("2026-09-28T23:30:00Z")), 0);
  assert.equal(drawAgeDays(draws, new Date("2026-10-06T00:00:00Z")), 8);
  assert.throws(() => drawAgeDays([], new Date()), /no draw/);
});

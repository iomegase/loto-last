export type Regime = "modern" | "historic";
export type DrawKind = "main" | "second";
export type View = "overview" | "numbers" | "pairs" | "history" | "forecasts" | "guide";
export interface Draw {
  id: string;
  date: string;
  regime: Regime;
  numbers: number[];
  bonus: number;
  second: number[] | null;
  /** Main-draw winners and payouts for ranks 1–9 (modern 9-rank grid only). */
  prizes?: Prizes | null;
  /** "2nd tirage" payouts for ranks 1–4 (5, 4, 3 and 2 good numbers), since November 2019. */
  secondPayouts?: number[] | null;
}
export interface Prizes { winners: number[]; payouts: number[] }
export interface Dataset {
  schemaVersion: 1;
  updatedAt: string;
  draws: Draw[];
}
export interface Filters {
  regime: Regime;
  kind: DrawKind;
  window: "50" | "100" | "500" | "all" | "custom";
  from: string;
  to: string;
}
export interface NumberStat {
  number: number;
  count: number;
  rate: number;
  expectedRate: number;
  delta: number;
  delay: number;
  censored: boolean;
  lastDate: string | null;
}
export interface PairStat { a: number; b: number; count: number; rate: number }
export const defaults: Filters = { regime: "modern", kind: "main", window: "100", from: "", to: "" };

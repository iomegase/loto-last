import type { Draw } from "./model.js";
// Players' choices are invisible, but winner counts reveal them: when popular numbers are drawn,
// more players share the ranks with 3 good numbers relative to those with 2. Ranks: 1=5+C … 8=2, 9=0/1+C.
const SHRINK = 20;
export interface Popularity { numbers:number[]; chance:number[]; draws:number }
/** Per-number log-excess of winners (0 = average, > 0 = over-played) and share of players choosing each Chance number. */
export function popularity(draws:Draw[]):Popularity {
 const samples=draws.flatMap(d=>{
  const w=d.prizes?.winners;
  if(!w||w[4]+w[5]<=0||w[6]+w[7]<=0)return [];
  return [{numbers:d.numbers,chance:d.bonus,ratio:Math.log((w[4]+w[5])/(w[6]+w[7])),share:(w[4]+w[6])/(w[4]+w[5]+w[6]+w[7])}];
 });
 const mean=samples.reduce((s,x)=>s+x.ratio,0)/Math.max(1,samples.length);
 const sum=new Float64Array(49),seen=new Float64Array(49),chanceSum=new Float64Array(10),chanceSeen=new Float64Array(10);
 for(const x of samples){
  for(const n of x.numbers){sum[n-1]+=x.ratio-mean;seen[n-1]++;}
  chanceSum[x.chance-1]+=x.share;chanceSeen[x.chance-1]++;
 }
 // Shrinkage toward "average" keeps sparse numbers from looking extreme.
 return {
  numbers:Array.from(sum,(s,i)=>s/(seen[i]+SHRINK)),
  chance:Array.from(chanceSum,(s,i)=>(s+0.1*SHRINK)/(chanceSeen[i]+SHRINK)),
  draws:samples.length
 };
}
export function numberWeights(p:Popularity,strength=30):number[] { return p.numbers.map(s=>Math.exp(-strength*s)); }
export function chanceWeights(p:Popularity):number[] { return p.chance.map(s=>0.1/s); }
/** "2nd tirage" rank (1–4) for the same five numbers, without Chance; 0 when nothing is won. */
export function secondRank(hits:number):number { return hits>=2?6-hits:0; }
/** Maps matches to the prize rank (1–9), or 0 when the grid wins nothing. */
export function prizeRank(hits:number,chance:boolean):number {
 if(hits>=2)return (5-hits)*2+(chance?1:2);
 return chance?9:0;
}

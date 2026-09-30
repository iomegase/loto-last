import { analyzeNumbers } from "./analytics.js";
import type { Draw } from "./model.js";
import { chanceWeights, numberWeights, popularity, prizeRank, secondRank } from "./popularity.js";
export type Method = "random" | "frequency" | "delay" | "balanced" | "unpopular";
export const methods: Record<Method,string> = { random:"Hasard uniforme",frequency:"Fréquences observées",delay:"Retards observés",balanced:"Équilibre pairs / impairs",unpopular:"Numéros peu joués" };
export interface Grid { numbers:number[]; chance:number }
export interface GeneratorOptions { method:Method; count:number; seed:number; include?:number[]; exclude?:number[]; reference?:Draw[] }
export function seededRandom(seed:number) {
 let value=seed>>>0;
 return ()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function validateHistory(draws:Draw[]) {
 if(draws.some(d=>d.regime!=="modern"||d.numbers.length!==5||d.bonus<1||d.bonus>10)) throw new Error("Ce module utilise le LOTO moderne, tirage principal uniquement.");
 for(let i=1;i<draws.length;i++) if(draws[i].date<=draws[i-1].date) throw new Error("Les tirages doivent être uniques et classés par date.");
}
function choose(n:number,k:number):number { if(k<0||k>n)return 0;let total=1;for(let i=1;i<=k;i++)total=total*(n-i+1)/i;return Math.round(total); }
function setup(draws:Draw[],options:GeneratorOptions) {
 validateHistory(draws);
 if(!Object.hasOwn(methods,options.method))throw new Error("Méthode inconnue.");
 if(!Number.isInteger(options.seed)||options.seed<0||options.seed>0xffffffff)throw new Error("La graine doit être un entier entre 0 et 4 294 967 295.");
 if(!Number.isInteger(options.count)||options.count<1||options.count>20)throw new Error("Choisissez de 1 à 20 grilles.");
 const include=[...new Set(options.include??[])],exclude=new Set(options.exclude??[]);
 if([...include,...exclude].some(n=>!Number.isInteger(n)||n<1||n>49))throw new Error("Les numéros doivent être compris entre 1 et 49.");
 if(include.length>5)throw new Error("Vous pouvez imposer au maximum 5 numéros.");
 if(include.some(n=>exclude.has(n)))throw new Error("Un numéro ne peut pas être inclus et exclu.");
 const pool=Array.from({length:49},(_,i)=>i+1).filter(n=>!include.includes(n)&&!exclude.has(n));
 const needed=5-include.length, evenIncluded=include.filter(n=>n%2===0).length;
 const evenPool=pool.filter(n=>n%2===0).length;
 const targets=[2,3].filter(t=>t>=evenIncluded&&t-evenIncluded<=needed&&evenPool>=t-evenIncluded&&pool.length-evenPool>=needed-t+evenIncluded);
 const combinations=options.method==='balanced'?targets.reduce((sum,t)=>sum+choose(evenPool,t-evenIncluded)*choose(pool.length-evenPool,needed-t+evenIncluded),0):choose(pool.length,needed);
 if(options.method==='balanced'&&!targets.length)throw new Error("Ces contraintes ne permettent pas un équilibre de 2 ou 3 numéros pairs.");
 if(options.count>combinations*10)throw new Error("Pas assez de grilles distinctes avec ces contraintes (numéro Chance compris).");
 const rows=analyzeNumbers(draws);
 let weights=rows.map(r=>options.method==='frequency'?r.count+1:options.method==='delay'?r.delay+1:1),chance:number[]|null=null;
 if(options.method==='unpopular') {
  // Popularity uses the whole reference history (winner counts), never draws after the last selected one.
  const last=draws.at(-1)!.date,p=popularity((options.reference??draws).filter(d=>d.date<=last));
  if(p.draws<50)throw new Error("Pas assez de tirages avec gagnants par rang (depuis mars 2017) pour estimer la popularité.");
  weights=numberWeights(p);chance=chanceWeights(p);
 }
 return {include,pool,targets,weights,chance};
}
function drawGrid(config:ReturnType<typeof setup>,method:Method,random:()=>number):Grid {
 const picked=[...config.include], pool=[...config.pool];
 const target=method==='balanced'?config.targets[Math.floor(random()*config.targets.length)]:null;
 while(picked.length<5) {
  const even=picked.filter(n=>n%2===0).length,odd=picked.length-even;
  const candidates=pool.filter(n=>target===null||(n%2===0?even<target:odd<5-target));
  let cursor=random()*candidates.reduce((sum,n)=>sum+config.weights[n-1],0);
  let chosen=candidates.at(-1)!;
  for(const n of candidates){cursor-=config.weights[n-1];if(cursor<0){chosen=n;break;}}
  picked.push(chosen);pool.splice(pool.indexOf(chosen),1);
 }
 return {numbers:picked.sort((a,b)=>a-b),chance:config.chance?weightedIndex(config.chance,random())+1:Math.floor(random()*10)+1};
}
function weightedIndex(weights:number[],r:number):number {
 let cursor=r*weights.reduce((a,b)=>a+b,0);
 for(let i=0;i<weights.length;i++){cursor-=weights[i];if(cursor<0)return i;}
 return weights.length-1;
}
export function generateGrids(draws:Draw[],options:GeneratorOptions):Grid[] {
 const config=setup(draws,options),random=seededRandom(options.seed),grids:Grid[]=[],seen=new Set<string>();
 for(let attempt=0;attempt<10000&&grids.length<options.count;attempt++) {
  const grid=drawGrid(config,options.method,random),key=grid.numbers.join(',')+'|'+grid.chance;
  if(!seen.has(key)){seen.add(key);grids.push(grid);}
 }
 if(grids.length!==options.count)throw new Error("Impossible de produire autant de grilles distinctes. Réduisez le nombre demandé.");
 return grids;
}
/** gain / secondGain: average payout in euros per grid (LOTO, then "2nd tirage" option) over draws with published prizes, null when none. */
export interface ResultStats { average:number; threePlus:number; chanceRate:number; low:number; high:number; gain:number|null; wins:number; secondGain:number|null; secondWins:number }
export interface BacktestResult {
 method:Method; seed:number; draws:number; priced:number; secondPriced:number; trials:number; first:string; last:string;
 strategy:ResultStats; baseline:ResultStats;
 trace:{date:string;trainedThrough:string;grid:Grid;baseline:Grid;actual:Grid;matches:number;randomMatches:number}[];
}
export function backtest(draws:Draw[],method:Method,seed:number,reference:Draw[]=draws):BacktestResult {
 validateHistory(draws);
 if(draws.length<21)throw new Error("Sélectionnez au moins 21 tirages : 20 pour démarrer, puis un tirage à tester.");
 const start=Math.max(20,draws.length-200),trials=20,n=draws.length-start;
 const totals=()=>Array.from({length:trials},()=>({hits:0,three:0,chance:0,gain:0,wins:0,secondGain:0,secondWins:0}));
 const selected=totals(),baseline=totals();
 const trace:BacktestResult['trace']=[];
 let priced=0,secondPriced=0;
 const score=(run:ReturnType<typeof totals>[number],grid:Grid,actual:Draw)=>{
  const hits=grid.numbers.filter(x=>actual.numbers.includes(x)).length,rank=prizeRank(hits,grid.chance===actual.bonus);
  run.hits+=hits;run.three+=Number(hits>=3);run.chance+=Number(grid.chance===actual.bonus);
  if(rank&&actual.prizes){run.gain+=actual.prizes.payouts[rank-1];run.wins++;}
  const second=actual.second&&actual.secondPayouts?secondRank(grid.numbers.filter(x=>actual.second!.includes(x)).length):0;
  if(second){run.secondGain+=actual.secondPayouts![second-1];run.secondWins++;}
  return hits;
 };
 for(let i=start;i<draws.length;i++) {
  const history=draws.slice(Math.max(0,i-50),i),actual=draws[i];
  const config=setup(history,{method,count:1,seed,reference}),uniform=setup(history,{method:'random',count:1,seed});
  if(actual.prizes)priced++;
  if(actual.second&&actual.secondPayouts)secondPriced++;
  for(let trial=0;trial<trials;trial++) {
   // Date-specific streams make each prediction reproducible without looking at its outcome.
   const dateSeed=Number(actual.date.replaceAll('-',''));
   const runSeed=(seed^dateSeed^Math.imul(trial+1,0x9e3779b1))>>>0;
   const grid=drawGrid(config,method,seededRandom(runSeed));
   const randomGrid=drawGrid(uniform,'random',seededRandom(runSeed));
   const hits=score(selected[trial],grid,actual),randomHits=score(baseline[trial],randomGrid,actual);
   if(trial===0)trace.push({date:actual.date,trainedThrough:history.at(-1)!.date,grid,baseline:randomGrid,actual:{numbers:actual.numbers,chance:actual.bonus},matches:hits,randomMatches:randomHits});
  }
 }
 const summary=(runs:ReturnType<typeof totals>):ResultStats=>({average:runs.reduce((s,r)=>s+r.hits,0)/(n*trials),threePlus:runs.reduce((s,r)=>s+r.three,0)/(n*trials),chanceRate:runs.reduce((s,r)=>s+r.chance,0)/(n*trials),low:Math.min(...runs.map(r=>r.hits/n)),high:Math.max(...runs.map(r=>r.hits/n)),gain:priced?runs.reduce((s,r)=>s+r.gain,0)/(priced*trials):null,wins:runs.reduce((s,r)=>s+r.wins,0),secondGain:secondPriced?runs.reduce((s,r)=>s+r.secondGain,0)/(secondPriced*trials):null,secondWins:runs.reduce((s,r)=>s+r.secondWins,0)});
 return {method,seed,draws:n,priced,secondPriced,trials,first:draws[start].date,last:draws.at(-1)!.date,strategy:summary(selected),baseline:summary(baseline),trace};
}

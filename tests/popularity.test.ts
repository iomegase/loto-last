import assert from "node:assert/strict";
import test from "node:test";
import { backtest, generateGrids } from "../frontend/forecasts.js";
import { chanceWeights, numberWeights, popularity, prizeRank, secondRank } from "../frontend/popularity.js";
import type { Draw } from "../frontend/model.js";
const payouts=[5e6,1e5,1000,500,50,20,10,4.5,2.2];
// Draws containing 7 or Chance 7 have more winners, as if players over-picked them.
const draws:Draw[]=Array.from({length:260},(_,i)=>{
 const numbers=[1,2,3,4,5].map(n=>(n*7+i)%49+1),bonus=i%10+1,hot=numbers.includes(7);
 const w5=bonus===7?300:100,w6=hot?2000:1000,w7=bonus===7?600:200,w8=2000;
 return {id:String(i),date:new Date(Date.UTC(2025,0,i+1)).toISOString().slice(0,10),regime:"modern",numbers,bonus,second:null,
  prizes:{winners:[0,1,10,100,w5,w6,w7,w8,300000],payouts}};
});
test("prize ranks follow the modern LOTO grid",()=>{
 assert.deepEqual([[5,true],[5,false],[4,true],[4,false],[3,true],[3,false],[2,true],[2,false],[1,true],[0,true],[1,false],[0,false]].map(([h,c])=>prizeRank(h as number,c as boolean)),[1,2,3,4,5,6,7,8,9,9,0,0]);
});
test("winner counts reveal over-played numbers and Chance numbers",()=>{
 const p=popularity(draws);
 assert.equal(p.draws,260);
 assert.ok(p.numbers[6]>0.05&&p.numbers.every((s,i)=>i===6||s<p.numbers[6]));
 assert.ok(p.chance[6]>0.1&&p.chance.every((s,i)=>i===6||s<p.chance[6]));
 assert.ok(numberWeights(p)[6]<numberWeights(p)[20]&&chanceWeights(p)[6]<chanceWeights(p)[0]);
 assert.deepEqual(popularity(draws.map(d=>({...d,prizes:null}))).draws,0);
});
test("unpopular grids avoid over-played picks, stay valid and need winner data",()=>{
 const grids=generateGrids(draws,{method:'unpopular',count:20,seed:3,exclude:[1]});
 for(const g of grids){assert.equal(new Set(g.numbers).size,5);assert.ok(!g.numbers.includes(1));}
 assert.ok(grids.filter(g=>g.numbers.includes(7)).length<grids.length*5/49);
 assert.throws(()=>generateGrids(draws.map(d=>({...d,prizes:null})),{method:'unpopular',count:1,seed:1}),/gagnants par rang/);
 // Popularity from the reference history never uses draws after the selection.
 const late=draws.slice(60).map(d=>({...d,prizes:{...d.prizes!,winners:[0,0,0,0,1,1,1,1,1]}}));
 assert.deepEqual(generateGrids(draws.slice(0,60),{method:'unpopular',count:3,seed:9,reference:[...draws.slice(0,60),...late]}),generateGrids(draws.slice(0,60),{method:'unpopular',count:3,seed:9}));
});
test("backtest prices every winning grid with the payouts of its draw",()=>{
 const random=backtest(draws,'random',5);
 assert.equal(random.priced,random.draws);
 assert.deepEqual(random.strategy,random.baseline);
 const trace=random.trace.map(t=>prizeRank(t.matches,t.grid.chance===t.actual.chance));
 assert.ok(random.strategy.gain!==null&&random.strategy.gain>0&&random.strategy.wins>=trace.filter(Boolean).length);
 assert.equal(backtest(draws.map(d=>({...d,prizes:null})),'random',5).strategy.gain,null);
 assert.ok(backtest(draws,'unpopular',5).strategy.gain!==null);
});
test("2nd tirage pays the same five numbers without Chance, from 2 good numbers",()=>{
 assert.deepEqual([5,4,3,2,1,0].map(secondRank),[1,2,3,4,0,0]);
 const withSecond=draws.map((d,i)=>({...d,second:[1,2,3,4,5].map(n=>(n*11+i*3)%49+1),secondPayouts:[100000,600,30,3]}));
 const result=backtest(withSecond,'random',5);
 assert.equal(result.secondPriced,result.draws);
 assert.ok(result.strategy.secondGain!>0&&result.strategy.secondWins>0);
 assert.deepEqual(result.strategy,result.baseline);
 // Only the second draw's numbers count: an impossible second draw pays nothing.
 assert.equal(backtest(withSecond.map(d=>({...d,second:[50,51,52,53,54]})),'random',5).strategy.secondGain,0);
 assert.equal(backtest(draws,'random',5).strategy.secondGain,null);
});

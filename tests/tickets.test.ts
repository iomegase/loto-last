import assert from "node:assert/strict";
import test from "node:test";
import { backup, createTicket, evaluate, ledger, mergeTickets, nextDrawDate, restoreTickets, type Ticket } from "../frontend/tickets.js";
import type { Draw } from "../frontend/model.js";
const draw:Draw={id:"d",date:"2026-09-28",regime:"modern",numbers:[3,11,24,37,45],bonus:6,second:[2,11,24,30,41],
 prizes:{winners:[0,1,10,100,500,5000,10000,100000,300000],payouts:[5e6,1e5,1500,500,50,20,10,4.5,2.2]},secondPayouts:[100000,600,30,3]};
const byDate=new Map([[draw.date,draw]]);
const ticket=(numbers:number[],chance:number,second=false,date=draw.date,id="t"):Ticket=>createTicket({date,numbers,chance,second},id,"2026-09-27T10:00:00.000Z");
test("next draw date is the first Monday, Wednesday or Saturday from today",()=>{
 assert.equal(nextDrawDate(new Date(2026,8,28)),"2026-09-28"); // Monday
 assert.equal(nextDrawDate(new Date(2026,8,29)),"2026-09-30"); // Tuesday → Wednesday
 assert.equal(nextDrawDate(new Date(2026,9,1)),"2026-10-03");  // Thursday → Saturday
 assert.equal(nextDrawDate(new Date(2026,9,4)),"2026-10-05");  // Sunday → Monday
});
test("tickets are validated and normalised",()=>{
 assert.deepEqual(ticket([45,3,24,11,37],6).numbers,[3,11,24,37,45]);
 assert.throws(()=>ticket([1,2,3,4],5),/exactement 5/);
 assert.throws(()=>ticket([1,1,2,3,4],5),/exactement 5/);
 assert.throws(()=>ticket([1,2,3,4,50],5),/exactement 5/);
 assert.throws(()=>ticket([1,2,3,4,5],11),/Chance/);
 assert.throws(()=>ticket([1,2,3,4,5],1,false,"2026-02-30"),/date/);
});
test("a ticket is priced with the payouts actually paid for its draw",()=>{
 const three=evaluate(ticket([3,11,24,1,2],6),byDate,draw.date);
 assert.deepEqual([three.status,three.hits,three.chanceHit,three.rank,three.gain,three.stake],["settled",3,true,5,50,2.2]);
 assert.equal(evaluate(ticket([1,2,4,5,7],6),byDate,draw.date).gain,2.2);  // Chance only: rank 9
 assert.equal(evaluate(ticket([1,2,4,5,7],1),byDate,draw.date).gain,0);
 const second=evaluate(ticket([11,24,30,1,4],1,true),byDate,draw.date);
 assert.deepEqual([second.stake,second.rank,second.secondHits,second.secondRank,second.secondGain],[3,8,3,3,30]);
 assert.equal(second.gain,4.5); // 2 good numbers in the main draw
});
test("future dates wait for their draw; past dates without a draw are flagged",()=>{
 assert.equal(evaluate(ticket([1,2,3,4,5],1,false,"2026-10-03"),byDate,draw.date).status,"pending");
 assert.equal(evaluate(ticket([1,2,3,4,5],1,false,"2026-09-27"),byDate,draw.date).status,"missing");
 const unpublished=evaluate(ticket([3,11,24,1,2],6),new Map([[draw.date,{...draw,prizes:null}]]),draw.date);
 assert.equal(unpublished.gain,null);
});
test("the ledger only charges drawn tickets and reports the real balance",()=>{
 const results=[ticket([3,11,24,1,2],6,false,draw.date,"a"),ticket([11,24,30,1,4],1,true,draw.date,"b"),ticket([1,2,4,5,7],1,false,draw.date,"c"),ticket([1,2,3,4,5],1,true,"2026-10-03","d")].map(t=>evaluate(t,byDate,draw.date));
 const l=ledger(results);
 assert.deepEqual([l.settled,l.pending,l.winning],[3,1,2]);
 assert.equal(Number(l.stake.toFixed(2)),7.4);
 assert.equal(Number(l.gain.toFixed(2)),84.5);
 assert.equal(Number(l.balance.toFixed(2)),77.1);
 assert.equal(Number(l.pendingStake.toFixed(2)),3);
 assert.equal(l.best,50);
});
test("backups round-trip, drop malformed entries and merge without duplicates",()=>{
 const a=ticket([1,2,3,4,5],1,false,draw.date,"a"),b=ticket([6,7,8,9,10],2,true,draw.date,"b");
 const restored=restoreTickets(JSON.parse(JSON.stringify(backup([a,b],new Date("2026-09-30T00:00:00Z")))));
 assert.deepEqual(restored,[a,b]);
 assert.deepEqual(restoreTickets([a,{...b,numbers:[1,2]},{...a},null,"x",{...b,id:""}]),[a]);
 assert.deepEqual(restoreTickets({nope:true}),[]);
 const merged=mergeTickets([a],[a,b]);
 assert.equal(merged.added,1);
 assert.deepEqual(merged.tickets.map(t=>t.id),["a","b"]);
});

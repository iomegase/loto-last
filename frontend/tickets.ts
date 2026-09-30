import type { Draw } from "./model.js";
import { prizeRank, secondRank } from "./popularity.js";
export const PRICE = 2.2, SECOND_PRICE = 0.8;
export interface Ticket { id:string; date:string; numbers:number[]; chance:number; second:boolean; addedAt:string }
export interface TicketInput { date:string; numbers:number[]; chance:number; second:boolean }
/** pending: draw not in the data yet · missing: no draw that day · settled: compared with the draw. */
export type TicketStatus = "pending" | "missing" | "settled";
export interface TicketResult {
 ticket:Ticket; status:TicketStatus; stake:number; hits:number|null; chanceHit:boolean|null;
 rank:number; gain:number|null; secondHits:number|null; secondRank:number; secondGain:number|null;
}
export interface Ledger { stake:number; gain:number; balance:number; settled:number; pending:number; pendingStake:number; winning:number; unknown:number; best:number }

const isDate = (v:unknown):v is string => {
 if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
 const d=new Date(`${v}T12:00:00Z`);
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v;
};
const localDate = (d:Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
/** LOTO draws on Monday, Wednesday and Saturday: the first draw day from `today` included. */
export function nextDrawDate(today:Date):string {
 const d=new Date(today.getFullYear(),today.getMonth(),today.getDate());
 while(![1,3,6].includes(d.getDay())) d.setDate(d.getDate()+1);
 return localDate(d);
}
export function validateTicket(input:TicketInput):TicketInput {
 if(!isDate(input.date)) throw new Error("Indiquez la date du tirage joué.");
 const numbers=[...new Set(input.numbers)].sort((a,b)=>a-b);
 if(numbers.length!==5||numbers.some(n=>!Number.isInteger(n)||n<1||n>49)) throw new Error("Saisissez exactement 5 numéros différents, de 1 à 49.");
 if(!Number.isInteger(input.chance)||input.chance<1||input.chance>10) throw new Error("Le numéro Chance doit être compris entre 1 et 10.");
 return { date:input.date, numbers, chance:input.chance, second:input.second===true };
}
export function createTicket(input:TicketInput,id:string,addedAt:string):Ticket { return { id, ...validateTicket(input), addedAt }; }
/** Accepts a saved list or an exported backup; silently drops malformed entries and duplicate ids. */
export function restoreTickets(value:unknown):Ticket[] {
 const list=Array.isArray(value)?value:value&&typeof value==="object"&&Array.isArray((value as {tickets?:unknown}).tickets)?(value as {tickets:unknown[]}).tickets:[];
 const seen=new Set<string>(), out:Ticket[]=[];
 for(const raw of list) {
  if(!raw||typeof raw!=="object") continue;
  const t=raw as Partial<Ticket>;
  if(typeof t.id!=="string"||!t.id||t.id.length>64||seen.has(t.id)||!Array.isArray(t.numbers)) continue;
  try { out.push(createTicket({date:t.date as string,numbers:t.numbers,chance:t.chance as number,second:t.second===true},t.id,isDate(t.addedAt?.slice(0,10))?t.addedAt!:new Date(0).toISOString())); seen.add(t.id); } catch { /* skip invalid entry */ }
 }
 return out;
}
export function mergeTickets(current:Ticket[],incoming:Ticket[]):{tickets:Ticket[];added:number} {
 const ids=new Set(current.map(t=>t.id)), fresh=incoming.filter(t=>!ids.has(t.id));
 return { tickets:[...current,...fresh], added:fresh.length };
}
export function backup(tickets:Ticket[],now:Date) { return { format:"loto-atelier.tickets", version:1, exportedAt:now.toISOString(), tickets }; }
/** Compares a ticket with the modern main draw of its date, using the payouts FDJ actually paid. */
export function evaluate(ticket:Ticket,byDate:Map<string,Draw>,lastDate:string):TicketResult {
 const stake=PRICE+(ticket.second?SECOND_PRICE:0), draw=byDate.get(ticket.date);
 const base={ticket,stake,hits:null,chanceHit:null,rank:0,gain:null,secondHits:null,secondRank:0,secondGain:null};
 if(!draw) return {...base,status:ticket.date>lastDate?"pending":"missing"};
 const hits=ticket.numbers.filter(n=>draw.numbers.includes(n)).length, chanceHit=ticket.chance===draw.bonus, rank=prizeRank(hits,chanceHit);
 const gain=rank===0?0:draw.prizes?draw.prizes.payouts[rank-1]:null;
 let secondHits:number|null=null, second=0, secondGain:number|null=null;
 if(ticket.second&&draw.second) {
  secondHits=ticket.numbers.filter(n=>draw.second!.includes(n)).length; second=secondRank(secondHits);
  secondGain=second===0?0:draw.secondPayouts?draw.secondPayouts[second-1]:null;
 }
 return {...base,status:"settled",hits,chanceHit,rank,gain,secondHits,secondRank:second,secondGain};
}
export function ledger(results:TicketResult[]):Ledger {
 const l:Ledger={stake:0,gain:0,balance:0,settled:0,pending:0,pendingStake:0,winning:0,unknown:0,best:0};
 for(const r of results) {
  if(r.status!=="settled") { if(r.status==="pending"){l.pending++;l.pendingStake+=r.stake;} continue; }
  l.settled++; l.stake+=r.stake;
  const won=(r.gain??0)+(r.secondGain??0);
  l.gain+=won; l.best=Math.max(l.best,won);
  if(r.rank||r.secondRank) l.winning++;
  if((r.rank&&r.gain===null)||(r.secondRank&&r.secondGain===null)) l.unknown++;
 }
 l.balance=l.gain-l.stake;
 return l;
}

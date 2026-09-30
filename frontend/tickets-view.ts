import { count, date, escape, percent } from "./charts.js";
import type { Dataset, Draw } from "./model.js";
import { evaluate, ledger, PRICE, SECOND_PRICE, type Ticket, type TicketResult } from "./tickets.js";
export interface TicketDraft { date:string; numbers:string; chance:string; second:boolean; error:string }
export const emptyDraft = (drawDate:string):TicketDraft => ({ date:drawDate, numbers:"", chance:"", second:false, error:"" });
const euros=(n:number)=>n.toLocaleString("fr-FR",{style:"currency",currency:"EUR"});
const rankLabels=["","5 + Chance","5 bons","4 + Chance","4 bons","3 + Chance","3 bons","2 + Chance","2 bons","Chance"];
export function ticketResults(data:Dataset,tickets:Ticket[]):TicketResult[] {
 const modern=data.draws.filter(d=>d.regime==="modern"), byDate=new Map<string,Draw>(modern.map(d=>[d.date,d]));
 const last=modern.reduce((m,d)=>d.date>m?d.date:m,"");
 return tickets.map(t=>evaluate(t,byDate,last)).sort((a,b)=>b.ticket.date.localeCompare(a.ticket.date)||b.ticket.addedAt.localeCompare(a.ticket.addedAt));
}
function balls(numbers:number[],drawn:number[]|null,chance:number,chanceHit:boolean|null) {
 const ball=(n:number,cls:string)=>`<span class="ball small ${cls}">${String(n).padStart(2,"0")}</span>`;
 return `<div class="inline-balls">${numbers.map(n=>ball(n,drawn?.includes(n)?"hit":"")).join("")}<span class="grid-plus">+</span>${ball(chance,chanceHit?"bonus hit":"bonus")}</div>`;
}
function outcome(r:TicketResult) {
 if(r.status==="pending") return `<span class="ticket-status pending">En attente du tirage</span>`;
 if(r.status==="missing") return `<span class="ticket-status missing">Aucun tirage à cette date</span>`;
 const main=r.rank?`${rankLabels[r.rank]} · ${r.gain===null?"gain non publié":euros(r.gain)}`:`${r.hits} bon${r.hits===1?"":"s"} numéro${r.hits===1?"":"s"}${r.chanceHit?" + Chance":""}`;
 const second=r.ticket.second?(r.secondHits===null?"2nd tirage : non disponible":`2nd tirage : ${r.secondHits} bon${r.secondHits===1?"":"s"}${r.secondRank?` · ${r.secondGain===null?"gain non publié":euros(r.secondGain)}`:""}`):"";
 return `<span class="ticket-status ${r.rank||r.secondRank?"won":"lost"}">${main}</span>${second?`<small>${second}</small>`:""}`;
}
export function ticketsView(data:Dataset,tickets:Ticket[],draft:TicketDraft) {
 const results=ticketResults(data,tickets), l=ledger(results);
 const form=`<section class="panel"><div class="panel-heading"><div><h2>Ajouter une grille jouée</h2><p>Grille simple ${euros(PRICE)} · option 2nd tirage +${euros(SECOND_PRICE)}. Les grilles générées dans Pronostics peuvent aussi être enregistrées en un clic.</p></div></div>
 <form id="ticket-form" class="ticket-form"><div><label for="ticket-date">Date du tirage</label><input id="ticket-date" type="date" value="${escape(draft.date)}" required></div>
 <div><label for="ticket-numbers">5 numéros</label><input id="ticket-numbers" inputmode="numeric" placeholder="Ex. 7 14 23 38 45" value="${escape(draft.numbers)}" required></div>
 <div><label for="ticket-chance">Numéro Chance</label><input id="ticket-chance" type="number" min="1" max="10" step="1" value="${escape(draft.chance)}" required></div>
 <label class="ticket-check" for="ticket-second"><input id="ticket-second" type="checkbox" ${draft.second?"checked":""}> Option 2nd tirage</label>
 <button class="button primary" type="submit">Enregistrer la grille</button></form>
 ${draft.error?`<p class="error-text" role="alert">${escape(draft.error)}</p>`:""}</section>`;
 const summary=`<section class="panel"><div class="panel-heading"><div><h2>Votre bilan réel</h2><p>${count(l.settled)} grille${l.settled>1?"s":""} comparée${l.settled>1?"s":""} aux tirages${l.pending?` · ${count(l.pending)} en attente (${euros(l.pendingStake)} misés)`:""}. Les gains des codes LOTO ne sont pas comptés.</p></div></div>
 <div class="forecast-results ticket-summary"><article><span>Total misé</span><strong>${euros(l.stake)}</strong><small>grilles déjà tirées</small></article><article><span>Total gagné</span><strong>${euros(l.gain)}</strong><small>${count(l.winning)} grille${l.winning>1?"s":""} gagnante${l.winning>1?"s":""}${l.best?` · meilleur gain ${euros(l.best)}`:""}</small></article><article class="${l.balance<0?"negative":"positive"}"><span>Solde</span><strong>${l.balance>0?"+":""}${euros(l.balance)}</strong><small>${l.stake?`${percent(l.gain/l.stake)} des mises récupérés (moyenne du jeu : 54 %)`:"aucune grille tirée pour l’instant"}</small></article></div>
 ${l.unknown?`<p class="table-caption">${count(l.unknown)} gain${l.unknown>1?"s":""} non publié${l.unknown>1?"s":""} dans les données FDJ : compté${l.unknown>1?"s":""} 0 € dans le bilan.</p>`:""}</section>`;
 const list=`<section class="panel"><div class="panel-heading"><div><h2>Mes grilles</h2><p>Les plus récentes en premier. Les numéros verts sont sortis au tirage.</p></div></div>${results.length?`<div class="table-scroll"><table class="ticket-table"><thead><tr><th>Tirage</th><th>Grille</th><th>2nd tirage</th><th>Résultat</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${results.map(r=>{
  const draw=r.status==="settled"?data.draws.find(d=>d.regime==="modern"&&d.date===r.ticket.date)!:null;
  return `<tr><td>${date(r.ticket.date)}</td><td>${balls(r.ticket.numbers,draw?.numbers??null,r.ticket.chance,r.chanceHit)}</td><td><button class="button ticket-toggle" data-action="ticket-second" data-ticket="${escape(r.ticket.id)}" aria-pressed="${r.ticket.second}">${r.ticket.second?"Oui":"Non"}</button></td><td class="ticket-outcome">${outcome(r)}</td><td><button class="quiet-button" data-action="ticket-delete" data-ticket="${escape(r.ticket.id)}" aria-label="Supprimer la grille du ${date(r.ticket.date)}">Supprimer</button></td></tr>`;
 }).join("")}</tbody></table></div>`:`<div class="empty-state compact"><h3>Aucune grille enregistrée</h3><p>Ajoutez vos grilles jouées ci-dessus, ou enregistrez une série depuis l’onglet Pronostics.</p></div>`}</section>`;
 const backup=`<section class="panel"><div class="panel-heading"><div><h2>Sauvegarde</h2><p>Vos grilles sont enregistrées uniquement dans ce navigateur, sur cet appareil. Rien n’est envoyé sur Internet. Exportez régulièrement une sauvegarde : vider les données du navigateur efface tout.</p></div></div>
 <div class="forecast-actions"><button class="button" data-action="ticket-export" ${tickets.length?"":"disabled"}>Exporter la sauvegarde</button><label class="button ticket-import" for="ticket-import">Importer une sauvegarde<input id="ticket-import" type="file" accept="application/json,.json"></label></div>
 <p class="micro-copy">L’import ajoute les grilles absentes sans modifier celles déjà présentes : il sert aussi à passer d’un appareil à l’autre.</p></section>`;
 return form+summary+list+backup;
}

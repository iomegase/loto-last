import { backtest, generateGrids, methods, type Method } from "./forecasts.js";
import { initialForecast } from "./forecasts-view.js";
import { analyzeNumbers, analyzePairs, csvExport, filterDraws, historyRows, parseQuery, restoreFilters } from "./analytics.js";
import { defaults, type Dataset, type View } from "./model.js";
import { shell, type UIState } from "./views.js";
import { date, escape } from "./charts.js";
import { backup, createTicket, mergeTickets, nextDrawDate, restoreTickets, type Ticket } from "./tickets.js";
import { emptyDraft, ticketResults } from "./tickets-view.js";

const app = document.querySelector<HTMLDivElement>("#app")!;
const storageKey = "loto-atelier.filters.v1", ticketsKey = "loto-atelier.tickets.v1";
let stored: unknown;
try { stored=JSON.parse(localStorage.getItem(storageKey) ?? "null"); } catch { stored=null; }
let storedTickets: unknown;
try { storedTickets=JSON.parse(localStorage.getItem(ticketsKey) ?? "[]"); } catch { storedTickets=[]; }
const state: UIState = { filters: restoreFilters(stored), view:"overview", selected:23, sort:"count", pairNumber:0, page:0, query:"", queryNumbers:[], queryError:"", expanded:"", forecast:initialForecast(), tickets:restoreTickets(storedTickets), ticketDraft:emptyDraft(nextDrawDate(new Date())) };
let dataset: Dataset | null = null;
let loading = false;
let toastTimer: ReturnType<typeof setTimeout>;
function toast(text:string) {
 const element=document.querySelector<HTMLDivElement>("#toast")!;
 clearTimeout(toastTimer); element.textContent=text; element.classList.add("visible");
 toastTimer=setTimeout(()=>element.classList.remove("visible"),3500);
}
function currentView():View { const value=location.hash.slice(1); return ["overview","numbers","pairs","history","forecasts","tickets","guide"].includes(value)?value as View:"overview"; }
function render() {
 if(!dataset) return;
 const focus=document.activeElement as HTMLElement|null;
 const id=focus?.id, number=focus?.dataset.number;
 state.view=currentView();
 app.innerHTML=shell(dataset,state,filterDraws(dataset.draws,state.filters));
 document.title=`${{overview:"Vue d’ensemble",numbers:"Numéros",pairs:"Paires",history:"Historique",forecasts:"Pronostics",tickets:"Mes grilles",guide:"Mode d’emploi"}[state.view]} — LOTO / Atelier`;
 if(id) document.getElementById(id)?.focus({preventScroll:true});
 else if(number) app.querySelector<HTMLElement>(`[data-number="${number}"]`)?.focus({preventScroll:true});
}
function save() {
 try { localStorage.setItem(storageKey,JSON.stringify(state.filters)); } catch { /* Private browsing may disallow storage. Analysis still works. */ }
}
// Played grids exist only in this browser: a failed write must be visible so the player can export a backup.
function saveTickets(tickets:Ticket[]):boolean {
 try { localStorage.setItem(ticketsKey,JSON.stringify(tickets)); state.tickets=tickets; return true; }
 catch { toast("Enregistrement impossible dans ce navigateur (navigation privée ?). Rien n’a été modifié."); return false; }
}
function download(text:string,type:string,name:string) {
 const url=URL.createObjectURL(new Blob([text],{type}));
 const link=document.createElement("a"); link.href=url; link.download=name;
 document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function importTickets(file:File) {
 try {
  if(file.size>5_000_000) throw new Error();
  const incoming=restoreTickets(JSON.parse(await file.text()));
  if(!incoming.length) { toast("Aucune grille valide dans ce fichier."); return; }
  const {tickets,added}=mergeTickets(state.tickets,incoming);
  if(saveTickets(tickets)) toast(added?`${added} grille${added>1?"s":""} importée${added>1?"s":""}.`:"Toutes ces grilles étaient déjà enregistrées.");
 } catch { toast("Ce fichier n’est pas une sauvegarde de grilles valide."); }
 render();
}
async function load(refresh=false) {
 if(loading) return;
 loading=true;
 const refreshButton=app.querySelector<HTMLButtonElement>('[data-action="refresh"]');
 if(refreshButton) { refreshButton.disabled=true; refreshButton.textContent="Chargement…"; }
 try {
  const response=await fetch("./data.json", { cache:"no-store", signal: AbortSignal.timeout(15000) });
  if(!response.ok) throw new Error("Le fichier de données est indisponible.");
  const value: Dataset=await response.json();
  if(value.schemaVersion!==1 || !Array.isArray(value.draws) || !value.draws.length || value.draws.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !["modern","historic"].includes(d.regime) || !Array.isArray(d.numbers) || d.numbers.some(n=>!Number.isInteger(n)||n<1||n>49))) throw new Error("Le format des données est invalide.");
  dataset=value; clearForecast(); render(); if(refresh) toast("Données locales rechargées.");
 } catch(error) {
  if(dataset) { render(); toast("Impossible de recharger. Les données précédentes restent affichées."); }
  else app.innerHTML=`<div class="loading"><img src="./favicon.svg" width="48" height="48" alt=""><h1>L’atelier attend ses données.</h1><p>${escape(error instanceof Error?error.message:"Erreur de chargement.")}</p><p>Vérifiez que l’application a été construite et que la base locale est valide.</p><button class="button primary" data-action="retry">Réessayer</button></div>`;
 } finally { loading=false; }
}
function exportData() {
 if(!dataset) return;
 if(state.view==="tickets") {
  if(!state.tickets.length) { toast("Aucune grille à exporter."); return; }
  const rows=ticketResults(dataset,state.tickets).map(r=>[r.ticket.date,r.ticket.numbers.join(" "),r.ticket.chance,r.ticket.second?"oui":"non",r.stake,r.status,r.hits??"",r.chanceHit===null?"":r.chanceHit?"oui":"non",r.rank||"",r.gain??"",r.secondHits??"",r.secondRank||"",r.secondGain??""]);
  download(csvExport(["tirage","numeros","chance","second_tirage","mise","statut","bons_numeros","chance_trouvee","rang","gain","bons_2nd","rang_2nd","gain_2nd"],rows),"text/csv;charset=utf-8","loto-mes-grilles.csv");
  toast("Export CSV préparé."); return;
 }
 const draws=filterDraws(dataset.draws,state.filters);
 if(!draws.length) { toast("Aucun tirage à exporter dans cette période."); return; }
 let text:string;
 if(state.view==="forecasts") {
  const series=state.forecast.generated;
  if(!series) {toast("Générez d’abord une série de grilles à exporter.");return;}
  text=csvExport(["grille","numeros","chance","methode","graine","donnees_jusqu_au"],series.grids.map((g,i)=>[i+1,g.numbers.join(" "),g.chance,methods[series.method],series.seed,series.through]));
 } else if(state.view==="numbers") {
  text=csvExport(["numero","sorties","tirages","frequence","reference","ecart","retard","retard_minimum","derniere_date"],analyzeNumbers(draws,49,draws[0].numbers.length).map(r=>[r.number,r.count,draws.length,r.rate,r.expectedRate,r.delta,r.delay,r.censored,r.lastDate]));
 } else if(state.view==="pairs") {
  text=csvExport(["numero_1","numero_2","rencontres","tirages","frequence"],analyzePairs(draws).filter(p=>!state.pairNumber||p.a===state.pairNumber||p.b===state.pairNumber).map(p=>[p.a,p.b,p.count,draws.length,p.rate]));
 } else {
  if(state.view==="history" && state.queryError) { toast("Corrigez les numéros de recherche avant l’export."); return; }
  const rows=state.view==="history"?historyRows(draws,state.queryNumbers):[...draws].reverse();
  text=csvExport(["date","identifiant","regime","tirage","numeros","bonus","somme"],rows.map(d=>[d.date,d.id,d.regime,state.filters.kind,d.numbers.join(" "),state.filters.kind==="main"?d.bonus:"",d.numbers.reduce((a,b)=>a+b,0)]));
 }
 const url=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));
 const link=document.createElement("a"); link.href=url; link.download=`loto-${state.view}-${state.filters.regime}-${state.filters.kind}-${draws[0].date}-${draws.at(-1)!.date}.csv`;
 document.body.append(link); link.click(); link.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); toast("Export CSV préparé.");
}
app.addEventListener("click",event=>{
 const target=(event.target as Element).closest<HTMLElement>("button, [data-action]");
 if(!target || target.hasAttribute("disabled")) return;
 if(target.dataset.number) { state.selected=Number(target.dataset.number); render(); return; }
 if(target.dataset.page) { state.page=Math.max(0,Number(target.dataset.page)); render(); document.querySelector(".history-heading")?.scrollIntoView({block:"start",behavior:"smooth"}); return; }
 if(target.dataset.draw) { state.expanded=state.expanded===target.dataset.draw?"":target.dataset.draw; render(); return; }
 switch(target.dataset.action) {
  case "forecast-modern": state.filters={...state.filters,regime:"modern",kind:"main"};clearForecast();save();render();break;
  case "forecast-seed": state.forecast.seed=crypto.getRandomValues(new Uint32Array(1))[0];render();break;
  case "forecast-test": void runBacktest(false);break;
  case "forecast-test-long": void runBacktest(true);break;
  case "forecast-save": {
   const series=state.forecast.generated; if(!series) break;
   const drawDate=nextDrawDate(new Date()),now=new Date().toISOString();
   const added=series.grids.map(g=>createTicket({date:drawDate,numbers:g.numbers,chance:g.chance,second:false},crypto.randomUUID(),now));
   if(saveTickets([...state.tickets,...added])) toast(`${added.length} grille${added.length>1?"s":""} enregistrée${added.length>1?"s":""} pour le tirage du ${date(drawDate)}. Réglez l’option 2nd tirage dans Mes grilles.`);
   break;
  }
  case "ticket-second": {
   const id=target.dataset.ticket;
   if(saveTickets(state.tickets.map(t=>t.id===id?{...t,second:!t.second}:t))) render();
   break;
  }
  case "ticket-delete": {
   const ticket=state.tickets.find(t=>t.id===target.dataset.ticket);
   if(ticket&&confirm(`Supprimer la grille ${ticket.numbers.join(" ")} + ${ticket.chance} du ${date(ticket.date)} ?`)&&saveTickets(state.tickets.filter(t=>t!==ticket))) render();
   break;
  }
  case "ticket-export": download(JSON.stringify(backup(state.tickets,new Date()),null,1),"application/json",`loto-mes-grilles-${new Date().toISOString().slice(0,10)}.json`);toast("Sauvegarde exportée.");break;
  case "reset": state.filters={...defaults}; state.page=0;state.query="";state.queryNumbers=[];state.queryError=""; save();clearForecast();render();break;
  case "refresh": void load(true);break;
  case "retry": void load();break;
  case "export": exportData();break;
  case "method": document.querySelector<HTMLDialogElement>("#method-dialog")?.showModal();break;
  case "close-method": document.querySelector<HTMLDialogElement>("#method-dialog")?.close();break;
 }
});
app.addEventListener("change",event=>{
 const target=event.target as HTMLSelectElement | HTMLInputElement;
 if(target.id==="forecast-method") {state.forecast.method=target.value as Method;render();}
 else if(target.id==="ticket-import") { const file=(target as HTMLInputElement).files?.[0]; (target as HTMLInputElement).value=""; if(file) void importTickets(file); }
 else if(target.id==="ticket-second") state.ticketDraft.second=(target as HTMLInputElement).checked;
 else if(["regime","kind","window","from","to"].includes(target.id)) {
  state.filters=restoreFilters({...state.filters,[target.id]:target.value});state.page=0;state.expanded="";clearForecast();save();render();
 } else if(target.id==="number-sort") { state.sort=target.value;render(); }
 else if(target.id==="pair-number") { state.pairNumber=Number(target.value);render(); }
});
app.addEventListener("submit",event=>{
 if((event.target as HTMLElement).id==="ticket-form") {
  event.preventDefault();
  const d=state.ticketDraft;
  try {
   const ticket=createTicket({date:d.date,numbers:parseQuery(d.numbers),chance:Number(d.chance),second:d.second},crypto.randomUUID(),new Date().toISOString());
   if(saveTickets([...state.tickets,ticket])) { state.ticketDraft={...emptyDraft(d.date),second:d.second}; toast(`Grille enregistrée pour le tirage du ${date(ticket.date)}.`); }
  } catch(error) { d.error=(error as Error).message; }
  render(); return;
 }
 if((event.target as HTMLElement).id==="forecast-form") {
  event.preventDefault();
  if(!dataset)return;
  try {
   const f=state.forecast,draws=filterDraws(dataset.draws,state.filters);
   const grids=generateGrids(draws,{method:f.method,count:f.quantity,seed:f.seed,include:parseQuery(f.include),exclude:parseQuery(f.exclude),reference:referenceDraws()});
   f.generated={grids,method:f.method,seed:f.seed,through:draws.at(-1)!.date};f.error="";
  } catch(error) {state.forecast.error=(error as Error).message;}
  render();return;
 }
 if((event.target as HTMLElement).id!=="history-search") return;
 event.preventDefault(); state.query=app.querySelector<HTMLInputElement>("#history-query")!.value;
 try { state.queryNumbers=parseQuery(state.query);state.queryError=""; } catch(error) {state.queryError=(error as Error).message;}
 state.page=0;render();
});
// Popularity needs every modern draw with published winners, whatever the analysis window.
function referenceDraws() {return dataset?filterDraws(dataset.draws,{...state.filters,window:"all"}):[];}
function clearForecast() {state.forecast.generated=null;state.forecast.result=null;state.forecast.error="";}
app.addEventListener("input",event=>{
 const input=event.target as HTMLInputElement;
 const fields:Record<string,"method"|"quantity"|"seed"|"include"|"exclude">={"forecast-method":"method","forecast-quantity":"quantity","forecast-seed":"seed","forecast-include":"include","forecast-exclude":"exclude"};
 const draftFields:Record<string,"date"|"numbers"|"chance">={"ticket-date":"date","ticket-numbers":"numbers","ticket-chance":"chance"};
 if(draftFields[input.id]) { state.ticketDraft[draftFields[input.id]]=input.value; state.ticketDraft.error=""; return; }
 const field=fields[input.id];if(!field)return;
 if(field==="method") state.forecast.method=input.value as Method;
 else if(field==="quantity"||field==="seed")state.forecast[field]=Number(input.value);
 else state.forecast[field]=input.value;
});
async function runBacktest(long:boolean) {
 if(!dataset||state.forecast.busy)return;
 const source=filterDraws(dataset.draws,state.filters),method=state.forecast.method,seed=state.forecast.seed;
 const filters=JSON.stringify(state.filters),data=dataset;
 state.forecast.busy=true;state.forecast.error="";render();
 await new Promise(resolve=>setTimeout(resolve,40));
 try {
  if(filters!==JSON.stringify(state.filters)||data!==dataset)return;
  state.forecast.result=long?backtest(referenceDraws(),method,seed,{long}):backtest(source,method,seed,{reference:referenceDraws()});
 } catch(error) {state.forecast.error=(error as Error).message;}
 finally {state.forecast.busy=false;render();}
}
window.addEventListener("hashchange",()=>{state.page=0;state.expanded="";render();window.scrollTo({top:0});});
void load();

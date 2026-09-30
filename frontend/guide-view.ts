import { count, date } from "./charts.js";
import type { Dataset } from "./model.js";
// Figures measured on FDJ data in September 2026 (see CHANGELOG): odds are exact, returns are averages since 2023.
export function guideView(data: Dataset) {
 const tested=Math.max(0,data.draws.filter(d=>d.prizes).length-60), last=data.draws.at(-1)?.date ?? null;
 return `<div class="guide">
 <section class="guide-cards" aria-label="L’essentiel">
  <article class="panel"><span class="guide-kicker">01 · La règle du jeu</span><h2>Personne ne prédit les numéros</h2><p>Chaque tirage est indépendant : les boules n’ont pas de mémoire. Fréquences, retards et paires décrivent le passé, sans jamais augmenter vos chances au prochain tirage. L’atelier l’a vérifié sur tout l’historique.</p></article>
  <article class="panel"><span class="guide-kicker">02 · Le seul levier réel</span><h2>Gagner un peu plus quand vous gagnez</h2><p>Les gains sont partagés entre les gagnants d’un même rang. En jouant des numéros que peu de joueurs choisissent, vous partagez avec moins de monde. Vos chances restent identiques, seuls les montants augmentent.</p></article>
  <article class="panel"><span class="guide-kicker">03 · Le bilan honnête</span><h2>Le jeu reste perdant</h2><p>En moyenne, le LOTO rend environ 54 % des mises. La meilleure méthode ajoute quelques centimes par grille : elle réduit la perte, elle ne la supprime pas.</p></article>
 </section>

 <section class="panel"><div class="panel-heading"><div><h2>Jouer avec l’atelier, étape par étape</h2><p>La recette qui a donné les meilleurs résultats mesurés.</p></div><a class="button primary" href="#forecasts">Ouvrir les pronostics</a></div>
  <ol class="guide-steps">
   <li><strong>Ouvrez l’onglet Pronostics.</strong> Les données se mettent à jour automatiquement après chaque tirage. Le dernier tirage connu est celui du ${date(last,true)}.</li>
   <li><strong>Choisissez la méthode « Numéros peu joués ».</strong> C’est la seule méthode qui ait fait mieux que le hasard dans les tests. Les méthodes Fréquences, Retards et Équilibre font jeu égal avec lui, ou légèrement moins bien.</li>
   <li><strong>Indiquez le nombre de grilles, puis cliquez sur « Nouvelle graine ».</strong> La graine rend une série reproductible. Changez-la à chaque tirage pour ne pas rejouer toujours les mêmes grilles.</li>
   <li><strong>Cliquez sur « Générer les grilles ».</strong> Vous pouvez imposer ou exclure des numéros, mais chaque contrainte éloigne un peu la grille de l’objectif « peu joué ».</li>
   <li><strong>Recopiez chaque grille chez FDJ, numéro Chance compris.</strong> La méthode choisit aussi un numéro Chance peu joué : le 7, par exemple, est choisi par 14 % des joueurs au lieu de 10 %.</li>
   <li><strong>Cochez l’option 2nd tirage (+0,80 €) si vous voulez gagner plus souvent.</strong> C’est la mise la plus rentable par euro, et l’effet « peu joués » y est le plus net.</li>
   <li><strong>Enregistrez vos grilles dans <a href="#tickets">Mes grilles</a>.</strong> Le bouton « Enregistrer comme jouées » de Pronostics les ajoute pour le prochain tirage. Après le tirage, l’atelier indique vos bons numéros, vos gains réels et votre solde. Exportez régulièrement une sauvegarde : les grilles ne sont conservées que dans ce navigateur.</li>
  </ol>
 </section>

 <section class="panel"><div class="panel-heading"><div><h2>Quelle mise choisir ?</h2><p>Probabilités exactes du règlement ; montants récupérés calculés avec les gains réellement versés depuis 2023.</p></div></div>
  <div class="table-scroll"><table><thead><tr><th>Mise</th><th>Chance de gagner quelque chose</th><th>Récupéré en moyenne</th></tr></thead><tbody>
   <tr><td>Grille simple · 2,20 €</td><td>1 sur 6</td><td>1,16 € (53 %)</td></tr>
   <tr><td>Option 2nd tirage seule · 0,80 €</td><td>1 sur 13,4</td><td>0,50 € (62 %)</td></tr>
   <tr><td><strong>Grille + 2nd tirage · 3,00 €</strong></td><td><strong>1 sur 4,4</strong></td><td>1,66 € (55 %)</td></tr>
  </tbody></table></div>
  <p class="guide-note">Les grilles multiples et les packs MultiChances ne changent rien par euro misé : jouer plus de combinaisons coûte proportionnellement plus. À budget égal, trois grilles simples (42 % de chances de gagner quelque chose) et deux grilles avec 2nd tirage (40 %) se valent en fréquence, mais la seconde formule perd un peu moins.</p>
 </section>

 <section class="panel"><div class="panel-heading"><div><h2>Vérifier par vous-même</h2><p>En bas de l’onglet Pronostics, bloc « Comparer la méthode au hasard ».</p></div></div>
  <div class="guide-columns">
   <div><h3>Test long (fiable)</h3><p>Il rejoue ${count(tested)} tirages depuis 2017 avec 500 grilles par tirage, en n’utilisant à chaque fois que les tirages précédents. Lisez le tableau « Écart de gain par grille face au hasard » :</p>
    <ul><li><strong>Mieux que le hasard</strong> : l’écart dépasse la marge d’erreur.</li><li><strong>Indiscernable du hasard</strong> : l’écart reste dans la marge, donc on ne peut rien conclure.</li><li><strong>Moins bien que le hasard</strong> : la méthode coûte de l’argent.</li></ul>
    <p>Pour « Numéros peu joués », on mesure environ +0,03 à +0,09 € par grille au LOTO et +0,06 à +0,09 € au 2nd tirage, selon la graine.</p></div>
   <div><h3>Test rapide</h3><p>Il ne teste que 200 tirages avec 20 grilles chacun. C’est trop peu pour les euros : un seul gain à 4 bons numéros peut doubler une moyenne. Servez-vous-en pour voir le fonctionnement, pas pour décider.</p>
    <h3>Les gros lots à part</h3><p>Une grille à 5 bons numéros tombe environ une fois sur deux millions. À cette échelle, c’est de la pure chance : ces grilles sont comptées à part et n’entrent pas dans les moyennes.</p></div>
  </div>
 </section>

 <section class="panel"><div class="panel-heading"><div><h2>Les autres onglets</h2><p>Pour la curiosité : ils décrivent le passé sans rien prédire.</p></div></div>
  <dl class="guide-list">
   <dt><a href="#overview">Vue d’ensemble</a></dt><dd>Sommes, parité, répétitions d’un tirage à l’autre dans la période choisie.</dd>
   <dt><a href="#numbers">Analyse des numéros</a></dt><dd>Sorties, écart à la moyenne théorique et retard de chaque numéro. Un numéro « en retard » n’est pas « dû ».</dd>
   <dt><a href="#pairs">Explorer les paires</a></dt><dd>Les numéros sortis ensemble le plus souvent.</dd>
   <dt><a href="#tickets">Mes grilles</a></dt><dd>Vos grilles jouées, comparées automatiquement aux tirages, avec le total misé, le total gagné et le solde. Sauvegarde et import en fichier JSON, export CSV.</dd>
   <dt><a href="#history">Historique des tirages</a></dt><dd>Tous les tirages depuis 1976, avec recherche par numéros et export CSV.</dd>
  </dl>
  <p class="guide-note">Les filtres en haut de ces onglets (régime, tirage principal ou second, période) ne changent que l’affichage. Les grilles « peu jouées » et le test long utilisent toujours tout l’historique disponible.</p>
 </section>

 <section class="panel"><div class="panel-heading"><div><h2>Comment l’atelier fonctionne</h2><p>De l’archive FDJ à vos grilles, sans intervention.</p></div></div>
  <ol class="guide-steps">
   <li><strong>Collecte.</strong> Chaque lundi, mercredi et samedi soir, un robot GitHub télécharge l’archive officielle FDJ.</li>
   <li><strong>Contrôle.</strong> Les tirages sont normalisés, dédoublonnés et validés (plages, dates, cohérence), puis les tests sont relancés. En cas d’erreur, rien n’est publié.</li>
   <li><strong>Publication.</strong> Les nouveaux tirages sont enregistrés dans le dépôt, puis Vercel remet le site en ligne en moins d’une minute.</li>
   <li><strong>Alerte.</strong> Si le dernier tirage a plus de 7 jours, la mise à jour échoue volontairement et GitHub envoie un e-mail : la source FDJ a sans doute changé.</li>
   <li><strong>Popularité.</strong> Quand des numéros très joués sortent, il y a proportionnellement plus de gagnants à 3 bons numéros qu’à 2. L’atelier en déduit le profil de popularité de chaque numéro, à partir des gagnants par rang publiés depuis mars 2017.</li>
  </ol>
  <p class="guide-note">Pourquoi 2017 et pas 1976 ? Avant 2008, c’était un autre jeu (6 numéros et un complémentaire). Entre 2008 et 2017, les archives ne donnent que 6 rangs de gains au lieu de 9. Le 2nd tirage n’existe que depuis novembre 2019. En version locale (<code>npm run dev</code>), lancez <code>git pull</code> avant de jouer pour récupérer les derniers tirages.</p>
 </section>

 <section class="info-strip guide-responsible"><span><strong>Jouer doit rester un loisir.</strong> Fixez un budget que vous acceptez de perdre et ne cherchez jamais à « se refaire ». En cas de difficulté : Joueurs Info Service, 09 74 75 13 13 (anonyme, non surtaxé, 7 j/7 de 8 h à 2 h) ou joueurs-info-service.fr.</span></section>
 </div>`;
}

// MB21 · «Perché?» (nota Pagine 048, Ignazio 11/10/2026: «una brevissima spiegazione per ogni passaggio»): dove l'app non fa una cosa,
// la fa diversamente da come ci si aspetta, o c'è qualcosa non allineato, una frase breve dice perché. Mai un blocco muto.
// Un elenco solo dei motivi, così la frase è uguale ovunque e si cambia in un punto. Ogni frase: una riga, fatta di fatti, dice chi lo fa
// o perché non serve, senza imperativi. Le frasi nuove le propone la sessione e le approva Ignazio, una per volta: qui entrano solo quelle approvate.
// Funzioni pure; il disegno («Perché?» che si apre, l'avviso dopo un tocco) è in index.html (percheHtml · diPerche). Prove in tools/banco/prova_perche.js.
(function (radice) {
  const MOTIVI = {
    // Ignazio 11/10/2026, tale e quale (note 047 e 048): un partner e la SdS/OPEN, che è una sola, quella del Team
    sds_team: 'Questa serata viene creata per tutto il team automaticamente, non serve crearne un altro.',
  };
  const perche = codice => MOTIVI[codice] || '';
  const api = { MOTIVI, perche };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Perche = api;
})(this);

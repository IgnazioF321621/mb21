// MB21 · «Perché?» (nota Pagine 048, Ignazio 11/10/2026: «una brevissima spiegazione per ogni passaggio»): dove l'app non fa una cosa,
// la fa diversamente da come ci si aspetta, o c'è qualcosa non allineato, una frase breve dice perché. Mai un blocco muto.
// Un elenco solo dei motivi, così la frase è uguale ovunque e si cambia in un punto. Ogni frase: una riga, fatta di fatti, dice chi lo fa
// o perché non serve, senza imperativi. Le frasi nuove le propone la sessione e le approva Ignazio, una per volta: qui entrano solo quelle approvate.
// Funzioni pure; il disegno («Perché?» che si apre, l'avviso dopo un tocco) è in index.html (percheHtml · diPerche). Prove in tools/banco/prova_perche.js.
(function (radice) {
  const MOTIVI = {
    // Ignazio 11/10/2026, tale e quale (note 047 e 048): un partner e la SdS/OPEN, che è una sola, quella del Team
    sds_team: 'Questa serata viene creata per tutto il team automaticamente, non serve crearne un altro.',
    // una serata ricevuta (nota 027/047) si guarda soltanto: chi la organizza (Ignazio 11/10/2026: «Ignazio organizza Team, Leader organizza LdS,
    // Leader/Platino organizza SdS/OPEN»); chi la riceve conferma la presenza
    ricevuto_team: 'Questa serata la organizza Ignazio: da qui si conferma la presenza.',
    ricevuto_lds: 'Questa serata la organizza il Leader: da qui si conferma la presenza.',
    ricevuto_sds: 'Questa serata la organizza il Leader/Platino: da qui si conferma la presenza.',
  };
  const perche = codice => MOTIVI[codice] || '';
  // il motivo di una serata ricevuta, dal suo tipo (`spazi.tipo`: Team · LOS · SdS/OPEN); per gli altri nessuno
  const codiceRicevuto = tipo => ({ Team: 'ricevuto_team', LOS: 'ricevuto_lds', 'SdS/OPEN': 'ricevuto_sds' })[tipo] || null;
  const api = { MOTIVI, perche, codiceRicevuto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Perche = api;
})(this);

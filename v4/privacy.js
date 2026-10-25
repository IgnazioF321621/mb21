// MB21 · Informativa sulla privacy (Partner 005, decisioni di Ignazio del 04/10/2026): il testo, in parole semplici, e le funzioni pure.
// La parte che si vede (il foglio, la casella «accetto» alla registrazione) è in pagina-privacy.js; le prove in tools/banco/prova_privacy.js (node).
// Titolare: Ignazio Fiorito, ignazio.f@me.com. DA FAR RILEGGERE a chi se ne intende (decisione 04/10) prima di darlo per definitivo:
// quando il testo cambia, si cambia VERSIONE (chi si registra dopo accetta la versione nuova).
(function (radice) {
  const TITOLARE = 'Ignazio Fiorito';
  const CONTATTO = 'ignazio.f@me.com';
  const VERSIONE = '2026-10-04';   // salvata con l'«accetto» (dati dell'account: privacy_versione, privacy_accettata_il)

  // Ogni sezione: titolo e righe. Una riga che comincia con «• » è una voce di elenco.
  const SEZIONI = [
    { titolo: 'Chi si occupa dei tuoi dati', righe: [
      `Il titolare è ${TITOLARE}. Per qualsiasi domanda o richiesta sui tuoi dati scrivi a ${CONTATTO}.`] },
    { titolo: 'Quali dati ci sono', righe: [
      '• I tuoi: nome e cognome, email, telefono, codice Amway, foto (se la metti), password (la custodisce il sistema di accesso, in forma cifrata: nessuno la legge).',
      '• Quello che scrivi nell\'app: contatti, azioni, appuntamenti, note, obiettivi, il tuo «Perché iniziare», i libri letti, le risposte del Training.',
      '• Come usi l\'app: per esempio quando sei entrato l\'ultima volta.',
      '• I punti e i volumi del file Amway del mese, quando l\'Admin lo carica.']},
    { titolo: 'I dati delle persone che inserisci', righe: [
      'Nella tua Lista Nomi metti dati di altre persone: nome, telefono, professione, città, fascia d\'età, note. Sono dati loro, non tuoi: conviene inserire soltanto persone che conosci e usarli per il tuo lavoro in MB21.',
      'Se importi la rubrica, il file si legge sul tuo telefono e niente si salva finché non tocchi «Salva». Si salva soltanto quello che confermi.']},
    { titolo: 'A cosa servono', righe: [
      'A far funzionare l\'app: la tua Lista, l\'Agenda, il coach, il Training, i tuoi numeri e il percorso di chi sta iniziando. E a permettere a chi ti segue di accompagnarti.',
      'Non vendiamo i dati e non li usiamo per la pubblicità.']},
    { titolo: 'Chi li vede', righe: [
      '• Tu vedi tutto quello che hai inserito.',
      '• Chi ti segue (il tuo sponsor e chi sta sopra di te nella squadra) vede soltanto un riepilogo della tua attività: per esempio quando sei entrato, quanti nomi hai, quanti Piani Marketing e contatti, i tuoi punti, gli obiettivi, il CEP, i biglietti BBS e WES e il tuo «Perché iniziare». Non vede i nomi, i telefoni e le note delle persone nella tua Lista.',
      `• ${TITOLARE}, come Admin, può vedere i dati dell'app per gestirla e per aiutarti.`,
      '• Dove un dato sale nella squadra, l\'app lo dice scritto: «Lo vede anche chi ti segue».']},
    { titolo: 'Dove stanno', righe: [
      '• I dati sono nel database di Supabase, con i server in Europa (Francoforte).',
      '• L\'app è pubblicata su GitHub Pages: lì c\'è l\'app, non i tuoi dati.',
      '• Se accendi gli avvisi, il tuo telefono li riceve tramite il servizio di Apple, Google o del tuo browser.',
      '• Se colleghi il calendario, nel tuo calendario compaiono il tipo di incontro, il nome del contatto, l\'orario e le note dell\'appuntamento, e gli incontri di gruppo (Team, LdS, SdS/OPEN) col loro nome. Chi ha il link del calendario li può leggere: il link è personale e conviene non darlo a nessuno.']},
    { titolo: 'Per quanto tempo', righe: [
      `Finché usi MB21. Quando smetti, o quando vuoi, scrivi a ${CONTATTO} e i tuoi dati vengono cancellati.`]},
    { titolo: 'I tuoi diritti', righe: [
      `Puoi chiedere in qualsiasi momento, scrivendo a ${CONTATTO}: una copia dei tuoi dati, di correggerli, di cancellarli, di limitarne l'uso, di riceverli in un file, di opporti a un uso. Se hai dato il consenso puoi ritirarlo quando vuoi.`,
      'Se pensi che i tuoi dati non siano trattati bene puoi rivolgerti al Garante per la protezione dei dati personali (garanteprivacy.it).']},
  ];

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Le sezioni come HTML: i paragrafi sono <p>, le voci con «• » diventano un elenco <ul>
  function testoHtml() {
    return SEZIONI.map(s => {
      let html = `<h4>${esc(s.titolo)}</h4>`, elenco = [];
      const chiudi = () => { if (elenco.length) html += `<ul>${elenco.map(v => `<li>${esc(v)}</li>`).join('')}</ul>`; elenco = []; };
      s.righe.forEach(r => { if (r.startsWith('• ')) elenco.push(r.slice(2)); else { chiudi(); html += `<p>${esc(r)}</p>`; } });
      chiudi();
      return html;
    }).join('');
  }

  // I dati dell'account da salvare con l'«accetto» (alla registrazione, dentro `signUp`)
  function datiAccetto(adesso) {
    return { privacy_versione: VERSIONE, privacy_accettata_il: (adesso || new Date()).toISOString() };
  }

  const api = { TITOLARE, CONTATTO, VERSIONE, SEZIONI, testoHtml, datiAccetto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Privacy = api;
})(typeof self !== 'undefined' ? self : this);

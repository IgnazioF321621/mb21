// MB21 · il momento di riflessione dopo un appuntamento o una telefonata (cantiere 42)
// Funzioni pure e dati: le domande a bottoni del foglietto e, per ogni bottone, dove trovare la risposta
// (Manuale di Avvio 2026, libri PAT rivisti da Ignazio, tracce con il PAL). Nessun accesso alla rete:
// la usano index.html (chiediRiflessione) e tools/banco/prova_riflessione.js.
// Qui ci sono solo RIMANDI (titoli, pagine, capitoli): i testi del manuale e dei PAL non stanno nel repo, che è pubblico.
(function (radice) {
  const nodo = typeof module !== 'undefined' && module.exports;
  const A = nodo ? require('./agenda.js') : radice.MB21Agenda;
  const L = nodo ? require('./lista.js') : radice.MB21Lista;

  // Ignazio 23/09: «ho paura che non scriva nessuno, specialmente se le cose non sono andate bene; con un click,
  // io che sono un malato di dati, possiamo ricavare tanti dati». Quindi bottoni, e una sola frase libera: quella che si rilegge.
  // modo: 'uno' (una scelta) · 'piu' (più scelte; `nessuna` le toglie tutte) · 'testo' (scritta o dettata col microfono della tastiera)
  const ANDATA = { chiave: 'andata', domanda: 'Com\'è andata?', modo: 'uno', scelte: ['Bene', 'Così così', 'Male'] };
  const PROSSIMA = { chiave: 'prossima', domanda: 'Cosa farai la prossima volta?', modo: 'testo' };
  // Obiezioni allineate al Manuale di Avvio 2026 (Ignazio 23/09 notte): al telefono pag. 13-14, dopo il piano pag. 25-27
  const OBIEZIONI = {
    telefonata: ['Di cosa si tratta?', 'Non ho tempo', 'È vendita?', 'È network marketing?', 'È Amway?', 'Perché anche il partner?'],
    piano: ['Non ho tempo', 'Non sono la persona giusta', 'Non sono in grado', 'I prodotti costano', 'Mercato saturo', 'È una piramide',
      'Non voglio sfruttare gli amici', 'Ci penso', 'Ne parlo in famiglia', 'Non conosco nessuno', 'Ne ho sentito parlare male'],
    prodotti: ['Costa troppo', 'Non ne ho bisogno', 'Compro già altro', 'Voglio provarlo prima', 'Ci devo pensare'],
    partner: ['Poco tempo', 'Paura di contattare', 'Lista finita', 'Poco entusiasmo', 'Pressioni in famiglia', 'Non ascolta le tracce'],
  };
  const MOTIVI_NON_AVVENUTO = ['Imprevisto vero', 'Se n\'è dimenticato', 'Scusa, poco interesse', 'Non risponde più'];
  // Rimandato e No Show (Ignazio 23/09): in alto il suo consiglio su cosa fare. «Standby» è un modo di dire: Richiamare o si lascia rientrare in coda.
  const CONSIGLI_NON_AVVENUTO = {
    'Rimandato': 'Chiedi se è successo qualcosa di importante e fissa già l\'incontro successivo.',
    'No Show': 'Chiamalo il giorno dopo e chiedi se è tutto a posto o se è successo qualcosa. Se ti chiede lui/lei di rifissare, bene; altrimenti mettilo in standby.',
  };
  const obiezioni = gruppo => gruppo === 'partner'
    ? { chiave: 'freni', gruppo, domanda: 'Cosa lo frena?', modo: 'piu', scelte: OBIEZIONI.partner, nessuna: 'Niente' }
    : { chiave: 'obiezioni', gruppo, domanda: 'Che obiezioni sono venute fuori?', modo: 'piu', scelte: OBIEZIONI[gruppo], nessuna: 'Nessuna' };
  const GRUPPO_DEL_TIPO = { 'Contatto': 'telefonata', 'Piano Marketing': 'piano', 'Follow Up': 'piano', 'Consulenza PRD': 'prodotti', 'Appuntamento': 'partner' };
  // la domanda in più di ogni tipo di appuntamento (la telefonata no: basta l'obiezione)
  const DEL_TIPO = {
    'Piano Marketing': { chiave: 'colpito', domanda: 'Cosa l\'ha colpito di più?', modo: 'uno', scelte: ['Il reddito', 'Il tempo libero', 'I prodotti', 'Crescere con un gruppo', 'Niente in particolare'] },
    'Follow Up': { chiave: 'perche', domanda: 'Il suo perché', modo: 'uno', scelte: ['Soldi', 'Tempo', 'Libertà', 'Famiglia', 'Crescita personale', 'Non emerso'] },
    'Consulenza PRD': { chiave: 'interesse', domanda: 'Cosa l\'ha interessato?', modo: 'piu', scelte: L.BRAND.map(b => b[0]) },   // gli stessi brand delle Vendite
    'Appuntamento': { chiave: 'aiutato', domanda: 'Su cosa l\'hai aiutato?', modo: 'piu', scelte: ['Lista nomi', 'Contatti e inviti', 'Piano', 'Mentalità', 'Obiettivi e Pacesetter', 'Prodotti'] },
  };
  const ESITI_SENZA_PAROLE = ['No Risposta', 'Telefono spento'];   // nessuno dall'altra parte: niente su cui riflettere

  // Il foglietto dopo un esito: { consiglio, domande } oppure null (niente foglietto). Niente dopo le telefonate senza risposta
  // e dopo il «Fatto» del PM (è il primo passo: il foglietto arriva con il risultato). Un tipo fuori elenco (vecchi di Glide): com'è andata + la frase.
  function schedaRiflessione(tipo, esito) {
    if (!tipo || !esito || esito === A.fattoDi(tipo)) return null;
    if (tipo === 'Contatto' && ESITI_SENZA_PAROLE.includes(esito)) return null;
    if (CONSIGLI_NON_AVVENUTO[esito]) {
      return { consiglio: CONSIGLI_NON_AVVENUTO[esito], domande: [{ chiave: 'motivo', gruppo: 'motivi', domanda: 'Il motivo', modo: 'uno', scelte: MOTIVI_NON_AVVENUTO }, PROSSIMA] };
    }
    const domande = [ANDATA];
    if (GRUPPO_DEL_TIPO[tipo]) domande.push(obiezioni(GRUPPO_DEL_TIPO[tipo]));
    if (DEL_TIPO[tipo]) domande.push(DEL_TIPO[tipo]);
    domande.push(PROSSIMA);
    return { consiglio: null, domande };
  }

  // Un tocco su un bottone: la nuova scelta della domanda. 'uno' si accende e si spegne; 'piu' somma,
  // e «Nessuna»/«Niente» toglie le altre (e viceversa).
  function scegli(d, attuale, scelta) {
    if (d.modo === 'uno') return attuale === scelta ? null : scelta;
    const prima = Array.isArray(attuale) ? attuale : [];
    if (scelta === d.nessuna) return prima.includes(scelta) ? [] : [scelta];
    const senza = prima.filter(x => x !== d.nessuna);
    return senza.includes(scelta) ? senza.filter(x => x !== scelta) : [...senza, scelta];
  }

  // Da quanto scelto e scritto nel foglietto ({ chiave: valore }) a quanto si salva in azioni.riflessione:
  // solo le risposte date, ognuna con la sua domanda (le domande cambieranno); null = nessuna risposta
  function riflessioneDa(domande, valori) {
    const risposte = [];
    for (const d of domande) {
      const v = (valori || {})[d.chiave];
      const risposta = d.modo === 'piu' ? (Array.isArray(v) ? v.filter(Boolean) : [])
        : d.modo === 'uno' ? (v || '') : String(v || '').trim();
      if (Array.isArray(risposta) ? risposta.length : risposta) risposte.push({ chiave: d.chiave, domanda: d.domanda, risposta });
    }
    return risposte.length ? risposte : null;
  }

  // ── Dove trovare la risposta, per ogni bottone (cantiere 42, passo 3: il consiglio senza intelligenza artificiale) ──
  // manuale = pagina del Manuale di Avvio 2026 · libro = capitolo dei PAT rivisti (per ora Napoleon Hill) · traccia = PAL di Bini.
  // Preparati da Claude la notte del 23-24/09 dai titoli e dalle parole dei PAL: da correggere con Ignazio.
  const MANUALE = 'Manuale di Avvio';
  const PENSA = 'Pensa e arricchisci te stesso', DIRITTO = 'Hai diritto di essere ricco', VENDITORE = 'Venditore di te stesso nella vita';
  const RIMANDI = {
    telefonata: {
      'Di cosa si tratta?': { manuale: 13, libro: [VENDITORE, 'cap. 3 · La strategia del venditore esperto'] },
      'Non ho tempo': { manuale: 13, libro: [DIRITTO, 'Principio 16 · Metti a budget tempo e denaro'] },
      'È vendita?': { manuale: 14, libro: [VENDITORE, 'cap. 1 · Definizione di arte della vendita'] },
      'È network marketing?': { manuale: 14, libro: [DIRITTO, 'Principio 11 · Pensiero accurato'] },
      'È Amway?': { manuale: 14, libro: [DIRITTO, 'Principio 11 · Pensiero accurato'] },
      'Perché anche il partner?': { manuale: 14, libro: [PENSA, 'cap. 10 · Il potere dell\'alleanza di cervelli'] },
    },
    piano: {
      'Non ho tempo': { manuale: 26, libro: [DIRITTO, 'Principio 16 · Metti a budget tempo e denaro'] },
      'Non sono la persona giusta': { manuale: 26, libro: [PENSA, 'cap. 3 · La fede'] },
      'Non sono in grado': { manuale: 26, libro: [PENSA, 'cap. 15 · I sei spettri della paura'] },
      'I prodotti costano': { manuale: 27, libro: [VENDITORE, 'cap. 3 · La strategia del venditore esperto'] },
      'Mercato saturo': { manuale: 27, libro: [DIRITTO, 'Principio 11 · Pensiero accurato'] },
      'È una piramide': { manuale: 27, libro: [DIRITTO, 'Principio 11 · Pensiero accurato'] },
      'Non voglio sfruttare gli amici': { manuale: 27, libro: [DIRITTO, 'Principio 4 · Fare il miglio in più'] },
      'Ci penso': { manuale: 25, libro: [PENSA, 'cap. 8 · La decisione'] },
      'Ne parlo in famiglia': { manuale: 25, libro: [PENSA, 'cap. 10 · Il potere dell\'alleanza di cervelli'] },
      'Non conosco nessuno': { manuale: 6, libro: [DIRITTO, 'Principio 6 · Iniziativa personale'] },
      'Ne ho sentito parlare male': { manuale: 25, libro: [PENSA, 'cap. 9 · La tenacia (9.7 Se temete le critiche)'] },
    },
    prodotti: {
      'Costa troppo': { manuale: 27, libro: [VENDITORE, 'cap. 3 · La strategia del venditore esperto'] },
      'Non ne ho bisogno': { libro: [VENDITORE, 'cap. 4 · Qualità da sviluppare nel venditore esperto'] },
      'Compro già altro': { manuale: 27, libro: [VENDITORE, 'cap. 3 · La strategia del venditore esperto'] },
      'Voglio provarlo prima': { manuale: 27, libro: [VENDITORE, 'cap. 3 · La strategia del venditore esperto'] },
      'Ci devo pensare': { manuale: 25, libro: [PENSA, 'cap. 8 · La decisione'] },
    },
    partner: {
      'Poco tempo': { manuale: 30, libro: [DIRITTO, 'Principio 16 · Metti a budget tempo e denaro'] },
      'Paura di contattare': { manuale: 8, libro: [PENSA, 'cap. 15 · I sei spettri della paura'] },
      'Lista finita': { manuale: 6, libro: [DIRITTO, 'Principio 6 · Iniziativa personale'] },
      'Poco entusiasmo': { manuale: 32, libro: [DIRITTO, 'Principio 9 · Entusiasmo'] },
      'Pressioni in famiglia': { manuale: 25, libro: [PENSA, 'cap. 9 · La tenacia (9.7 Se temete le critiche)'] },
      'Non ascolta le tracce': { manuale: 33, libro: [DIRITTO, 'Principio 8 · Autodisciplina'] },
    },
    motivi: {
      'Imprevisto vero': { manuale: 15 },
      'Se n\'è dimenticato': { manuale: 15 },
      'Scusa, poco interesse': { manuale: 12, libro: [PENSA, 'cap. 9 · La tenacia'] },
      'Non risponde più': { manuale: 12, libro: [PENSA, 'cap. 9 · La tenacia'] },
    },
  };
  // le tracce di Bini con il PAL da riascoltare, per bottone (solo il titolo: i PAL restano in Evernote).
  // Scelte da Claude il 24/09 (mb21-import/training/collega.py, fuori dal progetto): da correggere con Ignazio.
  const TRACCE = {
    "telefonata": {
      "Di cosa si tratta?": "Massimo Bini · La scelta vincente",
      "Non ho tempo": "Massimo Bini · Sfondare nella vita",
      "È vendita?": "Massimo Bini · La tua opinione è quella che conta",
      "È network marketing?": "Massimo Bini · Rimuovere dubbi e idee sbagliate",
      "È Amway?": "Massimo Bini · Rimuovere dubbi e idee sbagliate / La tua opinione è quella che conta",
      "Perché anche il partner?": "Massimo Bini · La storia v1"
    },
    "piano": {
      "Non ho tempo": "Massimo Bini · Sfondare nella vita / Prendere il controllo assegnando le priorità",
      "Non sono la persona giusta": "Massimo Bini · L'opportunità sei tu",
      "Non sono in grado": "Massimo Bini · Credi in te stesso",
      "I prodotti costano": "Massimo Bini · Rimuovere dubbi e idee sbagliate / La scelta vincente",
      "Mercato saturo": "Massimo Bini · Rimuovere dubbi e idee sbagliate",
      "È una piramide": "Massimo Bini · Rimuovere dubbi e idee sbagliate / La tua opinione è quella che conta",
      "Non voglio sfruttare gli amici": "Massimo Bini · Le persone sono la nostra priorità / Superare la paura del giudizio degli altri",
      "Ci penso": "Massimo Bini · Stesse decisioni = stessi risultati / Il potere delle decisioni",
      "Ne parlo in famiglia": "Massimo Bini · La storia v1",
      "Non conosco nessuno": "Massimo Bini · 8 passi per avere successo",
      "Ne ho sentito parlare male": "Massimo Bini · Superare la paura del giudizio degli altri / Tre fasi dell’attività"
    },
    "prodotti": {
      "Costa troppo": "Massimo Bini · Rimuovere dubbi e idee sbagliate / La scelta vincente",
      "Non ne ho bisogno": "Massimo Bini · Produrre profitto in Amway",
      "Compro già altro": "Massimo Bini · La scelta vincente",
      "Voglio provarlo prima": "Massimo Bini · La scelta vincente",
      "Ci devo pensare": "Massimo Bini · Stesse decisioni = stessi risultati"
    },
    "partner": {
      "Poco tempo": "Massimo Bini · Prendere il controllo assegnando le priorità / Core ed il modulo di autovalutazione",
      "Paura di contattare": "Massimo Bini · Come superare le vostre paure",
      "Lista finita": "Massimo Bini · 8 passi per avere successo",
      "Poco entusiasmo": "Massimo Bini · L’atteggiamento sponsorizza / Sviluppare una personalità attraente",
      "Pressioni in famiglia": "Massimo Bini · Superare la paura del giudizio degli altri / Tre fasi dell’attività",
      "Non ascolta le tracce": "Massimo Bini · Il potere dei CD / Come sviluppare un mindset di successo"
    },
    "motivi": {
      "Imprevisto vero": "Massimo Bini · Come organizzare un Piano in casa",
      "Se n'è dimenticato": "Massimo Bini · Come organizzare un Piano in casa",
      "Scusa, poco interesse": "Massimo Bini · Migliorare l'efficacia del Piano online",
      "Non risponde più": "Massimo Bini · Desiderio. Impegno. Abilità. Persistenza"
    }
  };
  // I rimandi di un bottone, pronti da mostrare: [{ fonte: 'manuale'|'libro'|'traccia', testo }]
  function rimandiPer(gruppo, scelta) {
    const r = (RIMANDI[gruppo] || {})[scelta];
    const t = (TRACCE[gruppo] || {})[scelta];
    const out = [];
    if (r && r.manuale) out.push({ fonte: 'manuale', testo: `${MANUALE}, pag. ${r.manuale}` });
    if (r && r.libro) out.push({ fonte: 'libro', testo: `${r.libro[0]} · ${r.libro[1]}` });
    if (t) out.push({ fonte: 'traccia', testo: t });
    return out;
  }

  const api = { ANDATA, PROSSIMA, OBIEZIONI, MOTIVI_NON_AVVENUTO, CONSIGLI_NON_AVVENUTO, DEL_TIPO, GRUPPO_DEL_TIPO, ESITI_SENZA_PAROLE,
    schedaRiflessione, scegli, riflessioneDa, RIMANDI, TRACCE, rimandiPer };
  if (nodo) module.exports = api;
  else radice.MB21Riflessione = api;
})(this);

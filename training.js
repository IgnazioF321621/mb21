// MB21 · la pagina Training (cantiere 45, dal 24/09/2026): funzioni pure. Due parti.
// 1. Allenarsi (Ignazio 24/09: le flashcard «come si studia all'università» più Duolingo, «un percorso di crescita che va verso l'alto»):
//    i sette livelli con i loro percorsi, le carte a cinque scatole (Leitner), le carte nuove di Impara, il ripasso del giorno
//    (anche le obiezioni capitate davvero nelle chat del coach), il test finale con le stelle, i giorni di fila.
// 2. Studiare (cantiere 42): il catalogo (i capitoli del Manuale di Avvio, le tracce del BSM con i loro appunti, i libri a catalogo)
//    e la ricerca.
// I testi non stanno qui (il progetto è pubblico): le carte e il catalogo sono nell'archivio privato (coach_batterie, righe «carte_…» e
// «training»), la biblioteca nella tabella materiali. Lo usano pagina-training.js e tools/banco/prova_training.js.
(function (radice) {
  const nodo = typeof module !== 'undefined' && module.exports;
  const C = nodo ? require('./coach.js') : radice.MB21Coach;

  // ── 1. Allenarsi ───────────────────────────────────────────

  // I livelli coi nomi dell'attività (Ignazio 24/09), dal basso verso l'alto; i temi sono quelli divisi con lui lo stesso giorno.
  // Ogni livello: le persone, l'attività dall'interno e, dallo Sponsor in su, un percorso di mentalità (dal credere in te alla visione).
  // Un percorso è pronto quando nell'archivio c'è la riga «carte_<id>»; gli altri si vedono «in arrivo».
  // `leader` (Ignazio 25/09): il titolo della medaglia del percorso, «Complimenti, sei leader nel contattare!» (senza «un»: va bene per tutti)
  const LIVELLI = [
    { nome: 'Nuovo', sotto: 'La lista, la telefonata, i primi passi, dire il vero, il Sistema', percorsi: [
      { id: 'contattare', titolo: 'Contattare', sotto: 'La lista, la telefonata, le obiezioni al telefono', icona: 'telefonate', leader: 'nel contattare' },
      { id: 'primi_passi', titolo: 'I primi passi', sotto: "I prodotti per te, l'ordine ricorrente, l'inaugurazione", icona: 'avvio', leader: 'nei primi passi' },
      // 28/09 (Ignazio: «le aree di mercato le farei partire già dal nuovo, e il nuovo deve conoscere l'Energy Program»): le quattro
      // aree in generale; il dettaglio per area sta nel livello Sponsor. Provato da Ignazio e aperto a tutti lo stesso giorno
      { id: 'aree', titolo: 'Le aree di mercato', sotto: 'Nutrizione, bellezza, casa e persona: da dove parte il volume', icona: 'prodotti', leader: 'nelle aree di mercato' },
      // 25/09: dalle Regole di Condotta Amway solo le regole su cose false dette o fatte (Ignazio: «vai a prendere le regole solo per
      // quanto riguarda fare cose false e dire cose false in generale»; per i contatti restano le idee del manuale)
      { id: 'dire_il_vero', titolo: 'Dire sempre il vero', sotto: "Le Regole di Condotta Amway: i prodotti, i social, l'attività, i guadagni", icona: 'fatto', leader: 'nel dire sempre il vero' },
      { id: 'sistema', titolo: 'Il Sistema', sotto: 'Open, BBS, WES, CEP e libri', icona: 'agenda', leader: 'nel Sistema' },
      { id: 'principi', titolo: 'Principi e parole', sotto: "I 9 principi guida e le parole dell'attività", icona: 'libro', leader: 'nei principi e nelle parole' },
    ] },
    { nome: 'Sponsor', sotto: 'Presentare il piano, il Dare Seguito, i clienti, avviare un nuovo', percorsi: [
      { id: 'piano', titolo: 'Il Piano Marketing', sotto: 'Presentarlo, anche in casa: prima, durante e dopo', icona: 'pianomarketing', leader: 'nel Piano Marketing' },
      { id: 'dare_seguito', titolo: 'Dare Seguito', sotto: 'Entro 24-72 ore: le paure, le domande, le obiezioni dopo il piano', icona: 'followup', leader: 'nel Dare Seguito' },
      { id: 'clienti', titolo: 'I clienti', sotto: 'I prodotti, i clienti e il volume di ogni mese', icona: 'cliente', leader: 'con i clienti' },
      { id: 'area_nutrizione', titolo: "L'area nutrizione", sotto: "L'Energy Program: il primo ordine e il riordino", icona: 'prodotti', leader: "nell'area nutrizione", solo_admin: true },
      { id: 'area_casa', titolo: "L'area casa: eSpring", sotto: 'Da dove si parte, cosa si dice, il filtro, il riordino', icona: 'casa', leader: "nell'area casa", solo_admin: true },
      { id: 'avviare', titolo: 'Avviare un nuovo', sotto: 'I quattro passi e i primi 30 giorni, dalla parte dello sponsor', icona: 'avvio', leader: 'nell\'avviare un nuovo' },
      { id: 'core', titolo: 'Core e Pacesetter', sotto: 'Le sette caratteristiche, il Pacesetter, il counseling con la tua upline', icona: 'obiettivi', leader: 'nel Core e nel Pacesetter' },
      { id: 'credere', titolo: 'Credere in te', sotto: 'La tua opinione, i «no», la persona che diventi', icona: 'crescita', leader: 'nel credere in te' },
    ] },
    { nome: 'Leaders Club', sotto: 'Aiutare i tuoi partner, i Segni Vitali, il counseling', percorsi: [
      { id: 'aiutare_partner', titolo: 'Aiutare i tuoi partner', sotto: 'Le telefonate e i piani insieme, i loro freni', icona: 'partner', leader: 'nell\'aiutare i tuoi partner' },
      { id: 'segni_vitali', titolo: 'Segni Vitali', sotto: 'I numeri che dicono se il gruppo è solido, e i riconoscimenti', icona: 'segnivitali', leader: 'nei Segni Vitali' },
      { id: 'dare_counseling', titolo: 'Dare counseling', sotto: "Il counseling ai tuoi, l'edificazione, il no crossline", icona: 'squadra', leader: 'nel dare counseling' },
      { id: 'sistema_gruppo', titolo: 'Il Sistema nel gruppo', sotto: 'Biglietti, CEP, Media Sharing e il ciclo di 4 mesi', icona: 'biglietto', leader: 'nel Sistema del gruppo' },
      { id: 'paure', titolo: 'Vincere le paure', sotto: 'Il giudizio degli altri, i fallimenti, la zona di comfort', icona: 'lampo', leader: 'nel vincere le paure' },
    ] },
    { nome: 'Leader Executive', sotto: 'Far crescere i leader, la duplicazione', percorsi: [
      { id: 'profondita', titolo: 'Costruire in profondità', sotto: 'Cercare il leader, di livello in livello', icona: 'mappa', leader: 'nel costruire in profondità' },
      { id: 'leader', titolo: 'Far crescere i leader', sotto: 'Riconoscerli, rafforzarli, lasciarli guidare', icona: 'stella', leader: 'nel far crescere i leader' },
      { id: 'obiettivi_mese', titolo: 'Gli obiettivi del mese', sotto: "Dal sogno al piano d'azione, con i Segni Vitali", icona: 'agenda', leader: 'negli obiettivi del mese' },
      { id: 'duplicazione', titolo: 'La duplicazione', sotto: 'Fare solo quello che altri possono rifare', icona: 'copia', leader: 'nella duplicazione' },
      { id: 'abitudini', titolo: 'Le abitudini', sotto: 'Le piccole decisioni di ogni giorno', icona: 'orario', leader: 'nelle abitudini' },
    ] },
    { nome: 'Leader Bronzo', sotto: 'Allargare e approfondire le linee', percorsi: [
      { id: 'verso_21', titolo: 'Verso il 21%', sotto: 'Il Bonus Attività, i punti e il principio della leva', icona: 'volume', leader: 'nella strada verso il 21%' },
      { id: 'linee', titolo: 'Larghezza e profondità', sotto: 'Più linee, e ognuna solida', icona: 'report', leader: 'nel costruire larghezza e profondità' },
      { id: 'persistere', titolo: 'Persistere', sotto: 'Desiderio, impegno, abilità, persistenza', icona: 'fiamma', leader: 'nel persistere' },
    ] },
    { nome: 'Leader Argento', sotto: "Tenere il 21%, l'attività internazionale", percorsi: [
      { id: 'argento', titolo: 'Il Produttore Argento', sotto: 'Il 21% con linee solide, mese dopo mese', icona: 'complimenti', leader: 'nel tenere il 21%' },
      { id: 'internazionale', titolo: "L'attività internazionale", sotto: 'Lo sponsor internazionale e lo sponsor adottivo', icona: 'liberta', leader: 'nell\'attività internazionale' },
      { id: 'guidare', titolo: 'Guidare le persone', sotto: 'Connettersi, ascoltare, mettere le persone al primo posto', icona: 'persona', leader: 'nel guidare le persone' },
    ] },
    { nome: 'Platino', sotto: 'Portare i tuoi leader al 21%', percorsi: [
      { id: 'bonus_leader', titolo: 'Il Bonus Leader', sotto: 'I tuoi leader al 21%, verso Smeraldo e Diamante', icona: 'stella', leader: 'nel portare i tuoi leader al 21%' },
      { id: 'esempio', titolo: "Guidare con l'esempio", sotto: 'Il ritmo, i valori e le abitudini che si duplicano', icona: 'squadra', leader: 'nel guidare con l\'esempio' },
      { id: 'visione', titolo: 'La visione', sotto: 'Vedere lontano: dieci anni, il Diamante, il Weekend Seminar', icona: 'visione', leader: 'nella visione' },
    ] },
  ];

  // Le cinque scatole: dopo quanti giorni torna una carta (Ignazio 24/09: domani, 3 giorni… 1 mese). Giusta avanza di una, sbagliata
  // torna alla prima.
  const SCATOLE = [1, 3, 7, 14, 30];
  const LEZIONE = 6;          // carte nuove in una lezione di Impara
  const RIPASSO = 15;         // carte in un ripasso: circa 5 minuti
  const TEST = 10;            // domande del test finale
  const TRABOCCHETTI = 3;     // nel test almeno 3 trabocchetti, se ci sono (Ignazio 24/09: «la voglia di imparare e la rabbia se ancora non so le cose»)
  const MINIMO_MAZZO = 5;     // un mazzo si carica anche con poche carte, purché tutte certificate: cresce con le note nuove (Ignazio 29/09)
  const PER_IL_TEST = 0.8;    // il test si apre quando le sai almeno 8 su 10 (Ignazio 24/09)
  const piuGiorni = (giorno, n) => { const d = new Date(giorno + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const quando = t => (t ? Date.parse(t) || 0 : 0);

  // Lo stato di una carta dopo una risposta. `stato`: { scatola, prossima, giuste, sbagliate } o niente (carta nuova); `oggi` AAAA-MM-GG.
  // Nel test una giusta non sposta la carta (si ripassa quando tocca), una sbagliata la rimette nella prima scatola.
  function dopoRisposta(stato, giusta, oggi, opz = {}) {
    const s = stato || {}, conti = { giuste: (s.giuste || 0) + (giusta ? 1 : 0), sbagliate: (s.sbagliate || 0) + (giusta ? 0 : 1) };
    if (opz.test && giusta && stato) return { scatola: s.scatola, prossima: s.prossima, ...conti };
    const scatola = giusta ? Math.min(SCATOLE.length, (s.scatola || 0) + 1) : 1;
    return { scatola, prossima: piuGiorni(oggi, SCATOLE[scatola - 1]), ...conti };
  }

  // Le carte nuove di un percorso, nell'ordine del mazzo (è l'ordine in cui si impara)
  const nuove = (mazzo, stati, quante = LEZIONE) => (mazzo ? mazzo.carte.filter(c => !(stati || {})[c.id]).slice(0, quante) : []);

  // Le obiezioni capitate davvero: dalle chat del coach, per ogni carta che ha la sua obiezione, l'ultima volta che è stata toccata.
  // `azioni`: { tipo_azione, modalita, esito, riflessione, inizio, creato_il, contatti: { categoria } }. Una carta dice `obiezione` e,
  // se non è del telefono con un Prospect, `situazioni` (le chat del coach: telefonata, piano_marketing…).
  function segnali(azioni, mazzi) {
    const ultima = {};
    for (const a of azioni || []) {
      const sit = C.situazione(a.tipo_azione, a.modalita, a.contatti && a.contatti.categoria, a.esito);
      if (!sit || !Array.isArray(a.riflessione)) continue;
      const t = a.inizio || a.creato_il;
      for (const r of a.riflessione) {
        if (!r || !['obiezioni', 'freni'].includes(r.chiave) || !Array.isArray(r.risposta)) continue;
        for (const nome of r.risposta) { const k = sit + '|' + nome; if (quando(t) > quando(ultima[k])) ultima[k] = t; }
      }
    }
    const out = {};
    for (const m of mazzi || []) for (const c of m.carte) {
      if (!c.obiezione) continue;
      const t = (c.situazioni || ['telefonata']).map(s => ultima[s + '|' + c.obiezione]).filter(Boolean).sort((a, b) => quando(b) - quando(a))[0];
      if (t) out[c.id] = t;
    }
    return out;
  }

  // Il ripasso di oggi, di tutti i percorsi insieme: le carte scadute e quelle la cui obiezione è capitata davvero dopo l'ultima risposta
  // (anche mai viste). Prima quelle capitate, poi le più deboli (scatola bassa), poi le scadute da più tempo.
  // `stati`: carta → { scatola, prossima, risposta_il }; `segn`: carta → quando è capitata. Dà [{ carta, percorso, capitata }].
  function daRipassare(mazzi, stati, oggi, segn, quante) {
    const st = stati || {}, sg = segn || {}, out = [];
    for (const m of mazzi || []) for (const c of m.carte) {
      const s = st[c.id], capitata = !!sg[c.id] && (!s || quando(sg[c.id]) > quando(s.risposta_il));
      if (capitata || (s && s.prossima <= oggi)) out.push({ carta: c, percorso: m.percorso.id, capitata, scatola: s ? s.scatola : 0, prossima: s ? s.prossima : oggi });
    }
    out.sort((a, b) => (b.capitata - a.capitata) || (a.scatola - b.scatola) || a.prossima.localeCompare(b.prossima));
    return quante ? out.slice(0, quante) : out;
  }

  // Quante carte tornano nei prossimi giorni (per «domani 4 carte»): { giorno: n } dal giorno dopo oggi
  function prossimiRipassi(stati, oggi) {
    const out = {};
    for (const s of Object.values(stati || {})) if (s && s.prossima > oggi) out[s.prossima] = (out[s.prossima] || 0) + 1;
    return out;
  }

  // Le stelle di un test: 10 su 10 tre stelle, dall'80% due, dal 70% una (superato); sotto, nessuna
  function stelle(giuste, totale) {
    if (!totale) return 0;
    const r = giuste / totale;
    return r >= 1 ? 3 : r >= 0.8 ? 2 : r >= 0.7 ? 1 : 0;
  }

  // Un percorso a colpo d'occhio: carte viste, sapute (dalla terza scatola: giuste tre volte di fila, in giorni diversi), da ripassare,
  // il test (Ignazio 24/09: si apre quando le sai, almeno 8 su 10, non appena viste; `perIlTest` = quante ne mancano), le stelle migliori,
  // l'ultimo e il penultimo test (per «la volta scorsa 6: +2»). `test`: [{ percorso, giuste, totale, fatto_il }].
  function statoPercorso(mazzo, stati, test, oggi) {
    const st = stati || {}, carte = mazzo ? mazzo.carte : [], viste = carte.filter(c => st[c.id]);
    const miei = (test || []).filter(t => mazzo && t.percorso === mazzo.percorso.id).sort((a, b) => quando(a.fatto_il) - quando(b.fatto_il));
    const migliori = miei.reduce((n, t) => Math.max(n, stelle(t.giuste, t.totale)), 0);
    const sapute = viste.filter(c => st[c.id].scatola >= 3).length, servono = Math.ceil(carte.length * PER_IL_TEST);
    return {
      totale: carte.length, viste: viste.length, nuove: carte.length - viste.length, sapute,
      daRipassare: viste.filter(c => st[c.id].prossima <= oggi).length,
      tutteViste: carte.length > 0 && viste.length === carte.length,
      testAperto: carte.length > 0 && sapute >= servono, perIlTest: Math.max(0, servono - sapute), servono,
      stelle: migliori, superato: migliori >= 1,
      ultimo: miei[miei.length - 1] || null, penultimo: miei[miei.length - 2] || null,
    };
  }

  // La scala dei livelli (Ignazio 24/09): dentro un livello i percorsi si aprono uno dopo l'altro, il successivo quando hai visto tutte le
  // carte di quello prima (o se l'hai già cominciato: una carta aggiunta dopo non lo richiude); un livello si apre quando tutti i percorsi
  // del livello sotto hanno il test superato. Dà { livelli: [{ nome, sotto, numero, aperto, superato, percorsi: [{ …, pronto, aperto, prima }] }],
  // qui, percorso } (qui = il livello più alto aperto; percorso = dove sei: il primo aperto con carte nuove, se no il primo col test da fare).
  function scala(mazzi, stati, test, oggi) {
    const perId = Object.fromEntries((mazzi || []).map(m => [m.percorso.id, m]));
    const livelli = [];
    let aperto = true;
    livelliVisibili().forEach((l, i) => {
      const percorsi = [];
      for (const p of l.percorsi) {
        const mazzo = perId[p.id] || null, stato = mazzo ? statoPercorso(mazzo, stati, test, oggi) : null, prima = percorsi[percorsi.length - 1];
        const suo = !prima || !!(prima.stato && prima.stato.tutteViste) || !!(stato && stato.viste);
        percorsi.push({ ...p, pronto: !!mazzo, mazzo, stato, aperto: aperto && suo, prima: prima ? prima.titolo : null });
      }
      const superato = percorsi.length > 0 && percorsi.every(p => p.stato && p.stato.superato);
      livelli.push({ nome: l.nome, sotto: l.sotto, numero: i + 1, aperto, superato, percorsi });
      aperto = aperto && superato;
    });
    const qui = livelli.filter(l => l.aperto).pop();
    const aperti = qui.percorsi.filter(p => p.pronto && p.aperto);
    const dove = aperti.find(p => p.stato.nuove > 0) || aperti.find(p => !p.stato.superato) || null;
    return { livelli, qui, percorso: dove ? dove.id : null };
  }

  // Una carta a risposta: scena, vero o falso, o una frase con le sue tre alternative sbagliate (Ignazio 29/09: «scegli quella completa»)
  const aRisposta = c => c.tipo === 'scena' || c.tipo === 'vf' || (c.tipo === 'frase' && Array.isArray(c.sbagliate) && c.sbagliate.length === 3);

  // Le domande del test finale: dalle carte a risposta (scene, vero o falso, frasi da scegliere) del percorso, prima le più deboli (scatola bassa, più
  // sbagliate) con un po' di caso, e almeno tre trabocchetti se ci sono; poi in ordine sparso. `rnd` = Math.random (nelle prove, fisso).
  function pescaTest(mazzo, stati, quante = TEST, rnd = Math.random) {
    const st = stati || {};
    const adatte = (mazzo ? mazzo.carte : []).filter(aRisposta);
    const peso = c => { const s = st[c.id] || {}; return (s.scatola || 0) * 10 - (s.sbagliate || 0) * 3 + rnd() * 12; };
    const ordinate = adatte.map(c => ({ c, p: peso(c) })).sort((a, b) => a.p - b.p).map(x => x.c);
    const scelte = ordinate.slice(0, quante);
    const trabocchetti = ordinate.filter(c => c.trabocchetto && !scelte.includes(c));
    for (let i = scelte.length - 1; i >= 0 && scelte.filter(c => c.trabocchetto).length < TRABOCCHETTI && trabocchetti.length; i--)
      if (!scelte[i].trabocchetto) scelte[i] = trabocchetti.shift();
    return mescola(scelte, rnd);
  }

  function mescola(v, rnd = Math.random) {
    const a = [...v];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // Una carta pronta da mostrare. Scena: una delle sue versioni, le tre risposte in ordine sparso (nel mazzo la prima è quella giusta).
  // Vero o falso: i due bottoni, sempre in quest'ordine. Frase: davanti e dietro, e si risponde «la sapevo / non la sapevo»; prima di
  // girarla la carta dice di rispondere a voce (Ignazio 24/09: la carta si girava subito, senza provare a ricordare), con le parole
  // della carta se ne ha (`aiuto`, es. «come al telefono»).
  const AIUTO_FRASE = 'Prima rispondi a voce. Poi gira la carta.';
  function domanda(carta, rnd = Math.random) {
    if (carta.tipo === 'scena') {
      const v = carta.versioni[Math.floor(rnd() * carta.versioni.length)];
      return { tipo: 'scena', testo: v.scena, risposte: mescola(v.risposte.map((t, i) => ({ testo: t, giusta: i === 0 })), rnd) };
    }
    if (carta.tipo === 'vf') return { tipo: 'vf', testo: carta.frase, risposte: [{ testo: 'Vero', giusta: carta.vero === true }, { testo: 'Falso', giusta: carta.vero === false }] };
    if (aRisposta(carta)) return { tipo: 'scelta', testo: carta.davanti, risposte: mescola([{ testo: carta.dietro, giusta: true }, ...carta.sbagliate.map(t => ({ testo: t, giusta: false }))], rnd) };
    return { tipo: 'frase', davanti: carta.davanti, dietro: carta.dietro, aiuto: carta.aiuto || AIUTO_FRASE };
  }

  // I giorni di allenamento di fila (a Roma), come Duolingo: contano fino a oggi o, se oggi non ti sei ancora allenato, fino a ieri.
  function giorniDiFila(giorni, oggi) {
    const g = new Set(giorni || []);
    let d = g.has(oggi) ? oggi : piuGiorni(oggi, -1), n = 0;
    while (g.has(d)) { n++; d = piuGiorni(d, -1); }
    return { n, oggi: g.has(oggi) };
  }

  // I premi (Ignazio 25/09): una medaglia per ogni percorso superato, con il suo titolo («Complimenti, sei leader nel contattare!»), una per
  // ogni livello superato e i traguardi dei giorni di fila (7, 30 e 100: conta la serie più lunga, così una medaglia presa resta). Tutto
  // dai test e dai giorni già salvati, senza tabelle nuove: la data è quella del primo test superato (del livello: del percorso che mancava).
  // `test`: [{ percorso, giuste, totale, fatto_il }] · `giorni`: ['AAAA-MM-GG', …] (i giorni di allenamento).
  const TRAGUARDI = [7, 30, 100];
  const complimenti = p => `Complimenti, sei leader ${p.leader}!`;
  const titoloMedaglia = p => `Leader ${p.leader}`;
  function medaglie(test, giorni) {
    const primo = {}, migliori = {};
    for (const t of [...(test || [])].sort((a, b) => quando(a.fatto_il) - quando(b.fatto_il))) {
      const s = stelle(t.giuste, t.totale);
      migliori[t.percorso] = Math.max(migliori[t.percorso] || 0, s);
      if (s >= 1 && !primo[t.percorso]) primo[t.percorso] = t.fatto_il;
    }
    const percorsi = [], livelli = [];
    for (const l of livelliVisibili()) {
      for (const p of l.percorsi) if (primo[p.id]) percorsi.push({ id: p.id, titolo: p.titolo, leader: p.leader, icona: p.icona, livello: l.nome, quando: primo[p.id], stelle: migliori[p.id] });
      if (l.percorsi.every(p => primo[p.id])) livelli.push({ nome: l.nome, quando: l.percorsi.map(p => primo[p.id]).sort((a, b) => quando(a) - quando(b)).pop() });
    }
    const traguardi = [];
    let n = 0, prima = null, record = 0;
    for (const d of [...new Set(giorni || [])].sort()) {
      n = prima && piuGiorni(prima, 1) === d ? n + 1 : 1;
      prima = d; record = Math.max(record, n);
      for (const x of TRAGUARDI) if (n === x && !traguardi.some(t => t.giorni === x)) traguardi.push({ giorni: x, quando: d });
    }
    const stelleTutte = livelliVisibili().flatMap(l => l.percorsi).reduce((k, p) => k + (migliori[p.id] || 0), 0);
    return { percorsi, livelli, traguardi, record, stelle: stelleTutte, totale: percorsi.length + livelli.length + traguardi.length };
  }
  // Per il Profilo: il livello di adesso (il primo non ancora superato), le medaglie, le stelle e i giorni di fila di oggi
  function riepilogo(test, giorni, oggi) {
    const m = medaglie(test, giorni);
    const tuttiLiv = livelliVisibili();
    const qui = tuttiLiv.find(l => !m.livelli.some(x => x.nome === l.nome)) || tuttiLiv[tuttiLiv.length - 1];
    return { ...m, livello: qui.nome, fila: giorniDiFila(giorni, oggi).n };
  }

  // La riga «MB21:» delle note Evernote [BSM] (dal 26/09, Ignazio: «ok, mi piace»): ogni parola aggiunge la traccia a uno o più percorsi
  // di «Per approfondire e imparare» (mai toglie). «Mentalità» manda al percorso di mentalità del livello dato dalla fase del Media Sharing
  // della nota; con la fase 1 «Interesse» anche a «I primi passi» (Ignazio: «il nuovo è quello che rischia di più… i commenti negativi»).
  const MB21_PERCORSI = {
    'Contatti': ['contattare'], 'Invito': ['contattare'], 'Amici': ['contattare'], 'PM': ['piano'],
    'Dare Seguito': ['dare_seguito'], 'Piramide': ['dare_seguito'], 'Mercato': ['dare_seguito'],
    'Prodotti': ['clienti', 'primi_passi'], 'Avvio': ['primi_passi', 'avviare'], 'Sponsorizzare': ['avviare', 'linee'],
    'Sistema': ['sistema', 'sistema_gruppo'], 'Duplicazione': ['duplicazione'], 'Obiettivi': ['obiettivi_mese', 'core'],
    'Decisione': ['persistere', 'abitudini'], 'Costanza': ['persistere', 'abitudini'], 'Tempo': ['abitudini', 'obiettivi_mese'],
    'Soldi': ['verso_21'], 'Paure': ['paure'], 'Critiche': ['paure'], 'Credere': ['credere'], 'Entusiasmo': ['credere'],
    'Famiglia': ['dare_seguito', 'credere'], 'Leadership': ['leader', 'guidare'], 'Relazioni': ['guidare', 'aiutare_partner'], 'Libertà': ['credere', 'visione'], 'Volume affari': ['clienti', 'segni_vitali'],
  };
  const MENTALITA_PER_FASE = { 1: ['credere', 'primi_passi'], 2: ['credere'], 3: ['paure'], 4: ['abitudini'], studio: ['persistere', 'guidare'], avanzato: ['visione'] };
  function percorsiDaMb21(appunto) {
    if (!appunto || !Array.isArray(appunto.mb21)) return [];
    const out = new Set();
    for (const w of appunto.mb21) {
      for (const id of MB21_PERCORSI[w] || []) out.add(id);
      if (w === 'Mentalità') for (const id of MENTALITA_PER_FASE[appunto.fase] || []) out.add(id);
    }
    return [...out];
  }

  // Da dove viene una carta, detto come lo cercano le persone. Si consigliano solo il Manuale di Avvio, le tracce nel BSM, i libri a
  // catalogo e, dal 25/09, il sito Amway Italia: sempre e solo la pagina Risorse (Ignazio: «per quanto riguarda le cose di Amway rimanda
  // alla pagina Risorse del sito Amway e basta»), e la carta dice il titolo del documento da cercare lì; per il resto l'attribuzione sta
  // già nel «perché» («Massimo Bini dice spesso…») e qui non si scrive niente.
  const RISORSE_AMWAY = 'https://www.amway.it/amway-resources';
  function fonte(f) {
    if (!f) return null;
    if (f.tipo === 'sito') return `Sul sito Amway, in Risorse: «${f.titolo}»`;
    if (f.tipo === 'manuale') return `Manuale di Avvio, ${String(f.pag).includes('-') ? 'pagine' : 'pagina'} ${f.pag}`;
    if (f.tipo === 'traccia') return `Da ascoltare nel BSM: ${f.oratore} – «${f.titolo}»`;
    if (f.tipo === 'libro') return `Dal libro di ${f.autore} «${f.titolo}»${f.capitolo ? `, capitolo «${f.capitolo}»` : ''}`;
    return null;
  }

  // Il controllo di un mazzo, prima di caricarlo nell'archivio (lo usa la prova della cartella privata): la lista dei problemi, vuota se va.
  // I percorsi in prova (`solo_admin`) li vede solo Ignazio: la pagina chiama inProva(eAdmin()) all'apertura, e da lì in poi
  // scala, riepilogo e medaglie usano livelliVisibili() invece di LIVELLI, così per gli altri il percorso non esiste (né nei conti).
  let IN_PROVA = false;
  function inProva(v) { IN_PROVA = !!v; }
  function livelliVisibili() { return IN_PROVA ? LIVELLI : LIVELLI.map(l => ({ ...l, percorsi: l.percorsi.filter(p => !p.solo_admin) })); }

  function controllaMazzo(m) {
    const p = [], ids = new Set();
    const testo = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
    const percorsi = LIVELLI.flatMap(l => l.percorsi.map(x => x.id));
    if (!m || !m.percorso || !percorsi.includes(m.percorso.id)) return ['percorso sconosciuto: ' + (m && m.percorso && m.percorso.id)];
    if (m.situazione !== 'carte_' + m.percorso.id) p.push(`situazione «${m.situazione}» invece di «carte_${m.percorso.id}»`);
    if (!Array.isArray(m.carte) || m.carte.length < MINIMO_MAZZO) p.push(`servono almeno ${MINIMO_MAZZO} carte`);
    for (const c of m.carte || []) {
      const chi = c && c.id ? c.id : '(senza id)';
      if (!c || !/^[a-z0-9-]{1,40}$/.test(c.id || "")) p.push(`id non valido: ${chi}`);
      else if (ids.has(c.id)) p.push(`id doppio: ${c.id}`);
      ids.add(c && c.id);
      if (!testo(c.tema, 60)) p.push(`${chi}: manca il tema`);
      if (c.tipo === 'scena') {
        if (!Array.isArray(c.versioni) || !c.versioni.length) p.push(`${chi}: nessuna versione`);
        for (const v of c.versioni || []) {
          if (!testo(v.scena, 400)) p.push(`${chi}: scena vuota o lunga`);
          if (!Array.isArray(v.risposte) || v.risposte.length !== 3 || !v.risposte.every(r => testo(r, 180))) p.push(`${chi}: servono 3 risposte (max 180 caratteri)`);
          else if (new Set(v.risposte).size !== 3) p.push(`${chi}: risposte uguali`);
        }
        if (!testo(c.perche, 500)) p.push(`${chi}: manca il perché`);
      } else if (c.tipo === 'vf') {
        if (!testo(c.frase, 300) || typeof c.vero !== 'boolean' || !testo(c.perche, 500)) p.push(`${chi}: vero o falso incompleto`);
      } else if (c.tipo === 'frase') {
        if (!testo(c.davanti, 200) || !testo(c.dietro, 400)) p.push(`${chi}: frase senza davanti o dietro`);
        if (c.aiuto !== undefined && !testo(c.aiuto, 120)) p.push(`${chi}: aiuto vuoto o lungo`);
        if (c.sbagliate !== undefined) {   // «scegli quella completa»: la giusta è `dietro`, più tre alternative sbagliate tutte diverse
          if (!Array.isArray(c.sbagliate) || c.sbagliate.length !== 3 || !c.sbagliate.every(r => testo(r, 400))) p.push(`${chi}: servono 3 alternative sbagliate (max 400 caratteri)`);
          else if (new Set([...c.sbagliate, c.dietro]).size !== 4) p.push(`${chi}: alternative uguali fra loro o alla giusta`);
        }
      } else p.push(`${chi}: tipo sconosciuto «${c.tipo}»`);
      // fonte: il collegamento della carta; fonte2 (dal 29/09, Ignazio) un secondo collegamento, solo dove servono due fonti
      const fonteOk = f => (f.tipo === 'manuale' && f.pag) || (f.tipo === 'traccia' && f.id && f.titolo && f.oratore) || (f.tipo === 'libro' && f.id && f.titolo && f.autore)
        || (f.tipo === 'sito' && f.titolo && !f.url);
      if (c.fonte && !fonteOk(c.fonte)) p.push(`${chi}: fonte incompleta`);
      if (c.fonte2 && (!c.fonte || !fonteOk(c.fonte2) || c.fonte2.tipo === 'sito')) p.push(`${chi}: seconda fonte incompleta`);
      if (c.situazioni && !(Array.isArray(c.situazioni) && c.situazioni.length && c.obiezione)) p.push(`${chi}: situazioni senza obiezione`);
    }
    if ((m.carte || []).filter(aRisposta).length < MINIMO_MAZZO) p.push(`servono almeno ${MINIMO_MAZZO} carte a risposta per il test`);
    return p;
  }

  // ── 2. Studiare: il catalogo ───────────────────────────────

  // minuscole, senza accenti né punteggiatura: per cercare e per confrontare i titoli
  const piega = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  // Certificato (Ignazio 29/09): un materiale, traccia o libro, è certificato solo se è BSM (materiale di Network 21 da studiare), ha la nota rivista da lui (IF) e gli
  // appunti PLAT (Punti importanti con le Lezioni nei riquadri · Lezioni · Azioni · Termini). Solo il certificato entra nei percorsi: nelle carte, nelle fonti e nel materiale suggerito. `cert` sulle voci.
  // Tutte le voci del catalogo. `materiali`: righe della biblioteca { id, tipo, titolo, autore, argomenti, minuti, riassunto, punti_chiave,
  // link, pack_id, solo_n21, fuori_catalogo }; `cat`: il catalogo privato { settori, manuale, appunti, libri }.
  // Il settore di una traccia viene dalla sua sezione del BSM (argomenti). Solo il BSM (Ignazio 24/09 sera: «dove ci sono riferimenti
  // fuori da BSM, non li mettiamo, al momento»): gli appunti delle tracce che non sono nella biblioteca (CEP, eventi) restano fuori.
  function carte(materiali, cat) {
    const m = materiali || [], k = cat || {}, settori = k.settori || [];
    const settoriDi = argomenti => settori.filter(s => (argomenti || []).some(a => (s.bsm || []).includes(a))).map(s => s.nome);
    const pack = Object.fromEntries(m.filter(x => x.tipo === 'pack').map(x => [x.id, x.titolo]));
    const appunti = {}; for (const a of k.appunti || []) if (a.materiale_id) appunti[a.materiale_id] = a;
    const libri = {}; for (const l of k.libri || []) if (l.materiale_id) libri[l.materiale_id] = l;
    const out = [];
    for (const p of k.manuale || []) out.push({ tipo: 'manuale', id: 'manuale-' + p.pagine, titolo: p.titolo, pagine: p.pagine, sintesi: p.sintesi, settori: p.settori || [], cert: true });
    for (const x of m) {
      if (x.fuori_catalogo) continue;
      if (x.tipo === 'traccia') out.push({ tipo: 'traccia', id: x.id, titolo: x.titolo, autore: x.autore || null, minuti: x.minuti || null,
        settori: settoriDi(x.argomenti), sezione: (x.argomenti || [])[0] || null, pack: pack[x.pack_id] || null,
        riassunto: x.riassunto || null, punti: x.punti_chiave || null, link: x.link || null, appunti: appunti[x.id] || null,
        cert: !!(appunti[x.id] && appunti[x.id].certificato) });
      else if (x.tipo === 'libro') out.push({ tipo: 'libro', id: x.id, titolo: x.titolo, autore: x.autore || null, settori: ['Libri'],
        solo_n21: !!x.solo_n21, capitoli: libri[x.id] ? libri[x.id].capitoli : null,
        // dal 27/09 i libri con il PAL nuovo (note [PAT]) portano la riga MB21 del libro: entrano in «Per approfondire e imparare» come le tracce
        mb21: libri[x.id] && libri[x.id].mb21 ? libri[x.id].mb21 : null, nuovo: !!(libri[x.id] && libri[x.id].nuovo), cert: !!(libri[x.id] && libri[x.id].certificato) });
    }
    for (const c of out) c.testo = piega([c.titolo, c.autore, c.sintesi, c.riassunto, c.punti, c.pack, c.sezione,
      ...(c.appunti ? [...(c.appunti.capitoli || []), ...(c.appunti.principi || []), ...(c.appunti.azioni || []), ...(c.appunti.frasi || []),
        ...(c.appunti.sezioni || []).flatMap(z => z.voci.flatMap(v => [v.titolo, ...v.punti])), ...(c.appunti.termini || []).flat()] : []),
      ...(c.capitoli || []).flatMap(x => [x.titolo, ...(x.principi || []), ...(x.da_fare || []), ...(x.frasi || []),
        ...(x.sezioni || []).flatMap(z => [z.titolo, ...z.punti]), ...(x.termini || []).flat()])].filter(Boolean).join(' '));
    return out;
  }

  // Il capitolo del manuale che contiene una pagina (per portare da una carta al suo capitolo, in Studia)
  function capitoloDi(voci, pag) {
    const n = parseInt(String(pag), 10);
    return (voci || []).find(c => c.tipo === 'manuale' && (() => { const [a, b] = String(c.pagine).split('-').map(Number); return n >= a && n <= (b || a); })()) || null;
  }

  // dove si trova una traccia nel BSM: sezione › pack
  const dove = c => (c.sezione ? ['BSM', c.sezione, c.pack].filter(Boolean).join(' › ') : '');

  // Ricerca: ogni parola (di almeno due lettere) deve esserci, nel titolo, nel riassunto, negli appunti o nei capitoli
  function cerca(tutte, testo) {
    const parole = piega(testo).split(' ').filter(p => p.length > 1);
    if (!parole.length) return [];
    return (tutte || []).filter(c => parole.every(p => c.testo.includes(p)));
  }

  // ── Conversazione (role play a scelte, 29/09: il candidato risponde a quello che scegli, si irrigidisce se sbagli e, dopo troppi passi falsi, saluta) ──
  // Il testo è nel mazzo privato (carte_contattare → conversazioni): qui solo la macchina degli scambi.
  const UMORI = ['cordiale', 'un po\' freddo', 'infastidito'];
  // uno scambio può avere `varianti`: più frasi possibili del candidato (Ignazio 30/09: «le obiezioni ne so a centinaia»), ognuna con le sue risposte;
  // a ogni telefonata se ne pesca una, e con lei cambia tutto il resto dello scambio
  // com'è la persona che chiami (Ignazio 30/09: «cordiale, ruvido o un sinonimo e qualche altra voce»): cambia le frasi che dice (le `varianti` con `carattere`),
  // quanti passi falsi regge (`colpi`) e da che umore parte (`base`: 0 cordiale, 1 già freddo). Ogni voce ha la sua difficoltà.
  const CARATTERI = [
    { k: 'cordiale', nome: 'Cordiale', livello: 'Facile', sotto: 'Ti ascolta volentieri e perdona qualche errore', colpi: 4, base: 0, ob: [1, 1] },
    { k: 'fretta', nome: 'Di fretta', livello: 'Media', sotto: 'Ha pochi minuti e vuole arrivare al punto', colpi: 3, base: 0, ob: [1, 2] },
    { k: 'diffidente', nome: 'Diffidente', livello: 'Media', sotto: 'Si fida poco e vuole capire dove vuoi arrivare', colpi: 3, base: 1, ob: [2, 2] },
    { k: 'schietto', nome: 'Schietto', livello: 'Difficile', sotto: 'Va dritto, poca pazienza, ti chiude al secondo errore', colpi: 2, base: 1, ob: [2, 3] }];
  const rpCarattere = k => CARATTERI.find(c => c.k === k) || null;
  // uno scambio può avere `varianti`: più frasi possibili del candidato (Ignazio 30/09: «le obiezioni ne so a centinaia»), ognuna con le sue risposte;
  // a ogni telefonata se ne pesca una, e con lei cambia tutto il resto dello scambio. Se ce ne sono per il carattere scelto si pesca fra quelle,
  // altrimenti fra quelle valide per tutti (senza `carattere`)
  // `mamma`: le frasi con `mamma: true` (gli impegni in più: bambini, scuola, chi li tiene) si sentono solo se la candidata è mamma, e allora prendono il posto delle altre
  const rpPool = (sc, car, mamma) => { const tutte = sc.varianti, m = tutte.filter(x => x.mamma);
    if (mamma && m.length) return m;
    const v = tutte.filter(x => !x.mamma), per = v.filter(x => Array.isArray(x.carattere) && x.carattere.includes(car)); return per.length ? per : v.filter(x => !x.carattere); };
  const rpScegliVarianti = (conv, rnd, car, mamma) => ({ ...conv, scambi: conv.scambi.map(sc => { const pool = Array.isArray(sc.varianti) && sc.varianti.length ? rpPool(sc, car, mamma) : [];
    if (!pool.length) return sc; const { carattere, livello, ...v } = pool[Math.floor((rnd || Math.random)() * pool.length)]; return { ...sc, ...v }; }) });
  // La chiamata dura finché il candidato non chiude (è rosso da due passaggi) o il partner non fissa l'appuntamento (Ignazio 30/09). Se la conversazione ha
  // `testa` (i saluti e la presentazione), `obiezioni` (un gruppo) e `coda` (l'appuntamento e la conferma), a ogni telefonata si pescano da 1 a 3 obiezioni
  // (quante dipende dal carattere, `ob`; a caso, dando la precedenza a quelle del carattere): l'appuntamento arriva sempre dopo almeno un'obiezione.
  const rpMescolaCon = (a, rnd) => { const v = [...a]; for (let i = v.length - 1; i > 0; i--) { const j = Math.floor((rnd || Math.random)() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; } return v; };
  function rpPercorso(conv, rnd, c, car, mamma) {
    if (!Array.isArray(conv.obiezioni)) return conv;
    const buone = conv.obiezioni.filter(o => !o.carattere || o.carattere.includes(car)), [min, max] = c ? c.ob : [1, 2];
    const n = Math.min(buone.length, min + Math.floor((rnd || Math.random)() * (max - min + 1)));
    // con la mamma, fra le obiezioni pescate si dà la precedenza a quelle che hanno una frase da mamma (così gli impegni in più si sentono davvero)
    const conMamma = o => Array.isArray(o.varianti) && o.varianti.some(x => x.mamma), mesc = rpMescolaCon(buone, rnd);
    const pescate = (mamma ? [...mesc.filter(conMamma), ...mesc.filter(o => !conMamma(o))] : mesc).slice(0, n);
    return { ...conv, scambi: [...(conv.testa || []), ...pescate, ...(conv.coda || [])] };
  }
  // La persona che si chiama (Ignazio 30/09): il nome vero, scelto dalla lista dei contatti; se è una donna le parole al femminile («perplessa», «incasinata»…).
  // Il testo nei mazzi è scritto al maschile; qui si cambia solo quello che serve.
  const PAROLE_F = ['perplesso', 'confuso', 'convinto', 'incasinato', 'incuriosito', 'curioso', 'impegnato', 'giudicato', 'interessato', 'soddisfatto', 'ritirato', 'tranquillo', 'infastidito', 'stanco', 'sicuro', 'occupato', 'contento'];
  const FRASI_F = [[/\bun lavoratore dipendente/g, 'una lavoratrice dipendente'], [/\bUn lavoratore dipendente/g, 'Una lavoratrice dipendente'], [/\bun imprenditore o un libero professionista/g, "un'imprenditrice o una libera professionista"],
    [/\bUn imprenditore o un libero professionista/g, "Un'imprenditrice o una libera professionista"], [/\bun imprenditore/g, "un'imprenditrice"], [/\bUn amico (?=che lavora|con una sua)/g, "Un'amica "],
    [/\bchiami un dipendente/g, 'chiami una dipendente'], [/\bChiami un dipendente/g, 'Chiami una dipendente'], [/\bRichiami un dipendente/g, 'Richiami una dipendente'], [/\bun dipendente/g, 'una dipendente'],
    [/\bgià stato contattato/g, 'già stata contattata'], [/\bquando sei pronto/g, 'quando sei pronta'], [/è partito\b/g, 'è partita'], [/si è (raffreddato|scoraggiato)\b/g, m => m.slice(0, -1) + 'a'], [/un po' perso\b/g, "un po' persa"], [/mi sono iscritto\b/g, 'mi sono iscritta'], [/sono carico\b/g, 'sono carica'], [/resto fermo\b/g, 'resto ferma'], [/\bgià sentito\b/g, 'già sentita'], [/\bda solo\b/g, 'da sola'], [/\b(che (?:ti )?(?:richiami|chiami)) lui\b/g, '$1 lei'], [/\bsei libero\b(?! professionista)/g, 'sei libera']];
  const rpAlFemminile = t => { let x = t; FRASI_F.forEach(([a, b]) => { x = x.replace(a, b); });
    return x.replace(new RegExp(`\\b(${PAROLE_F.join('|')})\\b`, 'gi'), w => { const f = w.slice(0, -1) + 'a'; return w[0] === w[0].toUpperCase() ? f[0].toUpperCase() + f.slice(1) : f; }); };
  function rpPersona(conv, nome, donna) {
    const js = JSON.stringify(conv).split('{nome}').join(JSON.stringify(nome).slice(1, -1));
    return JSON.parse(donna ? rpAlFemminile(js) : js);
  }
  function rpNuova(conv, rnd, car, mamma) {
    const c = rpCarattere(car), cv = rpScegliVarianti(rpPercorso(conv, rnd, c, car, mamma), rnd, car, mamma);
    if (c) cv.colpi = c.colpi;
    // un'obiezione può avere un `seguito`: quello che il candidato dice subito dopo la risposta (per esempio «No, vendere non fa per me»), in testa alla frase dello scambio dopo
    const lista = x => (Array.isArray(x) ? x : [x]);
    cv.scambi = cv.scambi.map((sc, i) => (i > 0 && cv.scambi[i - 1].seguito ? { ...sc, candidato: [...lista(cv.scambi[i - 1].seguito), ...lista(sc.candidato)] } : sc));
    // la frase con cui il candidato avvisa che sta per uscire, quando diventa rosso (`uscite` della conversazione, una per telefonata)
    const usM = (cv.uscite || []).filter(x => x.mamma), usN = (cv.uscite || []).filter(x => !x.mamma);
    const us = usN.filter(x => Array.isArray(x.carattere) && x.carattere.includes(car));
    const pool = mamma && usM.length ? usM : us.length ? us : usN.filter(x => !x.carattere), uscita = pool.length ? pool[Math.floor((rnd || Math.random)() * pool.length)] : null;
    return { conv: cv, i: 0, colpi: c ? c.base * RP_CALMA : 0, fuori: [], fine: null, giro: [], fase: 'principale', ultimo: null, car: c ? c.k : null, base: c ? c.base : 0,
      uscita, uscitaDopo: null, uscitaUsata: false, dopo: null, agganciato: false };
    // fine: null | 'ok' | 'chiusa'; fase: 'principale' | 'recupero' | 'uscita'
  }
  // dopo un errore (Ignazio 30/09: le stesse risposte non tornano, «il Partner che chiama si trova a dover gestire la cosa»): il candidato reagisce e
  // tre risposte, scritte per quell'errore (`recupero` della risposta sbagliata; o quello dello scambio), servono a rimediare; poi si va avanti
  const rpRecupero = st => !st.fine && st.fase === 'recupero';
  const rpUscita = st => !st.fine && st.fase === 'uscita';
  const rpRecuperoDi = (sc, k) => (sc.risposte[k] && sc.risposte[k].recupero) || sc.recupero || null;
  const rpDelloScambio = st => (rpUscita(st) ? st.uscita : rpRecupero(st) ? rpRecuperoDi(st.conv.scambi[st.i], st.ultimo) : st.conv.scambi[st.i]);
  // le tre risposte dello scambio di adesso, mescolate (senza quelle già sbagliate qui, per gli scambi senza recupero)
  const rpRisposte = st => st.fine ? [] : mescola(rpDelloScambio(st).risposte.map((r, k) => ({ ...r, k })).filter(r => rpUscita(st) || !st.fuori.includes(r.k)));
  // quanto è vicino a chiudere, da 0 (sereno) a 1 (il prossimo errore è l'ultimo): cresce coi passi falsi, e chi parte già freddo (`base`) è a metà strada
  // (Ignazio 30/09: «i colori a salire da verde fino al rosso, la sensazione che lo sto perdendo e posso ancora rimediare»)
  // Anche a scendere (Ignazio 30/09: «ho risposto bene a tutto e Pino è rimasto freddo»): un passo falso pesa 1, una risposta giusta scalda di mezzo passo
  // (mai sotto zero); chi parte già freddo (`base`) comincia da mezzo passo. Il candidato chiude quando i passi arrivano al tetto (`colpi`).
  const RP_CALMA = 0.5;
  const rpColpiDopo = (colpi, giusta) => (giusta ? Math.max(0, colpi - RP_CALMA) : colpi + 1);
  const rpTensione = (st, colpi = st.colpi) => Math.min(1, Math.max(0, colpi) / Math.max(1, (st.conv.colpi || 3) - 1));
  const rpUmoreDa = t => (t < 0.25 ? 0 : t < 0.75 ? 1 : 2);
  const rpUmoreN = st => rpUmoreDa(rpTensione(st));
  const rpUmore = st => UMORI[rpUmoreN(st)];
  // sceglie la risposta k: la giusta porta avanti; una sbagliata irrita e, se c'è il recupero, il candidato resta lì e tocca rimediare;
  // rimediare bene porta avanti, rimediare male irrita ancora (e si va avanti più freddi); al colpo di troppo il candidato chiude la telefonata
  function rpScegli(st, k) {
    if (st.fine) return st;
    const rec = rpRecupero(st), sc = st.conv.scambi[st.i], r = rpDelloScambio(st).risposte[k], nuovo = { ...st, fuori: [...st.fuori], giro: [...st.giro] };
    if (!r) return st;
    const avanza = () => { nuovo.i = st.i + 1; nuovo.fuori = []; nuovo.fase = 'principale'; nuovo.ultimo = null; if (nuovo.i >= st.conv.scambi.length) nuovo.fine = 'ok'; };
    if (rpUscita(st)) {   // il candidato è rosso e avvisa che sta per uscire: «Ok, tranquillo, ma quando posso richiamarti?» lo scalda e la chiamata continua, il resto la chiude
      nuovo.giro.push({ scambio: st.i, k, giusta: !!r.giusta, testo: r.testo, reazione: r.giusta ? '' : r.reazione, uscita: true, recupero: false });
      nuovo.colpi = rpColpiDopo(st.colpi, !!r.giusta);
      if (!r.giusta) { nuovo.fine = 'chiusa'; return nuovo; }
      nuovo.agganciato = true; nuovo.fase = 'principale';
      const d = st.dopo || {};
      if (d.avanza) avanza(); else if (d.recupero !== undefined) { nuovo.fase = 'recupero'; nuovo.ultimo = d.recupero; } else if (d.fuori !== undefined) nuovo.fuori.push(d.fuori);
      nuovo.dopo = null;
      return nuovo;
    }
    nuovo.giro.push({ scambio: st.i, k, giusta: !!r.giusta, testo: r.testo, reazione: r.giusta ? '' : r.reazione, perche: sc.perche, recupero: rec });
    if (r.giusta) { nuovo.colpi = rpColpiDopo(st.colpi, true); avanza(); return nuovo; }
    nuovo.colpi = rpColpiDopo(st.colpi, false);
    const tetto = st.conv.colpi || 3;
    if (nuovo.colpi >= tetto) { nuovo.fine = 'chiusa'; return nuovo; }
    // che cosa succede dopo questo errore: si rimedia (recupero), si riprova, o si va avanti (se era già un rimedio sbagliato)
    const dopo = rec ? { avanza: true } : rpRecuperoDi(sc, k) ? { recupero: k } : { fuori: k };
    if (st.uscita && !st.uscitaUsata && nuovo.colpi >= tetto - 1) {   // diventa rosso: il candidato avvisa che sta per uscire, ultima occasione
      nuovo.fase = 'uscita'; nuovo.uscitaUsata = true; nuovo.uscitaDopo = nuovo.giro.length - 1; nuovo.dopo = dopo;
      return nuovo;
    }
    if (dopo.avanza) avanza(); else if (dopo.recupero !== undefined) { nuovo.fase = 'recupero'; nuovo.ultimo = k; } else nuovo.fuori.push(k);
    return nuovo;
  }

  const api = { UMORI, CARATTERI, RP_CALMA, rpColpiDopo, rpCarattere, rpTensione, rpUmoreDa, rpUmoreN, rpNuova, rpPersona, rpAlFemminile, rpRisposte, rpUmore, rpScegli, LIVELLI, livelliVisibili, inProva, RISORSE_AMWAY, MB21_PERCORSI, MENTALITA_PER_FASE, percorsiDaMb21, SCATOLE, LEZIONE, RIPASSO, TEST, TRABOCCHETTI, PER_IL_TEST, piuGiorni, dopoRisposta, nuove, segnali, daRipassare, prossimiRipassi, stelle,
    statoPercorso, scala, pescaTest, mescola, domanda, giorniDiFila, TRAGUARDI, complimenti, titoloMedaglia, medaglie, riepilogo, fonte, controllaMazzo, piega, carte, capitoloDi, dove, cerca };
  if (nodo) module.exports = api;
  else radice.MB21Training = api;
})(this);

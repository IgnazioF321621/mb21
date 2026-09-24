// MB21 · la pagina Training (cantiere 45, dal 24/09/2026): funzioni pure. Due parti.
// 1. Allenarsi (Ignazio 24/09: le flashcard «come si studia all'università» più Duolingo, «un percorso di crescita che va verso l'alto»):
//    i sette livelli con i loro percorsi, le carte a cinque scatole (Leitner), le carte nuove di Impara, il ripasso del giorno
//    (anche le obiezioni capitate davvero nelle chat del coach), il test finale con le stelle, i giorni di fila.
// 2. Studiare (cantiere 42): il catalogo (i capitoli del Manuale di Avvio, le tracce della biblioteca N21 con gli appunti PAL di Ignazio,
//    i libri a catalogo) e la ricerca.
// I testi non stanno qui (il progetto è pubblico): le carte e il catalogo sono nell'archivio privato (coach_batterie, righe «carte_…» e
// «training»), la biblioteca nella tabella materiali. Lo usano pagina-training.js e tools/banco/prova_training.js.
(function (radice) {
  const nodo = typeof module !== 'undefined' && module.exports;
  const C = nodo ? require('./coach.js') : radice.MB21Coach;

  // ── 1. Allenarsi ───────────────────────────────────────────

  // I livelli coi nomi dell'attività (Ignazio 24/09), dal basso verso l'alto; i temi sono quelli divisi con lui lo stesso giorno.
  // Un percorso è pronto quando nell'archivio c'è la riga «carte_<id>»; gli altri si vedono «in arrivo».
  const LIVELLI = [
    { nome: 'Nuovo', sotto: 'La lista, la telefonata, i primi passi, il Sistema', percorsi: [
      { id: 'contattare', titolo: 'Contattare', sotto: 'La lista, la telefonata, le obiezioni al telefono', icona: 'telefonate' },
      { id: 'primi_passi', titolo: 'I primi passi', sotto: "I prodotti per te, l'ordine ricorrente, l'inaugurazione", icona: 'avvio' },
      { id: 'sistema', titolo: 'Il Sistema', sotto: 'Open, BBS, WES, CEP e libri', icona: 'agenda' },
      { id: 'principi', titolo: 'Principi e parole', sotto: "I 9 principi guida e le parole dell'attività", icona: 'libro' },
    ] },
    { nome: 'Sponsor', sotto: 'Presentare il piano, il Dare Seguito, i clienti, avviare un nuovo', percorsi: [] },
    { nome: 'Leaders Club', sotto: 'Aiutare i tuoi partner, i Segni Vitali, il counseling', percorsi: [] },
    { nome: 'Leader Executive', sotto: 'Far crescere i leader, la duplicazione', percorsi: [] },
    { nome: 'Leader Bronzo', sotto: 'Allargare e approfondire le linee', percorsi: [] },
    { nome: 'Leader Argento', sotto: "Tenere il 21%, l'attività internazionale", percorsi: [] },
    { nome: 'Platino', sotto: 'Portare i tuoi leader al 21%', percorsi: [] },
  ];

  // Le cinque scatole: dopo quanti giorni torna una carta (Ignazio 24/09: domani, 3 giorni… 1 mese). Giusta avanza di una, sbagliata
  // torna alla prima.
  const SCATOLE = [1, 3, 7, 14, 30];
  const LEZIONE = 6;          // carte nuove in una lezione di Impara
  const RIPASSO = 15;         // carte in un ripasso: circa 5 minuti
  const TEST = 10;            // domande del test finale
  const TRABOCCHETTI = 3;     // nel test almeno 3 trabocchetti, se ci sono (Ignazio 24/09: «la voglia di imparare e la rabbia se ancora non so le cose»)
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
    LIVELLI.forEach((l, i) => {
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

  // Le domande del test finale: dalle carte a risposta (scene e vero o falso) del percorso, prima le più deboli (scatola bassa, più
  // sbagliate) con un po' di caso, e almeno tre trabocchetti se ci sono; poi in ordine sparso. `rnd` = Math.random (nelle prove, fisso).
  function pescaTest(mazzo, stati, quante = TEST, rnd = Math.random) {
    const st = stati || {};
    const adatte = (mazzo ? mazzo.carte : []).filter(c => c.tipo === 'scena' || c.tipo === 'vf');
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
    return { tipo: 'frase', davanti: carta.davanti, dietro: carta.dietro, aiuto: carta.aiuto || AIUTO_FRASE };
  }

  // I giorni di allenamento di fila (a Roma), come Duolingo: contano fino a oggi o, se oggi non ti sei ancora allenato, fino a ieri.
  function giorniDiFila(giorni, oggi) {
    const g = new Set(giorni || []);
    let d = g.has(oggi) ? oggi : piuGiorni(oggi, -1), n = 0;
    while (g.has(d)) { n++; d = piuGiorni(d, -1); }
    return { n, oggi: g.has(oggi) };
  }

  // Da dove viene una carta, detto come lo cercano le persone. Si consigliano solo il Manuale di Avvio, le tracce nel BSM e i libri a
  // catalogo; per il resto l'attribuzione sta già nel «perché» («Massimo Bini dice spesso…») e qui non si scrive niente.
  function fonte(f) {
    if (!f) return null;
    if (f.tipo === 'manuale') return `Manuale di Avvio, ${String(f.pag).includes('-') ? 'pagine' : 'pagina'} ${f.pag}`;
    if (f.tipo === 'traccia') return `Da ascoltare nel BSM: ${f.oratore} – «${f.titolo}»`;
    if (f.tipo === 'libro') return `Dal libro di ${f.autore} «${f.titolo}»${f.capitolo ? `, capitolo «${f.capitolo}»` : ''}`;
    return null;
  }

  // Il controllo di un mazzo, prima di caricarlo nell'archivio (lo usa la prova della cartella privata): la lista dei problemi, vuota se va.
  function controllaMazzo(m) {
    const p = [], ids = new Set();
    const testo = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
    const percorsi = LIVELLI.flatMap(l => l.percorsi.map(x => x.id));
    if (!m || !m.percorso || !percorsi.includes(m.percorso.id)) return ['percorso sconosciuto: ' + (m && m.percorso && m.percorso.id)];
    if (m.situazione !== 'carte_' + m.percorso.id) p.push(`situazione «${m.situazione}» invece di «carte_${m.percorso.id}»`);
    if (!Array.isArray(m.carte) || m.carte.length < TEST) p.push(`servono almeno ${TEST} carte`);
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
      } else p.push(`${chi}: tipo sconosciuto «${c.tipo}»`);
      const f = c.fonte;
      if (f && !((f.tipo === 'manuale' && f.pag) || (f.tipo === 'traccia' && f.id && f.titolo && f.oratore) || (f.tipo === 'libro' && f.id && f.titolo && f.autore)))
        p.push(`${chi}: fonte incompleta`);
      if (c.situazioni && !(Array.isArray(c.situazioni) && c.situazioni.length && c.obiezione)) p.push(`${chi}: situazioni senza obiezione`);
    }
    if ((m.carte || []).filter(c => c.tipo === 'scena' || c.tipo === 'vf').length < TEST) p.push(`servono almeno ${TEST} carte a risposta per il test`);
    return p;
  }

  // ── 2. Studiare: il catalogo ───────────────────────────────

  // minuscole, senza accenti né punteggiatura: per cercare e per confrontare i titoli
  const piega = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  // Tutte le voci del catalogo. `materiali`: righe della biblioteca { id, tipo, titolo, autore, argomenti, minuti, riassunto, punti_chiave,
  // link, pack_id, solo_n21, fuori_catalogo }; `cat`: il catalogo privato { settori, manuale, appunti, libri }.
  // Il settore di una traccia della biblioteca viene dalla sua sezione del BSM (argomenti); gli appunti delle tracce che non sono nella
  // biblioteca (CEP, eventi) hanno il settore scritto nel catalogo e dicono da dove vengono.
  function carte(materiali, cat) {
    const m = materiali || [], k = cat || {}, settori = k.settori || [];
    const settoriDi = argomenti => settori.filter(s => (argomenti || []).some(a => (s.bsm || []).includes(a))).map(s => s.nome);
    const pack = Object.fromEntries(m.filter(x => x.tipo === 'pack').map(x => [x.id, x.titolo]));
    const appunti = {}; for (const a of k.appunti || []) if (a.materiale_id) appunti[a.materiale_id] = a;
    const libri = {}; for (const l of k.libri || []) if (l.materiale_id) libri[l.materiale_id] = l;
    const out = [];
    for (const p of k.manuale || []) out.push({ tipo: 'manuale', id: 'manuale-' + p.pagine, titolo: p.titolo, pagine: p.pagine, sintesi: p.sintesi, settori: p.settori || [] });
    for (const x of m) {
      if (x.fuori_catalogo) continue;
      if (x.tipo === 'traccia') out.push({ tipo: 'traccia', id: x.id, titolo: x.titolo, autore: x.autore || null, minuti: x.minuti || null,
        settori: settoriDi(x.argomenti), sezione: (x.argomenti || [])[0] || null, pack: pack[x.pack_id] || null,
        riassunto: x.riassunto || null, punti: x.punti_chiave || null, link: x.link || null, appunti: appunti[x.id] || null });
      else if (x.tipo === 'libro') out.push({ tipo: 'libro', id: x.id, titolo: x.titolo, autore: x.autore || null, settori: ['Libri'],
        solo_n21: !!x.solo_n21, capitoli: libri[x.id] ? libri[x.id].capitoli : null });
    }
    (k.appunti || []).filter(a => !a.materiale_id).forEach((a, i) => out.push({ tipo: 'traccia', id: 'pal-' + i, titolo: a.titolo, autore: a.oratore || null,
      minuti: a.minuti || null, settori: a.settori || [], sezione: null, pack: null, fonte: a.fonte || null, appunti: a }));
    for (const c of out) c.testo = piega([c.titolo, c.autore, c.sintesi, c.riassunto, c.punti, c.pack, c.sezione, c.fonte,
      ...(c.appunti ? [...(c.appunti.capitoli || []), ...(c.appunti.principi || []), ...(c.appunti.azioni || []), ...(c.appunti.frasi || [])] : []),
      ...(c.capitoli || []).flatMap(x => [x.titolo, ...(x.principi || []), ...(x.da_fare || [])])].filter(Boolean).join(' '));
    return out;
  }

  // Il capitolo del manuale che contiene una pagina (per portare da una carta al suo capitolo, in Studia)
  function capitoloDi(voci, pag) {
    const n = parseInt(String(pag), 10);
    return (voci || []).find(c => c.tipo === 'manuale' && (() => { const [a, b] = String(c.pagine).split('-').map(Number); return n >= a && n <= (b || a); })()) || null;
  }

  // dove si trova una traccia: nel BSM (sezione › pack) o, per gli appunti fuori dalla biblioteca, l'evento o il CEP da cui vengono
  const dove = c => (c.sezione ? ['BSM', c.sezione, c.pack].filter(Boolean).join(' › ') : c.fonte || '');

  // Ricerca: ogni parola (di almeno due lettere) deve esserci, nel titolo, nel riassunto, negli appunti o nei capitoli
  function cerca(tutte, testo) {
    const parole = piega(testo).split(' ').filter(p => p.length > 1);
    if (!parole.length) return [];
    return (tutte || []).filter(c => parole.every(p => c.testo.includes(p)));
  }

  const api = { LIVELLI, SCATOLE, LEZIONE, RIPASSO, TEST, TRABOCCHETTI, PER_IL_TEST, piuGiorni, dopoRisposta, nuove, segnali, daRipassare, prossimiRipassi, stelle,
    statoPercorso, scala, pescaTest, mescola, domanda, giorniDiFila, fonte, controllaMazzo, piega, carte, capitoloDi, dove, cerca };
  if (nodo) module.exports = api;
  else radice.MB21Training = api;
})(this);

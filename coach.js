// MB21 · il coach che parla (cantiere 42): la chat che si apre dopo un esito, al posto del foglietto della riflessione.
// I messaggi NON stanno in questo file, perché il progetto su GitHub è pubblico: stanno nell'archivio privato, la tabella
// coach_batterie, una «batteria» per situazione (le telefonate: «telefonata», «telefonata_partner», «telefonata_cliente»; dopo il risultato di un
// Piano Marketing o di un Follow Up: «piano_marketing», «follow_up»; dopo una Consulenza prodotti: «consulenza»; dopo un Appuntamento con un
// Partner: «appuntamento_partner»; dopo un PM o un Follow Up Rimandato o No Show: «non_avvenuto»; si scrivono e si caricano dalla cartella privata
// ~/mb21-import/training). Qui c'è solo la logica: quale batteria vale per un esito, come si monta la chat da una batteria
// (l'imbuto), cosa si salva, e il motore che la recita (puntini, fumetti, risposte da toccare).
// Lo usano l'app (pagina-coach.js → chiediCoach) e la pagina privata di prova, così la chat è la stessa.
//
// Un copione è una lista di passi:
//   { c: 'fumetto', fonte?: [testo, consigliabile], rif?: [tipo, testo] }   un fumetto del coach; rif = va tra gli approfondimenti
//   { rif: [tipo, testo] }                                                   solo un approfondimento, senza fumetto
//   { proponi: 'frase' }                                                     una frase in più tra quelle per la prossima volta
//   { chiedi: [[risposta, [passi], valore?], …], salva?, obiezione?, elenco? } un tocco; ogni risposta continua a modo suo; `valore` = cosa si salva
//                                                                            al posto della scritta (null: niente); `elenco`: si salva come elenco
//   { dopo: async () => [passi] }                                            passi decisi al momento (la carta del Training, dal coach corto)
//   { piu: [[scelta, [passi]], …], nessuna: [etichetta, [passi]], avanti, salva }
//                                                                            più tocchi, poi «Avanti»: i passi di ogni scelta, uno dopo l'altro
//   { scrivi: 'esempio', salta: 'etichetta', poi?: 'risposta', salva }       una riga da scrivere, facoltativa
//   { frase: [proposte], poi: 'risposta del coach', salva? }                 la frase per la prossima volta (+ «Scrivo io…»); prima le «proponi»
// Tipi di rif: manuale · traccia · libro. Fonte consigliabile = materiale ufficiale (traccia in BSM, libro a catalogo, Manuale
// di Avvio): nell'app si vede sotto il fumetto; le altre (per esempio un CEP di Bini) sono note solo per la pagina di prova.
(function (radice) {
  const nodo = typeof module !== 'undefined' && module.exports;
  const A = nodo ? require('./agenda.js') : radice.MB21Agenda;

  // ── quale batteria vale per un esito (null = nessuna chat) ──
  // Telefonata: un Contatto al telefono (dalla coda, dai Riordini o dall'Agenda) in cui ci hai parlato. Partner e Clienti
  // hanno esiti diversi e i loro messaggi (24/09): telefonata_partner, telefonata_cliente; tutti gli altri come i Prospect.
  const SENZA_PAROLE = ['No Risposta', 'Telefono spento'];
  const TELEFONATA_DI = { Partner: 'telefonata_partner', Cliente: 'telefonata_cliente' };
  // Piano Marketing e Follow Up (24/09): dopo il risultato del «Com'è andata?» (MB21Agenda.RISULTATI: Iscrizione, Dare Seguito o
  // Ulteriore Follow Up, Prodotti, No BuonFine), per ogni categoria; non dopo «Fatto» (la Presentazione del PM), Rimandato o No Show.
  const DOPO_IL_RISULTATO = { 'Piano Marketing': 'piano_marketing', 'Follow Up': 'follow_up' };
  function situazione(tipo, modalita, categoria, esito) {
    if (tipo === 'Contatto' && (!modalita || modalita === 'Telefonata') && esito && !SENZA_PAROLE.includes(esito))
      return TELEFONATA_DI[categoria] || 'telefonata';
    if (DOPO_IL_RISULTATO[tipo] && A.RISULTATI[tipo].esiti.includes(esito)) return DOPO_IL_RISULTATO[tipo];
    // Rimandato e No Show (24/09): il «È avvenuto?» di PM e Follow Up quando la risposta non è «Fatto»; una chat sola per tutti e due
    if (DOPO_IL_RISULTATO[tipo] && esito !== 'Fatto' && A.AVVENUTO.includes(esito)) return 'non_avvenuto';
    // Consulenza prodotti (24/09): dopo Vendita o No Vendita (le fasi della Consulenza PRD, le stesse per ogni categoria)
    if (tipo === 'Consulenza PRD' && A.fasiPer('Prospect', tipo).includes(esito)) return 'consulenza';
    // Appuntamento con un Partner (24/09): dopo un esito del suo tipo (Avvio, Counseling, Lista/Contatti, Meeting/Evento, Ordine);
    // gli esiti vecchi di Glide che non sono più tra le fasi (Prodotti, Iscr+Ordine…) niente
    if (tipo === 'Appuntamento' && A.fasiPer('Partner', tipo, modalita).includes(esito)) return 'appuntamento_partner';
    return null;
  }

  // {io} e {chi} → i nomi veri, in ogni testo
  function riempi(x, nomi) {
    if (typeof x === 'string') return x.replace(/\{io\}/g, () => nomi.io).replace(/\{chi\}/g, () => nomi.chi);
    if (Array.isArray(x)) return x.map(y => riempi(y, nomi));
    if (x && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, riempi(v, nomi)]));
    return x;
  }

  // dentro il blocco di un'obiezione, la risposta toccata si salva insieme al nome dell'obiezione
  const conNome = (passi, nome) => passi.map(p => !p.chiedi ? p : {
    ...p, ...(p.salva ? { obiezione: nome } : {}), chiedi: p.chiedi.map(([r, s]) => [r, conNome(s, nome)]) });

  // Telefonata a un Prospect. L'imbuto (Ignazio 24/09):
  //   «Com'è andata?» = l'esito toccato nell'app (non si richiede) → la reazione all'esito (una delle sue varianti: n = un numero
  //   che cambia a ogni chat, così il coach non ripete sempre la stessa) → le domande di prima (`prima`, uguali per ogni esito:
  //   dopo un piano «cosa ha colpito di più», dopo un Follow Up «il perché») → domande, dubbi o obiezioni, anche più d'una (+ «Altro»):
  //   il coach le riprende una alla volta, «come hai risposto?» → un aiuto in più per l'esito → la frase per la prossima volta
  //   (prima quelle delle obiezioni toccate) → una frase per chiudere. Gli approfondimenti li raccoglie chi recita la chat.
  // null se l'esito non ha messaggi.
  function telefonata(B, esito, nomi, n) {
    if (!B || !B.reazione || !B.reazione[esito]) return null;
    const varianti = B.reazione[esito], D = B.domanda_obiezione;
    const reazione = varianti[Math.abs(n || 0) % varianti.length];
    const blocco = (nome, o) => [{ proponi: o.frase }, ...(o.manuale ? [{ rif: ['manuale', o.manuale] }] : []), ...conNome(o.passi, nome)];
    const domande = (B.senza_obiezione || []).includes(esito) ? [] : [
      { c: D.c },
      { piu: [...Object.entries(B.obiezioni).map(([ob, o]) => [ob, blocco(ob, o)]), ...(B.altro ? [[D.altro, blocco(D.altro, B.altro)]] : [])],
        nessuna: [D.nessuna, B.nessuna[esito] || []], avanti: D.avanti, salva: D.salva || 'obiezioni' },   // i partner: «freni»
    ];
    return riempi([
      ...(B.manuale && B.manuale[esito] ? [{ rif: ['manuale', B.manuale[esito]] }] : []),
      ...reazione,
      ...(B.prima || []),
      ...domande,
      ...(B.extra[esito] || []),
      { c: B.prossima.c }, { frase: B.prossima.frasi[esito] || [], poi: B.prossima.poi[esito], salva: 'prossima' },
      ...(B.bussola[esito] ? [B.bussola[esito]] : []),
    ], nomi);
  }

  // Il coach corto (cantiere 48, Ignazio 29-30/09; dal 30/09 anche dopo il Piano Marketing, il Follow Up e la Consulenza prodotti, dove l'obiezione non
  // è mai «superata»: si chiede sempre «L'hai gestita?»; restano le domande di prima del piano/follow up, cadono gli approfondimenti lunghi)
  // dopo la telefonata (: «il coach registra e indirizza, non insegna»): una reazione, un solo tocco
  // sull'obiezione (o «Nessuna»), e poi dipende dall'esito. Se l'incontro è fissato (PM Fissato, Appuntamento, Consulenza Prodotti) l'hai superata
  // e il coach ti ricorda la risposta del manuale per quando vi vedete, senza altre domande; se no (Richiamare…) «L'hai gestita?»: «No» porta alla
  // carta del Training, e chiude la frase per la prossima volta. Se l'altra volta con la stessa persona è uscita un'obiezione, parte da lì
  // («L'altra volta Mario diceva «Non ho tempo»: è tornato fuori?»). Dopo Relazione e No Interesse una riga sola, niente chat.
  // ctx: { fissato? (se manca: dall'esito), ricordo? (MB21Coach.ricordi di quel contatto), carta?(obiezione, esito) → promessa di cartaDi(…) o null,
  //        incontro? { su_cosa, quando } (l'incontro appena fissato: i passi di «Su cosa lavorate?» e «Giovedì»), preparazione? (la riga «preparazione_incontro») }
  // Con un Partner niente domanda sui freni (Ignazio 29/09: «è raro che un partner dica non ho tempo»): dopo «Appuntamento» una riga con il giorno e i
  // passi scelti e, per ognuno, come prepararlo dal Manuale di Avvio; dopo «Richiamare» la frase per la prossima volta.
  const RIGA_SOLA = ['Relazione', 'No Interesse'];
  const FISSATI = ['PM Fissato', 'Appuntamento', 'Consulenza Prodotti'];
  // Un Prospect chiamato per una consulenza prodotti: le obiezioni sono quelle «a vedersi» sui prodotti, non quelle dell'attività (Ignazio 29/09)
  const OBIEZIONI_PRODOTTI = ['Di cosa si tratta?', 'Non ho tempo', 'Non ne ho bisogno', 'Compro già altro'];
  const finePunto = t => (/[.!?»]$/.test(t) ? t : t + '.');
  function corta(B, esito, nomi, n, ctx = {}) {
    if (!B || !B.reazione || !B.reazione[esito]) return null;
    const varianti = B.reazione[esito];
    const reazione = varianti[Math.abs(n || 0) % varianti.length];
    if (RIGA_SOLA.includes(esito)) return riempi(reazione, nomi);
    const D = B.domanda_obiezione || {}, O = B.obiezioni || {};
    const fissato = ctx.fissato === undefined ? FISSATI.includes(esito) : !!ctx.fissato;
    const nomiOb = esito === 'Consulenza Prodotti' ? OBIEZIONI_PRODOTTI : Object.keys(O);
    const chiave = D.salva || 'obiezioni';   // i partner: «freni»
    const cartaDi_ = async ob => (ctx.carta ? await ctx.carta(ob, esito) : null);
    const fonte = c => [`Training · ${c.percorso}`, true];
    // dopo l'obiezione toccata
    const dopoOb = ob => {
      const o = O[ob] || {};
      const aiuti = [...(o.frase ? [{ proponi: o.frase }] : []), ...(o.manuale ? [{ rif: ['manuale', o.manuale] }] : [])];
      if (fissato) return [...aiuti, { c: 'Bene: l’hai superata.' }, { dopo: async () => {
        const c = await cartaDi_(ob);
        return c ? [{ c: `Se torna fuori quando vi vedete, la risposta del manuale è: ${finePunto(c.giusta)}`, fonte: fonte(c) }] : [];
      } }];
      return [...aiuti, { c: 'L’hai gestita?' }, { salva: 'gestita', chiedi: [
        ['Sì', [{ c: 'Bene.' }]],
        ['No', [{ dopo: async () => {
          const c = await cartaDi_(ob);
          return c ? [{ c: `Succede. Nel Training c’è la carta «${ob}»: ripassala prima di ${esito === 'Richiamare' ? 'richiamare' : 'risentire'} ${nomi.chi}.` },
            { c: `La risposta del manuale: ${finePunto(c.giusta)}`, fonte: fonte(c) }]
            : [{ c: `Succede. Ripassa la risposta del manuale prima di ${esito === 'Richiamare' ? 'richiamare' : 'risentire'} ${nomi.chi}.` }];
        } }]],
      ] }];
    };
    const altro = B.altro ? [[D.altro || 'Altro', [...(B.altro.frase ? [{ proponi: B.altro.frase }] : []), ...(B.altro.passi || []).slice(0, 2)]]] : [];
    const tutte = (escluse = []) => [...nomiOb.filter(ob => !escluse.includes(ob)).map(ob => [ob, dopoOb(ob)]), ...altro];
    const niente = [(B.nessuna && B.nessuna[esito] || [])[0]].filter(Boolean);
    const prima = (ctx.ricordo && ctx.ricordo.obiezioni || []).find(ob => nomiOb.includes(ob));
    const partner = D.salva === 'freni';
    const domanda = partner || (B.senza_obiezione || []).includes(esito) ? [] : prima ? [
      { c: `L’altra volta {chi} diceva «${prima}»: è tornato fuori?` },
      { salva: chiave, elenco: true, chiedi: [
        ['Sì', dopoOb(prima), prima],
        ['No', [{ c: 'Bene: superata.' }], D.nessuna || 'Nessuna'],
        ['Un’altra', [{ c: 'Quale?' }, { salva: chiave, elenco: true, chiedi: [[D.nessuna || 'Nessuna', niente], ...tutte([prima])] }], null],
      ] },
    ] : [
      { c: String(D.c || '{chi} ti ha fatto domande, dubbi o obiezioni?').replace(/\s*Tocca tutt[^.]*\./, '') },
      { salva: chiave, elenco: true, chiedi: [[D.nessuna || 'Nessuna', niente], ...tutte()] },
    ];
    const f = B.prossima && B.prossima.frasi && B.prossima.frasi[esito];
    const frase = fissato || !f || !f.length ? [] : [{ c: B.prossima.c }, { frase: f, poi: B.prossima.poi && B.prossima.poi[esito], salva: 'prossima' }];
    // l'incontro con un Partner: il giorno, i passi scelti, come prepararli
    const inc = ctx.incontro, prep = ctx.preparazione;
    const scelti = partner && fissato && inc && Array.isArray(inc.su_cosa) && prep && prep.passi ? inc.su_cosa.filter(x => prep.passi[x]) : [];
    const nomiPassi = scelti.map(x => A.nomePasso(x));
    const elenco = nomiPassi.length > 1 ? `${nomiPassi.slice(0, -1).join(', ')} e ${nomiPassi[nomiPassi.length - 1]}` : nomiPassi[0];
    const incontro = !scelti.length ? [] : [
      { c: String(prep.apertura || '{quando} con {chi} lavorate su {passi}.').replace('{quando}', () => inc.quando || 'Presto').replace('{passi}', () => elenco) },
      ...scelti.map(x => ({ c: prep.passi[x].c, fonte: prep.passi[x].fonte, ...(prep.passi[x].manuale ? { rif: ['manuale', prep.passi[x].manuale] } : {}) })),
    ];
    return riempi([...reazione.slice(0, 1), ...incontro, ...(B.prima || []), ...domanda, ...frase], nomi);   // `prima`: «cosa ha colpito di più» dopo un piano, «il perché» dopo un Follow Up
  }

  // La carta del Training che risponde a un'obiezione: tra i mazzi (coach_batterie «carte_…»), la prima scena che la nomina e che vale per
  // quelle chat (`situazioni`; senza, è quella del telefono con un Prospect). → { id, scena, giusta (la prima risposta del mazzo), percorso } o null
  function cartaDi(mazzi, obiezione, situazioni) {
    for (const m of mazzi || []) for (const c of (m && m.carte) || []) {
      if (c.tipo !== 'scena' || c.obiezione !== obiezione) continue;
      if (!(c.situazioni ? c.situazioni.some(s => situazioni.includes(s)) : situazioni.includes('telefonata'))) continue;
      const v = c.versioni && c.versioni[0];
      if (v && v.scena && v.risposte && v.risposte[0]) return { id: c.id, scena: v.scena, giusta: v.risposte[0], perche: c.perche || '', percorso: m.percorso && m.percorso.titolo || '' };
    }
    return null;
  }

  // I tentativi a vuoto di fila (cantiere 48, Ignazio 29/09: «risulta spento per due volte di fila»): al 2° «Telefono spento» o al 3° «No Risposta» di fila
  // il coach propone un altro canale. `esiti`: gli esiti delle telefonate di quel contatto, dal più recente (il tocco appena dato è il primo).
  const SOGLIA_VUOTI = { 'Telefono spento': 2, 'No Risposta': 3 };
  const VOLTE = { 2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque', 6: 'sei' };
  const CANALI = ['Messaggio', 'Di persona', 'Chiedo a chi me l’ha dato', 'Lo metto da parte'];
  const vuotiDiFila = (esiti, esito) => { let n = 0; for (const e of esiti || []) { if (e !== esito) break; n++; } return n; };
  function altroCanale(esito, n, chi) {   // il testo del coach, o null se non ancora
    if (!SOGLIA_VUOTI[esito] || n < SOGLIA_VUOTI[esito]) return null;
    const volte = `${VOLTE[n] || n} volte di fila`;
    return esito === 'Telefono spento' ? `Il telefono di ${chi} risulta spento per ${volte}: cerca un altro canale.` : `${chi} non risponde per ${volte}: cerca un altro canale.`;
  }

  // Le telefonate a Prospect, Partner e Clienti hanno la stessa forma, e dal 24/09 anche Piano Marketing, Follow Up, Consulenza, Appuntamento,
  // Rimandato e No Show:
  // lo stesso montatore, ognuna con la sua batteria.
  const MONTATORI = { telefonata, telefonata_partner: telefonata, telefonata_cliente: telefonata, piano_marketing: telefonata, follow_up: telefonata,
    consulenza: telefonata, appuntamento_partner: telefonata, non_avvenuto: telefonata };
  // Nell'app (con `ctx`) le telefonate hanno la forma corta; senza `ctx` (la pagina privata di prova) la forma lunga di prima.
  const CORTE = ['telefonata', 'telefonata_partner', 'telefonata_cliente', 'piano_marketing', 'follow_up', 'consulenza'];
  const monta = (sit, B, esito, nomi, n, ctx) => (ctx && CORTE.includes(sit) ? corta(B, esito, nomi, n, ctx) : MONTATORI[sit] ? MONTATORI[sit](B, esito, nomi, n) : null);

  // Cosa si salva in azioni.riflessione: le risposte date, nell'ordine, ognuna con la domanda com'era scritta nella chat:
  // { chiave: 'obiezioni' o 'freni' (elenco) · 'risposta' (con obiezione) · 'altro' · 'prossima' · le domande di prima ('colpito', 'perche')
  //   · le domande dell'esito ('lavoro', 'motivo', 'inaugurazione', 'quando', 'decisione', 'interesse'; dopo un Appuntamento con un Partner
  //   'lista', 'obiettivo', 'ricorrente', 'prove', 'appuntamenti', 'presenza', 'obiettivi', 'counseling', 'biglietto', 'vp'; dopo Rimandato e
  //   No Show 'motivo'),
  //   domanda, risposta, obiezione? }.
  // null se non c'è nessuna risposta (chat chiusa subito).
  function riflessioneDa(risposte) {
    const date = (risposte || []).filter(x => x && x.chiave && (Array.isArray(x.risposta) ? x.risposta.length : String(x.risposta || '').trim()));
    return date.length ? date.map(x => ({ ...x })) : null;
  }

  // Il promemoria «Ti eri detto…» (cantiere 42, 24/09): la risposta si ritrova al prossimo appuntamento con la stessa persona.
  // Da righe di azioni { id, contatto_id, inizio, creato_il, riflessione }: per ogni contatto l'ultima riflessione che ha la frase
  // per la prossima volta → { frase, obiezioni, azione, quando }. Le obiezioni sono quelle di quella volta, senza «Nessuna»;
  // «Altro» diventa la riga scritta (se c'è); per i partner valgono i freni. Vale anche per le riflessioni del foglietto (stessa chiave «prossima»).
  function ricordi(azioni) {
    const quando = a => a.inizio || a.creato_il || '';
    const ordinate = [...(azioni || [])].sort((a, b) => (quando(a) < quando(b) ? 1 : quando(a) > quando(b) ? -1 : 0));
    const out = {};
    for (const a of ordinate) {
      if (!a || !a.contatto_id || a.contatto_id in out || !Array.isArray(a.riflessione)) continue;
      const r = chiave => a.riflessione.find(x => x && x.chiave === chiave);
      const fr = r('prossima'), ob = r('obiezioni') || r('freni'), altro = r('altro'), gestita = r('gestita');   // i partner: «freni»
      const frase = fr && typeof fr.risposta === 'string' && fr.risposta.trim() ? fr.risposta.trim() : null;
      if (!frase && !(ob && Array.isArray(ob.risposta))) continue;   // una chat senza frase né obiezioni (altre domande): non conta
      const obiezioni = (ob && Array.isArray(ob.risposta) ? ob.risposta : [])
        .filter(x => x !== 'Nessuna' && x !== 'Niente').map(x => (x === 'Altro' ? (altro && altro.risposta ? `«${altro.risposta}»` : null) : x)).filter(Boolean);
      // l'ultima chat di quella persona decide: se non ha lasciato niente da ricordare, le volte prima non tornano
      out[a.contatto_id] = frase || obiezioni.length
        ? { frase, obiezioni, daRipassare: !!(gestita && gestita.risposta === 'No'), azione: a.id, quando: quando(a) } : null;
    }
    return out;
  }

  // ── il motore: recita un copione dentro `corpo` (un elemento della pagina) ──
  // opz: icona(nome) → svg · fonti: 'tutte' (pagina di prova) o 'consigliabili' (app) · scorri(el): dopo ogni fumetto o bottone
  //      · rif: approfondimenti già in lista · veloce: senza attese (prove).
  // Restituisce { stato, fine }: stato.risposte si riempie a ogni risposta da salvare; fine si risolve a chat finita,
  // con gli approfondimenti già scritti (se la chat viene chiusa prima può anche non risolversi: vale stato.risposte).
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ICONA_RIF = { manuale: 'file', traccia: 'audio', libro: 'libro' };
  const ORDINE_RIF = { manuale: 0, traccia: 1, libro: 2 };
  function chat(corpo, passi, opz = {}) {
    const icona = opz.icona || (() => '');
    const aspetta = ms => new Promise(r => setTimeout(r, ms));
    const stato = { rif: [...(opz.rif || [])], proposte: [], risposte: [], domanda: '' };
    const metti = html => { corpo.insertAdjacentHTML('beforeend', html); const el = corpo.lastElementChild; if (opz.scorri) opz.scorri(el); return el; };
    const fonte = f => (!f || (!f[1] && opz.fonti !== 'tutte')) ? '' : `<span class="cch-fonte${f[1] ? '' : ' no'}">${f[1] ? '✓ ' : ''}${esc(f[0])}</span>`;
    const fumetto = (testo, mio, f) => metti(`<div class="cch-fumetto${mio ? ' cch-mio' : ''}">${mio ? '' : '<span class="cch-av">MB</span>'}<div class="cch-bolla">${esc(testo)}${mio ? '' : fonte(f)}</div></div>`);
    async function scrive(testo, f) {
      const puntini = metti('<div class="cch-fumetto cch-puntini"><span class="cch-av">MB</span><div class="cch-bolla"><i></i><i></i><i></i></div></div>');
      await aspetta(opz.veloce ? 0 : Math.min(1400, 500 + testo.length * 12));
      puntini.remove();
      if (!corpo.isConnected) return;
      fumetto(testo, false, f);
      stato.domanda = testo;
    }
    const bottoni = (etichette, dopo = '') => metti(`<div class="cch-risposte">${etichette.map((b, i) => `<button type="button" data-i="${i}">${esc(b)}</button>`).join('')}${dopo}</div>`);
    // una riga da scrivere dentro `box`: Invio o «Invia»
    const riga = (box, esempio, risolvi) => {
      const inp = box.querySelector('input');
      const invia = () => { if (inp.value.trim()) { box.remove(); risolvi(inp.value.trim()); } };
      inp.onkeydown = e => { if (e.key === 'Enter') invia(); };
      box.querySelector('[data-invia]').onclick = invia;
      return inp;
    };
    const campo = esempio => `<input type="text" maxlength="300" placeholder="${esc(esempio)}"><button type="button" data-invia>Invia</button>`;
    // un tocco solo; con «Scrivo io…» la risposta si può scrivere
    const tocca = (etichette, conTesto) => new Promise(risolvi => {
      const box = bottoni(etichette, conTesto ? '<button type="button" data-io>Scrivo io…</button>' : '');
      box.onclick = ev => {
        const b = ev.target.closest('button');
        if (!b || b.hasAttribute('data-invia')) return;
        if (b.hasAttribute('data-io')) {
          box.innerHTML = campo('Scrivi o detta la tua frase');
          riga(box, '', risolvi).focus();
          if (opz.scorri) opz.scorri(box);
          return;
        }
        box.remove(); risolvi(etichette[Number(b.dataset.i)]);
      };
    });
    // più tocchi (si accendono e si spengono), poi «Avanti»; «Nessuna» risponde da sola
    const toccaPiu = (scelte, nessuna, avanti) => new Promise(risolvi => {
      const box = bottoni(scelte, `${nessuna ? `<button type="button" data-nessuna>${esc(nessuna)}</button>` : ''}<button type="button" class="cch-avanti" disabled>${esc(avanti || 'Avanti')} ›</button>`);
      const accese = new Set();
      box.onclick = ev => {
        const b = ev.target.closest('button');
        if (!b || b.disabled) return;
        if (b.hasAttribute('data-nessuna')) { box.remove(); return risolvi([nessuna]); }
        if (b.classList.contains('cch-avanti')) { box.remove(); return risolvi(scelte.filter((_, i) => accese.has(i))); }
        const i = Number(b.dataset.i);
        if (accese.has(i)) accese.delete(i); else accese.add(i);
        b.classList.toggle('cch-on', accese.has(i));
        box.querySelector('.cch-avanti').disabled = !accese.size;
      };
    });
    // una riga facoltativa: si scrive, o si salta
    const scriviRiga = (esempio, salta) => new Promise(risolvi => {
      const box = metti(`<div class="cch-risposte">${campo(esempio || 'Scrivi qui')}<button type="button" data-salta>${esc(salta || 'Salta')}</button></div>`);
      riga(box, esempio, risolvi);
      box.querySelector('[data-salta]').onclick = () => { box.remove(); risolvi(''); };
    });
    const salva = (p, risposta) => {   // `elenco`: la risposta toccata si salva come elenco di una voce (le obiezioni)
      if (p.salva) stato.risposte.push({ chiave: p.salva, domanda: stato.domanda, risposta: p.elenco && !Array.isArray(risposta) ? [risposta] : risposta, ...(p.obiezione ? { obiezione: p.obiezione } : {}) });
    };
    async function recita(lista) {
      for (const p of lista) {
        if (!corpo.isConnected) return;
        if (p.rif && !stato.rif.some(r => r[1] === p.rif[1])) stato.rif.push(p.rif);
        if (p.proponi && !stato.proposte.includes(p.proponi)) stato.proposte.push(p.proponi);
        if (p.c) await scrive(p.c, p.fonte);
        else if (p.dopo) await recita(await p.dopo());   // passi decisi al momento (la carta del Training)
        else if (p.chiedi) {
          const x = await tocca(p.chiedi.map(y => y[0]));
          const y = p.chiedi.find(z => z[0] === x);
          fumetto(x, true);
          if (y[2] !== null) salva(p, y[2] !== undefined ? y[2] : x);   // terzo valore: cosa si salva se non è la scritta del bottone (null: niente)
          await recita(y[1]);
        } else if (p.piu) {
          const scelte = await toccaPiu(p.piu.map(y => y[0]), p.nessuna && p.nessuna[0], p.avanti);
          fumetto(scelte.join(' · '), true); salva(p, scelte);
          if (p.nessuna && scelte[0] === p.nessuna[0]) await recita(p.nessuna[1]);
          else for (const x of scelte) await recita(p.piu.find(y => y[0] === x)[1]);   // una alla volta, nell'ordine dell'elenco
        } else if (p.scrivi) {
          const scritta = await scriviRiga(p.scrivi, p.salta);
          fumetto(scritta || p.salta, true);
          if (scritta) { salva(p, scritta); if (p.poi) await scrive(p.poi); }
        } else if (p.frase) {
          const proposte = [...new Set([...stato.proposte, ...p.frase])].slice(0, 4);   // prima quelle delle domande toccate
          const x = await tocca(proposte, true);
          fumetto(x, true); salva(p, x);
          if (p.poi) await scrive(p.poi);
        }
      }
    }
    const fine = recita(passi).then(async () => {
      // per approfondire: quello che è uscito nella chat, prima il manuale, poi le tracce, poi i libri
      const lista = [...stato.rif].sort((a, b) => ORDINE_RIF[a[0]] - ORDINE_RIF[b[0]]);
      if (lista.length && corpo.isConnected) {
        await scrive('Per approfondire quello che ci siamo detti:');
        metti(`<div class="cch-fumetto"><span class="cch-av">MB</span><div class="cch-bolla"><ul class="cch-rif">${lista.map(r =>
          `<li>${icona(ICONA_RIF[r[0]] || 'info')} ${esc(r[1])}</li>`).join('')}</ul></div></div>`);
      }
      return stato.risposte;
    });
    return { stato, fine };
  }

  const api = { SENZA_PAROLE, SOGLIA_VUOTI, CANALI, vuotiDiFila, altroCanale, situazione, riempi, telefonata, corta, cartaDi, monta, riflessioneDa, ricordi, chat };
  if (nodo) module.exports = api;
  else radice.MB21Coach = api;
})(this);

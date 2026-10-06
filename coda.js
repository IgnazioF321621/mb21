// MB21 · motore della coda OGGI
// Funzione pura: riceve le righe della vista `contatti_coda` e la data di oggi (Roma),
// restituisce cosa mostrare. Nessun accesso alla rete: la usano l'app e tools/banco/prova_coda.js.
//
// Regole (brief sez. 2 + decisioni di Ignazio del 14/09, STRUTTURA.md → Logiche):
//   - fuori coda le categorie Unlinked, Ex Partner/Cliente, Archiviato e i senza categoria
//     (dal 15/09 hanno il loro riquadro «Da catalogare», cantiere 16)
//   - fuori coda chi ha un riordino programmato (`riordino_programmato` della vista): lo segue la telefonata di riordino (18/09)
//   - Dare Seguito scaduti (fase Dare Seguito / Ulteriore Follow Up, fino al 21/09 «DS Fissato»; rientro prima di oggi): sempre, sopra la capienza
//   - capienza = contatti al giorno scelti dall'utente (1-10, predefinito 5) meno gli esiti già dati oggi
//     dalla coda (i Dare Seguito non contano), tra chi ha rientro_il <= oggi:
//       1. già in coda (in_coda_dal pieno), i più vecchi prima: chi non è stato chiamato slitta in cima
//       2. posti liberi divisi 60% rientri + 40% mai contattati (3+2 su 5). Nei rientri: prima i richiami con data
//          odierna, poi i rientrati dopo l'attesa. Se un gruppo non basta, i posti vanno all'altro
//   - a parità: rientro più vecchio, poi nome
//   - telefonate scelte a mano (nota 012, 04/10): sopra la capienza, finché non hanno un esito (telefonateScelte, senzaScelte, contoGiorno in fondo)
(function (radice) {
  const CAPIENZA = 5;               // predefinita, se l'utente non ha scelto
  const QUOTA_RIENTRI = 3 / 5;      // il resto ai mai contattati
  const FASI_DARE_SEGUITO = ['Dare Seguito', 'Ulteriore Follow Up'];
  const CATEGORIE_ESCLUSE = ['Unlinked', 'Ex Partner/Cliente', 'Archiviato'];

  function giorniTra(da, a) {
    return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(da + 'T00:00:00Z')) / 86400000);
  }

  // 1 già in coda · 2 richiamo di oggi · 3 rientrato · 4 mai contattato
  function gruppo(r, oggi) {
    if (r.in_coda_dal) return 1;
    if (!r.contattato) return 4;
    if (r.ultimi_giorni == null && r.rientro_il === oggi) return 2;
    return 3;
  }

  function confronta(a, b) {
    return a.gruppo - b.gruppo
      || (a.in_coda_dal || '').localeCompare(b.in_coda_dal || '')
      || a.rientro_il.localeCompare(b.rientro_il)
      || (a.nome || '').localeCompare(b.nome || '', 'it');
  }

  // `inPausa` (02/10, «0 contatti al giorno»): niente coda e nemmeno i Dare Seguito scaduti, che tornano alla ripartenza
  function calcolaCoda(righe, oggi, capienza, inPausa) {
    capienza = capienza == null ? CAPIENZA : Math.max(0, capienza);
    const dareSeguito = [];
    const candidati = [];

    for (const r of righe) {
      if (!r.rientro_il || r.rientro_il > oggi) continue;
      if (!r.categoria || CATEGORIE_ESCLUSE.includes(r.categoria)) continue;
      if (r.riordino_programmato) continue;   // cantiere 27: lo segue la telefonata di riordino (riquadro «Riordini da sentire»)
      if (FASI_DARE_SEGUITO.includes(r.ultima_fase) && r.rientro_il < oggi) {
        dareSeguito.push(Object.assign({}, r, { scadutoDa: giorniTra(r.rientro_il, oggi) }));
      } else {
        candidati.push(Object.assign({}, r, { gruppo: gruppo(r, oggi) }));
      }
    }

    dareSeguito.sort((a, b) => a.rientro_il.localeCompare(b.rientro_il));
    if (inPausa) dareSeguito.length = 0;
    candidati.sort(confronta);

    const giaInCoda = candidati.filter(r => r.gruppo === 1).slice(0, capienza);
    const rientri = candidati.filter(r => r.gruppo === 2 || r.gruppo === 3);
    const nuovi = candidati.filter(r => r.gruppo === 4);

    const liberi = capienza - giaInCoda.length;
    const postiRientri = Math.round(liberi * QUOTA_RIENTRI);
    let presiRientri = rientri.slice(0, postiRientri);
    let presiNuovi = nuovi.slice(0, liberi - presiRientri.length);
    // un gruppo non basta: i posti avanzati vanno all'altro
    presiRientri = rientri.slice(0, liberi - presiNuovi.length);

    const coda = giaInCoda.concat(presiRientri, presiNuovi);

    return {
      dareSeguito,
      coda,
      // chi entra adesso nei 5: l'app gli scrive in_coda_dal = oggi
      nuoviInCoda: coda.filter(r => !r.in_coda_dal).map(r => r.id),
      candidati: candidati.length,
      rientri: rientri.length,
      maiContattati: nuovi.length,
    };
  }

  // Da catalogare (cantiere 16): i senza categoria del partner in ordine alfabetico,
  // tanti quanti ne restano dei 5 al giorno (QUOTA_CATALOGO meno quelli già catalogati oggi);
  // `altri`: posti in più chiesti con «Altri 5» (lavoro 4). Dal 24/09 (Ignazio: «clicco su Altri 5 e non
  // mi spuntano i nomi») gli «altri» si SOMMANO ai posti rimasti, non alla quota: chi ha già catalogato
  // 20 nomi oggi, con un tocco ne vede 5 nuovi lo stesso. Prima, sotto i fatti di oggi, il bottone non faceva niente.
  const QUOTA_CATALOGO = 5;
  function daCatalogare(righe, catalogatiOggi, altri) {
    const senza = righe.filter(r => !r.categoria)
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it', { sensitivity: 'base' }));
    const posti = Math.max(0, QUOTA_CATALOGO - (catalogatiOggi || 0)) + Math.max(0, altri || 0);
    return { righe: senza.slice(0, posti), totale: senza.length };
  }

  // Data di oggi a Roma, AAAA-MM-GG
  function oggiRoma(adesso) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(adesso || new Date());
  }

  // ── Telefonate scelte a mano (Azioni, nota 012; decisioni di Ignazio 04/10/2026) ──
  // Una telefonata «Contatto · Telefonata» che il partner programma da sé (scheda → «Nuova azione», Agenda → «+»; `azioni.scelta_a_mano`)
  // entra in CODA, sopra la capienza (in coda si può avere 10 o 14 telefonate), dal giorno scelto e finché non ha un esito: non sparisce
  // a fine giornata. L'orario è facoltativo (`senza_ora`): con l'ora sta anche in Agenda e nella timeline, senza l'ora solo in coda.
  // La scheda è una sola (la riga di `azioni`): chiusa da un posto è chiusa ovunque.
  // `azioni` = righe lette dall'app (CAMPI_AZIONE); escono quelle completate o con esito; `giorno` = giorno della telefonata a Roma;
  // `ritardo` = giorni passati da quel giorno (0 = oggi). Le future non ci sono ancora. Ordine: le più vecchie prima, poi per orario.
  function telefonateScelte(azioni, oggi) {
    return (azioni || [])
      .filter(a => a.tipo_azione === 'Contatto' && a.scelta_a_mano && !a.completata && !a.esito && a.inizio)
      .map(a => { const giorno = oggiRoma(new Date(a.inizio)); return Object.assign({}, a, { giorno, ritardo: giorniTra(giorno, oggi) }); })
      .filter(a => a.ritardo >= 0)
      .sort((a, b) => a.inizio.localeCompare(b.inizio));
  }

  // Chi ha una telefonata scelta a mano aperta non entra anche nella coda automatica (né nei Dare Seguito scaduti): una scheda sola per persona
  function senzaScelte(righe, scelte) {
    const presi = new Set((scelte || []).map(a => a.contatto_id));
    return righe.filter(r => !presi.has(r.id));
  }

  // Il conto del giorno a parole (DECISO 1, Ignazio 04/10): il traguardo resta quello scelto, le telefonate oltre contano «in più».
  // «3 di 5» · «5 di 5 ✓ e 3 in più», mai «3 di 10». Con 0 contatti al giorno (pausa) niente.
  function contoGiorno(fatti, tot) {
    fatti = Math.max(0, Number(fatti) || 0); tot = Math.max(0, Number(tot) || 0);
    if (!tot) return '';
    if (fatti <= tot) return `${fatti} di ${tot}`;
    return `${tot} di ${tot} ✓ e ${fatti - tot} in più`;
  }

  // ── Sotto il nome, in parole chiare (nota Pagine 016, segnalazione di Ignazio 06/10/2026: «non si capisce cosa indica e quando») ──
  // «Ultima telefonata: No Risposta · 3 giorni fa» · «Ultimo appuntamento: Relazione · ieri» · «Mai contattato». L'esito è la parola ufficiale
  // (le stesse dei bottoni, cantiere 39); `quando` da `ultima_il` (giorno a Roma): oggi · ieri · N giorni fa (fino a 30) · il gg/mm/aaaa.
  const giornoRoma = iso => (iso ? oggiRoma(new Date(iso)) : null);
  const dataIt = giorno => { const [a, m, g] = giorno.split('-'); return `${g}/${m}/${a}`; };
  function quandoFa(giorno, oggi) {
    if (!giorno || !oggi) return '';
    const n = giorniTra(giorno, oggi);
    if (n === 0) return 'oggi';
    if (n === 1) return 'ieri';
    if (n === -1) return 'domani';
    if (n > 1 && n <= 30) return `${n} giorni fa`;
    return `il ${dataIt(giorno)}`;
  }
  const COSA_ULTIMA = { 'Contatto': 'Ultima telefonata', 'Appuntamento': 'Ultimo appuntamento', 'Piano Marketing': 'Ultimo PM', 'Consulenza PRD': 'Ultima consulenza' };
  function ultimaVolta(r, oggi) {
    if (!r || !r.contattato) return 'Mai contattato';
    const cosa = r.ultimo_tipo === 'Contatto' && r.ultima_modalita && r.ultima_modalita !== 'Telefonata' ? 'Ultimo contatto' : COSA_ULTIMA[r.ultimo_tipo] || 'Ultima volta';
    const quando = quandoFa(giornoRoma(r.ultima_il), oggi);
    return `${cosa}: ${r.ultima_fase || 'senza esito'}${quando ? ' · ' + quando : ''}`;
  }

  // ── «Non ora» (nota Pagine 018, Ignazio 06/10/2026): saltare un nome dalla riga, senza esito e senza contare come fatto ──
  // «In coda» = torna domani tra i contatti del giorno (rientro_il = domani; `in_coda_dal` resta: rientra per primo); «Scegli la data» = quel giorno.
  function giornoDopo(oggi, n = 1) { return new Date(Date.parse(oggi + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10); }
  function giornoRinvio(oggi, scelta, giornoScelto) {
    if (scelta === 'data' && giornoScelto && giornoScelto > oggi) return giornoScelto;
    return giornoDopo(oggi, 1);
  }
  const testoRinvio = (giorno, oggi) => (giorniTra(oggi, giorno) === 1 ? 'torna domani' : `torna il ${dataIt(giorno)}`);

  const api = { calcolaCoda, daCatalogare, QUOTA_CATALOGO, oggiRoma, CAPIENZA, QUOTA_RIENTRI, FASI_DARE_SEGUITO, CATEGORIE_ESCLUSE,
    giorniTra, quandoFa, ultimaVolta, giornoDopo, giornoRinvio, testoRinvio,
    telefonateScelte, senzaScelte, contoGiorno };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Coda = api;
})(this);

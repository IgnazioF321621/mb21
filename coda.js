// MB21 · motore della coda OGGI
// Funzione pura: riceve le righe della vista `contatti_coda` e la data di oggi (Roma),
// restituisce cosa mostrare. Nessun accesso alla rete: la usano l'app e tools/banco/prova_coda.js.
//
// Regole (brief sez. 2, STRUTTURA.md → Logiche):
//   - Dare Seguito scaduti (fase Dare Seguito / DS Fissato, rientro prima di oggi): sempre, sopra la capienza
//   - capienza 5, tra chi ha rientro_il <= oggi, in quest'ordine:
//       1. già in coda (in_coda_dal pieno): i più vecchi prima → chi non è stato chiamato slitta in cima
//       2. richiami con data odierna (fase senza giorni e rientro = oggi)
//       3. mai contattati
//       4. rientrati dopo l'attesa
//   - a parità: rientro più vecchio, poi nome
(function (radice) {
  const CAPIENZA = 5;
  const FASI_DARE_SEGUITO = ['Dare Seguito', 'DS Fissato'];

  function giorniTra(da, a) {
    return Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(da + 'T00:00:00Z')) / 86400000);
  }

  function gruppo(r, oggi) {
    if (r.in_coda_dal) return 1;
    if (r.contattato && r.ultimi_giorni == null && r.rientro_il === oggi) return 2;
    if (!r.contattato) return 3;
    return 4;
  }

  function confronta(a, b) {
    return a.gruppo - b.gruppo
      || (a.in_coda_dal || '').localeCompare(b.in_coda_dal || '')
      || a.rientro_il.localeCompare(b.rientro_il)
      || (a.nome || '').localeCompare(b.nome || '', 'it');
  }

  function calcolaCoda(righe, oggi, capienza) {
    capienza = capienza || CAPIENZA;
    const dareSeguito = [];
    const candidati = [];

    for (const r of righe) {
      if (!r.rientro_il || r.rientro_il > oggi) continue;
      if (FASI_DARE_SEGUITO.includes(r.ultima_fase) && r.rientro_il < oggi) {
        dareSeguito.push(Object.assign({}, r, { scadutoDa: giorniTra(r.rientro_il, oggi) }));
      } else {
        candidati.push(Object.assign({}, r, { gruppo: gruppo(r, oggi) }));
      }
    }

    dareSeguito.sort((a, b) => a.rientro_il.localeCompare(b.rientro_il));
    candidati.sort(confronta);
    const coda = candidati.slice(0, capienza);

    return {
      dareSeguito,
      coda,
      // chi entra adesso nei 5: l'app gli scrive in_coda_dal = oggi
      nuoviInCoda: coda.filter(r => !r.in_coda_dal).map(r => r.id),
      candidati: candidati.length,
    };
  }

  // Data di oggi a Roma, AAAA-MM-GG
  function oggiRoma(adesso) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(adesso || new Date());
  }

  const api = { calcolaCoda, oggiRoma, CAPIENZA, FASI_DARE_SEGUITO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Coda = api;
})(this);

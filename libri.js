// MB21 · I miei libri (cantiere 40, lavoro 7; Ignazio 22/09/2026): il diario di lettura, dai Check del Giorno che ci sono già.
// Nessun dato nuovo: ogni Check ha libro, pagine e nota. Da qui: il libro in corso, le pagine del mese, il percorso dei libri
// (i passi decisi il 22/09: 0 Manuale → 1 Carnegie o Littauer → 2 «È semplice, non ovvia» → 3 i tre solo N21) e il diario per libro.
// Funzioni pure, nessun accesso alla rete: le usano pagina-libri.js e tools/banco/prova_libri.js.
(function (radice) {
  const mese = giorno => String(giorno || '').slice(0, 7);
  const mesePrima = giorno => { const [a, m] = giorno.slice(0, 7).split('-').map(Number); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; };
  const n = v => Number(v) || 0;

  // I Check con un libro, dal più recente. `check`: [{ data, libro, pagine, note_libro }]
  const conLibro = check => (check || []).filter(c => c.libro && c.libro !== 'Libro no N21').sort((a, b) => b.data.localeCompare(a.data));

  // Il libro in corso = quello dell'ultimo Check con un libro
  function inCorso(check, libri) {
    const u = conLibro(check)[0];
    if (!u) return null;
    const l = (libri || []).find(x => x.titolo === u.libro);
    return { titolo: u.libro, autore: l ? l.autore : null, ultimo: u.data };
  }

  // Pagine lette in un mese (tutti i Check, anche senza libro: le pagine contano lo stesso)
  const pagineDelMese = (check, m) => (check || []).filter(c => mese(c.data) === m).reduce((s, c) => s + n(c.pagine), 0);

  // Il percorso dei libri: i materiali con `ordine_libro`, in ordine; ✓ se il titolo compare in un Check.
  // Passo 0 (Manuale): non passa dai Check → si dà per fatto quando è stato letto almeno un altro libro del percorso.
  // Passo 1: due libri «a scelta» → basta uno dei due. Il «prossimo» è il primo passo non fatto.
  // `giaLetti`: i libri segnati «L'ho già letto» [{ titolo, quando }] (prima di MB21): valgono come letti, senza data
  function percorso(check, libri, giaLetti = []) {
    const letti = new Set([...conLibro(check).map(c => c.libro), ...giaLetti.map(g => g.titolo)]);
    const primoLetto = t => { const c = conLibro(check).filter(x => x.libro === t); return c.length ? c[c.length - 1].data : null; };
    const passi = (libri || []).filter(l => l.ordine_libro !== null && l.ordine_libro !== undefined).sort((a, b) => a.ordine_libro - b.ordine_libro || a.titolo.localeCompare(b.titolo, 'it'));
    const altroLetto = passi.some(l => l.ordine_libro > 0 && letti.has(l.titolo));
    const righe = passi.map(l => ({ ...l, letto: l.tipo === 'manuale' ? altroLetto : letti.has(l.titolo), letto_il: primoLetto(l.titolo), gia: giaLetti.find(g => g.titolo === l.titolo) || null }));
    // il passo 1 è «uno dei due»: se uno è letto, l'altro non è più «prossimo»
    const passo1Fatto = righe.some(r => r.ordine_libro === 1 && r.letto);
    let prossimoDato = false;
    for (const r of righe) {
      r.prossimo = false;
      if (r.letto || prossimoDato || (r.ordine_libro === 1 && passo1Fatto)) continue;
      r.prossimo = true; prossimoDato = true;
    }
    return righe;
  }

  // Il diario: un blocco per libro, dal più recente; dentro le note giorno per giorno (dal più recente)
  function diario(check, libri, giaLetti = []) {
    const perLibro = new Map();
    for (const c of conLibro(check)) {
      if (!perLibro.has(c.libro)) perLibro.set(c.libro, { titolo: c.libro, autore: ((libri || []).find(x => x.titolo === c.libro) || {}).autore || null, giorni: 0, pagine: 0, dal: c.data, al: c.data, note: [] });
      const b = perLibro.get(c.libro);
      b.giorni++; b.pagine += n(c.pagine); b.dal = c.data < b.dal ? c.data : b.dal; b.al = c.data > b.al ? c.data : b.al;
      if (c.note_libro) b.note.push({ data: c.data, testo: c.note_libro, pagine: n(c.pagine) });
    }
    const dai = [...perLibro.values()].sort((a, b) => b.al.localeCompare(a.al));
    // i «già letti» senza Check vanno in fondo, come blocchi senza note
    const gia = giaLetti.filter(g => !perLibro.has(g.titolo)).map(g => ({ titolo: g.titolo, autore: ((libri || []).find(x => x.titolo === g.titolo) || {}).autore || null, giorni: 0, pagine: 0, dal: null, al: null, note: [], gia: g }));
    return [...dai, ...gia];
  }

  function riepilogo(check, libri, oggi, giaLetti = []) {
    const m = mese(oggi);
    return { inCorso: inCorso(check, libri), pagineMese: pagineDelMese(check, m), pagineMesePrima: pagineDelMese(check, mesePrima(oggi)),
      mese: m, mesePrima: mesePrima(oggi), percorso: percorso(check, libri, giaLetti), diario: diario(check, libri, giaLetti) };
  }

  const api = { mese, mesePrima, conLibro, inCorso, pagineDelMese, percorso, diario, riepilogo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else radice.MB21Libri = api;
})(typeof self !== 'undefined' ? self : this);

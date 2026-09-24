// MB21 · la pagina Training (cantiere 42, 24/09/2026): funzioni pure. Le carte (i capitoli del Manuale di Avvio, le tracce della biblioteca N21
// con gli appunti PAL di Ignazio, i libri a catalogo), la ricerca, «Per te, adesso» dalle risposte date al coach, l'allenamento su una
// domanda o un'obiezione. I testi non stanno qui (il progetto è pubblico): il catalogo è nell'archivio privato (coach_batterie, riga
// «training»), la biblioteca nella tabella materiali. Lo usano pagina-training.js e tools/banco/prova_training.js.
(function (radice) {
  const nodo = typeof module !== 'undefined' && module.exports;
  const C = nodo ? require('./coach.js') : radice.MB21Coach;

  // minuscole, senza accenti né punteggiatura: per cercare e per confrontare i titoli
  const piega = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

  // Tutte le carte della pagina. `materiali`: righe della biblioteca { id, tipo, titolo, autore, argomenti, minuti, riassunto, punti_chiave,
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

  // dove si trova una traccia: nel BSM (sezione › pack) o, per gli appunti fuori dalla biblioteca, l'evento o il CEP da cui vengono
  const dove = c => (c.sezione ? ['BSM', c.sezione, c.pack].filter(Boolean).join(' › ') : c.fonte || '');

  // Ricerca: ogni parola (di almeno due lettere) deve esserci, nel titolo, nel riassunto, negli appunti o nei capitoli
  function cerca(tutte, testo) {
    const parole = piega(testo).split(' ').filter(p => p.length > 1);
    if (!parole.length) return [];
    return (tutte || []).filter(c => parole.every(p => c.testo.includes(p)));
  }

  // «Per te, adesso»: dalle chat del coach, le domande, i dubbi, le obiezioni e i freni toccati più spesso, ognuno con la chat da cui
  // viene (così l'allenamento usa lo stesso blocco). `azioni`: { tipo_azione, modalita, esito, riflessione, contatti: { categoria } }
  function perTe(azioni) {
    const conta = new Map();
    for (const a of azioni || []) {
      const sit = C.situazione(a.tipo_azione, a.modalita, a.contatti && a.contatti.categoria, a.esito);
      if (!sit || !Array.isArray(a.riflessione)) continue;
      for (const r of a.riflessione) {
        if (!r || !['obiezioni', 'freni'].includes(r.chiave) || !Array.isArray(r.risposta)) continue;
        for (const nome of r.risposta) {
          if (['Nessuna', 'Niente', 'Altro'].includes(nome)) continue;
          const k = sit + '|' + nome, x = conta.get(k) || { situazione: sit, nome, volte: 0 };
          x.volte++;
          conta.set(k, x);
        }
      }
    }
    return [...conta.values()].sort((a, b) => b.volte - a.volte || a.nome.localeCompare(b.nome, 'it'));
  }

  // L'allenamento su una domanda, un dubbio, un'obiezione o un freno (B = la batteria della sua chat): lo stesso blocco della chat dopo
  // l'esito («tu cosa hai risposto?», le risposte, la traccia), senza salvare niente; in fondo la frase da ricordare. null se non c'è.
  function allenamento(B, nome, nomi) {
    const o = B && B.obiezioni && B.obiezioni[nome];
    if (!o) return null;
    return C.riempi([
      { c: `Allenamento su «${nome}». Pensa all'ultima volta che ti è capitato.` },
      ...(o.manuale ? [{ rif: ['manuale', o.manuale] }] : []),
      ...o.passi,
      { c: `Da ricordare: «${o.frase}».` },
    ], nomi);
  }

  const api = { piega, carte, dove, cerca, perTe, allenamento };
  if (nodo) module.exports = api;
  else radice.MB21Training = api;
})(this);

// MB21 · il coach che parla (cantiere 42): la chat che si apre dopo un esito, al posto del foglietto della riflessione.
// I messaggi NON stanno in questo file, perché il progetto su GitHub è pubblico: stanno nell'archivio privato, la tabella
// coach_batterie, una «batteria» per situazione (oggi le telefonate: «telefonata», «telefonata_partner», «telefonata_cliente»; si scrivono e si caricano dalla cartella privata
// ~/mb21-import/training). Qui c'è solo la logica: quale batteria vale per un esito, come si monta la chat da una batteria
// (l'imbuto), cosa si salva, e il motore che la recita (puntini, fumetti, risposte da toccare).
// Lo usano l'app (index.html → chiediCoach) e la pagina privata di prova, così la chat è la stessa.
//
// Un copione è una lista di passi:
//   { c: 'fumetto', fonte?: [testo, consigliabile], rif?: [tipo, testo] }   un fumetto del coach; rif = va tra gli approfondimenti
//   { rif: [tipo, testo] }                                                   solo un approfondimento, senza fumetto
//   { proponi: 'frase' }                                                     una frase in più tra quelle per la prossima volta
//   { chiedi: [[risposta, [passi]], …], salva?, obiezione? }                 un tocco; ogni risposta continua a modo suo
//   { piu: [[scelta, [passi]], …], nessuna: [etichetta, [passi]], avanti, salva }
//                                                                            più tocchi, poi «Avanti»: i passi di ogni scelta, uno dopo l'altro
//   { scrivi: 'esempio', salta: 'etichetta', poi?: 'risposta', salva }       una riga da scrivere, facoltativa
//   { frase: [proposte], poi: 'risposta del coach', salva? }                 la frase per la prossima volta (+ «Scrivo io…»); prima le «proponi»
// Tipi di rif: manuale · traccia · libro. Fonte consigliabile = materiale ufficiale (traccia in BSM, libro a catalogo, Manuale
// di Avvio): nell'app si vede sotto il fumetto; le altre (per esempio un CEP di Bini) sono note solo per la pagina di prova.
(function (radice) {
  const nodo = typeof module !== 'undefined' && module.exports;

  // ── quale batteria vale per un esito (null = nessuna chat) ──
  // Telefonata: un Contatto al telefono (dalla coda, dai Riordini o dall'Agenda) in cui ci hai parlato. Partner e Clienti
  // hanno esiti diversi e i loro messaggi (24/09): telefonata_partner, telefonata_cliente; tutti gli altri come i Prospect.
  const SENZA_PAROLE = ['No Risposta', 'Telefono spento'];
  const TELEFONATA_DI = { Partner: 'telefonata_partner', Cliente: 'telefonata_cliente' };
  function situazione(tipo, modalita, categoria, esito) {
    if (tipo === 'Contatto' && (!modalita || modalita === 'Telefonata') && esito && !SENZA_PAROLE.includes(esito))
      return TELEFONATA_DI[categoria] || 'telefonata';
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
  //   che cambia a ogni chat, così il coach non ripete sempre la stessa) → domande, dubbi o obiezioni, anche più d'una (+ «Altro»):
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
      ...domande,
      ...(B.extra[esito] || []),
      { c: B.prossima.c }, { frase: B.prossima.frasi[esito] || [], poi: B.prossima.poi[esito], salva: 'prossima' },
      ...(B.bussola[esito] ? [B.bussola[esito]] : []),
    ], nomi);
  }

  // Le telefonate a Prospect, Partner e Clienti hanno la stessa forma: lo stesso montatore, ognuna con la sua batteria.
  const MONTATORI = { telefonata, telefonata_partner: telefonata, telefonata_cliente: telefonata };
  const monta = (sit, B, esito, nomi, n) => (MONTATORI[sit] ? MONTATORI[sit](B, esito, nomi, n) : null);

  // Cosa si salva in azioni.riflessione: le risposte date, nell'ordine, ognuna con la domanda com'era scritta nella chat:
  // { chiave: 'obiezioni' o 'freni' (elenco) · 'risposta' (con obiezione) · 'altro' · 'prossima' · le domande dell'esito ('lavoro', 'motivo'),
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
      if (!a || !a.contatto_id || out[a.contatto_id] || !Array.isArray(a.riflessione)) continue;
      const r = chiave => a.riflessione.find(x => x && x.chiave === chiave);
      const frase = r('prossima');
      if (!frase || typeof frase.risposta !== 'string' || !frase.risposta.trim()) continue;
      const ob = r('obiezioni') || r('freni'), altro = r('altro');   // i partner: «freni»
      const obiezioni = (ob && Array.isArray(ob.risposta) ? ob.risposta : [])
        .filter(x => x !== 'Nessuna' && x !== 'Niente').map(x => (x === 'Altro' ? (altro && altro.risposta ? `«${altro.risposta}»` : null) : x)).filter(Boolean);
      out[a.contatto_id] = { frase: frase.risposta.trim(), obiezioni, azione: a.id, quando: quando(a) };
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
    const salva = (p, risposta) => {
      if (p.salva) stato.risposte.push({ chiave: p.salva, domanda: stato.domanda, risposta, ...(p.obiezione ? { obiezione: p.obiezione } : {}) });
    };
    async function recita(lista) {
      for (const p of lista) {
        if (!corpo.isConnected) return;
        if (p.rif && !stato.rif.some(r => r[1] === p.rif[1])) stato.rif.push(p.rif);
        if (p.proponi && !stato.proposte.includes(p.proponi)) stato.proposte.push(p.proponi);
        if (p.c) await scrive(p.c, p.fonte);
        else if (p.chiedi) {
          const x = await tocca(p.chiedi.map(y => y[0]));
          fumetto(x, true); salva(p, x);
          await recita(p.chiedi.find(y => y[0] === x)[1]);
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

  const api = { SENZA_PAROLE, situazione, riempi, telefonata, monta, riflessioneDa, ricordi, chat };
  if (nodo) module.exports = api;
  else radice.MB21Coach = api;
})(this);

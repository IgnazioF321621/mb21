// MB21 · pagina «I miei libri» (cantiere 40, lavoro 7; bozza approvata da Ignazio il 22/09/2026): solo definizioni.
// Si apre dal Profilo («📖 I miei libri») e da «Il mio percorso» (Prossimo libro). Tre blocchi: «Stai leggendo» (l'ultimo Check con
// un libro, le pagine del mese e del mese prima), «Il percorso dei libri» (i passi decisi, ✓ sui letti, il prossimo in evidenza,
// «solo da N21» dove serve), «Il mio diario» (un blocco per libro, dentro le note dei Check giorno per giorno).
// I dati sono i Check del Giorno di chi è scelto (Partner Select compreso) e i libri della biblioteca. La logica è in libri.js.

const LB = { aperto: null, ritorno: 'profilo' };   // un libro aperto alla volta (Ignazio 22/09: «altrimenti diventa tutto molto lungo»)

async function apriLibri(ritorno) {
  if (ritorno) LB.ritorno = ritorno;
  const indietro = LB.ritorno === 'oggi' ? '‹ Dashboard' : '‹ Profilo';
  app.innerHTML = `<button class="indietro" id="lb-indietro">${indietro}</button><h1>${ic('libro')} I miei libri</h1><div class="vuoto">Carico…</div>`;
  const torna = () => { if (LB.ritorno === 'oggi') { ST.tab = 'oggi'; mostraTab(); } else apriProfilo(); };
  document.getElementById('lb-indietro').onclick = torna;
  const [check, libri] = await Promise.all([
    dbq('check con libro', supa.from('check_giorno').select('data, libro, pagine, note_libro').eq('user_id', visto().id).order('data')),
    dbq('libri', supa.from('materiali').select('tipo, titolo, autore, ordine_libro, solo_n21').in('tipo', ['libro', 'manuale'])),
  ]);
  if (check.error || libri.error) { app.innerHTML = `<button class="indietro" id="lb-indietro">${indietro}</button><h1>${ic('libro')} I miei libri</h1><div class="avviso">Non riesco a caricare i libri: riprova.</div>${versione()}`; document.getElementById('lb-indietro').onclick = torna; return; }
  const oggi = MB21Coda.oggiRoma();
  const r = MB21Libri.riepilogo(check.data || [], libri.data || [], oggi);
  const nomeMese = m => MB21Rubrica.MESI[Number(m.slice(5, 7)) - 1];
  const data = MB21Lista.data;
  const chi = guardoAltri() ? ` di ${esc(nomeDi(visto()))}` : '';

  const inCorso = r.inCorso ? `<div class="riquadro">
      <div class="sh-etichetta">Stai leggendo</div>
      <div class="sh-titolo">${esc(r.inCorso.titolo)}</div>
      <div class="sh-oratore">${r.inCorso.autore ? esc(r.inCorso.autore) + ' · ' : ''}ultimo Check ${esc(data(r.inCorso.ultimo, true))}</div>
      <div class="lb-numeri"><div><span>Pagine a ${esc(nomeMese(r.mese))}</span><b>${r.pagineMese}</b></div><div><span>A ${esc(nomeMese(r.mesePrima))}</span><b>${r.pagineMesePrima}</b></div></div>
    </div>` : `<div class="riquadro"><div class="sh-etichetta">Stai leggendo</div><div class="sotto" style="margin:0">Nessun libro nei Check finora. Nel Check del Giorno scegli il libro e scrivi le pagine: qui nasce il diario.</div>
      <div class="lb-numeri"><div><span>Pagine a ${esc(nomeMese(r.mese))}</span><b>${r.pagineMese}</b></div><div><span>A ${esc(nomeMese(r.mesePrima))}</span><b>${r.pagineMesePrima}</b></div></div></div>`;

  const percorso = r.percorso.length ? `<h2>Il percorso dei libri</h2><div class="riquadro lb-percorso">${r.percorso.map(p => `
    <div class="lb-passo ${p.letto ? 'letto' : p.prossimo ? 'ora' : ''}">
      <span class="lb-tondo">${p.letto ? ic('fatto', 14) : p.ordine_libro}</span>
      <div><b>${esc(p.titolo)}${p.solo_n21 ? ' <span class="sh-chiede n21">solo da N21</span>' : ''}</b>
        <small>${p.tipo === 'manuale' ? 'Arriva con lo Starter Pack' : esc(p.autore || '')}${p.letto && p.letto_il ? ` · letto da ${esc(nomeMese(p.letto_il.slice(0, 7)))} ${p.letto_il.slice(0, 4)}` : p.prossimo ? (p.solo_n21 ? ' · il prossimo: lo trovi da Network 21 o al prossimo evento' : ' · il prossimo') : ''}</small></div>
    </div>`).join('')}</div>` : '';

  const diario = r.diario.length ? `<h2>Il mio diario</h2><div class="riquadro sh-elenco">${r.diario.map((b, i) => {
    const aperto = LB.aperto === b.titolo;
    return `<button class="lb-libro" data-libro="${esc(b.titolo)}" aria-expanded="${aperto}">
        <div><b>${esc(b.titolo)}</b><small>${b.autore ? esc(b.autore) + ' · ' : ''}${b.giorni} ${b.giorni === 1 ? 'giorno' : 'giorni'} · ${b.pagine} pagine · ${b.dal === b.al ? 'il ' + esc(data(b.dal, true)) : 'dal ' + esc(data(b.dal, true)) + ' al ' + esc(data(b.al, true))}</small></div>
        <span class="sh-riga-freccia">${aperto ? '⌃' : '›'}</span></button>
      ${aperto ? `<div class="lb-note">${b.note.length ? b.note.map(x => `<div class="lb-nota"><b>${esc(x.testo)}</b><small>${esc(data(x.data))}${x.pagine ? ` · ${x.pagine} pagine` : ''}</small></div>`).join('') : '<div class="sotto" style="margin:8px 0">Nessuna nota scritta per questo libro.</div>'}</div>` : ''}`;
  }).join('')}</div>` : '';

  app.innerHTML = `<button class="indietro" id="lb-indietro">${indietro}</button><h1>${ic('libro')} ${guardoAltri() ? 'I libri di ' + esc(MB21Sharing.nomeCorto(nomeDi(visto()))) : 'I miei libri'}</h1>
    <div class="sotto">Dai Check del Giorno${chi}: il libro, le pagine, le note.</div>${inCorso}${percorso}${diario}${versione()}`;
  window.scrollTo(0, 0);
  document.getElementById('lb-indietro').onclick = torna;
  app.querySelectorAll('[data-libro]').forEach(b => b.onclick = () => { LB.aperto = LB.aperto === b.dataset.libro ? null : b.dataset.libro; apriLibri(); });
}

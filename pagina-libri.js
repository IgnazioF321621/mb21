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
  const [check, libri, gia, personali] = await Promise.all([
    dbq('check con libro', supa.from('check_giorno').select('data, libro, pagine, note_libro').eq('user_id', visto().id).order('data')),
    dbq('libri', supa.from('materiali').select('tipo, titolo, autore, ordine_libro, solo_n21, fuori_catalogo').in('tipo', ['libro', 'manuale'])),
    dbq('libri già letti', supa.from('libri_letti').select('id, titolo, quando').eq('user_id', visto().id)),
    dbq('libri personali', supa.from('libri_personali').select('titolo, autore').eq('user_id', visto().id)),
  ]);
  if (check.error || libri.error) { app.innerHTML = `<button class="indietro" id="lb-indietro">${indietro}</button><h1>${ic('libro')} I miei libri</h1><div class="avviso">Non riesco a caricare i libri: riprova.</div>${versione()}`; document.getElementById('lb-indietro').onclick = torna; return; }
  const oggi = MB21Coda.oggiRoma();
  // i libri personali («Altro libro…») entrano nell'elenco come libri fuori percorso, così hanno autore nel diario
  const tuttiLibri = [...(libri.data || []), ...(personali.data || []).map(x => ({ tipo: 'libro', titolo: x.titolo, autore: x.autore, ordine_libro: null, solo_n21: false, personale: true }))];
  const giaLetti = gia.data || [];
  const r = MB21Libri.riepilogo(check.data || [], tuttiLibri, oggi, giaLetti);
  const mio = !guardoAltri();
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
    <button class="lb-passo ${p.letto ? 'letto' : p.prossimo ? 'ora' : ''}" ${mio && p.tipo !== 'manuale' ? `data-gia="${esc(p.titolo)}"` : 'disabled'}>
      <span class="lb-tondo">${p.letto ? ic('fatto', 14) : p.ordine_libro}</span>
      <div><b>${esc(p.titolo)}${p.solo_n21 ? ' <span class="sh-chiede n21">solo da N21</span>' : ''}</b>
        <small>${p.tipo === 'manuale' ? 'Arriva con lo Starter Pack' : esc(p.autore || '')}${p.letto && p.letto_il ? ` · letto da ${esc(nomeMese(p.letto_il.slice(0, 7)))} ${p.letto_il.slice(0, 4)}` : p.gia ? ` · letto ${esc(p.gia.quando || 'prima di MB21')}` : p.prossimo ? (p.solo_n21 ? ' · il prossimo: lo trovi da Network 21 o al prossimo evento' : ' · il prossimo') : (mio ? ' · tocca se l\'hai già letto' : '')}</small></div>
    </button>`).join('')}</div>` : '';

  const diario = `<h2>Il mio diario</h2>${r.diario.length ? `<div class="riquadro sh-elenco">${r.diario.map((b, i) => {
    const aperto = LB.aperto === b.titolo;
    if (b.gia) return `<button class="lb-libro" ${mio ? `data-gia="${esc(b.titolo)}"` : 'disabled'}>
        <div><b>${esc(b.titolo)}</b><small>${b.autore ? esc(b.autore) + ' · ' : ''}letto ${esc(b.gia.quando || 'prima di MB21')}${mio ? ' · tocca per togliere' : ''}</small></div></button>`;
    return `<button class="lb-libro" data-libro="${esc(b.titolo)}" aria-expanded="${aperto}">
        <div><b>${esc(b.titolo)}</b><small>${b.autore ? esc(b.autore) + ' · ' : ''}${b.giorni} ${b.giorni === 1 ? 'giorno' : 'giorni'} · ${b.pagine} pagine · ${b.dal === b.al ? 'il ' + esc(data(b.dal, true)) : 'dal ' + esc(data(b.dal, true)) + ' al ' + esc(data(b.al, true))}</small></div>
        <span class="sh-riga-freccia">${aperto ? '⌃' : '›'}</span></button>
      ${aperto ? `<div class="lb-note">${b.note.length ? b.note.map(x => `<div class="lb-nota"><b>${esc(x.testo)}</b><small>${esc(data(x.data))}${x.pagine ? ` · ${x.pagine} pagine` : ''}</small></div>`).join('') : '<div class="sotto" style="margin:8px 0">Nessuna nota scritta per questo libro.</div>'}</div>` : ''}`;
  }).join('')}</div>` : '<div class="vuoto">Nessun libro nel diario finora.</div>'}${mio ? `<button class="sh-mano" id="lb-gia-altro">${ic('piu')} Un libro già letto</button>` : ''}`;

  app.innerHTML = `<button class="indietro" id="lb-indietro">${indietro}</button><h1>${ic('libro')} ${guardoAltri() ? 'I libri di ' + esc(MB21Sharing.nomeCorto(nomeDi(visto()))) : 'I miei libri'}</h1>
    <div class="sotto">Dai Check del Giorno${chi}: il libro, le pagine, le note.</div>${inCorso}${percorso}${diario}${versione()}`;
  window.scrollTo(0, 0);
  document.getElementById('lb-indietro').onclick = torna;
  app.querySelectorAll('[data-libro]').forEach(b => b.onclick = () => { LB.aperto = LB.aperto === b.dataset.libro ? null : b.dataset.libro; apriLibri(); });
  // «L'ho già letto» (Ignazio 22/09: «come si fa con quei libri che uno ha già letto anche prima di Glide?»): un tocco sul libro
  // del percorso non spuntato lo segna (con il periodo, facoltativo); un tocco su un «già letto» lo toglie
  app.querySelectorAll('[data-gia]').forEach(b => b.onclick = async () => {
    const titolo = b.dataset.gia, esistente = giaLetti.find(g => g.titolo === titolo);
    if (esistente) {
      if (!await chiediConferma('Tolgo «già letto»?', `${titolo} torna tra quelli da leggere.`, 'Togli', true)) return;
      const { error } = await dbq('togli già letto', supa.from('libri_letti').delete().eq('id', esistente.id));
      if (error) return mostraToast('Non tolto: riprova.');
      return apriLibri();
    }
    if (r.percorso.some(p => p.titolo === titolo && p.letto)) return;   // letto dai Check: niente da segnare
    segnaGiaLetto(titolo);
  });
  const altro = document.getElementById('lb-gia-altro');
  if (altro) altro.onclick = async () => {
    const scelte = tuttiLibri.filter(l => l.tipo === 'libro' && !r.diario.some(b => b.titolo === l.titolo)).map(l => l.titolo).sort((a, b) => a.localeCompare(b, 'it'));
    const v = await moduloSemplice('Un libro già letto', [
      { k: 'titolo', etichetta: 'Libro', tipo: 'select', opzioni: ['Scegli il libro', ...scelte, 'Libro non da sistema…'], valore: 'Scegli il libro', obbligatorio: true },
      { k: 'quando', etichetta: 'Quando (se lo ricordi)', tipo: 'text', valore: '' }]);
    if (!v || v.titolo === 'Scegli il libro') return;
    if (v.titolo !== 'Libro non da sistema…') return salvaGiaLetto(v.titolo, v.quando);
    // un titolo nuovo (Ignazio 22/09): si scrive una volta, entra tra i libri personali e si segna già letto
    const a = await moduloSemplice('Libro non da sistema', [
      { k: 'titolo', etichetta: 'Titolo', tipo: 'text', valore: '', obbligatorio: true },
      { k: 'autore', etichetta: 'Autore', tipo: 'text', valore: '' }]);
    const titolo = a && String(a.titolo || '').trim().slice(0, 120);
    if (!titolo) return;
    const { error } = await dbq('altro libro', supa.from('libri_personali').upsert({ user_id: ST.utente.id, titolo, autore: String(a.autore || '').trim().slice(0, 80) || null }, { onConflict: 'user_id,titolo' }));
    if (error) return mostraToast('Libro non salvato: riprova.');
    salvaGiaLetto(titolo, v.quando);
  };
}

async function segnaGiaLetto(titolo) {
  const v = await moduloSemplice(`L'hai già letto? · ${titolo}`, [{ k: 'quando', etichetta: 'Quando (se lo ricordi: un anno, «prima di Glide»…)', tipo: 'text', valore: '' }]);
  if (!v) return;
  salvaGiaLetto(titolo, v.quando);
}
async function salvaGiaLetto(titolo, quando) {
  const { error } = await dbq('già letto', supa.from('libri_letti').insert({ user_id: ST.utente.id, titolo, quando: String(quando || '').trim().slice(0, 40) || null }));
  if (error) return mostraToast('Non salvato: riprova.');
  mostraToast(`${titolo}: segnato come già letto`);
  apriLibri();
}

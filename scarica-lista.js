// MB21 · «SCARICA LA MIA LISTA» (nota Admin 008, Ignazio 21/10/2026, da Conformità 160): ogni partner scarica da solo un file .xlsx
// (si apre anche con Google Fogli) con TUTTO ciò che ha in MB21: le schede (tutte le colonne), lo storico delle azioni e le note.
// Solo i dati di chi è entrato (`ST.utente`), mai quelli di un altro partner visto con il Partner Select (nemmeno per l'Admin).
// Le regole del file stanno in esporta.js (fogliMiaLista, xlsxBytesMulti; prova tools/banco/prova_esporta.js).
// Usa ciò che definisce index.html (supa, dbq, ST, mostraToast) e coda.js (MB21Coda). Solo definizioni.
async function leggiTuttoMio(tabella, ordine) {
  const righe = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await dbq('la mia lista (' + tabella + ')', supa.from(tabella).select('*').eq('user_id', ST.utente.id).order(ordine).range(da, da + 999));
    if (error) throw error;
    righe.push(...data);
    if (data.length < 1000) return righe;
  }
}
// Dà { ok: true, schede, azioni, note } oppure { ok: false }: nessun file a metà
async function scaricaMiaLista() {
  if (!ST.utente || !ST.utente.id) return { ok: false };
  try {
    const [contatti, azioni, note] = await Promise.all([leggiTuttoMio('contatti', 'nome'), leggiTuttoMio('azioni', 'creato_il'), leggiTuttoMio('coach_note', 'scritta_il')]);
    const bytes = MB21Esporta.xlsxBytesMulti(MB21Esporta.fogliMiaLista({ contatti, azioni, note }));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: MB21Esporta.nomeFileMiaLista(MB21Coda.oggiRoma()) });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);   // su iPhone si apre il foglio per salvarlo in File o passarlo a un'altra app
    return { ok: true, schede: contatti.length, azioni: azioni.length, note: note.length };
  } catch (e) { return { ok: false }; }
}

// ── Il tasto in Dashboard ── (Ignazio 21/10/2026: «direttamente nella pagina Dashboard, togliendo le altre opzioni»; nessun'altra posizione)
// UN SOLO PUNTO da cambiare: `CHIUSURA.data` (AAAA-MM-GG, il giorno di chiusura) e `CHIUSURA.ora` (HH:MM, ora di Roma; vuota = solo il giorno). Data data da Ignazio il 21/10/2026: 25/10/2026 alle 18:00. Se `data` è vuota (`null`) il tasto non compare a nessuno:
// la data la dà Ignazio, dopo il suo messaggio su WhatsApp. `esenti`: le persone per cui non cambia nulla (oltre all'Admin): la persona di fiducia.
const CHIUSURA = { data: '2026-10-25', ora: '18:00', esenti: ['831417a9-6649-44e8-8eb2-e5d79d0595e5'] };
const giornoChiusura = () => new Date(CHIUSURA.data + 'T12:00:00').toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' }) + (CHIUSURA.ora ? ` alle ${CHIUSURA.ora}` : '');
// Chi è interessato dalla chiusura: ci deve essere la data, e non l'Admin, non la persona di fiducia, non chi ha l'accesso limitato né chi guarda un altro partner
const chiusuraPerMe = () => !!CHIUSURA.data && !eAdmin() && !limitato() && !guardoAltri() && !!ST.utente && !CHIUSURA.esenti.includes(ST.utente.id);
function bannerScaricaLista() {
  if (!chiusuraPerMe()) return '';
  return `<button class="banner-grande messaggi" id="ds-scarica-lista"><span class="ico">${ic('file')}</span>
    <span><b>MB21 torna personale dal ${esc(giornoChiusura())}</b><small>Scarica la tua lista completa: schede, azioni e note, in un file Excel (anche per Google Fogli)</small></span></button>`;
}
async function toccoScaricaLista(b) {
  b.disabled = true;
  mostraToast('Preparo il file…');
  const r = await scaricaMiaLista();
  b.disabled = false;
  if (r.ok) ricordaScaricata();
  mostraToast(r.ok ? `File pronto: ${r.schede.toLocaleString('it-IT')} schede, ${r.azioni.toLocaleString('it-IT')} azioni, ${r.note.toLocaleString('it-IT')} note` : 'Non riesco a preparare il file: controlla la connessione e riprova');
  return r;
}

// ── Il messaggio all'apertura dell'app ── (Ignazio 21/10/2026, testo approvato in Conformità 160): un foglio con [Scarica la mia lista] e [Più tardi].
// Esce a ogni apertura finché su questo telefono non si è scaricato il file; «Più tardi» (o il tocco fuori) lo chiude e torna alla prossima apertura.
// Mai sopra un altro foglio né se l'app si apre da un avviso. Dà true se ha aperto il foglio (allora gli altri annunci aspettano).
const CHIAVE_SCARICATA = 'mb21-lista-scaricata';
const giaScaricata = () => { try { return localStorage.getItem(CHIAVE_SCARICATA) === CHIUSURA.data; } catch (e) { return false; } };
const ricordaScaricata = () => { try { localStorage.setItem(CHIAVE_SCARICATA, CHIUSURA.data); } catch (e) { /* senza memoria: il foglio torna, pazienza */ } };
async function annuncioChiusura(aprire) {
  if (!aprire || !chiusuraPerMe() || giaScaricata() || document.querySelector('.velo')) return false;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto"><div class="testa-foglio"><h3>${ic('file')} MB21 torna personale dal ${esc(giornoChiusura())}</h3></div>
    <div class="riquadro" style="margin-bottom:12px"><p style="margin:0 0 8px">Fino ad allora puoi scaricare la tua Lista Nomi completa (schede, azioni e note) in un file Excel, che si apre anche con Google Fogli.</p>
      <p style="margin:0 0 8px">Dopo la chiusura i tuoi dati non saranno più visibili a nessuno e verranno cancellati entro 30 giorni.</p>
      <p style="margin:0">Grazie per aver usato MB21!</p></div>
    <button class="primario" id="cl-scarica">${ic('file')} Scarica la mia lista</button>
    <button class="link" id="cl-dopo" style="display:block;margin:10px auto 0">Più tardi</button></div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };
  velo.querySelector('#cl-dopo').onclick = () => velo.remove();
  const b = velo.querySelector('#cl-scarica');
  b.onclick = async () => { const r = await toccoScaricaLista(b); if (r && r.ok) velo.remove(); };
  return true;
}

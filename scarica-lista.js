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
// UN SOLO PUNTO da cambiare: `CHIUSURA.data` (AAAA-MM-GG, il giorno di chiusura). Finché è vuota (`null`) il tasto non compare a nessuno:
// la data la dà Ignazio, dopo il suo messaggio su WhatsApp. `esenti`: le persone per cui non cambia nulla (oltre all'Admin): la persona di fiducia.
const CHIUSURA = { data: null, esenti: ['831417a9-6649-44e8-8eb2-e5d79d0595e5'] };
const giornoChiusura = () => new Date(CHIUSURA.data + 'T12:00:00').toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' });
function bannerScaricaLista() {
  if (!CHIUSURA.data || eAdmin() || limitato() || guardoAltri() || !ST.utente || CHIUSURA.esenti.includes(ST.utente.id)) return '';
  return `<button class="banner-grande messaggi" id="ds-scarica-lista"><span class="ico">${ic('file')}</span>
    <span><b>MB21 torna personale dal ${esc(giornoChiusura())}</b><small>Scarica la tua lista completa: schede, azioni e note, in un file Excel (anche per Google Fogli)</small></span></button>`;
}
async function toccoScaricaLista(b) {
  b.disabled = true;
  mostraToast('Preparo il file…');
  const r = await scaricaMiaLista();
  b.disabled = false;
  mostraToast(r.ok ? `File pronto: ${r.schede.toLocaleString('it-IT')} schede, ${r.azioni.toLocaleString('it-IT')} azioni, ${r.note.toLocaleString('it-IT')} note` : 'Non riesco a preparare il file: controlla la connessione e riprova');
}

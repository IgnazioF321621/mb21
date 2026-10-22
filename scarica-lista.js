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
// UN SOLO PUNTO da cambiare: `CHIUSURA.data` (AAAA-MM-GG, il giorno di chiusura) e `CHIUSURA.ora` (HH:MM, ora di Roma; vuota = solo il giorno) e `CHIUSURA.cancellazione` (il giorno entro cui si cancellano i dati: 30/11/2026, dato da Ignazio il 21/10). Data data da Ignazio il 21/10/2026: 25/10/2026 alle 18:00. Se `data` è vuota (`null`) il tasto non compare a nessuno:
// la data la dà Ignazio, dopo il suo messaggio su WhatsApp. `esenti`: le persone per cui non cambia nulla (oltre all'Admin): la persona di fiducia.
const CHIUSURA = { data: '2026-10-25', ora: '18:00', cancellazione: '2026-11-30', esenti: ['831417a9-6649-44e8-8eb2-e5d79d0595e5'] };
const giornoChiusura = () => new Date(CHIUSURA.data + 'T12:00:00').toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' }) + (CHIUSURA.ora ? ` alle ${CHIUSURA.ora}` : '');
// Chi è interessato dalla chiusura: ci deve essere la data, e non l'Admin, non la persona di fiducia, non chi ha l'accesso limitato né chi guarda un altro partner
const chiusuraPerMe = () => !!CHIUSURA.data && !eAdmin() && !limitato() && !guardoAltri() && !!ST.utente && !CHIUSURA.esenti.includes(ST.utente.id);
const giornoCancellazione = () => new Date(CHIUSURA.cancellazione + 'T12:00:00').toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' });
function bannerScaricaLista() {
  if (!chiusuraPerMe()) return '';
  return `<button class="banner-grande messaggi" id="ds-scarica-lista"><span class="ico">${ic('file')}</span>
    <span><b>MB21 torna personale dal ${esc(giornoChiusura())}</b><small>Tocca qui per scaricare la tua lista completa: schede, azioni e note, in un file Excel (anche per Google Fogli)</small></span></button>`;
}
// Dove finisce il file, a parole, secondo il dispositivo (nota Admin 017: una partner non capiva dove trovarlo)
function doveFinisceIlFile(ua) {
  const u = String(ua || '');
  if (/iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && /Mobile/.test(u))) return ['Sul telefono si apre il foglio di condivisione: tocca «Salva su File» e scegli dove tenerlo.', 'Lo ritrovi nell\'app File. Per Google Fogli: dall\'app File toccalo e scegli «Apri con» Fogli Google.'];
  if (/Android/.test(u)) return ['Il file è nella cartella «Download» del telefono (anche nelle notifiche, appena scaricato).', 'Toccalo per aprirlo con Fogli Google o con Excel.'];
  if (/Macintosh/.test(u)) return ['Il file è nella cartella «Download» del Mac (in Safari anche con la freccia in alto a destra).', 'Per Google Fogli: apri fogli.google.com, tocca File › Importa › Carica e scegli il file.'];
  return ['Il file è nella cartella «Download» del computer.', 'Per Google Fogli: apri fogli.google.com, tocca File › Importa › Carica e scegli il file.'];
}
function foglioFilePronto(r) {
  const [dove, poi] = doveFinisceIlFile(navigator.userAgent), nome = MB21Esporta.nomeFileMiaLista(MB21Coda.oggiRoma());
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto"><div class="testa-foglio"><h3>${ic('fatto')} Il file è pronto</h3></div>
    <div class="riquadro" style="margin-bottom:12px"><p style="margin:0 0 8px"><b>${esc(nome)}</b></p>
      <p style="margin:0 0 8px">${r.schede.toLocaleString('it-IT')} schede, ${r.azioni.toLocaleString('it-IT')} azioni, ${r.note.toLocaleString('it-IT')} note.</p>
      <p style="margin:0 0 8px">${esc(dove)}</p><p style="margin:0">${esc(poi)}</p></div>
    <button class="primario" id="fp-ok">Ho capito</button></div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };
  velo.querySelector('#fp-ok').onclick = () => velo.remove();
}
async function toccoScaricaLista(b) {
  b.disabled = true;
  mostraToast('Preparo il file…');
  const r = await scaricaMiaLista();
  b.disabled = false;
  if (r.ok) { ricordaScaricata(); foglioFilePronto(r); }
  else mostraToast('Non riesco a preparare il file: controlla la connessione e riprova');
  return r;
}

// ── Il messaggio all'apertura dell'app ── (Ignazio 21/10/2026, testo approvato in Conformità 160): un foglio con [Scarica la mia lista] e [Più tardi].
// Esce a ogni apertura finché su questo telefono non si è scaricato il file; «Più tardi» (o il tocco fuori) lo chiude e torna alla prossima apertura.
// Mai sopra un altro foglio né se l'app si apre da un avviso. Dà true se ha aperto il foglio (allora gli altri annunci aspettano).
const CHIAVE_SCARICATA = 'mb21-lista-scaricata';
const giaScaricata = () => { try { return localStorage.getItem(CHIAVE_SCARICATA) === CHIUSURA.data; } catch (e) { return false; } };
const ricordaScaricata = () => { try { localStorage.setItem(CHIAVE_SCARICATA, CHIUSURA.data); } catch (e) { /* senza memoria: il foglio torna, pazienza */ } };
// Il giorno prima della chiusura (ora di Roma) il foglio cambia testo: il promemoria («Domani l'accesso a MB21 viene chiuso…»). Sempre e solo a chi non ha ancora scaricato il file.
const giornoPrima = () => new Date(Date.parse(CHIUSURA.data + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
const eVigilia = () => !!CHIUSURA.data && MB21Coda.oggiRoma() === giornoPrima();
async function annuncioChiusura(aprire) {
  if (!aprire || !chiusuraPerMe() || giaScaricata() || document.querySelector('.velo')) return false;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto"><div class="testa-foglio"><h3>${ic('file')} ${eVigilia() ? `Domani l'accesso a MB21 viene chiuso` : `MB21 torna personale dal ${esc(giornoChiusura())}`}</h3></div>
    <div class="riquadro" style="margin-bottom:12px">${eVigilia() ? `<p style="margin:0 0 8px">Se non l'hai ancora fatto, puoi scaricare ora la tua Lista Nomi (schede, azioni e note) in un file Excel, che si apre anche con Google Fogli.</p>
      <p style="margin:0">Dopo la chiusura i tuoi dati non saranno più visibili a nessuno e verranno cancellati entro il ${esc(giornoCancellazione())}.</p>` : `<p style="margin:0 0 8px">Fino ad allora puoi scaricare la tua Lista Nomi completa (schede, azioni e note) in un file Excel, che si apre anche con Google Fogli.</p>
      <p style="margin:0 0 8px">Dopo la chiusura i tuoi dati non saranno più visibili a nessuno e verranno cancellati entro il ${esc(giornoCancellazione())}.</p>
      <p style="margin:0">Grazie per aver usato MB21!</p>`}</div>
    <button class="primario" id="cl-scarica">${ic('file')} Scarica la mia lista</button>
    <button class="link" id="cl-dopo" style="display:block;margin:10px auto 0">Più tardi</button></div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };
  velo.querySelector('#cl-dopo').onclick = () => velo.remove();
  const b = velo.querySelector('#cl-scarica');
  b.onclick = async () => { const r = await toccoScaricaLista(b); if (r && r.ok) velo.remove(); };
  return true;
}

// ── La schermata dopo la chiusura ── (Ignazio 21/10/2026, testo di Conformità 160, cancellazione il 30 novembre): per chi prova a entrare quando l'accesso
// è chiuso. Il blocco vero (account senza accesso) è della nota Fondamenta 011: qui, se un utente senza accesso entra dopo la data e l'ora di chiusura,
// invece di «Utente non abilitato.» vede questa schermata, senza il modulo di ingresso. Prima della chiusura nulla cambia.
const chiusuraAvvenuta = () => {
  if (!CHIUSURA.data) return false;
  const ora = new Date().toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' });
  return `${MB21Coda.oggiRoma()} ${ora}` >= `${CHIUSURA.data} ${CHIUSURA.ora || '00:00'}`;
};
function mostraChiusura() {
  const tab = document.getElementById('tab'); if (tab) tab.hidden = true;
  app.innerHTML = `<div class="accesso"><h1>MB21</h1>
    <div class="riquadro"><p style="margin:0 0 8px"><b>L'accesso a MB21 è chiuso dal ${esc(giornoChiusura())}.</b></p>
      <p style="margin:0 0 8px">I tuoi dati verranno cancellati entro il ${esc(giornoCancellazione())}.</p>
      <p style="margin:0">Per qualsiasi cosa scrivi a Ignazio.</p></div></div>`;
}

// ── ADMIN · «Avvisa i partner della chiusura» ── (nota Admin 009, Ignazio 21/10/2026): per ogni partner un tasto «Manda WhatsApp» che apre la chat con il
// messaggio già scritto e il suo nome; Ignazio preme solo «Invia» (nessun invio automatico). La spunta «mandato» sta SOLO su questo telefono
// (localStorage, nessuna scrittura nel database). Date prese da CHIUSURA. Testo definitivo: Conformità 160 (approvato da Ignazio il 21/10/2026).
const giornoDi = iso => new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long' });
function messaggioChiusura(nome) {
  return `Ciao ${nome}, ti scrivo per una novità su MB21.

Dalle ore ${CHIUSURA.ora} del ${giornoDi(CHIUSURA.data)} MB21 tornerà ad essere uno strumento strettamente personale ed ad uso del sottoscritto, come era nato nell'idea iniziale; l’accesso per la squadra verrà chiuso. È una scelta fatta con calma e ponderata a lungo, per tenere tutto in ordine e nel modo più corretto.

Prima di allora puoi scaricare la tua Lista Nomi con tutto quello che hai fatto (schede, azioni, note) in un file Excel, che si apre anche con Google Fogli: lo trovi aprendo MB21, nella Dashboard, con il tasto «Scarica la mia lista». Ti consiglio di farlo entro il ${giornoDi(giornoPrima())}.

Dopo la chiusura i tuoi dati non saranno più visibili a nessuno e verranno cancellati definitivamente entro il ${giornoCancellazione()}. Se hai difficoltà a scaricare il file, scrivimi e te lo preparo io.

Grazie di cuore per aver usato MB21, per i consigli e le segnalazioni che l’hanno fatta crescere. Andiamo avanti insieme come sempre!

Ignazio`;
}
const CHIAVE_MANDATI = 'mb21-chiusura-mandati';
function mandati() { try { return new Set(JSON.parse(localStorage.getItem(CHIAVE_MANDATI) || '[]')); } catch (e) { return new Set(); } }
function salvaMandati(set) { try { localStorage.setItem(CHIAVE_MANDATI, JSON.stringify([...set])); } catch (e) { /* senza memoria: la spunta non resta, pazienza */ } }
const daAvvisare = () => AD.utenti.filter(u => !CHIUSURA.esenti.includes(u.id));
// Prima la scheda del partner nella Lista di Ignazio (ha il +39), poi il numero del Profilo: letti ora, prima che i telefoni escano dalla tabella `squadra`
async function caricaChiusuraAdmin() {
  const codici = daAvvisare().map(u => u.partner_id).filter(Boolean);
  AD.telSchede = AD.telSchede || {};
  if (codici.length) {
    const { data } = await dbq('telefoni delle schede', supa.from('contatti').select('codice_amway, telefono').in('codice_amway', codici).is('eliminato_il', null).like('telefono', '+%'));
    (data || []).forEach(c => { AD.telSchede[c.codice_amway] = c.telefono; });
  }
  AD.chiusuraPronta = true;
  if (AD.sezione === 'chiusura') disegnaAdmin();
}
function chiusuraAdminHtml() {
  const tutti = daAvvisare(), fatti = mandati();
  const h = `<h1>${ic('whatsapp')} Avvisa della chiusura</h1><div class="sotto" style="margin:0 0 8px">Un tocco per persona: si apre WhatsApp con il messaggio già scritto e il suo nome, tu premi solo «Invia». La spunta resta solo su questo telefono.</div>
    <div class="avviso"><b>Mandati ${tutti.filter(u => fatti.has(u.id)).length} su ${tutti.length}</b></div>`;
  if (!AD.chiusuraPronta) return h + `<div class="vuoto">Carico i numeri…</div>`;
  return h + tutti.map(u => {
    const nome = (u.nome || nomeDi(u)).split(' ')[0], tel = telefonoInvito(u), link = tel ? MB21Segnala.linkWhatsApp(tel, messaggioChiusura(nome)) : null, fatto = fatti.has(u.id);
    return `<div class="ad-richiesta"><b>${fatto ? '✅ ' : ''}${esc(nomeDi(u))}</b>
      ${link ? `<div class="ad-invita"><a class="ct-whatsapp" data-cw="${esc(u.id)}" href="${esc(link)}" target="_blank" rel="noopener">${ic('whatsapp')} ${fatto ? 'Manda di nuovo' : 'Manda WhatsApp'}</a>
        <button data-cw-spunta="${esc(u.id)}">${fatto ? 'Non mandato' : 'Segna come mandato'}</button></div>` : '<small>Manca il numero: avvisalo a voce</small>'}</div>`;
  }).join('');
}
function collegaChiusuraAdmin() {
  const su = (sel, fn) => app.querySelectorAll(sel).forEach(b => b.addEventListener('click', () => fn(b)));
  su('[data-cw]', b => { const f = mandati(); f.add(b.dataset.cw); salvaMandati(f); setTimeout(() => AD.sezione === 'chiusura' && disegnaAdmin(), 400); });   // il link si apre da solo; la spunta si accende subito dopo
  su('[data-cw-spunta]', b => { const f = mandati(), id = b.dataset.cwSpunta; if (f.has(id)) f.delete(id); else f.add(id); salvaMandati(f); disegnaAdmin(); });
}

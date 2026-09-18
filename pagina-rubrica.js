// MB21 · «Importa dalla rubrica» (cantiere 30, lavoro A; disegno delle tre schermate approvato da Ignazio il 18/09).
// Solo la parte che si vede: i calcoli stanno in rubrica.js (MB21Rubrica). Si apre dal «+» della Lista Nomi.
// 1 · scegli il file  →  2 · riepilogo prima di salvare  →  3 · fatto («Da catalogare»).
// Il file si legge sul telefono: niente parte verso il database finché non si tocca «Salva».
const RB = { esito: null, proprietario: null, telefono: null };   // telefono: 'iphone' | 'android'

// Il «+» della Lista: nuovo contatto a mano oppure tutta la rubrica
async function scegliAggiungi() {
  if (soloGuardo()) return;
  const v = await sceltaDa('Aggiungi nomi' + aNome(), [{ etichetta: '👤 Nuovo contatto', k: 'uno' }, { etichetta: '📒 Importa dalla rubrica del telefono', k: 'rubrica' }]);
  if (!v) return;
  if (v.k === 'uno') return apriModulo(null);
  // Ignazio 18/09: prima si chiede che telefono è, poi si danno solo le istruzioni di quello
  const t = await sceltaDa('Che telefono hai?', [{ etichetta: '🍎 iPhone', k: 'iphone' }, { etichetta: '🤖 Android (Samsung, Huawei, Xiaomi…)', k: 'android' }]);
  if (!t) return;
  RB.telefono = t.k;
  apriImportaRubrica();
}

function apriImportaRubrica() {
  RB.esito = null; RB.proprietario = visto().id;
  window.scrollTo(0, 0);
  app.innerHTML = `
    <button class="indietro" id="rb-indietro">‹ Lista Nomi</button>
    <h1>Importa dalla rubrica</h1>
    <div class="sotto">Porta in MB21 i nomi che hai nel telefono${esc(aNome())}. Chi è già nella Lista viene saltato.</div>
    <div class="riquadro rb-passi"><b>${RB.telefono === 'android' ? 'Come si fa da Android' : 'Come si fa da iPhone'}</b>
      ${RB.telefono === 'android' ? `<ol>
        <li>Apri <b>Contatti</b> (su alcuni telefoni è dentro <b>Telefono</b>)</li>
        <li>Cerca <b>Importa/Esporta</b> (a volte sotto «Gestisci contatti» o «Correggi e gestisci») e scegli <b>Esporta in un file</b> o <b>Esporta in archivio · memoria interna come vCard</b>. Non «Esporta in SIM», non «Condividi»</li>
        <li>Se chiede da dove, scegli solo <b>Telefono</b> e il tuo account: non WhatsApp, Telegram o altri</li>
        <li>Il file si chiama di solito <b>00001.vcf</b> o <b>contacts.vcf</b> e finisce nella memoria interna o in Download</li>
        <li>Torna qui e tocca il bottone qui sotto: scegli quel file</li></ol>` : `<ol>
        <li>Apri l'app <b>Contatti</b> e tocca <b>‹ Liste</b> in alto a sinistra</li>
        <li>Tieni premuto su <b>Tutti i contatti</b> e tocca <b>Esporta</b>, poi <b>Fine</b></li>
        <li>Tocca <b>Salva su File</b></li>
        <li>Torna qui e tocca il bottone qui sotto: scegli il file che hai appena salvato</li></ol>`}
      <button class="link" id="rb-altro">Ho ${RB.telefono === 'android' ? 'un iPhone' : 'un Android'}</button>
    </div>
    <div class="sotto">Le foto non vengono caricate. Niente si salva finché non lo dici tu.</div>
    <label class="primario rb-file">Scegli il file della rubrica<input type="file" id="rb-file" accept=".vcf,text/vcard,text/x-vcard,text/directory" hidden></label>
    <div id="rb-stato" class="sotto"></div>
    ${versione()}`;
  document.getElementById('rb-indietro').onclick = disegnaLista;
  document.getElementById('rb-altro').onclick = () => { RB.telefono = RB.telefono === 'android' ? 'iphone' : 'android'; apriImportaRubrica(); };
  document.getElementById('rb-file').onchange = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const stato = document.getElementById('rb-stato');
    stato.textContent = 'Leggo la rubrica…';
    try {
      const esito = MB21Rubrica.preparaImport(await file.text(), LS.righe, { utenteId: RB.proprietario });
      if (!esito.letti) { stato.textContent = 'In questo file non ho trovato contatti: controlla di aver scelto il file della rubrica (finisce con .vcf).'; return; }
      RB.esito = esito;
      disegnaRiepilogoRubrica();
    } catch (err) {
      console.error('[MB21] lettura rubrica', err);
      stato.textContent = 'Non riesco a leggere questo file. Riprova a esportare la rubrica.';
    }
  };
}

const RB_MOTIVI = {
  nome: 'Nome poco chiaro: scrivi quello vero',
  ditta: 'Sembra una ditta o un nome di lavoro: togli la spunta se non è una persona',
  omonimo: 'In Lista ci sono più schede con questo nome e un altro numero: metti la spunta solo se è un\'altra persona',
  'senza-telefono': 'Senza telefono',
  'senza-nome': 'Senza nome: scrivilo per farlo entrare',
};

function disegnaRiepilogoRubrica() {
  const e = RB.esito;
  window.scrollTo(0, 0);
  const n = x => x.toLocaleString('it-IT');
  // stesso nome, altro numero: i due numeri e la scelta a tre voci (la prima, già scelta, non perde niente)
  const rigaOmonimo = (s, i) => `<div class="rb-riga"><b>${esc(s.nome)}</b>
      <small style="margin-left:0">In Lista: ${esc(s.inLista.telefono)} · In rubrica: ${esc(s.telefono)}</small>
      <select class="rb-scelta" data-i="${i}">
        <option value="note" ${s.scelta === 'note' ? 'selected' : ''}>Stessa persona: tieni il numero della Lista, l'altro nelle note</option>
        <option value="rubrica" ${s.scelta === 'rubrica' ? 'selected' : ''}>Stessa persona: usa il numero della rubrica</option>
        <option value="nuova" ${s.scelta === 'nuova' ? 'selected' : ''}>È un'altra persona: crea una scheda nuova</option></select></div>`;
  const riga = (s, gruppo, i) => s.inLista ? rigaOmonimo(s, i) : `<div class="rb-riga">
      <label><input type="checkbox" data-g="${gruppo}" data-i="${i}" ${s.spunta ? 'checked' : ''}>
      <input type="text" class="rb-nome" data-g="${gruppo}" data-i="${i}" value="${esc(s.nome)}" maxlength="60" placeholder="Nome e cognome"></label>
      <small>${esc([s.telefono, ...s.motivi.map(m => RB_MOTIVI[m])].filter(Boolean).join(' · '))}</small></div>`;
  const blocco = (titolo, gruppo) => (e[gruppo].length ? `<h2>${titolo} · ${n(e[gruppo].length)}</h2><div class="riquadro rb-elenco">${e[gruppo].map((s, i) => riga(s, gruppo, i)).join('')}</div>` : '');
  app.innerHTML = `
    <button class="indietro" id="rb-indietro">‹ Scegli un altro file</button>
    <h1>${n(e.letti)} contatti letti</h1>
    <div class="riquadro rb-conti">
      <div><b>${n(e.presenti.length)}</b> già nella Lista · saltati</div>
      <div><b>${n(e.nuovi.length)}</b> nuovi · entrano tutti</div>
      ${e.numeri.length ? `<div><b>${n(e.numeri.length)}</b> già in Lista senza numero · aggiungo il numero alla scheda che c'è già</div>` : ''}
    </div>
    ${blocco('Da controllare', 'controllare')}
    ${blocco('Senza telefono o senza nome', 'incompleti')}
    <div class="rb-fondo"><button class="primario" id="rb-salva"></button></div>
    ${versione()}`;
  document.getElementById('rb-indietro').onclick = apriImportaRubrica;
  const bottone = document.getElementById('rb-salva');
  const daSalvare = () => [...e.nuovi, ...e.controllare, ...e.incompleti].filter(s => (s.inLista ? s.scelta === 'nuova' : s.spunta) && s.nome.trim());
  const daCambiare = () => e.controllare.filter(s => s.inLista && s.scelta !== 'nuova');
  const aggiorna = () => {
    const quanti = daSalvare().length + e.numeri.length;
    bottone.textContent = quanti ? `Salva ${n(quanti)} nomi` : daCambiare().length ? 'Salva le modifiche' : 'Niente da salvare';
    bottone.disabled = !quanti && !daCambiare().length;
  };
  app.querySelectorAll('.rb-scelta').forEach(sel => sel.onchange = () => { e.controllare[sel.dataset.i].scelta = sel.value; aggiorna(); });
  app.querySelectorAll('.rb-riga input[type=checkbox]').forEach(c => c.onchange = () => {
    const s = e[c.dataset.g][c.dataset.i];
    if (c.checked && !s.nome.trim()) { c.checked = false; return mostraToast('Prima scrivi il nome'); }
    s.spunta = c.checked; aggiorna();
  });
  app.querySelectorAll('.rb-nome').forEach(t => t.oninput = () => { e[t.dataset.g][t.dataset.i].nome = t.value; aggiorna(); });
  bottone.onclick = () => salvaRubrica(daSalvare(), daCambiare());
  aggiorna();
}

// A blocchi da 200: un file grosso non va in un colpo solo. Se un blocco non passa ci si ferma e si dice quanti sono entrati:
// rifare l'importazione non crea doppioni, chi è già entrato viene riconosciuto dal numero.
async function salvaRubrica(schede, omonimi) {
  const bottone = document.getElementById('rb-salva');
  bottone.disabled = true;
  const righe = schede.map(s => MB21Rubrica.rigaContatto(s, RB.proprietario));
  let salvati = 0, numeri = 0, errore = false;
  const cambiati = { note: 0, rubrica: 0 };
  for (let i = 0; i < righe.length && !errore; i += 200) {
    bottone.textContent = `Salvo… ${salvati.toLocaleString('it-IT')} di ${righe.length.toLocaleString('it-IT')}`;
    const { error } = await dbq('importa rubrica', supa.from('contatti').insert(righe.slice(i, i + 200)));
    if (error) errore = true; else salvati += Math.min(200, righe.length - i);
  }
  for (const s of errore ? [] : RB.esito.numeri) {
    const { error } = await dbq('numero dalla rubrica', supa.from('contatti')
      .update({ telefono: s.telefono, ...(s.compleanno ? { compleanno: MB21Rubrica.dataCompleanno(s.compleanno) } : {}), aggiornato_il: new Date().toISOString() }).eq('id', s.contattoId).is('telefono', null));
    if (error) { errore = true; break; }
    numeri++;
  }
  for (const s of errore ? [] : omonimi) {
    const c = MB21Rubrica.cambiaOmonimo(s);
    const { error } = await dbq('numero in più dalla rubrica', supa.from('contatti').update({ ...c.campi, aggiornato_il: new Date().toISOString() }).eq('id', c.id));
    if (error) { errore = true; break; }
    cambiati[s.scelta]++;
  }
  try { LS.righe = await leggiLista(); segnaApp(); } catch (err) {}
  disegnaFattoRubrica({ salvati, numeri, errore, cambiati, conAltri: schede.filter(s => s.altriNumeri.length).length });
}

function disegnaFattoRubrica({ salvati, numeri, errore, conAltri, cambiati = { note: 0, rubrica: 0 } }) {
  window.scrollTo(0, 0);
  const n = x => x.toLocaleString('it-IT');
  app.innerHTML = `
    <h1>${errore ? 'Importazione interrotta' : `${n(salvati)} nomi aggiunti`}</h1>
    ${errore ? `<div class="riquadro">Si è interrotta la connessione: sono entrati <b>${n(salvati)}</b> nomi. Rifai l'importazione con lo stesso file: chi è già entrato viene saltato.</div>` : ''}
    ${salvati ? '<div class="riquadro">Sono in <b>«Da catalogare»</b>, senza categoria e con la targhetta <span class="badge new">nuovo</span>: li sistemi un po\' alla volta.</div>' : ''}
    ${numeri ? `<div class="riquadro">Ho aggiunto il numero a <b>${n(numeri)}</b> schede che erano già in Lista senza telefono.</div>` : ''}
    ${cambiati.note ? `<div class="riquadro">Stesso nome con un altro numero: a <b>${n(cambiati.note)}</b> schede ho messo il numero della rubrica nelle note. Quando le chiami scopri qual è quello giusto.</div>` : ''}
    ${cambiati.rubrica ? `<div class="riquadro">A <b>${n(cambiati.rubrica)}</b> schede ho messo il numero della rubrica; quello di prima è nelle note.</div>` : ''}
    ${conAltri ? '<div class="riquadro">Chi aveva più numeri: ho tenuto il cellulare, gli altri sono nelle note della scheda.</div>' : ''}
    <div class="riquadro">Puoi rifarlo quando vuoi: chi è già in Lista viene saltato.</div>
    <button class="primario" id="rb-catalogare">Vai a «Da catalogare»</button>
    <button class="link" id="rb-lista">Torna alla Lista Nomi</button>
    ${versione()}`;
  document.getElementById('rb-catalogare').onclick = () => { ST.tab = 'oggi'; mostraTab(); };
  document.getElementById('rb-lista').onclick = disegnaLista;
}

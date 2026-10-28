// MB21 · pagina Lista Nomi: elenco e filtri, scheda contatto (Dati · Azioni · Coach Yes · Onboarding · Segni Vitali; le Vendite in pagina-vendite.js),
// Nuovo Contatto / Modifica. Spostata da index.html il 17/09 (pausa di sistemazione, richiesta di Ignazio), come admin.js
// e pagina-dashboard.js. Nessun cambiamento di funzionamento. La logica da provare con node resta in lista.js.
// Usa ciò che definisce index.html (supa, dbq, ST, PS, esc, mostraToast, visto, vediTutti, idVisti, mostraTab…);
// alcune sue definizioni servono anche alle altre pagine (LS, eAdmin, apriContattoDa, rigaPortato…).
// Si carica prima dello script della pagina: solo definizioni.
// ── LISTA NOMI (Fase 2) ──────────────────────────────────
// Copia della tab Lista Nomi di Glide (docs/MB21_v3_Lista_come_e.md) con le decisioni di Ignazio del 14/09.
// La logica pura sta in lista.js; qui lettura/scrittura e disegno.
const BLOCCO = 40;                                    // card disegnate per volta, scorrendo se ne aggiungono
const LS = { righe: [], targhe: {}, coppie: null, filtro: 'lista', ordine: 'az', esporta: null, testo: '', mostrate: BLOCCO, contatto: null, sezione: 'dati', utenteMb21: {}, usoApp: null };
const eAdmin = () => ST.utente && ST.utente.ruolo === 'Admin';

// La prima pagina da sola (chi ha pochi nomi finisce lì); se è piena, le altre cinque alla volta: l'Admin ha oltre 6.000 nomi (6 MB) e le richieste
// una dopo l'altra erano il tempo più lungo (Ignazio 02/10: «tutto molto lento nel registrare azioni e nell'aprire il nome»)
async function leggiLista() {
  const righe = await leggiListaPagine(eAdmin() ? await utentiLettura() : null);
  LS.letta = Date.now(); LS.chiave = chiaveLettura();   // ogni lettura intera rinfresca la copia in memoria (listaFresca), per la persona guardata
  return righe;
}
// Lista Nomi L8b (Ignazio 23/10): l'Admin legge solo i nomi che guarda, non più tutte le ~8.300 schede. Con una persona scelta nel Partner Select
// (o nessuna: sé stesso) solo i suoi; con «Tutti» i suoi più quelli delle persone che usano l'app con lui: gli utenti con accesso attivo e non
// eliminati, letti dai dati (mai scritti nel codice). Cambiando persona la copia si rilegge (`LS.chiave`). Una scheda di un altro partner aperta
// da Agenda, Report o Mappa si rilegge a parte, una riga sola (apriContattoDa → aggiornaRiga). Nessuna modifica al database: è il filtro della lettura.
const chiaveLettura = () => (eAdmin() ? (vediTutti() ? 'tutti' : visto().id) : '');
async function utentiLettura() {
  if (!vediTutti()) return [visto().id];
  const { data, error } = await dbq('chi usa l\'app', supa.from('utenti').select('id').eq('accesso_attivo', true).is('eliminato_il', null));
  if (error) throw error;
  return [...new Set([ST.utente.id, ...(data || []).map(u => u.id)])];
}
// Lista Nomi L8 (Ignazio 23/10): le colonne di `contatti_lista` che l'app usa, scritte una per una al posto di `*`: via l'icona della fase (fase_icona),
// che nessuna pagina usa. Valgono per la lettura a pagine (l'Admin) e per la riga riletta; i partner leggono con `lista_nomi()` (nel database, com'è).
// Nota 080: in fondo `account_cliente_dal`, dalla migrazione 20261024123812 (si applica PRIMA del codice: senza, questa lettura non riesce)
// Nota Pagine 091 (Ignazio 25/10): via `contatti_fatti` (si conta aprendo la scheda, `datiPersonaExtra`); in fondo `da_rubrica` (migrazione 20261025063200,
// anche lei PRIMA del codice). Le stesse colonne le dà `lista_nomi()` ai partner (migrazione 20261025063300).
const COLONNE_LISTA = 'id, user_id, nome, professione, fascia_eta, citta, telefono, categoria, area, brand, referral_di, note, rientro_il, glide_id, creato_il, aggiornato_il, in_coda_dal, categoria_prec, '
  + 'onb_amway, onb_ordine, onb_n21, onb_sogno, onb_starter_pack, onb_lista_start, onb_role_play, onb_contatti, onb_pack_ds, onb_bbs, onb_wes, onb_cep, onb_primo_pm, onb_primo_abo, '
  + 'partner, ultima_area, ultima_modalita, ultimo_tipo, ultima_fase, ultima_il, account_cliente_dal, da_rubrica';
async function leggiListaPagine(utenti) {   // `utenti` (L8b, solo per l'Admin): di chi leggere i nomi
  const pagina = k => { const q = supa.from('contatti_lista').select(COLONNE_LISTA); return dbq('lettura lista', (utenti ? q.in('user_id', utenti) : q).order('id').range(k * 1000, k * 1000 + 999)); };
  const prima = await pagina(0);
  if (prima.error) throw prima.error;
  const righe = [...prima.data];
  if (prima.data.length < 1000) return righe;
  for (let k = 1; ; k += 5) {
    const pagine = await Promise.all([0, 1, 2, 3, 4].map(i => pagina(k + i)));
    for (const p of pagine) { if (p.error) throw p.error; righe.push(...p.data); }
    if (pagine[4].data.length < 1000) return righe;
  }
}
// La Lista letta si tiene in memoria per 10 minuti (nota 015 / 013, registri di Supabase): toccare il tab Lista, tornare da una scheda o da Agenda
// non rilegge più tutto. Si rilegge intera se: sono passati 10 minuti, `LS.righe` è stata svuotata (nuovo contatto, import, collegamento: segnale già usato
// da tutta l'app), si esce dall'app o si tocca «Aggiorna i nomi». Dopo un'azione cambia solo la riga (`aggiornaRiga`).
const LISTA_FRESCA_MS = 10 * 60000;
const listaFresca = () => LS.righe.length > 0 && !!LS.letta && Date.now() - LS.letta < LISTA_FRESCA_MS && !!LS.usoApp && LS.chiave === chiaveLettura();   // L8b: della persona guardata
// Dopo un'azione cambia solo quella persona (fase, coda): si rilegge la sua riga e non tutta la Lista. Con la Lista non ancora letta non fa niente
// (la leggerà chi la apre); se qualcosa non va la si svuota, e si rilegge intera come prima.
async function aggiornaRiga(id) {
  if (!LS.righe.length || !id) return;
  const { data, error } = await dbq('riga della lista', supa.from('contatti_lista').select(COLONNE_LISTA).eq('id', id).maybeSingle());
  if (error) { LS.righe = []; return; }
  const i = LS.righe.findIndex(x => x.id === id);
  if (!data) { if (i >= 0) LS.righe.splice(i, 1); return; }
  if (LS.usoApp && INVITO_APP) data.app = LS.usoApp[id] || null;
  if (i >= 0) LS.righe[i] = data; else LS.righe.push(data);
}

// Targhette BBS · WES · CEP della Lista: biglietti per eventi non ancora passati, periodi CEP, coppie collegate.
// Se la lettura non riesce la Lista si apre lo stesso, senza targhette colorate.
// Lista Nomi L8 (Ignazio 23/10): prima i due eventi in corso (BBS e WES, poche righe), poi SOLO i biglietti di quei due eventi e i CEP non chiusi:
// prima si leggevano tutti i biglietti e tutti i CEP, oltre le 1000 righe che il database dà per richiesta, e all'Admin qualche targhetta mancava a caso.
async function leggiTarghe() {
  const oggi = MB21Coda.oggiRoma();
  const [bbs, wes] = await Promise.all([dbq('targhe BBS', supa.from('bbs').select('data')), dbq('targhe Wes', supa.from('wes').select('data'))]);
  if (bbs.error || wes.error) return {};
  const attivi = { bbs: MB21Lista.eventoAttivo(bbs.data), wes: MB21Lista.eventoAttivo(wes.data) };
  const eventi = [attivi.bbs, attivi.wes].filter(Boolean);
  const [big, cep, coppie] = await Promise.all([
    eventi.length ? dbq('targhe biglietti', supa.from('biglietti').select('contatto_id, tipo, evento, contatto, compagno, ospiti').in('evento', eventi).limit(10000)) : { data: [], error: null },
    dbq('targhe CEP', supa.from('cep').select('contatto_id, dal, uscito_il').or(`uscito_il.is.null,uscito_il.gte.${oggi}`).limit(5000)),
    dbq('targhe coppie', supa.from('contatti').select('id, compagno_id, compagno_nome')
      .or('compagno_id.not.is.null,compagno_nome.not.is.null').limit(5000)),
  ]);
  if (big.error || cep.error || coppie.error) return {};
  LS.coppie = {};
  for (const r of coppie.data) LS.coppie[r.id] = r;
  return MB21Lista.targhePerContatto(big.data, cep.data, coppie.data, oggi, attivi);
}
// Il CEP per codice (nota 069) sulle targhette appena lette: la stessa funzione dopo la lettura intera e dopo aver collegato una coppia (L8: prima,
// dopo la coppia, il CEP delle altre schede con lo stesso codice si spegneva fino alla lettura intera seguente)
async function conCepPerCodice(targhe) {
  const cd = await dbq('codici delle schede', supa.from('contatti').select('id, codice_amway').not('codice_amway', 'is', null).is('eliminato_il', null).limit(5000));
  return !cd.error && Array.isArray(cd.data) ? MB21Lista.cepPerCodice(targhe, cd.data) : targhe;
}

// Schede che sono utenti dell'app (`schede_utenti_app`: aggancio Amway o collegamento dell'Admin) con ultimo uso e nomi in lista:
// targhetta 📱 sulle card e nella scheda, parola «app» in Cerca (cantiere 20 lavoro 4). Se la lettura non riesce, niente targhette.
// Lista Nomi L3 (Ignazio 23/10): spento con lo stesso interruttore dell'invito (INVITO_APP), finché non c'è un team: niente lettura,
// niente targhetta sulle card e nella scheda. (L1b: «app» in Cerca non è più una parola nascosta.)
async function leggiUsoApp() {
  if (!INVITO_APP) { LS.usoApp = {}; return; }
  const { data, error } = await dbq('schede utenti app', supa.rpc('schede_utenti_app'));
  LS.usoApp = {};
  for (const u of error ? [] : data) LS.usoApp[u.contatto_id] = { ultimo_uso: u.ultimo_uso, nomi: u.nomi };
  segnaApp();
}
function segnaApp() { if (LS.usoApp && INVITO_APP) for (const r of LS.righe) r.app = LS.usoApp[r.id] || null; }

// Una lettura sola (Pagine 029 / Fondamenta 031, 07/10/2026: ogni richiesta costa ~2,6 KB di registro su Supabase): la funzione `lista_nomi()`
// (migrazione 20261007190000) restituisce lista, targhette e utenti dell'app in UNA richiesta al posto di 7 (15 per l'Admin). Gira con i permessi
// di chi chiama: gli stessi dati delle letture separate. Se la funzione manca (prima del rilascio) o fallisce, si rilegge come prima.
// L'Admin NO (Regia, 07/10 sera: «lentissima»): le regole di accesso gli danno tutte le 8.300 schede anche se guarda solo la sua lista (il filtro è
// nell'app), e una risposta unica da 8 MB costa 2,3 s sul database contro ~1 s delle pagine da 1.000 lette 5 per volta in parallelo: per lui restano
// le letture di prima. Per un partner (fino a ~3.000 nomi, 0,2 s) la funzione è più veloce e fa una richiesta sola.
async function leggiTuttoLista() {
  if (eAdmin()) return Promise.all([leggiLista(), leggiTarghe(), leggiUsoApp()]);
  const { data, error } = await dbq('lista in una lettura', supa.rpc('lista_nomi'));
  if (error || !data || !Array.isArray(data.righe)) return Promise.all([leggiLista(), leggiTarghe(), leggiUsoApp()]);
  const oggi = MB21Coda.oggiRoma();
  LS.coppie = {};
  for (const r of data.coppie) LS.coppie[r.id] = r;
  const targhe = MB21Lista.targhePerContatto(data.biglietti, data.cep, data.coppie, oggi, { bbs: MB21Lista.eventoAttivo(data.bbs), wes: MB21Lista.eventoAttivo(data.wes) });
  LS.usoApp = {};
  for (const u of data.uso_app) LS.usoApp[u.contatto_id] = { ultimo_uso: u.ultimo_uso, nomi: u.nomi };
  LS.letta = Date.now();
  return [data.righe, targhe];
}

// Lista Nomi L7 (Ignazio 23/10): una funzione sola per leggere TUTTA la Lista — nomi, targhette BBS · WES · CEP, coppie, codici — usata dalla Lista
// e da `apriContattoDa` (una scheda aperta da Agenda, Dashboard, Report o Mappa prima della Lista): prima lì si leggevano solo i nomi, e per 10 minuti
// le targhette restavano spente e «Coppia con …» mancava. Per un partner è anche una richiesta in meno (`lista_nomi()` invece di pagine + utenti dell'app).
async function leggiTuttaLaLista() {
  [LS.righe, LS.targhe] = await leggiTuttoLista(); LS.letta = Date.now(); LS.chiave = chiaveLettura();
  LS.targhe = await conCepPerCodice(LS.targhe);   // nota 069: il CEP va per codice (una lettura leggera, solo i codici)
  segnaApp();
}

// I nomi della Lista per i fogli di scelta e le ricerche (Lista Nomi L9): la copia già letta; se non c'è ancora, la si legge una volta (leggiTuttaLaLista)
async function nomiDellaLista() {
  if (!LS.righe.length) await leggiTuttaLaLista();
  return LS.righe;
}

// ── Un nome nuovo, da qualsiasi strada (Lista Nomi L9, Ignazio 23/10: «quattro strade per aggiungere un nome») ──
// Il «+» della Lista, «Scegli dalla tua lista» (Agenda) e la Cerchia del Benvenuto salvano con la stessa funzione: l'avviso dei doppioni
// «Salvo lo stesso?» (stesso nome o stesso numero, archiviati compresi), il salvataggio, la riga nuova nella copia della Lista (compare subito).
// La rubrica salva a blocchi e tiene il suo controllo sui numeri (preparaImport), sulla stessa Lista.
const testoDoppioni = (doppi, utenteId) => `Attenzione: ${utenteId === ST.utente.id ? 'tra i tuoi nomi' : 'tra i nomi di questo partner'} c'è già ${doppi.slice(0, 3).map(d => `${d.nome}${d.telefono ? ' · ' + d.telefono : ''}`).join(', ')}.`;
// i nomi uguali: dalla Lista già letta; se non c'è (la Cerchia, all'inizio), due letture piccole con la stessa regola
async function doppioniDi({ nome, telefono, utenteId }) {
  if (LS.righe.length) return MB21Lista.trovaDoppioni(LS.righe, { nome, telefono, utenteId });
  const cerche = [];
  if (telefono) cerche.push(supa.from('contatti').select('id, user_id, nome, telefono').eq('user_id', utenteId).is('eliminato_il', null).eq('telefono', telefono).limit(5));
  if (!/[%_*\\,()]/.test(nome)) cerche.push(supa.from('contatti').select('id, user_id, nome, telefono').eq('user_id', utenteId).is('eliminato_il', null).ilike('nome', nome).limit(5));
  const trovati = (await Promise.all(cerche.map(q => dbq('doppioni', q)))).flatMap(r => (r.error ? [] : r.data || []));
  return MB21Lista.trovaDoppioni(trovati, { nome, telefono, utenteId });
}
// → { riga } (salvato: id, user_id, nome, telefono, categoria) · { annullato: true } · { errore }
async function salvaNomeNuovo(riga) {
  const doppi = await doppioniDi({ nome: riga.nome, telefono: riga.telefono, utenteId: riga.user_id });
  if (doppi.length && !await chiediConferma('Salvo lo stesso?', testoDoppioni(doppi, riga.user_id), 'Salva lo stesso')) return { annullato: true };
  const { data, error } = await dbq('nuovo contatto', supa.from('contatti').insert(riga).select('id, user_id, nome, telefono, categoria').single());
  if (error || !data) return { errore: error || true };
  await aggiornaRiga(data.id);
  return { riga: data };
}

async function apriLista() {
  LS.contatto = null;
  app.innerHTML = `<h1>Lista Nomi</h1><div class="vuoto">Carico i nomi…</div>`;
  try {
    if (!listaFresca()) await leggiTuttaLaLista();
    segnaApp();
    await caricaCatalogo();   // «Da catalogare» del partner visto (nota 019): se c'è già, non rilegge niente
  } catch (e) {
    // L7 (Ignazio 23/10): sotto l'avviso il bottone «Riprova», che rifà la lettura (prima si toccava di nuovo il tab)
    app.innerHTML = `<h1>Lista Nomi</h1><div class="avviso">Non riesco a caricare i nomi. Controlla la connessione e riprova.</div>
      <button class="primario" id="ls-riprova">Riprova</button>${versione()}`;
    document.getElementById('ls-riprova').onclick = apriLista;
    return;
  }
  if (LS.apriContatto) {   // da un avviso «…?apri=lista&contatto=<id>&sezione=sharing» (cantiere 40): la scheda già aperta
    const id = LS.apriContatto; LS.apriContatto = null;
    if (LS.righe.find(x => x.id === id)) return apriScheda(id);
  }
  disegnaLista();
}

// Nomi di chi è scelto nel Partner Select (un partner o l'elenco di «Tutti»)
const utentiLista = () => (vediTutti() ? idVisti() : visto().id);

function coloreCategoria(c) { return COLORI[c] || 'var(--unlinked)'; }
// Targhetta NEW: contatto creato dentro l'app negli ultimi 30 giorni (richiesta di Ignazio 16/09)
function nuovoBadge(r) { return MB21Lista.eNuovo(r, MB21Coda.oggiRoma()) ? ' <span class="badge new">nuovo</span>' : ''; }

// I 4 bottoni per sentire il contatto senza spostarsi (Ignazio 18/09): gli stessi ovunque — scheda, coda, conferme, riordini, Agenda.
// Accesi solo con un numero che inizia per «+» (i numeri dubbi dell'import no), altrimenti spenti: nelle card il numero non si scrive più.
// Disegni dei quattro bottoni (cantiere 30, proposta B scelta da Ignazio il 18/09): WhatsApp e Telegram sono i loghi ufficiali
// (Simple Icons, CC0), cornetta e fumetto vengono da Tabler Icons (MIT). Scritti qui dentro: niente siti esterni, funziona offline.
const ICONE_CONTATTA = {
  call: '<svg class="ic-call" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"/></svg>',
  sms: '<svg class="ic-sms" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20l1.3 -3.9c-2.324 -3.437 -1.426 -7.872 2.1 -10.374c3.526 -2.501 8.59 -2.296 11.845 .48c3.255 2.777 3.695 7.266 1.029 10.501c-2.666 3.235 -7.615 4.215 -11.574 2.293l-4.7 1"/></svg>',
  whatsapp: '<svg class="ic-wa" viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
  telegram: '<svg class="ic-tg" viewBox="0 0 24 24" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
};

// Dal cantiere 34 i bottoni per contattare usano le icone a tratto, ognuna con il suo colore (quella di Telegram è provvisoria, di Code: da chiedere a Design)
const ICONE_TRATTO = { call: 'contatto', sms: 'messaggio', whatsapp: 'whatsapp', telegram: 'telegram' };
// Il numero da chiamare, una regola sola per i 4 tasti e la cornetta della card (Lista Nomi L3): solo un numero che inizia per «+», senza spazi; altrimenti null
const numeroDaChiamare = telefono => (telefono && telefono.startsWith('+') ? telefono.replace(/[^0-9+]/g, '') : null);
// `soloScrivere` (L10, i compleanni dell'Agenda): solo SMS, WhatsApp e Telegram, senza la cornetta
function contattaHtml(telefono, soloScrivere) {
  const tel = numeroDaChiamare(telefono);
  const link = (href, icona, testo) => `<a href="${esc(href)}" class="ct-${icona} ${tel ? '' : 'spento'}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>${ICONE_TRATTO[icona] ? ic(ICONE_TRATTO[icona]) : ICONE_CONTATTA[icona]}<span>${testo}</span></a>`;
  return `<div class="contatta${soloScrivere ? ' tre' : ''}">${soloScrivere ? '' : link('tel:' + (tel || ''), 'call', 'Chiama')}${link('sms:' + (tel || ''), 'sms', 'SMS')}${link('https://wa.me/' + (tel || '').slice(1), 'whatsapp', 'WhatsApp')}${link('https://t.me/' + (tel || ''), 'telegram', 'Telegram')}</div>`;
}

function disegnaLista() {
  if (LS.filtro === 'all') LS.filtro = 'lista';   // dal cantiere 15 «All» = Partner Select «Tutti»
  const f = MB21Lista.FILTRI[LS.filtro];
  const conti = MB21Lista.contaFiltri(LS.righe, { utenteId: utentiLista(), admin: eAdmin() });
  const quanti = (k) => `<span>${conti[k].toLocaleString('it-IT')}</span>`;
  const chip = (k) => `<button data-filtro="${k}" class="${LS.filtro === k ? 'scelto' : ''}">${MB21Lista.FILTRI[k].etichetta} ${quanti(k)}</button>`;
  const altriScelto = f.altri ? `Altri: ${f.etichetta} ${quanti(LS.filtro)} ▾` : 'Altri ▾';
  // cantiere 30: parte alta compatta e ferma in alto (scorrono solo i nomi); «+» tondo come in Agenda
  // v5 (nota 095, Regia 26/10): la parte alta ferma diventa la testata verde della Lista Nomi, con dentro gli stessi pezzi (stessi id): il conto dei nomi,
  // il titolo, il chip del Partner Select al posto della fascia, il feedback, «+», la ricerca e i filtri. È una voce della barra: niente «‹ Oggi»
  const v5 = typeof OGGI_V5 !== 'undefined' && OGGI_V5;
  app.innerHTML = `
    <div class="ls-testa${v5 ? ' v5-testa l5' : ''}"${v5 ? ' style="--zc:var(--z-lista)"' : ''}>
      ${v5 ? `<div class="v5-su"><span></span>${feedbackV5()}</div>${rigaSopraV5(`${esc(conti.lista.toLocaleString('it-IT'))} NOMI`, `${chipPartnerSelect()}<button class="v5-piu" id="nuovo" aria-label="Nuovo contatto">${ic('piu')}</button>`)}<div class="v5-titolo"><div><h1>Lista Nomi</h1></div></div>`
        : `<div class="ag-testa"><h1>Lista Nomi</h1>
        <button class="ag-piu" id="nuovo" aria-label="Nuovo contatto">+</button></div>
      ${partnerSelect()}`}
      <div class="cerca">
        <input id="cerca" type="search" placeholder="Nome, numero, professione o località" value="${esc(LS.testo)}" autocomplete="off">
        <button id="svuota" ${LS.testo ? '' : 'hidden'} aria-label="Svuota">${ic('chiudi')}</button>
      </div>
      <div class="chips">
        ${chip('lista')}${chip('prospect')}${chip('partner')}${chip('clienti')}
        <button id="altri" class="${f.altri ? 'scelto' : ''}">${altriScelto}</button>
      </div>
    </div>
    ${catalogoRigaHtml()}
    <div id="elenco"></div>
    <div id="fondo"></div>
    ${versione()}`;
  const rigaCat = document.getElementById('lista-catalogo');
  if (rigaCat) rigaCat.onclick = () => { ST.vistaCatalogo = true; window.scrollTo(0, 0); disegnaCatalogo(); };   // «Da catalogare» (ex Dashboard, 01/10)
  collegaPartnerSelect();
  const fb = document.getElementById('o5-feedback'); if (fb) fb.onclick = () => foglioSegnala();   // v5: il feedback nella testata
  const nuovo = document.getElementById('nuovo');
  if (nuovo) nuovo.onclick = scegliAggiungi;   // nuovo contatto o tutta la rubrica (pagina-rubrica.js)
  app.querySelectorAll('.chips button[data-filtro]').forEach(b => b.onclick = () => { LS.filtro = b.dataset.filtro; LS.mostrate = BLOCCO; disegnaLista(); });
  document.getElementById('altri').onclick = scegliAltri;
  const cerca = document.getElementById('cerca');
  cerca.oninput = () => {
    LS.testo = cerca.value; LS.mostrate = BLOCCO;
    document.getElementById('svuota').hidden = !LS.testo;
    disegnaElenco();
  };
  document.getElementById('svuota').onclick = () => { LS.testo = ''; disegnaLista(); };
  disegnaElenco();
}

function disegnaElenco() {
  const trovati = MB21Lista.filtraContatti(LS.righe, { filtro: LS.filtro, testo: LS.testo, utenteId: utentiLista(), admin: eAdmin(), oggi: MB21Coda.oggiRoma(), ordine: LS.ordine });
  const elenco = document.getElementById('elenco');
  if (!elenco) return;
  // Lista Nomi L2 (Ignazio 23/10): niente più lettere A-Z (per un nome c'è Cerca); il file per l'altro programma, «Scarica nomi e numeri», solo per l'Admin
  // L7 (Ignazio 23/10): «Aggiorna i nomi» in alto, accanto al conto (prima in fondo all'elenco: con tanti nomi non ci si arrivava)
  const aggiorna = '<button class="link ls-aggiorna" id="ls-aggiorna">Aggiorna i nomi</button>';
  const ordina = `<div class="ls-ordina"><span>${trovati.length.toLocaleString('it-IT')} ${trovati.length === 1 ? 'nome' : 'nomi'} · ${aggiorna}</span>
    <span>${LS.esporta || !eAdmin() ? '' : `<button id="esporta">${ic('file')} Scarica nomi e numeri</button> · `}<button id="ordina">Ordina: ${MB21Lista.ORDINI[LS.ordine]} ▾</button></span></div>`;
  elenco.innerHTML = trovati.length
    ? ordina + trovati.slice(0, LS.mostrate).map(cardNome).join('')
    : `<div class="vuoto">${LS.testo ? 'Nessun nome trovato.' : 'Nessun nome qui.'}${LS.testo.trim() && !soloGuardo() ? `<button class="link ls-aggiungi-cercato" id="aggiungi-cercato">${ic('piu')} Aggiungi «${esc(LS.testo.trim())}» alla Lista</button>` : ''}${aggiorna}</div>`;
  // «Aggiorna i nomi»: rilegge tutta la Lista (e «Da catalogare», L5)
  document.getElementById('ls-aggiorna').onclick = () => { LS.righe = []; LS.letta = 0; ST.catalogo = null; apriLista(); };
  // Lista Nomi L1 (Ignazio 23/10): Cerca senza risultati → un tocco apre il modulo del nuovo contatto con il nome già scritto
  const aggiungiCercato = document.getElementById('aggiungi-cercato');
  if (aggiungiCercato) aggiungiCercato.onclick = () => apriModulo(null, { nome: LS.testo.trim() });
  elenco.querySelectorAll('.cn').forEach(c => {
    c.onclick = e => {
      if (LS.esporta) { if (!e.target.closest('.menu')) { spuntaEsporta(c.dataset.id); c.classList.toggle('spuntata', sceltoEsporta(c.dataset.id)); barraEsporta(trovati); } return; }
      if (!e.target.closest('a, .menu, .chiama')) apriScheda(c.dataset.id);
    };
  });
  const esportaB = document.getElementById('esporta');
  if (esportaB) esportaB.onclick = () => { LS.esporta = { modo: 'tutti', eccezioni: new Set() }; disegnaElenco(); };
  barraEsporta(trovati);
  elenco.querySelectorAll('.cn .menu').forEach(b => b.onclick = () => menuCard(b.dataset.id));
  elenco.querySelectorAll('.cn button.chiama').forEach(b => b.onclick = () => diPerche('telefono'));   // L3: la cornetta spenta dice perché
  const ordinaB = document.getElementById('ordina');
  if (ordinaB) ordinaB.onclick = async () => {
    const v = await sceltaDa('Ordina i nomi', Object.keys(MB21Lista.ORDINI).map(k => ({ etichetta: (LS.ordine === k ? '✓ ' : '') + MB21Lista.ORDINI[k], k })));
    if (!v) return;
    LS.ordine = v.k;
    LS.mostrate = BLOCCO; window.scrollTo(0, 0); disegnaElenco();
  };
  // caricamento a blocchi: quando il fondo entra nello schermo, altre card
  const fondo = document.getElementById('fondo');
  if (LS.osservatore) LS.osservatore.disconnect();
  if (trovati.length > LS.mostrate) {
    LS.osservatore = new IntersectionObserver(voci => {
      if (voci.some(v => v.isIntersecting)) { LS.mostrate += BLOCCO; disegnaElenco(); }
    }, { rootMargin: '400px' });
    LS.osservatore.observe(fondo);
  }
}

// ── Esporta (MB Project → Lista Nomi, Ignazio 25/09): un file Excel nel modello dell'altro programma con i nomi che si vedono
// (pillola, Cerca, ordine) MA scelti uno a uno: partono tutti spuntati, si toglie chi non serve; «Nessuno» per partire da zero.
// Lista Nomi L2 (Ignazio 23/10): si chiama «Scarica nomi e numeri» e lo vede solo l'Admin; nella barra una riga dice cosa fa il tocco;
// la cornetta della card è spenta (il tocco spunta, non chiama); dopo il download lo stesso foglio «Il file è pronto» di «Scarica la mia lista».
// LS.esporta = { modo: 'tutti' | 'nessuno', eccezioni: Set di id } → scelto = (modo tutti) diverso da (è un'eccezione)
const sceltoEsporta = id => !!LS.esporta && ((LS.esporta.modo === 'tutti') !== LS.esporta.eccezioni.has(id));
function spuntaEsporta(id) { const e = LS.esporta.eccezioni; if (e.has(id)) e.delete(id); else e.add(id); }

function barraEsporta(trovati) {
  let barra = document.getElementById('ls-esporta');
  if (!LS.esporta) { if (barra) barra.remove(); return; }
  const scelti = trovati.filter(r => sceltoEsporta(r.id));
  if (!barra) { barra = document.createElement('div'); barra.id = 'ls-esporta'; barra.className = 'ls-esporta'; document.getElementById('elenco').after(barra); }
  const n = scelti.length.toLocaleString('it-IT');
  barra.innerHTML = `<div class="ls-esporta-aiuto">${LS.esporta.modo === 'tutti' ? 'Tocca un nome per toglierlo' : 'Tocca un nome per sceglierlo'}</div><div class="ls-esporta-riga"><button class="link" id="esp-tutti">Tutti</button><button class="link" id="esp-nessuno">Nessuno</button><button class="link" id="esp-annulla">Annulla</button></div>
    <button class="primario" id="esp-scarica" ${scelti.length ? '' : 'disabled'}>${scelti.length ? `Scarica ${n} ${scelti.length === 1 ? 'nome' : 'nomi'}` : 'Scegli almeno un nome'}</button>`;
  barra.querySelector('#esp-tutti').onclick = () => { LS.esporta = { modo: 'tutti', eccezioni: new Set() }; disegnaElenco(); };
  barra.querySelector('#esp-nessuno').onclick = () => { LS.esporta = { modo: 'nessuno', eccezioni: new Set() }; disegnaElenco(); };
  barra.querySelector('#esp-annulla').onclick = () => { LS.esporta = null; disegnaElenco(); };
  barra.querySelector('#esp-scarica').onclick = () => scaricaEsporta(scelti);
}

// Il file si prepara sul telefono e si scarica con la funzione di «Scarica la mia lista» (scarica-lista.js), poi il foglio «Il file è pronto»
function scaricaEsporta(scelti) {
  const etichetta = [MB21Lista.FILTRI[LS.filtro].etichetta, LS.testo.trim()].filter(Boolean).join(' ');
  const nome = MB21Esporta.nomeFile(etichetta, MB21Coda.oggiRoma());
  scaricaFile(MB21Esporta.xlsxBytes(MB21Esporta.righeEsporta(scelti)), nome);
  foglioFilePronto(nome, `${scelti.length.toLocaleString('it-IT')} ${scelti.length === 1 ? 'nome' : 'nomi'}.`);
  LS.esporta = null; disegnaElenco();
}

// BBS · WES · CEP accanto al nome nella testata della scheda (Ignazio 18/09: al Cliente in alto servono i Brand, non i Segni Vitali):
// per i Partner sempre (grigie se spente), per gli altri solo se almeno una è accesa.
const segniInAlto = (categoria, t) => categoria === 'Partner' || !!(t && (t.bbs || t.wes || t.cep));

// Targhette sulla card: 📱 se ha l'app; BBS · WES · CEP solo quelle accese, per tutte le categorie (nota Pagine 070, Ignazio 24/10: le grigie
// sulle card spariscono; cambia la regola del 18/09 «una sola regola per card e testata». In testata e in Mappa restano tutte e tre, e per l'Admin si toccano)
function targheCard(r) {
  const t = LS.targhe && LS.targhe[r.id];
  const segni = targheHtml(t, null, { accese: true }), acc = targaAccountHtml(r.categoria, r.account_cliente_dal);
  return r.app || segni || acc ? `<span class="sv-targhe">${targaAppHtml(r.app)}${acc}${segni}</span>` : '';
}
// Nota Pagine 080, punto 2 (Ignazio 24/10, «C»): la targhetta «Account» di un Cliente con account, uguale sulla card della Lista (scheda chiusa, dal dato
// della Lista) e nella testata della scheda aperta (dal dato letto con accountDi, se c'è; se no da quello della Lista)
const targaAccountHtml = (categoria, dal) => (categoria === 'Cliente' && dal ? '<span class="sv-targa account">Account</span>' : '');
const accountDellaScheda = c => (LS.account && LS.account.id === c.id ? LS.account.dal : c.account_cliente_dal);

// «Coppia con …» sulla card: nome della scheda collegata (se visibile) o scritto a mano
function coppiaCard(r) {
  const cp = LS.coppie && LS.coppie[r.id];
  if (!cp) return '';
  const altra = cp.compagno_id && LS.righe.find(x => x.id === cp.compagno_id);
  const nome = altra ? altra.nome : cp.compagno_nome;
  return nome ? `<div class="prof">Coppia con ${esc(nome)}</div>` : '';
}

// Nota Pagine 036 (Ignazio 07/10): con «Tutti» accanto al nome, tra parentesi quadre, di chi è il nome («Mario Rossi [Carolina]»)
function diChiCard(r) {
  if (!vediTutti()) return '';
  const p = PS.persone.find(x => x.id === r.user_id);
  const chi = p ? String(p.nome || nomeDi(p)).trim() : '';
  return chi ? ` <span class="cn-dichi">[${esc(chi)}]</span>` : '';
}

// Card che parla (cantiere 30, lavoro 4; disegno approvato da Ignazio il 18/09): nome · frase («Fermo da 10 mesi · telefonata»,
// 📅 se è in programma) · professione · cornetta per chiamare. Gli altri bottoni stanno nei tre puntini (`menuCard`).
// Lista Nomi L1 (Ignazio 23/10): sulla card solo la professione; l'area si vede aprendo la scheda.
function cardNome(r) {
  const frase = MB21Lista.fraseCard(r, MB21Coda.oggiRoma());
  const sotto = r.professione || '';
  const tel = LS.esporta ? null : numeroDaChiamare(r.telefono);   // stessa regola dei 4 tasti (L3); in Esporta spenta (L2)
  // La prima riga è tutta del nome (Ignazio 19/09: con «nuovo» e le targhette accanto «si vede solo il nome e non si capisce»):
  // «nuovo» e le targhette hanno una riga loro, sotto la professione (scelta «B» tra due prove, tools/design/confronto_card.html):
  // nome, frase e professione si leggono per intero; la card di chi ha le targhette è un po' più alta.
  // «archiviato» (nota 012): la card si riconosce anche quando esce in fondo a una ricerca dalla Lista; dal menu «…» c'è «Ripristina»
  const segni = (r.categoria === 'Archiviato' ? '<span class="badge arch">archiviato</span>' : '') + nuovoBadge(r) + targheCard(r);
  return `
    <div class="cn ${classeCat(r.categoria)} ${LS.esporta && sceltoEsporta(r.id) ? 'spuntata' : ''}" data-id="${esc(r.id)}">
      ${LS.esporta ? `<span class="cn-spunta" aria-hidden="true">${ic('fatto')}</span>` : `<span class="cn-pastiglia">${esc(iniziali(r.nome))}</span>`}
      <div class="dentro">
        <div class="nome">${esc(r.nome)}${diChiCard(r)}</div>
        <div class="frase">${frase.futuro ? ic('agenda') + ' ' : ''}${esc(frase.testo)}</div>
        ${sotto ? `<div class="prof">${esc(sotto)}</div>` : ''}
        ${segni ? `<div class="cn-segni">${segni}</div>` : ''}
        ${coppiaCard(r)}
      </div>
      ${tel || LS.esporta ? `<a class="chiama ${tel ? '' : 'spento'}" href="tel:${esc(tel || '')}" aria-label="Chiama">${ic('contatto')}</a>`
        : `<button class="chiama spento" aria-label="Chiama: perché è spenta">${ic('contatto')}</button>`}
      <button class="menu" data-id="${esc(r.id)}" aria-label="Menu">${ic('puntini')}</button>
    </div>`;
}

// Foglio con un elenco di voci; restituisce la voce scelta (o null)
// `sopra`: un pezzo di pagina da mostrare sopra le voci (es. i bottoni per contattare); toccare un suo link chiude il foglio
// Con tante voci il foglio scorre (`alto`, 25/09: i titoli di un progetto in «Sposta sotto un altro titolo» di MB Plan)
// voci: { etichetta, icona?, tono?, pericolo? } e, per gli elenchi ad albero (Partner Select, «Gli ultimi
// 12 mesi»), `rientro` (livelli sotto la radice: sposta la voce a destra con ↳) e `nota` (una riga piccola sotto il nome)
// Scheda contatto S7 (Ignazio 22/10): le scelte compaiono AL CENTRO della pagina, in tutti i punti (una funzione sola: «+ Nuova azione», menu della
// card, «Non ora», rubrica…); se sono tante scorrono dentro il foglio. Dalla nota 088 al centro ci sono tutti i fogli, con la regola di .velo.
function sceltaDa(titolo, voci, sopra) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio alto"><h3>${esc(titolo)}</h3>${sopra || ''}<div class="altri-voci">
      ${voci.map((v, i) => `<button data-i="${i}" class="${v.pericolo ? 'pericolo' : ''} ${v.tono ? 'tono-' + v.tono : ''} ${v.rientro ? 'rientrata' : ''}" ${v.rientro ? `style="--rientro:${Math.min(v.rientro, 5)}"` : ''}>${v.icona ? ic(v.icona) : ''}${v.rientro ? '<i class="ramo">↳</i>' : ''}${v.nota && v.tono ? `<span class="voce-nota">${esc(v.etichetta)}<small class="nota-ramo">${esc(v.nota)}</small></span>` : esc(v.etichetta) + (v.nota ? `<small class="nota-ramo">${esc(v.nota)}</small>` : '')}</button>`).join('')}
      </div><button class="link" id="scelta-no">Annulla</button></div>`;
    document.body.appendChild(velo);
    const chiudi = v => { velo.remove(); risolvi(v); };
    velo.onclick = e => { if (e.target === velo) chiudi(null); };
    velo.querySelector('#scelta-no').onclick = () => chiudi(null);
    velo.querySelectorAll('.foglio > .contatta a').forEach(a => a.addEventListener('click', () => chiudi(null)));
    velo.querySelectorAll('button[data-i]').forEach(b => b.onclick = () => chiudi(voci[Number(b.dataset.i)]));
  });
}

async function scegliAltri() {
  const conti = MB21Lista.contaFiltri(LS.righe, { utenteId: utentiLista(), admin: eAdmin() });
  // Lista Nomi L1 (Ignazio 23/10): sotto «Non collegato» la riga piccola che spiega, come nel modulo.
  // L5: via «Senza categoria»: per i nomi senza categoria la strada è una sola, «Da catalogare» in cima alla Lista
  const v = await sceltaDa('Altri', ['ex', 'unlinked', 'archiviati'].map(k => ({ etichetta: `${MB21Lista.FILTRI[k].etichetta} · ${conti[k].toLocaleString('it-IT')}`, k,
    nota: k === 'unlinked' ? MB21Lista.SPIEGA_CATEGORIA.Unlinked.toLowerCase() : null })));
  if (!v) return;
  LS.filtro = v.k; LS.mostrate = BLOCCO; disegnaLista();
}

// Tre puntini della card: in alto i 4 bottoni per contattare (Ignazio 18/09: sulla card resta solo la cornetta), sotto le azioni
async function menuCard(id) {
  const r = LS.righe.find(x => x.id === id);
  if (!r) return;
  // in Esporta il tocco sulla card spunta e non apre: la scheda si apre da qui (Ignazio 27/09), e al ritorno si ritrova tutto com'era
  const apri = LS.esporta ? [{ etichetta: 'Apri la scheda', icona: 'persona', tono: 'blu', fai: () => apriScheda(r.id) }] : [];
  // Lista Nomi L3 (Ignazio 23/10): con «Tutti» una riga fissa nel foglio al posto dell'avviso a ogni apertura (va via con il Partner Select)
  const guardo = soloLettura();
  const voci = [...apri, ...(guardo ? [] : [{ etichetta: 'Modifica', icona: 'modifica', tono: 'blu', fai: () => apriModulo(r) }, ...comandiContatto(r)])];
  const v = await sceltaDa(r.nome, voci, contattaHtml(r.telefono) + (guardo ? `<p class="scelta-nota">${esc(MB21Perche.perche('tutti'))}</p>` : ''));
  if (v) v.fai();
}

async function ricaricaERidisegna() {
  if (LS.contatto) await aggiornaRiga(LS.contatto.id);   // la scheda aperta: basta la sua riga
  if (!LS.righe.length) { try { LS.righe = await leggiLista(); } catch (e) { return mostraToast('Non riesco a ricaricare i nomi.'); } }
  segnaApp();
  if (LS.contatto) {
    LS.contatto = LS.righe.find(x => x.id === LS.contatto.id) || null;
    return LS.contatto ? disegnaScheda() : disegnaLista();
  }
  disegnaLista();
}

// «Archivia» ed «Elimina» sono due cose diverse e stanno tutte e due ovunque (cantiere 33, decisione 3): nei tre puntini
// della card; dentro la scheda «Elimina» è in fondo a Modifica (e «Archivia» è la categoria Archiviato del modulo). Archivia = messo da parte, domani si ripristina;
// Elimina = via dalla lista (archivio compreso), il lavoro fatto resta nei numeri. Lista Nomi L1 (Ignazio 23/10): sotto le due voci una riga piccola con la differenza.
function comandiContatto(r) {
  return [r.categoria === 'Archiviato' ? { etichetta: 'Ripristina', icona: 'aggiorna', tono: 'verde', fai: () => ripristina(r) }
    : { etichetta: 'Archivia', nota: 'lo metti da parte, si ripristina', icona: 'archiviato', tono: 'ambra', fai: () => archivia(r) },
    { etichetta: 'Elimina', nota: 'sparisce dalla lista', icona: 'elimina', tono: 'rosso', pericolo: true, fai: () => elimina(r) }];
}

async function archivia(r) {
  const { error } = await dbq('archivia', supa.rpc('archivia_contatto', { p_contatto: r.id }));
  if (error) return mostraToast('Non archiviato: riprova.');
  // dal 04/10 (nota 046) «Archivia» toglie dall'Agenda le azioni ancora da fare (con una copia): si dice, e «Annulla» rimette tutto com'era
  mostraToast(`${r.nome} spostato in Archiviati · le azioni da fare escono dall'Agenda`, () => ripristina(r));
  if (LS.contatto) LS.contatto = null;
  await aggiornaRiga(r.id);   // nota 068: la riga in memoria prende subito la categoria nuova
  ricaricaERidisegna();
}

async function ripristina(r) {
  const { error } = await dbq('ripristina', supa.rpc('ripristina_contatto', { p_contatto: r.id }));
  if (error) return mostraToast('Non ripristinato: riprova.');
  mostraToast(`${r.nome} ripristinato`);
  await aggiornaRiga(r.id);   // nota 068
  ricaricaERidisegna();
}

// Elimina (cantiere 33): la scheda non si cancella, prende il segno `eliminato_il` (`elimina_contatto`): sparisce da lista,
// archivio, ricerca e coda; se ne vanno solo appuntamenti e telefonate non ancora fatti; il lavoro fatto resta e conta.
// Biglietti dal mese in corso e CEP attivo restano nei Segni Vitali: li toglie solo l'Admin, con la spunta nella conferma.
// «Annulla» nell'avviso rimette tutto com'era (`annulla_elimina_contatto`); dopo, dall'app non si recupera più.
async function elimina(r, dopo) {   // `dopo` ridisegna chi l'ha chiamata (dalla Dashboard: «Da catalogare», 24/09)
  const mese = MB21Lista.meseEvento(MB21Coda.oggiRoma());
  const [big, cep] = await Promise.all([
    dbq('biglietti di chi si elimina', supa.from('biglietti').select('tipo, evento').eq('contatto_id', r.id).gte('evento', mese).order('evento')),
    dbq('CEP di chi si elimina', supa.from('cep').select('id').eq('contatto_id', r.id).is('uscito_il', null)),
  ]);
  if (big.error || cep.error) return mostraToast('Non riesco a controllare biglietti e CEP: riprova.');
  const segni = [...big.data.map(b => `biglietto ${b.tipo} ${MB21Lista.etichettaEvento(b.evento)}`), ...(cep.data.length ? ['CEP attivo'] : [])];
  const testo = 'Sparisce dalla lista e dall\'archivio. Il lavoro già fatto resta nei tuoi numeri.'
    + (segni.length ? ` Ha ${segni.join(' · ')}: ${segni.length > 1 ? 'restano' : 'resta'} nei Segni Vitali${cep.data.length ? ' (il CEP non scade da solo)' : ''}.` : '');
  const si = await chiediConferma(`Eliminare ${r.nome} dalla lista?`, testo, 'Elimina', true,
    segni.length && eAdmin() ? `Togli anche ${segni.join(' e ')}` : '');
  if (!si) return;
  const { error } = await dbq('elimina', supa.rpc('elimina_contatto', { p_contatto: r.id, p_togli_segni: !!si.spunta }));
  if (error) return mostraToast('Non eliminato: riprova.');
  LS.contatto = null;
  // nota Pagine 068 (feedback del 20/10, «non mi fa eliminare i doppioni»): il nome eliminato esce subito dai nomi in memoria; prima restava
  // a video finché la Lista non si rileggeva, e un secondo «Elimina» sullo stesso nome diceva «Non eliminato: riprova»
  await aggiornaRiga(r.id);
  await (dopo || ricaricaERidisegna)(true);   // `dopo(true)`: eliminato (L5: «Da catalogare» lo toglie dalla sua copia)
  mostraToast(`${r.nome} eliminato`, async () => {
    const { error } = await dbq('annulla elimina', supa.rpc('annulla_elimina_contatto', { p_contatto: r.id }));
    if (error) return mostraToast('Non annullato: riprova.');
    await aggiornaRiga(r.id);   // e con «Annulla» torna subito
    (dopo || ricaricaERidisegna)(false);   // `dopo(false)`: di nuovo in lista
  });
}

// ── Scheda contatto ──
function apriScheda(id) {
  LS.contatto = LS.righe.find(x => x.id === id);
  if (!LS.contatto) return;
  LS.sezione = MB21Lista.sezioneIniziale(LS.contatto);
  if (LS.apriSezione) { if (sezioniPer(LS.contatto).some(([k]) => k === LS.apriSezione)) LS.sezione = LS.apriSezione; LS.apriSezione = null; }   // chiesta da un avviso o dalla Dashboard
  LS.azioni = null; LS.azAperta = null; LS.note = null; LS.sv = null; LS.vendite = null; LS.avvio = null; LS.account = null; LS.accountLettura = null; LS.stessoOrdine = null;
  LS.scrollLista = ST.tab === 'lista' && !LS.ritorno ? window.scrollY : 0;   // per tornare al punto della Lista da cui si è aperta
  window.scrollTo(0, 0);
  disegnaScheda();
}

function sezioniPer(c) {
  // Verifica Scheda contatto S4 (Ignazio 22/10): «Coach Yes» non è più una linguetta: le note stanno in un riquadro dentro «Azioni»
  const base = [['dati', 'Dati'], ['azioni', 'Azioni'],
    ...(MB21Lista.haVendite(c, LS.vendite) ? [['vendite', 'Vendite']] : []),
    // «Sharing» (cantiere 40): il percorso delle tracce è per candidati e partner (come in Glide), non per Ex e Archiviati
    ...(MB21Sharing.perChiDi(c) ? [['sharing', 'Sharing']] : []),
    // nota 098 (Ignazio 26/10: «i segni vitali che non servono a niente in un cliente»): un Cliente non ha la linguetta «Segni Vitali»
    ...(c.categoria === 'Cliente' ? [] : [['segni', 'Segni Vitali']])];
  // La linguetta «Onboarding» dei Partner non c'è più (cantiere 31, Ignazio 18/09: «recuperiamo spazio»): i passi si aprono dalla riga «🚀 Avvio» in testata
  return base;
}

// V4 (Verifica Vendite, Ignazio 22/10/2026, strada B): «Ha un account cliente: ordina da solo» al posto dell'attesa «Ordina da solo» (note 043 e
// Azioni 025): niente domanda «ha ordinato?» dopo 7 giorni né riquadro in Dashboard. Il dato è `contatti.account_cliente_dal` (da quando ordina dal suo
// account); si segna da «Modifica»; in testata la riga «Cliente con account · dal …» con «Togli» (Lista Nomi L1b, Ignazio 23/10: l'etichetta
// «Cliente con account» al posto di «Ha un account cliente: ordina da solo», ovunque; stesso dato). Una lettura per scheda, solo per i Clienti.
async function leggiAccountCliente(id) {
  const { data, error } = await dbq('account cliente', supa.from('contatti').select('account_cliente_dal').eq('id', id).maybeSingle());
  return error ? undefined : (data && data.account_cliente_dal) || null;   // undefined = non letto (senza rete, o prima della migrazione)
}
// Nota Pagine 078 (difetto corretto, 24/10): il dato «Cliente con account» di una scheda, con UNA lettura condivisa. La testata (mostraAccountCliente) e il
// modulo vendita aspettano la stessa: prima, da «Vendita! La registri adesso?», il modulo partiva subito dopo apriScheda e trovava LS.account vuoto.
// Se la testata non l'ha fatta partire (la riga non c'è), la fa il modulo. → la data (o null) · undefined se non si è potuta leggere.
function accountDi(c) {
  if (LS.account && LS.account.id === c.id) return Promise.resolve(LS.account.dal);
  if (LS.accountLettura && LS.accountLettura.id === c.id) return LS.accountLettura.promessa;
  const promessa = leggiAccountCliente(c.id).then(dal => {
    if (dal !== undefined && LS.contatto && LS.contatto.id === c.id) LS.account = { id: c.id, dal };
    if (LS.accountLettura && LS.accountLettura.promessa === promessa) LS.accountLettura = null;
    return dal;
  });
  LS.accountLettura = { id: c.id, promessa };
  return promessa;
}
async function mostraAccountCliente(c) {
  if (!document.getElementById('account-posto')) return;
  if (!LS.account || LS.account.id !== c.id) {
    const dal = await accountDi(c);
    if (dal === undefined || LS.contatto !== c) return;
    LS.account = { id: c.id, dal };
  }
  const qui = document.getElementById('account-posto');
  if (!qui) return;
  // Nota Pagine 079 (Ignazio 24/10): via «Togli» (accanto all'ordine confondeva: «Cliente con account» si cambia solo da Modifica, Sì/No). Sotto, la riga
  // «Ultimo ordine gg/mm · brand · lo risenti il gg/mm/aaaa» (l'ultima vendita già letta dalla scheda e `rientro_il`; ognuna solo se c'è) e il tasto
  // «+ Ha ordinato sul sito», che apre il modulo vendita di sempre già pronto con l'ultima vendita (haOrdinatoSulSito). account_cliente_dal non si sposta.
  const u = (LS.vendite || [])[0];
  const sotto = [u ? `Ultimo ordine ${MB21Lista.data(u.data).slice(0, 5)} · ${u.brand}` : '', c.rientro_il ? `lo risenti il ${MB21Lista.data(c.rientro_il)}` : ''].filter(Boolean).join(' · ');
  qui.innerHTML = LS.account.dal ? `<div class="ao-riga"><div class="ao-testo"><span class="ao-ic">${ic('vendite')}</span>
    <span><b>Cliente con account · dal ${esc(MB21Lista.data(LS.account.dal))}</b>${sotto ? `<small>${esc(sotto.charAt(0).toUpperCase() + sotto.slice(1))}</small>` : ''}</span></div>
    ${vediTutti() || ST.offline ? '' : `<div class="ao-tasti"><button type="button" id="account-ordinato">${ic('piu')} Ha ordinato sul sito</button></div>`}</div>` : '';
  const ordinato = document.getElementById('account-ordinato');
  if (ordinato) ordinato.onclick = () => haOrdinatoSulSito(c);
  if (LS.sv && LS.sv.id === c.id) mostraTarghe(LS.sv);   // 080: la targhetta «Account» della testata con il dato appena letto
}
// «+ Ha ordinato sul sito» (nota Pagine 079): il modulo vendita di sempre, già pronto con brand, prodotto e VP dell'ultima vendita (con accanto «come l'ordine
// del …»: si correggono) e la data di oggi (si sceglie); per il cliente con account è «Ordine pagato sul sito». Si apre sulla linguetta Vendite.
async function haOrdinatoSulSito(c) {
  if (soloGuardo()) return;
  const u = ((await venditeDellaScheda(c)) || [])[0];
  if (LS.contatto !== c) return;
  LS.sezione = 'vendite'; disegnaScheda();
  moduloVendita(null, u ? { brand: u.brand, prodotto: u.prodotto, vp: u.vp, vpDi: u.data } : {});
}
// Avvio del Partner (cantiere 31). «Avvio concluso» e la data di ingresso (file Amway → `squadra`) non sono nella vista della Lista:
// si leggono all'apertura della scheda di un Partner. LS.avvio = { id, concluso (giorno o null), ingresso (giorno o null) }
// Riga dell'avvio nella testata, sotto «Usa l'app» (Ignazio 18/09: si deve capire senza entrare in una sezione, e al posto della
// linguetta Onboarding): aperto → passi fatti e prossimo passo; concluso → «✅ Avvio concluso · fatti/14». Il tocco apre i 14 passi
// (sezione `onboarding`, senza linguetta); un secondo tocco li richiude e torna alla sezione con cui si apre la scheda.
function mostraAvvio(c) {
  const posto = document.getElementById('avvio-posto');
  if (!posto || !LS.avvio || LS.avvio.id !== c.id || c.categoria !== 'Partner') return;
  const { fatti, totale } = MB21Lista.contatoreOnboarding(c), prossimo = MB21Lista.prossimoPasso(c);
  const stato = LS.avvio.concluso ? [ic('fatto'), 'Avvio concluso'] : LS.avvio.pausa ? [ic('pausa'), 'Avvio in pausa'] : [ic('avvio'), 'Avvio'];
  posto.innerHTML = `<button class="app-riga" id="avvio-riga"><span class="ico">${stato[0]}</span>
    <div>${stato[1]} · ${fatti}/${totale}${LS.avvio.concluso || LS.avvio.pausa ? '' : `<small>${prossimo ? 'Prossimo passo: ' + esc(prossimo.nome) : 'Tutti i passi sono fatti'}</small>`}</div><span class="freccia">${LS.sezione === 'onboarding' ? '⌄' : '›'}</span></button>`;
  document.getElementById('avvio-riga').onclick = () => {
    LS.sezione = LS.sezione === 'onboarding' ? MB21Lista.sezioneIniziale(c) : 'onboarding';
    disegnaScheda();
  };
}
async function avvioDellaScheda(c) {
  if (LS.avvio && LS.avvio.id === c.id) return null;   // già letto
  const { data, error } = await dbq('avvio', supa.from('contatti').select('avvio_concluso_il, avvio_in_pausa_dal, codice_amway').eq('id', c.id).maybeSingle());
  if (error || !data) return null;
  const sq = await dbq('squadra', supa.from('squadra').select('partner_id, nome, data_ingresso'));
  const p = sq.error ? null : MB21Mappa.partnerDellaScheda({ nome: c.nome, codice_amway: data.codice_amway }, sq.data);
  // Quale scheda vale per «Partner da avviare» (lavoro 2): quella dello sponsor o del primo upline che ce l'ha (`avvio_del_ramo`).
  // Se non è questa (il partner ha la scheda in due liste) la sezione lo dice: i passi segnati qui lì non si vedono.
  let altra = null, sa = null, perche = null;
  if (p) {
    // cantiere 32: `avvio_del_team()` = { ramo: `avvio_del_ramo()` tale e quale, perche: le voci di «Perché iniziare» dei partner del ramo }
    const team = await dbq('avvio del Team', supa.rpc('avvio_del_team'));
    const riga = team.error || !team.data ? null : (team.data.ramo || []).find(r => r.partner_id === p.partner_id);
    if (riga && riga.contatto_id !== c.id) altra = { id: riga.contatto_id, lista: riga.lista, mia: riga.user_id === ST.utente.id || eAdmin() };
    sa = (riga && riga.sa) || null;   // lavoro 4: quello che l'app sa già di lui, per le proposte 💡
    perche = (riga && team.data.perche && team.data.perche[p.partner_id]) || null;   // quello che ha scelto nel benvenuto, sotto il primo passo
  }
  if (!LS.contatto || LS.contatto.id !== c.id) return null;
  return (LS.avvio = { id: c.id, concluso: data.avvio_concluso_il || null, pausa: data.avvio_in_pausa_dal || null, ingresso: (p && p.data_ingresso) || null, altra, sa, perche });
}

function disegnaScheda() {
  const c = LS.contatto;
  app.innerHTML = `
    <button class="indietro" id="indietro">‹ ${LS.ritorno === 'oggi' ? 'Oggi' : LS.ritorno === 'mappa' ? 'Mappa' : LS.ritorno === 'catalogo' ? 'Da catalogare' : LS.ritorno === 'check' ? 'Check' : LS.ritorno === 'agenda' ? 'Agenda' : LS.ritorno === 'vendite' ? 'Vendite' : LS.ritorno ? 'Report' : 'Lista Nomi'}</button>
    <div class="testata ${classeCat(c.categoria)}">
      <div class="corpo">
        <div class="alto">
          <span class="ts-pastiglia">${esc(iniziali(c.nome))}</span>
          <div class="ts-chi">
            <div class="cat">${esc(c.categoria ? MB21Lista.nomeCategoria(c.categoria) : 'Senza categoria')}</div>
            <h1>${esc(c.nome)}${nuovoBadge(c)}<span class="sv-targhe" id="sv-targhe">${targaAppHtml(c.app)}${targaAccountHtml(c.categoria, accountDellaScheda(c))}${segniInAlto(c.categoria, null) ? targheHtml(null) : ''}</span></h1>
            <div class="sotto" style="margin:0">${esc(c.telefono || '')}</div>
          </div>
          <button class="modifica" id="modifica">Modifica</button>
        </div>
        ${contattaHtml(c.telefono)}
        ${eAdmin() && c.user_id !== ST.utente.id ? `<div class="sotto" style="margin:10px 0 0">Nome di ${esc(c.partner)}</div>` : ''}
        <div class="vn-brand-testata" id="vn-brand-testata"></div>
        ${c.categoria === 'Partner' ? '<span id="invita-posto"></span><span id="avvio-posto"></span>' : ''}
        ${c.categoria === 'Cliente' ? '<div id="account-posto"></div>' : ''}
      </div>
    </div>
    <div id="scheda-cose"></div>
    <div class="sezioni">${sezioniPer(c).map(([k, t]) => `<button data-s="${k}" class="${LS.sezione === k ? 'scelto' : ''}">${t}</button>`).join('')}</div>
    <div id="sezione"></div>
    ${versione()}`;
  document.getElementById('indietro').onclick = () => {
    const daId = LS.contatto && LS.contatto.id;
    eseguiDopoScheda(daId);   // il processo lasciato a metà (dopo lo Sharing del Piano Marketing) riprende
    LS.contatto = null;
    if (!LS.ritorno) { disegnaLista(); return window.scrollTo(0, LS.scrollLista || 0); }
    if (LS.ritorno === 'mappa') { LS.ritorno = null; ST.tab = 'mappa'; return mostraTab(); }
    // torna a «Da catalogare» dalla copia in memoria, con quella persona com'è adesso (L5: prima si ricaricava tutta la Dashboard)
    if (LS.ritorno === 'catalogo') { LS.ritorno = null; ST.vistaCatalogo = true; allineaCatalogo(daId); window.scrollTo(0, 0); return disegnaCatalogo(); }
    if (LS.ritorno === 'check') { LS.ritorno = null; ST.tab = 'check'; return mostraTab(); }   // dai «prossimi passi» del Check (27/09)
    if (LS.ritorno === 'agenda') { LS.ritorno = null; ST.tab = 'agenda'; return mostraTab(); }
    if (LS.ritorno === 'vendite') { LS.ritorno = null; ST.tab = 'vendite'; return mostraTab(); }   // nota 098: dalla pagina Vendite   // dallo Sharing dopo un Piano Marketing fissato da MB Plan (01/10)
    if (LS.ritorno === 'oggi') {   // torna alla Dashboard, ricaricata (coda e Da catalogare)
      LS.ritorno = null; ST.tab = 'oggi'; ST.aperta = null;
      document.querySelectorAll('#tab button').forEach(b => b.classList.toggle('attiva', b.dataset.tab === 'oggi'));
      return caricaOggi();
    }
    ST.tab = 'report'; RP.vista = LS.ritorno === 'griglia' ? 'griglia' : 'report'; LS.ritorno = null;
    document.querySelectorAll('#tab button').forEach(b => b.classList.toggle('attiva', b.dataset.tab === 'report'));
    RP.vista === 'griglia' ? disegnaGriglia() : disegnaReport();
  };
  const m = document.getElementById('modifica');
  if (m) m.onclick = () => apriModulo(c);
  mostraInvito(c);
  mostraAvvio(c);
  mostraAccountCliente(c);
  app.querySelectorAll('.sezioni button[data-s]').forEach(b => b.onclick = () => { LS.sezione = b.dataset.s; disegnaScheda(); });
  if (LS.sv && LS.sv.id === c.id) mostraTarghe(LS.sv);
  else segniDellaScheda(c).then(mostraTarghe).catch(() => {});
  // Una lettura delle vendite per ogni scheda: accende le targhette Brand della testata; e per chi non è Cliente
  // ma ha già delle vendite fa comparire la sezione «Vendite».
  const senzaSezione = !MB21Lista.haVendite(c, LS.vendite);
  venditeDellaScheda(c).then(v => {
    if (!v || LS.contatto !== c) return;
    if (senzaSezione && v.length) return disegnaScheda();
    mostraBrand(c, v);
    if (LS.account && LS.account.id === c.id && LS.account.dal) mostraAccountCliente(c);   // 079: «Ultimo ordine …» appena le vendite ci sono
  }).catch(() => {});
  // Avvio del Partner: appena letto si disegna la riga in testata; con i passi aperti si ridisegna (giorni dall'ingresso e tasto)
  if (c.categoria === 'Partner') avvioDellaScheda(c).then(a => {
    if (a && LS.sezione === 'onboarding') disegnaScheda();
    else mostraAvvio(c);
  }).catch(() => {});
  coseDellaScheda(c);
  ({ dati: sezioneDati, azioni: sezioneAzioni, coach: sezioneAzioni, onboarding: sezioneOnboarding, segni: sezioneSegni, vendite: sezioneVendite, sharing: sezioneSharing }[LS.sezione] || sezioneDati)();
}

// Le cose da fare collegate a questa persona (cantiere 41, Ignazio 23/09: quello che fai in MB Plan si ritrova nella scheda).
// Sotto la testata, prima delle linguette, per ogni categoria (S5, nota 072: anche archiviati e senza categoria): le aperte (e le fatte oggi, grigie), la spunta, il tocco apre il foglio della cosa
// (lo stesso di MB Plan), e «+ Una cosa da fare» per aggiungerne una già collegata, da fare oggi.
async function coseDellaScheda(c) {
  return cosePersonaHtml(c, { posto: document.getElementById('scheda-cose'), ancora: () => LS.contatto === c, ridisegna: () => coseDellaScheda(c) });
}
// Le cose della persona: aperte e fatte oggi (stessa lettura). Il riquadro della scheda della Lista; con `dentro` (scheda v5, nota 098: dentro «Prossimo»)
// solo l'elenco e «+ Una cosa da fare», senza riquadro né titolo. `ancora()`: la scheda è ancora quella (se no non si disegna); `ridisegna`: dopo una
// spunta, un cambio o una cosa nuova; `leggi` (facoltativo): chi legge da sé le righe (la scheda v5 le tiene in memoria). La Lista si comporta come prima.
async function cosePersonaHtml(c, { posto, ancora, ridisegna, dentro = false, leggi }) {
  if (!posto) return;
  const oggi = MB21Coda.oggiRoma();
  const { data, error } = leggi ? await leggi() : await dbq('cose da fare della scheda', supa.from('cose_da_fare').select('*, contatti(nome, categoria)').eq('contatto_id', c.id)
    .or(`fatto_il.is.null,giorno.gte.${oggi}`).order('giorno').order('ordine'));
  if (error || !ancora() || !posto.isConnected) return;
  const cose = (data || []).filter(x => !x.fatto_il || x.giorno === oggi)
    .sort((x, y) => (x.fatto_il ? 1 : 0) - (y.fatto_il ? 1 : 0) || (x.giorno < y.giorno ? -1 : x.giorno > y.giorno ? 1 : 0));
  const gg = g => `${Number(g.slice(8))}/${Number(g.slice(5, 7))}`;
  const quando = x => {
    const scala = x.scala || 'giorno';
    if (!x.giorno) return 'nel progetto';   // una riga di progetto senza giorno (24/09: prima gg(null) rompeva il riquadro)
    if (scala !== 'giorno') return { settimana: 'questa settimana', mese: 'questo mese', periodo: 'questo periodo WES', anno: "quest'anno" }[scala] || '';
    if (x.giorno < oggi) return `da ${gg(x.giorno)}`;
    if (x.giorno === oggi) return 'oggi' + (x.ora ? ' · ' + String(x.ora).slice(0, 5) : '');
    return (x.giorno === MB21Agenda.spostaGiorno(oggi, 1) ? 'domani' : gg(x.giorno)) + (x.ora ? ' · ' + String(x.ora).slice(0, 5) : '');
  };
  // Verifica Scheda contatto S2 (Ignazio 22/10): niente riquadro sempre aperto; una riga «+ Una cosa da fare» che al tocco apre il campo,
  // e l'elenco solo se ci sono cose. Il campo resta aperto su questa scheda per scriverne un'altra (LS.coseAperto).
  const disegna = () => {
    if (!ancora() || !posto.isConnected) return;
    const aperto = LS.coseAperto === c.id;
    const piu = aperto
      ? `<form class="ag-cosa-nuova" id="sc-cosa-nuova"><input type="text" placeholder="Aggiungi una cosa da fare…" autocomplete="off"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>`
      : `<button class="link" id="sc-cosa-piu">+ Una cosa da fare</button>`;
    const elenco = cose.map(x => `<div class="cosa${x.fatto_il ? ' fatta' : ''}" data-cosa="${esc(x.id)}">
      <button class="spunta" aria-label="${x.fatto_il ? 'Fatta: rimetti da fare' : 'Fatta'}">${x.fatto_il ? ic('fatto') : ''}</button>
      <button class="testo"><span>${esc(x.testo)}</span><small>${esc([quando(x), typeof nomeProgetto === 'function' ? nomeProgetto(x) : ''].filter(Boolean).join(' · '))}</small></button></div>`).join('');
    posto.innerHTML = dentro ? `<div class="ag-foglio scheda-cose dentro">${elenco}${piu}</div>`
      : cose.length ? `<div class="riquadro ag-foglio scheda-cose"><h2 class="ag-sez">Da fare</h2>${elenco}${piu}</div>`
      : aperto ? `<div class="riquadro ag-foglio scheda-cose">${piu}</div>` : piu;
    posto.querySelectorAll('.cosa[data-cosa]').forEach(r => {
      const x = cose.find(y => y.id === r.dataset.cosa);
      r.querySelector('.spunta').onclick = () => { if (!soloGuardo()) spuntaCosa(x, { ridisegna, giorno: oggi }); };
      r.querySelector('.testo').onclick = () => foglioCosa(x, oggi, { ridisegna, dallaScheda: true });
    });
    const apri = document.getElementById('sc-cosa-piu');
    if (apri) apri.onclick = () => { if (soloGuardo()) return; LS.coseAperto = c.id; disegna(); const campo = document.querySelector('#sc-cosa-nuova input'); if (campo) campo.focus(); };
    const form = document.getElementById('sc-cosa-nuova');
    if (form) form.onsubmit = async ev => {
      ev.preventDefault();
      if (soloGuardo()) return;
      const testo = MB21Agenda.testoCosa(form.querySelector('input').value); if (typeof avvisaSeLungo === 'function') avvisaSeLungo(form.querySelector('input').value);
      if (!testo) return;
      // la cosa è del proprietario della scheda (l'Admin su una scheda di un partner la mette nel suo MB Plan)
      const { error } = await dbq('nuova cosa da fare', supa.from('cose_da_fare').insert({ user_id: c.user_id, testo, giorno: oggi, scala: 'giorno', contatto_id: c.id }));
      if (error) return mostraToast('Non salvato: riprova.');
      await ridisegna();
      const campo = document.querySelector('#sc-cosa-nuova input');
      if (campo) campo.focus();   // si continua a scrivere la prossima
    };
  };
  disegna();
}

// ── Vendite ── sezione «Vendite», modulo «Nuova vendita», «Ordine fatto» e targhette Brand sono in pagina-vendite.js

// Scheda di un Partner: riga «📱 Usa l'app · ultimo uso … · N nomi in lista» (e niente «Invita») se la persona è già utente
// dell'app (cantiere 20 lavoro 4: al posto di «✅ Utente MB21»), altrimenti «🔗 Invita nell'app».
// Lo dice il database (`e_utente_mb21`): 'amway' = codice Amway della scheda → email nel file Amway → utente con quella email
// (Ignazio 17/09; niente nome, niente solo codice: la coppia lo condivide); 'collegato' = a mano dall'Admin (`collega_utente_mb21`),
// per chi non si aggancia così (es. il compagno/a senza codice). Risposta ricordata per scheda finché la Lista resta aperta.
// Verifica Scheda contatto S1 (Ignazio 22/10): «Invita nell'app», «Usa l'app · ultimo uso · N nomi» e «Collega all'utente» servono a un team
// che oggi non c'è: spenti con un interruttore, come AVVISI_TEAM (il codice resta; la lettura e_utente_mb21 non parte). Si riaccende con true.
const INVITO_APP = false;
async function mostraInvito(c) {
  const posto = document.getElementById('invita-posto');
  if (!INVITO_APP || !posto) return;
  if (!(c.id in LS.utenteMb21)) {
    const { data, error } = await dbq('utente MB21?', supa.rpc('e_utente_mb21', { p_contatto: c.id }));
    if (error) return;   // in dubbio niente: si riprova riaprendo la scheda
    LS.utenteMb21[c.id] = data || null;
  }
  if (LS.contatto !== c || !posto.isConnected) return;
  const come = LS.utenteMb21[c.id];
  const collega = eAdmin() ? `<button class="link" id="collega-mb21" style="display:block">${come === 'collegato' ? ic('chiudi') + ' Scollega dall\'utente' : ic('collega') + ' È già utente dell\'app: collega'}</button>` : '';
  const uso = c.app || (LS.usoApp && LS.usoApp[c.id]);
  const dettaglio = uso ? `ultimo uso ${MB21Mappa.etichettaUso(uso.ultimo_uso, MB21Coda.oggiRoma())} · ${uso.nomi} nomi in lista` : 'ultimo uso non disponibile';
  posto.innerHTML = come
    ? `<div class="app-riga"><span class="ico">${ic('app')}</span><div>Usa l'app<small>${esc(dettaglio)}</small></div></div>${come === 'collegato' ? collega : ''}`
    : `<button class="link" id="invita-app">${ic('collega')} Invita nell'app</button>${collega}`;
  const inv = document.getElementById('invita-app');
  if (inv) inv.onclick = () => foglioLinkInvito({ da: c.user_id, nome: c.nome, telefono: c.telefono });
  const col = document.getElementById('collega-mb21');
  if (col) col.onclick = () => collegaUtenteMb21(c, come === 'collegato');
}

// Admin: collega la scheda a un utente dell'app (menu degli utenti non eliminati) o la scollega
async function collegaUtenteMb21(c, scollega) {
  let utente = null;
  if (!scollega) {
    const { data, error } = await dbq('utenti dell\'app', supa.from('utenti').select('id, nome_cognome, email').is('eliminato_il', null).order('nome_cognome'));
    if (error) return mostraToast('Non riesco a leggere gli utenti: riprova.');
    utente = await sceltaDa(`${c.nome} è quale utente?`, data.map(u => ({ etichetta: `${u.nome_cognome} · ${u.email}`, u })));
    if (!utente) return;
  }
  const { error } = await dbq('collega utente MB21', supa.rpc('collega_utente_mb21', { p_contatto: c.id, p_utente: scollega ? null : utente.u.id }));
  if (error) return mostraToast('Non salvato: riprova.');
  delete LS.utenteMb21[c.id];
  await leggiUsoApp();   // targhetta 📱 e riga «Usa l'app» aggiornate
  disegnaScheda();
  mostraToast(scollega ? `${c.nome} scollegato` : `${c.nome} = ${utente.u.nome_cognome}`);
}

function sezioneDati() {
  const c = LS.contatto;
  disegnaDati(c, null);
  riquadroCoppia(c);
  datiPersonaExtra(c);
}

// La sezione Dati: prima i dati personali nell'ordine di MB21Lista.DATI_PERSONA (lo stesso del modulo, Ignazio 25/09), poi il resto.
// Solo i campi pieni. Compleanno, sesso e lavoro non stanno nella vista della Lista: arrivano con `datiPersonaExtra` (seconda passata).
function disegnaDati(c, extra) {
  const box = document.getElementById('sezione');
  if (!box) return;
  const L = MB21Lista, valore = k => (extra && k in extra ? extra[k] : c[k]);
  const persona = L.DATI_PERSONA.map(([k, etichetta]) => {
    const v = valore(k);
    if (!v) return null;
    if (k === 'compleanno') return [etichetta, ic('compleanno') + ' ' + esc(MB21Rubrica.compleannoScritto(v))];
    return [etichetta, esc(k === 'sesso' ? L.nomeScelta(L.SESSI, v) : k === 'lavoro' ? L.nomeScelta(L.LAVORI, v) : v)];
  }).filter(Boolean);
  // «Contatti fatti» (nota 091 b): arriva con la seconda passata, contato solo per questa persona; finché non c'è la riga non si vede (niente «0» di passaggio)
  const fatti = valore('contatti_fatti');
  const resto = [['Interesse', MB21Lista.testoInteresse(c.area)], ['Contatto e/o Incaricato di', c.referral_di], ['Note', c.note], ['Contatti fatti', fatti == null ? '' : String(fatti)]]
    .filter(([, v]) => v).map(([k, v]) => [k, esc(v)]);
  // nota Pagine 031 (Ignazio 06/10): il codice Amway, si copia con un tocco; arriva con `datiPersonaExtra` (la stessa lettura di compleanno e lavoro)
  const codice = valore('codice_amway');
  if (codice) resto.unshift(['Codice Amway', `<button type="button" class="codice-copia" data-copia-codice="${esc(codice)}" aria-label="Copia il codice Amway ${esc(codice)}">${esc(codice)}${ic('copia')}</button>`]);
  const riquadro = `<div class="riquadro dati" id="dati-riquadro">${[...persona, ...resto].map(([k, v]) => `<div><small>${k}</small>${v}</div>`).join('')}</div>`;
  const vecchio = document.getElementById('dati-riquadro');
  if (vecchio) vecchio.outerHTML = riquadro; else box.innerHTML = `<div id="coppia"></div>${riquadro}`;
  const copia = document.querySelector('[data-copia-codice]');
  if (copia) copia.onclick = () => copiaCodice(copia.dataset.copiaCodice);
}
// Copia il codice negli appunti; se il telefono non lo lascia fare, il codice resta scritto nel messaggio (si legge e si scrive a mano)
async function copiaCodice(codice) {
  try { await navigator.clipboard.writeText(codice); mostraToast(`Codice ${codice} copiato`); }
  catch (e) { mostraToast(`Codice Amway: ${codice}`); }
}

// Compleanno (cantiere 30, Ignazio 18/09: «domani potremmo mandare messaggi di auguri»), sesso e lavoro (cantiere 40): la vista della Lista
// non li ha, si leggono da `contatti` quando si apre «Dati», come la coppia. Senza rete restano fuori.
// Nota Pagine 091 (b), Ignazio 25/10: anche «Contatti fatti» (prima la vista lo contava per ogni nome a ogni lettura della Lista: per l'Admin ~8.300 conti);
// la stessa regola della vista di prima e di Report e Griglia: telefonate con un esito in cui si è parlato (No Risposta e Telefono spento no, Riordino solo se fatto).
const contaContattiFatti = id => dbq('contatti fatti', supa.from('azioni').select('id', { count: 'exact', head: true }).eq('contatto_id', id).eq('tipo_azione', 'Contatto')
  .not('esito', 'is', null).not('esito', 'in', '("No Risposta","Telefono spento")').or('esito.neq.Riordino,completata.is.true'));
async function datiPersonaExtra(c) {
  const [{ data, error }, fatti] = await Promise.all([
    dbq('dati personali', supa.from('contatti').select('compleanno, sesso, lavoro, codice_amway').eq('id', c.id).maybeSingle()),   // + il codice Amway (nota 031)
    contaContattiFatti(c.id),
  ]);
  if (error || !data || LS.contatto !== c || LS.sezione !== 'dati') return;
  disegnaDati(c, { ...data, ...(fatti.error || fatti.count == null ? {} : { contatti_fatti: fatti.count }) });
}

// Coppia (cantiere 18, Ignazio 16/09): marito, moglie o compagno/a per qualsiasi contatto.
// Scheda della lista collegata nei due sensi (`collega_compagno`) oppure nome e telefono a mano.
// Con la scheda collegata i Segni Vitali della coppia valgono per tutte e due.
async function riquadroCoppia(c) {
  let SV;
  try { SV = await segniDellaScheda(c); } catch (e) { return; }
  const box = document.getElementById('coppia');
  if (!box || LS.contatto !== c || LS.sezione !== 'dati') return;
  const a = SV.ana;
  const chi = SV.compagno
    ? `<button class="sv-link" id="cp-apri">${esc(SV.compagno.nome)} ›</button>`
    : a.compagno_nome || a.compagno_telefono
      ? `<span>${esc(a.compagno_nome || '')}${a.compagno_telefono ? ` <small class="sotto">${esc(a.compagno_telefono)}</small>` : ''}</span>`
      : '<span class="sotto" style="margin:0">—</span>';
  const presente = SV.compagno || a.compagno_nome || a.compagno_telefono;
  box.innerHTML = `<div class="riquadro sv-comp"><span class="sotto" style="margin:0">Coppia con</span>${chi}
    <button class="sv-piu" id="cp-cambia">${presente ? 'Cambia' : 'Collega'}</button></div>`;

  const apri = document.getElementById('cp-apri');
  if (apri) apri.onclick = () => apriContattoDa(SV.compagno.id, LS.ritorno);

  const cambia = document.getElementById('cp-cambia');
  if (cambia) cambia.onclick = async () => {
    if (soloGuardo()) return;
    const scelta = await scegliScheda({ titolo: 'Coppia con', userId: c.user_id, escludi: c.id,
      mano: presente ? 'Non è in lista (o togli il collegamento): scrivo nome e telefono' : 'Non è in lista: scrivo nome e telefono' });
    if (!scelta) return;
    if (scelta === 'mano') {
      const v = await moduloSemplice('Coppia con (non in lista)', [
        { k: 'nome', etichetta: 'Nome e cognome (vuoto = nessuno)', tipo: 'text', valore: a.compagno_nome || '' },
        { k: 'telefono', etichetta: 'Telefono', tipo: 'tel', valore: a.compagno_telefono || '' },
      ], { persona: c });
      if (!v) return;
      if (SV.compagno) {
        const { error } = await dbq('scollega compagno', supa.rpc('collega_compagno', { p_contatto: c.id, p_compagno: null }));
        if (error) return mostraToast('Non salvato: riprova.');
      }
      const { error } = await dbq('salva compagno', supa.from('contatti')
        .update({ compagno_nome: v.nome.trim() || null, compagno_telefono: v.telefono.trim() || null }).eq('id', c.id));
      if (error) return mostraToast('Non salvato: riprova.');
      mostraToast(v.nome.trim() || v.telefono.trim() ? 'Salvato' : 'Collegamento tolto');
    } else {
      const { error } = await dbq('collega compagno', supa.rpc('collega_compagno', { p_contatto: c.id, p_compagno: scelta.id }));
      if (error) return mostraToast('Non collegato: riprova.');
      mostraToast(`Coppia con ${scelta.nome}`);
    }
    LS.sv = null; LS.svLettura = null; LS.coppie = null;   // la coppia è cambiata: si rilegge
    leggiTarghe().then(conCepPerCodice).then(t => { LS.targhe = t; }).catch(() => {});   // L8: con il CEP per codice, come la lettura intera
    riquadroCoppia(c);
    segniDellaScheda(c).then(mostraTarghe).catch(() => {});
  };
}

// Azioni della scheda col criterio di Glide (cantiere 22 lavoro 3, Ignazio 17/09): un'azione nasce «da completare»,
// si chiude con l'esito (stessi bottoni dell'Agenda, `chiudiAppuntamento` → poi «Fissa il prossimo appuntamento»),
// niente interruttore Completato a mano: completata = ha l'esito. Per correggere resta Modifica.
async function sezioneAzioni() {
  const c = LS.contatto;
  const box = document.getElementById('sezione');
  // Niente riquadro FASE (Ignazio 24/09: «residuo di Glide»): dove si è con la persona lo dice la prima card, l'ultima azione con il suo esito.
  // Un archiviato si lavora come gli altri (Ignazio 05/10 sera: «si possono servire»): è solo fuori dalla Lista senza ricerca e dalla coda.
  const piuHtml = '<button class="primario piu-sezione" id="azione-piu">' + ic('piu') + ' Nuova azione</button>';
  if (!LS.azioni) {
    box.innerHTML = piuHtml + '<div class="vuoto">Carico le azioni…</div>';   // solo alla prima lettura: aprire una riga (S3) non fa saltare la pagina
    // anche le azioni in cui questo contatto ha portato qualcuno (portato_da), con il nome dell'altra persona
    const { data, error } = await dbq('lettura azioni', supa.from('azioni')
      .select('id, user_id, contatto_id, portato_da, categoria, tipo_azione, modalita, esito, area, ospite, note, inizio, fine, completata, data_scelta, riflessione, creato_il, contatti(nome)')
      .or(`contatto_id.eq.${c.id},portato_da.eq.${c.id}`).order('inizio', { ascending: false, nullsFirst: false }));
    if (error) { box.innerHTML = piuHtml + '<div class="avviso">Non riesco a caricare le azioni.</div>'; return; }
    LS.azioni = await aggiungiPortatoDa(data.filter(a => a.portato_da !== c.id || a.contatto_id !== c.id));
  }
  if (!COACH_YES) LS.note = [];   // S6: coach spento (conformità): niente righe gialle e nessuna lettura; le note restano nel database
  else if (!LS.note) {   // le note del coach, tra le azioni (S6); se l'elenco Coach Yes già letto dice che non ce ne sono, niente lettura
    if (typeof CY !== 'undefined' && CY.letta && CY.di === c.user_id && !CY.ids.has(c.id)) LS.note = [];
    else {
      const { data, error } = await dbq('lettura note', supa.from('coach_note')
        .select('id, tipo_azione, testo, scritta_il').eq('contatto_id', c.id).eq('user_id', c.user_id).order('scritta_il', { ascending: false }));
      LS.note = error ? null : data;
    }
  }
  if (LS.sezione !== 'azioni' && LS.sezione !== 'coach') return;
  // il promemoria «Ti eri detto…» (cantiere 42): dalle azioni appena lette, lo stesso riquadro di MB Plan e della coda,
  // dentro l'azione ancora da completare (Ignazio 24/09: «aggiungilo anche nella scheda»)
  RICORDI[c.id] = MB21Coach.ricordi(LS.azioni.filter(a => a.contatto_id === c.id))[c.id] || null;
  PRIME_VOLTE[c.id] = !LS.azioni.some(a => a.contatto_id === c.id && a.esito);   // mai chiamato: la riga di preparazione prima della prima telefonata
  await batteriaCoach('preparazione_incontro');
  // Card stretta (Ignazio 24/09, «nel telefono è tutto molto lungo»): riga 1 tipo · modalità con la data a destra, riga 2 area · esito · nota.
  // Azione già chiusa: il blocco degli esiti resta vuoto e «Cambia esito» sta nella riga dei comandi; al tocco il blocco si apre lì sopra.
  // S6: l'azione chiusa aperta al tocco ha la ⌃ per richiuderla dentro la card, accanto alla data (niente più riga del titolo sopra)
  const testa = (titolo, a) => `<div class="testa"><div class="t">${titolo}</div><div class="q">${esc(MB21Lista.data(a.inizio, true))}${a.esito ? `<button class="az-su" data-az-apri="${esc(a.id)}" aria-label="Richiudi">⌃</button>` : ''}</div></div>`;
  const dettagli = parti => { const p = parti.filter(Boolean); return p.length ? `<div class="s">${p.join(' · ')}</div>` : ''; };
  const link = (attr, id, testo, rosso) => `<button class="link" ${attr}="${esc(id)}"${rosso ? ' style="color:var(--rosso)"' : ''}>${testo}</button>`;
  // Verifica Scheda contatto S3 (Ignazio 22/10): un'azione già chiusa (con l'esito) è UNA riga «data · tipo · esito ›»; al tocco si apre
  // la card di sempre (Modifica, Elimina, Cambia esito, note), con la ⌃ dentro (S6). L'azione ancora da fare resta aperta.
  const rigaChiusa = a => {
    const tipo = a.contatto_id !== c.id ? `Ha portato ${a.contatti ? a.contatti.nome : '—'}` : [a.tipo_azione, a.modalita].filter(Boolean).join(' · ');
    return `<button class="azione az-riga" data-az-apri="${esc(a.id)}"><small>${esc(MB21Lista.data(a.inizio, true))}</small>`
      + `<span>${esc([tipo, a.esito ? MB21Agenda.nomePasso(a.esito) : ''].filter(Boolean).join(' · '))}</span><em>›</em></button>`;
  };
  // S6 (Ignazio 22/10): ogni nota del coach è una riga gialla «Coach Yes · tipo ›» in mezzo alle azioni, al suo posto per data (scritta_il)
  const rigaNota = n => `<button class="azione az-riga az-coach" data-nota="${esc(n.id)}"><small>${esc(MB21Lista.data(n.scritta_il, true))}</small>`
    + `<span>Coach Yes · ${esc(n.tipo_azione || 'Nota')}</span><em>›</em></button>`;
  const voci = MB21Lista.azioniENote(LS.azioni, LS.note || []);
  box.innerHTML = piuHtml + (LS.note === null ? '<div class="avviso">Non riesco a caricare le note del coach.</div>' : '')
    + (voci.length ? `<div class="arancio ${classeCat(c.categoria)}">${voci.map(v => v.nota ? rigaNota(v.nota)
      : v.azione.esito && LS.azAperta !== v.azione.id ? rigaChiusa(v.azione) : cardAzione(v.azione)).join('')}</div>` : '<div class="vuoto">Nessuna azione.</div>');
  function cardAzione(a) {
    if (a.contatto_id !== c.id) return `
    <div class="azione">
      ${testa(`${ic('squadra')} Ha portato ${esc(a.contatti ? a.contatti.nome : '—')}`, a)}
      ${dettagli([esc(a.tipo_azione || ''), esc(a.modalita || ''), a.esito ? `<b>${esc(MB21Agenda.nomePasso(a.esito))}</b>` : ''])}
      <div class="comandi"><span class="stato-az"></span>${link('data-modifica-azione', a.id, 'Modifica')}</div>
    </div>`;
    const blocco = bloccoEsiti(a, c.categoria);
    const chiusa = blocco.includes('data-apri-esiti');
    return `
    <div class="azione">
      ${testa(esc([a.tipo_azione, a.modalita].filter(Boolean).join(' · ')), a)}
      ${dettagli([esc(a.area || ''), a.esito ? `<b>${esc(MB21Agenda.nomePasso(a.esito))}</b>` : '', esc(a.note || '')])}
      ${a.ospite ? `<div class="s">Ospite: ${esc(a.ospite)}</div>` : ''}
      ${a.portatoNome && a.portato_da !== c.id ? `<div class="s">${rigaPortato(a.portatoNome)}</div>` : ''}
      ${a.esito ? '' : ricordoHtml(c.id, c.nome)}
      ${a.esito || a.tipo_azione !== 'Contatto' || (a.modalita && a.modalita !== 'Telefonata') ? preparaPresentazioneHtml(a) : preparaChiamataHtml(c.id)}
      ${chiusa ? `<div class="blocco-esiti" data-blocco="${esc(a.id)}"></div>` : blocco}
      <div class="comandi">${statoAzione(a)}${chiusa ? link('data-cambia-esito', a.id, 'Cambia esito') : ''}${MB21Agenda.eConsegna(a) ? '' : link('data-modifica-azione', a.id, 'Modifica')}${link('data-elimina-azione', a.id, 'Elimina', true)}</div>
    </div>`;
  }
  box.querySelectorAll('[data-nota]').forEach(b => b.onclick = () => leggiNota(LS.note.find(n => n.id === b.dataset.nota), quandoNota));
  box.querySelectorAll('[data-az-apri]').forEach(b => b.onclick = () => { LS.azAperta = LS.azAperta === b.dataset.azApri ? null : b.dataset.azApri; sezioneAzioni(); });
  const piu = document.getElementById('azione-piu');
  if (piu) piu.onclick = azionePiu;
  const dopo = async () => { LS.azioni = null; await ricaricaERidisegna(); };
  const collega = div => collegaEsiti(div, LS.azioni.find(x => x.id === div.dataset.blocco), c, dopo);
  box.querySelectorAll('.blocco-esiti[data-blocco]').forEach(collega);
  box.querySelectorAll('[data-cambia-esito]').forEach(b => b.onclick = () => {   // stesso blocco dell'Agenda, aperto sul posto
    const a = LS.azioni.find(x => x.id === b.dataset.cambiaEsito);
    const vuoto = box.querySelector(`.blocco-esiti[data-blocco="${a.id}"]`);
    if (!vuoto) return;
    vuoto.outerHTML = bloccoEsiti(a, c.categoria, true);
    b.remove();
    collega(box.querySelector(`.blocco-esiti[data-blocco="${a.id}"]`));
  });
  box.querySelectorAll('[data-modifica-azione]').forEach(b => b.onclick = () => foglioAzione(b.dataset.modificaAzione, { dopo: async () => { LS.azioni = null; await ricaricaERidisegna(); } }));
  box.querySelectorAll('[data-elimina-azione]').forEach(b => b.onclick = () => { if (!soloGuardo()) eliminaAppuntamento(LS.azioni.find(x => x.id === b.dataset.eliminaAzione), dopo); });
}

// «＋ Nuova azione» (Ignazio 17/09, allora «Azione +»): apre subito «Nuovo appuntamento» con la persona già scelta e tutti i tipi della sua categoria.
// Gli esiti rapidi della coda restano in Dashboard.
async function azionePiu() {
  if (soloGuardo()) return;
  const c = LS.contatto;
  // S5c (nota Pagine 072, Ignazio 22/10: «se non hai dati, bisogna partire dai dati e dalla categoria; eventualmente poi azioni»): senza categoria
  // si apre «Modifica» con la categoria da scegliere; salvata con una categoria, prosegue da sola con «Nuova azione». Chiuso senza salvare: niente.
  if (!MB21Agenda.tipiPer(c.categoria).length) return apriModulo(c, { poiAzione: true });
  // S6 (Ignazio 22/10: la nota del coach di solito viene prima dell'azione): la prima scelta è «Nota del coach», poi i tipi di sempre
  if (COACH_YES) {
    const v = await sceltaDa('Nuova azione', [{ id: 'nota', etichetta: 'Nota del coach (prima dell\'azione)', icona: 'libro' },
      { id: 'azione', etichetta: 'Telefonata, Piano Marketing, Follow Up…', icona: 'agenda' }]);
    if (!v) return;
    if (v.id === 'nota') return notaCoach(null);
  }
  const creato = await nuovoAppuntamento({ contatto: { id: c.id, nome: c.nome, categoria: c.categoria }, resta: true });
  if (!creato) return;
  LS.azioni = null;
  await ricaricaERidisegna();
  tracciaDiApertura(creato, c, null);   // un Piano Marketing a un candidato: «Hai condiviso la traccia di apertura?» (01/10)
  mostraToast(MB21Agenda.avvisoFissato(creato), async () => {   // una telefonata scelta a mano (nota 012): «in coda», non «fissato»
    await dbqAvvisa('annulla nuovo', supa.from('azioni').delete().eq('id', creato.id), 'Annullamento non riuscito: controlla la connessione e riprova.');
    LS.azioni = null;
    await ricaricaERidisegna();
  });
}

const TIPI_COACH = ['Contatto', 'Piano Marketing', 'Follow Up', 'Appuntamento', 'Counseling', 'Avvio', 'Consulenza PRD'];

// Le note del coach (S4, poi S6 Ignazio 22/10): righe gialle tra le azioni; si scrivono da «+ Nuova azione» → «Nota del coach». Il segno Coach Yes
// accanto al nome (coda, Agenda) apre il suo foglio come prima (foglioCoachYes in index.html). Tutto dietro COACH_YES (index.html).
const quandoNota = iso => new Date(iso).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function leggiNota(n, quando) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto mc">
    <div class="mc-testa ${classeCat(LS.contatto && LS.contatto.categoria)}"><span class="ts-pastiglia">${ic('libro')}</span>
      <div><small>Nota del Coach</small><b>${esc(quando(n.scritta_il))}</b></div>
      <button id="chiudi" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <div class="riquadro mc-g" style="margin-top:14px">
      ${n.tipo_azione ? `<p class="sotto" style="margin:0 0 8px">${esc(n.tipo_azione)}</p>` : ''}
      <div class="testo-nota">${esc(n.testo)}</div></div>
    ${soloGuardo() ? '' : `<button class="link elimina-qui" id="elimina-nota">${ic('elimina')} Elimina nota</button>`}
    <div class="mc-fondo"><button class="link" id="chiudi2">Chiudi</button><button class="primario" id="modifica-nota">Modifica</button></div>
  </div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = e => { if (e.target === velo) chiudi(); };
  velo.querySelector('#chiudi').onclick = chiudi;
  velo.querySelector('#chiudi2').onclick = chiudi;
  velo.querySelector('#modifica-nota').onclick = () => { chiudi(); notaCoach(n); };
  const el = velo.querySelector('#elimina-nota');
  if (el) el.onclick = () => { chiudi(); eliminaNota(n); };
}

// Nota Pagine 033 (feedback di Fiammetta, 06/10/2026): la nota del Coach si cancella, dalla lettura o da «Modifica nota», dopo una conferma
async function eliminaNota(n) {
  if (soloGuardo()) return;
  if (!await chiediConferma('Eliminare questa nota?', 'Non si può tornare indietro.', 'Elimina', true)) return;
  const { error } = await dbq('elimina nota coach', supa.from('coach_note').delete().eq('id', n.id));
  if (error) return mostraToast('Non eliminata: riprova.');
  LS.note = null;
  if (typeof CY !== 'undefined') CY.letta = 0;   // il segnale Coach Yes sparisce se era l'ultima
  mostraToast('Nota eliminata.');
  disegnaScheda();
}

async function notaCoach(n) {
  if (soloGuardo()) return;
  const valori = await moduloSemplice(n ? 'Modifica nota' : 'Nuova nota Coach', [
    { k: 'tipo', etichetta: 'Tipo di azione', tipo: 'select', opzioni: TIPI_COACH, valore: n ? n.tipo_azione : 'Contatto' },
    { k: 'testo', etichetta: 'Testo', tipo: 'textarea', valore: n ? n.testo : '', obbligatorio: true, manca: 'Scrivi la nota', righe: 10 },
  ], { persona: LS.contatto, ...(n ? { elimina: 'Elimina nota' } : {}) });
  if (!valori) return;
  if (valori === 'elimina') return eliminaNota(n);
  const riga = { tipo_azione: valori.tipo, testo: valori.testo.trim() };
  const q = n ? supa.from('coach_note').update(riga).eq('id', n.id)
    : supa.from('coach_note').insert({ ...riga, contatto_id: LS.contatto.id, user_id: LS.contatto.user_id });
  const { error } = await dbq('nota coach', q);
  if (error) return mostraToast('Non salvata: riprova.');
  LS.note = null;
  if (typeof CY !== 'undefined') CY.letta = 0;   // nota 001: il segnale Coach Yes si rilegge
  disegnaScheda();
}

function sezioneOnboarding() {
  const c = LS.contatto;
  const box = document.getElementById('sezione');
  const fermo = false;   // fino al 05/10 un archiviato aveva l'Avvio bloccato; ora si lavora come gli altri
  const disegna = () => {
    const { fatti, totale } = MB21Lista.contatoreOnboarding(c);
    const prossimo = MB21Lista.prossimoPasso(c), a = LS.avvio && LS.avvio.id === c.id ? LS.avvio : null;
    const perche = Object.fromEntries(MB21Lista.proposteAvvio(c, a && a.sa).map(p => [p.col, p.perche]));   // l'app propone, chi spunta decide
    const entrato = a && a.ingresso ? `Ingresso in Amway: ${MB21Lista.data(a.ingresso)} · ${MB21Lista.entratoDa(a.ingresso, MB21Coda.oggiRoma())}` : '';
    box.innerHTML = `
      <div class="riquadro"><div style="display:flex;justify-content:space-between;font-weight:700">
        <span>Passi di base per il successo</span><span id="conta-onb">${fatti}/${totale}</span></div>
        <div class="barra"><div style="width:${Math.round(fatti / totale * 100)}%"></div></div>
        <div class="avvio-prossimo">${prossimo ? `${ic('prossimo')} Prossimo passo: <b>${esc(prossimo.nome)}</b> <small>${esc(prossimo.descr)}</small>` : ic('complimenti') + ' Tutti i passi sono fatti'}</div>
        ${entrato ? `<div class="sotto" style="margin:4px 0 0">${esc(entrato)}</div>` : ''}</div>
      ${a && a.altra ? `<div class="avviso">Per «Partner da avviare» vale la scheda nella lista di <b>${esc(a.altra.lista || 'un upline')}</b> (lo sponsor, seguendo la mappa Amway): i passi segnati qui lì non si vedono.
        ${a.altra.mia ? '<button class="link" id="avvio-altra" style="display:block;padding:6px 0 0">Apri quella scheda ›</button>' : ''}</div>` : ''}
      <div class="riquadro">${MB21Lista.PASSI_ONBOARDING.map(([col, nome, descr]) => `
        <label class="interruttore"><span><b>${esc(nome)}</b><small>${esc(descr)}</small>${col === 'onb_sogno' && a ? percheIniziareHtml(a.perche) : ''}${perche[col] ? `<small class="avvio-proposta">${ic('propone')} L'app propone: ${esc(perche[col])}</small>` : ''}</span>
          <input type="checkbox" data-passo="${col}" ${c[col] ? 'checked' : ''} ${fermo ? 'disabled' : ''}></label>`).join('')}
      </div>
      ${fermo || !a ? '' : a.concluso
        ? `<div class="riquadro"><b>${ic('fatto')} Avvio concluso il ${MB21Lista.data(a.concluso)}</b>
            <div class="sotto" style="margin:4px 0 8px">Non è più tra i partner da avviare. I passi restano qui.</div>
            <button class="link" id="avvio-riapri" style="padding:0">Riapri l'avvio</button></div>`
        : a.pausa
        ? `<div class="riquadro"><b>${ic('pausa')} Avvio in pausa dal ${MB21Lista.data(a.pausa)}</b>
            <div class="sotto" style="margin:4px 0 8px">Fermo per ora: non è tra i partner da avviare, lo ritrovi in fondo a quella pagina. I passi restano qui.</div>
            <button class="link" id="avvio-riprendi" style="padding:0">${ic('riprendi')} Riprendi l'avvio</button>
            ${MB21Lista.pausaLunga({ avvio_in_pausa_dal: a.pausa }, MB21Coda.oggiRoma()) ? `<div class="sotto" style="margin:10px 0 4px">In pausa da più di un anno: alla ripresa l'avvio si rifà da capo.</div>
              <button class="link" id="avvio-dacapo" style="padding:0">${ic('aggiorna')} Riprendi da capo (i 14 passi tornano da fare)</button>` : ''}</div>`
        : `<div class="riquadro"><button class="primario" id="avvio-concludi">${ic('fatto')} Avvio concluso</button>
            <div class="sotto" style="margin:8px 0 12px">Quando il partner cammina da solo: la riga in alto diventa «${ic('fatto')} Avvio concluso». Si può sempre riaprire.</div>
            <button class="link" id="avvio-pausa" style="padding:0">${ic('pausa')} Metti in pausa</button>
            <div class="sotto" style="margin:4px 0 0">Se per ora è fermo: esce dai partner da avviare finché non lo riprendi. Chi si è ritirato davvero cambia categoria con «Modifica».</div></div>`}`;
    // campo: 'concluso' (avvio_concluso_il) o 'pausa' (avvio_in_pausa_dal); giorno vuoto = riaperto / ripreso
    const segna = async (campo, giorno) => {
      if (soloGuardo()) return;
      const colonna = campo === 'pausa' ? 'avvio_in_pausa_dal' : 'avvio_concluso_il';
      const { error } = await dbq('avvio ' + campo, supa.from('contatti').update({ [colonna]: giorno }).eq('id', c.id));
      if (error) return mostraToast('Non salvato: riprova.');
      LS.avvio = { ...LS.avvio, [campo]: giorno };
      if (giorno) LS.sezione = MB21Lista.sezioneIniziale(c);
      disegnaScheda();
      const cosa = campo === 'pausa' ? (giorno ? 'in pausa' : 'ripreso') : (giorno ? 'concluso' : 'riaperto');
      mostraToast(`Avvio di ${c.nome} ${cosa}`, giorno ? () => segna(campo, null) : null);
    };
    const altraScheda = document.getElementById('avvio-altra');
    if (altraScheda) altraScheda.onclick = async () => {
      await apriContattoDa(a.altra.id, LS.ritorno);
      if (LS.contatto && LS.contatto.id === a.altra.id) { LS.sezione = 'onboarding'; disegnaScheda(); }
    };
    const concludi = document.getElementById('avvio-concludi'), riapri = document.getElementById('avvio-riapri');
    if (concludi) concludi.onclick = () => segna('concluso', MB21Coda.oggiRoma());
    if (riapri) riapri.onclick = () => segna('concluso', null);
    const pausa = document.getElementById('avvio-pausa'), riprendi = document.getElementById('avvio-riprendi');
    if (pausa) pausa.onclick = () => segna('pausa', MB21Coda.oggiRoma());
    if (riprendi) riprendi.onclick = () => segna('pausa', null);
    // Riprendi da capo (pausa di più di un anno): toglie la pausa e spegne i 14 passi; Annulla rimette tutto com'era
    const dacapo = document.getElementById('avvio-dacapo');
    if (dacapo) dacapo.onclick = async () => {
      if (soloGuardo()) return;
      const prima = { avvio_in_pausa_dal: a.pausa, ...Object.fromEntries(MB21Lista.PASSI_ONBOARDING.map(([col]) => [col, c[col] === true])) };
      const metti = async (campi, annulla) => {
        const { error } = await dbq('avvio da capo', supa.from('contatti').update(campi).eq('id', c.id));
        if (error) return mostraToast('Non salvato: riprova.');
        const { avvio_in_pausa_dal, ...passi } = campi;
        Object.assign(c, passi);
        const riga = LS.righe.find(x => x.id === c.id);
        if (riga) Object.assign(riga, passi);
        LS.avvio = { ...LS.avvio, pausa: avvio_in_pausa_dal };
        disegnaScheda();
        mostraToast(annulla ? `Avvio di ${c.nome} ripreso da capo: 14 passi da fare` : `Avvio di ${c.nome}: rimesso com'era`, annulla ? () => metti(prima, false) : null);
      };
      metti({ avvio_in_pausa_dal: null, ...MB21Lista.PASSI_SPENTI() }, true);
    };
    box.querySelectorAll('[data-passo]').forEach(i => i.onchange = async () => {
      if (soloGuardo()) { i.checked = !i.checked; return; }
      const col = i.dataset.passo;
      const { error } = await dbq('onboarding', supa.from('contatti').update({ [col]: i.checked }).eq('id', c.id));
      if (error) { i.checked = !i.checked; return mostraToast('Non salvato: riprova.'); }
      c[col] = i.checked;
      const riga = LS.righe.find(x => x.id === c.id);
      if (riga) riga[col] = i.checked;
      disegna();
      mostraAvvio(c);
    });
  };
  disegna();
}

// Segni Vitali sulla persona (cantiere 18): compagno/a, biglietti BBS e WES, CEP.
// Compagno/a: una scheda della lista collegata nei due sensi (`collega_compagno`) oppure nome e telefono a mano.
// Con la scheda collegata i biglietti e il CEP della coppia si vedono e si modificano da tutte e due le schede.
// Biglietti, CEP e date dei BBS li scrive solo l'Admin; il compagno/a chi può modificare il contatto.
// Nome per un confronto esatto senza maiuscole (ilike senza caratteri jolly)
const nomeEsatto = nome => String(nome || '').trim().replace(/[\\%_]/g, x => '\\' + x);

// Nota 094 S1: con la scheda ufficiale (un'altra, quella del codice Amway) biglietti e CEP si leggono da quella, così scheda e Mappa accendono le stesse luci;
// per scrivere resta il rimando (SV.ufficiale). SV.persona = la scheda dei segni (questa, o l'ufficiale); SV.idsBig / SV.idsCep = le schede lette.
// S3: le date di BBS e WES dalla lettura comune (nota 081), non più a ogni scheda.
async function caricaSegni(c, giaUfficiale = false) {
  const { data: ana, error } = await dbq('compagno', supa.from('contatti')
    .select('compagno_id, compagno_nome, compagno_telefono, codice_amway').eq('id', c.id).maybeSingle());
  if (error || !ana) throw error || new Error('contatto');
  // Regola di Ignazio (16/09): i Segni Vitali di una persona si scrivono su una scheda sola.
  // Per un partner vale la scheda col codice Amway: se è un'altra (stesso nome, altra lista) questa rimanda lì
  let ufficiale = null;
  if (eAdmin() && c.user_id !== ST.utente.id) {
    // Scelta A di Ignazio (16/09): con le schede a cascata i Segni Vitali di un partner si scrivono sulla scheda nella lista dell'Admin
    let q = supa.from('contatti').select('id').eq('user_id', ST.utente.id).neq('id', c.id);
    q = ana.codice_amway ? q.eq('codice_amway', ana.codice_amway) : q.not('codice_amway', 'is', null).ilike('nome', nomeEsatto(c.nome));
    const r = await dbq('scheda dell\'Admin', q.limit(1));
    if (r.data && r.data.length) ufficiale = { id: r.data[0].id, user_id: ST.utente.id, lista: ST.utente.nome };
  } else if (!ana.codice_amway) {
    const r = await dbq('scheda col codice', supa.from('contatti').select('id, user_id, utenti(nome)')
      .not('codice_amway', 'is', null).neq('id', c.id).ilike('nome', nomeEsatto(c.nome)).limit(1));
    if (r.data && r.data.length) ufficiale = { id: r.data[0].id, user_id: r.data[0].user_id, lista: r.data[0].utenti ? r.data[0].utenti.nome : '' };
  }
  if (ufficiale && !giaUfficiale) {   // S1: i segni sono quelli della scheda ufficiale (una volta sola: quella ha il codice)
    const U = await caricaSegni({ id: ufficiale.id, nome: c.nome, user_id: ufficiale.user_id }, true);
    return { ...U, id: c.id, ufficiale };
  }
  let compagno = null;
  if (ana.compagno_id) {
    const r = await dbq('scheda del compagno', supa.from('contatti').select('id, nome, categoria').eq('id', ana.compagno_id).is('eliminato_il', null).maybeSingle());
    compagno = r.data || null;
  }
  const ids = [c.id, compagno && compagno.id].filter(Boolean);
  // nota 069 (Ignazio 22/10/2026: «il CEP è unico perché va per codice»): il CEP si legge anche dalle altre schede con lo stesso codice Amway
  // (il caso del 22/10: il CEP era segnato su una sola delle schede con quel codice); i biglietti restano della persona
  let idsCep = ids;
  if (ana.codice_amway) {
    const sc = await dbq('schede con lo stesso codice', supa.from('contatti').select('id').eq('codice_amway', ana.codice_amway).is('eliminato_il', null));
    if (!sc.error && Array.isArray(sc.data)) idsCep = [...new Set([...ids, ...sc.data.map(x => x.id)])];
  }
  const [big, cep, bbs, wes] = await Promise.all([
    dbq('biglietti', supa.from('biglietti').select('*').in('contatto_id', ids)),
    dbq('cep', supa.from('cep').select('*').in('contatto_id', idsCep).order('dal', { ascending: false })),
    lettaComune('bbs'),
    lettaComune('wes'),
  ]);
  if (big.error || cep.error || bbs.error || wes.error) throw big.error || cep.error || bbs.error || wes.error;
  return { id: c.id, persona: c.id, idsBig: ids, idsCep, ana, compagno, ufficiale, biglietti: big.data, cep: cep.data, cepNuovo: false,
    date: { BBS: bbs.data.map(x => x.data), WES: wes.data.map(x => x.data) },
    attivi: { bbs: MB21Lista.eventoAttivo(bbs.data), wes: MB21Lista.eventoAttivo(wes.data) } };
}

// Targhetta 📱 dell'app, bianca e senza colore (cantiere 20 lavoro 4): uso = { ultimo_uso } dell'utente, vuoto = non ha l'app.
// Stessa targhetta in Mappa, card della Lista e scheda contatto.
function targaAppHtml(uso) {
  return uso ? `<span class="sv-targa app" title="Ultimo uso dell'app">${ic('app')} ${MB21Mappa.etichettaUso(uso.ultimo_uso, MB21Coda.oggiRoma())}</span>` : '';
}
// t: accese sì/no · numeri (facoltativo): un numero scritto dentro la targhetta se sopra zero (nota 094 S4: la Mappa non lo usa più, lo scrive fuori)
// opz (nota Pagine 070): accese = solo quelle accese (le card della Lista) · tasto = per l'Admin si toccano (`toccaTarga`), chi = codice della riga della Mappa
function targheHtml(t, numeri, opz = {}) {
  return ['wes', 'bbs', 'cep'].filter(k => !opz.accese || (t && t[k])).map(k => {   // nota 098 (Ignazio 26/10): WES · BBS · CEP, in quest'ordine in tutta l'app
    const testo = `${k.toUpperCase()}${numeri && numeri[k] ? ' ' + numeri[k] : ''}`, on = t && t[k] ? 'on' : '';
    return opz.tasto
      ? `<button class="sv-targa tasto ${k} ${on}" data-targa="${k}"${opz.chi ? ` data-chi="${esc(opz.chi)}"` : ''} aria-label="${k.toUpperCase()}: ${on ? 'chi ce l\'ha' : k === 'cep' ? 'è abbonato?' : 'ha il biglietto?'}">${testo}</button>`
      : `<span class="sv-targa ${k} ${on}">${testo}</span>`;
  }).join('');
}
// Le targhette si toccano solo dove l'Admin può scrivere (con Partner Select «Tutti» si guarda soltanto)
const targheDaToccare = () => eAdmin() && !soloLettura();
// Acceso/spento dai segni letti della scheda (S6: ognuno con il SUO posto sul biglietto); anche la card del compagno/a collegato, con il suo
const targheDellaPersona = (SV, id) => MB21Lista.targheSegni(SV.biglietti, SV.cep, MB21Coda.oggiRoma(), SV.attivi, b => b.contatto_id === id);
const targheDi = SV => targheDellaPersona(SV, SV.persona);
function ricordaTarghe(SV) {
  const t = targheDi(SV);
  LS.targhe = LS.targhe || {};
  LS.targhe[SV.id] = t;
  if (SV.compagno) LS.targhe[SV.compagno.id] = targheDellaPersona(SV, SV.compagno.id);
  return t;
}
function mostraTarghe(SV) {
  const el = document.getElementById('sv-targhe');
  if (!SV || !LS.contatto || SV.id !== LS.contatto.id) return;
  const t = ricordaTarghe(SV);
  if (!el) return;
  el.innerHTML = targaAppHtml(INVITO_APP ? LS.contatto.app || (LS.usoApp && LS.usoApp[SV.id]) : null) + targaAccountHtml(LS.contatto.categoria, accountDellaScheda(LS.contatto))
    + (segniInAlto(LS.contatto.categoria, t) ? targheHtml(t, null, { tasto: targheDaToccare() }) : '');
  // nota 070: dalla testata lo stesso foglio della Mappa; dopo, testata e linguetta «Segni Vitali» (se aperta) si ridisegnano con i segni nuovi
  el.querySelectorAll('[data-targa]').forEach(b => { b.onclick = () => toccaTarga(LS.contatto, b.dataset.targa, S => {
    if (!LS.contatto || LS.contatto.id !== S.id) return;
    mostraTarghe(S);
    if (LS.sezione === 'segni') sezioneSegni();
  }); });
}
function segniDellaScheda(c) {   // una lettura sola per scheda: targhette e sezione la condividono
  if (LS.sv && LS.sv.id === c.id) return Promise.resolve(LS.sv);
  if (LS.svLettura && LS.svLettura.id === c.id) return LS.svLettura.promessa;
  const promessa = caricaSegni(c).then(SV => { if (LS.contatto && LS.contatto.id === c.id) LS.sv = SV; return SV; })
    .finally(() => { if (LS.svLettura && LS.svLettura.promessa === promessa) LS.svLettura = null; });
  LS.svLettura = { id: c.id, promessa };
  return promessa;
}

// ── Nota Pagine 070 (Ignazio 24/10/2026: biglietti BBS · WES · CEP senza una squadra che li segna) ──
// Per l'Admin le targhette della Mappa e della testata della scheda sono tasti, con questa sola funzione. Grigia → il foglio «Ha il biglietto?»
// (lo stesso della Dashboard e del Profilo: lui, compagno/a, ospiti) o, per il CEP, «È abbonato al CEP?»; accesa → chi ce l'ha e «Togli».
// Acceso o spento lo dice la lettura fresca della scheda (caricaSegni, la stessa della linguetta «Segni Vitali», che resta per i mesi passati), non il colore
// sullo schermo. c = { id, nome, user_id } della scheda · k = 'bbs' | 'wes' | 'cep' · dopo(SV) ridisegna chi ha chiamato (Lista e Check si allineano da soli).
// opz.fresca (nota 094 S3, dalla Mappa): la lettura sempre fresca, anche se la scheda è ancora in memoria
async function toccaTarga(c, k, dopo, opz = {}) {
  if (!c || !eAdmin() || soloGuardo()) return;
  let SV;
  try { SV = !opz.fresca && LS.contatto && LS.contatto.id === c.id ? await segniDellaScheda(c) : await caricaSegni(c); } catch (e) { return mostraToast('Segni Vitali non caricati: riprova.'); }
  if (SV.ufficiale) {   // la regola del 16/09: i segni di un partner si scrivono su una scheda sola, quella col codice Amway nella lista dell'Admin
    if (await chiediConferma('I Segni Vitali si scrivono su una scheda sola', `Quella di ${c.nome} collegata al codice Amway, nella lista di ${SV.ufficiale.lista || 'un altro partner'}.`, 'Apri quella scheda')) {
      await apriContattoDa(SV.ufficiale.id, LS.contatto && LS.contatto.id === c.id ? LS.ritorno : 'mappa');
    }
    return;
  }
  const L = MB21Lista, oggi = MB21Coda.oggiRoma(), t = targheDi(SV);
  const fatto = testo => {
    if (testo) mostraToast(testo);   // dopo «Ha il biglietto?» il «Biglietto segnato» lo dice già rispondiBiglietto
    if (LS.sv && LS.sv.id === SV.id && LS.sv !== SV) LS.sv = null;   // la scheda, se si riapre, rilegge
    ricordaTarghe(SV);   // la card nella Lista Nomi
    dopo(SV);
  };
  const velo = document.createElement('div');
  velo.className = 'velo';
  const chiudi = () => velo.remove();
  const apri = html => { velo.innerHTML = `<div class="foglio">${html}</div>`; document.body.appendChild(velo); velo.onclick = e => { if (e.target === velo) chiudi(); }; };

  if (k === 'cep') {
    if (!t.cep) {
      const mese = new Date(oggi + 'T12:00:00Z').toLocaleDateString('it-IT', { month: 'long', timeZone: 'UTC' });
      if (!await chiediConferma('È abbonato al CEP?', `L'abbonamento audio. ${c.nome}: la targhetta si accende dal 1° di ${mese}. Quando non rinnova, la tocchi di nuovo e «Non ha rinnovato».`, 'Sì, accendi il CEP')) return;
      const p = L.cepDaAccendere(SV.cep, oggi), errore = L.controllaPeriodoCep(SV.cep, { id: p.id || null, dal: p.dal, uscito_il: null });
      if (errore) return mostraToast(errore + ': guarda in «Segni Vitali» nella scheda');
      const riga = { uscito_il: null, aggiornato_il: new Date().toISOString() };
      const { data, error } = await dbq('accendo il CEP dalla targhetta', p.id ? supa.from('cep').update(riga).eq('id', p.id).select().single()
        : supa.from('cep').insert({ ...riga, contatto_id: c.id, dal: p.dal }).select().single());
      if (error) return mostraToast('Non salvato: riprova.');
      SV.cep = [data, ...SV.cep.filter(x => x.id !== data.id)].sort((a, b) => b.dal.localeCompare(a.dal));
      return fatto('CEP acceso');
    }
    const via = L.cepDaTogliere(SV.cep, oggi);
    apri(`<h3>${ic('fatto')} CEP · ${esc(c.nome)}</h3>
      <p>Abbonato ${esc(L.descrizioneCep(SV.cep, oggi).replace(' · abbonato fino', ', fino'))}.</p>
      <p class="sotto" style="margin:0">${via.elimina ? 'Il periodo è cominciato questo mese: «Non ha rinnovato» lo cancella.' : `«Non ha rinnovato» lo chiude al ${esc(L.data(via.uscito_il))}: i mesi passati restano.`}</p>
      <div class="due"><button class="link" id="tg-via" style="color:var(--rosso)">Non ha rinnovato</button><button class="link" id="tg-no">Chiudi</button></div>`);
    velo.querySelector('#tg-no').onclick = chiudi;
    velo.querySelector('#tg-via').onclick = async e => {
      e.target.disabled = true;
      const { error } = await dbq('tolgo il CEP dalla targhetta', via.elimina ? supa.from('cep').delete().eq('id', via.id)
        : supa.from('cep').update({ uscito_il: via.uscito_il, aggiornato_il: new Date().toISOString() }).eq('id', via.id));
      if (error) { e.target.disabled = false; return mostraToast('Non tolto: riprova.'); }
      SV.cep = via.elimina ? SV.cep.filter(x => x.id !== via.id) : SV.cep.map(x => (x.id === via.id ? { ...x, uscito_il: via.uscito_il } : x));
      chiudi(); fatto('CEP chiuso');
    };
    return;
  }

  const tipo = k.toUpperCase(), evento = SV.attivi[k];
  if (!evento) return mostraToast(`Nessun ${tipo} in vendita: le date si aggiungono nella pagina Admin`);
  segnaBiglietto(c, SV, tipo, evento, fatto);
}

// Nota 094 S2 e S6: il biglietto di una persona per un evento, un foglio solo (la domanda della Dashboard e del Profilo, domandaBigliettoHtml) dalla
// targhetta e da «+ Biglietto» della linguetta. I tasti «Personale» e «Compagno/a» (più gli ospiti) si accendono ognuno da solo; con il biglietto già
// segnato si vedono come sono e si corregge con «Salva» (prima: «toglilo e segnalo di nuovo»); «Togli il biglietto» toglie solo il posto di questa persona.
// Il biglietto della coppia è uno per evento: sta sulla scheda di chi lo aveva già (questa o quella del compagno/a collegato), se no su questa.
// fatto(testo) ridisegna chi ha aperto il foglio.
async function segnaBiglietto(c, SV, tipo, evento, fatto) {
  const L = MB21Lista, altro = SV.compagno ? SV.compagno.id : null;
  const suoi = SV.biglietti.filter(b => b.tipo === tipo && b.evento === evento && (b.contatto_id === c.id || (altro && b.contatto_id === altro)));
  const mio = suoi.find(b => b.contatto_id === c.id), suo = altro ? suoi.find(b => b.contatto_id === altro) : null;
  const personale = suoi.some(b => L.postoSuo(b, b.contatto_id === c.id));
  const delCompagno = suoi.some(b => (altro ? L.postoSuo(b, b.contatto_id === altro) : b.compagno));
  const giaSegnato = suoi.some(b => L.postiBiglietto(b));
  const velo = document.createElement('div');
  velo.className = 'velo';
  const chiudi = () => velo.remove();
  velo.innerHTML = `<div class="foglio">${domandaBigliettoHtml({ tipo, evento, chi: c.nome, compagno: SV.compagno ? SV.compagno.nome : SV.ana.compagno_nome,
    personale: giaSegnato ? personale : true, conCompagno: delCompagno, ospiti: suoi.reduce((n, b) => n + (Number(b.ospiti) || 0), 0), modifica: giaSegnato }, 'pf-domanda')}</div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) chiudi(); };
  const aggiorna = righe => { SV.biglietti = [...SV.biglietti.filter(b => !suoi.includes(b)), ...righe]; };
  const salva = async x => {
    if (x.contatto && !personale && !await bigliettoNonDoppio(c, SV, tipo, evento)) return null;
    const riga = { contatto: x.contatto, compagno: x.compagno, ospiti: x.ospiti };
    // sulla scheda del compagno/a i due posti si leggono al contrario (il suo «Personale» è il «Compagno/a» di questa persona)
    const r = await dbq('biglietto', mio ? supa.from('biglietti').update(riga).eq('id', mio.id).select().single()
      : suo ? supa.from('biglietti').update({ contatto: x.compagno, compagno: x.contatto, ospiti: x.ospiti }).eq('id', suo.id).select().single()
      : supa.from('biglietti').insert({ contatto_id: c.id, tipo, evento, ...riga }).select().single());
    if (r.error) return { error: { message: r.error.code === '23505' ? 'Questo biglietto c\'è già' : 'Non salvato: riprova.' } };
    if (mio && suo) {   // due biglietti della coppia per lo stesso evento (di prima): resta quello di questa scheda, con tutto
      const via = await dbq('biglietto doppio della coppia', supa.from('biglietti').delete().eq('id', suo.id));
      if (via.error) { aggiorna([r.data, suo]); return { error: { message: 'Non salvato del tutto: riprova.' } }; }
    }
    aggiorna([r.data]);
    return { error: null };
  };
  collegaDomandaBiglietto(velo, ok => { chiudi(); if (ok !== false) fatto(''); }, salva);
  const togli = velo.querySelector('[data-togli]');
  if (togli) togli.onclick = async () => {
    togli.disabled = true;
    const restano = [];
    for (const b of suoi) {
      const campo = b.contatto_id === c.id ? 'contatto' : altro ? 'compagno' : null;
      if (!campo || !b[campo]) { restano.push(b); continue; }
      const dopo = { ...b, [campo]: false };
      const r = dopo.contatto || dopo.compagno
        ? await dbq('tolgo un posto dal biglietto', supa.from('biglietti').update({ [campo]: false }).eq('id', b.id).select().single())
        : await dbq('tolgo il biglietto', supa.from('biglietti').delete().eq('id', b.id));   // nessuno dei due: via anche gli ospiti
      if (r.error) { togli.disabled = false; aggiorna([...restano, ...suoi.slice(suoi.indexOf(b))]); return mostraToast('Non tolto: riprova.'); }
      if (r.data) restano.push(r.data);
    }
    aggiorna(restano);
    chiudi(); fatto('Biglietto tolto');
  };
}
// Chi c'è su un biglietto, a parole: «Persona A · Persona C · 2 ospiti» (la coppia collegata, o il compagno/a scritto a mano)
function personeDelBiglietto(c, SV, b) {
  const suo = b.contatto_id === c.id ? c.nome : SV.compagno && SV.compagno.id === b.contatto_id ? SV.compagno.nome : '';
  const altro = SV.compagno ? (b.contatto_id === c.id ? SV.compagno.nome : c.nome) : SV.ana.compagno_nome || 'compagno/a';
  return [b.contatto ? suo : '', b.compagno ? altro : '', b.ospiti ? `${b.ospiti} ospit${b.ospiti === 1 ? 'e' : 'i'}` : ''].filter(Boolean).join(' · ');
}
// Stessa persona (stesso nome) con un biglietto per questo evento in un'altra scheda: si avvisa (Ignazio 16/09). true = si va avanti.
// La usano «+ Biglietto» della linguetta «Segni Vitali» e le targhette (nota 070).
async function bigliettoNonDoppio(c, SV, tipo, evento) {
  const doppi = await dbq('biglietti con lo stesso nome', supa.from('biglietti').select('contatto_id, contatti!inner(nome, utenti(nome))')
    .eq('tipo', tipo).eq('evento', evento).ilike('contatti.nome', nomeEsatto(c.nome)).limit(5));
  const altrove = (doppi.data || []).filter(x => !SV.biglietti.some(b => b.contatto_id === x.contatto_id));
  if (!altrove.length) return true;
  const liste = [...new Set(altrove.map(x => (x.contatti && x.contatti.utenti ? x.contatti.utenti.nome : 'un altro partner')))].join(', ');
  return chiediConferma('Lo aggiungo lo stesso?', `${c.nome} ha già un biglietto ${tipo} ${MB21Lista.etichettaEvento(evento)} nella lista di ${liste}.`, 'Aggiungi');
}

// Foglio per scegliere una scheda della lista di `userId` (compagno/a, partner della Mappa).
// opz: { titolo, sottotitolo, userId, escludi, mano (testo del bottone «non è in lista») }. Restituisce {id, nome} · 'mano' · null
function scegliScheda(opz) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `<div class="foglio alto">
      <div class="testa-foglio"><h3>${esc(opz.titolo)}</h3><button id="sc-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
      ${opz.sottotitolo ? `<p>${esc(opz.sottotitolo)}</p>` : ''}
      <div class="campo"><label>Cerca nella lista</label><input id="sc-cerca" type="search" placeholder="Nome o cognome" autocomplete="off"></div>
      <div id="sc-elenco" class="sc-elenco"></div>
      ${opz.mano ? `<button class="link" id="sc-mano" style="width:100%">${esc(opz.mano)}</button>` : ''}</div>`;
    document.body.appendChild(velo);
    const chiudi = v => { velo.remove(); risolvi(v); };
    velo.querySelector('#sc-x').onclick = () => chiudi(null);
    if (opz.mano) velo.querySelector('#sc-mano').onclick = () => chiudi('mano');
    const input = velo.querySelector('#sc-cerca'), elenco = velo.querySelector('#sc-elenco');
    // Lista Nomi L9 (Ignazio 23/10): la ricerca sola (MB21Lista.cercaNomi, la regola di Cerca) sulla copia della Lista, invece di leggere il database a ogni tasto
    // (prima solo il nome, con ilike); gli eliminati non ci sono. Se la Lista non è ancora in memoria la si legge una volta.
    let righe = null;
    const pronti = nomiDellaLista().then(x => { righe = x; }, () => { righe = []; });
    input.oninput = async () => {
      const testo = input.value.trim();
      if (!testo) { elenco.innerHTML = ''; return; }
      if (!righe) { elenco.innerHTML = '<div class="sotto">Carico i nomi…</div>'; await pronti; if (input.value.trim() !== testo) return; }
      const data = MB21Lista.cercaNomi(righe, { testo, utenteId: opz.userId, max: 15 }).filter(r => r.id !== opz.escludi);
      elenco.innerHTML = data.length
        ? data.map(r => `<button data-id="${esc(r.id)}"><b>${esc(r.nome)}</b> <small>${esc(r.categoria ? MB21Lista.nomeCategoria(r.categoria) : 'Senza categoria')}</small></button>`).join('')
        : '<div class="sotto">Nessun nome trovato</div>';
      elenco.querySelectorAll('[data-id]').forEach(b => b.onclick = () => chiudi(data.find(r => r.id === b.dataset.id)));
    };
    setTimeout(() => input.focus(), 50);
  });
}

async function sezioneSegni() {
  const c = LS.contatto;
  const box = document.getElementById('sezione');
  let SV;
  if (!(LS.sv && LS.sv.id === c.id)) box.innerHTML = '<div class="vuoto">Carico…</div>';
  try { SV = await segniDellaScheda(c); } catch (e) {
    if (LS.contatto === c) box.innerHTML = '<div class="vuoto">Segni Vitali non caricati: riprova.</div>';
    return;
  }
  if (LS.contatto !== c || LS.sezione !== 'segni') return;
  // Nota 094 S7: chi non può segnare (un partner, o l'Admin con «Tutti» nel Partner Select: come le targhette) vede i tasti spenti e una riga sola
  const puoSegnare = targheDaToccare();
  const dis = puoSegnare ? '' : 'disabled';
  const primo = n => String(n || '').trim().split(/\s+/)[0] || '';
  const breve = d => MB21Lista.etichettaEvento(d);
  const nomeDi = id => (id === c.id ? c.nome : SV.compagno && SV.compagno.id === id ? SV.compagno.nome : '');
  // l'altra persona della coppia rispetto a chi ha il biglietto
  const altroDi = b => SV.compagno
    ? (b.contatto_id === c.id ? SV.compagno.nome : c.nome)
    : SV.ana.compagno_nome || (b.compagno ? 'Compagno/a' : '');

  const riquadroEventi = tipo => {
    const k = tipo.toLowerCase();
    const miei = SV.biglietti.filter(b => b.tipo === tipo).sort((a, b) => b.evento.localeCompare(a.evento));
    return `<div class="riquadro"><div class="sv-testa"><span class="sv-pill ${k}">${tipo}</span>
        ${dis ? '' : `<button class="sv-piu" data-piu="${tipo}">+ Biglietto</button>`}</div>
      ${miei.map(b => `<div class="sv-ev" data-big="${esc(b.id)}">
        <span class="quando">${esc(breve(b.evento))}</span>
        <button class="sv-chip ${k} ${b.contatto ? 'on' : ''}" data-campo="contatto" ${dis}>${esc(primo(nomeDi(b.contatto_id)))}</button>
        ${altroDi(b) ? `<button class="sv-chip ${k} ${b.compagno ? 'on' : ''}" data-campo="compagno" ${dis}>${esc(primo(altroDi(b)))}</button>` : ''}
        <label class="sv-osp">+<input type="number" min="0" max="50" data-campo="ospiti" value="${b.ospiti}" ${dis}>ospiti</label>
      </div>`).join('') || '<div class="sotto" style="margin:0">Nessun biglietto</div>'}
    </div>`;
  };

  // CEP a periodi (si esce e si rientra). Ogni periodo si salva col suo bottone:
  // salvando a ogni cambio, mentre si scrive l'anno «0002» sembrava già una data
  // Periodo aperto (cantiere 20, Ignazio 17/09): solo «dal» e il bottone «Non ha rinnovato», che chiude il periodo
  // alla fine del mese prima (il CEP si paga il 1°). Chiuso o nuovo: le due date, correggibili a mano
  const bloccoCep = p => { const aperto = !!p.id && !p.uscito_il; return `<div class="sv-ev" data-cep="${esc(p.id || 'nuovo')}">
      <input type="date" data-k="dal" value="${esc(p.dal || '')}" ${dis} aria-label="Abbonato dal">
      ${aperto ? (dis ? '' : '<button class="sv-piu" data-cep-esci>Non ha rinnovato</button>') : `<span class="sotto" style="margin:0">→</span>
      <input type="date" data-k="uscito_il" value="${esc(p.uscito_il || '')}" ${dis} aria-label="Uscito il">`}
      ${dis ? '' : `<button class="sv-ico" data-cep-salva aria-label="Salva">${ic('fatto')}</button><button class="sv-ico no" data-cep-togli aria-label="${p.id ? 'Elimina' : 'Annulla'}">${ic('chiudi')}</button>`}
    </div>${p.segnato_da ? `<div class="sotto" style="margin:-2px 0 8px">${ic('app')} acceso dal partner, dal suo Profilo${p.aggiornato_il ? ' il ' + esc(MB21Lista.data(p.aggiornato_il)) : ''}</div>` : ''}`; };   // cantiere 25 bis
  const riquadroCep = () => {
    return `<div class="riquadro"><div class="sv-testa"><span class="sv-pill cep">CEP</span>
        <small class="sotto" style="margin:0">${esc(MB21Lista.descrizioneCep(SV.cep, MB21Coda.oggiRoma()))}</small>
        ${dis || SV.cepNuovo ? '' : '<button class="sv-piu" id="sv-cep-nuovo">+ Periodo</button>'}</div>
      ${SV.cepNuovo ? bloccoCep({}) : ''}${SV.cep.map(bloccoCep).join('')}
</div>`;   // senza periodi la riga in testa dice «Mai abbonato» (S5)
  };

  const disegna = () => {
    const a = SV.ana;
    if (SV.ufficiale) {   // partner con la scheda ufficiale in un'altra lista: qui non si scrive
      box.innerHTML = `<div class="riquadro"><div class="sotto" style="margin:0 0 8px">I Segni Vitali di ${esc(c.nome)} si scrivono su una scheda sola, quella collegata al codice Amway.</div>
        <button class="sv-link" id="sv-ufficiale">Scheda della lista di ${esc(SV.ufficiale.lista || 'un altro partner')} ›</button></div>`;
      document.getElementById('sv-ufficiale').onclick = async () => {
        await apriContattoDa(SV.ufficiale.id, LS.ritorno);
        if (LS.contatto && LS.contatto.id === SV.ufficiale.id) { LS.sezione = 'segni'; disegnaScheda(); }
      };
      return;
    }
    const conCep = c.categoria === 'Partner' || (SV.compagno && SV.compagno.categoria === 'Partner') || SV.cep.length;
    // S5 (Ignazio 25/10: «come CEP mettiamo abbonamento audio»): in cima cosa vuol dire ogni segno; S7: la frase sul compagno/a solo a chi segna
    box.innerHTML = `<div class="sotto" style="margin:0 0 8px">WES e BBS: i biglietti degli eventi · CEP: l'abbonamento audio</div>
      ${!puoSegnare ? '<div class="sotto" style="margin:0 0 8px">I biglietti e il CEP li segna l\'Admin</div>'
        : SV.compagno || a.compagno_nome ? '' : '<div class="sotto" style="margin:0 0 8px">Per i biglietti della coppia collega il compagno/a in Dati.</div>'}
      ${riquadroEventi('WES')}${riquadroEventi('BBS')}${conCep ? riquadroCep() : ''}`;   // nota 098 (Ignazio 26/10): WES · BBS · CEP, in quest'ordine in tutta l'app
    mostraTarghe(SV);
    collega();
  };

  const collega = () => {
    // S2: «+ Biglietto» apre la stessa domanda della targhetta (segnaBiglietto) e propone solo l'evento in vendita e quelli dopo (prima anche i passati)
    box.querySelectorAll('[data-piu]').forEach(b => b.onclick = async () => {
      if (soloGuardo()) return;
      const tipo = b.dataset.piu, inVendita = SV.attivi[tipo.toLowerCase()];
      const eventi = inVendita ? [...new Set(SV.date[tipo].map(MB21Lista.meseEvento))].filter(d => d >= inVendita).sort() : [];
      if (!eventi.length) return mostraToast(`Nessun ${tipo} in vendita: le date si aggiungono nella pagina Admin`);
      let evento = eventi[0];
      if (eventi.length > 1) {
        const v = await sceltaDa(`Biglietto ${tipo} · quale?`, eventi.map(d => ({ etichetta: `${tipo} ${MB21Lista.etichettaEvento(d)}`, k: d })));
        if (!v) return;
        evento = v.k;
      }
      segnaBiglietto(c, SV, tipo, evento, testo => {
        if (testo) mostraToast(testo);
        ricordaTarghe(SV);
        if (LS.contatto === c) { mostraTarghe(SV); if (LS.sezione === 'segni') disegna(); }
      });
    });

    const salvaBiglietto = async (el, campo, valore) => {
      if (soloGuardo()) return disegna();
      const b = SV.biglietti.find(x => x.id === el.closest('[data-big]').dataset.big);
      if (!MB21Lista.postiBiglietto({ ...b, [campo]: valore })) {   // niente posti: il biglietto si toglie
        if (!await chiediConferma(`Tolgo il biglietto ${b.tipo} ${MB21Lista.etichettaEvento(b.evento)}?`, '', 'Togli', true)) return disegna();
        const { error } = await dbq('togli biglietto', supa.from('biglietti').delete().eq('id', b.id));
        if (error) { mostraToast('Non salvato: riprova.'); return disegna(); }
        SV.biglietti = SV.biglietti.filter(x => x.id !== b.id); return disegna();
      }
      const { error } = await dbq('salva biglietto', supa.from('biglietti').update({ [campo]: valore }).eq('id', b.id));
      if (error) mostraToast('Non salvato: riprova.'); else b[campo] = valore;
      disegna();
    };
    box.querySelectorAll('[data-big] button[data-campo]').forEach(el => el.onclick = () =>
      salvaBiglietto(el, el.dataset.campo, !el.classList.contains('on')));
    box.querySelectorAll('[data-big] input[data-campo]').forEach(el => el.onchange = () =>
      salvaBiglietto(el, 'ospiti', Math.min(50, Math.max(0, Math.round(Number(el.value) || 0)))));

    const nuovoCep = document.getElementById('sv-cep-nuovo');
    if (nuovoCep) nuovoCep.onclick = () => { if (!soloGuardo()) { SV.cepNuovo = true; disegna(); } };
    if (!dis) box.querySelectorAll('[data-cep]').forEach(blocco => {
      const id = blocco.dataset.cep === 'nuovo' ? null : blocco.dataset.cep;
      const salvaCep = async uscita => {
        if (soloGuardo()) return;
        const campoUscita = blocco.querySelector('[data-k="uscito_il"]');
        const p = { id, dal: blocco.querySelector('[data-k="dal"]').value, uscito_il: uscita || (campoUscita && campoUscita.value) || null };
        const errore = MB21Lista.controllaPeriodoCep(SV.cep, p);
        if (errore) return mostraToast(errore);
        const riga = { dal: p.dal, uscito_il: p.uscito_il, aggiornato_il: new Date().toISOString() };
        const { data, error } = await dbq('salva CEP', id
          ? supa.from('cep').update(riga).eq('id', id).select().single()
          : supa.from('cep').insert({ ...riga, contatto_id: c.id }).select().single());
        if (error) return mostraToast('Non salvato: riprova.');
        SV.cep = [data, ...SV.cep.filter(x => x.id !== id)].sort((a, b) => b.dal.localeCompare(a.dal));
        if (!id) SV.cepNuovo = false;
        mostraToast(uscita ? `CEP chiuso al ${MB21Lista.data(uscita)}` : 'CEP salvato'); disegna();
      };
      blocco.querySelector('[data-cep-salva]').onclick = () => salvaCep(null);
      const esci = blocco.querySelector('[data-cep-esci]');
      if (esci) esci.onclick = () => salvaCep(MB21Lista.dataUscitaCep(blocco.querySelector('[data-k="dal"]').value, MB21Coda.oggiRoma()));
      blocco.querySelector('[data-cep-togli]').onclick = async () => {
        if (!id) { SV.cepNuovo = false; return disegna(); }
        if (soloGuardo() || !await chiediConferma('Elimino questo periodo di CEP?', '', 'Elimina', true)) return;
        const { error } = await dbq('togli CEP', supa.from('cep').delete().eq('id', id));
        if (error) return mostraToast('Non eliminato: riprova.');
        SV.cep = SV.cep.filter(x => x.id !== id); disegna();
      };
    });
  };

  disegna();
}

// Foglio con pochi campi (azione, nota). Restituisce {k: valore} o null.
// opz.elimina = testo del bottone «Elimina» in fondo (risolve con 'elimina'); opz.persona = { nome, categoria } di chi riguarda (nota 094 M3:
// in testa solo se chi apre il modulo la passa, non più l'ultima scheda aperta). Un campo obbligatorio dice cosa manca sul «Salva» spento
// (f.manca, M4, come nel modulo contatto); f.vuoto = la voce «Scegli …» di un menu, che vale come vuota.
function moduloSemplice(titolo, campi, opz = {}) {
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    // forma `mc` come gli altri moduli (cantiere 34): testa con la persona, campi in un riquadro, «Annulla · Salva» fermi in fondo
    const p = opz.persona || null;
    velo.innerHTML = `<div class="foglio alto mc">
      <div class="mc-testa ${classeCat(p && p.categoria)}"><span class="ts-pastiglia">${p ? esc(iniziali(p.nome)) : ic('modifica')}</span>
        <div><small>${esc(titolo)}</small><b>${p ? esc(p.nome) : ''}</b></div>
        <button id="chiudi" aria-label="Chiudi">${ic('chiudi')}</button></div>
      <div class="riquadro mc-g" style="margin-top:14px">
      ${campi.map(f => `<div class="campo"><label>${esc(f.etichetta)}</label>${
        f.tipo === 'select' ? `<select data-k="${f.k}">${f.opzioni.map(o => typeof o === 'string' ? `<option ${o === f.valore ? 'selected' : ''}>${esc(o)}</option>`
          : `<optgroup label="${esc(o.gruppo)}">${o.voci.map(v => `<option ${v === f.valore ? 'selected' : ''}>${esc(v)}</option>`).join('')}</optgroup>`).join('')}</select>`
        : f.tipo === 'textarea' ? `<textarea data-k="${f.k}" rows="${f.righe || 3}">${esc(f.valore)}</textarea>`
        : `<input data-k="${f.k}" type="${f.tipo}" value="${esc(f.valore)}">`}</div>`).join('')}
      </div>
      ${opz.elimina ? `<button class="link elimina-qui" id="elimina">${ic('elimina')} ${esc(opz.elimina)}</button>` : ''}
      <div class="mc-fondo"><button class="link" id="no">Annulla</button><button class="primario" id="si">Salva</button></div>
    </div>`;
    document.body.appendChild(velo);
    const chiudi = v => { velo.remove(); risolvi(v); };
    if (opz.elimina) velo.querySelector('#elimina').onclick = () => chiudi('elimina');
    velo.querySelector('#chiudi').onclick = () => chiudi(null);
    velo.querySelector('#no').onclick = () => chiudi(null);
    const valori = () => { const v = {}; velo.querySelectorAll('[data-k]').forEach(el => { v[el.dataset.k] = el.value; }); return v; };
    const manca = v => { const f = campi.find(f => f.obbligatorio && (!String(v[f.k] || '').trim() || v[f.k] === f.vuoto)); return f ? f.manca || `Manca: ${f.etichetta}` : ''; };
    const si = velo.querySelector('#si');
    const controlla = () => { const m = manca(valori()); si.disabled = !!m; si.textContent = m || 'Salva'; };
    velo.querySelectorAll('[data-k]').forEach(el => { el.addEventListener('input', controlla); el.addEventListener('change', controlla); });
    controlla();
    si.onclick = () => {
      const v = valori();
      if (manca(v)) return;
      chiudi(v);
    };
  });
}

// Nota 098 (Ignazio 27/10, «sì»): «Interesse» in due scelte (Attività oppure Prodotti; con Prodotti «Quali prodotti?»). Scrivono nel menu nascosto #f-area,
// lo stesso di prima: il salvataggio non cambia (MB21Lista.areaDa). Un valore vecchio fuori elenco resta nel menu nascosto finché non si cambia.
function campoInteresse(area, opz, conStorico) {
  const L = MB21Lista, x = L.interesseDa(area);
  return `<div class="campo"><label>Interesse</label><select id="f-area" hidden>${opz(conStorico(L.AREE, area), area, '—')}</select>
      <select id="f-int"><option value="">—</option>${['Attività', 'Prodotti'].map(v => `<option${x.interesse === v ? ' selected' : ''}>${v}</option>`).join('')}</select></div>
    <div class="campo" id="f-quali-campo"${x.interesse === 'Prodotti' ? '' : ' hidden'}><label>Quali prodotti?</label><select id="f-quali"><option value="">—</option>${L.QUALI_PRODOTTI.map(([v, t]) => `<option value="${esc(v)}"${x.quali === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
}
function collegaInteresse(radice) {
  const q = s => radice.querySelector(s), int = q('#f-int'), quali = q('#f-quali'), area = q('#f-area'), campo = q('#f-quali-campo');
  if (!int || !quali || !area) return;
  const scrivi = () => {
    campo.hidden = int.value !== 'Prodotti';
    const v = MB21Lista.areaDa(int.value, quali.value);
    if (v && ![...area.options].some(o => o.value === v)) area.appendChild(new Option(v, v));
    area.value = v;
  };
  int.onchange = scrivi; quali.onchange = scrivi;
}

// ── Nuovo Contatto / Modifica (stessi 9 campi di Glide, stesso ordine) ──
// poi.poiAzione (S5c): salvato con una categoria, si apre «Nuova azione»; poi.nome (L1): il nome già scritto, da Cerca; poi.categoria: quella già scelta;
// poi.salvato(riga) / poi.chiuso(): per chi apre il modulo da fuori la Lista (nota 094 M7, l'appuntamento dell'Agenda) e ci torna
function apriModulo(c, poi = {}) {
  if (soloGuardo()) { if (poi.chiuso) poi.chiuso(); return; }
  const nuovo = !c;
  const tel = MB21Lista.separaTelefono(c && c.telefono);
  // «Contatto e/o Incaricato di»: nomi della lista del partner proprietario (nuovo contatto = partner scelto nel Partner Select)
  const proprietario = c ? c.user_id : visto().id;
  const miei = LS.righe.filter(r => r.user_id === proprietario && (!c || r.id !== c.id));
  const opz = (lista, valore, vuoto) => (vuoto ? `<option value="">${vuoto}</option>` : '') +
    lista.map(o => `<option ${o === valore ? 'selected' : ''}>${esc(o)}</option>`).join('');
  // valori storici fuori elenco (es. fascia «36-45») restano sceglibili in modifica
  const conStorico = (lista, v) => v && !lista.includes(v) ? [...lista, v] : lista;
  const prefissi = conStorico(MB21Lista.PREFISSI.map(p => p[0]), tel.prefisso);
  const max = (base, v) => Math.max(base, (v || '').length);
  // i dati personali, uno per chiave: l'ORDINE lo dà MB21Lista.DATI_PERSONA (lo stesso della sezione Dati)
  const campiPersona = {
    // nota 094 M8: nomi a parole semplici (Età, Dipendente o autonomo?, Interesse); i campi e i valori salvati sono gli stessi
    fascia_eta: `<div class="campo"><label>Età</label><select id="f-eta">${opz(conStorico(MB21Lista.FASCE_ETA, c && c.fascia_eta), c && c.fascia_eta, '—')}</select></div>`,
    sesso: `<div class="campo"><label>Sesso <small class="sotto" style="margin:0">(per le tracce da condividere)</small></label><select id="f-sesso"><option value="">—</option>${MB21Lista.SESSI.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>`,
    lavoro: `<div class="campo"><label>Tipo di lavoro <small class="sotto" style="margin:0">(serve per la traccia dopo il Piano Marketing)</small></label><select id="f-lavoro"><option value="">—</option>${MB21Lista.LAVORI.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></div>`,
    compleanno: `<div class="campo"><label>Compleanno <small class="sotto" style="margin:0">(l'anno se lo sai)</small></label><div class="f-comp">
      <select id="f-cg"><option value="">Giorno</option>${Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select>
      <select id="f-cm"><option value="">Mese</option>${MB21Rubrica.MESI.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
      <input id="f-ca" inputmode="numeric" maxlength="4" placeholder="Anno"></div></div>`,
    professione: `<div class="campo"><label>Professione</label><input id="f-prof" placeholder="Mansione (Settore)" maxlength="${max(40, c && c.professione)}" value="${esc(c ? c.professione || '' : '')}"><div class="conta" data-conta="f-prof"></div></div>`,
    citta: `<div class="campo"><label>Località</label><input id="f-citta" placeholder="Città (Prov)" maxlength="${max(40, c && c.citta)}" value="${esc(c ? c.citta || '' : '')}"><div class="conta" data-conta="f-citta"></div></div>`
  };
  const velo = document.createElement('div');
  velo.className = 'velo';
  if (poi.salvato) velo.style.zIndex = 30;   // M7: sopra la scelta del contatto dell'Agenda (25)
  // Il modulo (cantiere 34, prova approvata da Ignazio il 19/09: tools/design/confronto_modulo.html): in testa chi è, tre gruppi con un titoletto
  // (Chi è · Dati personali · Per l'attività), la categoria a pastiglie, «Annulla · Salva» fermi in fondo. I campi e i loro id sono quelli di prima:
  // il menu della categoria c'è ancora, nascosto, e le pastiglie scrivono lì, così il salvataggio non cambia.
  // Lista Nomi L4 (Ignazio 23/10): nel nuovo contatto niente «Archiviato» (resta in Modifica)
  const categorie = conStorico(MB21Lista.CATEGORIE, c && c.categoria).filter(k => !nuovo || k !== 'Archiviato');
  const campoNome = `<div class="campo"><label>Nominativo <small>Obbligatorio</small></label><input id="f-nome" placeholder="Nome Cognome" value="${esc(c ? c.nome : poi.nome || '')}"><div id="f-arch" class="f-arch" hidden></div></div>`;
  const campoTel = `<div class="campo"><label>Telefono</label><div class="telefono-campo">
      <select id="f-prefisso">${prefissi.map(p => { const n = MB21Lista.PREFISSI.find(x => x[0] === p); return `<option value="${p}" ${p === (tel.prefisso || '+39') ? 'selected' : ''}>${p}${n ? ' ' + n[1] : ''}</option>`; }).join('')}</select>
      <input id="f-tel" type="tel" inputmode="tel" placeholder="(es.) 33x xxxxxxx" value="${esc(tel.numero)}"></div></div>`;
  const campoCat = `<div class="campo"><label>Categoria <small>Obbligatorio</small></label>${poi.poiAzione ? '<div class="avviso" id="f-cat-prima" style="margin:4px 0 8px">Per segnare un\'azione serve la categoria: sceglila qui sotto e tocca «Salva», poi si apre «Nuova azione».</div>' : ''}<select id="f-cat" hidden>${opz(categorie, c ? c.categoria : poi.categoria, 'Scegli qualcosa')}</select>
      <div class="mc-cats">${categorie.map(k => `<button type="button" class="mc-cat ${classeCat(k)} ${(c ? c.categoria : poi.categoria) === k ? 'on' : ''}" data-cat="${esc(k)}">${esc(MB21Lista.nomeCategoria(k))}</button>`).join('')}</div>
      ${categorie.filter(k => MB21Lista.SPIEGA_CATEGORIA[k]).map(k => `<small class="mc-cat-nota">${esc(MB21Lista.nomeCategoria(k))}: ${esc(MB21Lista.SPIEGA_CATEGORIA[k].toLowerCase())}</small>`).join('')}</div>`;
  // Nota Pagine 080 (Ignazio 24/10: «non è un cliente da oggi, è un cliente da anni»): con «Sì» la data «dal» si vede e si cambia (mai nel futuro)
  const campoAccount = `<div class="campo" id="f-account-campo"><label>Cliente con account</label>
      <div class="vn-quando"><button type="button" data-account="si">Sì</button><button type="button" data-account="no">No</button></div>
      <div id="f-account-dal-posto" style="margin-top:8px"><label>Dal</label><input id="f-account-dal" type="date" max="${MB21Coda.oggiRoma()}"></div>
      <div class="vn-aiuto">Ordina dal suo account quando vuole: nessuna telefonata di riordino.</div></div>`;
  const datiPersona = `<h4 class="mc-t">Dati personali</h4><div class="riquadro mc-g">
    ${nuovo ? '' : '<small class="sotto" id="f-letti" style="margin:0">Carico compleanno, sesso e lavoro…</small>'}
    ${MB21Lista.DATI_PERSONA.map(([k]) => campiPersona[k]).join('\n')}
    </div>`;
  const altriAttivita = `<div class="campo"><label>Contatto e/o Incaricato di</label><input id="f-ref" list="f-ref-nomi" placeholder="—" value="${esc(c ? c.referral_di || '' : '')}">
      <datalist id="f-ref-nomi">${miei.map(r => `<option value="${esc(r.nome)}">`).join('')}</datalist></div>
    ${campoInteresse(c && c.area, opz, conStorico)}
    <div class="campo"><label>Note</label><input id="f-note" maxlength="${max(50, c && c.note)}" value="${esc(c ? c.note || '' : '')}"><div class="conta" data-conta="f-note"></div></div>`;
  // Lista Nomi L4 (Ignazio 23/10): un contatto NUOVO mostra subito nome, telefono e categoria (con «Ha un account cliente», che si vede solo per un Cliente);
  // il resto sta nella riga chiusa «Altri dati (facoltativi)». In Modifica i tre gruppi restano com'erano. Campi e id sono gli stessi: il salvataggio non cambia.
  const corpo = nuovo
    ? `<div class="riquadro mc-g" style="margin-top:14px">${campoNome}${campoTel}${campoCat}${campoAccount}</div>
    <details class="mc-altri"><summary>Altre informazioni</summary>${datiPersona}<h4 class="mc-t">Per l'attività</h4><div class="riquadro mc-g">${altriAttivita}</div></details>`
    : `<h4 class="mc-t">Chi è</h4><div class="riquadro mc-g">${campoNome}${campoTel}</div>${datiPersona}
    <h4 class="mc-t">Per l'attività</h4><div class="riquadro mc-g">${campoCat}${campoAccount}${altriAttivita}</div>`;
  velo.innerHTML = `<div class="foglio alto mc">
    <div class="mc-testa ${classeCat(c ? c.categoria : poi.categoria)}" id="mc-testa"><span class="ts-pastiglia">${c ? esc(iniziali(c.nome)) : ic('persona')}</span>
      <div><small>${nuovo ? 'Aggiungi un nuovo contatto' + esc(aNome()) : 'Modifica contatto'}</small><b>${c ? esc(c.nome) : 'Nuovo nome'}</b></div><button id="chiudi" aria-label="Chiudi">${ic('chiudi')}</button></div>
    ${nuovo ? '<p class="sotto mc-basta">bastano nome, telefono e categoria: il resto quando vuoi</p>' : ''}
    ${corpo}
    ${c ? `<button class="link elimina-qui" id="elimina-qui">${ic('elimina')} Elimina dalla lista</button>` : ''}
    <div class="mc-fondo"><button class="link" id="annulla">Annulla</button><button class="primario" id="invia" disabled>Salva</button></div>
  </div>`;
  document.body.appendChild(velo);
  const $ = id => velo.querySelector('#' + id);
  const chiudi = () => velo.remove();
  const lascia = () => { chiudi(); if (poi.chiuso) poi.chiuso(); };
  $('chiudi').onclick = lascia;
  $('annulla').onclick = lascia;
  collegaInteresse(velo);   // nota 098: Interesse in due scelte
  if (poi.poiAzione && $('f-cat-prima') && $('f-cat-prima').scrollIntoView) $('f-cat-prima').scrollIntoView({ block: 'center' });   // S5c: la categoria in evidenza
  // le pastiglie della categoria scrivono nel menu nascosto e avvisano il modulo, come se si fosse scelto dal menu
  velo.querySelectorAll('.mc-cat').forEach(b => b.onclick = () => {
    $('f-cat').value = b.dataset.cat;
    velo.querySelectorAll('.mc-cat').forEach(x => x.classList.toggle('on', x === b));
    $('mc-testa').className = 'mc-testa ' + classeCat(b.dataset.cat);
    $('f-cat').dispatchEvent(new Event('change'));
  });
  // «Elimina» dentro la scheda sta qui, in fondo a Modifica (Ignazio 19/09: in «Dati» non è il posto giusto); stessa funzione dei tre puntini
  if ($('elimina-qui')) $('elimina-qui').onclick = () => { chiudi(); elimina(c); };
  const controlla = () => {
    // Lista Nomi L4 (Ignazio 23/10): finché manca qualcosa, il bottone spento dice cosa (come «Scegli almeno un nome» in Scarica nomi e numeri)
    const manca = !$('f-nome').value.trim() ? 'Scrivi il nome' : !$('f-cat').value ? 'Scegli la categoria' : '';
    $('invia').disabled = !!manca; $('invia').textContent = manca || 'Salva';
    velo.querySelectorAll('[data-conta]').forEach(d => contaLettere($(d.dataset.conta), d));   // L1: il conto solo nelle ultime 10 lettere
    avvisaArchiviati();
  };
  // Nuovo nome che c'è già tra gli archiviati (nota 012, Ignazio 05/10): mentre si scrive, sotto il nome «C'è già Carla Verdi tra gli archiviati»
  // con «Ripristina» a un tocco (chiude il modulo e rimette la scheda com'era: stessa funzione del menu «…»). In modifica non serve.
  const avvisaArchiviati = () => {
    const box = $('f-arch');
    if (!box || !nuovo) return;
    const uguali = MB21Lista.archiviatiUguali(LS.righe, { nome: $('f-nome').value, telefono: MB21Lista.componiTelefono($('f-prefisso').value, $('f-tel').value), utenteId: proprietario });
    box.hidden = !uguali.length;
    if (!uguali.length) { box.innerHTML = ''; return; }
    box.innerHTML = uguali.slice(0, 3).map(d => `<div>C'è già <b>${esc(d.nome)}</b>${d.telefono ? ' · ' + esc(d.telefono) : ''} tra gli archiviati. <button type="button" class="link" data-ripristina="${esc(d.id)}">Ripristina</button></div>`).join('');
    box.querySelectorAll('[data-ripristina]').forEach(b => { b.onclick = () => { const d = uguali.find(x => x.id === b.dataset.ripristina); chiudi(); ripristina(d); }; });
  };
  velo.querySelectorAll('input, select').forEach(el => { el.oninput = controlla; el.onchange = controlla; });
  controlla();
  // Compleanno (cantiere 30): la Lista non ce l'ha, si legge da `contatti` all'apertura del modulo. Finché non è stato letto
  // (o se la lettura non riesce) il salvataggio NON lo tocca: meglio non poterlo cambiare che cancellarlo per sbaglio.
  // Il sesso (cantiere 40) segue la stessa regola: si legge da `contatti` e si salva solo se è stato letto
  // Nota 094 M2: finché la lettura non arriva i tre campi sono spenti con «Carico…» (prima si potevano toccare e la lettura ci scriveva sopra);
  // se non arriva restano spenti con «Non caricati: riapri per cambiarli».
  let compleannoLetto = nuovo;
  const DA_LEGGERE = ['f-cg', 'f-cm', 'f-ca', 'f-sesso', 'f-lavoro'];
  if (!nuovo) {
    DA_LEGGERE.forEach(id => { $(id).disabled = true; });
    dbq('compleanno', supa.from('contatti').select('compleanno, sesso, lavoro').eq('id', c.id).maybeSingle()).then(({ data, error }) => {
      if (!velo.isConnected) return;
      if (error || !data) { $('f-letti').textContent = 'Compleanno, sesso e lavoro non caricati: riapri per cambiarli.'; return; }
      const k = MB21Rubrica.compleannoDaData(data.compleanno);
      if (k) { $('f-cg').value = k.giorno; $('f-cm').value = k.mese; $('f-ca').value = k.anno || ''; }
      $('f-sesso').value = data.sesso || ''; $('f-lavoro').value = data.lavoro || '';
      DA_LEGGERE.forEach(id => { $(id).disabled = false; });
      $('f-letti').hidden = true;
      compleannoLetto = true;
    });
  }
  // V4 Vendite (Ignazio 22/10): «Ha un account cliente: ordina da solo», solo per i Clienti (contatti.account_cliente_dal). Come il compleanno:
  // si legge a parte (o dalla scheda aperta) e il salvataggio lo tocca solo se è stato letto e se è cambiato; «Sì» tiene la data di prima o mette oggi.
  const account = { letto: nuovo, prima: null, si: false };
  const segnaAccount = () => {
    $('f-account-campo').style.display = $('f-cat').value === 'Cliente' && account.letto ? '' : 'none';
    velo.querySelectorAll('[data-account]').forEach(b => b.classList.toggle('scelto', (b.dataset.account === 'si') === account.si));
    $('f-account-dal-posto').style.display = account.si ? '' : 'none';   // 080: la data solo con «Sì»
    if (account.si && !$('f-account-dal').value) $('f-account-dal').value = account.prima || MB21Coda.oggiRoma();   // la data salvata, o oggi se è nuovo
  };
  const accountLetto = dal => { if (dal === undefined || !velo.isConnected) return; Object.assign(account, { letto: true, prima: dal, si: !!dal }); $('f-account-dal').value = dal || ''; segnaAccount(); };
  velo.querySelectorAll('[data-account]').forEach(b => b.onclick = () => { account.si = b.dataset.account === 'si'; segnaAccount(); });
  $('f-cat').addEventListener('change', segnaAccount);
  if (!nuovo && LS.account && LS.account.id === c.id) accountLetto(LS.account.dal);
  else if (!nuovo) leggiAccountCliente(c.id).then(accountLetto);
  segnaAccount();
  // Un numero incollato con il prefisso («+39 338 1234567», «0039…») non resta «+39» accanto a «+39…»: il prefisso va nella casella del prefisso,
  // nel campo resta il numero (nota 080). Il salvataggio comunque lo componeva giusto; era solo la vista che sembrava doppia.
  $('f-tel').addEventListener('input', () => {
    const v = $('f-tel').value;
    if (!/^\s*(\+|00)/.test(v)) return;
    const intero = MB21Lista.componiTelefono('+39', v);
    const { prefisso, numero } = intero ? MB21Lista.separaTelefono(intero) : {};
    const casella = $('f-prefisso');
    if (prefisso && numero && [...casella.options].some(o => o.value === prefisso)) { casella.value = prefisso; $('f-tel').value = numero; }
  });
  $('invia').onclick = async () => {
    const telefono = MB21Lista.componiTelefono($('f-prefisso').value, $('f-tel').value);
    const riga = {
      nome: $('f-nome').value.trim(), telefono, fascia_eta: $('f-eta').value || null,
      professione: $('f-prof').value.trim() || null, citta: $('f-citta').value.trim() || null,
      categoria: $('f-cat').value, referral_di: $('f-ref').value.trim() || null,
      area: $('f-area').value || null, note: $('f-note').value.trim() || null,
    };
    const compleanno = MB21Rubrica.compleannoDalModulo($('f-cg').value, $('f-cm').value, $('f-ca').value);
    if (compleanno === 'errore') return mostraToast('Compleanno: scegli giorno e mese di una data che esiste (l\'anno di 4 cifre, se lo sai)');
    if (account.letto && riga.categoria === 'Cliente') {   // V4: solo se letto e cambiato (prima della migrazione la colonna non si tocca)
      // 080: con «Sì» la data scritta (vuota: quella di prima, o oggi), mai nel futuro; si salva solo se cambia
      const dal = account.si ? $('f-account-dal').value || account.prima || MB21Coda.oggiRoma() : null;
      if (dal && dal > MB21Coda.oggiRoma()) return mostraToast('Cliente con account: la data «dal» non può essere nel futuro');
      if (dal !== account.prima) riga.account_cliente_dal = dal;
    }
    if (compleannoLetto) { riga.compleanno = MB21Rubrica.dataCompleanno(compleanno); riga.sesso = $('f-sesso').value || null; riga.lavoro = $('f-lavoro').value || null; }
    if (nuovo) riga.user_id = proprietario;
    else {   // in Modifica i doppioni si guardano qui (gli altri nomi); un nome nuovo li guarda salvaNomeNuovo (L9), con lo stesso avviso
      const doppi = MB21Lista.trovaDoppioni(LS.righe, { nome: riga.nome, telefono: riga.telefono, utenteId: proprietario, escludiId: c.id });
      if (doppi.length && !await chiediConferma('Salvo lo stesso?', testoDoppioni(doppi, proprietario), 'Salva lo stesso')) return;
    }
    $('invia').disabled = true;
    // Nota 094 M1: la categoria cambiata da qui fa le stesse cose del menu «…». Archiviato scelto = la funzione di «Archivia» (`archivia_contatto`:
    // tiene la categoria di prima per il Ripristina, le azioni da fare escono), anche per un contatto senza categoria. Da Archiviato a un'altra =
    // la funzione di «Ripristina» (`ripristina_contatto`: tornano le azioni e il giorno di rientro), poi la categoria scelta se è un'altra.
    // Da senza categoria a una categoria: `cataloga_contatto`, come in «Da catalogare» (conta nei Fatti, rientro domani).
    const archiviare = !nuovo && riga.categoria === 'Archiviato' && c.categoria !== 'Archiviato';
    const ripristinare = !nuovo && c.categoria === 'Archiviato' && riga.categoria !== 'Archiviato';
    const catalogo = !nuovo && !archiviare && !ripristinare && !c.categoria && riga.categoria;
    let error = null, esito = null;
    if (nuovo) {
      esito = await salvaNomeNuovo(riga);   // L9: doppioni, salvataggio, riga nuova nella Lista
      if (esito.annullato) { $('invia').disabled = false; return; }
      error = esito.errore || null;
    } else {
      // i dati prima, con la categoria di adesso: la cambia dopo la funzione giusta
      ({ error } = await dbq('modifica contatto', supa.from('contatti')
        .update({ ...riga, categoria: catalogo ? null : archiviare || ripristinare ? c.categoria : riga.categoria, aggiornato_il: new Date().toISOString() }).eq('id', c.id)));
    }
    if (error) { $('invia').disabled = false; return mostraToast('Non salvato: controlla la connessione e riprova.'); }
    let errCat = null;
    if (catalogo) ({ error: errCat } = await dbq('cataloga', supa.rpc('cataloga_contatto', { p_contatto: c.id, p_categoria: riga.categoria })));
    else if (archiviare) ({ error: errCat } = await dbq('archivia', supa.rpc('archivia_contatto', { p_contatto: c.id })));
    else if (ripristinare) {
      ({ error: errCat } = await dbq('ripristina', supa.rpc('ripristina_contatto', { p_contatto: c.id })));
      // tornato com'era: se si è scelta un'altra categoria, si cambia (senza categoria di prima: `cataloga_contatto`, rientro domani)
      if (!errCat && riga.categoria !== c.categoria_prec) ({ error: errCat } = await dbq('categoria dopo il ripristino', c.categoria_prec
        ? supa.from('contatti').update({ categoria: riga.categoria, aggiornato_il: new Date().toISOString() }).eq('id', c.id)
        : supa.rpc('cataloga_contatto', { p_contatto: c.id, p_categoria: riga.categoria })));
    }
    // M4: i dati sono salvati, la categoria no: si dice, il modulo resta aperto e «Salva» riprova
    if (errCat) { $('invia').disabled = false; await aggiornaRiga(c.id); return mostraToast('Dati salvati, la categoria no: riprova.'); }
    if ('account_cliente_dal' in riga) LS.account = null;   // V4: la riga in testata si rilegge
    chiudi();
    mostraToast(nuovo ? `${riga.nome} aggiunto` : archiviare ? `${riga.nome} spostato in Archiviati · le azioni da fare escono dall'Agenda`
      : ripristinare ? `${riga.nome} ripristinato` : 'Modifiche salvate',
      archiviare ? () => ripristina({ id: c.id, nome: riga.nome }) : undefined);   // nota 046: Annulla rimette com'era (categoria, rientro, azioni)
    if (nuovo && poi.salvato) return poi.salvato(esito.riga);   // M7: si torna a chi ha aperto il modulo (l'appuntamento)
    // L7 (Ignazio 23/10): la riga della persona si rilegge sempre, anche dalla Lista (tre puntini · Modifica); un nome nuovo l'ha già messa salvaNomeNuovo
    // (prima si vedeva solo dopo 10 minuti o con «Aggiorna i nomi»); con la scheda aperta la rilegge già ricaricaERidisegna
    if (!nuovo && (!LS.contatto || LS.contatto.id !== c.id)) await aggiornaRiga(c.id);
    // M5: salvato un nome nuovo, si apre subito la sua scheda (se la riga non c'è, la Lista si rilegge come prima)
    if (nuovo && LS.righe.some(x => x.id === esito.riga.id)) { LS.ritorno = null; apriScheda(esito.riga.id); }
    else {
      const ridisegnato = ricaricaERidisegna();
      if (poi.poiAzione && riga.categoria) return ridisegnato.then(() => azionePiu());   // S5c: dalla categoria all'azione, senza altri tocchi
    }
    if (riga.categoria === 'Partner' && (nuovo || c.categoria !== 'Partner')) domandaInvito({ ...riga, user_id: nuovo ? proprietario : c.user_id });
  };
}

// «Portato da» uguale dappertutto (decisione di Ignazio 15/09): Agenda, Report, Griglia PM, scheda contatto.
// Aggiunge `portatoNome` alle azioni con portato_da (una lettura sola dei nomi). Senza rete i nomi restano vuoti.
async function aggiungiPortatoDa(azioni) {
  let ids = [...new Set(azioni.map(a => a.portato_da).filter(Boolean))];
  if (!ids.length) return azioni;
  const nomi = {};
  // da MB Plan i nomi arrivano già con apri_agenda() (`PRE.dati.portato_da`, pagina-dashboard.js): si chiedono alla rete solo quelli che mancano
  if (typeof PRE !== 'undefined' && PRE.dati && Array.isArray(PRE.dati.portato_da)) {
    for (const x of PRE.dati.portato_da) nomi[x.id] = x.nome;
    ids = ids.filter(id => nomi[id] === undefined);
  }
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await dbq('nomi portato da', supa.from('contatti').select('id, nome').in('id', ids.slice(i, i + 200)));
    for (const x of data || []) nomi[x.id] = x.nome;
  }
  for (const a of azioni) a.portatoNome = nomi[a.portato_da] || null;
  return azioni;
}
const rigaPortato = nome => nome ? `${ic('squadra')} Portato da ${esc(nome)}` : '';

// (La spunta del passo dell'Avvio dopo l'esito di un incontro, cantiere 48, la fa ora la funzione `chiudi_azione` del database insieme alla chiusura: nota 045, 03/10.)
// la scheda e l'elenco già letti restano allineati (senza rileggere)
function passoInCache(contattoId, col, valore) {
  for (const r of [LS.contatto, ...(LS.righe || [])]) if (r && r.id === contattoId) r[col] = valore;
}

// Il processo lasciato a metà mentre si guarda la scheda (dopo «Sì» a «Hai condiviso la traccia di apertura?»): quando si torna indietro (o si cambia
// pagina) riprende, una volta sola e solo per quella persona, entro mezz'ora.
function eseguiDopoScheda(contattoId) {
  const d = LS.dopo;
  LS.dopo = null;
  if (d && (!contattoId || d.id === contattoId) && Date.now() - d.quando < 30 * 60000) setTimeout(d.fn, 600);
}

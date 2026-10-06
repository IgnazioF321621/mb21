// MB21 · MB Plan (l'Agenda, cantiere 41): la pagina — foglio del giorno, Settimana, Mese, Periodo WES, Anno,
// cose da fare (ognuna legata a una persona o al Team, LdS, Network 21, Amway: dal 05/10/2026 niente più Modelli personali né Progetti), Timeline, cerca, trascinamento. Spostata così com'era da index.html il 23/09/2026 (Ignazio:
// «ok procedi»), codice identico. Si carica prima dello script della pagina: solo definizioni e ascolti, che usano le
// funzioni di index.html (supa, dbq, esc, ic, mostraToast, versione…) soltanto quando partono.
// Le regole pure stanno in agenda.js (MB21Agenda), le prove in tools/banco/prova_agenda*.js.

// ── AGENDA (Fase 4) ──────────────────────────────────────
// Giornata a linea del tempo (brief Fase 4): striscia di 7 giorni, appuntamenti del giorno in ordine d'ora,
// telefonate del giorno, appuntamenti passati senza esito, [+] nuovo appuntamento. Logica pura in agenda.js.
// Appuntamenti = righe di `azioni` con tipo ≠ Contatto (per data inizio) + Contatti con data scelta (dalla coda).
const LIMITE_SENZA_ESITO = 50;   // quanti «senza esito» si leggono; se sono tanti la pastiglia dice «50+» (nota 021)
const AG = { giorno: null, settimana: [], azioni: [], passati: [], aperta: null, telefonate: null, vista: null, portato: null, cose: [], legame: null, filtro: '' };


async function apriAgenda(giorno) {
  AG.giorno = giorno || AG.giorno || MB21Coda.oggiRoma();
  AG.oggiVisto = MB21Coda.oggiRoma();   // il giorno di Roma in cui è stata disegnata: serve a capire se al ritorno nell'app è passata la notte
  const mia = AG.richiesta = (AG.richiesta || 0) + 1;   // due aperture ravvicinate: disegna solo l'ultima (nota 021)
  if (!AG.vista) AG.vista = vistaSalvata();   // cantiere 37: si riapre come l'hai lasciata
  if (!document.querySelector('.ag-settimana')) app.innerHTML = `<h1>MB Plan</h1><div class="vuoto">Carico MB Plan…</div>`;
  try { await caricaAgenda(); }
  catch (e) {
    console.error('[MB21] MB Plan', e);
    app.innerHTML = `<h1>MB Plan</h1><div class="avviso">Non riesco a caricare MB Plan. Controlla la connessione e riprova.<br><small>${esc(String(e && e.message || e))}</small></div>${versione()}`;
    return;
  }
  if (mia !== AG.richiesta) return;
  // se il disegno si rompe, la pagina lo dice invece di restare su «Carico…» (22/09: pagina ferma senza spiegazione)
  try { disegnaAgenda(); }
  catch (e) {
    console.error('[MB21] MB Plan disegno', e);
    app.innerHTML = `<h1>MB Plan</h1><div class="avviso">MB Plan non riesce a disegnare la pagina.<br><small>${esc(String(e && e.message || e))}</small></div>${versione()}`;
  }
}

// Tornando nell'app (nota 021, Ignazio 04/10: «apre sempre su oggi e si aggiorna da sola»): se è passata la notte MB Plan va su oggi,
// se no resta sul giorno guardato; in tutti e due i casi rilegge, così si vedono le spunte fatte dall'altro telefono. Non tocca niente
// se si sta scrivendo (un foglio aperto o un campo con del testo) né se si è stati via meno di mezzo minuto.
let agNascostaDal = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { agNascostaDal = Date.now(); return; }
  if (!agNascostaDal || Date.now() - agNascostaDal < 30000) return;
  agNascostaDal = 0;
  if (!ST.utente || ST.tab !== 'agenda' || !AG.giorno) return;
  if (document.querySelector('.velo')) return;
  const f = document.activeElement;
  if (f && f.tagName && /^(INPUT|TEXTAREA)$/.test(f.tagName) && f.value) return;
  const oggi = MB21Coda.oggiRoma();
  AG.lettaAlle = 0;   // al ritorno si rilegge comunque (le spunte dell'altro telefono), anche dentro i 15 minuti della memoria
  apriAgenda(AG.oggiVisto && AG.oggiVisto !== oggi ? oggi : AG.giorno);
});

// Riaprire MB Plan entro 15 minuti (Ignazio 05/10: «portiamo a 15») sullo stesso giorno, per la stessa persona, senza nessuna scrittura nel frattempo, riusa quello che ha già letto
// (note 013/017, registri Supabase): prima ogni tocco sul tab, o ogni ritorno da una scheda, rifaceva le 10-12 richieste.
const AG_FRESCA_MS = 15 * 60000;
const chiaveAgenda = () => `${visto().id}|${vediTutti() ? 'tutti' : ''}|${AG.giorno}|${AG.vista}|${AG.tutteLeCose ? 1 : 0}`;
const agendaFresca = () => !!AG.lettaAlle && AG.lettaChiave === chiaveAgenda() && Date.now() - AG.lettaAlle < AG_FRESCA_MS
  && (typeof SCRITTURE === 'undefined' || SCRITTURE.ultima < AG.lettaAlle);
async function caricaAgenda() {
  const A = MB21Agenda;
  if (agendaFresca()) return;
  AG.lettaAlle = 0;
  AG.settimana = A.settimana(AG.giorno);
  // si legge la settimana E la griglia del mese (6 settimane): servono i pallini del mese nella colonna destra (22/09)
  const griglia0 = A.settimana(AG.giorno.slice(0, 8) + '01')[0], griglia1 = A.spostaGiorno(griglia0, 42);
  const da = A.isoDaRoma(griglia0 < AG.settimana[0] ? griglia0 : AG.settimana[0], '00:00');
  const a = A.isoDaRoma(griglia1 > A.spostaGiorno(AG.settimana[6], 1) ? griglia1 : A.spostaGiorno(AG.settimana[6], 1), '00:00');
  const oggi = MB21Coda.oggiRoma(), adesso = new Date().toISOString();
  const ids = idVisti();   // Partner Select (lavoro 3): il partner scelto, o tutti
  const richieste = [
    dbq('agenda appuntamenti', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', ids).neq('tipo_azione', 'Contatto').gte('inizio', da).lt('inizio', a)),
    // Contatti: richiami/appuntamenti dati dalla coda (data scelta) e telefonate programmate dall'Agenda (non completate)
    dbq('agenda contatti', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', ids).eq('tipo_azione', 'Contatto')
      .or(`and(data_scelta.gte."${da}",data_scelta.lt."${a}"),and(data_scelta.is.null,completata.eq.false,inizio.gte."${da}",inizio.lt."${a}")`)),
    dbq('agenda senza esito', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', ids).neq('tipo_azione', 'Contatto').eq('completata', false).lt('inizio', adesso).order('inizio', { ascending: false }).limit(LIMITE_SENZA_ESITO)),
  ];
  const conferme = AG.giorno === oggi ? Promise.all([caricaConferme(), caricaRiordini(oggi)]) : null;   // cantiere 29: stesso elenco del riquadro in Dashboard
  if (vediTutti()) { /* telefonate e rientri sono di un partner */ }
  else if (AG.giorno === oggi) richieste.push(dbq('stato di oggi', supa.rpc('stato_oggi', guardoAltri() ? { p_utente: visto().id } : {})));
  else if (AG.giorno > oggi) richieste.push(dbq('rientri del giorno', supa.from('contatti_coda').select('id, nome, categoria').eq('user_id', visto().id).eq('rientro_il', AG.giorno).order('nome').limit(300)));
  // Cose da fare (cantiere 41): quelle della settimana più tutte le non fatte del passato (si riportano a oggi).
  // Con «Tutti» niente: sono un foglio personale, non un elenco di squadra.
  // Solo gli ultimi 12 mesi (Ignazio 04/10, nota 021): le non fatte del passato e le cose di mese, settimana e periodo più vecchie di un anno
  // non si leggono più a ogni apertura; «Vedi tutto» in fondo al foglio le carica (AG.tutteLeCose). Le cose dell'anno sono poche e restano sempre.
  const limite = AG.tutteLeCose ? null : A.spostaGiorno(oggi, -366), dal = limite ? `,giorno.gte.${limite}` : '';
  const cose = vediTutti() ? null : dbq('cose da fare', supa.from('cose_da_fare').select('*, contatti(nome, categoria)').eq('user_id', visto().id)
    .or(`and(giorno.gte.${griglia0 < AG.settimana[0] ? griglia0 : AG.settimana[0]},giorno.lte.${griglia1 > AG.settimana[6] ? griglia1 : AG.settimana[6]}),and(giorno.lt.${oggi},fatto_il.is.null${dal}),and(scala.eq.mese${dal}),and(scala.eq.settimana${dal}),and(scala.eq.periodo${dal}),scala.eq.anno`));   // + le cose del mese e della settimana   // le spunte Core del mese vivono sul primo del mese
  // c'è qualcosa di più vecchio che non si legge? (solo se serve il «Vedi tutto»; una chiamata leggera, senza righe)
  const vecchie = vediTutti() || !limite ? null : dbq('cose più vecchie', supa.from('cose_da_fare').select('id', { count: 'exact', head: true }).eq('user_id', visto().id)
    .lt('giorno', limite).is('fatto_il', null).is('progetto_id', null).is('modello_id', null).is('core', null).in('scala', ['giorno', 'settimana', 'mese', 'periodo']));
  const [app1, ric, pas, tel] = await Promise.all(richieste);
  await conferme;
  // gli spazi della settimana preparati prima («Modello appuntamenti settimanale», 27/09): solo l'Admin, per ora
  const spazi = vediSpazi() ? dbq('spazi', supa.from('spazi').select('*').eq('user_id', visto().id).gte('inizio', da).lt('inizio', a).order('inizio')) : null;
  // gli impegni ricevuti da altri (nota 027): mai con «Tutti»; se la funzione non c'è ancora o non risponde, l'Agenda si apre senza di loro
  const ricevuti = vediTutti() ? null : dbq('impegni ricevuti', supa.rpc('impegni_ricevuti', { p_da: da, p_a: a }));
  const [cd, sp, vc, rc] = await Promise.all([cose, spazi, vecchie, ricevuti, caricaFrontali()]);
  AG.cosePiuVecchie = !!(vc && !vc.error && vc.count > 0);
  AG.spazi = sp && !sp.error ? sp.data : [];   // se la lettura non riesce, MB Plan si apre lo stesso, senza spazi
  AG.ricevuti = rc && !rc.error && Array.isArray(rc.data) ? rc.data : [];
  for (const r of [app1, ric, pas, tel, cd]) if (r && r.error) throw r.error;
  // una telefonata scelta a mano senza orario (nota 012) sta solo in coda, in Dashboard: in Agenda entra quando ha un'ora o quando è fatta (allora l'ora è quella)
  AG.azioni = MB21Agenda.senzaDoppioniCoda([...app1.data, ...ric.data]).filter(a => !(a.senza_ora && !a.completata));
  AG.passati = pas.data;
  // il promemoria «Ti eri detto…» (cantiere 42) per gli impegni ancora da fare e i richiami dalla coda: si legge insieme al resto
  const ricordi = caricaRicordi([...AG.azioni, ...AG.passati].filter(e => !e.esito || (e.tipo_azione === 'Contatto' && e.data_scelta)).map(e => e.contatto_id));
  AG.cose = cd ? cd.data : [];
  const w = await dbq('WES', supa.from('wes').select('data, giorno').order('data'));
  AG.wes = w.error ? [] : w.data;
  if (AG.vista === 'periodo') await caricaPeriodo();
  if (AG.vista === 'anno') { const y = AG.giorno.slice(0, 4); await caricaIntervallo(`${y}-01-01`, `${Number(y) + 1}-01-01`); }
  await aggiungiPortatoDa([...AG.azioni, ...AG.passati]);
  // Un giorno che deve venire (Ignazio 27/09): in coda contano solo le persone che quel giorno non hanno già un orario
  // fissato (un messaggio alle 10:30 si vede già tra gli impegni); toccando la pillola si vedono i nomi, non la Dashboard di oggi.
  const conOrario = new Set(MB21Agenda.eventiDelGiorno(AG.azioni, AG.giorno).map(e => e.contatto_id));
  AG.telefonate = !tel ? null : AG.giorno === oggi ? { oggi: true, ...tel.data } : { oggi: false, inCoda: (tel.data || []).filter(c => !conOrario.has(c.id)) };
  await ricordi;
  AG.lettaChiave = chiaveAgenda(); AG.lettaAlle = Date.now();   // letta adesso: per 15 minuti, senza scritture, non si rilegge
}

// ── Come si guarda l'Agenda (cantiere 37): «orario» (la griglia del giorno), «settimana», «elenco».
// La scelta si ricorda sul telefono: chi lavora a orario riapre a orario.
// Dal cantiere 41 (pagina formato NotePlan) le viste sono due: «giorno» (il foglio del giorno, con la griglia a orario
// nel cassetto «Timeline») e «settimana» (sette colonne). «orario» ed «elenco» salvati prima valgono come «giorno».
const VISTE = ['giorno', 'settimana', 'mese', 'periodo', 'anno'];
const CHIAVE_VISTA = 'mb21-agenda-vista';
// Ogni scala ha la sua icona e il suo colore (Ignazio 23/09): Giorno verde · Settimana blu · Mese viola · Periodo WES lampone · Anno arancio
const SCALE_MENU = [['giorno', 'Giorno', 'scala-giorno'], ['settimana', 'Settimana', 'scala-settimana'], ['mese', 'Mese', 'scala-mese'], ['periodo', 'Periodo WES', 'biglietto'], ['anno', 'Anno', 'scala-anno']];
const ALT_ORA = 58;        // quanto è alta un'ora nella griglia del giorno (px)
const ALT_ORA_SETT = 42;   // nella settimana: compressa, ma un impegno di mezz'ora resta leggibile
function vistaSalvata() {
  try { const v = localStorage.getItem(CHIAVE_VISTA); if (VISTE.includes(v)) return v; } catch (e) {}
  return 'giorno';
}
function cambiaVista(v) {
  AG.vista = v;
  try { localStorage.setItem(CHIAVE_VISTA, v); } catch (e) {}
  AG.portato = null;   // la griglia si riposiziona su «adesso»
  // si ricarica: Periodo WES e Anno leggono i loro dati solo nel caricamento (prima il Periodo WES si apriva vuoto,
  // «Nessun WES registrato», e l'Anno senza puntini: Ignazio 23/09)
  apriAgenda(AG.giorno);
}

// I richiami del giorno (contatti, conferme, riordini, appuntamenti senza esito) in una riga di pastiglie
// corte **sopra** la giornata: in fondo alla griglia a orario finivano dopo mezzo metro di schermo e non
// si guardavano più (Ignazio 21/09). Gli id sono gli stessi di prima, così i tocchi portano dove portavano.
function richiamiAgenda(oggi) {
  const voci = [];
  const t = AG.telefonate;
  if (t && t.oggi) voci.push(['ag-telefonate', 'telefonate', 'telefonate', (t.contatti_al_giorno === 0 ? 'Contatti <b>in pausa</b>' : `Contatti <b>${esc(MB21Coda.contoGiorno(t.fatti_oggi, t.contatti_al_giorno))}</b>`)]);   // «5 di 5 ✓ e 2 in più» (nota 012)
  else if (t && t.inCoda && t.inCoda.length) voci.push(['ag-in-coda', 'telefonate', 'telefonate', `<b>${t.inCoda.length}</b> in coda`]);
  if (AG.giorno === oggi && RIO.righe.length) voci.push(['ag-riordini', 'riordini', 'riordini', `<b>${RIO.righe.length}</b> ${RIO.righe.length === 1 ? 'riordino' : 'riordini'}`]);
  if (AG.giorno === oggi && CONF.righe.length) voci.push(['ag-conferme', 'conferme', 'conferme', `<b>${CONF.righe.length}</b> ${CONF.righe.length === 1 ? 'conferma' : 'conferme'}`]);
  if (AG.passati.length) voci.push(['ag-passati', 'passati', 'attenzione', `<b>${AG.passati.length >= LIMITE_SENZA_ESITO ? LIMITE_SENZA_ESITO + '+' : AG.passati.length}</b> senza esito`]);
  if (!voci.length) return '';
  return `<div class="ag-rich">${voci.map(([id, tinta, icona, testo]) =>
    `<button id="${id}" class="${tinta}">${ic(icona)}<span>${testo}</span></button>`).join('')}</div>`;
}

// Chi torna in coda in un giorno che deve venire, senza un orario fissato (27/09): i nomi, e la scheda a un tocco.
// Quel giorno le stesse persone saranno nella Dashboard, tra quelle da contattare.
function codaDelGiorno() {
  const lista = (AG.telefonate && AG.telefonate.inCoda) || [];
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto"><div class="testa-foglio"><h3>In coda ${esc(titoloGiorno(AG.giorno, MB21Coda.oggiRoma()).toLowerCase())}</h3><button id="cg-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <div class="vn-aiuto">${lista.length === 1 ? 'Questa persona torna' : 'Queste persone tornano'} da contattare quel giorno, senza un orario fissato. Quel giorno ${lista.length === 1 ? 'la trovi' : 'le trovi'} nella Dashboard, tra le persone da contattare.</div>
    <div class="cg-lista">${lista.map(c => `<button data-contatto="${esc(c.id)}"><span class="ts-pastiglia ${classeCat(c.categoria)}">${esc(iniziali(c.nome))}</span><span>${esc(c.nome)}<small>${esc(c.categoria || '')}</small></span>${ic('freccia')}</button>`).join('')}</div></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#cg-x').onclick = chiudi;
  velo.querySelectorAll('[data-contatto]').forEach(b => { b.onclick = () => { chiudi(); apriContattoDa(b.dataset.contatto); }; });
}

// ── Le cose da fare del giorno (cantiere 41): «Da fare», una lista sola, ognuna legata a chi o a cosa serve ──
// Dal 05/10/2026 (Ignazio) MB Plan ha solo «Da fare»: via i Modelli personali e i Progetti. Ogni cosa è legata a una persona della
// lista o al Team, al LdS, a Network 21, ad Amway (pastiglia colorata sulla riga) e si scrive scegliendo prima «Per chi è».
// Chi decide cosa si vede in che giorno è MB21Agenda.coseDelGiorno: una cosa non fatta ieri si vede oggi con «da <giorno>».
// Una riga: la spunta tonda, il testo e sotto la pastiglia del legame con, se ci sono, l'ora e «da GG/MM».
function rigaCosaHtml(c, attr, riportata) {
  const sotto = [oraDurata(c), riportata || '', c.ripeti ? '↻ ' + ((MB21Agenda.RIPETIZIONI.find(x => x[0] === c.ripeti) || [])[1] || '').toLowerCase() : ''].filter(Boolean).join(' · ');
  return `<div class="cosa${c.fatto_il ? ' fatta' : ''}" ${attr}="${esc(c.id)}">
      <button class="spunta" aria-label="${c.fatto_il ? 'Fatta: rimetti da fare' : 'Fatta'}">${c.fatto_il ? ic('fatto') : ''}</button>
      <button class="testo"><span>${esc(c.testo)}</span><small class="cosa-sotto">${legamePastiglia(c)}${sotto ? `<em>${esc(sotto)}</em>` : ''}</small></button>
    </div>`;
}
// Il campo per aggiungere: prima «Per chi è?» (obbligatorio; resta quello dell'ultima cosa scritta, per averne di seguito dello stesso tipo), poi il testo.
const legamiNuovaHtml = () => `<b>Per chi è?</b>${legamiHtml(AG.legame)}`;
function nuovaCosaHtml(scala, segnaposto) {
  return `<form class="ag-cosa-nuova" data-scala="${scala}"><div class="lg-nuova">${legamiNuovaHtml()}</div>
    <div class="ag-cosa-riga"><input type="text" placeholder="${esc(segnaposto)}" autocomplete="off"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></div></form>`;
}
// Il filtro sopra la lista: solo i legami che hanno almeno una cosa (con una sola cosa o un solo legame non serve)
function filtroLegamiHtml(cose) {
  const A = MB21Agenda, quante = {};   // quante ancora da fare per ogni legame (il conto sta sulla pastiglia)
  for (const c of cose) { const l = A.legameDi(c), k = l ? l.tipo : 'no'; quante[k] = (quante[k] || 0) + (c.fatto_il ? 0 : 1); }
  if (cose.length < 3 || Object.keys(quante).length < 2) return '';
  const voci = [...A.LEGAMI.map(([k, n]) => [k, n]), ['persona', 'Persone'], ['no', 'Da collegare']].filter(([k]) => k in quante);
  return `<div class="lg-filtro" role="group" aria-label="Mostra solo">${[['', 'Tutte'], ...voci].map(([k, n]) => `<button type="button" class="${(AG.filtro || '') === k ? 'scelto' : ''}" data-filtro="${k}">${esc(n)}${k ? ` <b>${quante[k]}</b>` : ''}</button>`).join('')}</div>`;
}
const passaFiltro = c => { const f = AG.filtro; if (!f) return true; const l = MB21Agenda.legameDi(c); return f === 'no' ? !l : !!l && l.tipo === f; };

function foglioHtml(oggi) {
  const A = MB21Agenda;
  const tutte = A.coseDelGiorno(AG.cose, AG.giorno, oggi);
  if (AG.filtro && !tutte.some(passaFiltro)) AG.filtro = '';   // non resta un filtro su qualcosa che non c'è più
  const cose = tutte.filter(passaFiltro);
  const gg = g => `${Number(g.slice(8))}/${Number(g.slice(5, 7))}`;
  const nomeGiorno = AG.giorno === oggi ? 'oggi' : AG.giorno === A.spostaGiorno(oggi, 1) ? 'domani' : titoloGiorno(AG.giorno, oggi).toLowerCase();
  const restano = tutte.filter(c => !c.fatto_il).length;
  let h = '<div class="ag-foglio">' + scalaSopraHtml('settimana', oggi);
  h += `<section class="ag-sezione ag-dafare"><h2 class="ag-sez"><span>Da fare ${esc(nomeGiorno)}</span><small class="ag-sez-conto">${restano ? `${restano} da fare` : tutte.length ? 'tutto fatto' : ''}</small></h2>
    ${filtroLegamiHtml(tutte)}
    <div class="ag-sezione-dentro">${cose.map(c => rigaCosaHtml(c, 'data-cosa', c.riportata ? `da ${gg(c.riportata)}` : '')).join('')
      || `<p class="ag-dafare-vuoto">${tutte.length ? 'Niente con questo filtro.' : 'Niente da fare. Scrivi qui sotto la prima: scegli per chi è, poi cosa c\'è da fare.'}</p>`}
      ${nuovaCosaHtml('giorno', 'Cosa c\'è da fare…')}</div></section>`;
  if (AG.cosePiuVecchie && !AG.tutteLeCose) h += '<button class="link" id="ag-vedi-tutto">Ci sono cose da fare più vecchie di un anno · Vedi tutto</button>';
  h += '</div>';
  return h;
}

const CHIAVE_SEZIONI_CHIUSE = 'mb21-sezioni-chiuse';
function sezioniChiuse() { try { const v = JSON.parse(localStorage.getItem(CHIAVE_SEZIONI_CHIUSE) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function cambiaSezione(chiave) {
  const ora = sezioniChiuse(), dopo = ora.includes(chiave) ? ora.filter(x => x !== chiave) : [...ora, chiave];
  try { localStorage.setItem(CHIAVE_SEZIONI_CHIUSE, JSON.stringify(dopo)); } catch (e) {}
  disegnaAgenda();
}

// La scala sopra, ripiegata in cima al foglio, come NotePlan (Ignazio 23/09: «su NotePlan rimaneva sempre la scritta»):
// nel Giorno la settimana, nella Settimana il mese. C'è SEMPRE, anche vuota («niente da fare»); chiusa all'inizio.
// Un tocco la apre sul posto: le voci dei modelli di quella scala, le sue cose da fare (spunta, tocco = foglio), il campo
// «Aggiungi alla settimana/al mese» e «Apri la Settimana ›». Aperta/chiusa si ricorda sul dispositivo (chiave «su-<scala>»).
function scalaSopraHtml(scala, oggi) {
  const A = MB21Agenda, inizio = inizioScalaMB(scala, AG.giorno);
  const cose = A.coseDellaScala(AG.cose, scala, inizio, inizioScalaMB(scala, oggi));
  const restano = cose.filter(c => !c.fatto_il).length;
  const chiave = 'su-' + scala, aperta = sezioniChiuse().includes(chiave);   // qui la chiave salvata vuol dire «aperta»
  const nome = scala === 'mese' ? A.titoloMese(inizio) : (() => {
    const g6 = A.spostaGiorno(inizio, 6), m = x => A.titoloMese(x).split(' ')[0].toLowerCase();
    return `Settimana ${A.numeroSettimana(inizio)} · ${Number(inizio.slice(8))}${inizio.slice(5, 7) === g6.slice(5, 7) ? '' : ' ' + m(inizio)}–${Number(g6.slice(8))} ${m(g6)}`;
  })();
  return `<section class="ag-sopra sc-${scala}${aperta ? ' aperta' : ''}">
    <button class="ag-sopra-testa" data-chiudi-sez="${chiave}" aria-expanded="${aperta}">${ic('freccia')}${ic(scala === 'mese' ? 'scala-mese' : 'scala-settimana')}<b>${esc(nome)}</b><small>${restano ? `${restano} da fare` : 'niente da fare'}</small></button>
    ${aperta ? `<div class="ag-sopra-dentro">
      ${cose.map(c => rigaCosaHtml(c, 'data-cosa', c.riportata ? (scala === 'mese' ? 'dal mese prima' : `da sett. ${A.numeroSettimana(c.riportata)}`) : '')).join('')}
      ${nuovaCosaHtml(scala, `Aggiungi ${scala === 'mese' ? 'al mese' : 'alla settimana'}…`)}
      <button class="link ag-sopra-apri" data-apri-scala="${scala}">Apri ${scala === 'mese' ? 'il Mese' : 'la Settimana'} ›</button></div>` : ''}
  </section>`;
}

// La card degli impegni del giorno, come NotePlan: una riga per impegno, pallino della categoria · titolo · orario a pastiglia.
function impegniHtml(eventi, opz) {
  const A = MB21Agenda;
  const spazi = spaziDelGiorno(AG.giorno);   // gli spazi «da riempire» stanno in mezzo agli impegni, al loro orario
  const ricevuti = ricevutiDelGiornoMB(AG.giorno);   // e gli impegni ricevuti da altri (nota 027)
  if (!eventi.length && !spazi.length && !ricevuti.length) return `<div class="ag-impegni vuota">Nessun impegno. Tocca <b>+</b> o apri la Timeline.</div>`;
  const righe = eventi.map(e => {
    const r = A.riga(e, opz), cat = (e.contatti && e.contatti.categoria) || e.categoria;
    return { t: Date.parse(e.quando || e.inizio), h: `<button class="ag-imp${e.completata ? ' fatta' : ''}" data-evento="${esc(e.id)}"><i class="${classeCat(cat)}"></i><span>${esc(r.titolo)}${e.portatoNome ? `<small>${rigaPortato(e.portatoNome)}</small>` : ''}</span><b>${esc(A.orario(e))}${e.confermato_il && !e.completata ? ' 👍' : ''}</b></button>` };
  }).concat(spazi.map(x => ({ t: Date.parse(x.inizio), h: rigaSpazioHtml(x) })), ricevuti.map(x => ({ t: Date.parse(x.inizio), h: rigaRicevutoHtml(x) })));
  return `<div class="ag-impegni">${righe.sort((x, y) => x.t - y.t).map(x => x.h).join('')}</div>`;
}

// Il titolo del giorno: «Oggi, mar 22 set» · «Domani, mer 23 set» · «gio 24 set»
function titoloGiorno(giorno, oggi) {
  const A = MB21Agenda;
  const d = new Date(giorno + 'T12:00:00Z');
  const breve = `${A.GIORNI_SETTIMANA[A.giornoSettimana(giorno) - 1].toLowerCase()} ${Number(giorno.slice(8))} ${A.titoloMese(giorno).slice(0, 3).toLowerCase()}`;
  if (giorno === oggi) return `Oggi, ${breve}`;
  if (giorno === A.spostaGiorno(oggi, 1)) return `Domani, ${breve}`;
  if (giorno === A.spostaGiorno(oggi, -1)) return `Ieri, ${breve}`;
  return breve.charAt(0).toUpperCase() + breve.slice(1);
}

// Le pastiglie «Per chi è?» dei campi «Aggiungi…»: lo scelto vale per tutti i campi della pagina e resta per la cosa dopo
function collegaLegamiNuova(radice) {
  radice.querySelectorAll('.ag-cosa-nuova .lg-nuova').forEach(box => {
    box.querySelectorAll('[data-lg]').forEach(b => { b.onclick = async () => {
      AG.legame = await sceglieLegame(b.dataset.lg, AG.legame);
      radice.querySelectorAll('.ag-cosa-nuova .lg-nuova').forEach(x => { x.innerHTML = legamiNuovaHtml(); });
      collegaLegamiNuova(radice);
    }; });
  });
}

function collegaCose(oggi) {
  const A = MB21Agenda;
  collegaLegamiNuova(app);
  app.querySelectorAll('.ag-foglio .ag-cosa-nuova').forEach(form => {
    const campo = form.querySelector('input');
    form.onsubmit = async ev => {
      ev.preventDefault();
      const testo = A.testoCosa(campo.value);
      if (!testo) return;
      const campi = A.campiLegame(AG.legame);   // senza «Per chi è?» non si salva (Ignazio 05/10)
      if (!campi) { form.querySelector('.lg-nuova').classList.add('manca'); return mostraToast('Scegli prima per chi è: una persona, Team, LdS, Network 21 o Amway'); }
      avvisaSeLungo(campo.value);
      const scala = form.dataset.scala || 'giorno';
      const ordine = AG.cose.reduce((m, c) => Math.max(m, c.ordine || 0), 0) + 1;
      const { data, error } = await dbq('nuova cosa da fare', supa.from('cose_da_fare').insert({ user_id: visto().id, testo, giorno: inizioScalaMB(scala, AG.giorno), scala, ordine, ...campi }).select('*, contatti(nome, categoria)').single());
      if (error) return;
      AG.cose.push(data);
      disegnaAgenda();
      const c2 = app.querySelector(`.ag-cosa-nuova[data-scala="${scala}"] input`);
      if (c2) c2.focus();   // si continua a scrivere la prossima, senza ritoccare il campo
    };
  });
  // la spunta (tonda) e il testo di ogni riga: sono figli diretti della riga `.cosa[data-cosa]`
  const dellaRiga = el => AG.cose.find(x => x.id === el.parentElement.dataset.cosa);
  app.querySelectorAll('.ag-foglio .cosa[data-cosa] .spunta').forEach(b => { const c = dellaRiga(b); if (c) b.onclick = () => spuntaCosa(c); });
  app.querySelectorAll('.ag-foglio .cosa[data-cosa] .testo').forEach(b => { const c = dellaRiga(b); if (c) b.onclick = () => foglioCosa(c, oggi); });
  app.querySelectorAll('[data-chiudi-sez]').forEach(b => { b.onclick = () => cambiaSezione(b.dataset.chiudiSez); });
  app.querySelectorAll('[data-apri-scala]').forEach(b => { b.onclick = () => cambiaVista(b.dataset.apriScala); });
  app.querySelectorAll('.lg-filtro [data-filtro]').forEach(b => { b.onclick = () => { AG.filtro = b.dataset.filtro; disegnaAgenda(); }; });
}

// La riga piccola sotto una cosa da fare nelle liste di Settimana, Mese, Periodo, Anno e della scala sopra: le parti non
// vuote separate da « · » (la riportata)
const sottoCosa = parti => { const s = parti.filter(Boolean).join(' · '); return s ? `<small>${esc(s)}</small>` : ''; };
// Il tipo di una riga: scelto con i tre bottoni, oppure scritto all'inizio come in NotePlan («1. » numerato, «- » o «• »
// puntini, «[] » «☐ » «- [ ] » da fare, «- [x] » e «✓ » fatte). La lettura è MB21Agenda.leggiRiga (con le prove, 24/09).
// Una riga più lunga del massimo si accorcia, ma lo si dice (Ignazio 24/09: col dettato la fine si perdeva in silenzio)
function avvisaSeLungo(testo, max = MB21Agenda.MAX_COSA) {
  if (MB21Agenda.testoTroppoLungo(testo, max)) mostraToast(`Testo lungo: tenute le prime ${max} lettere`);
}
// Spuntare = fatta oggi (o nel giorno che stai guardando): una cosa riportata da ieri, spuntata, resta nel giorno in cui l'hai fatta.
// `opz.ridisegna` e `opz.giorno`: dalla scheda del contatto (23/09) si ridisegna la scheda, non MB Plan, e la fatta va su oggi
async function spuntaCosa(c, opz = {}) {
  const ridisegna = opz.ridisegna || disegnaAgenda;
  const prima = { fatto_il: c.fatto_il, giorno: c.giorno };
  const dopo = c.fatto_il ? { fatto_il: null } : { fatto_il: new Date().toISOString(), giorno: inizioScalaMB(c.scala || 'giorno', opz.giorno || AG.giorno) };
  const prossima = dopo.fatto_il ? MB21Agenda.prossimaRipetizione(c, MB21Coda.oggiRoma()) : null;   // una cosa che si ripete (05/10)
  const { error } = await dbq('cosa da fare', supa.from('cose_da_fare').update(dopo).eq('id', c.id));
  if (error) return;
  Object.assign(c, dopo);
  const nuova = prossima ? await creaProssima(c, prossima) : null;
  ridisegna();
  if (dopo.fatto_il) mostraToast(nuova ? `Fatta ✓ · tornerà ${dataLunga(nuova.giorno)}` : 'Fatta ✓', async () => {
    const r = await dbq('cosa da fare', supa.from('cose_da_fare').update(prima).eq('id', c.id));
    if (r.error) return;
    Object.assign(c, prima);
    if (nuova && nuova.id) {   // l'Annulla toglie anche la copia appena nata
      await dbq('ripetizione', supa.from('cose_da_fare').delete().eq('id', nuova.id));
      AG.cose = AG.cose.filter(x => x.id !== nuova.id);
    }
    ridisegna();
  });
}
// La copia per la prossima volta: stesso testo, legame, ora e ripetizione, aperta, nel giorno calcolato. Se c'è già una uguale aperta in quel
// giorno (spunta, toglie la spunta, spunta di nuovo) non se ne fa un'altra. Rende la riga nuova ({ giorno } anche senza id se c'era già).
async function creaProssima(c, p) {
  const ce = await dbq('ripetizione già c\'è', supa.from('cose_da_fare').select('id').eq('user_id', c.user_id).eq('testo', c.testo).eq('giorno', p.giorno).eq('scala', p.scala).is('fatto_il', null).limit(1));
  if (ce.error) return null;
  if (ce.data && ce.data.length) return { giorno: p.giorno };
  const riga = { user_id: c.user_id, testo: c.testo, giorno: p.giorno, scala: p.scala, ordine: c.ordine || 0, contatto_id: c.contatto_id || null, legato_a: c.legato_a || null,
    ora: c.ora || null, durata: c.durata || null, ripeti: c.ripeti };
  const { data, error } = await dbq('ripetizione', supa.from('cose_da_fare').insert(riga).select('*, contatti(nome, categoria)').single());
  if (error || !data) return null;
  if (typeof AG !== 'undefined' && Array.isArray(AG.cose)) AG.cose.push(data);
  return { ...data, giorno: p.giorno };
}

// ── «Per chi è» (Ignazio 05/10/2026): ogni cosa da fare di MB Plan è legata a una persona della lista o al Team, al LdS, a Network 21,
// ad Amway; senza legame non si salva. Le pastiglie sono le stesse nel campo «Aggiungi…», nel foglio della cosa e nel Cerca.
// `l` = { tipo, nome, contatto_id? } (tipo: 'persona' o una chiave di MB21Agenda.LEGAMI) o null.
function legamiHtml(l) {
  const A = MB21Agenda, per = l && l.tipo === 'persona';
  return `<div class="lg-scelte" role="group" aria-label="Per chi è">${A.LEGAMI.map(([k, n]) => `<button type="button" class="lg lg-${k}${l && l.tipo === k ? ' scelto' : ''}" data-lg="${k}" aria-pressed="${!!(l && l.tipo === k)}">${esc(n)}</button>`).join('')}`
    + `<button type="button" class="lg lg-persona${per ? ' scelto' : ''}" data-lg="persona" aria-pressed="${!!per}">${ic('persona')} ${per ? esc(l.nome) : 'Una persona'}</button></div>`;
}
// Il tocco su una pastiglia: Team, LdS, Network 21, Amway danno subito il legame; «Una persona» apre la lista (solo Prospect, Partner, Cliente).
// Rende il legame nuovo, oppure quello di prima se si rinuncia.
async function sceglieLegame(chiave, prima) {
  if (chiave !== 'persona') return { tipo: chiave, nome: (MB21Agenda.LEGAMI.find(x => x[0] === chiave) || [])[1] };
  const x = await sceltaContatto('A chi si riferisce', '');
  if (!x) return prima;
  if (!['Prospect', 'Partner', 'Cliente'].includes(x.categoria)) { mostraToast('Si collega solo a un Prospect, Partner o Cliente'); return prima; }
  return { tipo: 'persona', nome: x.nome, contatto_id: x.id, categoria: x.categoria };
}
// La pastiglia piccola sulla riga di una cosa: il nome della persona o Team / LdS / Network 21 / Amway; «Da collegare» per le vecchie senza legame
function legamePastiglia(c) {
  const l = MB21Agenda.legameDi(c);
  return l ? `<span class="lg-pastiglia lg-${esc(l.tipo)}">${l.tipo === 'persona' ? ic('persona') + ' ' : ''}${esc(l.nome)}</span>` : '<span class="lg-pastiglia lg-no">Da collegare</span>';
}

// Il foglio di una cosa da fare: si corregge il testo, si cambia per chi è, si manda a domani, si elimina. È un `foglio alto` (revisione 25/09): più alto
// dello schermo scorre; prima sull'iPhone la parte alta (titolo e testo) restava tagliata fuori.
function foglioCosa(c, oggi, opz = {}) {
  const ridisegna = opz.ridisegna || disegnaAgenda;
  const A = MB21Agenda;
  // Rimasta indietro (Ignazio 24/09): non fatta e con il giorno prima dell'inizio della sua scala di oggi. Si calcola qui,
  // perché il foglio si apre anche dalla riga salvata (giorno, scheda del contatto, Cerca), che «riportata» non ce l'ha:
  // prima diceva la data vecchia e le frecce di Settimana/Mese partivano da lì.
  const scalaR = c.scala || 'giorno';
  const rip = !c.fatto_il && c.giorno && c.giorno < inizioScalaMB(scalaR, oggi) ? c.giorno : null;
  // Settimana e Mese (Ignazio 23/09): si sceglie la settimana (o il mese) e, volendo, un giorno preciso dentro;
  // con il giorno la cosa diventa del Giorno (scala giorno), senza resta della settimana/del mese.
  // solo con il giorno (24/09): una riga senza giorno ma con la scala «settimana» faceva fallire il foglio (spostaGiorno(null))
  const sposta = c.giorno && ['settimana', 'mese'].includes(c.scala) ? {
    inizio: rip ? inizioScalaMB(c.scala, oggi) : c.giorno, giorno: null,
    giorni() { return c.scala === 'mese' ? Array.from({ length: 31 }, (_, i) => A.spostaGiorno(this.inizio, i)).filter(g => g.slice(0, 7) === this.inizio.slice(0, 7)) : Array.from({ length: 7 }, (_, i) => A.spostaGiorno(this.inizio, i)); },
    nome() {
      if (c.scala === 'mese') return A.titoloMese(this.inizio);
      const g = this.giorni(), m = x => A.titoloMese(x).split(' ')[0].toLowerCase();
      return `Settimana ${A.numeroSettimana(this.inizio)} · ${Number(g[0].slice(8))}${g[0].slice(5, 7) === g[6].slice(5, 7) ? '' : ' ' + m(g[0])}–${Number(g[6].slice(8))} ${m(g[6])}`;
    },
    quando() {
      if (c.fatto_il) return `Fatta · ${this.nome()}`;
      if (rip) return c.scala === 'mese' ? `Da fare dal mese di ${A.titoloMese(rip).toLowerCase()}, ancora aperta` : `Da fare dalla settimana ${A.numeroSettimana(rip)}, ancora aperta`;
      return c.scala === 'mese' ? `Da fare nel mese di ${A.titoloMese(this.inizio).toLowerCase()}` : `Da fare nella ${this.nome().replace('Settimana', 'settimana')}`;
    },
  } : null;
  // Le scorciatoie per spostare, come NotePlan (Ignazio 23/09): Oggi · Domani · Settimana prossima (· Mese prossimo);
  // un tocco sposta e chiude. «Settimana prossima» / «Mese prossimo» la fanno diventare una cosa di quella scala (senza ora).
  const inProgramma = !!c.giorno;
  const scalaC = c.scala || 'giorno', domaniG = A.spostaGiorno(oggi, 1);
  const settProssima = A.spostaGiorno(A.inizioScala('settimana', oggi), 7), meseProssimo = A.meseAccanto(oggi.slice(0, 8) + '01', 1);
  const rapide = c.fatto_il || !['giorno', 'settimana', 'mese'].includes(scalaC) ? [] : [
    ['oggi', 'Oggi', { scala: 'giorno', giorno: oggi }], ['domani', 'Domani', { scala: 'giorno', giorno: domaniG }],
    ...(inProgramma ? [] : [['questa-sett', 'Questa settimana', { scala: 'settimana', giorno: A.inizioScala('settimana', oggi), ora: null, durata: null }]]),
    ['settimana', 'Settimana prossima', { scala: 'settimana', giorno: settProssima, ora: null, durata: null }],
    ...(inProgramma ? [] : [['questo-mese', 'Questo mese', { scala: 'mese', giorno: oggi.slice(0, 8) + '01', ora: null, durata: null }]]),
    ['mese', 'Mese prossimo', { scala: 'mese', giorno: meseProssimo, ora: null, durata: null }],
  ].filter(([, , d]) => !(d.scala === scalaC && d.giorno === (rip ? (scalaC === 'giorno' ? oggi : inizioScalaMB(scalaC, oggi)) : c.giorno)))
    .filter(([k]) => !inProgramma || k !== 'mese' || scalaC === 'mese' || scalaC === 'settimana');
  let lg = A.legameDi(c); if (lg && lg.tipo === 'persona') lg = { ...lg, contatto_id: c.contatto_id };   // il legame che si sta scegliendo; si salva con «Salva»
  const ripetizioni = c.giorno ? A.ripetizioniPer(scalaC) : [];   // solo per le cose del Giorno, della Settimana e del Mese
  let ripetiScelta = c.ripeti || '';
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto"><h3>Cosa da fare${esc(aNome())}</h3>
    <div class="campo"><textarea id="fc-testo" rows="3">${esc(c.testo)}</textarea></div>
    ${opz.dallaScheda ? '' : `<div class="campo"><label>Per chi è <small>obbligatorio</small></label><div id="fc-legame">${legamiHtml(lg)}</div>
      ${c.contatto_id ? `<button type="button" class="link" id="fc-apri-contatto">${ic('persona')} Apri la scheda di ${esc((c.contatti && c.contatti.nome) || 'questa persona')} ›</button>` : ''}</div>`}
    <p class="fc-quando">${!c.giorno ? '' : sposta ? esc(sposta.quando()) : rip ? `Da fare dal ${esc(dataLunga(rip))}, ancora aperta` : c.fatto_il ? `Fatta ${esc(dataLunga(c.giorno))}` : `Da fare ${esc(dataLunga(c.giorno))}`}</p>
    ${sposta ? `<div class="campo"><label>${ic(c.scala === 'mese' ? 'scala-mese' : 'scala-settimana')} ${c.scala === 'mese' ? 'Mese' : 'Settimana'}</label>
      <div class="fc-scala"><button type="button" class="freccia" id="fc-sc-prima" aria-label="Prima">‹</button><b id="fc-sc-nome"></b><button type="button" class="freccia" id="fc-sc-dopo" aria-label="Dopo">›</button></div>
      <label style="margin-top:10px">${ic('scala-giorno')} Giorno <small>facoltativo</small></label>
      ${c.scala === 'mese' ? '<input type="date" id="fc-sc-giorno">' : '<div class="ag-scelte" id="fc-sc-giorni"></div>'}
      <div class="vn-aiuto" id="fc-sc-aiuto"></div></div>` : ''}
    ${!c.giorno || (c.scala || 'giorno') === 'giorno' ? `<div class="campo"><label>${ic('orario')} Giorno e ora <small>l'ora è facoltativa</small></label>
      <div class="ag-due-campi"><input type="date" id="fc-giorno" value="${esc(rip ? oggi : (c.giorno || ''))}"><input type="time" id="fc-ora" value="${esc(c.ora ? String(c.ora).slice(0, 5) : '')}"></div>
      ${pilloleDurata('fc-durate', c.durata || 30, c.ora ? String(c.ora).slice(0, 5) : '')}
      <div class="vn-aiuto">Occupa quell'ora nella Timeline, tratteggiata: non è un appuntamento e non conta da nessuna parte.${c.ora ? ' <button type="button" class="link" id="fc-togli-ora">Togli l\'ora</button>' : ''}</div></div>` : ''}
    ${ripetizioni.length && !c.fatto_il ? `<div class="campo"><label>↻ Si ripete <small>quando la spunti, ricompare da sola</small></label><div class="ag-scelte" id="fc-ripeti">${[['', 'Mai'], ...ripetizioni].map(([k, t]) => `<button type="button" data-ripeti="${k}" class="${(ripetiScelta || '') === k ? 'scelto' : ''}">${t}</button>`).join('')}</div></div>` : ''}
    ${rapide.length ? `<div class="campo"><label>${ic('agenda')} ${inProgramma ? 'Sposta a' : 'Metti in programma'} <small>con un tocco</small></label><div class="ag-scelte" id="fc-rapide">${rapide.map(([k, t]) => `<button type="button" data-rapida="${k}">${t}</button>`).join('')}</div></div>` : ''}
    <button class="primario" id="fc-salva">Salva</button>
    <div class="fc-comandi">${c.fatto_il || ['giorno', 'settimana', 'mese'].includes(c.scala || 'giorno') ? '' : `<button class="link" id="fc-domani">${ic('agenda')} ${c.scala === 'periodo' ? 'Sposta al periodo dopo' : c.scala === 'anno' ? "Sposta all'anno dopo" : 'Sposta a domani'}</button>`}
    <button class="link elimina-qui" id="fc-elimina">Elimina</button></div>
    <button class="link" id="fc-no">Annulla</button></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#fc-no').onclick = chiudi;
  const postoLegame = velo.querySelector('#fc-legame');
  const collegaLegame = () => {
    if (!postoLegame) return;
    postoLegame.querySelectorAll('[data-lg]').forEach(b => { b.onclick = async () => { lg = await sceglieLegame(b.dataset.lg, lg); postoLegame.innerHTML = legamiHtml(lg); collegaLegame(); }; });
  };
  collegaLegame();
  if (sposta) {
    const nome = velo.querySelector('#fc-sc-nome'), aiuto = velo.querySelector('#fc-sc-aiuto');
    const pillole = velo.querySelector('#fc-sc-giorni'), data = velo.querySelector('#fc-sc-giorno');
    const aggiorna = () => {
      nome.textContent = sposta.nome();
      const g = sposta.giorni();
      if (pillole) {
        pillole.innerHTML = g.map((x, i) => `<button type="button" data-g="${x}" class="${sposta.giorno === x ? 'scelto' : ''}">${A.GIORNI[i]} ${Number(x.slice(8))}</button>`).join('');
        pillole.querySelectorAll('[data-g]').forEach(b => { b.onclick = () => { sposta.giorno = sposta.giorno === b.dataset.g ? null : b.dataset.g; aggiorna(); }; });
      }
      if (data) { data.min = g[0]; data.max = g[g.length - 1]; data.value = sposta.giorno || ''; }
      aiuto.textContent = sposta.giorno ? `Diventa una cosa di ${dataLunga(sposta.giorno)}: la trovi in quel Giorno.` : `Senza giorno resta tra le cose ${c.scala === 'mese' ? 'del mese' : 'della settimana'}.`;
    };
    const muovi = passo => { sposta.inizio = c.scala === 'mese' ? A.meseAccanto(sposta.inizio, passo) : A.spostaGiorno(sposta.inizio, 7 * passo); sposta.giorno = null; aggiorna(); };
    velo.querySelector('#fc-sc-prima').onclick = () => muovi(-1);
    velo.querySelector('#fc-sc-dopo').onclick = () => muovi(1);
    if (data) data.onchange = () => { sposta.giorno = data.value && sposta.giorni().includes(data.value) ? data.value : null; aggiorna(); };
    aggiorna();
  }
  const cambia = async dopo => {
    const { error } = await dbq('cosa da fare', supa.from('cose_da_fare').update(dopo).eq('id', c.id));
    if (error) return mostraToast('Non salvato: riprova.');   // prima il foglio restava fermo senza dire niente (23/09)
    Object.assign(c, dopo);
    chiudi();
    ridisegna();
  };
  let durata = c.durata || 30;
  collegaPilloleDurata(velo, 'fc-durate', () => { const o = velo.querySelector('#fc-ora'); return o && o.value; }, d => { durata = d; });
  velo.querySelectorAll('#fc-ripeti [data-ripeti]').forEach(b => { b.onclick = () => { ripetiScelta = b.dataset.ripeti; velo.querySelectorAll('#fc-ripeti [data-ripeti]').forEach(x => x.classList.toggle('scelto', x === b)); }; });
  const apriC = velo.querySelector('#fc-apri-contatto');
  if (apriC) apriC.onclick = () => { chiudi(); apriContattoDa(c.contatto_id); };
  const togli = velo.querySelector('#fc-togli-ora');
  if (togli) togli.onclick = () => cambia({ ora: null, durata: null });
  velo.querySelector('#fc-salva').onclick = () => {
    const testo = A.testoCosa(velo.querySelector('#fc-testo').value); avvisaSeLungo(velo.querySelector('#fc-testo').value);
    if (!testo) return mostraToast('Scrivi cosa c\'è da fare');
    const campoOra = velo.querySelector('#fc-ora'), campoGiorno = velo.querySelector('#fc-giorno');
    const dopo = { testo };
    if (ripetizioni.length && !c.fatto_il && ripetiScelta !== (c.ripeti || '')) dopo.ripeti = ripetiScelta || null;
    if (!opz.dallaScheda) {
      const campi = A.campiLegame(lg);
      if (!campi) return mostraToast('Scegli per chi è: una persona, Team, LdS, Network 21 o Amway');
      if (campi.contatto_id !== (c.contatto_id || null) || campi.legato_a !== (c.legato_a || null)) {
        Object.assign(dopo, campi);
        dopo.contatti = campi.contatto_id ? { nome: lg.nome, categoria: lg.categoria || (c.contatti && c.contatti.categoria) } : null;
      }
    }
    if (sposta) Object.assign(dopo, sposta.giorno ? { scala: 'giorno', giorno: sposta.giorno } : { giorno: sposta.inizio });
    if (campoOra && campoOra.value) {
      if (!campoGiorno.value || A.controllaGiorno(campoGiorno.value)) return mostraToast('Scegli il giorno');
      Object.assign(dopo, { ora: campoOra.value, durata, giorno: campoGiorno.value }, scalaC === 'giorno' ? {} : { scala: 'giorno' });
    } else if (campoGiorno && campoGiorno.value && campoGiorno.value !== (rip ? oggi : c.giorno)) {
      // solo il giorno, senza ora (Ignazio 23/09: dal 29 al 24 e restava sul 29)
      if (A.controllaGiorno(campoGiorno.value)) return mostraToast('Scegli il giorno');
      dopo.giorno = campoGiorno.value;
      if (scalaC !== 'giorno') dopo.scala = 'giorno';   // un giorno preciso: la riga è del Giorno (24/09)
    }
    // senza giorno la scala è sempre «giorno»
    if (!('giorno' in dopo ? dopo.giorno : c.giorno) && (dopo.scala || c.scala || 'giorno') !== 'giorno') dopo.scala = 'giorno';
    cambiaCosa(dopo);
  };
  // `contatti` è solo per lo schermo (la riga letta con il nome): nel database vanno i due campi del legame
  const cambiaCosa = async dopo => {
    const { contatti, ...perDb } = dopo;
    const { error } = await dbq('cosa da fare', supa.from('cose_da_fare').update(perDb).eq('id', c.id));
    if (error) return mostraToast('Non salvato: riprova.');
    Object.assign(c, dopo);
    chiudi();
    ridisegna();
  };
  velo.querySelectorAll('#fc-rapide [data-rapida]').forEach(b => { b.onclick = () => cambia({ ...rapide.find(([k]) => k === b.dataset.rapida)[2] }); });
  const domani = velo.querySelector('#fc-domani');
  const pw = c.scala === 'periodo' ? A.periodoWesDi(rip ? oggi : c.giorno, AG.wes) : null;
  if (domani && c.scala === 'periodo' && !(pw && pw.poi)) domani.remove();   // non c'è ancora il WES dopo: niente «periodo dopo»
  else if (domani && c.scala === 'periodo') domani.onclick = () => cambia({ giorno: pw.poi });
  else if (domani && c.scala === 'anno') domani.onclick = () => cambia({ giorno: `${Number((rip ? oggi : c.giorno).slice(0, 4)) + 1}-01-01` });
  else if (domani) domani.onclick = () => cambia({ giorno: A.spostaGiorno(rip ? oggi : c.giorno, 1) });
  velo.querySelector('#fc-elimina').onclick = async () => {
    const { error } = await dbq('cosa da fare', supa.from('cose_da_fare').delete().eq('id', c.id));
    if (error) return;
    AG.cose = AG.cose.filter(x => x.id !== c.id);
    chiudi();
    ridisegna();
  };
}

function disegnaAgenda() {
  if (typeof accendiTab === 'function') accendiTab();   // nella barra «Progetti» o «MB Plan» (25/09)
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const eventi = A.eventiDelGiorno(AG.azioni, AG.giorno);
  const opz = { mioId: vediTutti() ? null : visto().id, admin: eAdmin() };   // con «Tutti» il nome del partner su ogni riga
  const punti = A.puntiGiorni(AG.azioni, AG.settimana);
  const conCose = giorniConCose(AG.cose, oggi);
  if (AG.vista === 'mese') return disegnaMese();
  if (AG.vista === 'settimana') return disegnaSettimana();
  if (AG.vista === 'periodo') return disegnaPeriodo();
  if (AG.vista === 'anno') return disegnaAnno();
  let html = `
    <div class="ag-testa np">
      <span class="ag-menu-posto"></span>
      <button class="ag-mese">${esc(A.titoloMese(AG.giorno))} ▾<input type="date" id="ag-scegli" value="${AG.giorno}"></button>
      ${AG.giorno !== oggi ? '<button class="ag-oggi" id="ag-oggi">Oggi</button>' : ''}
      <button class="ag-piu" id="ag-nuovo" aria-label="Nuovo appuntamento">+</button></div>
    <div class="ag-settimana">
      <button class="freccia" id="ag-prima" aria-label="Settimana prima">‹</button>
      ${AG.settimana.map((g, i) => {
        const p = punti[g] || { punti: [], tanti: false, quanti: 0 };
        const dice = p.quanti === 1 ? '1 impegno' : `${p.quanti} impegni`;
        return `<button class="ag-giorno ${g === AG.giorno ? 'scelto' : ''} ${g === oggi ? 'oggi' : ''}" data-giorno="${g}" aria-label="${Number(g.slice(8))} · ${p.quanti ? dice : 'libero'}">
          <small>${A.GIORNI[i]}</small><b class="cc-n">${Number(g.slice(8))}${anelloCose(conCose, g)}</b>
          <span class="ag-punti">${p.punti.map(c => `<i class="${classeCat(c)}"></i>`).join('')}${p.tanti ? `<i class="tanti ${classeCat(null)}"></i>` : ''}</span></button>`;
      }).join('')}
      <button class="freccia" id="ag-dopo" aria-label="Settimana dopo">›</button>
    </div>
    <h1 class="ag-titolo sc-giorno sc-titolo">${ic('scala-giorno')}${esc(AG.vista === 'settimana' ? `Settimana ${Number(AG.settimana[0].slice(8))} – ${Number(AG.settimana[6].slice(8))} ${A.titoloMese(AG.settimana[6]).slice(0, 3).toLowerCase()}` : titoloGiorno(AG.giorno, oggi))}</h1>
    ${partnerSelect()}`;
  html += richiamiAgenda(oggi);
  const tre = largo() && AG.vista !== 'settimana';   // MB Plan a tre colonne (schermo largo)
  if (AG.vista === 'settimana') html += grigliaSettimana(opz);
  else {
    // la pagina formato NotePlan (cantiere 41): gli impegni in una card, sotto il foglio del giorno, in fondo il cassetto «Timeline»
    html += impegniHtml(eventi, opz);
    html += foglioHtml(oggi);
    if (!tre) html += `<button class="ag-cronologia" id="ag-cronologia">${ic('orario')} Timeline <span>${eventi.length ? `${eventi.length} ${eventi.length === 1 ? 'impegno' : 'impegni'}` : 'giornata libera'}</span>${ic('freccia')}</button>`;
  }
  // Telefono e iPad in verticale (Ignazio 22/09): due linguette a metà dei bordi, come la freccetta di NotePlan —
  // a sinistra il menu, a destra il mese e la Timeline; si aprono anche trascinando il dito dal bordo.
  if (!tre) html += `<button class="mb-linguetta sx" id="mb-ling-sx" aria-label="Apri il menu di MB Plan">${ic('freccia')}</button>`
    + (AG.vista === 'giorno' ? `<button class="mb-linguetta dx" id="mb-ling-dx" aria-label="Apri il mese e la Timeline">${ic('freccia')}</button>` : '');
  if (tre) html = `<div class="mb-3col"><aside class="mb-lato ag-lato">${menuAgendaHtml()}</aside><section class="mb-centro">${html}</section>
    <aside class="mb-destra">${meseHtml(AG.giorno, oggi)}<div class="mb-crono"><div class="mb-crono-titolo">${ic('orario')} Timeline</div>${grigliaGiorno(eventi, opz)}</div></aside></div>`;
  app.innerHTML = html + versione();
  collegaAgenda(eventi);
  collegaCose(oggi);
  if (!tre) {
    const sx = document.getElementById('mb-ling-sx'), dx = document.getElementById('mb-ling-dx');
    if (sx) sx.onclick = menuAgenda;
    if (dx) dx.onclick = () => pannelloDestro(eventi, opz);
  }
  if (tre) {
    collegaMenuAgenda(app, () => {});
    app.querySelectorAll('.mb-mese [data-giorno]').forEach(b => { b.onclick = () => { AG.aperta = null; AG.portato = null; apriAgenda(b.dataset.giorno); }; });
    app.querySelectorAll('.mb-mese [data-mese]').forEach(b => { b.onclick = () => { const m = A.spostaGiorno(AG.giorno.slice(0, 8) + '01', Number(b.dataset.mese) < 0 ? -1 : 32); apriAgenda(m.slice(0, 8) + '01'); }; });
    const vai = app.querySelector('#ag-vai-ora'); if (vai) vai.remove();
    const crono = app.querySelector('.mb-crono'), rif = crono && (crono.querySelector('.ag-adesso') || crono.querySelector('.ag-ev'));
    if (rif) crono.scrollTop = Math.max(0, rif.offsetTop - 120);
  }
}
// ── Il foglio del MESE (cantiere 41, vista C; Ignazio 22/09): il calendario grande con i pallini e i primi impegni
// scritti (su schermo largo), sotto le cose da fare del mese. Il Modulo Core sta nel menu, qui no.
function disegnaMese() {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const opz = { mioId: vediTutti() ? null : visto().id, admin: eAdmin() };
  const mese0 = AG.giorno.slice(0, 8) + '01', inizio = A.settimana(mese0)[0];
  const giorni = Array.from({ length: 42 }, (_, i) => A.spostaGiorno(inizio, i)).filter((g, i) => i < 35 || g.slice(0, 7) === mese0.slice(0, 7));
  const punti = A.puntiGiorni(AG.azioni, giorni, 4);
  const cose = A.coseDelMese(AG.cose, mese0, oggi.slice(0, 8) + '01');
  const conCose = giorniConCose(AG.cose, oggi);
  const nomeMese = g => A.titoloMese(g).split(' ')[0].toLowerCase();
  const tre = largo();
  // il mese si scrive una volta sola (Ignazio 22/09): il titolo grande con ‹ › e, toccandolo, la scelta della data
  let html = `<div class="ag-testa np"><span class="ag-menu-posto" style="flex:1"></span>
      ${mese0 !== oggi.slice(0, 8) + '01' ? '<button class="ag-oggi" id="ag-oggi">Oggi</button>' : ''}
      <button class="ag-piu" id="ag-nuovo" aria-label="Nuovo appuntamento">+</button></div>
    <div class="mm-testa sc-mese"><button class="freccia" id="mm-prima" aria-label="Mese prima">‹</button><h1 class="ag-titolo sc-titolo">${ic('scala-mese')}<button class="ag-mese mm-titolo">${esc(A.titoloMese(AG.giorno))} ▾<input type="date" id="ag-scegli" value="${AG.giorno}"></button></h1><button class="freccia" id="mm-dopo" aria-label="Mese dopo">›</button></div>
    ${partnerSelect()}
    <div class="mm-griglia">${A.GIORNI_SETTIMANA.map(g => `<b>${g}</b>`).join('')}
      ${giorni.map(g => {
        const p = punti[g] || { punti: [], tanti: false };
        const ev = A.eventiDelGiorno(AG.azioni, g);
        return `<button class="mm-g${g.slice(0, 7) !== mese0.slice(0, 7) ? ' altro' : ''}${g === oggi ? ' oggi' : ''}${g === AG.giorno ? ' scelto' : ''}" data-giorno="${g}">
          <span class="mm-n">${Number(g.slice(8))}${anelloCose(conCose, g)}</span>
          <span class="ag-punti">${p.punti.map(c => `<i class="${classeCat(c)}"></i>`).join('')}${p.tanti ? `<i class="tanti ${classeCat(null)}"></i>` : ''}</span>
          ${ev.slice(0, 2).map(e => `<span class="mm-e">${esc(A.orario(e).split('–')[0])} ${esc(A.riga(e, opz).titolo.split(' · ').pop())}</span>`).join('')}${ev.length > 2 ? `<span class="mm-e">+${ev.length - 2}</span>` : ''}
        </button>`;
      }).join('')}</div>
    <div class="ag-foglio">${elencoDaFareHtml('Da fare questo mese', cose, 'mese', g => `da ${nomeMese(g)}`)}
    </div>`;
  if (!tre) html += `<button class="mb-linguetta sx" id="mb-ling-sx" aria-label="Apri il menu di MB Plan">${ic('freccia')}</button>`;
  else html = `<div class="mb-3col mese"><aside class="mb-lato ag-lato">${menuAgendaHtml()}</aside><section class="mb-centro">${html}</section></div>`;
  app.innerHTML = html + versione();
  collegaAgenda([]);
  collegaCose(oggi);
  if (tre) collegaMenuAgenda(app, () => {});
  const sx = document.getElementById('mb-ling-sx'); if (sx) sx.onclick = menuAgenda;
  const vaiMese = n => { AG.aperta = null; apriAgenda(A.meseAccanto(mese0, n)); };
  const mp = document.getElementById('mm-prima'), md = document.getElementById('mm-dopo');
  if (mp) mp.onclick = () => vaiMese(-1);
  if (md) md.onclick = () => vaiMese(1);
  app.querySelectorAll('.mm-g').forEach(b => { b.onclick = () => { AG.vista = 'giorno'; AG.aperta = null; AG.portato = null; apriAgenda(b.dataset.giorno); }; });
}

// Il primo giorno della scala: giorno, lunedì, primo del mese, o il mese del WES che apre il periodo
function inizioScalaMB(scala, giorno) {
  if (scala === 'giorno') return giorno;
  if (scala === 'periodo') { const p = MB21Agenda.periodoWesDi(giorno, AG.wes); return p ? p.da : MB21Agenda.inizioScala('mese', giorno); }
  return MB21Agenda.inizioScala(scala, giorno);
}

// ── Periodo WES e Anno sono AGENDE, non numeri (Ignazio 22/09: «noi ci basiamo su un calendario, se no ripetiamo il
// Report»): mesi piccoli con un puntino nei giorni in cui c'è stato (o ci sarà) lavoro, i WES segnati, le cose da fare.
// I puntini: tutte le azioni con giorno nell'intervallo (anche le telefonate fatte dalla coda) e i richiami con giorno scelto.
async function caricaIntervallo(da, a) {
  const A = MB21Agenda, ids = idVisti();
  const isoDa = A.isoDaRoma(da, '00:00'), isoA = A.isoDaRoma(a, '00:00');
  const tutte = async (cosa, fai) => {   // oltre le 1000 righe il database risponde a pagine
    const righe = [];
    for (let da0 = 0; da0 < 20000; da0 += 1000) {
      const { data, error } = await dbq(cosa, fai().range(da0, da0 + 999));
      if (error || !data) { mostraToast('Alcuni impegni del mese non si sono caricati: riapri la pagina per riprovare.'); break; }
      righe.push(...data);
      if (data.length < 1000) break;
    }
    return righe;
  };
  const campi = 'id, tipo_azione, inizio, data_scelta, completata, categoria, contatti(categoria)';
  const [perInizio, perScelta] = await Promise.all([
    tutte('puntini', () => supa.from('azioni').select(campi).in('user_id', ids).gte('inizio', isoDa).lt('inizio', isoA)),
    tutte('puntini richiami', () => supa.from('azioni').select(campi).in('user_id', ids).eq('tipo_azione', 'Contatto').gte('data_scelta', isoDa).lt('data_scelta', isoA)),
  ]);
  const visti = new Map();
  for (const x of [...perInizio, ...perScelta]) visti.set(x.id, x);
  AG.lunghe = [...visti.values()];
  // le cose da fare aperte dell'intervallo, per il cerchietto verde dei mesi piccoli (23/09)
  AG.coseLunghe = [];
  if (!vediTutti()) {
    const { data, error } = await dbq('cose da fare del periodo', supa.from('cose_da_fare').select('id, giorno, scala, fatto_il, modello_id').eq('user_id', visto().id).is('fatto_il', null).is('modello_id', null).is('progetto_id', null).gte('giorno', da).lt('giorno', a));   // le righe dei progetti sono già tutte in AG.cose (passo 3: un cantiere finito ha fatto_il vuoto)
    if (!error && data) AG.coseLunghe = data;
  }
}
// Un mese piccolo: il nome (apre il Mese), i giorni (aprono il Giorno) con i puntini, oggi e i WES evidenziati
function meseMiniHtml(mese0, oggi, punti, conCose) {
  const A = MB21Agenda;
  const inizio = A.settimana(mese0)[0];
  const wes = (AG.wes || []).find(w => w.data === mese0);
  let h = `<div class="mn"><button class="mn-titolo" data-mese="${mese0}">${esc(A.titoloMese(mese0))}${wes ? '<span class="mn-wes">WES</span>' : ''}</button><div class="mn-griglia">${A.GIORNI.map(g => `<small>${g}</small>`).join('')}`;
  for (let i = 0; i < 42; i++) {
    const g = A.spostaGiorno(inizio, i);
    if (i >= 35 && g.slice(0, 7) !== mese0.slice(0, 7)) break;
    if (g.slice(0, 7) !== mese0.slice(0, 7)) { h += '<span></span>'; continue; }
    const p = punti[g] || { punti: [] };
    const eWes = wes && wes.giorno === g;
    h += `<button data-giorno="${g}" class="${g === oggi ? 'oggi' : ''}${eWes ? ' wes' : ''}" aria-label="${Number(g.slice(8))}${p.quanti ? ` · ${p.quanti} impegni` : ''}${eWes ? ' · WES' : ''}"><span class="cc-n">${Number(g.slice(8))}${anelloCose(conCose, g)}</span><span class="ag-punti">${p.punti.slice(0, 3).map(c => `<i class="${classeCat(c)}"></i>`).join('')}</span></button>`;
  }
  return h + '</div></div>';
}
function mesiMiniHtml(mesi, oggi) {
  const A = MB21Agenda;
  const giorni = mesi.flatMap(m => Array.from({ length: 31 }, (_, i) => A.spostaGiorno(m, i)).filter(g => g.slice(0, 7) === m.slice(0, 7)));
  const punti = A.puntiGiorni(AG.lunghe || [], giorni, 3);
  const conCose = giorniConCose([...(AG.cose || []), ...(AG.coseLunghe || [])], oggi);
  return `<div class="mn-mesi">${mesi.map(m => meseMiniHtml(m, oggi, punti, conCose)).join('')}</div>`;
}
function collegaMesiMini() {
  app.querySelectorAll('.mn [data-giorno]').forEach(b => { b.onclick = () => { AG.vista = 'giorno'; AG.aperta = null; AG.portato = null; apriAgenda(b.dataset.giorno); }; });
  app.querySelectorAll('.mn-titolo[data-mese]').forEach(b => { b.onclick = () => { AG.vista = 'mese'; apriAgenda(b.dataset.mese); }; });
}
// L'elenco «Da fare» di una scala (mese, settimana, periodo, anno): le righe con il loro legame e il campo «Per chi è?» + testo
function elencoDaFareHtml(titolo, cose, scala, riportataDi) {
  return `<h2 class="ag-sez"><span>${esc(titolo)}</span></h2>
      ${cose.map(c => rigaCosaHtml(c, 'data-cosa', c.riportata ? riportataDi(c.riportata) : '')).join('')}
      ${nuovaCosaHtml(scala, 'Cosa c\'è da fare…')}`;
}
// Il foglio con titolo e frecce, mesi piccoli e le cose da fare della scala: lo stesso per Periodo WES e Anno
function foglioScalaHtml({ testaHtml, titolo, prima, dopo, sopra, mesi, scala, titoloCose, cose, riportataDi, oggi }) {
  return `${testaHtml}<div class="mm-testa sc-${scala}"><button class="freccia" id="sc-prima" aria-label="Prima"${prima ? '' : ' disabled'}>‹</button><h1 class="ag-titolo sc-titolo">${ic(scala === 'periodo' ? 'biglietto' : 'scala-anno')}<button class="ag-mese mm-titolo">${esc(titolo)} ▾<input type="date" id="ag-scegli" value="${AG.giorno}"></button></h1><button class="freccia" id="sc-dopo" aria-label="Dopo"${dopo ? '' : ' disabled'}>›</button></div>
    ${partnerSelect()}${sopra || ''}${mesiMiniHtml(mesi, oggi)}
    <div class="ag-foglio">${elencoDaFareHtml(titoloCose, cose, scala, riportataDi)}
    </div>`;
}
function montaScala(html, prima, dopo) {
  const tre = largo();
  if (!tre) html += `<button class="mb-linguetta sx" id="mb-ling-sx" aria-label="Apri il menu di MB Plan">${ic('freccia')}</button>`;
  else html = `<div class="mb-3col mese"><aside class="mb-lato ag-lato">${menuAgendaHtml()}</aside><section class="mb-centro">${html}</section></div>`;
  app.innerHTML = html + versione();
  collegaAgenda([]);
  collegaCose(MB21Coda.oggiRoma());
  if (tre) collegaMenuAgenda(app, () => {});
  const sx = document.getElementById('mb-ling-sx'); if (sx) sx.onclick = menuAgenda;
  const p = document.getElementById('sc-prima'), d = document.getElementById('sc-dopo');
  if (p && prima) p.onclick = () => apriAgenda(prima);
  if (d && dopo) d.onclick = () => apriAgenda(dopo);
  collegaMesiMini();
}
const testaScala = mostraOggi => `<div class="ag-testa np"><span class="ag-menu-posto" style="flex:1"></span>
    ${mostraOggi ? '<button class="ag-oggi" id="ag-oggi">Oggi</button>' : ''}
    <button class="ag-piu" id="ag-nuovo" aria-label="Nuovo appuntamento">+</button></div>`;

// ── Il PERIODO WES (Ignazio 22/09): un'agenda di 4 mesi da WES a WES, con la barra dei giorni che mancano al WES
async function caricaPeriodo() {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  let p = A.periodoWesDi(AG.giorno, AG.wes);
  // una data prima del primo WES (arrivando dall'Anno sfogliato all'indietro, 23/09): si apre il primo periodo, non una pagina vuota
  if (!p && (AG.wes || []).length) {
    const primo = [...AG.wes].sort((x, y) => (x.data < y.data ? -1 : 1))[0];
    if (AG.giorno < primo.data) p = A.periodoWesDi(primo.data, AG.wes);
  }
  AG.pd = { p };
  if (p) await caricaIntervallo(p.da, p.a ? A.meseAccanto(p.a, 1) : A.meseAccanto(oggi.slice(0, 8) + '01', 1));
}
function disegnaPeriodo() {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const p = (AG.pd || {}).p;
  const mese = g => A.titoloMese(g).split(' ')[0].toLowerCase();
  if (!p) return montaScala(testaScala(true) + `<h1 class="ag-titolo">Periodo WES</h1><div class="vuoto">Nessun WES registrato. L'Admin inserisce i WES in Admin → WES.</div>`);
  let barra = '';
  if (p.a) {
    // da WES a WES (Ignazio 23/09): si conta dal giorno del WES che apre al giorno del WES che chiude
    const tot = Math.max(1, A.giorniTra(p.inizio, p.fino)), fatti = Math.min(tot, Math.max(0, A.giorniTra(p.inizio, oggi)));
    const mancano = A.giorniTra(oggi, p.fino), circa = p.senzaGiorno ? 'circa ' : '';
    const dice = oggi < p.inizio ? `inizia tra ${A.giorniTra(oggi, p.inizio)} giorni` : mancano > 1 ? `mancano ${circa}${mancano} giorni al WES` : mancano === 1 ? 'domani c\'è il WES' : mancano === 0 ? 'oggi c\'è il WES' : 'periodo concluso';
    barra = `<div class="pw-barra"><div class="pw-barra-testa"><span>Settimana ${Math.min(Math.ceil(tot / 7), Math.max(1, Math.ceil((fatti + 1) / 7)))} di ${Math.ceil(tot / 7)}</span><b>${dice}</b></div>
      <div class="pw-traccia"><i style="width:${Math.round(fatti / tot * 100)}%"></i></div>
      ${p.senzaGiorno ? '<small class="pw-manca">Manca il giorno del WES: si conta fino al 1° del mese. Il giorno si scrive in Admin → WES.</small>' : `<small>WES dal ${esc(dataLunga(p.fino))}</small>`}</div>`;
  }
  const inCorso = oggi >= p.da && (!p.a || oggi < p.a);
  const html = foglioScalaHtml({ testaHtml: testaScala(!inCorso), oggi,
    titolo: `Periodo WES · ${mese(p.da)} → ${p.a ? `${mese(p.a)} ${p.a.slice(0, 4)}` : 'in corso'}`, prima: p.prima, dopo: p.poi, sopra: barra,
    mesi: A.mesiTra(p.da, p.a || A.meseAccanto(oggi.slice(0, 8) + '01', 1)).concat(p.a ? [p.a] : []),   // anche il mese del WES che chiude
    scala: 'periodo', titoloCose: 'Da fare in questo periodo', cose: A.coseDellaScala(AG.cose, 'periodo', p.da, inizioScalaMB('periodo', oggi)),
    riportataDi: g => `dal periodo di ${mese(g)}` });
  montaScala(html, p.prima, p.poi);
}

// ── L'ANNO (Ignazio 22/09): un calendario classico, gennaio → dicembre, i 12 mesi piccoli, i WES e gli obiettivi dell'anno
function disegnaAnno() {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const y = Number(AG.giorno.slice(0, 4));
  const mesi = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}-01`);
  const html = foglioScalaHtml({ testaHtml: testaScala(Number(oggi.slice(0, 4)) !== y), oggi, titolo: String(y), prima: `${y - 1}-01-01`, dopo: `${y + 1}-01-01`,
    mesi, scala: 'anno', titoloCose: "Obiettivi e cose da fare dell'anno", cose: A.coseDellaScala(AG.cose, 'anno', `${y}-01-01`, `${oggi.slice(0, 4)}-01-01`),
    riportataDi: g => `dal ${g.slice(0, 4)}` });
  montaScala(html, `${y - 1}-01-01`, `${y + 1}-01-01`);
}

// ── Il foglio della SETTIMANA (cantiere 41, vista D; Ignazio 22/09): sette righe, una per giorno, con gli impegni
// compatti; sotto le cose da fare della settimana; la griglia a sette colonne a orario a destra (Mac) o nella linguetta.
function giorniSettimanaHtml(opz, oggi) {
  const A = MB21Agenda;
  return `<div class="ss-giorni">${AG.settimana.map((g, i) => {
    const ev = A.eventiDelGiorno(AG.azioni, g);
    const cose = A.coseDelGiorno(AG.cose, g, oggi);   // le cose da fare di quel giorno, sotto gli impegni (come i riferimenti di NotePlan)
    const coseHtml = cose.map(c => `<span class="ss-riga ss-cosa${c.fatto_il ? ' fatta' : ''}"><i></i>${c.ora ? `<em>${esc(String(c.ora).slice(0, 5))}</em>` : ''}${esc(c.testo)}</span>`).join('')
      + spaziDelGiorno(g).map(x => `<span class="ss-riga ss-spazio" style="--tinta:${coloreSpazio(x.tipo)}"><i></i><em>${MB21Spazi.orario(x).ora}</em>${esc(MB21Spazi.titolo(x))}${MB21Spazi.daRiempire(x.tipo) ? ' · da riempire' : ''}</span>`).join('')
      + ricevutiDelGiornoMB(g).map(x => `<span class="ss-riga ss-ricevuto"><i></i><em>${esc(A.orario(x).split('–')[0])}</em>${esc(A.titoloRicevuto(x))}</span>`).join('');
    return `<button class="ss-g${g === oggi ? ' oggi' : ''}" data-apri="${g}"><span class="ss-data"><small>${A.GIORNI_SETTIMANA[i]}</small><b>${Number(g.slice(8))}</b></span>
      <span class="ss-ev">${ev.length ? ev.map(e => { const cat = (e.contatti && e.contatti.categoria) || e.categoria;
        return `<span class="ss-riga${e.completata ? ' fatta' : ''}"><i class="${classeCat(cat)}"></i><em>${esc(A.orario(e).split('–')[0])}</em>${esc(A.riga(e, opz).titolo)}</span>`; }).join('') : (coseHtml ? '' : '<span class="ss-libera">giornata libera</span>')}${coseHtml}</span></button>`;
  }).join('')}</div>`;
}
function disegnaSettimana() {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const opz = { mioId: vediTutti() ? null : visto().id, admin: eAdmin() };
  const lun = AG.settimana[0], dom = AG.settimana[6];
  const nomeMese = g => A.titoloMese(g).split(' ')[0].toLowerCase();
  const periodo = lun.slice(5, 7) === dom.slice(5, 7) ? `${Number(lun.slice(8))}–${Number(dom.slice(8))} ${nomeMese(dom)}` : `${Number(lun.slice(8))} ${nomeMese(lun)} – ${Number(dom.slice(8))} ${nomeMese(dom)}`;
  const cose = A.coseDellaScala(AG.cose, 'settimana', lun, A.inizioScala('settimana', oggi));
  const tre = largo();
  let html = `<div class="ag-testa np"><span class="ag-menu-posto" style="flex:1"></span>
      ${!AG.settimana.includes(oggi) ? '<button class="ag-oggi" id="ag-oggi">Oggi</button>' : ''}
      <button class="ag-piu" id="ag-nuovo" aria-label="Nuovo appuntamento">+</button></div>
    <div class="mm-testa sc-settimana"><button class="freccia" id="ag-prima" aria-label="Settimana prima">‹</button><h1 class="ag-titolo sc-titolo">${ic('scala-settimana')}<button class="ag-mese mm-titolo">Settimana ${A.numeroSettimana(lun)} · ${esc(periodo)} ▾<input type="date" id="ag-scegli" value="${AG.giorno}"></button></h1><button class="freccia" id="ag-dopo" aria-label="Settimana dopo">›</button></div>
    ${partnerSelect()}
    ${richiamiAgenda(oggi)}
    ${giorniSettimanaHtml(opz, oggi)}
    <div class="ag-foglio">${scalaSopraHtml('mese', oggi)}${elencoDaFareHtml('Da fare questa settimana', cose, 'settimana', g => `da sett. ${A.numeroSettimana(g)}`)}
    </div>`;
  const griglia = `<div class="mb-crono ss-destra"><div class="mb-crono-titolo">${ic('agenda')} La settimana a orario</div>${grigliaSettimana(opz)}</div>`;
  if (!tre) html += `<button class="mb-linguetta sx" id="mb-ling-sx" aria-label="Apri il menu di MB Plan">${ic('freccia')}</button><button class="mb-linguetta dx" id="mb-ling-dx" aria-label="Apri la settimana a orario">${ic('freccia')}</button>`;
  else html = `<div class="mb-3col"><aside class="mb-lato ag-lato">${menuAgendaHtml()}</aside><section class="mb-centro">${html}</section><aside class="mb-destra">${griglia}</aside></div>`;
  app.innerHTML = html + versione();
  collegaAgenda([]);
  collegaCose(oggi);
  if (tre) { collegaMenuAgenda(app, () => {}); collegaGrigliaSettimana(app, () => {}); }
  const sx = document.getElementById('mb-ling-sx'); if (sx) sx.onclick = menuAgenda;
  const dx = document.getElementById('mb-ling-dx');
  if (dx) dx.onclick = () => {
    const velo = document.createElement('div');
    velo.className = 'velo lato destra';
    velo.innerHTML = `<div class="mb-pannello">${griglia}</div>`;
    document.body.appendChild(velo);
    const chiudi = () => velo.remove();
    velo.onclick = ev => { if (ev.target === velo) chiudi(); };
    collegaGrigliaSettimana(velo, chiudi);
  };
  app.querySelectorAll('.ss-g').forEach(b => { b.onclick = () => { AG.vista = 'giorno'; AG.aperta = null; AG.portato = null; apriAgenda(b.dataset.apri); }; });
}
// I tocchi della griglia a sette colonne: un blocco apre il suo giorno e l'impegno, una colonna vuota apre il giorno
function collegaGrigliaSettimana(radice, prima) {
  const A = MB21Agenda;
  radice.querySelectorAll('.ag-sev').forEach(b => {
    b.onclick = async ev => {
      ev.stopPropagation(); prima();
      const g = b.dataset.giorno || b.dataset.vai, id = b.dataset.evento;
      AG.vista = 'giorno'; AG.aperta = id || null; AG.portato = null;
      await apriAgenda(g);
      const e = id && AG.azioni.find(x => x.id === id);
      if (e) foglioEvento(A.eventiDelGiorno([e], g)[0] || e);
    };
  });
  radice.querySelectorAll('.ag-colonna[data-vai]').forEach(b => { b.onclick = () => { prima(); AG.vista = 'giorno'; AG.portato = null; AG.aperta = null; apriAgenda(b.dataset.vai); }; });
}

// Il pannello di destra sul telefono / iPad in verticale: il mese con i pallini e sotto la Timeline, come la terza colonna del Mac
function pannelloDestro(eventi, opz) {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const velo = document.createElement('div');
  velo.className = 'velo lato destra';
  velo.innerHTML = `<div class="mb-pannello">${meseHtml(AG.giorno, oggi)}<div class="mb-crono"><div class="mb-crono-titolo">${ic('orario')} Timeline</div>${grigliaGiorno(eventi, opz)}</div></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  const vai = velo.querySelector('#ag-vai-ora'); if (vai) vai.remove();
  velo.querySelectorAll('.mb-mese [data-giorno]').forEach(b => { b.onclick = () => { chiudi(); AG.aperta = null; AG.portato = null; apriAgenda(b.dataset.giorno); }; });
  velo.querySelectorAll('.mb-mese [data-mese]').forEach(b => { b.onclick = () => { chiudi(); const m = A.spostaGiorno(AG.giorno.slice(0, 8) + '01', Number(b.dataset.mese) < 0 ? -1 : 32); apriAgenda(m.slice(0, 8) + '01'); }; });
  collegaGriglia(velo, eventi, chiudi);
  const crono = velo.querySelector('.mb-crono'), rif = crono && (crono.querySelector('.ag-adesso') || crono.querySelector('.ag-ev'));
  if (rif) crono.scrollTop = Math.max(0, rif.offsetTop - 120);
}
// Trascinare il dito dal bordo apre il pannello di quel lato (solo in MB Plan, solo a una colonna)
if (typeof document !== 'undefined' && document.addEventListener) {
  let x0 = null, y0 = null;
  document.addEventListener('touchstart', ev => {
    const t = ev.touches[0]; x0 = null;
    if (ST.tab !== 'agenda' || largo() || document.querySelector('.velo')) return;
    if (t.clientX < 24 || t.clientX > window.innerWidth - 24) { x0 = t.clientX; y0 = t.clientY; }
  }, { passive: true });
  document.addEventListener('touchend', ev => {
    if (x0 == null) return;
    const t = ev.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0, da = x0;
    x0 = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (da < 24 && dx > 0) { const b = document.getElementById('mb-ling-sx'); if (b) b.click(); }
    else if (da > window.innerWidth - 24 && dx < 0) { const b = document.getElementById('mb-ling-dx'); if (b) b.click(); }
  }, { passive: true });
}
// ── Riordinare le cose da fare trascinandole, come NotePlan (Ignazio 23/09) ──
// Telefono e iPad: dito fermo mezzo secondo sulla riga, poi su e giù. Mac: si preme e si trascina (dopo pochi pixel).
// Si sposta solo dentro la stessa sezione e tra righe dello stesso tipo (cose con cose, voci del modello con voci);
// le fatte e quelle che si spuntano da sole non si spostano. Lasciando, il nuovo ordine si salva (`ordine`).
// Il tocco breve resta com'era: il cerchio spunta, il testo apre il foglio.
const TR = { riga: null, attr: null, avviato: false, timer: null, x0: 0, y0: 0, dopoClic: 0, blocco: null };
// Nella Timeline (Ignazio 23/09: «la cosa più importante»): i blocchi tratteggiati (cose da fare e voci dei modelli con l'ora)
// si trascinano su e giù a scatti di 15 minuti; lasciando si salva la nuova ora nella cosa (quel giorno) o nella voce del
// modello (tutti i giorni). Gli appuntamenti veri non si trascinano.
function bloccoDa(ev) {
  if (typeof ST === 'undefined' || ST.tab !== 'agenda') return null;
  const el = ev.target.closest && ev.target.closest('.ag-ore .ag-ev.ag-cosa[data-cosa-blocco]');
  if (!el) return null;
  const ore = el.closest('.ag-ore');
  return { el, ore, top0: parseFloat(el.style.top) || 0, alt: Number(ore.dataset.alt) || ALT_ORA, da: Number(ore.dataset.da) || 0 };
}
function minutiBlocco(b, top) { return b.da + Math.round(top / b.alt * 60 / 15) * 15; }
function muoviBlocco(y) {
  const b = TR.blocco, A = MB21Agenda;
  const alto = parseFloat(b.el.style.height) || 20, max = (parseFloat(b.ore.style.height) || 0) - alto;
  const m = Math.max(b.da, minutiBlocco(b, Math.min(Math.max(0, b.top0 + (y - TR.y0)), Math.max(0, max))));
  b.min = m;
  b.el.style.top = Math.round((m - b.da) / 60 * b.alt) + 'px';
  const eti = b.el.querySelector('small') || b.el.querySelector('b');
  if (!b.testo0) b.testo0 = eti.textContent;
  eti.textContent = A.daMinuti(m) + (eti.tagName === 'B' ? ' · ' + b.testo0 : '');
}
async function fineBlocco() {
  const b = TR.blocco; TR.blocco = null;
  clearTimeout(TR.timer);
  document.body.classList.remove('sto-trascinando');
  if (!b || !TR.avviato) { TR.avviato = false; return; }
  TR.avviato = false; TR.dopoClic = Date.now();
  b.el.classList.remove('trascina');
  const A = MB21Agenda, id = b.el.dataset.cosaBlocco, velo = b.el.closest('.velo');
  if (b.min == null) return;
  const ora = A.daMinuti(b.min);
  if (id.startsWith('spazio-')) {   // uno spazio da riempire: si sposta e basta (27/09)
    const x = (AG.spazi || []).find(y => y.id === id.slice(7));
    if (!x || MB21Spazi.orario(x).ora === ora) return ridisegnaDopoBlocco(velo);
    const inizio = A.isoDaRoma(AG.giorno, ora);
    const { error } = await dbq('sposta spazio', supa.from('spazi').update({ inizio }).eq('id', x.id));
    if (error) { mostraToast('Ora non salvata: riprova.'); return ridisegnaDopoBlocco(velo); }
    x.inizio = inizio;
    mostraToast(`${MB21Spazi.titolo(x)}: alle ${ora}`);
    return ridisegnaDopoBlocco(velo);
  }
  const vero = id.replace(/^cosa-/, '');
  const x = AG.cose.find(c => c.id === vero);
  if (!x || String(x.ora || '').slice(0, 5) === ora) return ridisegnaDopoBlocco(velo);
  const { error } = await dbq('ora', supa.from('cose_da_fare').update({ ora }).eq('id', vero));
  if (error) { mostraToast('Ora non salvata: riprova.'); return ridisegnaDopoBlocco(velo); }
  x.ora = ora;
  mostraToast(`${x.testo}: alle ${ora}`);
  ridisegnaDopoBlocco(velo);
}
// dopo lo spostamento si ridisegna la pagina; se la Timeline era nel pannello (telefono/iPad) si riapre com'era
function ridisegnaDopoBlocco(velo) {
  const eventi = MB21Agenda.eventiDelGiorno(AG.azioni, AG.giorno), opz = { mioId: vediTutti() ? null : visto().id, admin: eAdmin() };
  const lato = velo && velo.classList.contains('lato');
  if (velo) velo.remove();
  disegnaAgenda();
  if (velo) lato ? pannelloDestro(eventi, opz) : foglioCronologia(eventi, opz);
}
// Si riordinano le cose da fare non fatte della stessa lista (le fatte stanno in fondo e non si spostano)
function righeTrascinabili(riga) {
  return [...riga.parentElement.children].filter(x => x.classList.contains('cosa') && x.hasAttribute('data-cosa') && !x.classList.contains('fatta'));
}
function iniziaTrascina() {
  TR.avviato = true;
  TR.riga.classList.add('trascina');
  document.body.classList.add('sto-trascinando');
  try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
}
function muoviTrascina(y) {
  const altre = righeTrascinabili(TR.riga).filter(x => x !== TR.riga);
  const prima = altre.find(x => { const r = x.getBoundingClientRect(); return y < r.top + r.height / 2; });
  if (prima) { if (TR.riga.nextElementSibling !== prima) prima.before(TR.riga); }
  else if (altre.length) {
    const ultima = altre[altre.length - 1];
    if (ultima.nextElementSibling !== TR.riga) ultima.after(TR.riga);
  }
}
async function fineTrascina() {
  clearTimeout(TR.timer);
  const { riga, avviato } = TR;
  TR.riga = null; TR.avviato = false;
  document.body.classList.remove('sto-trascinando');
  if (!riga || !avviato) return;
  riga.classList.remove('trascina');
  TR.dopoClic = Date.now();   // il clic che segue il rilascio non deve aprire il foglio
  const ids = righeTrascinabili(riga).map(x => x.getAttribute('data-cosa'));
  const cambiate = [];
  ids.forEach((id, i) => { const x = AG.cose.find(y => y.id === id); if (x && x.ordine !== i + 1) { x.ordine = i + 1; cambiate.push(x); } });
  if (!cambiate.length) return;
  const esiti = await Promise.all(cambiate.map(x => dbq('ordine', supa.from('cose_da_fare').update({ ordine: x.ordine }).eq('id', x.id))));
  if (esiti.some(r => r.error)) { mostraToast('Ordine non salvato: riprova.'); return apriAgenda(AG.giorno); }
  disegnaAgenda();
}
function rigaDa(ev) {
  if (typeof ST === 'undefined' || ST.tab !== 'agenda' || document.querySelector('.velo')) return null;
  const riga = ev.target.closest && ev.target.closest('.ag-foglio .cosa');
  if (!riga || ev.target.closest('.spunta') || !riga.hasAttribute('data-cosa') || riga.classList.contains('fatta') || righeTrascinabili(riga).length < 2) return null;   // la spunta non trascina
  return { riga };
}
if (typeof document !== 'undefined' && document.addEventListener) {
  // dito: pressione lunga
  document.addEventListener('touchstart', ev => {
    const bl = bloccoDa(ev);
    if (bl) {
      const t = ev.touches[0];
      Object.assign(TR, { riga: null, blocco: bl, avviato: false, x0: t.clientX, y0: t.clientY });
      clearTimeout(TR.timer);
      TR.timer = setTimeout(() => { if (TR.blocco) { TR.avviato = true; bl.el.classList.add('trascina'); document.body.classList.add('sto-trascinando'); try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {} } }, 450);
      return;
    }
    const r = rigaDa(ev); if (!r) return;
    const t = ev.touches[0];
    Object.assign(TR, r, { avviato: false, x0: t.clientX, y0: t.clientY });
    clearTimeout(TR.timer);
    TR.timer = setTimeout(() => { if (TR.riga) iniziaTrascina(); }, 450);
  }, { passive: true });
  document.addEventListener('touchmove', ev => {
    if (TR.blocco) {
      const t = ev.touches[0];
      if (!TR.avviato) { if (Math.abs(t.clientX - TR.x0) > 8 || Math.abs(t.clientY - TR.y0) > 8) { clearTimeout(TR.timer); TR.blocco = null; } return; }
      ev.preventDefault();
      return muoviBlocco(t.clientY);
    }
    if (!TR.riga) return;
    const t = ev.touches[0];
    if (!TR.avviato) { if (Math.abs(t.clientX - TR.x0) > 8 || Math.abs(t.clientY - TR.y0) > 8) { clearTimeout(TR.timer); TR.riga = null; } return; }   // scorre la pagina
    ev.preventDefault();   // mentre si trascina la pagina sta ferma
    muoviTrascina(t.clientY);
  }, { passive: false });
  document.addEventListener('touchend', () => { if (TR.blocco) fineBlocco(); else if (TR.riga) fineTrascina(); });
  document.addEventListener('touchcancel', () => { if (TR.blocco) fineBlocco(); else if (TR.riga) fineTrascina(); });
  // mouse e trackpad: si preme e si trascina
  document.addEventListener('mousedown', ev => {
    if (ev.button !== 0 || ev.sourceCapabilities && ev.sourceCapabilities.firesTouchEvents) return;
    const bl = bloccoDa(ev);
    if (bl) { Object.assign(TR, { riga: null, blocco: bl, avviato: false, x0: ev.clientX, y0: ev.clientY }); return; }
    const r = rigaDa(ev); if (!r) return;
    Object.assign(TR, r, { avviato: false, x0: ev.clientX, y0: ev.clientY });
  });
  document.addEventListener('mousemove', ev => {
    if (TR.blocco) {
      if (ev.buttons === 0) return fineBlocco();
      if (!TR.avviato) { if (Math.abs(ev.clientY - TR.y0) < 6) return; TR.avviato = true; TR.blocco.el.classList.add('trascina'); document.body.classList.add('sto-trascinando'); }
      ev.preventDefault();
      return muoviBlocco(ev.clientY);
    }
    if (!TR.riga) return;
    if (ev.buttons === 0) { if (TR.avviato) fineTrascina(); else TR.riga = null; return; }   // il tasto è già stato lasciato
    if (!TR.avviato) { if (Math.abs(ev.clientY - TR.y0) < 6) return; iniziaTrascina(); }
    ev.preventDefault();
    muoviTrascina(ev.clientY);
  });
  document.addEventListener('mouseup', () => { if (TR.blocco) fineBlocco(); else if (TR.riga) fineTrascina(); });
  document.addEventListener('click', ev => { if (Date.now() - TR.dopoClic < 400) { ev.preventDefault(); ev.stopPropagation(); } }, true);
}
// Cambiando la larghezza della finestra (Mac: finestra stretta ↔ larga) la pagina si ridisegna nel formato giusto
if (typeof window !== 'undefined' && window.matchMedia) {
  let eraLargo = largo();
  window.addEventListener('resize', () => { const ora = largo(); if (ora !== eraLargo) { eraLargo = ora; if (ST.tab === 'agenda' && AG.giorno) disegnaAgenda(); } }, { passive: true });
}

// Il menu ☰ dell'Agenda, come la colonna sinistra di NotePlan: le scale del tempo (per ora funzionano Giorno e
// Settimana; Mese, Periodo WES e Anno arrivano col lavoro 6) e i modelli.
// ── Cerca in MB Plan: impegni per nome della persona o per tipo (PM, Follow Up, Counseling, telefonata, esito),
// e le cose da fare scritte a mano. Di chi è scelto nel Partner Select (l'Admin con «Tutti» vede tutto).
// Prima i prossimi (da adesso in avanti), poi i passati dal più recente; al massimo 50.
let CERCA_GIRO = 0;
// Cercando «team», «lds», «network», «amway» compaiono anche le cose legate a quel gruppo (oltre a quelle col testo scritto così)
function legameDaParola(t) {
  const p = String(t).toLowerCase().replace(/\s+/g, '');
  return p === 'team' ? 'Team' : p === 'lds' ? 'LdS' : (p === 'network21' || p === 'network' || p === 'n21') ? 'N21' : p === 'amway' ? 'Amway' : null;
}
async function cercaMB(testo, box, chiudi) {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma(), adesso = new Date().toISOString();
  const t = String(testo || '').replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^piani\b/i, 'piano');
  const giro = ++CERCA_GIRO;
  if (t.length < 2) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="mb-vuoto">Cerco…</div>';
  const ids = idVisti();
  const [perNome, perTipo, cose] = await Promise.all([
    dbq('cerca per nome', supa.from('azioni').select('*, contatti!inner(nome, categoria, telefono), utenti!azioni_user_id_fkey(nome, nome_cognome)').in('user_id', ids).ilike('contatti.nome', `%${t}%`).order('inizio', { ascending: false }).limit(60)),
    dbq('cerca per tipo', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', ids).or(`tipo_azione.ilike.*${t}*,modalita.ilike.*${t}*,esito.ilike.*${t}*`).order('inizio', { ascending: false }).limit(60)),
    dbq('cerca nelle cose da fare', supa.from('cose_da_fare').select('*, contatti(nome, categoria)').in('user_id', ids).is('core', null).is('modello_id', null).is('progetto_id', null).or(`testo.ilike.*${t}*${legameDaParola(t) ? `,legato_a.eq.${legameDaParola(t)}` : ''}`).order('giorno', { ascending: false }).limit(20)),
  ]);
  if (giro !== CERCA_GIRO) return;
  if (perNome.error && perTipo.error) { box.innerHTML = '<div class="mb-vuoto">Non riesco a cercare: riprova.</div>'; return; }
  const visti = new Map();
  for (const a of [...(perNome.data || []), ...(perTipo.data || [])]) {
    const quando = a.tipo_azione === 'Contatto' && a.data_scelta ? a.data_scelta : a.inizio;
    if (quando && !visti.has(a.id)) visti.set(a.id, { ...a, quando });
  }
  const tutti = [...visti.values()];
  const prossimi = tutti.filter(a => a.quando >= adesso).sort((x, y) => (x.quando < y.quando ? -1 : 1));
  const passati = tutti.filter(a => a.quando < adesso).sort((x, y) => (x.quando < y.quando ? 1 : -1));
  const elenco = [...prossimi, ...passati].slice(0, 50);
  const opz = { mioId: vediTutti() ? null : visto().id, admin: eAdmin() };
  const quandoCosa = c => !c.giorno ? 'senza giorno' : c.scala === 'mese' ? A.titoloMese(c.giorno) : c.scala === 'settimana' ? `settimana ${A.numeroSettimana(c.giorno)}` : titoloGiorno(c.giorno, oggi);
  const righe = elenco.map(a => {
    const p = A.partiRoma(a.quando), cat = (a.contatti && a.contatti.categoria) || a.categoria;
    // una telefonata già fatta nel giorno non c'è (MB Plan mostra solo i richiami aperti): il tocco apre la scheda della persona (Ignazio 03/10)
    const daScheda = a.tipo_azione === 'Contatto' && a.completata && a.contatto_id;
    return `<button class="mb-ris" data-giorno="${p.giorno}" data-evento="${esc(a.id)}"${daScheda ? ` data-scheda="${esc(a.contatto_id)}"` : ''}><i class="${classeCat(cat)}"></i><span><b>${esc(A.riga(a, opz).titolo)}</b><small>${esc(titoloGiorno(p.giorno, oggi))} · ${esc(p.ora)}${a.esito ? ' · ' + esc(a.esito) : ''}</small></span></button>`;
  }).join('') + (cose.data || []).map(c => `<button class="mb-ris cosa-r" data-cosa-giorno="${c.giorno || ''}" data-cosa-id="${esc(c.id)}" data-cosa-scala="${esc(c.scala || 'giorno')}"><i class="${c.fatto_il ? 'fatta' : ''}"></i><span><b>${esc(c.testo)}</b><small>Da fare · ${esc((MB21Agenda.legameDi(c) || { nome: 'da collegare' }).nome)} · ${esc(quandoCosa(c))}${c.fatto_il ? ' · fatta' : ''}</small></span></button>`).join('');
  const quanti = elenco.length + (cose.data || []).length;
  box.innerHTML = quanti ? `<div class="mb-ris-conto">${tutti.length > 50 ? 'Primi 50 risultati: scrivi qualcosa di più preciso' : `${quanti} ${quanti === 1 ? 'risultato' : 'risultati'}`}</div>${righe}` : '<div class="mb-vuoto">Nessun risultato.</div>';
  box.querySelectorAll('.mb-ris[data-evento]').forEach(b => { b.onclick = async () => {
    chiudi();
    if (b.dataset.scheda) return apriContattoDa(b.dataset.scheda, 'agenda');
    const g = b.dataset.giorno, id = b.dataset.evento;
    AG.vista = 'giorno'; AG.aperta = id; AG.portato = null;
    await apriAgenda(g);
    const e = AG.azioni.find(x => x.id === id);
    if (e) foglioEvento(A.eventiDelGiorno([e], g)[0] || e);
  }; });
  box.querySelectorAll('.mb-ris[data-cosa-giorno]').forEach(b => { b.onclick = () => {
    chiudi();
    if (!b.dataset.cosaGiorno) return;
    const sc = b.dataset.cosaScala;
    AG.vista = sc === 'mese' || sc === 'settimana' ? sc : 'giorno'; AG.aperta = null; AG.portato = null;
    apriAgenda(b.dataset.cosaGiorno);
  }; });
}

// Il menu è lo stesso nel cassetto ☰ (telefono) e nella colonna sinistra fissa (schermo largo, «MB Plan» a tre colonne).
function menuAgendaHtml() {
  return `<div class="ag-lato-titolo">MB Plan</div>
    <form class="mb-cerca" role="search"><input type="search" placeholder="Cerca un nome, un PM…" value="${esc(AG.cerca || '')}" autocomplete="off" aria-label="Cerca in MB Plan"></form>
    <div class="mb-risultati"></div>
    ${SCALE_MENU.map(([k, nome, icona]) => { const c = VISTE.includes(k); return `<button data-scala="${k}" class="sc-${k}${(AG.vista || 'giorno') === k ? ' si' : ''}${c ? '' : ' presto'}">${ic(icona)}<span>${esc(nome)}</span><small>${c ? '' : 'presto'}</small></button>`; }).join('')}
    ${vediSpazi() ? programmaSettimanaHtml() : ''}
`;
}
// La card «Programma della settimana» (Ignazio 27/09: «la settimana messa là la devo andare a cercare»): al posto del Modulo Core
// (che resta dal Check), sempre a portata da ogni vista. La settimana è quella che si sta guardando. Dal 28/09 subito sotto
// Giorno…Anno: in fondo alla colonna di sinistra (ferma, con un'altezza massima) sull'iPad di Isabella restava tagliata.
// Nota Pagine 004 (Ignazio 06/10/2026): nella card solo quello che deve ancora venire; in alto «Da chiudere» (passati senza esito, finché non si chiudono);
// in fondo la riga chiusa «Fatti e passati · N» che si apre sul posto: un tocco su un appuntamento apre la stessa scheda «Com'è andata?» (foglioEvento).
function programmaSettimanaHtml() {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma(), lun = AG.settimana[0], dom = AG.settimana[6];
  const p = MB21Spazi.programma(AG.settimana, AG.azioni, AG.spazi, MB21Coda.adesso());
  const mese = g => A.titoloMese(g).slice(0, 3).toLowerCase();
  const opz = { mioId: vediTutti() ? null : visto().id, admin: eAdmin() };
  const riga = (a, rossa) => { const g = A.partiRoma(a.inizio);
    return `<button class="mb-prog-app${rossa ? ' da-chiudere' : ''}" data-prog-evento="${esc(a.id)}"><span><b>${esc(A.riga(a, opz).titolo)}</b><small>${esc(titoloGiorno(g.giorno, oggi))} alle ${esc(g.ora)} · ${esc(a.esito || (rossa ? 'senza esito' : 'fatto'))}</small></span><em>›</em></button>`; };
  const vuoto = dom < oggi ? 'Settimana finita.' : p.preparata || p.fatti.length ? 'Niente altro in programma questa settimana.'
    : 'Non ancora preparata: scegli quanti Piani Marketing e/o Consulenze prodotti vuoi fare, e quando. Anche gli incontri di Team e LdS.';
  const aperti = !!AG.fattiAperti;
  return `<div class="mb-programma"><div class="mb-prog-testa">${ic('scala-settimana')}<span><b>Programma della settimana</b><small>Settimana ${A.numeroSettimana(lun)} · ${Number(lun.slice(8))} ${mese(lun)} – ${Number(dom.slice(8))} ${mese(dom)}</small></span></div>
    ${p.daChiudere.length ? `<div class="mb-prog-chiudere"><div class="mb-prog-tit">Da chiudere · ${p.daChiudere.length}</div>${p.daChiudere.map(a => riga(a, true)).join('')}</div>` : ''}
    ${p.righe.length ? `<ul>${p.righe.map(r => `<li style="--tinta:${coloreSpazio(r.tipo)}"><i></i>${esc(r.testo)}</li>`).join('')}</ul>` : `<p>${vuoto}</p>`}
    ${p.fatti.length ? `<button class="mb-prog-fatti" data-cmd="fatti" aria-expanded="${aperti}"><span>Fatti e passati<i>${p.fatti.length}</i></span><span>${aperti ? '⌄' : '›'}</span></button>
      <div class="mb-prog-elenco"${aperti ? '' : ' hidden'}>${p.fatti.map(a => riga(a, false)).join('')}</div>` : ''}
    ${dom >= oggi ? `<button data-cmd="prepara" class="mb-prog-bottone">${ic('piu')}<span>${p.preparata ? 'Aggiungi appuntamenti' : 'Prepara la settimana'}</span></button>` : ''}</div>`;
}
function collegaMenuAgenda(radice, chiudi) {
  // la ricerca (Ignazio 22/09): un nome, un tipo («piano marketing», «PM», «counseling»), le cose da fare
  const form = radice.querySelector('.mb-cerca'), box = radice.querySelector('.mb-risultati');
  if (form && box) {
    const campo = form.querySelector('input');
    let attesa = null;
    const via = () => { AG.cerca = campo.value; clearTimeout(attesa); attesa = setTimeout(() => cercaMB(campo.value, box, chiudi), 300); };
    campo.oninput = via;
    form.onsubmit = ev => { ev.preventDefault(); clearTimeout(attesa); cercaMB(campo.value, box, chiudi); };
    if (AG.cerca) cercaMB(AG.cerca, box, chiudi);
  }
  // solo i bottoni del menu: anche i campi «Aggiungi…» dei fogli hanno data-scala, e sul Mac (tre colonne) il clic
  // sul campo ridisegnava la pagina e non si riusciva a scrivere (Ignazio 23/09)
  radice.querySelectorAll('button[data-scala]').forEach(b => { b.onclick = () => {
    if (!VISTE.includes(b.dataset.scala)) return mostraToast('Il foglio di questa scala arriva presto');
    chiudi(); cambiaVista(b.dataset.scala);
  }; });
  const prepara = radice.querySelector('[data-cmd="prepara"]'); if (prepara) prepara.onclick = () => { chiudi(); preparaSettimana(); };
  // nota 004: «Fatti e passati» si apre e si chiude sul posto; un appuntamento apre «Com'è andata?» per cambiare l'esito
  const fatti = radice.querySelector('[data-cmd="fatti"]');
  if (fatti) fatti.onclick = () => {
    AG.fattiAperti = !AG.fattiAperti;
    fatti.setAttribute('aria-expanded', String(AG.fattiAperti));
    fatti.lastElementChild.textContent = AG.fattiAperti ? '⌄' : '›';
    const el = radice.querySelector('.mb-prog-elenco'); if (el) el.hidden = !AG.fattiAperti;
  };
  radice.querySelectorAll('[data-prog-evento]').forEach(b => { b.onclick = () => {
    const e = (AG.azioni || []).find(x => x.id === b.dataset.progEvento);
    if (!e) return;
    chiudi();
    foglioEvento(MB21Agenda.eventiDelGiorno([e], MB21Agenda.partiRoma(e.inizio).giorno)[0] || e);
  }; });
}
function menuAgenda() {
  const velo = document.createElement('div');
  velo.className = 'velo lato';
  velo.innerHTML = `<div class="ag-lato">${menuAgendaHtml()}</div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  collegaMenuAgenda(velo, chiudi);
}

// Schermo largo (Mac, iPad orizzontale): MB Plan a tre colonne come NotePlan — menu · foglio del giorno · mese e Timeline
// sempre aperta. Sul telefono resta una colonna (menu nel ☰, Timeline nel cassetto).
function largo() { return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(min-width: 1000px)').matches; }   // function, non const: la usa anche il codice che parte al caricamento (pagina bianca del 22/09)
// Il mese a griglia per la colonna destra: si tocca un giorno per aprirlo (i pallini della settimana stanno nella striscia)
// I giorni con cose da fare ancora aperte (Ignazio 23/09: «sul giorno non vedo nessun riferimento»): un cerchietto verde
// vuoto accanto al numero, uguale ovunque — striscia della settimana, mese grande, mese piccolo, mesi di Periodo WES e Anno.
// Come nel foglio: una cosa non fatta di un giorno passato sta su oggi. `lista` = AG.cose (+ AG.coseLunghe per Periodo/Anno).
function giorniConCose(lista, oggi) {
  const si = new Set();
  for (const c of lista || []) {
    if (c.fatto_il || !MB21Agenda.daMBPlan(c) || (c.scala && c.scala !== 'giorno') || !c.giorno) continue;
    si.add(c.giorno < oggi ? oggi : c.giorno);
  }
  return si;
}
const anelloCose = (si, g) => (si.has(g) ? '<i class="mm-cose" title="Cose da fare aperte"></i>' : '');

function meseHtml(giorno, oggi) {
  const A = MB21Agenda;
  const primo = giorno.slice(0, 8) + '01';
  const inizio = A.settimana(primo)[0];
  const punti = A.puntiGiorni(AG.azioni, Array.from({ length: 42 }, (_, i) => A.spostaGiorno(inizio, i)), 3);   // i pallini come nella striscia (22/09)
  const conCose = giorniConCose(AG.cose, oggi);
  let h = `<div class="mb-mese"><div class="mb-mese-testa"><button class="freccia" data-mese="-1" aria-label="Mese prima">‹</button><b>${esc(A.titoloMese(giorno))}</b><button class="freccia" data-mese="1" aria-label="Mese dopo">›</button></div>
    <div class="mb-mese-griglia">${A.GIORNI_SETTIMANA.map(g => `<small>${g}</small>`).join('')}`;
  for (let i = 0; i < 42; i++) {
    const g = A.spostaGiorno(inizio, i);
    if (i >= 35 && g.slice(0, 7) !== giorno.slice(0, 7)) break;
    const p = punti[g] || { punti: [], tanti: false };
    h += `<button data-giorno="${g}" class="${g.slice(0, 7) !== giorno.slice(0, 7) ? 'altro' : ''}${g === giorno ? ' scelto' : ''}${g === oggi ? ' oggi' : ''}"><span class="cc-n">${Number(g.slice(8))}${anelloCose(conCose, g)}</span><span class="ag-punti">${p.punti.map(c => `<i class="${classeCat(c)}"></i>`).join('')}${p.tanti ? `<i class="tanti ${classeCat(null)}"></i>` : ''}</span></button>`;
  }
  return h + '</div></div>';
}

// Il cassetto «Timeline» che si tira su dal basso: la giornata a orario (la stessa griglia di prima), si tocca
// un'ora libera per fissare, un blocco per aprirlo.
function foglioCronologia(eventi, opz) {
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio alto crono">
    <div class="testa-foglio"><h3>Timeline</h3><button id="cr-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    ${grigliaGiorno(eventi, opz)}</div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#cr-x').onclick = chiudi;
  const vai = velo.querySelector('#ag-vai-ora'); if (vai) vai.remove();
  collegaGriglia(velo, eventi, chiudi);
  const rif = velo.querySelector('.ag-adesso') || velo.querySelector('.ag-ev');
  const foglio = velo.querySelector('.foglio');
  if (rif) foglio.scrollTop = Math.max(0, rif.offsetTop - 160);
}

// I tocchi sulla griglia a orario: il vuoto fissa a quell'ora, il blocco apre il foglio dell'impegno.
function collegaGriglia(radice, eventi, prima) {
  const A = MB21Agenda;
  const tocca = radice.querySelector('#ag-tocca');
  if (tocca) tocca.onclick = ev => {
    if (vediTutti()) return mostraToast('Con «Tutti» scegli prima il partner nel Partner Select');
    const ore = tocca.parentElement, riquadro = ore.getBoundingClientRect();
    const minuti = A.alQuarto(Number(ore.dataset.da) + (ev.clientY - riquadro.top) / ALT_ORA * 60);
    if (prima) prima();
    nuovoAppuntamento({ giorno: AG.giorno, ora: A.daMinuti(minuti) });
  };
  radice.querySelectorAll('.ag-ev').forEach(b => {
    const e = eventi.find(x => x.id === b.dataset.evento);
    if (e) b.onclick = () => { if (prima) prima(); AG.aperta = e.id; foglioEvento(e); };
  });
  // le cose da fare con l'ora: il tocco sul blocco la spunta (o toglie la spunta)
  const perId = new Map(coseConOra(AG.giorno).map(x => [x.id, x]));
  radice.querySelectorAll('[data-cosa-blocco]').forEach(b => {
    const x = perId.get(b.dataset.cosaBlocco);
    if (x) b.onclick = () => { if (prima) prima(); spuntaCosa(x._cosa.cosa); };
  });
  radice.querySelectorAll('[data-spazio]').forEach(b => { b.onclick = () => { if (prima) prima(); foglioSpazio(b.dataset.spazio); }; });
  radice.querySelectorAll('[data-ricevuto]').forEach(b => { b.onclick = () => { if (prima) prima(); const r = ricevutoDaChiave(b.dataset.ricevuto); if (r) foglioRicevuto(r); }; });
  portaInVista();
  aggiornaVaiOra();
}

// ── La griglia del giorno, come il Calendario di iPhone ───────────────────────
// Le ore a sinistra, ogni impegno alto quanto dura; chi si accavalla sta affiancato, così un doppio
// appuntamento alla stessa ora si vede subito. Si tocca un'ora libera per fissare lì.
// Dare un'ora alle cose da fare (time blocking, Ignazio 23/09): le cose da fare e le voci dei Modelli personali con l'ora
// diventano blocchi nella Timeline, tratteggiati col cerchietto (non sono appuntamenti: niente persona, esito o conti).
// le stesse pillole degli appuntamenti (MB21Agenda.DURATE: 15 · 30 · 45 min · 1 ora), più «Altra…» con l'ora di fine a mano
const DURATE_COSA = MB21Agenda.DURATE;
function pilloleDurata(id, durata, oraInizio) {
  const altra = !DURATE_COSA.some(([m]) => m === durata);
  const fine = oraInizio && durata ? MB21Agenda.daMinuti(Math.min(1439, MB21Agenda.inMinuti(oraInizio) + durata)) : '';
  return `<div class="ag-scelte" id="${id}">${DURATE_COSA.map(([m, t]) => `<button type="button" data-durata="${m}" class="${!altra && durata === m ? 'scelto' : ''}">${t}</button>`).join('')}<button type="button" data-durata="altra" class="${altra ? 'scelto' : ''}">Altra…</button></div>
    <div class="fc-fine"${altra ? '' : ' hidden'}><label>Finisce alle <input type="time" data-fine="${id}" value="${esc(fine)}"></label></div>`;
}
// la durata scelta: una pillola, oppure «Altra…» con l'ora di fine (differenza dall'ora d'inizio, almeno 5 minuti)
function collegaPilloleDurata(radice, id, campoOra, cambia) {
  const box = radice.querySelector('#' + id), fine = radice.querySelector(`[data-fine="${id}"]`);
  if (!box) return;
  box.querySelectorAll('[data-durata]').forEach(b => { b.onclick = () => {
    box.querySelectorAll('[data-durata]').forEach(x => x.classList.toggle('scelto', x === b));
    fine.parentElement.parentElement.hidden = b.dataset.durata !== 'altra';
    if (b.dataset.durata !== 'altra') cambia(Number(b.dataset.durata));
  }; });
  fine.onchange = () => {
    const ora = campoOra() || '';
    if (!ora || !fine.value) return;
    const d = MB21Agenda.inMinuti(fine.value) - MB21Agenda.inMinuti(ora);
    if (d < 5) return mostraToast('L\'ora di fine deve venire dopo l\'inizio');
    cambia(d);
  };
}
function coseConOra(giorno) {
  const A = MB21Agenda;
  const blocco = (id, testo, ora, durata, fatto, ref) => {
    const inizio = A.isoDaRoma(giorno, String(ora).slice(0, 5));
    return { id, tipo_azione: 'Cosa', inizio, quando: inizio, fine: new Date(Date.parse(inizio) + (durata || 30) * 60000).toISOString(), testo, fatto, _cosa: ref };
  };
  return (AG.cose || []).filter(c => c.giorno === giorno && c.ora && A.daMBPlan(c) && (c.scala || 'giorno') === 'giorno')
    .map(c => blocco('cosa-' + c.id, c.testo, c.ora, c.durata, !!c.fatto_il, { cosa: c }));
}
const oraDurata = x => x.ora ? `${String(x.ora).slice(0, 5)}${x.durata ? ` · ${x.durata >= 60 && x.durata % 60 === 0 ? x.durata / 60 + (x.durata === 60 ? ' ora' : ' ore') : x.durata + ' min'}` : ''}` : '';

function grigliaGiorno(eventi, opz) {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const blocchiCose = [...coseConOra(AG.giorno), ...spaziComeBlocchi(AG.giorno), ...ricevutiComeBlocchi(AG.giorno)];
  const d = A.disposizioneGiorno([...eventi, ...blocchiCose]);
  const dVeri = blocchiCose.length ? A.disposizioneGiorno(eventi) : d;   // l'avviso «si accavallano» guarda solo gli appuntamenti
  const y = m => Math.round((m - d.da) / 60 * ALT_ORA);
  const altezza = y(d.a);
  let h = '';
  // L'avviso esce solo per un doppione VERO: due impegni della stessa persona. Con «Tutti» l'Admin guarda
  // più agende insieme, e allora si dice anche di chi sono (Ignazio 21/09: «in Tutti non deve uscire»).
  if (dVeri.sovrapposti) {
    const chi = [...new Set(dVeri.blocchi.filter(b => b.doppio).map(b => b.ev.utenti && (b.ev.utenti.nome || b.ev.utenti.nome_cognome)).filter(Boolean))];
    const diChi = vediTutti() && chi.length ? ` di ${chi.join(' e ')}` : '';
    h += `<div class="ag-doppi">${ic('attenzione')} ${dVeri.sovrapposti} impegni${esc(diChi)} si accavallano: controlla che sia voluto.</div>`;
  }
  h += `<div class="ag-griglia"><div class="ag-ore" data-da="${d.da}" data-alt="${ALT_ORA}" style="height:${altezza}px">`;
  h += `<button class="ag-libero" id="ag-tocca" aria-label="Fissa un appuntamento a quest'ora"></button>`;
  for (let m = d.da; m <= d.a; m += 60) {
    h += `<div class="ag-lin" style="top:${y(m)}px"><b>${m === 1440 ? '24' : m / 60}</b></div>`;
    if (m + 30 < d.a) h += `<div class="ag-mezza" style="top:${y(m + 30)}px"></div>`;
  }
  // l'invito «＋ libero» dentro i buchi da un'ora in su: fa capire che il vuoto si tocca.
  // I buchi si contano sui blocchi come si vedono (mai più bassi di 20 minuti), se no l'invito finirebbe sotto una telefonata.
  const buchi = [];
  let punto = d.da;
  for (const b of d.blocchi) {
    if (b.cima - punto >= 60) buchi.push({ da: punto, a: b.cima });
    punto = Math.max(punto, b.cima + b.alta);
  }
  if (d.a - punto >= 60) buchi.push({ da: punto, a: d.a });
  for (const f of buchi) {
    const alto = y(f.a) - y(f.da) - 6;
    if (alto < 50) continue;
    const dalle = A.daMinuti(Math.ceil(f.da / 15) * 15);
    h += `<div class="ag-invito" style="top:${y(f.da) + 3}px;height:${alto}px">${ic('piu')} ${f.a >= 1440 ? `dalle ${dalle} libero` : `${dalle} – ${A.daMinuti(f.a)} libero`}</div>`;
  }
  for (const b of d.blocchi) {
    const e = b.ev, larga = 100 / b.colonne, sin = b.col * larga;
    const alto = Math.max(18, y(b.cima + b.alta) - y(b.cima) - 3);
    if (e._ricevuto) {   // un impegno ricevuto da un altro (nota 027): pieno, non si trascina; il tocco apre il suo foglio
      h += `<button class="ag-ev ag-ricevuto${e._ricevuto.risposta === 'non_ci_sono' ? ' noci' : ''}${alto < 26 ? ' bassa' : ''}" data-ricevuto="${esc(A.chiaveRicevuto(e._ricevuto))}" aria-label="${esc(A.titoloRicevuto(e._ricevuto))}"
        style="top:${y(b.cima)}px;height:${alto}px;left:calc(${sin}% + 2px);width:calc(${larga}% - 6px)"><b>${esc(e.testo)}</b>${alto < 32 ? '' : `<small>${esc(A.orario(e))} · da ${esc(e._ricevuto.da_nome || '—')}</small>`}</button>`;
      continue;
    }
    if (e._spazio) {   // uno spazio da riempire (27/09): tratteggiato col colore del tipo, si trascina; il tocco apre il suo foglio
      h += `<button class="ag-ev ag-cosa ag-spazio${alto < 26 ? ' bassa' : ''}" data-cosa-blocco="${esc(e.id)}" data-spazio="${esc(e._spazio.id)}" aria-label="${esc(e.testo)}, ${esc(sottoSpazio(e._spazio))}"
        style="--tinta:${coloreSpazio(e._spazio.tipo)};top:${y(b.cima)}px;height:${alto}px;left:calc(${sin}% + 2px);width:calc(${larga}% - 6px)"><b>${esc(e.testo)}</b>${alto < 32 ? '' : `<small>${esc(A.orario(e))}${MB21Spazi.daRiempire(e._spazio.tipo) ? ' · da riempire' : ''}</small>`}</button>`;
      continue;
    }
    if (e._cosa) {   // una cosa da fare con l'ora: tratteggiata, col cerchietto; il tocco la spunta
      const lgc = A.legameDi(e._cosa.cosa);   // il colore del legame (05/10): Team verde, LdS viola, Network 21 blu, Amway arancio, persona grigio
      h += `<button class="ag-ev ag-cosa${lgc ? ' lg-' + esc(lgc.tipo) : ''}${e.fatto ? ' fatta' : ''}${alto < 26 ? ' bassa' : ''}" data-cosa-blocco="${esc(e.id)}" aria-label="${esc(e.testo)}${lgc ? ', ' + esc(lgc.nome) : ''}${e.fatto ? ', fatta' : ''}"
        style="top:${y(b.cima)}px;height:${alto}px;left:calc(${sin}% + 2px);width:calc(${larga}% - 6px)"><i></i><b>${esc(e.testo)}</b>${alto < 32 ? '' : `<small>${esc(A.orario(e))}</small>`}</button>`;
      continue;
    }
    const dallaCoda = e.tipo_azione === 'Contatto' && !!e.data_scelta;
    // Con «Tutti» il nome del partner non va davanti al titolo (nella colonna stretta mangerebbe il nome
    // della persona: «[Isabella] Telefonata · Bru…», visto sui dati veri il 21/09): sta in piccolo sotto,
    // insieme all'ora. Se il blocco è troppo basso per la riga piccola, allora resta davanti.
    const suo = opz.admin && opz.mioId !== e.user_id && e.utenti ? (e.utenti.nome || e.utenti.nome_cognome) : '';
    const bassoDavvero = alto < 32;
    const r = A.riga(e, suo && !bassoDavvero ? { mioId: null, admin: false } : opz);
    const cat = (e.contatti && e.contatti.categoria) || e.categoria;
    const sotto = [suo, A.orario(e)].filter(Boolean).join(' · ') + (e.confermato_il && !e.completata ? ' · 👍' : '');
    h += `<button class="ag-ev ${classeCat(cat)}${alto < 26 ? ' bassa' : ''}${e.completata ? ' fatta' : ''}${dallaCoda ? ' dacoda' : ''}${AG.aperta === e.id ? ' scelta' : ''}" data-evento="${esc(e.id)}"
      style="top:${y(b.cima)}px;height:${alto}px;left:calc(${sin}% + 2px);width:calc(${larga}% - 6px)">
      <span class="bar"></span><b>${esc(r.titolo)}</b>${bassoDavvero ? '' : `<small>${esc(sotto)}</small>`}</button>`;
  }
  let adessoDentro = false;
  if (AG.giorno === oggi) {
    const ora = A.inMinuti(A.partiRoma(new Date().toISOString()).ora);
    adessoDentro = ora >= d.da && ora <= d.a;
    if (adessoDentro) h += `<div class="ag-adesso" style="top:${y(ora)}px"><i></i><b>${A.daMinuti(ora)}</b></div>`;
  }
  h += `</div></div>`;
  if (adessoDentro) h += `<button class="ag-vai-ora" id="ag-vai-ora">${ic('orario')} Ora</button>`;
  return h;
}

// ── La settimana intera: sette colonne, il colpo d'occhio su dove sei pieno e dove sei libero ──
function grigliaSettimana(opz) {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const giorni = AG.settimana.map(g => ({ g, d: A.disposizioneGiorno(A.eventiDelGiorno(AG.azioni, g), { minimoMinuti: 30, oraDa: 24, oraA: 0 }) }));
  // La settimana mostra solo le ore che servono: dalla prima all'ultima cosa della settimana, con mezz'ora
  // di margine, e almeno otto ore. Con pochi appuntamenti, 8→24 sarebbe un lenzuolo quasi vuoto (Ignazio 21/09).
  // gli spazi da riempire (27/09): tratteggiati sopra la griglia; contano anche per decidere quali ore mostrare
  const spaziSett = AG.settimana.map(g => spaziDelGiorno(g).map(x => { const o = MB21Spazi.orario(x); return { x, cima: A.inMinuti(o.ora), alta: o.durata }; }));
  const tutti = [...giorni.flatMap(x => x.d.blocchi), ...spaziSett.flat()];
  const { da, a } = A.oreUtili(tutti);
  const y = m => Math.round((m - da) / 60 * ALT_ORA_SETT);
  const quanti = giorni.reduce((n, x) => n + x.d.blocchi.length, 0) + spaziSett.flat().length;
  let h = `<div class="ag-sett-testa">${giorni.map(({ g, d }, i) =>
    `<div class="${g === oggi ? 'oggi' : ''} ${g === AG.giorno ? 'scelto' : ''}">${A.GIORNI[i]}<b>${Number(g.slice(8))}</b></div>`).join('')}</div>`;
  h += `<div class="ag-griglia sett"><div class="ag-ore" data-da="${da}" data-alt="${ALT_ORA_SETT}" style="height:${y(a)}px">`;
  for (let m = da; m <= a; m += 60) {
    h += `<div class="ag-lin" style="top:${y(m)}px"><b>${m === 1440 ? '24' : m / 60}</b></div>`;
  }
  giorni.forEach(({ g, d }, i) => {
    const larga = 100 / 7, sinG = i * larga;
    h += `<button class="ag-colonna ag-libero${g === oggi ? ' oggi' : ''}${g === AG.giorno ? ' scelto' : ''}" data-vai="${g}" aria-label="Apri il giorno ${Number(g.slice(8))}" style="left:${sinG}%;width:${larga}%"></button>`;
    // i blocchi che si accavallano si uniscono in uno solo che dice quanti sono: nella colonna stretta
    // della settimana due nomi diventerebbero «G.» e «N.», che non si leggono (Ignazio 21/09)
    const gruppi = new Map();
    for (const b of d.blocchi) {
      const chi = gruppi.get(b.gruppo) || [];
      chi.push(b);
      gruppi.set(b.gruppo, chi);
    }
    for (const b of spaziSett[i]) h += `<button class="ag-sev ag-spazio" data-vai="${g}" style="--tinta:${coloreSpazio(b.x.tipo)};top:${y(b.cima)}px;height:${Math.max(11, y(b.cima + b.alta) - y(b.cima) - 2)}px;left:calc(${sinG}% + 1px);width:calc(${larga}% - 2px)"
      aria-label="${MB21Spazi.orario(b.x).ora} ${esc(MB21Spazi.titolo(b.x))}${MB21Spazi.daRiempire(b.x.tipo) ? ' da riempire' : ''}"></button>`;
    for (const chi of gruppi.values()) {
      const cima = Math.min(...chi.map(b => b.cima)), giu = Math.max(...chi.map(b => b.cima + b.alta));
      const alto = Math.max(11, y(giu) - y(cima) - 2);
      if (chi.length > 1) {
        const ore = A.daMinuti(cima);
        h += `<button class="ag-sev molti" data-vai="${g}" style="top:${y(cima)}px;height:${alto}px;left:calc(${sinG}% + 1px);width:calc(${larga}% - 2px)"
          aria-label="${chi.length} impegni dalle ${ore}, apri il giorno"><span class="barre">${chi.slice(0, 3).map(b =>
            `<i class="${classeCat((b.ev.contatti && b.ev.contatti.categoria) || b.ev.categoria)}"></i>`).join('')}</span><b>${chi.length}</b></button>`;
        continue;
      }
      const b = chi[0], e = b.ev;
      const cat = (e.contatti && e.contatti.categoria) || e.categoria;
      const nome = (e.contatti && e.contatti.nome) || '—';
      h += `<button class="ag-sev ${classeCat(cat)}${e.completata ? ' fatta' : ''}" data-evento="${esc(e.id)}" data-giorno="${g}"
        style="top:${y(b.cima)}px;height:${alto}px;left:calc(${sinG}% + 1px);width:calc(${larga}% - 2px)"
        aria-label="${esc(A.orario(e))} ${esc(nome)}"><span class="bar"></span>${alto >= 18 ? `<span>${esc(nome.split(' ')[0])}</span>` : ''}</button>`;
    }
  });
  if (AG.settimana.includes(oggi)) {
    const ora = A.inMinuti(A.partiRoma(new Date().toISOString()).ora);
    if (ora >= da && ora <= a) h += `<div class="ag-adesso" style="top:${y(ora)}px"><i></i></div>`;
  }
  h += `</div></div>`;
  if (!quanti) h += `<div class="ag-sett-vuoto">Settimana libera. Tocca un giorno per fissare qualcosa.</div>`;
  else {
    // il riassunto della settimana: che lavoro c'è, non solo quando (qui il colore è quello del TIPO di lavoro)
    const conto = A.contaPerTipo(AG.azioni, AG.settimana);
    h += `<div class="ag-conto">${conto.map(c => `<span style="--tinta:${c.colore}"><i></i>${c.quanti} ${esc(c.nome)}</span>`).join('')}</div>`;
  }
  return h;
}

// La linea rossa di «adesso» scende da sola ogni minuto: si sposta e basta, senza rifare la pagina
// (ridisegnare chiuderebbe quello che si sta facendo).
setInterval(() => {
  const linea = document.querySelector('.ag-adesso'), ore = document.querySelector('.ag-ore[data-da]');
  if (!linea || !ore) return;
  const A = MB21Agenda;
  const adesso = A.inMinuti(A.partiRoma(new Date().toISOString()).ora);
  const da = Number(ore.dataset.da);
  linea.style.top = Math.round((adesso - da) / 60 * (Number(ore.dataset.alt) || ALT_ORA)) + 'px';
  const eti = linea.querySelector('b');
  if (eti) eti.textContent = A.daMinuti(adesso);
}, 60000);

// Il bottone «Ora» si mostra solo quando la linea rossa di adesso non è più sullo schermo, come nel
// Calendario di iPhone. Gli ascolti si mettono una volta sola (disegnaAgenda passa di qui di continuo).
function aggiornaVaiOra() {
  const b = document.getElementById('ag-vai-ora');
  if (!b) return;
  const linea = document.querySelector('.ag-adesso');
  if (!linea) { b.classList.remove('si'); return; }
  const y = linea.getBoundingClientRect().top;
  const inVista = y > 70 && y < window.innerHeight - 90;
  b.classList.toggle('si', !inVista);
}
window.addEventListener('scroll', aggiornaVaiOra, { passive: true });
window.addEventListener('resize', aggiornaVaiOra, { passive: true });

// Porta la griglia sotto gli occhi: su oggi all'altezza di adesso, sugli altri giorni al primo impegno.
// Si fa una volta sola per giorno e vista, se no la pagina saltellerebbe a ogni tocco.
function portaInVista(morbido) {
  if (AG.vista !== 'settimana') return;   // nel foglio del giorno la griglia sta nel cassetto: la pagina non si sposta
  const segno = AG.vista + '|' + AG.giorno;
  if (AG.portato === segno) return;
  AG.portato = segno;
  const rif = app.querySelector('.ag-adesso') || app.querySelector('.ag-ev') || app.querySelector('.ag-sev');
  if (!rif) return;
  const y = rif.getBoundingClientRect().top + window.scrollY - 150;
  window.scrollTo({ top: Math.max(0, y), behavior: morbido ? 'smooth' : 'auto' });
  setTimeout(aggiornaVaiOra, morbido ? 700 : 0);
}

// (dal 21/09 i bottoni dentro l'appuntamento non ci sono più: le due icone servono alle voci del Profilo)
// La «G» di Google (Ignazio 17/09: «invece dell'emoji usiamo la G di Google»), disegnata in linea: nessun file da scaricare
const ICONA_G = `<svg width="16" height="16" viewBox="0 0 48 48" style="vertical-align:-3px;margin-right:2px" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6C44.1 38 46.5 31.8 46.5 24.5z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6l-8-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l8-6.2z"/><path fill="#34A853" d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.7-6c-2.1 1.4-4.8 2.3-7.9 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z"/></svg>`;
// Icona del Calendario Apple: quella vera dell'app Calendario del Mac (icone/calendario-apple-32.png; Ignazio 21/09: «trova anche l'icona corretta»)
const ICONA_CAL = `<img src="icone/calendario-apple-32.png" width="16" height="16" alt="" style="vertical-align:-3px;margin-right:2px">`;

// ── Punti da trattare e link della chiamata (nota Pagine 026, Ignazio 05/10) ──
// Lo stesso riquadro dentro l'appuntamento (card dell'elenco e foglio della griglia) e nel foglio di una serata Team/LdS/OPEN:
// righe spuntabili (una sola forma, scelta di Ignazio), «+ Aggiungi un punto», «→ Da fare» sul punto non trattato (va in MB Plan
// legato alla stessa persona o allo stesso gruppo), e il link della chiamata online, che diventa il bottone «Entra nella chiamata».
// Si salva direttamente da qui (campi `punti` e `link` di azioni/spazi), senza passare dal foglio «Modifica». Le regole stanno in agenda.js.
const PUNTI_APERTI = new Set(), LINK_APERTI = new Set();   // gli id in cui si sta scrivendo (il riquadro chiuso mostra solo i due bottoni)
// un indirizzo scritto dentro un punto si può toccare
const testoConLink = t => esc(t).replace(/https?:\/\/[^\s<]+/g, m => `<a href="${m}" target="_blank" rel="noopener">${m}</a>`);
function puntiHtml(ogg, tabella) {
  const A = MB21Agenda;
  if (!A.conPunti(ogg, tabella)) return '';
  const punti = A.puntiDi(ogg), link = A.linkChiamata(ogg.link), legame = A.campiLegame(A.legamePunti(ogg, tabella));
  // «Dove» (Ignazio 05/10): il link se è online → «Entra nella chiamata»; il posto se dal vivo → si apre nelle Mappe
  const chiamata = link ? `<a class="pt-link" href="${esc(link)}" target="_blank" rel="noopener">${ic('chiamata')} Entra nella chiamata</a>`
    : ogg.luogo ? `<a class="pt-link pt-luogo" href="${esc(A.linkMappa(ogg.luogo))}" target="_blank" rel="noopener">${ic('mappa')} ${esc(ogg.luogo)}</a>` : '';
  const campoLink = LINK_APERTI.has(ogg.id)
    ? `<form class="pt-nuovo pt-link-campo" data-pt-link><input placeholder="Link di Zoom/Meet, oppure hotel, sala, indirizzo…" value="${esc(A.testoDove(ogg))}" autocomplete="off" maxlength="${A.MAX_LINK}"><button type="submit">Salva</button></form>`
    : `<button type="button" class="link" data-pt-link-apri>${link || ogg.luogo ? `${ic('modifica')} Cambia dove` : `${ic('piu')} Dove si fa`}</button>`;
  if (!punti.length && !PUNTI_APERTI.has(ogg.id))
    return `<div class="pt chiuso" data-pt="${esc(ogg.id)}">${chiamata}<div class="pt-comandi"><button type="button" class="link" data-pt-apri>${ic('piu')} Punti da trattare</button>${campoLink}</div></div>`;
  const righe = punti.map((r, i) => `<div class="pt-riga${r.fatto ? ' fatta' : ''}">
      <button type="button" class="spunta" data-pt-spunta="${i}" aria-label="${r.fatto ? 'Trattato: rimetti da trattare' : 'Trattato'}">${r.fatto ? ic('fatto') : ''}</button>
      <span class="pt-testo">${testoConLink(r.t)}</span>
      ${!r.fatto && legame ? `<button type="button" class="pt-dafare" data-pt-dafare="${i}" title="Passa al Da fare">→ Da fare</button>` : ''}
      <button type="button" class="pt-togli" data-pt-togli="${i}" aria-label="Togli il punto">${ic('chiudi')}</button></div>`).join('');
  return `<div class="pt" data-pt="${esc(ogg.id)}">${chiamata}
    <div class="pt-testa"><b>Punti da trattare</b>${punti.length ? `<small>${esc(A.contoPunti(punti))}</small>` : ''}</div>${righe}
    ${punti.length < A.MAX_PUNTI ? `<form class="pt-nuovo" data-pt-nuovo><input type="text" placeholder="Aggiungi un punto" autocomplete="off" maxlength="${A.MAX_PUNTO}"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>` : ''}
    <div class="pt-comandi">${campoLink}</div></div>`;
}
// `ridisegna()` rifà chi mostra il riquadro (l'elenco, il foglio dell'impegno, il foglio della serata)
function collegaPunti(el, ogg, tabella, ridisegna) {
  const A = MB21Agenda;
  const blocco = el.querySelector(`[data-pt="${ogg.id}"]`);
  if (!blocco) return;
  // l'oggetto mostrato può essere una copia: si aggiorna anche quello nella lista dell'Agenda
  const localmente = campi => { Object.assign(ogg, campi); const o = (tabella === 'spazi' ? AG.spazi : AG.azioni || []).find(x => x.id === ogg.id); if (o && o !== ogg) Object.assign(o, campi); };
  const salva = async campi => {
    const prima = { punti: ogg.punti, link: ogg.link, luogo: ogg.luogo };
    localmente(campi);
    const { error } = await dbq('punti da trattare', supa.from(tabella).update(campi).eq('id', ogg.id));
    if (error) { localmente(prima); mostraToast('Non salvato: controlla la connessione e riprova.'); return false; }
    ridisegna();
    return true;
  };
  const coiPunti = p => ({ punti: p.length ? p : null });
  const su = (sel, fn) => blocco.querySelectorAll(sel).forEach(b => { b.onclick = () => fn(b); });
  su('[data-pt-apri]', () => { PUNTI_APERTI.add(ogg.id); ridisegna(); });
  su('[data-pt-link-apri]', () => { LINK_APERTI.add(ogg.id); ridisegna(); });
  su('[data-pt-spunta]', b => salva(coiPunti(A.spuntaPunto(A.puntiDi(ogg), Number(b.dataset.ptSpunta)))));
  su('[data-pt-togli]', async b => {
    const punti = A.puntiDi(ogg), i = Number(b.dataset.ptTogli), tolto = punti[i];
    if (await salva(coiPunti(A.togliPunto(punti, i)))) mostraToast('Punto tolto', () => salva(coiPunti(punti)));
    return tolto;
  });
  // il punto non trattato passa al «Da fare» di oggi, legato alla stessa persona o allo stesso gruppo (nota ✅ 025); con «Annulla» torna qui
  su('[data-pt-dafare]', async b => {
    const punti = A.puntiDi(ogg), i = Number(b.dataset.ptDafare), r = punti[i];
    const campi = A.campiLegame(A.legamePunti(ogg, tabella));
    if (!r || !campi) return;
    const ordine = (AG.cose || []).reduce((m, c) => Math.max(m, c.ordine || 0), 0) + 1;
    const { data, error } = await dbq('punto nel Da fare', supa.from('cose_da_fare').insert({ user_id: visto().id, testo: r.t, giorno: MB21Coda.oggiRoma(), scala: 'giorno', ordine, ...campi }).select('*, contatti(nome, categoria)').single());
    if (error) return mostraToast('Non messo nel Da fare: controlla la connessione e riprova.');
    if (data && data.id && AG.cose) AG.cose.push(data);
    await salva(coiPunti(A.togliPunto(punti, i)));
    mostraToast(`«${r.t}» è nel Da fare di oggi`, async () => {
      if (data && data.id) { await dbq('annulla punto nel Da fare', supa.from('cose_da_fare').delete().eq('id', data.id)); if (AG.cose) AG.cose = AG.cose.filter(c => c.id !== data.id); }
      salva(coiPunti(punti));
    });
  });
  blocco.querySelectorAll('form[data-pt-link]').forEach(form => {
    form.onsubmit = async ev => {
      ev.preventDefault();
      LINK_APERTI.delete(ogg.id);
      salva(A.doveDa(form.querySelector('input').value));   // link se è online, posto se dal vivo, vuoto toglie
    };
  });
  blocco.querySelectorAll('form[data-pt-nuovo]').forEach(form => {
    form.onsubmit = async ev => {
      ev.preventDefault();
      const nuovi = A.aggiungiPunto(A.puntiDi(ogg), form.querySelector('input').value);
      if (!nuovi) return;
      PUNTI_APERTI.add(ogg.id);
      if (await salva(coiPunti(nuovi))) { const c2 = el.querySelector(`[data-pt="${ogg.id}"] form[data-pt-nuovo] input`); if (c2) c2.focus(); }   // si continua col prossimo
    };
  });
}

// ── Impegni condivisi (nota Pagine 027, Ignazio 05/10) ──
// CHI ORGANIZZA: un appuntamento con un Partner che usa l'app si condivide con lui («Condividi con Laura», funzione `condividi_azione`); una serata
// Team/LdS/OPEN la condivide solo l'Admin con tutto il Team o con una Linea (campi `condiviso_con` · `linea_codice` di `spazi`). «Vedono anche i
// punti?» sì/no. Chi organizza vede i nomi e il conto delle risposte (`risposte_impegno`): «Partecipano 6 · Non possono 2 · Senza risposta 4»: due liste con i nomi, solo per lui.
// CHI RICEVE: l'impegno compare nella sua Agenda (impegni del giorno, Settimana, Timeline) con «da Ignazio», in sola lettura, con il link della
// chiamata e, se condivisi, i punti; risponde «Partecipo / Non posso» (tabella `impegni_risposte`). All'apertura dell'app un pop-up
// «Hai un nuovo appuntamento» per quelli non ancora visti. Niente avvisi push: l'avviso lo dà il suo calendario (funzione `calendario`).
const ricevutiDelGiornoMB = g => (vediTutti() ? [] : MB21Agenda.ricevutiDelGiorno(AG.ricevuti, g));
const giornoOraRicevuto = r => `${dataLunga(MB21Agenda.partiRoma(r.inizio).giorno)} · ${MB21Agenda.orario(r)}`;
// la riga nella card degli impegni e nell'elenco della settimana: pallino pieno grigio-blu, «da Ignazio» sotto, la risposta se c'è
function rigaRicevutoHtml(r) {
  const A = MB21Agenda;
  return `<button class="ag-imp ric-imp${r.risposta === 'non_ci_sono' ? ' noci' : ''}" data-ricevuto="${esc(A.chiaveRicevuto(r))}"><i></i><span>${esc(r.titolo)}<small>da ${esc(r.da_nome || '—')}${r.risposta ? ' · ' + esc(A.nomeRisposta(r.risposta)) : !r.visto_il ? ' · nuovo' : ''}</small></span><b>${esc(A.orario(r))}</b></button>`;
}
// i blocchi della Timeline, come gli spazi ma pieni e senza trascinamento
function ricevutiComeBlocchi(g) {
  return ricevutiDelGiornoMB(g).map(r => ({ id: 'ricevuto-' + r.origine + '-' + r.id, tipo_azione: 'Ricevuto', inizio: r.inizio, quando: r.inizio, fine: r.fine, testo: r.titolo, _ricevuto: r }));
}
const ricevutoDaChiave = k => (AG.ricevuti || []).find(r => MB21Agenda.chiaveRicevuto(r) === k);
// la risposta di chi riceve (visto, ci sono / non ci sono): una riga sola per persona e impegno, si riscrive intera
async function rispondiImpegno(r, risposta) {
  const adesso = new Date().toISOString();
  const riga = { origine: r.origine, impegno_id: r.id, utente_id: visto().id, visto_il: r.visto_il || adesso, risposta: risposta || r.risposta || null, risposto_il: risposta ? adesso : null };
  const { error } = await dbq('risposta impegno', supa.from('impegni_risposte').upsert(riga, { onConflict: 'origine,impegno_id,utente_id' }));
  if (error) { mostraToast('Non salvato: controlla la connessione e riprova.'); return false; }
  r.visto_il = riga.visto_il; if (risposta) r.risposta = risposta;
  return true;
}
const puntiSolaLetturaHtml = r => {
  const punti = MB21Agenda.puntiDi(r);
  if (!punti.length) return '';
  // in sola lettura: niente cerchietti da spuntare (li spunta chi organizza; Ignazio 05/10: «non capisco questa card»): un elenco con • e ✓
  return `<div class="pt pt-lettura"><div class="pt-testa"><b>Punti da trattare</b><small>li spunta chi organizza</small></div>${punti.map(p => `<div class="pt-riga${p.fatto ? ' fatta' : ''}"><span class="pt-segno">${p.fatto ? '✓' : '•'}</span><span class="pt-testo">${testoConLink(p.t)}</span></div>`).join('')}</div>`;
};
// le due risposte; nel pop-up anche «Decido dopo» accanto (Ignazio 05/10): toglie la riga dal pop-up senza salvare niente, l'impegno resta «nuovo»
const rispostaBottoniHtml = (r, attr, conDopo) => `<div class="ag-scelte ric-risposta">${MB21Agenda.RISPOSTE.map(([k, n]) => `<button type="button" ${attr}="${k}" class="${r.risposta === k ? 'scelto' : ''}">${esc(n)}</button>`).join('')}${conDopo ? `<button type="button" ${attr}="dopo" class="dopo">Decido dopo</button>` : ''}</div>`;
// Il foglio di un impegno ricevuto: cosa, da chi, quando, «Entra nella chiamata», i punti (sola lettura), «Partecipi? Partecipo / Non posso». Aprirlo lo segna visto.
function foglioRicevuto(r) {
  const A = MB21Agenda;
  const velo = document.createElement('div');
  velo.className = 'velo';
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  const disegna = () => {
    velo.innerHTML = `<div class="foglio alto ric-foglio">
      <div class="testa-foglio"><h3>${esc(r.titolo)}</h3><button id="ri-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
      <p>${esc(giornoOraRicevuto(r))}</p>
      <div class="vn-aiuto">Te lo ha mandato <b>${esc(r.da_nome || '—')}</b>: sta nella tua Agenda e nel tuo calendario.</div>
      ${r.link ? `<a class="pt-link" href="${esc(r.link)}" target="_blank" rel="noopener">${ic('chiamata')} Entra nella chiamata</a>`
        : r.luogo ? `<a class="pt-link pt-luogo" href="${esc(A.linkMappa(r.luogo))}" target="_blank" rel="noopener">${ic('mappa')} ${esc(r.luogo)}</a>` : ''}
      ${puntiSolaLetturaHtml(r)}
      <div class="campo"><label>Partecipi?</label>${rispostaBottoniHtml(r, 'data-ri-risposta')}</div></div>`;
    velo.querySelector('#ri-x').onclick = chiudi;
    velo.querySelectorAll('[data-ri-risposta]').forEach(b => { b.onclick = async () => {
      if (await rispondiImpegno(r, b.dataset.riRisposta)) { chiudi(); await apriAgenda(AG.giorno); mostraToast(b.dataset.riRisposta === 'ci_sono' ? 'Segnato: partecipi' : 'Segnato: non puoi'); }
    }; });
  };
  disegna();
  if (!r.visto_il) rispondiImpegno(r, null);   // visto: il pop-up non lo ripropone
}
// All'apertura dell'app (index.html, dopoAccesso): gli impegni ricevuti non ancora visti, da oggi in avanti. Chiamato da index.html, mai con «Tutti».
async function controllaImpegniNuovi() {
  if (!ST.utente || !ST.utente.id || vediTutti()) return;
  const A = MB21Agenda, adesso = new Date();
  const { data, error } = await dbq('impegni nuovi', supa.rpc('impegni_ricevuti', { p_da: new Date(adesso.getTime() - 86400000).toISOString(), p_a: new Date(adesso.getTime() + 366 * 86400000).toISOString() }));
  if (error || !Array.isArray(data)) return;
  const nuovi = A.ricevutiNuovi(data, adesso.toISOString());
  if (nuovi.length) foglioImpegniNuovi(nuovi);
}
// Il pop-up «Hai un nuovo appuntamento»: una riga per impegno con «Partecipo / Non posso / Decido dopo»; «Decido dopo» lo lascia nuovo finché non si risponde.
function foglioImpegniNuovi(nuovi) {
  const A = MB21Agenda;
  const velo = document.createElement('div');
  velo.className = 'velo';
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  const disegna = () => {
    if (!nuovi.length) return chiudi();
    velo.innerHTML = `<div class="foglio alto ric-foglio">
      <div class="testa-foglio"><h3>${nuovi.length === 1 ? 'Hai un nuovo appuntamento' : `Hai ${nuovi.length} nuovi appuntamenti`}</h3><button id="rn-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
      ${nuovi.map(r => `<div class="ric-nuovo" data-rn="${esc(A.chiaveRicevuto(r))}"><b>${esc(r.titolo)}</b><span>da ${esc(r.da_nome || '—')} · ${esc(giornoOraRicevuto(r))}</span>
        ${r.link ? `<a class="link" href="${esc(r.link)}" target="_blank" rel="noopener">Link della chiamata</a>` : r.luogo ? `<a class="link" href="${esc(A.linkMappa(r.luogo))}" target="_blank" rel="noopener">${ic('mappa')} ${esc(r.luogo)}</a>` : ''}${rispostaBottoniHtml(r, 'data-rn-risposta', true)}</div>`).join('')}</div>`;
    velo.querySelector('#rn-x').onclick = chiudi;
    velo.querySelectorAll('.ric-nuovo').forEach(riga => {
      const r = nuovi.find(x => A.chiaveRicevuto(x) === riga.dataset.rn);
      riga.querySelectorAll('[data-rn-risposta]').forEach(b => { b.onclick = async () => {
        const risposta = b.dataset.rnRisposta;
        if (risposta !== 'dopo' && !(await rispondiImpegno(r, risposta))) return;
        nuovi = nuovi.filter(x => x !== r);
        if (!nuovi.length && risposta !== 'dopo') mostraToast(risposta === 'ci_sono' ? 'Segnato: partecipi. Lo trovi in MB Plan' : 'Segnato: non puoi');
        disegna();
      }; });
    });
  };
  disegna();
}
// ── chi organizza: il riquadro «Condividi» ──
const nomePersona = e => (e.contatti && e.contatti.nome) || 'la persona';
const SENZA_APP = new Set();   // le azioni la cui persona non usa ancora MB21 (lo dice `condividi_azione`): si scrive e si offre l'invito (Ignazio 05/10)
function condivisioneAzioneHtml(e) {
  const A = MB21Agenda;
  if (!A.puoCondividereAzione(e)) return '';
  if (!e.condiviso_con && SENZA_APP.has(e.id)) return `<div class="cd" data-cd="${esc(e.id)}"><div class="pt-testa"><b>${esc(nomePersona(e))} non usa ancora MB21</b></div>
    <div class="pt-comandi"><button type="button" class="link" data-cd-invita>${ic('invito')} Invitalo nell'app</button><button type="button" class="link" data-cd-con>Riprova</button></div></div>`;
  if (!e.condiviso_con) return `<div class="cd chiuso" data-cd="${esc(e.id)}"><button type="button" class="link" data-cd-con>${ic('condividi')} Condividi con ${esc(nomePersona(e))}</button></div>`;
  return `<div class="cd" data-cd="${esc(e.id)}"><div class="pt-testa"><b>Condiviso con ${esc(nomePersona(e))}</b><small>${e.punti_condivisi ? 'vede anche i punti' : 'senza i punti'}</small></div>
    <div class="cd-risposte" data-cd-risposte>…</div>
    <div class="pt-comandi"><button type="button" class="link" data-cd-punti="${e.punti_condivisi ? '0' : '1'}">${e.punti_condivisi ? 'Nascondi i punti' : 'Fai vedere i punti'}</button><button type="button" class="link" data-cd-togli>Non condividere più</button></div></div>`;
}
// le risposte di chi riceve, scritte a parole con i nomi (si leggono dopo, senza fermare il disegno)
async function mostraRisposte(el, origine, id) {
  const A = MB21Agenda, dove = el.querySelector('[data-cd-risposte]');
  if (!dove) return;
  const { data, error } = await dbq('risposte impegno', supa.rpc('risposte_impegno', { p_origine: origine, p_id: id }));
  if (error || !Array.isArray(data)) { dove.innerHTML = ''; return; }
  const n = A.nomiPerRisposta(data), c = A.contoRisposte(data);
  if (origine === 'azione') { dove.innerHTML = data.length ? `${esc(data[0].nome)}: <b>${esc(A.nomeRispostaDiLui(data[0].risposta))}</b>` : ''; return; }
  // due liste con i nomi (Ignazio 05/10): chi partecipa e chi non può; sotto, piccolo, chi non ha risposto
  const gruppo = (titolo, nomi, cl) => `<div class="${cl}"><b>${esc(titolo)} ${nomi.length}</b>${nomi.length ? ': ' + esc(nomi.join(', ')) : ''}</div>`;
  dove.innerHTML = `${gruppo('Partecipano', n.ci_sono, 'cd-si')}${gruppo('Non possono', n.non_ci_sono, 'cd-no')}${gruppo('Senza risposta', n.senza, 'cd-senza')}`; void c;
}
function collegaCondivisioneAzione(el, e, ridisegna) {
  const blocco = el.querySelector(`[data-cd="${e.id}"]`);
  if (!blocco) return;
  const localmente = campi => { Object.assign(e, campi); const o = (AG.azioni || []).find(x => x.id === e.id); if (o && o !== e) Object.assign(o, campi); };
  const chiama = async (con, punti, toast) => {
    const { data, error } = await dbq('condividi azione', supa.rpc('condividi_azione', { p_azione: e.id, p_con: con, p_punti: punti }));
    const r = data || {};
    if (error || !r.esito) return mostraToast('Non salvato: controlla la connessione e riprova.');
    if (r.esito === 'non_usa_app') { SENZA_APP.add(e.id); ridisegna(); return mostraToast(`${nomePersona(e)} non usa ancora MB21: puoi invitarlo nell'app`); }
    SENZA_APP.delete(e.id);
    if (r.esito === 'se_stesso') return mostraToast('Questo appuntamento è con te stesso');
    if (r.esito !== 'ok') return mostraToast('Non è un tuo appuntamento');
    localmente(con ? { condiviso_con: r.utente || e.condiviso_con, punti_condivisi: !!punti } : { condiviso_con: null, punti_condivisi: false });
    ridisegna();
    if (toast) mostraToast(toast);
  };
  const su = (sel, fn) => blocco.querySelectorAll(sel).forEach(b => { b.onclick = () => fn(b); });
  su('[data-cd-con]', () => chiama(true, false, `Condiviso con ${nomePersona(e)}: lo trova nella sua Agenda e nel suo calendario`));
  su('[data-cd-punti]', b => chiama(true, b.dataset.cdPunti === '1', b.dataset.cdPunti === '1' ? `${nomePersona(e)} vede anche i punti` : 'I punti restano solo tuoi'));
  su('[data-cd-togli]', () => chiama(false, false, 'Non più condiviso'));
  // il link per registrarsi (lo stesso della scheda: foglioLinkInvito, cantiere 32)
  su('[data-cd-invita]', () => foglioLinkInvito({ da: visto().id, nome: nomePersona(e), telefono: e.contatti && e.contatti.telefono }));
  if (e.condiviso_con) mostraRisposte(blocco, 'azione', e.id);
}
// la serata di gruppo (solo l'Admin): con chi, la Linea (uno dei suoi frontali, da `squadra`), i punti sì/no, le risposte con i nomi
function condivisioneSpazioHtml(s) {
  const A = MB21Agenda;
  if (!A.puoCondividereSpazio(s, eAdmin())) return '';
  const con = s.condiviso_con || '';
  const frontali = AG.frontali || [];
  // nota 005: il codice salvato può essere di una persona dentro la Linea: la Linea è il suo frontale
  const frontale = !s.linea_codice || frontali.some(f => f.partner_id === s.linea_codice) || !AG.ramo ? s.linea_codice
    : A.frontaleDi(AG.ramo.squadra, s.linea_codice, ST.utente.partner_id) || s.linea_codice;
  return `<div class="cd" data-cd="${esc(s.id)}"><div class="pt-testa"><b>Condividi con</b>${con ? `<small>${con === 'team' ? 'tutto il Team' : 'una Linea'}${s.punti_condivisi ? ' · vedono i punti' : ''}</small>` : ''}</div>
    <div class="ag-scelte">${A.CONDIVISIONI_SPAZIO.map(([k, n]) => `<button type="button" data-cd-con="${k}" class="${con === k ? 'scelto' : ''}">${esc(n)}</button>`).join('')}</div>
    ${con === 'linea' ? `<div class="campo"><label>Quale Linea? <small>uno dei tuoi frontali</small></label><div class="ag-scelte">${frontali.length ? frontali.map(f => `<button type="button" data-cd-linea="${esc(f.partner_id)}" class="${frontale === f.partner_id ? 'scelto' : ''}">${esc(f.nome)}</button>`).join('') : '<span class="vn-aiuto">Nessun frontale nella Mappa.</span>'}</div></div>${frontale && AG.ramo ? parteLineaHtml(frontale, s.linea_codice, AG.ramo.squadra) : ''}` : ''}
    ${con ? `<div class="campo"><label>Vedono anche i punti?</label><div class="ag-scelte"><button type="button" data-cd-punti="1" class="${s.punti_condivisi ? 'scelto' : ''}">Sì</button><button type="button" data-cd-punti="0" class="${s.punti_condivisi ? '' : 'scelto'}">No</button></div></div><div class="cd-risposte" data-cd-risposte>…</div>` : ''}</div>`;
}
function collegaCondivisioneSpazio(el, s, ridisegna) {
  const blocco = el.querySelector(`[data-cd="${s.id}"]`);
  if (!blocco) return;
  const salva = async campi => {
    const prima = { condiviso_con: s.condiviso_con, linea_codice: s.linea_codice, punti_condivisi: s.punti_condivisi };
    Object.assign(s, campi);
    const { error } = await dbq('condividi spazio', supa.from('spazi').update(campi).eq('id', s.id));
    if (error) { Object.assign(s, prima); return mostraToast('Non salvato: controlla la connessione e riprova.'); }
    ridisegna();
  };
  const su = (sel, fn) => blocco.querySelectorAll(sel).forEach(b => { b.onclick = () => fn(b); });
  su('[data-cd-con]', b => { const k = b.dataset.cdCon || null; if (k !== (s.condiviso_con || null)) salva({ condiviso_con: k, linea_codice: k === 'linea' ? s.linea_codice || null : null, punti_condivisi: k ? !!s.punti_condivisi : false }); });
  su('[data-cd-linea]', b => salva({ linea_codice: b.dataset.cdLinea }));
  // nota 005: una persona dentro la Linea (lei e chi sta sotto); di nuovo, o il frontale, per tutta la Linea
  su('[data-parte]', b => {
    const frontale = (AG.frontali || []).some(f => f.partner_id === s.linea_codice) ? s.linea_codice : MB21Agenda.frontaleDi(AG.ramo.squadra, s.linea_codice, ST.utente.partner_id) || s.linea_codice;
    salva({ linea_codice: parteDopoTocco(frontale, s.linea_codice, b.dataset.parte) || frontale });
  });
  if (s.condiviso_con === 'linea' && AG.ramo === undefined) caricaRamoApp().then(() => { if (AG.ramo) ridisegna(); });   // la Mappa per l'albero, letta una volta
  su('[data-cd-punti]', b => salva({ punti_condivisi: b.dataset.cdPunti === '1' }));
  if (s.condiviso_con) mostraRisposte(blocco, 'spazio', s.id);
}
// i frontali dell'Admin (per «Una Linea»): si leggono una volta, dalla Mappa (`squadra`, chi ha come sponsor il suo codice)
async function caricaFrontali() {
  if (AG.frontali !== undefined || !eAdmin() || !ST.utente || !ST.utente.partner_id) return;
  const { data, error } = await dbq('frontali', supa.from('squadra').select('partner_id, nome').eq('sponsor_id', ST.utente.partner_id).order('nome'));
  // i nomi come nella Mappa, «Ignazio Fiorito» (il file Amway li ha «FIORITO, IGNAZIO», a volte in minuscolo; Ignazio 05/10)
  const leggibile = n => (typeof MB21Mappa !== 'undefined' ? MB21Mappa.nomeLeggibile(n) : n);
  AG.frontali = error || !Array.isArray(data) ? [] : data.map(f => ({ ...f, nome: leggibile(f.nome) })).sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

// Il Team e chi ha l'app, per «Senza l'app» nel modulo della serata (Ignazio 05/10 sera): due letture piccole, una volta per sessione, solo l'Admin
// quando sceglie Team o Linea. `AG.ramo` = { squadra: [{partner_id, sponsor_id, nome, telefono}], conApp: [codici Amway degli utenti attivi] }.
async function caricaRamoApp() {
  if (AG.ramo !== undefined || !eAdmin() || !ST.utente || !ST.utente.partner_id) return;
  AG.ramo = null;   // in lettura: non si rilegge se il modulo ridisegna
  const [sq, ut] = await Promise.all([
    dbq('squadra per l\'invito', supa.from('squadra').select('partner_id, sponsor_id, nome, telefono')),
    dbq('utenti con l\'app', supa.from('utenti').select('partner_id').not('partner_id', 'is', null).is('eliminato_il', null).eq('accesso_attivo', true)),
  ]);
  AG.ramo = sq.error || ut.error || !Array.isArray(sq.data) || !Array.isArray(ut.data) ? undefined
    : { squadra: sq.data, conApp: ut.data.map(u => u.partner_id) };
}
// Il dentro di un impegno (ospite, note, come contattarlo, esiti, comandi): lo stesso nell'elenco, quando la riga
// si apre, e nel foglio che sale dal basso toccando un blocco nella griglia (cantiere 37: un posto solo).
function extraEvento(e) {
  const A = MB21Agenda;
  const richiamo = e.tipo_azione === 'Contatto' && !!e.data_scelta;   // dato dalla coda: si guarda, non si chiude qui
  // «Fissa appuntamento» solo dopo PM Fissato / Appuntamento; un «Richiamare» si sposta (Ignazio 23/09: con «Fissa» nasceva
  // una seconda telefonata alla stessa persona lo stesso giorno). Sposta porta con sé anche il giorno in cui torna in coda.
  const fasi = richiamo ? [] : A.fasiPer(e.categoria, e.tipo_azione, e.modalita);
  // prima dell'appuntamento (ancora da fare, o un richiamo dalla coda): il promemoria del coach, «Ti eri detto…» (cantiere 42)
  const ricordo = richiamo || !e.esito ? ricordoHtml(e.contatto_id, e.contatti && e.contatti.nome) : '';
  // la prima telefonata a una persona mai chiamata: la riga di preparazione, la stessa della coda (cantiere 48)
  // … e prima di una Presentazione (Consulenza PRD) ancora da fare, il consiglio di prepararla (regola 4 del coach, nota Azioni 020)
  const prima = !richiamo && !e.esito && e.tipo_azione === 'Contatto' && (!e.modalita || e.modalita === 'Telefonata') ? preparaChiamataHtml(e.contatto_id) : richiamo ? '' : preparaPresentazioneHtml(e);
  // «Su cosa lavorate» solo se l'appuntamento non ha i punti da trattare (dal 05/10 i passi toccati sono già righe dei punti)
  const suCosa = !richiamo && Array.isArray(e.su_cosa) && e.su_cosa.length && !A.puntiDi(e).length ? `<div class="note-ev">Su cosa lavorate: ${esc(e.su_cosa.map(A.nomePasso).join(' · '))}</div>` : '';
  return `${ricordo}${prima}${suCosa}${e.ospite ? `<div class="note-ev">Ospite: ${esc(e.ospite)}</div>` : ''}
      ${e.note ? `<div class="note-ev">${testoConLink(e.note)}</div>` : ''}
      ${richiamo ? '' : puntiHtml(e, 'azioni')}
      ${richiamo ? '' : condivisioneAzioneHtml(e)}
      ${contattaHtml(e.contatti && e.contatti.telefono)}
      ${richiamo ? `<div class="note-ev">Dalla coda: ${esc(e.esito || '')}</div>`
        : fasi.length ? bloccoEsiti(e, e.contatti ? e.contatti.categoria : null)
        : `<div class="note-ev">Nessun esito previsto per ${esc(e.categoria || 'questa categoria')} · ${esc(e.tipo_azione)}</div>`}
      <div class="ag-comandi">
        ${richiamo && e.esito !== 'Richiamare' ? `<button data-cmd="fissa">${ic('piu')} Fissa appuntamento</button>` : `<button data-cmd="sposta">${ic('orario')} Sposta</button>`}<button data-cmd="modifica">${ic('modifica')} Modifica</button>
        <button data-cmd="contatto">${ic('persona')} Apri contatto</button>
        ${richiamo ? '' : `<button data-cmd="elimina" class="pericolo">Elimina</button>`}
      </div>`;
}

function eventoAgenda(e, opz) {
  const A = MB21Agenda;
  const r = A.riga(e, opz);
  const aperta = AG.aperta === e.id;
  const [inizio, fine] = A.orario(e).split('–');
  const extra = aperta ? `<div class="extra">${extraEvento(e)}</div>` : '';
  return `<div class="ag-evento" data-evento="${esc(e.id)}">
    <div class="ora">${esc(inizio)}${fine ? `<small>${esc(fine)}</small>` : ''}</div>
    <div class="barra-tipo ${classeCat(e.contatti && e.contatti.categoria)}"></div>
    <div class="dentro"><button class="apri"><div class="t">${esc(r.titolo)}</div><div class="s">${escIcone(r.sotto)}</div>${e.portatoNome ? `<div class="s">${rigaPortato(e.portatoNome)}</div>` : ''}</button>${extra}</div>
  </div>`;
}

// Il foglio che sale dal basso toccando un blocco nella griglia: dentro c'è esattamente quello che c'è
// nell'elenco quando la riga si apre. Dando un esito il foglio si toglie di mezzo e, se il passo dopo
// serve ancora (il PM «Fatto» che aspetta il risultato), si riapre da solo.
function foglioEvento(e) {
  const A = MB21Agenda;
  const opz = { mioId: vediTutti() ? null : visto().id, admin: eAdmin() };
  const r = A.riga(e, opz);
  const cat = (e.contatti && e.contatti.categoria) || e.categoria;
  const giorno = A.partiRoma(e.quando || e.inizio).giorno;
  const velo = document.createElement('div');
  velo.className = 'velo';
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  // toccando un esito il foglio sparisce subito: il resto del flusso (prossimo appuntamento, vendita…) trova la scena libera
  velo.addEventListener('click', ev => { if (ev.target.closest('[data-esito]')) velo.style.display = 'none'; }, true);
  // il foglio si ridisegna sul posto quando cambiano i punti da trattare (nota 026)
  const disegna = () => {
    velo.innerHTML = `<div class="foglio alto ${classeCat(cat)}">
      <div class="testa-foglio"><h3>${esc(r.titolo)}</h3><button id="fe-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
      <p>${esc(dataLunga(giorno))} · ${esc(A.orario(e))} · ${escIcone(r.sotto)}</p>
      ${extraEvento(e)}</div>`;
    velo.querySelector('#fe-x').onclick = chiudi;
    collegaComandiEvento(velo, e, async () => {
      chiudi();
      await apriAgenda(giorno);
      const agg = AG.azioni.find(x => x.id === e.id);   // se manca un passo (PM «Fatto» → risultato) si riapre
      if (agg && (A.daChiudere(agg) || FATTO_APERTO.has(e.id) || agg.esito === A.fattoDi(agg.tipo_azione))) foglioEvento({ ...agg, quando: e.quando });
    }, disegna);
  };
  disegna();
}

const dataLunga = g => new Date(g + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

// Esiti e comandi di un impegno: gli stessi nell'elenco e nel foglio della griglia. `dopo()` ridisegna chi l'ha aperto;
// `ridisegna()` (facoltativo) rifà solo il pezzo mostrato quando cambiano i punti da trattare (nell'elenco basta disegnaAgenda).
function collegaComandiEvento(el, e, dopo, ridisegna) {
  const A = MB21Agenda;
  const giorno = A.partiRoma(e.quando || e.inizio).giorno;
  collegaEsiti(el, e, { nome: e.contatti ? e.contatti.nome : '', categoria: e.contatti ? e.contatti.categoria : e.categoria }, dopo);
  collegaPunti(el, e, 'azioni', ridisegna || disegnaAgenda);
  collegaCondivisioneAzione(el, e, ridisegna || disegnaAgenda);
  el.querySelectorAll('[data-cmd]').forEach(b => {
    b.onclick = () => {
      const chiudiFoglio = () => { const v = b.closest('.velo'); if (v) v.remove(); };
      if (b.dataset.cmd === 'sposta') { chiudiFoglio(); return spostaAppuntamento(e, async g => { AG.aperta = e.id; await apriAgenda(g); }); }
      if (b.dataset.cmd === 'modifica') { chiudiFoglio(); return foglioAzione(e.id, { ritorno: null, dopo: () => apriAgenda() }); }
      if (b.dataset.cmd === 'elimina') { chiudiFoglio(); return eliminaAppuntamento(e); }
      if (b.dataset.cmd === 'contatto') { chiudiFoglio(); return apriContattoDa(e.contatto_id); }
      if (b.dataset.cmd === 'fissa') { chiudiFoglio(); return nuovoAppuntamento({ giorno, ora: A.partiRoma(e.quando).ora, contatto: { id: e.contatto_id, ...e.contatti }, saltaId: e.id }); }   // l'avviso «a quest'ora hai già» non conta il richiamo stesso
    };
  });
}

function collegaAgenda(eventi) {
  const A = MB21Agenda;
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('ag-oggi', () => apriAgenda(MB21Coda.oggiRoma()));
  su('ag-vedi-tutto', () => { AG.tutteLeCose = true; apriAgenda(AG.giorno); });
  su('ag-prima', () => apriAgenda(A.spostaGiorno(AG.giorno, -7)));
  su('ag-dopo', () => apriAgenda(A.spostaGiorno(AG.giorno, 7)));
  collegaPartnerSelect();
  su('ag-nuovo', () => (vediTutti() ? mostraToast('Con «Tutti» scegli prima il partner nel Partner Select') : nuovoAppuntamento({ giorno: AG.giorno })));
  app.querySelectorAll('.ag-impegni [data-spazio], .mb-crono [data-spazio]').forEach(b => { b.onclick = () => foglioSpazio(b.dataset.spazio); });
  app.querySelectorAll('.ag-impegni [data-ricevuto], .mb-crono [data-ricevuto]').forEach(b => { b.onclick = () => { const r = ricevutoDaChiave(b.dataset.ricevuto); if (r) foglioRicevuto(r); }; });
  su('ag-telefonate', () => { ST.tab = 'oggi'; mostraTab(); });
  su('ag-in-coda', codaDelGiorno);
  su('ag-riordini', () => { ST.tab = 'oggi'; ST.vaiA = 'riordini'; mostraTab(); });
  su('ag-passati', scegliPassato);
  su('ag-conferme', () => { ST.tab = 'oggi'; mostraTab(); });
  const scegli = document.getElementById('ag-scegli');
  if (scegli) scegli.onchange = () => { if (scegli.value) apriAgenda(scegli.value); };
  app.querySelectorAll('.ag-giorno').forEach(b => {
    b.onclick = () => { AG.aperta = null; AG.portato = null; apriAgenda(b.dataset.giorno); };
  });
  // La striscia dei giorni si scorre col dito: a sinistra la settimana dopo, a destra quella prima
  // (Ignazio 21/09: «non per forza cliccare solo le frecce»). Le frecce restano, per il computer.
  const striscia = app.querySelector('.ag-settimana');
  if (striscia) {
    let x0 = null, y0 = null, scorso = 0;
    striscia.addEventListener('touchstart', ev => { const t = ev.touches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    striscia.addEventListener('touchend', ev => {
      if (x0 == null) return;
      const t = ev.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      x0 = null;
      if (Math.abs(dx) < 45 || Math.abs(dy) > Math.abs(dx)) return;   // un tocco, o un dito che va su e giù: non è uno scorrimento
      scorso = Date.now();
      AG.aperta = null; AG.portato = null;
      apriAgenda(A.spostaGiorno(AG.giorno, dx < 0 ? 7 : -7));
    }, { passive: true });
    // dopo uno scorrimento il dito è partito da un giorno: quel tocco non deve aprirlo
    striscia.addEventListener('click', ev => { if (Date.now() - scorso < 400) { ev.preventDefault(); ev.stopPropagation(); } }, true);
    // Sul computer lo stesso gesto con due dita sul trackpad. Un gesto = una settimana: il trackpad continua
    // a mandare movimento per inerzia anche dopo che le dita si sono alzate, e prima scorreva via di settimane
    // (Ignazio 21/09). Quindi: ci vuole un movimento deciso, e finché gli eventi arrivano attaccati è sempre
    // lo stesso gesto, già usato. Si riparte quando il trackpad sta fermo un quarto di secondo.
    let quanto = 0, ultimoTocco = 0, giaUsato = false;
    striscia.addEventListener('wheel', ev => {
      if (Math.abs(ev.deltaX) <= Math.abs(ev.deltaY)) return;   // sta scorrendo la pagina su e giù
      ev.preventDefault();
      const adesso = Date.now();
      if (adesso - ultimoTocco > 250) { quanto = 0; giaUsato = false; }   // gesto nuovo
      ultimoTocco = adesso;
      if (giaUsato) return;                                              // la coda dello stesso gesto non conta
      quanto += ev.deltaX;
      if (Math.abs(quanto) < 140) return;
      giaUsato = true;
      AG.aperta = null; AG.portato = null;
      apriAgenda(A.spostaGiorno(AG.giorno, quanto > 0 ? 7 : -7));
    }, { passive: false });
  }
  su('ag-vai-ora', () => { AG.portato = null; portaInVista(true); });
  su('ag-menu', menuAgenda);
  su('ag-cronologia', () => foglioCronologia(eventi, { mioId: vediTutti() ? null : visto().id, admin: eAdmin() }));
  // la card degli impegni: una riga apre il foglio dell'impegno
  app.querySelectorAll('.ag-imp').forEach(b => {
    const e = eventi.find(x => x.id === b.dataset.evento);
    if (e) b.onclick = () => { AG.aperta = e.id; foglioEvento(e); };
  });
  collegaGriglia(app, eventi);
  // Vista settimana: un blocco porta al suo giorno e lo apre, una colonna vuota porta a quel giorno
  app.querySelectorAll('.ag-sev').forEach(b => {
    b.onclick = async () => {
      const g = b.dataset.giorno, id = b.dataset.evento;
      AG.vista = 'giorno'; AG.aperta = id; AG.portato = null;
      await apriAgenda(g);
      const e = AG.azioni.find(x => x.id === id);
      if (e) foglioEvento(A.eventiDelGiorno([e], g)[0] || e);
    };
  });
  app.querySelectorAll('[data-vai]').forEach(b => {
    b.onclick = () => { AG.vista = 'giorno'; AG.portato = null; AG.aperta = null; apriAgenda(b.dataset.vai); };
  });
  // Vista elenco: la riga si apre sul posto, come prima
  app.querySelectorAll('.ag-evento').forEach(el => {
    const e = eventi.find(x => x.id === el.dataset.evento);
    if (!e) return;
    el.querySelector('.apri').onclick = () => { AG.aperta = AG.aperta === e.id ? null : e.id; disegnaAgenda(); };
    collegaComandiEvento(el, e, () => apriAgenda());
  });
}

// ── «Modello appuntamenti settimanale» (Ignazio 27/09) ──────────────────────
// Gli spazi della settimana preparati prima, senza persona (tabella `spazi`, logica in spazi.js): «Prepara la settimana»
// nella vista Settimana chiede quanti Piani Marketing e quante Consulenze prodotti, poi per ognuno il giorno e l'ora libera;
// la SdS/OPEN si mette da sola il lunedì alle 21:30. Nella Timeline sono blocchi tratteggiati «da riempire» che si trascinano;
// toccandoli: «Metti un nome» (diventa l'appuntamento), «Cambia giorno e ora», «Togli». Il nome si mette anche dalla scheda:
// il foglio «Nuovo appuntamento» propone gli spazi liberi dello stesso tipo. Per ora solo l'Admin, come i Progetti.
// dal 28/09 per tutti (Ignazio: «dobbiamo pubblicare a tutti»); prima solo l'Admin. Con «Tutti» no: sono personali
const vediSpazi = () => typeof MB21Spazi !== 'undefined' && !vediTutti();
const spaziDelGiorno = g => (vediSpazi() ? MB21Spazi.delGiorno(AG.spazi, g) : []);
// Piani e Consulenze col colore del loro tipo; gli incontri di gruppo (SdS/OPEN, Team, LdS) col colore degli Appuntamenti
const coloreSpazio = tipo => (MB21Spazi.daRiempire(tipo) ? MB21Agenda.COLORI[tipo] : 'var(--az-appuntamento)');
// col nome della serata (Team e LdS, nota 022) sotto resta il tipo; senza nome come sempre
const sottoSpazio = s => (MB21Spazi.daRiempire(s.tipo) ? 'da riempire · tocca per mettere un nome' : MB21Spazi.titolo(s) !== MB21Spazi.nome(s.tipo) ? `${MB21Spazi.nome(s.tipo)} · ${MB21Spazi.TIPI[s.tipo].sotto}` : MB21Spazi.TIPI[s.tipo].sotto);
const giornoBreve = g => `${MB21Agenda.GIORNI_SETTIMANA[MB21Agenda.giornoSettimana(g) - 1]} ${Number(g.slice(8))}`;
// la riga nella card degli impegni e nell'elenco della settimana
function rigaSpazioHtml(s) {
  const o = MB21Spazi.orario(s);
  return `<button class="ag-imp sp-imp" data-spazio="${esc(s.id)}" style="--tinta:${coloreSpazio(s.tipo)}"><i></i><span>${esc(MB21Spazi.titolo(s))}<small>${esc(sottoSpazio(s))}</small></span><b>${o.ora}–${o.fine}</b></button>`;
}
// i blocchi della Timeline: come le cose da fare con l'ora (tratteggiati, si trascinano), ma col colore del tipo
function spaziComeBlocchi(g) {
  return spaziDelGiorno(g).map(s => ({ id: 'spazio-' + s.id, tipo_azione: 'Spazio', inizio: s.inizio, quando: s.inizio,
    fine: new Date(Date.parse(s.inizio) + (s.durata || 60) * 60000).toISOString(), testo: MB21Spazi.titolo(s), _spazio: s }));
}

async function preparaSettimana() {
  const S = MB21Spazi, A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const settimana = AG.settimana.slice(), giorni = settimana.filter(g => g >= oggi);
  if (!giorni.length) return mostraToast('Questa settimana è già passata: vai alla prossima con ›');
  const esistenti = (AG.spazi || []).filter(s => settimana.includes(S.orario(s).giorno));
  const sds = S.sdsDaMettere(settimana, esistenti, oggi) ? [{ giorno: settimana[S.SDS.giorno], ora: S.SDS.ora, durata: S.SDS.durata }] : [];
  // tipi: quelli aggiunti dal selettore «Aggiungi ▾» (Ignazio 27/09: «se no le scritte diventano tante»), nell'ordine scelto
  const st = { passo: 0, tipi: [], quanti: {}, scelti: [], aperto: null, menu: false, nomeAperto: null };
  const passi = () => ['quanti', ...st.tipi];
  const velo = document.createElement('div');
  velo.className = 'velo';
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  function oreDi(g) {
    const occ = S.occupati(g, A.eventiDelGiorno(AG.azioni, g), esistenti, [...st.scelti, ...sds]);
    return S.oreLibere(occ, { adesso: g === oggi ? A.inMinuti(A.partiRoma(new Date().toISOString()).ora) : null });
  }
  function disegna(errore) {
    const lista = passi(), p = lista[st.passo], ultimo = p !== 'quanti' && st.passo === lista.length - 1;
    let corpo;
    if (p === 'quanti') {
      const restano = S.DA_PREPARARE.filter(t => !st.tipi.includes(t));
      const gruppo = (titolo, tipi) => { const qui = tipi.filter(t => restano.includes(t)); return qui.length ? `<small>${titolo}</small>${qui.map(t => `<button type="button" data-tipo="${esc(t)}"><i style="--tinta:${coloreSpazio(t)}"></i>${esc(S.TIPI[t].plurale)}</button>`).join('')}` : ''; };
      corpo = `<p class="sp-domanda">Cosa vuoi fare questa settimana?</p>`
        + st.tipi.map(t => `<div class="campo sp-tipo"><label>${esc(S.TIPI[t].domanda)}<button type="button" class="sp-via" data-via="${esc(t)}" aria-label="Togli: ${esc(S.TIPI[t].plurale)}">${ic('chiudi')}</button></label><div class="ag-scelte" data-quanti="${esc(t)}">${
          Array.from({ length: S.TIPI[t].max }, (_, i) => i + 1).map(n => `<button type="button" data-n="${n}" class="${st.quanti[t] === n ? 'scelto' : ''}">${n}</button>`).join('')}</div></div>`).join('')
        + (restano.length ? `<button type="button" class="sp-aggiungi${st.menu ? ' aperto' : ''}" id="sp-aggiungi" aria-expanded="${st.menu}">${ic('piu')}<span>${st.tipi.length ? 'Aggiungi altro' : 'Aggiungi'}</span>${ic('freccia')}</button>
            ${st.menu ? `<div class="sp-menu">${gruppo('Con una persona', S.CON_PERSONA)}${gruppo('Di gruppo', S.DI_GRUPPO)}</div>` : ''}` : '')
        + (st.tipi.length ? '' : `<div class="vn-aiuto">Tocca «Aggiungi» e scegli: Piani Marketing, Consulenze prodotti, incontri di Team o LdS.</div>`)
        + (sds.length ? `<div class="vn-aiuto">La SdS/OPEN di lunedì alle 21:30 si aggiunge da sola. Se cambia giorno o ora, la sposti poi nella Timeline.</div>` : '');
    } else {
      const n = st.quanti[p], messi = st.scelti.filter(s => s.tipo === p).length;
      corpo = `<p class="sp-domanda">${esc(S.domandaGiorni(p, n))}</p>
        <div class="vn-aiuto">Tocca un giorno e scegli l'ora. Puoi metterne più di uno nello stesso giorno. Ognuno dura un'ora: se serve di più, lo allunghi poi nella Timeline.</div>
        ${giorni.map(g => {
          const miei = st.scelti.map((s, i) => ({ ...s, i })).filter(s => s.giorno === g && s.tipo === p);
          const ore = st.aperto === g ? oreDi(g) : null;
          return `<div class="sp-giorno${st.aperto === g ? ' aperto' : ''}"><button type="button" class="sp-g" data-g="${g}"><b>${esc(giornoBreve(g))}</b>${
            miei.length ? '' : `<small>${messi < n ? 'tocca per aggiungere' : ''}</small>`}</button>${
            miei.map(s => `<span class="sp-chip" style="--tinta:${coloreSpazio(p)}">${s.ora}${S.puoAvereNome(p) ? `<button type="button" class="sp-nome" data-nome-apri="${s.i}" aria-label="Nome della serata delle ${s.ora}">${S.pulisciNome(s.nome) ? esc(S.pulisciNome(s.nome)) : '＋ nome'}</button>` : ''}<button type="button" data-togli="${s.i}" aria-label="Togli quello delle ${s.ora}">${ic('chiudi')}</button></span>`).join('')}</div>
            ${miei.some(s => s.i === st.nomeAperto) ? `<div class="sp-nome-riga"><input data-nome-serata="${st.nomeAperto}" maxlength="${S.NOME_MAX}" autocomplete="off" placeholder="Nome della serata, tipologia, linea o squadra" value="${esc(st.scelti[st.nomeAperto].nome || '')}"><button type="button" data-nome-ok>Ok</button></div>` : ''}
            ${ore ? `<div class="sp-ore">${ore.length ? ore.map(o => `<button type="button" data-ora="${o}">${o}</button>`).join('') : '<small>Nessuna ora libera in questo giorno.</small>'}</div>` : ''}`;
        }).join('')}
        <p class="sp-conto${messi === n ? ' pieno' : ''}">${esc(S.conto(p, messi, n))}</p>`;
    }
    velo.innerHTML = `<div class="foglio alto mc sp-foglio">
      <div class="mc-testa"><span class="ts-pastiglia">${ic('scala-settimana')}</span><div><small>Prepara la settimana</small><b>Settimana ${A.numeroSettimana(settimana[0])}</b></div><button id="sp-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
      <div class="riquadro mc-g" style="margin-top:14px">${corpo}</div>
      <div class="errore" id="sp-errore">${errore ? esc(errore) : ''}</div>
      <div class="mc-fondo"><button class="link" id="sp-no">${st.passo ? 'Indietro' : 'Annulla'}</button><button class="primario" id="sp-si">${ultimo ? 'Crea gli spazi' : 'Avanti'}</button></div></div>`;
    velo.querySelector('#sp-x').onclick = chiudi;
    velo.querySelector('#sp-no').onclick = () => { if (!st.passo) return chiudi(); st.passo--; st.aperto = null; disegna(); };
    const agg = velo.querySelector('#sp-aggiungi');
    if (agg) agg.onclick = () => { st.menu = !st.menu; disegna(); };
    velo.querySelectorAll('[data-tipo]').forEach(b => { b.onclick = () => { st.tipi.push(b.dataset.tipo); st.quanti[b.dataset.tipo] = 1; st.menu = false; disegna(); }; });
    velo.querySelectorAll('[data-via]').forEach(b => { b.onclick = () => {
      const t = b.dataset.via;
      st.tipi = st.tipi.filter(x => x !== t); delete st.quanti[t]; st.scelti = st.scelti.filter(x => x.tipo !== t);
      disegna();
    }; });
    velo.querySelectorAll('[data-quanti] button').forEach(b => { b.onclick = () => {
      const t = b.parentElement.dataset.quanti;
      st.quanti[t] = Number(b.dataset.n);
      let troppi = st.scelti.filter(s => s.tipo === t).length - st.quanti[t];   // se si scende, si tolgono gli ultimi messi
      for (let i = st.scelti.length - 1; i >= 0 && troppi > 0; i--) if (st.scelti[i].tipo === t) { st.scelti.splice(i, 1); troppi--; }
      disegna();
    }; });
    velo.querySelectorAll('[data-g]').forEach(b => { b.onclick = () => {
      if (st.scelti.filter(s => s.tipo === p).length >= st.quanti[p] && st.aperto !== b.dataset.g) return disegna(`Li hai già messi tutti: per cambiarne uno, toglilo con la ×.`);
      st.aperto = st.aperto === b.dataset.g ? null : b.dataset.g; disegna();
    }; });
    velo.querySelectorAll('[data-ora]').forEach(b => { b.onclick = () => { st.scelti.push({ tipo: p, giorno: st.aperto, ora: b.dataset.ora, durata: S.DURATA }); st.aperto = null; disegna(); }; });
    velo.querySelectorAll('[data-togli]').forEach(b => { b.onclick = () => { st.scelti.splice(Number(b.dataset.togli), 1); st.nomeAperto = null; disegna(); }; });
    velo.querySelectorAll('[data-nome-apri]').forEach(b => { b.onclick = () => { const i = Number(b.dataset.nomeApri); st.nomeAperto = st.nomeAperto === i ? null : i; disegna(); const c = velo.querySelector('[data-nome-serata]'); if (c) c.focus(); }; });
    velo.querySelectorAll('[data-nome-serata]').forEach(inp => {
      inp.oninput = () => { st.scelti[Number(inp.dataset.nomeSerata)].nome = inp.value; };   // si ricorda senza ridisegnare (la tastiera resta)
      inp.onkeydown = ev => { if (ev.key === 'Enter') { ev.preventDefault(); st.nomeAperto = null; disegna(); } };
    });
    velo.querySelectorAll('[data-nome-ok]').forEach(b => { b.onclick = () => { st.nomeAperto = null; disegna(); }; });
    velo.querySelector('#sp-si').onclick = async () => {
      if (p === 'quanti' && lista.length === 1) return disegna('Tocca «Aggiungi» e scegli almeno un appuntamento o un incontro.');
      if (p !== 'quanti') {
        const mancano = st.quanti[p] - st.scelti.filter(s => s.tipo === p).length;
        if (mancano > 0) return disegna(S.manca(p, mancano));
      }
      if (!ultimo) { st.passo++; st.aperto = null; return disegna(); }
      const righe = S.righeNuove(visto().id, settimana, st.scelti, esistenti, oggi);
      if (!righe.length) return disegna('Tocca «Aggiungi» e scegli almeno un appuntamento o un incontro.');
      const btn = velo.querySelector('#sp-si');
      btn.disabled = true; btn.textContent = 'Salvo…';
      const { data, error } = await dbq('prepara la settimana', supa.from('spazi').insert(righe).select('id'));
      if (error) { btn.disabled = false; btn.textContent = 'Crea gli spazi'; return disegna('Non salvato: controlla la connessione e riprova.'); }
      chiudi();
      await apriAgenda(AG.giorno);
      mostraToast(`Settimana pronta: ${S.riassunto(righe)}`, async () => {
        await dbqAvvisa('annulla prepara', supa.from('spazi').delete().in('id', data.map(r => r.id)), 'Annullamento non riuscito: controlla la connessione e riprova.');
        await apriAgenda(AG.giorno);
      });
    };
  }
  disegna();
}

// Il foglio di uno spazio: mettere un nome (diventa l'appuntamento), cambiare giorno e ora, toglierlo.
// La SdS/OPEN non ha nome: «Questa settimana non c'è» la toglie e nel Modulo Core la settimana diventa «l'OPEN non c'era».
// Team e LdS (27/09): incontri di gruppo, senza persona: si spostano, si allungano, si tolgono; dal 04/10 (nota 022) hanno un nome della serata, facoltativo.
function foglioSpazio(id) {
  const S = MB21Spazi, A = MB21Agenda, s = (AG.spazi || []).find(x => x.id === id);
  if (!s) return;
  const o = S.orario(s), sds = s.tipo === 'SdS/OPEN', persona = S.daRiempire(s.tipo);
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio sp-foglio" style="--tinta:${coloreSpazio(s.tipo)}">
    <div class="testa-foglio"><h3>${esc(S.titolo(s))}${persona ? ' · da riempire' : ''}</h3><button id="sp-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <p>${esc(dataLunga(o.giorno))} · ${o.ora}–${o.fine}</p>
    <div class="vn-aiuto">${sds ? 'Serata di sponsorizzazione / OPEN: dice che questa settimana l\'OPEN c\'è. La tua presenza la segni in «Il mio giorno».'
      : persona ? 'Uno spazio tenuto libero per questo appuntamento. Quando fissi con qualcuno, metti qui il suo nome: diventa l\'appuntamento, collegato alla sua scheda.'
      : `${esc(S.TIPI[s.tipo].sotto)}${S.puoAvereNome(s.tipo) ? '. Puoi dargli il nome della serata (o la tipologia, la linea, la squadra)' : ': un incontro senza nome'}. Se dura di più, lo allunghi con «Cambia giorno e ora» o nella Timeline.`}</div>
    ${puntiHtml(s, 'spazi')}
    ${condivisioneSpazioHtml(s)}
    <div class="sp-comandi">${persona ? `<button class="primario" id="sp-nome">${ic('piu')} Metti un nome</button>` : ''}
      ${S.puoAvereNome(s.tipo) ? `<button class="primario" id="sp-serata">${ic(S.pulisciNome(s.nome) ? 'modifica' : 'piu')} ${S.pulisciNome(s.nome) ? 'Cambia il nome' : 'Metti il nome della serata'}</button>` : ''}
      <button id="sp-cambia">${ic('orario')} Cambia giorno e ora</button>
      <button class="link" id="sp-togli">${sds ? 'Questa settimana non c\'è' : persona ? 'Togli lo spazio' : 'Togli l\'incontro'}</button></div>
    <div id="sp-campi" hidden><div class="campo"><label>Giorno e ora</label><div class="ag-due-campi"><input id="sp-giorno" type="date" value="${o.giorno}"><input id="sp-ora" type="time" value="${o.ora}"></div></div>
      <div class="campo"><label>Durata</label>${pilloleDurata('sp-durata', o.durata, o.ora)}</div>
      <div class="mc-fondo"><button class="link" id="sp-annulla">Annulla</button><button class="primario" id="sp-salva">Salva</button></div></div></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#sp-x').onclick = chiudi;
  collegaPunti(velo, s, 'spazi', () => { chiudi(); foglioSpazio(id); });   // i punti della serata (nota 026): il foglio si riapre aggiornato
  collegaCondivisioneSpazio(velo, s, () => { chiudi(); foglioSpazio(id); });   // con chi la condivido (nota 027, solo l'Admin)
  const nome = velo.querySelector('#sp-nome');
  if (nome) nome.onclick = () => { chiudi(); nuovoAppuntamento({ giorno: o.giorno, ora: o.ora, tipo: s.tipo, durata: o.durata, spazio: s, titolo: S.nome(s.tipo), sottotitolo: `${dataLunga(o.giorno)} alle ${o.ora}: scrivi il nome di chi viene.` }); };
  const serata = velo.querySelector('#sp-serata');
  if (serata) serata.onclick = () => { chiudi(); foglioNomeSerata(s); };
  let durata = o.durata;
  velo.querySelector('#sp-cambia').onclick = () => { velo.querySelector('#sp-campi').hidden = false; velo.querySelector('.sp-comandi').hidden = true; };
  velo.querySelector('#sp-annulla').onclick = () => { velo.querySelector('#sp-campi').hidden = true; velo.querySelector('.sp-comandi').hidden = false; };
  collegaPilloleDurata(velo, 'sp-durata', () => velo.querySelector('#sp-ora').value, d => { durata = d; });
  velo.querySelector('#sp-salva').onclick = async () => {
    const g = velo.querySelector('#sp-giorno').value, ora = velo.querySelector('#sp-ora').value;
    if (!g || !ora) return mostraToast('Scegli il giorno e l\'ora');
    const inizio = A.isoDaRoma(g, ora.slice(0, 5));
    const { error } = await dbq('sposta spazio', supa.from('spazi').update({ inizio, durata }).eq('id', s.id));
    if (error) return mostraToast('Non salvato: riprova.');
    chiudi();
    await apriAgenda(g);
    mostraToast(`${S.titolo(s)}: ${giornoBreve(g).toLowerCase()} alle ${ora.slice(0, 5)}`);
  };
  velo.querySelector('#sp-togli').onclick = async () => {
    chiudi();
    const { error } = await dbq('togli spazio', supa.from('spazi').delete().eq('id', s.id));
    if (error) return mostraToast('Non tolto: riprova.');
    const lun = A.settimana(o.giorno)[0];
    const segnato = sds ? await segnaSenzaOpen(lun, true) : false;
    await apriAgenda(AG.giorno);
    const rimetti = async () => {
      const { error: eRimetti } = await dbqAvvisa('rimetti spazio', supa.from('spazi').insert({ id: s.id, user_id: s.user_id, tipo: s.tipo, inizio: s.inizio, durata: s.durata, ...(S.pulisciNome(s.nome) ? { nome: S.pulisciNome(s.nome) } : {}) }), 'Non rimesso: controlla la connessione e riprova.');
      if (segnato && !eRimetti) await segnaSenzaOpen(lun, false);
      await apriAgenda(AG.giorno);
    };
    mostraToast(sds ? (segnato ? 'Tolta: nel Modulo Core questa settimana «l\'OPEN non c\'era»' : 'Tolta. Nel Modulo Core non sono riuscito a segnarla: toccala lì.') : persona ? 'Spazio tolto' : 'Incontro tolto', rimetti);
  };
}

// Il nome della serata di un incontro di Team o LdS (nota 022, Ignazio 04/10): un foglio piccolo col solo campo, come «Metti un nome» dei PM.
// Vuoto = senza nome. Il nome si vede dove l'incontro compare; «Annulla» nell'avviso rimette quello di prima.
function foglioNomeSerata(s) {
  const S = MB21Spazi, o = S.orario(s), prima = S.pulisciNome(s.nome);
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio sp-foglio" style="--tinta:${coloreSpazio(s.tipo)}">
    <div class="testa-foglio"><h3>${esc(S.nome(s.tipo))}</h3><button id="sn-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <p>${esc(dataLunga(o.giorno))} · ${o.ora}–${o.fine}</p>
    <div class="campo"><label>Nome della serata <small>facoltativo</small></label>
      <input id="sn-nome" maxlength="${S.NOME_MAX}" autocomplete="off" placeholder="Il nome, la tipologia, la linea o la squadra" value="${esc(prima || '')}"></div>
    <div class="mc-fondo"><button class="link" id="sn-no">Annulla</button><button class="primario" id="sn-si">Salva</button></div></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#sn-x').onclick = chiudi;
  velo.querySelector('#sn-no').onclick = chiudi;
  const campo = velo.querySelector('#sn-nome');
  campo.focus();
  const salva = async () => {
    const nuovo = S.pulisciNome(campo.value);
    if (nuovo === prima) return chiudi();
    const { error } = await dbq('nome della serata', supa.from('spazi').update({ nome: nuovo }).eq('id', s.id));
    if (error) return mostraToast('Non salvato: controlla la connessione e riprova.');
    chiudi();
    await apriAgenda(AG.giorno);
    mostraToast(nuovo ? `${nuovo}: nome messo` : 'Nome tolto', async () => {
      await dbqAvvisa('annulla nome serata', supa.from('spazi').update({ nome: prima }).eq('id', s.id), 'Annullamento non riuscito: controlla la connessione e riprova.');
      await apriAgenda(AG.giorno);
    });
  };
  velo.querySelector('#sn-si').onclick = salva;
  campo.onkeydown = ev => { if (ev.key === 'Enter') salva(); };
}

// Nel Modulo Core (core_mese.dati.senza_open, i lunedì delle settimane senza OPEN): la settimana si segna, o si toglie il segno.
// Una settimana a cavallo di due mesi sta in tutti e due i moduli.
async function segnaSenzaOpen(lun, senza) {
  const A = MB21Agenda, dom = A.spostaGiorno(lun, 6);
  for (const mese of [...new Set([lun.slice(0, 7), dom.slice(0, 7)])]) {
    const r = await dbq('modulo core', supa.from('core_mese').select('dati').eq('user_id', visto().id).eq('mese', mese + '-01').maybeSingle());
    if (r.error) return false;
    const dati = (r.data && r.data.dati) || {}, lista = new Set(dati.senza_open || []);
    if (senza) lista.add(lun); else lista.delete(lun);
    dati.senza_open = [...lista].sort();
    const w = await dbq('modulo core', supa.from('core_mese').upsert({ user_id: visto().id, mese: mese + '-01', dati, aggiornato_il: new Date().toISOString() }, { onConflict: 'user_id,mese' }));
    if (w.error) return false;
  }
  return true;
}

// Per il foglio «Nuovo appuntamento» (anche dalla scheda del contatto): gli spazi liberi da qui a tre settimane
async function spaziLiberi() {
  if (!vediSpazi()) return [];
  const A = MB21Agenda, da = new Date().toISOString(), a = A.isoDaRoma(A.spostaGiorno(MB21Coda.oggiRoma(), 22), '00:00');
  const { data, error } = await dbq('spazi liberi', supa.from('spazi').select('*').eq('user_id', visto().id).in('tipo', MB21Spazi.CON_PERSONA).gte('inizio', da).lt('inizio', a).order('inizio'));
  return error ? [] : data || [];
}

// Prima si cerca la persona, poi si cambia pagina (cantiere 33 lavoro 3, Ignazio 19/09: «A»): se non è più nella lista
// (eliminata: lo storico di Report, Griglia PM e Agenda mostra ancora il suo nome) si resta dove si è, con un avviso.
// Prima l'app passava alla Lista e restava ferma su «Carico il contatto…».
async function apriContattoDa(id, ritorno) {
  if (!LS.righe.find(x => x.id === id)) {   // lista mai letta o senza questo contatto
    mostraToast('Apro la scheda…');
    try { [LS.righe] = await Promise.all([leggiLista(), LS.usoApp ? null : leggiUsoApp()]); segnaApp(); }
    catch (e) { return mostraToast('Contatto non caricato: riprova.'); }
    if (!LS.righe.find(x => x.id === id)) return mostraToast('Questa persona non è più nella lista: qui resta il lavoro fatto');
  }
  LS.ritorno = ritorno || null;   // 'report' / 'griglia' / 'oggi': la freccia della scheda torna lì
  ST.tab = 'lista';
  document.querySelectorAll('#tab button').forEach(b => b.classList.toggle('attiva', b.dataset.tab === 'lista'));
  apriScheda(id);
}

// Esito di un appuntamento (decisione C: poi si chiede sempre il prossimo, con «Salta»)

// MB21 · MB Plan (l'Agenda, cantiere 41): la pagina — foglio del giorno, Settimana, Mese, Periodo WES, Anno, modelli
// personali, cose da fare, Timeline, cerca, trascinamento. Spostata così com'era da index.html il 23/09/2026 (Ignazio:
// «ok procedi»), codice identico. Si carica prima dello script della pagina: solo definizioni e ascolti, che usano le
// funzioni di index.html (supa, dbq, esc, ic, mostraToast, versione…) soltanto quando partono.
// Le regole pure stanno in agenda.js (MB21Agenda), le prove in tools/banco/prova_agenda*.js.

// ── AGENDA (Fase 4) ──────────────────────────────────────
// Giornata a linea del tempo (brief Fase 4): striscia di 7 giorni, appuntamenti del giorno in ordine d'ora,
// telefonate del giorno, appuntamenti passati senza esito, [+] nuovo appuntamento. Logica pura in agenda.js.
// Appuntamenti = righe di `azioni` con tipo ≠ Contatto (per data inizio) + Contatti con data scelta (dalla coda).
const AG = { giorno: null, settimana: [], azioni: [], passati: [], aperta: null, telefonate: null, vista: null, portato: null, cose: [], modello: [], modelli: [] };


async function apriAgenda(giorno) {
  AG.giorno = giorno || AG.giorno || MB21Coda.oggiRoma();
  if (!AG.vista) AG.vista = vistaSalvata();   // cantiere 37: si riapre come l'hai lasciata
  if (!document.querySelector('.ag-settimana')) app.innerHTML = `<h1>MB Plan</h1><div class="vuoto">Carico MB Plan…</div>`;
  try { await caricaAgenda(); }
  catch (e) {
    console.error('[MB21] MB Plan', e);
    app.innerHTML = `<h1>MB Plan</h1><div class="avviso">Non riesco a caricare MB Plan. Controlla la connessione e riprova.<br><small>${esc(String(e && e.message || e))}</small></div>${versione()}`;
    return;
  }
  // se il disegno si rompe, la pagina lo dice invece di restare su «Carico…» (22/09: pagina ferma senza spiegazione)
  try { disegnaAgenda(); }
  catch (e) {
    console.error('[MB21] MB Plan disegno', e);
    app.innerHTML = `<h1>MB Plan</h1><div class="avviso">MB Plan non riesce a disegnare la pagina.<br><small>${esc(String(e && e.message || e))}</small></div>${versione()}`;
  }
}

async function caricaAgenda() {
  const A = MB21Agenda;
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
    dbq('agenda senza esito', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', ids).neq('tipo_azione', 'Contatto').eq('completata', false).lt('inizio', adesso).order('inizio', { ascending: false }).limit(50)),
  ];
  const conferme = AG.giorno === oggi ? Promise.all([caricaConferme(), caricaRiordini(oggi)]) : null;   // cantiere 29: stesso elenco del riquadro in Dashboard
  if (vediTutti()) { /* telefonate e rientri sono di un partner */ }
  else if (AG.giorno === oggi) richieste.push(dbq('stato di oggi', supa.rpc('stato_oggi', guardoAltri() ? { p_utente: visto().id } : {})));
  else if (AG.giorno > oggi) richieste.push(dbq('rientri del giorno', supa.from('contatti_coda').select('id', { count: 'exact', head: true }).eq('user_id', visto().id).eq('rientro_il', AG.giorno)));
  // Cose da fare (cantiere 41): quelle della settimana più tutte le non fatte del passato (si riportano a oggi).
  // Con «Tutti» niente: sono un foglio personale, non un elenco di squadra.
  const cose = vediTutti() ? null : dbq('cose da fare', supa.from('cose_da_fare').select('*, contatti(nome, categoria)').eq('user_id', visto().id)
    .or(`and(giorno.gte.${griglia0 < AG.settimana[0] ? griglia0 : AG.settimana[0]},giorno.lte.${griglia1 > AG.settimana[6] ? griglia1 : AG.settimana[6]}),and(giorno.lt.${oggi},fatto_il.is.null),and(core.not.is.null,giorno.gte.${AG.giorno.slice(0, 8)}01),scala.eq.mese,scala.eq.settimana,scala.eq.periodo,scala.eq.anno`));   // + le cose del mese e della settimana   // le spunte Core del mese vivono sul primo del mese
  const modello = vediTutti() ? null : dbq('modello del giorno', supa.from('modello_giorno').select('*').eq('user_id', visto().id));
  const modelli = vediTutti() ? null : dbq('modelli personali', supa.from('modelli').select('*').eq('user_id', visto().id).order('ordine'));
  // (le misure del Core non si leggono più qui: dal 22/09 il Core vive nel Check e nel Modulo Core del mese)
  const [app1, ric, pas, tel] = await Promise.all(richieste);
  await conferme;
  const [cd, md, mm] = await Promise.all([cose, modello, modelli]);
  for (const r of [app1, ric, pas, tel, cd, md, mm]) if (r && r.error) throw r.error;
  AG.azioni = MB21Agenda.senzaDoppioniCoda([...app1.data, ...ric.data]);
  AG.passati = pas.data;
  // il promemoria «Ti eri detto…» (cantiere 42) per gli impegni ancora da fare e i richiami dalla coda: si legge insieme al resto
  const ricordi = caricaRicordi([...AG.azioni, ...AG.passati].filter(e => !e.esito || (e.tipo_azione === 'Contatto' && e.data_scelta)).map(e => e.contatto_id));
  AG.cose = cd ? cd.data : [];
  AG.modello = md ? md.data : [];
  const w = await dbq('WES', supa.from('wes').select('data, giorno').order('data'));
  AG.wes = w.error ? [] : w.data;
  if (AG.vista === 'periodo') await caricaPeriodo();
  if (AG.vista === 'anno') { const y = AG.giorno.slice(0, 4); await caricaIntervallo(`${y}-01-01`, `${Number(y) + 1}-01-01`); }
  AG.modelli = mm ? mm.data : [];
  AG.misure = {};
  await caricaProgetti();
  await aggiungiPortatoDa([...AG.azioni, ...AG.passati]);
  AG.telefonate = !tel ? null : AG.giorno === oggi ? { oggi: true, ...tel.data } : { oggi: false, rientri: tel.count || 0 };
  await ricordi;
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
  if (t && t.oggi) voci.push(['ag-telefonate', 'telefonate', 'telefonate', `Contatti <b>${t.fatti_oggi}/${t.contatti_al_giorno}</b>`]);
  else if (t && t.rientri) voci.push(['ag-telefonate', 'telefonate', 'telefonate', `<b>${t.rientri}</b> in coda`]);
  if (AG.giorno === oggi && RIO.righe.length) voci.push(['ag-riordini', 'riordini', 'riordini', `<b>${RIO.righe.length}</b> ${RIO.righe.length === 1 ? 'riordino' : 'riordini'}`]);
  if (AG.giorno === oggi && CONF.righe.length) voci.push(['ag-conferme', 'conferme', 'conferme', `<b>${CONF.righe.length}</b> ${CONF.righe.length === 1 ? 'conferma' : 'conferme'}`]);
  if (AG.passati.length) voci.push(['ag-passati', 'passati', 'attenzione', `<b>${AG.passati.length}</b> senza esito`]);
  if (!voci.length) return '';
  return `<div class="ag-rich">${voci.map(([id, tinta, icona, testo]) =>
    `<button id="${id}" class="${tinta}">${ic(icona)}<span>${testo}</span></button>`).join('')}</div>`;
}

// ── Le cose da fare del giorno (cantiere 41, lavoro 1): il foglio del giorno, come in NotePlan ──
// Cose non legate a una persona («comprare i biglietti BBS»), con la spunta e il «+». Chi decide cosa si
// vede in che giorno è MB21Agenda.coseDelGiorno: una cosa non fatta ieri si vede oggi con «da <giorno>».
// Due gruppi (lavoro 2): «Ogni giorno», le voci del modello che compaiono da sole, e «Oggi», le cose scritte a mano.
// La rotellina in testa apre il modello. Chi non ha ancora un modello vede l'invito a partire dalle abitudini Core N21.
// Il foglio del giorno formato NotePlan (Ignazio 22/09): titoli grandi e voci con il cerchietto. Sezioni: «Core»
// (le 7 abitudini N21, se abilitate: quelle misurabili si spuntano da sole da Check, azioni e vendite), poi le
// sezioni dell'utente (Routine…), poi «Da fare» con le cose scritte a mano e il campo per aggiungerne.
function foglioHtml(oggi) {
  const A = MB21Agenda;
  const voci = A.vociDelGiorno(AG.modello, AG.cose, AG.giorno, AG.misure);
  const cose = A.coseDelGiorno(AG.cose, AG.giorno, oggi);
  const gg = g => `${Number(g.slice(8))}/${Number(g.slice(5, 7))}`;
  const riga = (c, attr) => {
    const auto = !!c.stato;   // spunta dai numeri: non si tocca, dice quanto manca
    const sotto = [c.stato ? c.stato.testo : '', oraDurata(c) + (c.oraDelModello !== undefined ? ` (solo ${AG.giorno === oggi ? 'oggi' : 'questo giorno'}${c.oraDelModello ? `, di solito ${String(c.oraDelModello).slice(0, 5)}` : ''})` : ''), c.contatti && c.contatti.nome ? '👤 ' + c.contatti.nome : '', nomeProgetto(c), c.diScala, c.riportata ? `da ${gg(c.riportata)}` : ''].filter(Boolean).join(' · ');
    return `<div class="cosa${c.fatto_il ? ' fatta' : ''}${auto ? ' auto' : ''}" ${attr}="${esc(c.id)}">
      <button class="spunta" aria-label="${auto ? 'Si spunta da sola' : c.fatto_il ? 'Fatta: rimetti da fare' : 'Fatta'}"${auto ? ' disabled' : ''}>${c.fatto_il ? ic('fatto') : ''}</button>
      <button class="testo"><span>${esc(c.testo)}</span>${sotto ? `<small>${esc(sotto)}</small>` : ''}</button>
    </div>`;
  };
  // Una sezione per ogni modello personale acceso: il titolo del modello prende il posto di «Da fare» (Ignazio 22/09);
  // dentro le voci del modello di quel giorno, le cose scritte a mano in quella sezione e il campo per aggiungerne.
  const campo = gid => `<form class="ag-cosa-nuova" data-gruppo="${gid || ''}"><input type="text" maxlength="200" placeholder="Aggiungi…" autocomplete="off"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>`;
  const attivi = AG.modelli.filter(m => m.attivo !== false && (m.scala || 'giorno') === 'giorno');   // gli altri stanno nel foglio della loro scala
  // Ogni sezione si chiude e si apre con la freccetta (Ignazio 23/09); da chiusa dice quante cose restano. La scelta si ricorda sul dispositivo.
  const chiuse = sezioniChiuse();
  const blocco = (chiave, titoloHtml, righe, restano, fondo) => {
    const chiusa = chiuse.includes(chiave);
    return `<section class="ag-sezione${chiusa ? ' chiusa' : ''}" data-sez="${esc(chiave)}"><h2 class="ag-sez"><button class="ag-sez-chiudi" data-chiudi-sez="${esc(chiave)}" aria-expanded="${!chiusa}" aria-label="${chiusa ? 'Apri' : 'Chiudi'} la sezione">${ic('freccia')}</button>${titoloHtml}${chiusa && restano ? `<small class="ag-sez-conto">${restano} da fare</small>` : ''}</h2>
      <div class="ag-sezione-dentro"${chiusa ? ' hidden' : ''}>${righe}${fondo}</div></section>`;
  };
  let h = '<div class="ag-foglio">' + scalaSopraHtml('settimana', oggi);
  for (const m of attivi) {
    const sueVoci = voci.filter(v => !v.core && v.modello_id === m.id), sueCose = cose.filter(c => c.gruppo_id === m.id);
    h += blocco('m-' + m.id, `<button class="ag-sez-modello" data-apri-modello="${esc(m.id)}" aria-label="Apri il modello ${esc(m.titolo)}">${m.icona ? ic(m.icona) : ''}${esc(m.titolo)}${ic('modifica')}</button>`,
      sueVoci.map(v => riga(v, 'data-voce')).join('') + sueCose.map(c => riga(c, 'data-cosa')).join(''), [...sueVoci, ...sueCose].filter(x => !x.fatto_il).length, campo(m.id));
  }
  // «Da fare oggi» (Ignazio 23/09): c'è sempre, con il suo campo, anche quando ci sono i modelli
  const libere = cose.filter(c => !c.gruppo_id || !attivi.some(m => m.id === c.gruppo_id));
  const nomeGiorno = AG.giorno === oggi ? 'oggi' : AG.giorno === MB21Agenda.spostaGiorno(oggi, 1) ? 'domani' : titoloGiorno(AG.giorno, oggi).toLowerCase();
  h += blocco('da-fare', `<span>Da fare ${esc(nomeGiorno)}</span>`, libere.map(c => riga(c, 'data-cosa')).join(''), libere.filter(c => !c.fatto_il).length, campo(null));
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
  const voci = (AG.modelli || []).filter(m => m.attivo !== false && m.scala === scala)
    .flatMap(m => A.vociDelGiorno(AG.modello.filter(v => v.modello_id === m.id), AG.cose, inizio, {}));
  const restano = cose.filter(c => !c.fatto_il).length + voci.filter(v => !v.fatto_il).length;
  const chiave = 'su-' + scala, aperta = sezioniChiuse().includes(chiave);   // qui la chiave salvata vuol dire «aperta»
  const nome = scala === 'mese' ? A.titoloMese(inizio) : (() => {
    const g6 = A.spostaGiorno(inizio, 6), m = x => A.titoloMese(x).split(' ')[0].toLowerCase();
    return `Settimana ${A.numeroSettimana(inizio)} · ${Number(inizio.slice(8))}${inizio.slice(5, 7) === g6.slice(5, 7) ? '' : ' ' + m(inizio)}–${Number(g6.slice(8))} ${m(g6)}`;
  })();
  const riga = (x, attr, extra) => `<div class="cosa${x.fatto_il ? ' fatta' : ''}" ${attr}="${esc(x.id)}"${extra || ''}>
      <button class="spunta" aria-label="${x.fatto_il ? 'Fatta: rimetti da fare' : 'Fatta'}">${x.fatto_il ? ic('fatto') : ''}</button>
      <button class="testo"><span>${esc(x.testo)}</span>${x.riportata ? `<small>${scala === 'mese' ? 'dal mese prima' : `da sett. ${A.numeroSettimana(x.riportata)}`}</small>` : ''}</button></div>`;
  return `<section class="ag-sopra sc-${scala}${aperta ? ' aperta' : ''}">
    <button class="ag-sopra-testa" data-chiudi-sez="${chiave}" aria-expanded="${aperta}">${ic('freccia')}${ic(scala === 'mese' ? 'scala-mese' : 'scala-settimana')}<b>${esc(nome)}</b><small>${restano ? `${restano} da fare` : 'niente da fare'}</small></button>
    ${aperta ? `<div class="ag-sopra-dentro">
      ${voci.map(v => riga(v, 'data-voce', ` data-voce-giorno="${inizio}"`)).join('')}${cose.map(c => riga(c, 'data-cosa')).join('')}
      <form class="ag-cosa-nuova" data-gruppo="" data-scala="${scala}"><input type="text" maxlength="200" placeholder="Aggiungi ${scala === 'mese' ? 'al mese' : 'alla settimana'}…" autocomplete="off"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>
      <button class="link ag-sopra-apri" data-apri-scala="${scala}">Apri ${scala === 'mese' ? 'il Mese' : 'la Settimana'} ›</button></div>` : ''}
  </section>`;
}

// La card degli impegni del giorno, come NotePlan: una riga per impegno, pallino della categoria · titolo · orario a pastiglia.
function impegniHtml(eventi, opz) {
  const A = MB21Agenda;
  if (!eventi.length) return `<div class="ag-impegni vuota">Nessun impegno. Tocca <b>+</b> o apri la Timeline.</div>`;
  return `<div class="ag-impegni">${eventi.map(e => {
    const r = A.riga(e, opz), cat = (e.contatti && e.contatti.categoria) || e.categoria;
    return `<button class="ag-imp${e.completata ? ' fatta' : ''}" data-evento="${esc(e.id)}"><i class="${classeCat(cat)}"></i><span>${esc(r.titolo)}${e.portatoNome ? `<small>${rigaPortato(e.portatoNome)}</small>` : ''}</span><b>${esc(A.orario(e))}${e.confermato_il && !e.completata ? ' 👍' : ''}</b></button>`;
  }).join('')}</div>`;
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

function collegaCose(oggi) {
  const A = MB21Agenda;
  app.querySelectorAll('.ag-foglio .ag-cosa-nuova').forEach(form => {
    const campo = form.querySelector('input');
    form.onsubmit = async ev => {
      ev.preventDefault();
      const testo = A.testoCosa(campo.value);
      if (!testo) return;
      const gruppo = form.dataset.gruppo || null, scala = form.dataset.scala || 'giorno';
      const ordine = AG.cose.reduce((m, c) => Math.max(m, c.ordine || 0), 0) + 1;
      if (form.dataset.progetto) return nuovaRigaProgetto(form, campo.value, ordine);
      const { data, error } = await dbq('nuova cosa da fare', supa.from('cose_da_fare').insert({ user_id: visto().id, testo, giorno: inizioScalaMB(scala, AG.giorno), scala, ordine, gruppo_id: gruppo }).select().single());
      if (error) return;
      AG.cose.push(data);
      disegnaAgenda();
      const c2 = app.querySelector(`.ag-cosa-nuova[data-gruppo="${gruppo || ''}"]${scala !== 'giorno' ? `[data-scala="${scala}"]` : ''} input`);
      if (c2) c2.focus();   // si continua a scrivere la prossima, senza ritoccare il campo
    };
  });
  app.querySelectorAll('.ag-foglio .cosa[data-cosa]').forEach(riga => {
    const c = AG.cose.find(x => x.id === riga.dataset.cosa);
    if (!c) return;
    riga.querySelector('.spunta').onclick = () => spuntaCosa(c);
    riga.querySelector('.testo').onclick = () => foglioCosa(c, oggi);
  });
  // le voci del modello: la spunta vale per quel giorno (o per la settimana/il mese, se la voce è di quella scala);
  // il testo di una voce misurata dal Check apre il Check di oggi, le altre aprono il modello
  app.querySelectorAll('[data-chiudi-sez]').forEach(b => { b.onclick = () => cambiaSezione(b.dataset.chiudiSez); });
  app.querySelectorAll('[data-apri-scala]').forEach(b => { b.onclick = () => cambiaVista(b.dataset.apriScala); });
  // il titolo della sezione apre il suo modello (lì si cambiano titolo, icona e voci: Ignazio 23/09)
  app.querySelectorAll('[data-apri-modello]').forEach(b => { b.onclick = () => foglioModello(b.dataset.apriModello); });
  app.querySelectorAll('.ag-foglio .cosa[data-voce]').forEach(riga => {
    // la voce si cerca con il giorno giusto: per i modelli di settimana, mese, periodo e anno è l'inizio di quella scala
    const v = A.vociDelGiorno(AG.modello, AG.cose, riga.dataset.voceGiorno || AG.giorno, AG.misure).find(x => x.id === riga.dataset.voce);
    if (!v) return;
    riga.querySelector('.spunta').onclick = () => { if (!v.stato) spuntaVoce(v); };
    riga.querySelector('.testo').onclick = () => {
      if (v.stato && ['cd', 'pagine'].includes(v.core)) return AG.giorno === oggi ? apriCheck() : mostraToast('Il Check si compila per oggi');
      foglioModello(v.modello_id);
    };
  });
}

// La spunta di una voce del modello: una riga di cose_da_fare con modello_id (voce personale, quel giorno) oppure
// con core (abitudine Core a mano, nel primo giorno della sua scala: la settimana, il mese); togliendo la spunta la
// riga si cancella. Una voce non spuntata non si riporta: domani ha la sua.
async function spuntaVoce(v) {
  if (v.riga_id && v.oraDelModello !== undefined) {   // quel giorno ha un'ora sua: la riga resta, cambia solo la spunta
    const fatto_il = v.fatto_il ? null : new Date().toISOString();
    const { error } = await dbq('voce del giorno', supa.from('cose_da_fare').update({ fatto_il }).eq('id', v.riga_id));
    if (error) return;
    const r = AG.cose.find(c => c.id === v.riga_id); if (r) r.fatto_il = fatto_il;
    return disegnaAgenda();
  }
  if (v.spunta_id) {
    const { error } = await dbq('voce del giorno', supa.from('cose_da_fare').delete().eq('id', v.spunta_id));
    if (error) return;
    AG.cose = AG.cose.filter(c => c.id !== v.spunta_id);
    return disegnaAgenda();
  }
  const riga = { user_id: visto().id, testo: v.testo, giorno: v.giornoSpunta, scala: v.scala || 'giorno', fatto_il: new Date().toISOString(),
    ...(v.core ? { core: v.core } : { modello_id: v.id }) };
  // un semplice insert: l'upsert non funziona con gli indici unici «parziali» (con where) e il database rifiutava la spunta
  const { data, error } = await dbq('voce del giorno', supa.from('cose_da_fare').insert(riga).select().single());
  if (error) return;
  AG.cose = [...AG.cose.filter(c => c.id !== data.id), data];
  disegnaAgenda();
}

// I Modelli personali (Ignazio 22/09): ognuno si crea le sue routine o cose da fare con il + — un titolo e, volendo,
// un'icona. Il titolo diventa la sezione del foglio del giorno; le voci compaiono da sole nei giorni scelti.
const ICONE_MODELLO = ['fatto', 'orario', 'lampo', 'libro', 'audio', 'crescita', 'obiettivi', 'squadra', 'telefonate', 'persona', 'casa', 'perche', 'vendite', 'prodotti', 'liberta', 'complimenti'];
const NOMI_SCALA = { giorno: 'Giorno', settimana: 'Settimana', mese: 'Mese', periodo: 'Periodo WES', anno: 'Anno' };
function foglioTitoloModello(m, dopo) {
  let icona = (m && m.icona) || '', scala = (m && m.scala) || (AG.vista && AG.vista !== 'giorno' ? AG.vista : 'giorno');
  const velo = document.createElement('div');
  velo.className = 'velo';
  const disegna = () => {
    const t = velo.querySelector('#nm-titolo') ? velo.querySelector('#nm-titolo').value : ((m && m.titolo) || '');
    velo.innerHTML = `<div class="foglio"><h3>${m ? 'Titolo e icona' : 'Nuovo modello'}${esc(aNome())}</h3>
      <p>Per esempio «Routine del mattino», «Inizio mese», «Business». Il titolo è la sezione del foglio in cui compare.</p>
      <div class="campo"><label>Titolo <small>Obbligatorio</small></label><input id="nm-titolo" maxlength="40" value="${esc(t)}"></div>
      <div class="campo"><label>Icona <small>facoltativa</small></label>
        <div class="nm-icone"><button data-icona="" class="${icona ? '' : 'scelto'}">—</button>${ICONE_MODELLO.map(n => `<button data-icona="${n}" class="${icona === n ? 'scelto' : ''}" aria-label="${n}">${ic(n)}</button>`).join('')}</div></div>
      <div class="campo"><label>Dove compare</label>
        <div class="ag-scelte nm-scale">${Object.entries(NOMI_SCALA).map(([k, nome]) => `<button data-scala-modello="${k}" class="sc-${k}${scala === k ? ' scelto' : ''}">${ic(SCALE_MENU.find(x => x[0] === k)[2])} ${esc(nome)}</button>`).join('')}</div>
        <div class="vn-aiuto">Un modello del Mese compare in ogni mese, uno della Settimana in ogni settimana, e così via.</div></div>
      <button class="primario" id="nm-si">${m ? 'Salva' : 'Crea'}</button><button class="link" id="nm-no">Annulla</button></div>`;
    velo.querySelector('#nm-no').onclick = () => velo.remove();
    velo.querySelectorAll('[data-icona]').forEach(b => { b.onclick = () => { icona = b.dataset.icona; disegna(); }; });
    velo.querySelectorAll('[data-scala-modello]').forEach(b => { b.onclick = () => { scala = b.dataset.scalaModello; disegna(); }; });
    velo.querySelector('#nm-si').onclick = async () => {
      const titolo = String(velo.querySelector('#nm-titolo').value).replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!titolo) return mostraToast('Scrivi il titolo del modello');
      velo.remove();
      dopo({ titolo, icona: icona || null, scala });
    };
  };
  document.body.appendChild(velo);
  disegna();
  velo.onclick = ev => { if (ev.target === velo) velo.remove(); };
  const campo = velo.querySelector('#nm-titolo'); if (campo) campo.focus();
}
function nuovoModello() {
  foglioTitoloModello(null, async ({ titolo, icona, scala }) => {
    const ordine = AG.modelli.reduce((x, m) => Math.max(x, m.ordine || 0), 0) + 1;
    const { data, error } = await dbq('nuovo modello', supa.from('modelli').insert({ user_id: visto().id, titolo, icona, scala, ordine }).select().single());
    if (error) return;
    AG.modelli.push(data);
    disegnaAgenda();
    foglioModello(data.id);
  });
}

// ── PROGETTI, come le note di progetto di NotePlan (Ignazio 23/09; per ora solo l'Admin) ──
// Nel menu, sotto «Modelli personali», la sezione «Progetti» con il +. Un progetto = titolo e icona; dentro le righe:
// ☐ cose da fare (si spuntano; con un giorno compaiono anche in quel giorno di MB Plan e restano nel progetto),
// 1. elenco numerato, • elenco a puntini. Le righe sono `cose_da_fare` con `progetto_id` e `tipo`; senza giorno stanno solo qui.
const TIPI_RIGA = [['titolo', 'T Titolo'], ['cosa', '☐ Da fare'], ['numero', '1. Numerato'], ['punto', '• Puntini']];
const LIVELLO_MAX = 4;   // i rientri, come in Word: con Tab avanti, con Maiusc+Tab indietro (Ignazio 23/09)
const vediProgetti = () => typeof eAdmin === 'function' && eAdmin() && !vediTutti();
async function caricaProgetti() {
  if (!vediProgetti()) { AG.progetti = []; if (AG.vista === 'progetto') AG.vista = 'giorno'; return; }
  const [pr, rg] = await Promise.all([
    dbq('progetti', supa.from('progetti').select('*').eq('user_id', visto().id).order('ordine')),
    dbq('righe dei progetti', supa.from('cose_da_fare').select('*, contatti(nome, categoria)').eq('user_id', visto().id).not('progetto_id', 'is', null)),
  ]);
  AG.progetti = pr.error ? [] : pr.data;
  if (!rg.error) { const per = new Map(AG.cose.map(c => [c.id, c])); for (const r of rg.data) per.set(r.id, r); AG.cose = [...per.values()]; }
  if (AG.vista === 'progetto' && !AG.progetti.some(x => x.id === AG.progettoAperto)) AG.vista = 'giorno';
}
const righeProgetto = id => AG.cose.filter(c => c.progetto_id === id);
function contaProgetto(id) {
  // dal 23/09 sera si spuntano anche i numeri e i puntini: contano tutti i passi, non i titoli
  const cose = righeProgetto(id).filter(c => (c.tipo || 'cosa') !== 'titolo');
  return { tot: cose.length, fatte: cose.filter(c => c.fatto_il).length, righe: righeProgetto(id).length };
}
function nomeProgetto(c) {
  const pj = c.progetto_id && (AG.progetti || []).find(x => x.id === c.progetto_id);
  return pj ? '📁 ' + pj.titolo : '';
}
function progettiMenuHtml() {
  if (!vediProgetti()) return '';
  return `<div class="ag-lato-titolo mb-titolo-piu">Progetti<button data-cmd="nuovo-progetto" aria-label="Nuovo progetto">${ic('piu')}</button></div>
    ${AG.progetti.length ? AG.progetti.map(p => { const n = contaProgetto(p.id);
      return `<button data-progetto="${esc(p.id)}" class="${AG.vista === 'progetto' && AG.progettoAperto === p.id ? 'si' : ''}">${ic(p.icona || 'obiettivi')}<span>${esc(p.titolo)}</span><small>${n.tot ? `${n.fatte} di ${n.tot} fatte` : n.righe ? `${n.righe} righe` : 'vuoto'}</small></button>`; }).join('')
      : '<div class="mb-vuoto">Crea un progetto con il + e mettici le cose da fare</div>'}`;
}
function apriProgetto(id) { AG.vista = 'progetto'; AG.progettoAperto = id; AG.inserisciDopo = null; AG.aperta = null; AG.portato = null; apriAgenda(AG.giorno); }
function foglioProgetto(p, dopo) {
  let icona = (p && p.icona) || '';
  const velo = document.createElement('div');
  velo.className = 'velo';
  const disegna = () => {
    const t = velo.querySelector('#np-titolo') ? velo.querySelector('#np-titolo').value : ((p && p.titolo) || '');
    velo.innerHTML = `<div class="foglio"><h3>${p ? 'Il progetto' : 'Nuovo progetto'}${esc(aNome())}</h3>
      <p>Per esempio «Evento BBS di novembre», «Serata prodotti», «Squadra di Isabella». Dentro scrivi le cose da fare e gli elenchi.</p>
      <div class="campo"><label>Titolo <small>Obbligatorio</small></label><input id="np-titolo" maxlength="60" value="${esc(t)}"></div>
      <div class="campo"><label>Icona <small>facoltativa</small></label>
        <div class="nm-icone"><button data-icona="" class="${icona ? '' : 'scelto'}">—</button>${ICONE_MODELLO.map(n => `<button data-icona="${n}" class="${icona === n ? 'scelto' : ''}" aria-label="${n}">${ic(n)}</button>`).join('')}</div></div>
      <button class="primario" id="np-si">${p ? 'Salva' : 'Crea'}</button>
      ${p ? '<button class="link elimina-qui" id="np-elimina">Elimina il progetto</button>' : ''}
      <button class="link" id="np-no">Annulla</button></div>`;
    velo.querySelector('#np-no').onclick = () => velo.remove();
    velo.querySelectorAll('[data-icona]').forEach(b => { b.onclick = () => { icona = b.dataset.icona; disegna(); }; });
    velo.querySelector('#np-si').onclick = () => {
      const titolo = String(velo.querySelector('#np-titolo').value).replace(/\s+/g, ' ').trim().slice(0, 60);
      if (!titolo) return mostraToast('Scrivi il titolo del progetto');
      velo.remove();
      dopo({ titolo, icona: icona || null });
    };
    const el = velo.querySelector('#np-elimina');
    if (el) el.onclick = async () => {
      const si = await chiediConferma(`Eliminare «${p.titolo}»?`, 'Si cancellano anche tutte le sue righe, comprese quelle messe in un giorno di MB Plan.', 'Elimina', true);
      if (!si) return;
      const { error } = await dbq('elimina progetto', supa.from('progetti').delete().eq('id', p.id));
      if (error) return mostraToast('Non eliminato: riprova.');
      velo.remove();
      AG.progetti = AG.progetti.filter(x => x.id !== p.id);
      AG.cose = AG.cose.filter(c => c.progetto_id !== p.id);
      AG.vista = 'giorno';
      disegnaAgenda();
      mostraToast(`«${p.titolo}» eliminato`);
    };
  };
  document.body.appendChild(velo);
  disegna();
  velo.onclick = ev => { if (ev.target === velo) velo.remove(); };
  const campo = velo.querySelector('#np-titolo'); if (campo && !p) campo.focus();
}
function nuovoProgetto() {
  foglioProgetto(null, async ({ titolo, icona }) => {
    const ordine = AG.progetti.reduce((x, p) => Math.max(x, p.ordine || 0), 0) + 1;
    const { data, error } = await dbq('nuovo progetto', supa.from('progetti').insert({ user_id: visto().id, titolo, icona, ordine }).select().single());
    if (error) return mostraToast('Non salvato: riprova.');
    AG.progetti.push(data);
    apriProgetto(data.id);
  });
}
// Il tipo di una riga: scelto con i tre bottoni, oppure scritto all'inizio come in NotePlan («1. » numerato, «- » o «• »
// puntini, «[] » o «☐ » da fare). Toglie anche i segni di un testo copiato da altrove («## titolo», «**grassetto**»).
function rigaDaTesto(riga, livelloScelto) {
  const grezza = String(riga || '').replace(/ /g, ' ');
  // il rientro scritto all'inizio (testi incollati): un Tab o due spazi = un livello
  const inizio = (grezza.match(/^[\t ]*/) || [''])[0];
  let livello = (inizio.match(/\t/g) || []).length + Math.floor(inizio.replace(/\t/g, '').length / 2);
  let testo = grezza.trim(), tipo = AG.tipoRiga || 'cosa';
  if (/^#{1,6}\s+/.test(testo)) { tipo = 'titolo'; testo = testo.replace(/^#{1,6}\s+/, ''); livello = 0; }
  else if (/^\d+(\.\d+)+\.?\s+/.test(testo)) { tipo = 'numero'; livello = Math.max(livello, testo.match(/^[\d.]+/)[0].replace(/\.$/, '').split('.').length - 1); testo = testo.replace(/^\d+(\.\d+)+\.?\s+/, ''); }   // «1.2 » → secondo livello
  else if (/^\d+[.)]\s+/.test(testo)) { tipo = 'numero'; testo = testo.replace(/^\d+[.)]\s+/, ''); }
  else if (/^[-•*–◦▪]\s+/.test(testo)) { tipo = 'punto'; testo = testo.replace(/^[-•*–◦▪]\s+/, ''); }
  else if (/^(\[\s?\]|☐)\s*/.test(testo)) { tipo = 'cosa'; testo = testo.replace(/^(\[\s?\]|☐)\s*/, ''); }
  else if (!inizio && livelloScelto != null) livello = livelloScelto;
  testo = MB21Agenda.testoCosa(testo.replace(/\*\*/g, '').replace(/__/g, ''));
  return testo ? { tipo, testo, livello: tipo === 'titolo' ? 0 : Math.min(LIVELLO_MAX, livello) } : null;
}
// Incollare più righe insieme (Ignazio 23/09: «incollare l'elenco dei cantieri aperti»): ogni riga non vuota diventa una
// riga del progetto, nello stesso ordine, ognuna con il suo tipo (1. / - / [] all'inizio, se no il tipo scelto).
async function incollaRigheProgetto(progettoId, testo, dopoId, livelloBase) {
  // (x => …): con .map(rigaDaTesto) il numero della riga finiva nel rientro, e le righe semplici scendevano a scala
  const righe = String(testo || '').split(/\r?\n/).map(x => rigaDaTesto(x, livelloBase)).filter(Boolean).slice(0, 200);
  if (!righe.length) return;
  const n = await inserisciRighe(progettoId, dopoId || null, righe);
  if (n) mostraToast(`${n} ${n === 1 ? 'riga aggiunta' : 'righe aggiunte'} al progetto`);
}
// Inserire righe in un punto preciso del progetto (Ignazio 23/09: «inserire, alla fine della numerazione di un titolo,
// altri passi»): dopo la riga `dopoId` (vuoto = in fondo). Le righe del progetto si rinumerano 1…N nel nuovo ordine
// (si salvano solo quelle che cambiano), poi si inseriscono le nuove. Il campo resta aperto sotto l'ultima nuova.
async function inserisciRighe(progettoId, dopoId, righe) {
  const tutte = righeProgetto(progettoId).sort((x, y) => (x.ordine || 0) - (y.ordine || 0) || ((x.creato_il || '') < (y.creato_il || '') ? -1 : 1));
  const k = dopoId ? tutte.findIndex(c => c.id === dopoId) + 1 : tutte.length;
  const prima = tutte.slice(0, k), dopo = tutte.slice(k);
  const cambiate = [];
  dopo.forEach((c, i) => { const o = prima.length + righe.length + i + 1; if (c.ordine !== o) { c.ordine = o; cambiate.push(c); } });
  prima.forEach((c, i) => { if (c.ordine !== i + 1) { c.ordine = i + 1; cambiate.push(c); } });
  const nuove = righe.map((r, i) => ({ user_id: visto().id, testo: r.testo, tipo: r.tipo, livello: r.livello, giorno: null, scala: 'giorno', ordine: prima.length + i + 1, progetto_id: progettoId }));
  const esiti = await Promise.all(cambiate.map(c => dbq('ordine', supa.from('cose_da_fare').update({ ordine: c.ordine }).eq('id', c.id))));
  if (esiti.some(r => r.error)) { mostraToast('Non salvato: riprova.'); apriAgenda(AG.giorno); return 0; }
  const { data, error } = await dbq('righe del progetto', supa.from('cose_da_fare').insert(nuove).select());
  if (error) { mostraToast('Non salvato: riprova.'); return 0; }
  AG.cose.push(...data);
  if (dopoId) {   // si continua a scrivere sotto l'ultima riga nuova, con il suo rientro
    const ultima = data.sort((x, y) => x.ordine - y.ordine)[data.length - 1];
    AG.inserisciDopo = ultima.id; AG.livelloInline = ultima.tipo === 'titolo' ? 0 : ultima.livello || 0;
  }
  disegnaAgenda();
  const campo = app.querySelector(dopoId ? '.pj-inline input' : '.pj-nuova input'); if (campo) campo.focus();
  return data.length;
}
async function spuntaTitolo(passi, fatto) {
  if (!passi.length) return mostraToast('Il titolo non ha ancora passi sotto');
  const fatto_il = fatto ? null : new Date().toISOString();
  const cambiano = passi.filter(x => !!x.fatto_il !== !!fatto_il);
  const prima = cambiano.map(x => [x, x.fatto_il]);
  const { error } = await dbq('titolo', supa.from('cose_da_fare').update({ fatto_il }).in('id', cambiano.map(x => x.id)));
  if (error) return mostraToast('Non salvato: riprova.');
  cambiano.forEach(x => { x.fatto_il = fatto_il; });
  disegnaAgenda();
  if (fatto_il) mostraToast(`Titolo completato: ${cambiano.length} ${cambiano.length === 1 ? 'passo' : 'passi'} fatti`, async () => {
    const r = await Promise.all(prima.map(([x, v]) => dbq('titolo', supa.from('cose_da_fare').update({ fatto_il: v }).eq('id', x.id))));
    if (r.some(e => e.error)) return;
    prima.forEach(([x, v]) => { x.fatto_il = v; });
    disegnaAgenda();
  });
}
// Il campo in mezzo al progetto: si apre con «+ Aggiungi qui» in fondo a un titolo, o con «Aggiungi una riga sotto»
// nel foglio di una riga. Tipo e rientro partono da quelli della riga sopra (il titolo: dal tipo scelto, senza rientro).
function apriInserisci(dopoId) {
  const r = AG.cose.find(c => c.id === dopoId);
  AG.inserisciDopo = dopoId;
  AG.livelloInline = r && r.tipo !== 'titolo' ? r.livello || 0 : 0;
  AG.tipoInline = r && r.tipo !== 'titolo' ? r.tipo || 'cosa' : AG.tipoRiga || 'cosa';
  disegnaAgenda();
  const campo = app.querySelector('.pj-inline input'); if (campo) campo.focus();
}
async function nuovaRigaProgetto(form, valore, ordine) {
  const r = rigaDaTesto(valore, AG.livelloRiga || 0);
  if (!r) return;
  const { tipo, testo, livello } = r;
  const { data, error } = await dbq('riga del progetto', supa.from('cose_da_fare').insert({ user_id: visto().id, testo, giorno: null, scala: 'giorno', ordine, progetto_id: form.dataset.progetto, tipo, livello }).select().single());
  if (error) return mostraToast('Non salvato: riprova.');
  AG.cose.push(data);
  disegnaAgenda();
  const c2 = app.querySelector('.pj-nuova input'); if (c2) c2.focus();
}
function disegnaProgetto() {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const p = AG.progetti.find(x => x.id === AG.progettoAperto);
  if (!p) { AG.vista = 'giorno'; return disegnaAgenda(); }
  // come un foglio Word (Ignazio 23/09): l'ordine è quello scelto, le fatte restano al loro posto (grigie), rientri e titoli
  const righe = righeProgetto(p.id).sort((x, y) => (x.ordine || 0) - (y.ordine || 0) || ((x.creato_il || '') < (y.creato_il || '') ? -1 : 1));
  const segni = A.numeraRighe(righe);
  // un titolo è completato quando tutti i passi sotto di lui (fino al titolo dopo) sono fatti; un passo nuovo lo riapre
  const sottoTitolo = i => { const out = []; for (let k = i + 1; k < righe.length && righe[k].tipo !== 'titolo'; k++) out.push(righe[k]); return out; };
  const titoloFatto = i => { const r = sottoTitolo(i); return r.length > 0 && r.every(x => x.fatto_il); };
  // un titolo si chiude e si apre con la freccetta, come le sezioni del giorno (Ignazio 23/09); si ricorda sul dispositivo
  const chiuse = sezioniChiuse(), nascoste = new Set();
  righe.forEach((c, i) => { if (c.tipo === 'titolo' && chiuse.includes('pt-' + c.id)) sottoTitolo(i).forEach(x => nascoste.add(x.id)); });
  const n = contaProgetto(p.id);
  const quando = c => {
    if (!c.giorno) return '';
    const sc = c.scala || 'giorno';
    const g = sc === 'settimana' ? `settimana ${A.numeroSettimana(c.giorno)}` : sc === 'mese' ? A.titoloMese(c.giorno) : titoloGiorno(c.giorno, oggi);
    return '📅 ' + g + (c.ora ? ' · ' + String(c.ora).slice(0, 5) : '');
  };
  const inline = id => `<form class="ag-cosa-nuova pj-inline" data-dopo="${esc(id)}"><input type="text" maxlength="200" placeholder="Scrivi e premi Invio · Tab per il rientro · Esc per chiudere" autocomplete="off" style="padding-left:${(AG.livelloInline || 0) * 24}px"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>`;
  const dopoRiga = (c, i) => AG.inserisciDopo === c.id ? inline(c.id)
    : righe[i + 1] && righe[i + 1].tipo === 'titolo' && !nascoste.has(c.id) && !(c.tipo === 'titolo' && chiuse.includes('pt-' + c.id)) ? `<button type="button" class="pj-aggiungi" data-dopo="${esc(c.id)}">${ic('piu')} Aggiungi qui</button>` : '';
  const righeHtml = righe.map((c, i) => rigaHtml(c, i) + dopoRiga(c, i)).join('');
  function rigaHtml(c, i) {
    const tipo = c.tipo || 'cosa', rientro = `data-livello="${c.livello || 0}" style="padding-left:${(c.livello || 0) * 24}px"`;
    if (tipo === 'titolo') {
      const f = titoloFatto(i), chiuso = chiuse.includes('pt-' + c.id), passi = sottoTitolo(i), restano = passi.filter(x => !x.fatto_il).length;
      return `<div class="cosa pj-titolo${f ? ' fatta' : ''}${chiuso ? ' chiusa' : ''}" data-cosa="${esc(c.id)}"><button class="ag-sez-chiudi" data-chiudi-sez="pt-${esc(c.id)}" aria-expanded="${!chiuso}" aria-label="${chiuso ? 'Apri' : 'Chiudi'} il titolo">${ic('freccia')}</button><button class="spunta" aria-label="${f ? 'Titolo completato: riapri tutti i suoi passi' : 'Completa tutti i passi del titolo'}">${f ? ic('fatto') : ''}</button><button class="testo"><span>${esc(c.testo)}</span>${chiuso && passi.length ? `<small>${restano ? `${restano} da fare · ${passi.length} ${passi.length === 1 ? 'passo' : 'passi'}` : `tutti fatti · ${passi.length} ${passi.length === 1 ? 'passo' : 'passi'}`}</small>` : ''}</button></div>`;
    }
    const nascosta = nascoste.has(c.id) ? ' pj-nascosta' : '';
    if (tipo !== 'cosa') return `<div class="cosa pj-${tipo}${c.fatto_il ? ' fatta' : ''}${nascosta}" data-cosa="${esc(c.id)}" ${rientro}><button class="spunta segno" aria-label="${c.fatto_il ? 'Fatto: rimetti da fare' : 'Fatto'}">${esc(segni[i])}</button><button class="testo"><span>${esc(c.testo)}</span></button></div>`;
    const sotto = [quando(c), c.contatti && c.contatti.nome ? '👤 ' + c.contatti.nome : ''].filter(Boolean).join(' · ');
    return `<div class="cosa${c.fatto_il ? ' fatta' : ''}${nascosta}" data-cosa="${esc(c.id)}" ${rientro}><button class="spunta" aria-label="${c.fatto_il ? 'Fatta: rimetti da fare' : 'Fatta'}">${c.fatto_il ? ic('fatto') : ''}</button><button class="testo"><span>${esc(c.testo)}</span>${sotto ? `<small>${esc(sotto)}</small>` : ''}</button></div>`;
  }
  const tipoOra = AG.tipoRiga || 'cosa', livOra = AG.livelloRiga || 0;
  const html = testaScala(false) + `<div class="mm-testa pj-testa"><h1 class="ag-titolo sc-titolo">${ic(p.icona || 'obiettivi')}<button class="ag-mese mm-titolo" id="pj-titolo" aria-label="Titolo, icona, elimina">${esc(p.titolo)} ${ic('modifica')}</button></h1></div>
    ${n.tot ? `<div class="pj-conto"><span><b>${n.fatte} di ${n.tot}</b> passi fatti</span><div class="pw-traccia"><i style="width:${Math.round(n.fatte / n.tot * 100)}%"></i></div></div>` : ''}
    <div class="ag-foglio pj-foglio">${righeHtml || '<div class="mb-vuoto">Scrivi qui sotto la prima riga del progetto.</div>'}
      <form class="ag-cosa-nuova pj-nuova" data-gruppo="" data-progetto="${esc(p.id)}">
        <span class="pj-tipi">${TIPI_RIGA.map(([k, t]) => `<button type="button" data-tipo-riga="${k}" class="${tipoOra === k ? 'scelto' : ''}" aria-label="${t}">${t.split(' ')[0]}</button>`).join('')}</span>
        <span class="pj-tipi pj-rientri"><button type="button" data-rientro="-1" aria-label="Rientro indietro (Maiusc+Tab)">⇤</button><button type="button" data-rientro="1" aria-label="Rientro avanti (Tab)">⇥</button></span>
        <input type="text" maxlength="200" placeholder="Aggiungi una riga…" autocomplete="off" style="padding-left:${livOra * 24}px"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>
      <div class="vn-aiuto">T titolo · ☐ da fare · 1. numerato · • puntini. <b>Tab</b> (o ⇥) porta la riga avanti e la numera 1.1, <b>Maiusc+Tab</b> (o ⇤) la riporta indietro. Puoi anche <b>incollare un elenco</b>: ogni riga va al suo posto, con i suoi rientri. Una cosa da fare si mette in un giorno toccandola.</div>
    </div>`;
  montaScala(html);
  const t = document.getElementById('pj-titolo');
  if (t) t.onclick = () => foglioProgetto(p, async ({ titolo, icona }) => {
    const { error } = await dbq('progetto', supa.from('progetti').update({ titolo, icona }).eq('id', p.id));
    if (error) return mostraToast('Non salvato: riprova.');
    Object.assign(p, { titolo, icona });
    disegnaAgenda();
  });
  const campoNuova = app.querySelector('.pj-nuova input');
  const rientra = passo => {
    AG.livelloRiga = Math.max(0, Math.min(LIVELLO_MAX, (AG.livelloRiga || 0) + passo));
    if (campoNuova) { campoNuova.style.paddingLeft = AG.livelloRiga * 24 + 'px'; campoNuova.focus(); }
  };
  if (campoNuova) {
    // più righe incollate insieme: ognuna la sua riga (il campo da solo le metterebbe tutte su una riga)
    campoNuova.addEventListener('paste', ev => {
      const testo = ev.clipboardData && ev.clipboardData.getData('text');
      if (!testo || !/\n/.test(testo.trim())) return;   // una riga sola: incolla normale
      ev.preventDefault();
      incollaRigheProgetto(p.id, testo);
    });
    // Tab / Maiusc+Tab come in Word: il rientro della riga che si sta scrivendo
    campoNuova.addEventListener('keydown', ev => { if (ev.key === 'Tab') { ev.preventDefault(); rientra(ev.shiftKey ? -1 : 1); } });
  }
  app.querySelectorAll('[data-rientro]').forEach(b => { b.onclick = () => rientra(Number(b.dataset.rientro)); });
  // la spunta del titolo: completa (o riapre) tutti i passi del titolo in un colpo
  righe.forEach((c, i) => {
    if (c.tipo !== 'titolo') return;
    const b = app.querySelector(`.pj-titolo[data-cosa="${c.id}"] .spunta`);
    if (b) b.onclick = () => spuntaTitolo(sottoTitolo(i), titoloFatto(i));
  });
  app.querySelectorAll('.pj-aggiungi[data-dopo]').forEach(b => { b.onclick = () => apriInserisci(b.dataset.dopo); });
  const fi = app.querySelector('.pj-inline');
  if (fi) {
    const campo = fi.querySelector('input'), dopoId = fi.dataset.dopo;
    const chiudi = () => { AG.inserisciDopo = null; disegnaAgenda(); };
    fi.onsubmit = ev => {
      ev.preventDefault();
      const r = rigaDaTesto(campo.value, AG.livelloInline || 0);
      if (!r) return chiudi();
      if (!/^\s*(\d+[.)]|\d+(\.\d+)+|[-•*–◦▪]\s|\[|☐|#)/.test(campo.value)) r.tipo = AG.tipoInline || r.tipo;   // senza segno all'inizio: il tipo della riga sopra
      inserisciRighe(p.id, dopoId, [r]);
    };
    campo.addEventListener('keydown', ev => {
      if (ev.key === 'Tab') { ev.preventDefault(); AG.livelloInline = Math.max(0, Math.min(LIVELLO_MAX, (AG.livelloInline || 0) + (ev.shiftKey ? -1 : 1))); campo.style.paddingLeft = AG.livelloInline * 24 + 'px'; }
      else if (ev.key === 'Escape') chiudi();
    });
    campo.addEventListener('paste', ev => {
      const testo = ev.clipboardData && ev.clipboardData.getData('text');
      if (!testo || !/\n/.test(testo.trim())) return;
      ev.preventDefault();
      const righe = String(testo).split(/\r?\n/).map(x => rigaDaTesto(x, AG.livelloInline || 0)).filter(Boolean).slice(0, 200);
      if (righe.length) inserisciRighe(p.id, dopoId, righe);
    });
    campo.addEventListener('blur', () => { setTimeout(() => { if (AG.inserisciDopo === dopoId && !campo.value.trim() && document.activeElement !== campo && app.contains(campo)) chiudi(); }, 200); });
  }
  app.querySelectorAll('[data-tipo-riga]').forEach(b => { b.onclick = () => {
    AG.tipoRiga = b.dataset.tipoRiga;
    if (AG.tipoRiga === 'titolo') rientra(-LIVELLO_MAX);
    app.querySelectorAll('[data-tipo-riga]').forEach(x => x.classList.toggle('scelto', x === b));
    if (campoNuova) campoNuova.focus();
  }; });
}

// Un modello: titolo e icona, acceso/spento, le sue voci (ognuna con l'interruttore e i giorni), in fondo il campo per
// aggiungerne; «Elimina il modello» in basso. Le cose scritte a mano nella sua sezione restano, sotto «Da fare».
function foglioModello(id) {
  const A = MB21Agenda;
  const m = AG.modelli.find(x => x.id === id) || AG.modelli[0];
  if (!m) return nuovoModello();
  const velo = document.createElement('div');
  velo.className = 'velo';
  document.body.appendChild(velo);
  const chiudi = () => { velo.remove(); disegnaAgenda(); };
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  const salva = async (v, dopo) => {
    const { error } = await dbq('modello del giorno', supa.from('modello_giorno').update(dopo).eq('id', v.id));
    if (error) return mostraToast('Non salvato: riprova.');
    Object.assign(v, dopo);
    disegna();
  };
  const salvaModello = async dopo => {
    const { error } = await dbq('modello', supa.from('modelli').update(dopo).eq('id', m.id));
    if (error) return;
    Object.assign(m, dopo);
    disegna();
  };
  const aggiungi = async testo => {
    const ordine = AG.modello.reduce((x, v) => Math.max(x, v.ordine || 0), 0) + 1;
    const { data, error } = await dbq('modello del giorno', supa.from('modello_giorno')
      .insert({ user_id: visto().id, modello_id: m.id, testo, sezione: m.titolo.slice(0, 40), scala: m.scala || 'giorno', giorni: [], ordine }).select().single());
    if (error) return;
    AG.modello.push(data);
    disegna();
    const c = velo.querySelector('#fm-testo'); if (c) c.focus();
  };
  const disegna = () => {
    const voci = AG.modello.filter(v => v.modello_id === m.id).sort((x, y) => (x.ordine || 0) - (y.ordine || 0));
    velo.innerHTML = `<div class="foglio alto mod">
      <div class="testa-foglio"><h3>${m.icona ? ic(m.icona) + ' ' : ''}${esc(m.titolo)}${esc(aNome())} <button class="fm-matita" id="fm-matita" aria-label="Cambia titolo e icona">${ic('modifica')}</button></h3><button id="fm-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
      <div class="mod-voce${m.attivo === false ? ' spenta' : ''}"><button class="mod-int" id="fm-attivo" role="switch" aria-checked="${m.attivo !== false}"><i></i></button>
        <button class="mod-testo" id="fm-titolo"><span>${m.attivo === false ? 'Spento: non compare' : `Acceso: compare nel foglio ${{ giorno: 'del Giorno', settimana: 'della Settimana', mese: 'del Mese', periodo: 'del Periodo WES', anno: "dell'Anno" }[m.scala || 'giorno']}`}</span><small>Tocca qui per cambiare titolo e icona</small></button></div>
      <div class="ag-cose-gruppo">Le voci</div>
      ${voci.length ? voci.map(v => `<div class="mod-voce${v.attivo ? '' : ' spenta'}" data-voce="${esc(v.id)}">
        <button class="mod-int" role="switch" aria-checked="${v.attivo ? 'true' : 'false'}" aria-label="${v.attivo ? 'Accesa' : 'Spenta'}"><i></i></button>
        <button class="mod-testo"><span>${esc(v.testo)}</span><small>${esc((m.scala || 'giorno') === 'giorno' ? [A.testoGiorni(v.giorni), oraDurata(v)].filter(Boolean).join(' · ') : 'ogni ' + NOMI_SCALA[m.scala].toLowerCase())}</small></button>
      </div>`).join('') : '<div class="vuoto">Nessuna voce: scrivi qui sotto la prima.</div>'}
      <form class="ag-cosa-nuova" id="fm-nuova"><input type="text" id="fm-testo" maxlength="200" placeholder="Aggiungi una voce…" autocomplete="off"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>
      <div class="fc-comandi"><button class="link elimina-qui" id="fm-elimina">Elimina il modello</button><button class="link" id="fm-chiudi">Chiudi</button></div></div>`;
    velo.querySelector('#fm-x').onclick = chiudi;
    velo.querySelector('#fm-chiudi').onclick = chiudi;
    velo.querySelector('#fm-attivo').onclick = () => salvaModello({ attivo: m.attivo === false });
    velo.querySelector('#fm-titolo').onclick = () => foglioTitoloModello(m, salvaModello);
    velo.querySelector('#fm-matita').onclick = () => foglioTitoloModello(m, salvaModello);   // Ignazio 23/09: il titolo si cambia dalla matita
    velo.querySelector('#fm-nuova').onsubmit = ev => {
      ev.preventDefault();
      const testo = A.testoCosa(velo.querySelector('#fm-testo').value);
      if (testo) aggiungi(testo);
    };
    velo.querySelector('#fm-elimina').onclick = async () => {
      if (!(await chiediConferma(`Eliminare il modello «${m.titolo}»?`, 'Le sue voci spariscono dal foglio; le cose scritte a mano restano, sotto «Da fare».', 'Elimina', true))) return;
      const { error } = await dbq('elimina modello', supa.from('modelli').delete().eq('id', m.id));
      if (error) return;
      AG.modelli = AG.modelli.filter(x => x.id !== m.id);
      AG.modello = AG.modello.filter(v => v.modello_id !== m.id);
      for (const c of AG.cose) if (c.gruppo_id === m.id) c.gruppo_id = null;
      chiudi();
    };
    velo.querySelectorAll('.mod-voce[data-voce]').forEach(riga => {
      const v = AG.modello.find(x => x.id === riga.dataset.voce);
      if (!v) return;
      riga.querySelector('.mod-int').onclick = () => salva(v, { attivo: !v.attivo });
      riga.querySelector('.mod-testo').onclick = () => foglioVoceModello(v, salva, async () => {
        const { error } = await dbq('modello del giorno', supa.from('modello_giorno').delete().eq('id', v.id));
        if (error) return;
        AG.modello = AG.modello.filter(x => x.id !== v.id);
        AG.cose = AG.cose.filter(c => c.modello_id !== v.id);
        disegna();
      });
    });
  };
  disegna();
}

// Una voce del modello: il testo e i giorni in cui compare (Ogni giorno · Lun-Ven · Sab e Dom · a scelta).
function foglioVoceModello(v, salva, elimina) {
  const A = MB21Agenda;
  const delGiorno = ((AG.modelli.find(m => m.id === v.modello_id) || {}).scala || 'giorno') === 'giorno';
  let giorni = [...(v.giorni || [])], ora = v.ora ? String(v.ora).slice(0, 5) : '', durata = v.durata || 30;
  const velo = document.createElement('div');
  velo.className = 'velo';
  const disegna = () => {
    const tutti = !giorni.length;
    velo.innerHTML = `<div class="foglio"><h3>Voce del modello</h3>
      <div class="campo"><textarea id="fv-testo" rows="2" maxlength="200">${esc(v.testo)}</textarea></div>
      ${delGiorno ? `<div class="campo"><label>Quando compare</label>
        <div class="ag-scelte"><button data-preset="tutti" class="${tutti ? 'scelto' : ''}">Ogni giorno</button><button data-preset="lv" class="${giorni.join() === '1,2,3,4,5' ? 'scelto' : ''}">Lun-Ven</button><button data-preset="sd" class="${giorni.join() === '6,7' ? 'scelto' : ''}">Sab e Dom</button></div>
        <div class="ag-scelte fv-giorni">${A.GIORNI_SETTIMANA.map((g, i) => `<button data-giorno="${i + 1}" class="${!tutti && giorni.includes(i + 1) ? 'scelto' : ''}">${g}</button>`).join('')}</div></div>
      <div class="campo"><label>${ic('orario')} A che ora <small>facoltativo</small></label><input type="time" id="fv-ora" value="${esc(ora)}">
        ${pilloleDurata('fv-durate', durata, ora)}
        <div class="vn-aiuto">Con l'ora compare ogni giorno nella Timeline, tratteggiata. Senza ora resta solo nel foglio del giorno.</div></div>` : ''}
      <button class="primario" id="fv-salva">Salva</button>
      <div class="fc-comandi"><button class="link elimina-qui" id="fv-elimina">Elimina dal modello</button><button class="link" id="fv-no">Annulla</button></div></div>`;
    velo.querySelector('#fv-no').onclick = () => velo.remove();
    const campoOraV = velo.querySelector('#fv-ora');
    if (campoOraV) campoOraV.onchange = ev => { ora = ev.target.value; };
    collegaPilloleDurata(velo, 'fv-durate', () => velo.querySelector('#fv-ora').value, d => { durata = d; });
    velo.querySelectorAll('[data-preset]').forEach(b => { b.onclick = () => { giorni = b.dataset.preset === 'lv' ? [1, 2, 3, 4, 5] : b.dataset.preset === 'sd' ? [6, 7] : []; const t = velo.querySelector('#fv-testo').value; disegna(); velo.querySelector('#fv-testo').value = t; }; });
    velo.querySelectorAll('[data-giorno]').forEach(b => { b.onclick = () => {
      const n = Number(b.dataset.giorno);
      giorni = giorni.includes(n) ? giorni.filter(x => x !== n) : [...giorni, n].sort((a, c) => a - c);
      if (giorni.length === 7) giorni = [];
      const t = velo.querySelector('#fv-testo').value; disegna(); velo.querySelector('#fv-testo').value = t;
    }; });
    velo.querySelector('#fv-salva').onclick = async () => {
      const testo = A.testoCosa(velo.querySelector('#fv-testo').value);
      if (!testo) return mostraToast('Scrivi cosa c\'è da fare');
      const co = velo.querySelector('#fv-ora');
      if (!co) { await salva(v, { testo }); velo.remove(); return; }   // voce di un modello di settimana, mese, periodo o anno
      ora = co.value;
      await salva(v, { testo, giorni, ora: ora || null, durata: ora ? durata : null });
      velo.remove();
    };
    velo.querySelector('#fv-elimina').onclick = async () => {
      if (!(await chiediConferma(`Togliere «${v.testo}» dal modello?`, 'Le spunte dei giorni passati si cancellano.', 'Elimina', true))) return;
      await elimina();
      velo.remove();
    };
  };
  disegna();
  document.body.appendChild(velo);
  velo.onclick = ev => { if (ev.target === velo) velo.remove(); };
}

// Spuntare = fatta oggi (o nel giorno che stai guardando): una cosa riportata da ieri, spuntata, resta nel giorno in cui l'hai fatta.
// `opz.ridisegna` e `opz.giorno`: dalla scheda del contatto (23/09) si ridisegna la scheda, non MB Plan, e la fatta va su oggi
async function spuntaCosa(c, opz = {}) {
  const ridisegna = opz.ridisegna || disegnaAgenda;
  const prima = { fatto_il: c.fatto_il, giorno: c.giorno };
  const dopo = c.fatto_il ? { fatto_il: null } : { fatto_il: new Date().toISOString(), ...(c.progetto_id && !c.giorno ? {} : { giorno: inizioScalaMB(c.scala || 'giorno', opz.giorno || AG.giorno) }) };
  const { error } = await dbq('cosa da fare', supa.from('cose_da_fare').update(dopo).eq('id', c.id));
  if (error) return;
  Object.assign(c, dopo);
  ridisegna();
  if (dopo.fatto_il) mostraToast('Fatta ✓', async () => {
    const r = await dbq('cosa da fare', supa.from('cose_da_fare').update(prima).eq('id', c.id));
    if (r.error) return;
    Object.assign(c, prima);
    ridisegna();
  });
}

// Il foglio di una cosa da fare: si corregge il testo, si manda a domani, si elimina.
function foglioCosa(c, oggi, opz = {}) {
  const ridisegna = opz.ridisegna || disegnaAgenda;
  const A = MB21Agenda;
  // Settimana e Mese (Ignazio 23/09): si sceglie la settimana (o il mese) e, volendo, un giorno preciso dentro;
  // con il giorno la cosa diventa del Giorno (scala giorno), senza resta della settimana/del mese.
  const sposta = ['settimana', 'mese'].includes(c.scala) ? {
    inizio: c.riportata ? inizioScalaMB(c.scala, oggi) : c.giorno, giorno: null,
    giorni() { return c.scala === 'mese' ? Array.from({ length: 31 }, (_, i) => A.spostaGiorno(this.inizio, i)).filter(g => g.slice(0, 7) === this.inizio.slice(0, 7)) : Array.from({ length: 7 }, (_, i) => A.spostaGiorno(this.inizio, i)); },
    nome() {
      if (c.scala === 'mese') return A.titoloMese(this.inizio);
      const g = this.giorni(), m = x => A.titoloMese(x).split(' ')[0].toLowerCase();
      return `Settimana ${A.numeroSettimana(this.inizio)} · ${Number(g[0].slice(8))}${g[0].slice(5, 7) === g[6].slice(5, 7) ? '' : ' ' + m(g[0])}–${Number(g[6].slice(8))} ${m(g[6])}`;
    },
    quando() { return c.fatto_il ? `Fatta · ${this.nome()}` : c.scala === 'mese' ? `Da fare nel mese di ${A.titoloMese(this.inizio).toLowerCase()}` : `Da fare nella ${this.nome().replace('Settimana', 'settimana')}`; },
  } : null;
  // Le scorciatoie per spostare, come NotePlan (Ignazio 23/09): Oggi · Domani · Settimana prossima (· Mese prossimo);
  // un tocco sposta e chiude. «Settimana prossima» / «Mese prossimo» la fanno diventare una cosa di quella scala (senza ora).
  // Progetti (Ignazio 23/09): una riga di progetto può essere una cosa da fare (con o senza giorno), un punto numerato o a puntini
  const eCosa = (c.tipo || 'cosa') === 'cosa', pj = c.progetto_id ? (AG.progetti || []).find(x => x.id === c.progetto_id) : null;
  let tipoScelto = c.tipo || 'cosa', livelloScelto = c.livello || 0;
  const scalaC = c.scala || 'giorno', domaniG = A.spostaGiorno(oggi, 1);
  const settProssima = A.spostaGiorno(A.inizioScala('settimana', oggi), 7), meseProssimo = A.meseAccanto(oggi.slice(0, 8) + '01', 1);
  const rapide = c.fatto_il || !eCosa || !['giorno', 'settimana', 'mese'].includes(scalaC) ? [] : [
    ['oggi', 'Oggi', { scala: 'giorno', giorno: oggi }], ['domani', 'Domani', { scala: 'giorno', giorno: domaniG }],
    ['settimana', 'Settimana prossima', { scala: 'settimana', giorno: settProssima, ora: null, durata: null }],
    ['mese', 'Mese prossimo', { scala: 'mese', giorno: meseProssimo, ora: null, durata: null }],
  ].filter(([, , d]) => !(d.scala === scalaC && d.giorno === (c.riportata ? (scalaC === 'giorno' ? oggi : inizioScalaMB(scalaC, oggi)) : c.giorno)))
    .filter(([k]) => k !== 'mese' || scalaC === 'mese' || scalaC === 'settimana');
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `<div class="foglio"><h3>${eCosa ? 'Cosa da fare' : 'Riga del progetto'}${esc(aNome())}</h3>
    <div class="campo"><textarea id="fc-testo" rows="3" maxlength="200">${esc(c.testo)}</textarea></div>
    ${pj ? `<div class="campo"><label>${ic(pj.icona || 'obiettivi')} Progetto «${esc(pj.titolo)}» · tipo di riga</label><div class="ag-scelte" id="fc-tipo">${TIPI_RIGA.map(([k, t]) => `<button type="button" data-tipo="${k}" class="${tipoScelto === k ? 'scelto' : ''}">${t}</button>`).join('')}</div>
      <div class="fc-scala" style="margin-top:8px"><button type="button" class="freccia" id="fc-liv-meno" aria-label="Rientro indietro">⇤</button><b id="fc-liv"></b><button type="button" class="freccia" id="fc-liv-piu" aria-label="Rientro avanti">⇥</button></div></div>` : ''}
    <p class="fc-quando">${!c.giorno ? (eCosa ? 'Senza giorno: sta solo nel progetto. Dagli un giorno qui sotto e la trovi anche in MB Plan.' : '') : sposta ? esc(sposta.quando()) : c.riportata ? `Da fare dal ${esc(dataLunga(c.riportata))}, ancora aperta` : c.fatto_il ? `Fatta ${esc(dataLunga(c.giorno))}` : `Da fare ${esc(dataLunga(c.giorno))}`}</p>
    ${sposta ? `<div class="campo"><label>${ic(c.scala === 'mese' ? 'scala-mese' : 'scala-settimana')} ${c.scala === 'mese' ? 'Mese' : 'Settimana'}</label>
      <div class="fc-scala"><button type="button" class="freccia" id="fc-sc-prima" aria-label="Prima">‹</button><b id="fc-sc-nome"></b><button type="button" class="freccia" id="fc-sc-dopo" aria-label="Dopo">›</button></div>
      <label style="margin-top:10px">${ic('scala-giorno')} Giorno <small>facoltativo</small></label>
      ${c.scala === 'mese' ? '<input type="date" id="fc-sc-giorno">' : '<div class="ag-scelte" id="fc-sc-giorni"></div>'}
      <div class="vn-aiuto" id="fc-sc-aiuto"></div></div>` : ''}
    ${eCosa && (c.scala || 'giorno') === 'giorno' ? `<div class="campo"><label>${ic('orario')} Giorno e ora <small>l'ora è facoltativa</small></label>
      <div class="ag-due-campi"><input type="date" id="fc-giorno" value="${esc(c.riportata ? oggi : (c.giorno || ''))}"><input type="time" id="fc-ora" value="${esc(c.ora ? String(c.ora).slice(0, 5) : '')}"></div>
      ${pilloleDurata('fc-durate', c.durata || 30, c.ora ? String(c.ora).slice(0, 5) : '')}
      <div class="vn-aiuto">Occupa quell'ora nella Timeline, tratteggiata: non è un appuntamento e non conta da nessuna parte.${c.ora ? ' <button type="button" class="link" id="fc-togli-ora">Togli l\'ora</button>' : ''}${pj && c.giorno ? ' <button type="button" class="link" id="fc-togli-giorno">Togli dal giorno (resta nel progetto)</button>' : ''}</div></div>` : ''}
    ${opz.dallaScheda || !eCosa ? '' : `<div class="campo"><label>${ic('persona')} Persona <small>facoltativo</small></label>
      ${c.contatto_id ? `<div class="fc-persona"><button type="button" class="fc-chi" id="fc-apri-contatto">${ic('persona')} ${esc((c.contatti && c.contatti.nome) || 'Contatto')}</button><button type="button" class="link" id="fc-scollega">Togli</button></div>`
        : `<button type="button" class="link" id="fc-collega">${ic('piu')} Collega a un Prospect, Partner o Cliente</button>`}</div>`}
    ${rapide.length ? `<div class="campo"><label>${ic('agenda')} Sposta a <small>con un tocco</small></label><div class="ag-scelte" id="fc-rapide">${rapide.map(([k, t]) => `<button type="button" data-rapida="${k}">${t}</button>`).join('')}</div></div>` : ''}
    <button class="primario" id="fc-salva">Salva</button>
    ${pj && !opz.dallaScheda && AG.vista === 'progetto' ? `<button class="link" id="fc-sotto">${ic('piu')} Aggiungi una riga sotto</button>` : ''}
    <div class="fc-comandi">${c.fatto_il || ['giorno', 'settimana', 'mese'].includes(c.scala || 'giorno') ? '' : `<button class="link" id="fc-domani">${ic('agenda')} ${c.scala === 'mese' ? 'Sposta al mese dopo' : c.scala === 'settimana' ? 'Sposta alla settimana dopo' : c.scala === 'periodo' ? 'Sposta al periodo dopo' : c.scala === 'anno' ? "Sposta all'anno dopo" : 'Sposta a domani'}</button>`}
    <button class="link elimina-qui" id="fc-elimina">Elimina</button></div>
    <button class="link" id="fc-no">Annulla</button></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#fc-no').onclick = chiudi;
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
  // la persona (Ignazio 23/09): solo Prospect, Partner o Cliente; il nome apre la sua scheda
  const collega = velo.querySelector('#fc-collega');
  if (collega) collega.onclick = async () => {
    const x = await sceltaContatto('A chi si riferisce', '');
    if (!x) return;
    if (!['Prospect', 'Partner', 'Cliente'].includes(x.categoria)) return mostraToast('Si collega solo a un Prospect, Partner o Cliente');
    const { error } = await dbq('cosa da fare', supa.from('cose_da_fare').update({ contatto_id: x.id }).eq('id', c.id));
    if (error) return mostraToast('Non salvato: riprova.');
    c.contatto_id = x.id; c.contatti = { nome: x.nome, categoria: x.categoria };
    chiudi(); ridisegna(); foglioCosa(c, oggi, opz);
  };
  const scollega = velo.querySelector('#fc-scollega');
  if (scollega) scollega.onclick = async () => {
    const { error } = await dbq('cosa da fare', supa.from('cose_da_fare').update({ contatto_id: null }).eq('id', c.id));
    if (error) return mostraToast('Non salvato: riprova.');
    c.contatto_id = null; c.contatti = null;
    chiudi(); ridisegna(); foglioCosa(c, oggi, opz);
  };
  const apriC = velo.querySelector('#fc-apri-contatto');
  if (apriC) apriC.onclick = () => { chiudi(); apriContattoDa(c.contatto_id); };
  const togli = velo.querySelector('#fc-togli-ora');
  if (togli) togli.onclick = () => cambia({ ora: null, durata: null });
  velo.querySelector('#fc-salva').onclick = () => {
    const testo = A.testoCosa(velo.querySelector('#fc-testo').value);
    if (!testo) return mostraToast('Scrivi cosa c\'è da fare');
    const campoOra = velo.querySelector('#fc-ora'), campoGiorno = velo.querySelector('#fc-giorno');
    const dopo = { testo };
    if (pj && livelloScelto !== (c.livello || 0)) dopo.livello = tipoScelto === 'titolo' ? 0 : livelloScelto;
    if (pj && tipoScelto !== (c.tipo || 'cosa')) Object.assign(dopo, { tipo: tipoScelto }, tipoScelto === 'cosa' ? {} : { giorno: null, ora: null, durata: null }, tipoScelto === 'titolo' ? { livello: 0, fatto_il: null } : {});
    if (dopo.tipo && dopo.tipo !== 'cosa') return cambia(dopo);   // un punto dell'elenco non ha giorno né ora
    if (sposta) Object.assign(dopo, sposta.giorno ? { scala: 'giorno', giorno: sposta.giorno } : { giorno: sposta.inizio });
    if (campoOra && campoOra.value) {
      if (!campoGiorno.value || A.controllaGiorno(campoGiorno.value)) return mostraToast('Scegli il giorno');
      Object.assign(dopo, { ora: campoOra.value, durata, giorno: campoGiorno.value });
    } else if (campoGiorno && campoGiorno.value && campoGiorno.value !== (c.riportata ? oggi : c.giorno)) {
      // solo il giorno, senza ora (Ignazio 23/09: dal 29 al 24 e restava sul 29)
      if (A.controllaGiorno(campoGiorno.value)) return mostraToast('Scegli il giorno');
      dopo.giorno = campoGiorno.value;
    }
    cambia(dopo);
  };
  const livTesto = () => { const el = velo.querySelector('#fc-liv'); if (el) el.textContent = livelloScelto ? `Rientro ${livelloScelto}` : 'Senza rientro'; };
  livTesto();
  const livM = velo.querySelector('#fc-liv-meno'), livP = velo.querySelector('#fc-liv-piu');
  if (livM) livM.onclick = () => { livelloScelto = Math.max(0, livelloScelto - 1); livTesto(); };
  if (livP) livP.onclick = () => { livelloScelto = Math.min(LIVELLO_MAX, livelloScelto + 1); livTesto(); };
  velo.querySelectorAll('#fc-tipo [data-tipo]').forEach(b => { b.onclick = () => { tipoScelto = b.dataset.tipo; velo.querySelectorAll('#fc-tipo [data-tipo]').forEach(x => x.classList.toggle('scelto', x === b)); }; });
  const sotto = velo.querySelector('#fc-sotto'); if (sotto) sotto.onclick = () => { chiudi(); apriInserisci(c.id); };
  const togliG = velo.querySelector('#fc-togli-giorno'); if (togliG) togliG.onclick = () => cambia({ giorno: null, ora: null, durata: null, scala: 'giorno' });
  velo.querySelectorAll('#fc-rapide [data-rapida]').forEach(b => { b.onclick = () => cambia({ ...rapide.find(([k]) => k === b.dataset.rapida)[2] }); });
  const domani = velo.querySelector('#fc-domani');
  const pw = c.scala === 'periodo' ? A.periodoWesDi(c.riportata ? oggi : c.giorno, AG.wes) : null;
  if (domani && c.scala === 'periodo' && !(pw && pw.poi)) domani.remove();   // non c'è ancora il WES dopo: niente «periodo dopo»
  else if (domani && c.scala === 'periodo') domani.onclick = () => cambia({ giorno: pw.poi });
  else if (domani && c.scala === 'anno') domani.onclick = () => cambia({ giorno: `${Number((c.riportata ? oggi : c.giorno).slice(0, 4)) + 1}-01-01` });
  else if (domani) domani.onclick = () => cambia({ giorno: c.scala === 'mese' ? A.meseAccanto(c.riportata ? oggi.slice(0, 8) + '01' : c.giorno, 1)
    : c.scala === 'settimana' ? A.spostaGiorno(c.riportata ? A.inizioScala('settimana', oggi) : c.giorno, 7) : A.spostaGiorno(c.riportata ? oggi : c.giorno, 1) });
  velo.querySelector('#fc-elimina').onclick = async () => {
    const { error } = await dbq('cosa da fare', supa.from('cose_da_fare').delete().eq('id', c.id));
    if (error) return;
    AG.cose = AG.cose.filter(x => x.id !== c.id);
    chiudi();
    ridisegna();
  };
}

function disegnaAgenda() {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const eventi = A.eventiDelGiorno(AG.azioni, AG.giorno);
  const opz = { mioId: vediTutti() ? null : visto().id, admin: eAdmin() };   // con «Tutti» il nome del partner su ogni riga
  const punti = A.puntiGiorni(AG.azioni, AG.settimana);
  const conCose = giorniConCose(AG.cose, oggi);
  if (AG.vista === 'mese') return disegnaMese();
  if (AG.vista === 'settimana') return disegnaSettimana();
  if (AG.vista === 'periodo') return disegnaPeriodo();
  if (AG.vista === 'anno') return disegnaAnno();
  if (AG.vista === 'progetto') return disegnaProgetto();
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
    <div class="ag-foglio">${modelliScalaHtml('mese', mese0)}<h2 class="ag-sez">Da fare questo mese</h2>
      ${cose.map(c => `<div class="cosa${c.fatto_il ? ' fatta' : ''}" data-cosa="${esc(c.id)}">
        <button class="spunta" aria-label="${c.fatto_il ? 'Fatta: rimetti da fare' : 'Fatta'}">${c.fatto_il ? ic('fatto') : ''}</button>
        <button class="testo"><span>${esc(c.testo)}</span>${c.riportata ? `<small>da ${esc(nomeMese(c.riportata))}</small>` : ''}</button></div>`).join('')}
      <form class="ag-cosa-nuova" data-gruppo="" data-scala="mese"><input type="text" maxlength="200" placeholder="Aggiungi…" autocomplete="off"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>
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
      if (error || !data) break;
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
    const { data, error } = await dbq('cose da fare del periodo', supa.from('cose_da_fare').select('id, giorno, scala, fatto_il, modello_id').eq('user_id', visto().id).is('fatto_il', null).is('modello_id', null).gte('giorno', da).lt('giorno', a));
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
// I Modelli personali di una scala nel suo foglio (Ignazio 23/09, come NotePlan): «Inizio mese» in ogni Mese, ecc.
// La spunta di una voce vale per quel periodo: riga di cose_da_fare con modello_id e giorno = `inizio` della scala.
function modelliScalaHtml(scala, inizio) {
  const A = MB21Agenda;
  const suoi = (AG.modelli || []).filter(m => m.attivo !== false && m.scala === scala);
  if (!suoi.length) return '';
  const chiuse = sezioniChiuse();
  return suoi.map(m => {
    const voci = A.vociDelGiorno(AG.modello.filter(v => v.modello_id === m.id), AG.cose, inizio, {});
    const chiave = 'm-' + m.id, chiusa = chiuse.includes(chiave);
    return `<section class="ag-sezione${chiusa ? ' chiusa' : ''}" data-sez="${esc(chiave)}"><h2 class="ag-sez"><button class="ag-sez-chiudi" data-chiudi-sez="${esc(chiave)}" aria-expanded="${!chiusa}">${ic('freccia')}</button><button class="ag-sez-modello" data-apri-modello="${esc(m.id)}">${m.icona ? ic(m.icona) : ''}${esc(m.titolo)}${ic('modifica')}</button>${chiusa ? `<small class="ag-sez-conto">${voci.filter(v => !v.fatto_il).length} da fare</small>` : ''}</h2>
      <div class="ag-sezione-dentro"${chiusa ? ' hidden' : ''}>${voci.map(v => `<div class="cosa${v.fatto_il ? ' fatta' : ''}" data-voce="${esc(v.id)}" data-voce-giorno="${inizio}">
        <button class="spunta" aria-label="${v.fatto_il ? 'Fatta: rimetti da fare' : 'Fatta'}">${v.fatto_il ? ic('fatto') : ''}</button>
        <button class="testo"><span>${esc(v.testo)}</span></button></div>`).join('') || '<div class="mb-vuoto">Nessuna voce: aprilo dal titolo e aggiungine.</div>'}</div></section>`;
  }).join('');
}

// Il foglio con titolo e frecce, mesi piccoli e le cose da fare della scala: lo stesso per Periodo WES e Anno
function foglioScalaHtml({ testaHtml, titolo, prima, dopo, sopra, mesi, scala, titoloCose, cose, riportataDi, oggi }) {
  return `${testaHtml}<div class="mm-testa sc-${scala}"><button class="freccia" id="sc-prima" aria-label="Prima"${prima ? '' : ' disabled'}>‹</button><h1 class="ag-titolo sc-titolo">${ic(scala === 'periodo' ? 'biglietto' : 'scala-anno')}<button class="ag-mese mm-titolo">${esc(titolo)} ▾<input type="date" id="ag-scegli" value="${AG.giorno}"></button></h1><button class="freccia" id="sc-dopo" aria-label="Dopo"${dopo ? '' : ' disabled'}>›</button></div>
    ${partnerSelect()}${sopra || ''}${mesiMiniHtml(mesi, oggi)}
    <div class="ag-foglio">${modelliScalaHtml(scala, inizioScalaMB(scala, AG.giorno))}<h2 class="ag-sez">${esc(titoloCose)}</h2>
      ${cose.map(c => `<div class="cosa${c.fatto_il ? ' fatta' : ''}" data-cosa="${esc(c.id)}">
        <button class="spunta" aria-label="${c.fatto_il ? 'Fatta: rimetti da fare' : 'Fatta'}">${c.fatto_il ? ic('fatto') : ''}</button>
        <button class="testo"><span>${esc(c.testo)}</span>${c.riportata ? `<small>${esc(riportataDi(c.riportata))}</small>` : ''}</button></div>`).join('')}
      <form class="ag-cosa-nuova" data-gruppo="" data-scala="${scala}"><input type="text" maxlength="200" placeholder="Aggiungi…" autocomplete="off"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>
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
    const coseHtml = cose.map(c => `<span class="ss-riga ss-cosa${c.fatto_il ? ' fatta' : ''}"><i></i>${c.ora ? `<em>${esc(String(c.ora).slice(0, 5))}</em>` : ''}${esc(c.testo)}</span>`).join('');
    return `<button class="ss-g${g === oggi ? ' oggi' : ''}" data-apri="${g}"><span class="ss-data"><small>${A.GIORNI_SETTIMANA[i]}</small><b>${Number(g.slice(8))}</b></span>
      <span class="ss-ev">${ev.length ? ev.map(e => { const cat = (e.contatti && e.contatti.categoria) || e.categoria;
        return `<span class="ss-riga${e.completata ? ' fatta' : ''}"><i class="${classeCat(cat)}"></i><em>${esc(A.orario(e).split('–')[0])}</em>${esc(A.riga(e, opz).titolo)}</span>`; }).join('') : (cose.length ? '' : '<span class="ss-libera">giornata libera</span>')}${coseHtml}</span></button>`;
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
    <div class="ag-foglio">${scalaSopraHtml('mese', oggi)}${modelliScalaHtml('settimana', lun)}<h2 class="ag-sez">Da fare questa settimana</h2>
      ${cose.map(c => `<div class="cosa${c.fatto_il ? ' fatta' : ''}" data-cosa="${esc(c.id)}">
        <button class="spunta" aria-label="${c.fatto_il ? 'Fatta: rimetti da fare' : 'Fatta'}">${c.fatto_il ? ic('fatto') : ''}</button>
        <button class="testo"><span>${esc(c.testo)}</span>${c.riportata ? `<small>da sett. ${A.numeroSettimana(c.riportata)}</small>` : ''}</button></div>`).join('')}
      <form class="ag-cosa-nuova" data-gruppo="" data-scala="settimana"><input type="text" maxlength="200" placeholder="Aggiungi…" autocomplete="off"><button type="submit" aria-label="Aggiungi">${ic('piu')}</button></form>
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
  const voce = id.startsWith('voce-'), vero = id.replace(/^(cosa|voce)-/, '');
  if (voce) {
    // la voce del modello si sposta SOLO quel giorno (Ignazio 23/09): una riga di cose_da_fare con modello_id e l'ora del giorno;
    // il modello non si tocca (l'ora di tutti i giorni si cambia nel modello)
    const v = A.vociDelGiorno(AG.modello, AG.cose, AG.giorno, {}).find(y => y.id === vero);
    if (!v || String(v.ora || '').slice(0, 5) === ora) return ridisegnaDopoBlocco(velo);
    const r = v.riga_id
      ? await dbq('ora del giorno', supa.from('cose_da_fare').update({ ora, durata: v.durata || 30 }).eq('id', v.riga_id).select().single())
      : await dbq('ora del giorno', supa.from('cose_da_fare').insert({ user_id: visto().id, testo: v.testo, giorno: AG.giorno, scala: 'giorno', modello_id: v.id, ora, durata: v.durata || 30, fatto_il: null }).select().single());
    if (r.error) { mostraToast('Ora non salvata: riprova.'); return ridisegnaDopoBlocco(velo); }
    AG.cose = [...AG.cose.filter(c => c.id !== r.data.id), r.data];
    mostraToast(`${v.testo}: alle ${ora} solo ${AG.giorno === MB21Coda.oggiRoma() ? 'oggi' : dataLunga(AG.giorno)}. Il modello resta com'è.`);
    return ridisegnaDopoBlocco(velo);
  }
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
function righeTrascinabili(riga, attr, tutte) {
  const progetto = riga.parentElement.classList.contains('pj-foglio');   // nei progetti anche le fatte: restano al loro posto
  // `tutte`: per salvare l'ordine contano anche le righe nascoste dentro un titolo chiuso; mentre si trascina no
  return [...riga.parentElement.children].filter(x => x.classList.contains('cosa') && x.hasAttribute(attr) && (progetto || !x.classList.contains('fatta')) && !x.classList.contains('auto') && !x.classList.contains('al-seguito') && (tutte || !x.classList.contains('pj-nascosta')));
}
// Nei progetti una riga si porta dietro quello che le sta dentro (Ignazio 23/09: «se trascino un titolo, i punti che sono
// all'interno devono seguire il titolo»): un titolo tutte le righe fino al titolo dopo; una riga le righe più rientrate
// che la seguono. Mentre si trascina restano nascoste (la riga dice «+N»), al rilascio si rimettono subito sotto.
function figliDi(riga) {
  if (!riga.parentElement.classList.contains('pj-foglio')) return [];
  const titolo = riga.classList.contains('pj-titolo'), liv = Number(riga.dataset.livello || 0), figli = [];
  for (let x = riga.nextElementSibling; x && x.classList.contains('cosa'); x = x.nextElementSibling) {
    if (titolo ? x.classList.contains('pj-titolo') : Number(x.dataset.livello || 0) <= liv || x.classList.contains('pj-titolo')) break;
    figli.push(x);
  }
  return figli;
}
function iniziaTrascina() {
  TR.avviato = true;
  TR.figli = figliDi(TR.riga);
  TR.figli.forEach(x => x.classList.add('al-seguito'));
  if (TR.figli.length) TR.riga.setAttribute('data-seguito', '+' + TR.figli.length);
  TR.riga.classList.add('trascina');
  document.body.classList.add('sto-trascinando');
  try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
}
function muoviTrascina(y) {
  const altre = righeTrascinabili(TR.riga, TR.attr).filter(x => x !== TR.riga);
  const prima = altre.find(x => { const r = x.getBoundingClientRect(); return y < r.top + r.height / 2; });
  if (prima) { if (TR.riga.nextElementSibling !== prima) prima.before(TR.riga); }
  else if (altre.length) {
    // in fondo: dopo l'ultima riga di tutte, anche nascosta. Se l'ultima visibile è un titolo chiuso, i suoi passi nascosti
    // stanno sotto: lasciando subito dopo il titolo, la riga gli rubava i passi (Ignazio 23/09, Cantiere 41 sotto «Cantieri Vari»)
    const tutte = righeTrascinabili(TR.riga, TR.attr, true).filter(x => x !== TR.riga), ultima = tutte[tutte.length - 1];
    if (ultima.nextElementSibling !== TR.riga) ultima.after(TR.riga);
  }
}
async function fineTrascina() {
  clearTimeout(TR.timer);
  const { riga, attr, avviato } = TR;
  TR.riga = null; TR.avviato = false;
  document.body.classList.remove('sto-trascinando');
  if (!riga || !avviato) return;
  riga.classList.remove('trascina');
  // le righe al seguito tornano subito sotto la riga, nello stesso ordine
  let dopo = riga;
  for (const x of TR.figli || []) { dopo.after(x); x.classList.remove('al-seguito'); dopo = x; }
  riga.removeAttribute('data-seguito'); TR.figli = [];
  TR.dopoClic = Date.now();   // il clic che segue il rilascio non deve aprire il foglio
  const voce = attr === 'data-voce';
  const ids = righeTrascinabili(riga, attr, true).map(x => x.getAttribute(attr));
  const lista = voce ? AG.modello : AG.cose;
  const cambiate = [];
  ids.forEach((id, i) => { const x = lista.find(y => y.id === id); if (x && x.ordine !== i + 1) { x.ordine = i + 1; cambiate.push(x); } });
  if (!cambiate.length) return;
  const esiti = await Promise.all(cambiate.map(x => dbq('ordine', supa.from(voce ? 'modello_giorno' : 'cose_da_fare').update({ ordine: x.ordine }).eq('id', x.id))));
  if (esiti.some(r => r.error)) { mostraToast('Ordine non salvato: riprova.'); return apriAgenda(AG.giorno); }
  disegnaAgenda();
}
function rigaDa(ev) {
  if (typeof ST === 'undefined' || ST.tab !== 'agenda' || document.querySelector('.velo')) return null;
  const riga = ev.target.closest && ev.target.closest('.ag-foglio .cosa');
  if (!riga || ev.target.closest('.spunta')) return null;
  const attr = riga.hasAttribute('data-cosa') ? 'data-cosa' : riga.hasAttribute('data-voce') ? 'data-voce' : null;
  if (!attr || (riga.classList.contains('fatta') && !riga.parentElement.classList.contains('pj-foglio')) || riga.classList.contains('auto') || righeTrascinabili(riga, attr).length < 2) return null;
  return { riga, attr };
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
async function cercaMB(testo, box, chiudi) {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma(), adesso = new Date().toISOString();
  const t = String(testo || '').replace(/[,()*%\\]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^piani\b/i, 'piano');
  const giro = ++CERCA_GIRO;
  if (t.length < 2) { box.innerHTML = ''; return; }
  box.innerHTML = '<div class="mb-vuoto">Cerco…</div>';
  const ids = idVisti();
  const [perNome, perTipo, cose] = await Promise.all([
    dbq('cerca per nome', supa.from('azioni').select('*, contatti!inner(nome, categoria, telefono), utenti(nome, nome_cognome)').in('user_id', ids).ilike('contatti.nome', `%${t}%`).order('inizio', { ascending: false }).limit(60)),
    dbq('cerca per tipo', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', ids).or(`tipo_azione.ilike.*${t}*,modalita.ilike.*${t}*,esito.ilike.*${t}*`).order('inizio', { ascending: false }).limit(60)),
    dbq('cerca nelle cose da fare', supa.from('cose_da_fare').select('*').in('user_id', ids).is('core', null).is('modello_id', null).ilike('testo', `%${t}%`).order('giorno', { ascending: false }).limit(20)),
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
  const quandoCosa = c => !c.giorno ? `progetto «${(AG.progetti || []).find(x => x.id === c.progetto_id) ? AG.progetti.find(x => x.id === c.progetto_id).titolo : ''}»` : c.scala === 'mese' ? A.titoloMese(c.giorno) : c.scala === 'settimana' ? `settimana ${A.numeroSettimana(c.giorno)}` : titoloGiorno(c.giorno, oggi);
  const righe = elenco.map(a => {
    const p = A.partiRoma(a.quando), cat = (a.contatti && a.contatti.categoria) || a.categoria;
    return `<button class="mb-ris" data-giorno="${p.giorno}" data-evento="${esc(a.id)}"><i class="${classeCat(cat)}"></i><span><b>${esc(A.riga(a, opz).titolo)}</b><small>${esc(titoloGiorno(p.giorno, oggi))} · ${esc(p.ora)}${a.esito ? ' · ' + esc(a.esito) : ''}</small></span></button>`;
  }).join('') + (cose.data || []).map(c => `<button class="mb-ris cosa-r" data-cosa-giorno="${c.giorno || ''}" data-cosa-progetto="${esc(c.progetto_id || '')}" data-cosa-scala="${esc(c.scala || 'giorno')}"><i class="${c.fatto_il ? 'fatta' : ''}"></i><span><b>${esc(c.testo)}</b><small>Da fare · ${esc(quandoCosa(c))}${c.fatto_il ? ' · fatta' : ''}</small></span></button>`).join('');
  const quanti = elenco.length + (cose.data || []).length;
  box.innerHTML = quanti ? `<div class="mb-ris-conto">${tutti.length > 50 ? 'Primi 50 risultati: scrivi qualcosa di più preciso' : `${quanti} ${quanti === 1 ? 'risultato' : 'risultati'}`}</div>${righe}` : '<div class="mb-vuoto">Nessun risultato.</div>';
  box.querySelectorAll('.mb-ris[data-evento]').forEach(b => { b.onclick = async () => {
    chiudi();
    const g = b.dataset.giorno, id = b.dataset.evento;
    AG.vista = 'giorno'; AG.aperta = id; AG.portato = null;
    await apriAgenda(g);
    const e = AG.azioni.find(x => x.id === id);
    if (e) foglioEvento(A.eventiDelGiorno([e], g)[0] || e);
  }; });
  box.querySelectorAll('.mb-ris[data-cosa-giorno]').forEach(b => { b.onclick = () => {
    chiudi();
    if (!b.dataset.cosaGiorno && b.dataset.cosaProgetto) return apriProgetto(b.dataset.cosaProgetto);
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
    <div class="ag-lato-titolo mb-titolo-piu">Modelli personali<button data-cmd="nuovo-modello" aria-label="Nuovo modello">${ic('piu')}</button></div>
    ${AG.modelli.length ? AG.modelli.map(m => `<button data-modello="${esc(m.id)}" class="${m.attivo === false ? 'presto' : ''}">${ic(m.icona || 'fatto')}<span>${esc(m.titolo)}</span><small><i class="mb-scala-punto sc-${m.scala || 'giorno'}"></i>${esc(NOMI_SCALA[m.scala || 'giorno'])}${m.attivo === false ? ' · spento' : ` · ${AG.modello.filter(v => v.modello_id === m.id).length}`}</small></button>`).join('')
      : '<div class="mb-vuoto">Crea le tue routine o cose da fare con il +</div>'}
    ${progettiMenuHtml()}
    <button data-cmd="core" class="mb-core">${ic('crescita')}<span><b>Modulo Core N21</b><small>Le 7 abitudini di ${esc(MB21Agenda.titoloMese(AG.giorno).toLowerCase())}, già compilate dal Check</small></span></button>`;
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
  const nuovo = radice.querySelector('[data-cmd="nuovo-modello"]'); if (nuovo) nuovo.onclick = () => { chiudi(); nuovoModello(); };
  radice.querySelectorAll('[data-modello]').forEach(b => { b.onclick = () => { chiudi(); foglioModello(b.dataset.modello); }; });
  const core = radice.querySelector('[data-cmd="core"]'); if (core) core.onclick = () => { chiudi(); apriCoreMese(AG.giorno.slice(0, 7)); };
  const nuovoP = radice.querySelector('[data-cmd="nuovo-progetto"]'); if (nuovoP) nuovoP.onclick = () => { chiudi(); nuovoProgetto(); };
  radice.querySelectorAll('button[data-progetto]').forEach(b => { b.onclick = () => { chiudi(); apriProgetto(b.dataset.progetto); }; });
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
    if (c.fatto_il || c.modello_id || (c.scala && c.scala !== 'giorno')) continue;
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
    if (x) b.onclick = () => { if (prima) prima(); if (x._cosa.cosa) spuntaCosa(x._cosa.cosa); else spuntaVoce(x._cosa.voce); };
  });
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
  const cose = (AG.cose || []).filter(c => c.giorno === giorno && c.ora && !c.modello_id && !c.core && (c.scala || 'giorno') === 'giorno')
    .map(c => blocco('cosa-' + c.id, c.testo, c.ora, c.durata, !!c.fatto_il, { cosa: c }));
  const accesi = new Set((AG.modelli || []).filter(m => m.attivo !== false && (m.scala || 'giorno') === 'giorno').map(m => m.id));
  const voci = A.vociDelGiorno(AG.modello, AG.cose, giorno, {}).filter(v => !v.core && v.ora && accesi.has(v.modello_id))
    .map(v => blocco('voce-' + v.id, v.testo, v.ora, v.durata, !!v.fatto_il, { voce: v }));
  return [...cose, ...voci];
}
const oraDurata = x => x.ora ? `${String(x.ora).slice(0, 5)}${x.durata ? ` · ${x.durata >= 60 && x.durata % 60 === 0 ? x.durata / 60 + (x.durata === 60 ? ' ora' : ' ore') : x.durata + ' min'}` : ''}` : '';

function grigliaGiorno(eventi, opz) {
  const A = MB21Agenda, oggi = MB21Coda.oggiRoma();
  const blocchiCose = coseConOra(AG.giorno);
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
    if (e._cosa) {   // una cosa da fare con l'ora: tratteggiata, col cerchietto; il tocco la spunta
      h += `<button class="ag-ev ag-cosa${e.fatto ? ' fatta' : ''}${alto < 26 ? ' bassa' : ''}" data-cosa-blocco="${esc(e.id)}" aria-label="${esc(e.testo)}${e.fatto ? ', fatta' : ''}"
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
  const tutti = giorni.flatMap(x => x.d.blocchi);
  const { da, a } = A.oreUtili(tutti);
  const y = m => Math.round((m - da) / 60 * ALT_ORA_SETT);
  const quanti = giorni.reduce((n, x) => n + x.d.blocchi.length, 0);
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
  return `${ricordo}${e.ospite ? `<div class="note-ev">Ospite: ${esc(e.ospite)}</div>` : ''}
      ${e.note ? `<div class="note-ev">${esc(e.note)}</div>` : ''}
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
  velo.innerHTML = `<div class="foglio alto ${classeCat(cat)}">
    <div class="testa-foglio"><h3>${esc(r.titolo)}</h3><button id="fe-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <p>${esc(dataLunga(giorno))} · ${esc(A.orario(e))} · ${escIcone(r.sotto)}</p>
    ${extraEvento(e)}</div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.onclick = ev => { if (ev.target === velo) chiudi(); };
  velo.querySelector('#fe-x').onclick = chiudi;
  // toccando un esito il foglio sparisce subito: il resto del flusso (prossimo appuntamento, vendita…) trova la scena libera
  velo.addEventListener('click', ev => { if (ev.target.closest('[data-esito]')) velo.style.display = 'none'; }, true);
  collegaComandiEvento(velo, e, async () => {
    chiudi();
    await apriAgenda(giorno);
    const agg = AG.azioni.find(x => x.id === e.id);   // se manca un passo (PM «Fatto» → risultato) si riapre
    if (agg && (A.daChiudere(agg) || FATTO_APERTO.has(e.id) || agg.esito === A.fattoDi(agg.tipo_azione))) foglioEvento({ ...agg, quando: e.quando });
  });
}

const dataLunga = g => new Date(g + 'T12:00:00Z').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

// Esiti e comandi di un impegno: gli stessi nell'elenco e nel foglio della griglia. `dopo()` ridisegna chi l'ha aperto.
function collegaComandiEvento(el, e, dopo) {
  const A = MB21Agenda;
  const giorno = A.partiRoma(e.quando || e.inizio).giorno;
  collegaEsiti(el, e, { nome: e.contatti ? e.contatti.nome : '', categoria: e.contatti ? e.contatti.categoria : e.categoria }, dopo);
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
  su('ag-prima', () => apriAgenda(A.spostaGiorno(AG.giorno, -7)));
  su('ag-dopo', () => apriAgenda(A.spostaGiorno(AG.giorno, 7)));
  collegaPartnerSelect();
  su('ag-nuovo', () => (vediTutti() ? mostraToast('Con «Tutti» scegli prima il partner nel Partner Select') : nuovoAppuntamento({ giorno: AG.giorno })));
  su('ag-telefonate', () => { ST.tab = 'oggi'; mostraTab(); });
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

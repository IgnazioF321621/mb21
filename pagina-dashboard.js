// MB21 · pagina Dashboard (OGGI): coda delle telefonate, «Da catalogare», conferme, numeri del mese, Obiettivi e «Il mio giorno» (il modulo della sera, fino al 28/09 «Check del Giorno»).
// Spostata da index.html il 17/09 (pausa di sistemazione, richiesta di Ignazio). Nessun cambiamento di funzionamento.
// Usa ciò che definisce index.html (supa, dbq, ST, PS, LS, esc, mostraToast, visto, guardoAltri, limitato, mostraTab…);
// alcune sue funzioni servono anche alle altre pagine (caricaOggi, registraEsito, annullaEsito, chiediData, bottoniPer,
// appuntamentoDaCoda, dataBreve, CONF, CAMPI_AZIONE). Si carica prima dello script della pagina: solo definizioni.
// ── OGGI ─────────────────────────────────────────────────
async function leggiCandidati(oggi) {
  const righe = [];
  for (let da = 0; ; da += 1000) {   // PostgREST restituisce al massimo 1000 righe per volta
    const { data, error } = await dbq('lettura coda',
      supa.from('contatti_coda').select('*').eq('user_id', visto().id).lte('rientro_il', oggi).order('id').range(da, da + 999));
    if (error) throw error;
    righe.push(...data);
    if (data.length < 1000) return righe;
  }
}

// Senza categoria del partner visto (cantiere 16 · Da catalogare)
async function leggiSenzaCategoria() {
  const righe = [];
  for (let da = 0; ; da += 1000) {
    const { data, error } = await dbq('lettura da catalogare',
      supa.from('contatti').select('id,nome,professione,fascia_eta,citta,telefono,note,referral_di,categoria,user_id,creato_il,glide_id')
        .eq('user_id', visto().id).is('categoria', null).order('id').range(da, da + 999));
    if (error) throw error;
    righe.push(...data);
    if (data.length < 1000) return righe;
  }
}

// Riaprire la Dashboard entro 15 minuti (Ignazio 05/10: «portiamo a 15»), per la stessa persona e lo stesso giorno, senza nessuna scrittura nel frattempo (esito, azione, conferma…),
// riusa quello che ha già letto: prima ogni tocco sul tab, o ogni ritorno da una scheda, rifaceva 25-30 richieste (nota 017).
const DASH_FRESCA_MS = 15 * 60000;
const dashFresca = (oggi) => ST.dashLetta && ST.dashChiave === `${visto().id}|${vediTutti() ? 'tutti' : ''}|${oggi}` && Date.now() - ST.dashLetta < DASH_FRESCA_MS
  && SCRITTURE.ultima < ST.dashLetta && ST.oggi === oggi && !ST.offline && (vediTutti() || ST.risultato);
const dashLetta = (oggi) => { ST.dashChiave = `${visto().id}|${vediTutti() ? 'tutti' : ''}|${oggi}`; ST.dashLetta = Date.now(); };

async function caricaOggi() {
  const oggi = MB21Coda.oggiRoma();
  if (dashFresca(oggi)) return disegnaOggi();
  app.innerHTML = `${testataDashboard()}<div class="sotto">${esc(dataEstesa(oggi))}</div><div class="vuoto">Carico la coda…</div>`;
  if (vediTutti()) {   // Partner Select «Tutti»: solo i numeri, ogni coda è di un partner
    ST.oggi = oggi; ST.offline = false;
    await caricaDashboard(oggi);
    dashLetta(oggi);
    return disegnaOggi();
  }
  // Partner Select su un altro partner: la sua coda si guarda (gli esiti li preme lui, decisione A) e non si tocca:
  // niente `in_coda_dal` scritto da qui, niente copia offline
  const altro = guardoAltri();
  let risultato, stato, offline = false;
  try {
    const { data, error } = await dbq('stato di oggi', supa.rpc('stato_oggi', altro ? { p_utente: visto().id } : {}));
    if (error) throw error;
    stato = data;   // { contatti_al_giorno, fatti_oggi }
    const posti = stato.contatti_al_giorno - stato.fatti_oggi;   // `fatti_oggi` conta anche le telefonate scelte a mano fatte oggi (stato_oggi): chi ne ha fatte 5 ha fatto i suoi 5
    // le telefonate scelte a mano (nota 012) si leggono insieme ai candidati: chi ne ha una aperta non entra anche nella coda automatica (una scheda sola)
    const [candidati] = await Promise.all([leggiCandidati(oggi), caricaScelte(oggi)]);
    risultato = MB21Coda.calcolaCoda(MB21Coda.senzaScelte(candidati, SCE.righe), oggi, posti, stato.contatti_al_giorno === 0);   // 0 = in pausa
    if (!altro && risultato.nuoviInCoda.length) {
      await dbqAvvisa('ingresso in coda', supa.from('contatti').update({ in_coda_dal: oggi })
        .in('id', risultato.nuoviInCoda).is('in_coda_dal', null), 'Non riesco ad aggiornare la coda: riapri la Dashboard.');
    }
  } catch (e) {
    if (altro) {
      app.innerHTML = `${testataDashboard()}${partnerSelect()}<div class="avviso">Non riesco a caricare la coda di ${esc(nomeVisto())}. Controlla la connessione e riprova.</div>${versione()}`;
      return collegaPartnerSelect();
    }
    let cache = null;
    try { cache = JSON.parse(localStorage.getItem(CHIAVE_CACHE)); } catch (e2) {}
    if (!cache) {
      app.innerHTML = `${testataDashboard()}<div class="avviso">Non riesco a caricare la coda. Controlla la connessione e riapri l'app.</div>${versione()}`;
      return;
    }
    risultato = cache.risultato; offline = cache.salvata;
    stato = cache.stato || { contatti_al_giorno: MB21Coda.CAPIENZA, fatti_oggi: 0 };   // copia salvata da una versione precedente
    SCE.righe = [];   // le telefonate scelte a mano non stanno nella copia offline (si chiudono solo in rete)
  }
  ST.oggi = oggi; ST.risultato = risultato; ST.stato = stato; ST.offline = offline;
  if (!offline && !altro) salvaCache();
  ST.catalogo = null; ST.catalogoDi = null;   // offline o errore: il riquadro Da catalogare non si mostra
  if (!offline) {
    if (ST.catalogoGiorno !== oggi) { ST.catalogoGiorno = oggi; ST.catalogoAltri = 0; }   // «Altri 5» valgono per oggi
    try { ST.catalogo = MB21Coda.daCatalogare(await leggiSenzaCategoria(), stato.catalogati_oggi, ST.catalogoAltri); ST.catalogoDi = visto().id; } catch (e) {}
  }
  // il promemoria «Ti eri detto…» (cantiere 42) per chi è in coda e nei Dare Seguito; offline no
  const perRicordi = offline ? [] : [...(risultato.coda || []), ...(risultato.dareSeguito || [])].map(r => r.id);
  DS.sqLettura = null; leggiSquadraMese(oggi, true);   // la mappa del mese, letta una volta per tutti
  await Promise.all([caricaDashboard(oggi), caricaConferme(), caricaRiordini(oggi), caricaAvvio(), caricaObiettiviTeam(oggi), caricaTracceDaControllare(oggi), caricaMioPercorso(), caricaRicordi(perRicordi), caricaCoachYes()]);
  ST.teamLetto = chiaveTeam();   // Avvio e Obiettivi del Team già letti: la Mappa non li rilegge
  if (!offline) dashLetta(oggi);
  disegnaOggi();
}

// «Da catalogare» per la Lista Nomi (nota Pagine 019, 06/10/2026): la Lista lo disegna da `ST.catalogo`, che prima si riempiva solo dalla Dashboard;
// al cambio del Partner Select restava quello del partner di prima (Ignazio: «mi propone i nomi degli altri utenti»). Ora la Lista, se `ST.catalogo`
// manca o è di un altro partner (`ST.catalogoDi`), lo legge da sé: lo stato di oggi (per «ne hai catalogati N») e i senza categoria del partner visto.
async function caricaCatalogo() {
  const oggi = MB21Coda.oggiRoma();
  if (ST.catalogo && ST.catalogoDi === visto().id && ST.catalogoGiorno === oggi) return;
  ST.catalogo = null; ST.catalogoDi = null;
  if (vediTutti() || ST.offline) return;   // con «Tutti» nessuna lista è di qualcuno; offline non si legge
  const altro = guardoAltri();
  try {
    const { data: stato, error } = await dbq('stato di oggi', supa.rpc('stato_oggi', altro ? { p_utente: visto().id } : {}));
    if (error) throw error;
    ST.stato = stato;
    if (ST.catalogoGiorno !== oggi) { ST.catalogoGiorno = oggi; ST.catalogoAltri = 0; }
    ST.catalogo = MB21Coda.daCatalogare(await leggiSenzaCategoria(), stato.catalogati_oggi, ST.catalogoAltri);
    ST.catalogoDi = visto().id;
  } catch (e) { ST.catalogo = null; ST.catalogoDi = null; }
}

// ── Righe che si aprono e si chiudono (Ignazio 24/09: la Dashboard sul telefono era lunghissima) ──
// «Contatti del giorno» e «Da catalogare» sono due righe come «Partner da avviare»: il tocco le apre sul posto.
// Da sole: la coda è aperta se c'è qualcuno da chiamare, «Da catalogare» è sempre chiusa.
// La scelta di Ignazio (aperta/chiusa) resta su questo telefono fino al giorno dopo.
const CHIAVE_APERTE = 'mb21_dash_aperte';
function aperteDash() {
  if (ST.aperteDash && ST.aperteDash.giorno === ST.oggi) return ST.aperteDash;
  let salvate = null;
  try { salvate = JSON.parse(localStorage.getItem(CHIAVE_APERTE)); } catch (e) {}
  ST.aperteDash = salvate && salvate.giorno === ST.oggi ? salvate : { giorno: ST.oggi };
  return ST.aperteDash;
}
function apertaRigaDash(nome, daSola) {
  const scelta = aperteDash()[nome];
  return scelta === undefined ? daSola : scelta;
}
function cambiaRigaDash(nome, daSola) {
  const a = aperteDash();
  a[nome] = !apertaRigaDash(nome, daSola);
  try { localStorage.setItem(CHIAVE_APERTE, JSON.stringify(a)); } catch (e) {}
  disegnaOggi();
}
// `restano` = quanti ne restano da fare: chiusa, il numero si vede in una pastiglia prima della freccia
// (Ignazio 24/09: «non si capisce che ci sono 4 persone da chiamare»)
function rigaApribile(id, classe, icona, titolo, sotto, aperta, restano) {
  const pastiglia = !aperta && restano ? `<span class="sez-quanti">${restano}</span>` : '';
  return `<button class="ag-blocco sezione ${classe}" id="${id}" aria-expanded="${aperta}">
    <span>${ic(icona)}<span class="sez-testo"><b>${titolo}</b>${sotto ? `<small>${sotto}</small>` : ''}</span></span><span>${pastiglia}${aperta ? '⌄' : '›'}</span></button>`;
}

// ── Bottoni esito (tabella confermata da Ignazio il 14/09, STRUTTURA.md → Bottoni esito) ──
// Prospect e Referral (e senza categoria, se capitano): 5 bottoni sulle fasi Prospect · Contatto.
// Partner e Cliente: in Sequenze non hanno fasi di telefonata → solo i due con data.
// Cantiere 39 (Ignazio 21/09: «uniformiamo le parole della coda con quelle ufficiali», poi «così hanno tutti la stessa logica»):
// i bottoni della coda sono gli STESSI esiti di «Com'è andata?», nello stesso ordine, presi dall'elenco unico di agenda.js
// (MB21Agenda.fasiPer): sul bottone c'è scritto l'esito che si salva. Qui resta solo quello che un esito FA in coda.
// Prima: 5 bottoni con parole loro (Appuntamento · Richiamare · Non risponde · Non ora · Non interessato), e in coda mancavano
// «Consulenza Prodotti» e «Telefono spento». Partner e Cliente: come in Agenda (dal 25/09 anche lì «Telefono spento» e «No Risposta»).
const COSA_FA_ESITO = {
  'PM Fissato': { data: 'giorno-ora', classe: 'appuntamento' },
  'Appuntamento': { data: 'giorno-ora', classe: 'appuntamento' },
  'Consulenza Prodotti': { data: 'giorno-ora', classe: 'appuntamento' },   // 01/10 (Ignazio: «allineare assolutamente le schede e i passaggi»): la consulenza si fissa anche dalla coda, come da Agenda e scheda
  'Richiamare': { data: 'giorno' },
  'No Risposta': { rientro: true },                          // 01/10: anche «No Risposta» e «Telefono spento» chiedono «Quando risentirlo?» (2 e 7 giorni, cambiabili)
  'Telefono spento': { rientro: true },
  'Relazione': { rientro: true },                            // «Quando risentirlo?» con 20 giorni proposti (Ignazio 25/09)
  'Ordine': { classe: 'ordine', vendita: true },              // propone di registrare la vendita (cantiere 27)
  'No Interesse': { classe: 'no', rientro: true },           // poi «Quando risentirlo?» (17/09)
};
function bottoniPer(categoria) {
  const cat = categoria === 'Partner' || categoria === 'Cliente' ? categoria : 'Prospect';   // Referral, Ex, senza categoria: fasi del Prospect
  const esiti = MB21Agenda.fasiPer(cat, 'Contatto', 'Telefonata');
  return esiti.map(f => ({ etichetta: f, chiave: `${cat}-Contatto-${f}`, ...(COSA_FA_ESITO[f] || {}) }));
}
// I bottoni di una riga della coda (e dei Dare Seguito scaduti): sopra gli esiti buoni, sotto quelli non andati, come in «Com'è andata?»
// (MB21Agenda.esitiInDueRighe). `data-bottone` resta la posizione in bottoniPer: è quella che legge chi raccoglie il tocco.
function bottoniCodaHtml(r, spento) {
  const tutti = bottoniPer(r.categoria);
  return MB21Agenda.esitiInDueRighe(tutti.map(b => b.etichetta)).map((riga, n) =>
    `<div class="${n === 0 ? 'buoni' : 'nonandati'}">${riga.map(f => {
      const i = tutti.findIndex(b => b.etichetta === f);
      return `<button class="${tutti[i].classe || ''}" data-contatto="${esc(r.id)}" data-bottone="${i}" ${spento ? 'disabled' : ''}>${esc(f)}</button>`;
    }).join('')}</div>`).join('');
}

// Riga compatta con le parole di Glide («Azioni da completare»): nome · «modalità • area | esito» dell'ultima azione · frase del coach. Il tocco la apre (una sola aperta): dati, telefono, coach intero, bottoni.
function rigaGlide(r) {
  const prima = [r.ultima_modalita || (r.contattato ? r.ultimo_tipo : 'Telefonata'), r.ultima_area || 'Attività'].filter(Boolean).join(' • ');
  return `${prima} | ${r.contattato ? (r.ultima_fase || 'Senza esito') : 'Mai contattato o 2+ anni'}`;
}
function cardContatto(r, dareSeguito) {
  const fase = r.contattato ? (r.ultima_fase || 'Senza esito') : 'Mai contattato';
  const badge = dareSeguito
    ? `<span class="badge scaduto">${esc(fase)} · scaduto da ${r.scadutoDa} ${r.scadutoDa === 1 ? 'giorno' : 'giorni'}</span>`
    : `<span class="badge">${esc(fase)}</span>`;
  const aperta = ST.aperta === r.id;
  const testa = `
    <button class="riga-coda" data-apri="${esc(r.id)}" aria-expanded="${aperta}">
      <span class="rc-pastiglia">${esc(iniziali(r.nome))}</span><span class="rc-alto"><span class="nome">${esc(r.nome)}${nuovoBadge(r)}</span>${dareSeguito ? badge : ''}</span>
      <span class="rc-glide">${esc(rigaGlide(r))}</span>
      ${r.coach && r.contattato ? `<span class="rc-coach">${esc(r.coach)}</span>` : ''}
      <span class="rc-freccia">${aperta ? '⌃' : '›'}</span>
    </button>`;
  if (!aperta) {
    return `<div class="card compatta ${classeCat(r.categoria)}" id="card-${esc(r.id)}">${testa}</div>`;
  }
  const luogo = [r.citta, r.fascia_eta].filter(Boolean).join(' · ');
  const bottoni = bottoniCodaHtml(r, ST.offline || guardoAltri());
  return `
    <div class="card compatta aperta ${classeCat(r.categoria)}" id="card-${esc(r.id)}">
      ${testa}
      <div class="corpo">
        ${ricordoHtml(r.id, r.nome)}
        ${preparaChiamataHtml(r.id)}
        ${r.professione ? `<div class="prof">${esc(r.professione)}</div>` : ''}
        ${luogo ? `<div class="luogo">${esc(luogo)}</div>` : ''}
        ${contattaHtml(r.telefono)}
        <div class="bottoni due-righe">${bottoni}</div>
        <button class="link" data-scheda="${esc(r.id)}">${ic('persona')} Apri contatto</button>
      </div>
    </div>`;
}

// ── ZONA «OGGI» (Ignazio 28/09, schizzo approvato) ───────────────────────────────
// Tutte le cose del giorno hanno lo stesso aspetto: fascia con icona, titolo, una riga che dice
// quante ne restano e la pastiglia col numero. **Blu = persone che ti aspettano oggi** (conferme,
// Dare Seguito scaduti, contatti del giorno, riordini) · **grigio = lavoro senza fretta** (tracce,
// da catalogare, partner da avviare, il Check della sera) · **verde = fatto**.
// In cima il conto a parole: «ti restano N cose» (solo le blu non finite).
// Il Check della sera sta in fondo e dalle 20 diventa blu e sale primo (Ignazio: «dalle 20:00»).
const ORA_CHECK = 20;
function oraRoma() {
  return Number(new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', hour12: false }).format(new Date()));
}
// ══ LA DASHBOARD «A LIVELLI» (Pagine 040; Ignazio 04/10/2026, studiata schermata per schermata con un disegno cliccabile) ══
// Primo livello: poche idee iniziali, ognuna una domanda che si capisce al primo sguardo: «Chi sento oggi?» · «Come sto andando questo mese?» ·
// «Qual è il mio prossimo traguardo?» · «Com'è andata oggi?», con Report e Griglia PM in piccolo. Il tocco apre la sottopagina (secondo livello);
// da lì un tocco su una persona o su un'area apre il terzo. Il nuovo parte da «Il mio avvio», con un consiglio (sentire lo sponsor o l'upline attivo).
// Le pagine sono fatte con i pezzi che c'erano già (coda, conferme, riordini, numeri del mese, percorso del Check, «Il mio giorno»): cambia dove
// stanno e come si arriva, non cosa fanno. Con «Tutti» (Partner Select) la Dashboard resta quella dei soli numeri.
const LV = { vista: 'home', area: null, persona: null, gradino: null, fatte: [], giorno: null };
const NOMI_LV = { home: 'Oggi', oggi: 'Chi sento oggi?', mese: 'Come sto andando questo mese?', traguardo: 'Qual è il mio prossimo traguardo?', avvio: 'Il mio avvio' };
const PADRE_LV = { persona: 'oggi', area: 'mese', gradino: 'traguardo' };
function vaiLV(vista, extra) {
  LV.vista = vista; LV.area = null; LV.persona = null; LV.gradino = null;
  Object.assign(LV, extra || {});
  window.scrollTo(0, 0);
  disegnaOggi();
}
const indietroLV = () => `<button class="indietro" id="lv-indietro">‹ ${esc(NOMI_LV[PADRE_LV[LV.vista] || 'home'])}</button>`;
const attaccaIndietroLV = () => { const b = document.getElementById('lv-indietro'); if (b) b.onclick = () => vaiLV(PADRE_LV[LV.vista] || 'home'); };
const nomeProprio = () => String(nomeDi(visto()) || '').trim().split(/\s+/)[0];

// Chi è nuovo e sta facendo il suo avvio (stessa regola del riquadro «Il mio avvio»)
function nuovoInAvvio() {
  const m = AVV.mio;
  return !guardoAltri() && !!m && !m.avvio_concluso_il && !m.avvio_in_pausa_dal && !!MB21Lista.prossimoPasso(m);
}
function contiOggi() {
  const r = ST.risultato || { coda: [], dareSeguito: [] };
  return { coda: r.coda.length, dare: r.dareSeguito.length, conf: CONF.righe.length, rio: RIO.righe.length, scelte: SCE.righe.length };
}
const totaleOggi = c => c.coda + c.dare + c.conf + c.rio + c.scelte;
function fraseOggi(c) {
  const p = [];
  if (c.conf) p.push(`${c.conf} ${c.conf === 1 ? 'conferma' : 'conferme'}`);
  if (c.dare) p.push(`${c.dare} Dare Seguito`);
  if (c.coda) p.push(`${c.coda} ${c.coda === 1 ? 'telefonata' : 'telefonate'}`);
  if (c.scelte) p.push(`${c.scelte} ${c.scelte === 1 ? 'scelta' : 'scelte'} a mano`);
  if (c.rio) p.push(`${c.rio} ${c.rio === 1 ? 'riordino' : 'riordini'}`);
  return p.join(', ');
}
function fraseMese() {
  const d = DS.dati;
  if (!d) return 'I numeri non si leggono ora: riprova più tardi';
  const D = MB21Dashboard, primo = d.schede[0] ? D.riassuntoScheda(d.schede[0]) : '';
  return `${D.nomeMese(d.mese).toLowerCase()} · ${d.giorni === 1 ? 'resta 1 giorno' : `restano ${d.giorni} giorni`}${primo ? ' · ' + primo : ''}`;
}
// Il percorso del mese (Leader 1° livello, Core, Pacesetter, i livelli): gli stessi dati del Check; null finché non sono arrivati
function percorsoDash() {
  if (vediTutti() || limitato() || ST.offline || !CK.lc1 || !(CK.giorni && CK.di === visto().id)) return null;
  const oggi = MB21Coda.oggiRoma();
  const l = MB21Check.lc1({ mese: oggi.slice(0, 8) + '01', oggi, obiettivi: CK.obiettivi, biglietti: CK.lc1.biglietti, cep: CK.lc1.cep, eventi: CK.eventi });
  return l.prima ? null : { l, ...statoPercorso(l) };
}
// i quattro punti del Leader 1° livello con le parole di Ignazio (04/10); nel Check, nelle caselline strette, restano 100 VP · BBS · WES · CEP
const PUNTI_LC1 = { vp: '100 VPP', bbs: 'Ticket BBS', wes: 'Ticket WES', cep: 'Abbonamento CEP' };
const nomeGradino = g => (g.chiave === 'core' ? 'Core' : g.titolo);
function fraseTraguardo(p) {
  if (!p) return 'Leggo il percorso…';
  const g = MB21Check.piuVicino(p.pc.gradini);
  if (g) { const m = g.totale - g.fatti; return `${nomeGradino(g)}: ${m === 1 ? 'ti manca 1 passo' : `ti mancano ${m} passi`}`; }
  const prossimo = p.lv && p.lv.righe.find(r => !r.fatto && r.chiave !== 'plat');
  return prossimo ? `${prossimo.titolo}: ${prossimo.stato}` : 'Leader 1° livello, Core e Pacesetter: fatti';
}

// ── Il primo livello ──
function tessera(go, icona, colore, tinta, titolo, riga, n, opz = {}) {
  const dentro = `<span class="lv-ic">${ic(icona)}</span><span class="lv-testo"><b>${titolo}</b><small>${riga}</small></span>
    <span class="lv-dx">${n ? `<i class="lv-n">${n}</i>` : ''}${opz.spenta ? '' : '<em>›</em>'}</span>`;
  const stile = `--c:var(--${colore});--t:var(--${tinta})`;
  return opz.spenta ? `<div class="lv-tile ghost" style="${stile}">${dentro}</div>`
    : `<button class="lv-tile${opz.blu ? ' blu' : ''}" data-lv="${go}" style="${stile}">${dentro}</button>`;
}
const consiglioNuovoHtml = () => {
  const m = AVV.mio;
  return `<div class="avv-consiglio"><b>Un consiglio</b>Prima di cambiare qualcosa, senti ${m && m.sponsor_nome ? `${esc(MB21Mappa.nomeLeggibile(m.sponsor_nome))}, il tuo sponsor` : 'il tuo sponsor'}, oppure il tuo upline attivo e in azione. Insieme si va più veloci.</div>`;
};
function disegnaHome() {
  const altro = guardoAltri(), nuovo = nuovoInAvvio(), d = DS.dati, c = contiOggi(), totale = totaleOggi(c);
  const fattoGiorno = !!d && d.ultimoCheck === ST.oggi, sera = oraRoma() >= ORA_CHECK;
  const nome = nomeProprio();
  let html = `<div class="testa-pagina"><div><div class="sotto" style="margin:0">${esc(dataEstesa(ST.oggi))}</div><h1>${altro || !nome ? 'Dashboard' : `Ciao ${esc(nome)}`}</h1></div>${cerchiettoProfilo()}</div>` + dashboardTesta();
  if (ST.offline) {
    const ora = new Date(ST.offline).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    html += `<div class="avviso">Sei offline: questa è la coda salvata il ${esc(ora)}. Solo lettura.</div>`;
  }
  html += rigaTelefonoHtml();   // cantiere 32: «Metti MB21 sul telefono e accendi gli avvisi»
  const tessere = [];
  const chi = tessera('oggi', 'telefonate', 'ct-chiama', 'ok-tinta', 'Chi sento oggi?', esc(totale ? fraseOggi(c) : (ST.stato && ST.stato.contatti_al_giorno === 0 ? 'In pausa · 0 contatti al giorno' : 'Per oggi hai finito')), totale, { blu: totale > 0 });
  const haNumeri = !!d && ((DS.checkMesi || []).some(x => Number(x.contatti) > 0) || (ST.stato && ST.stato.fatti_oggi > 0));
  const mese = tessera('mese', 'report', 'gr-volume', 'gr-volume-tinta', 'Come sto andando questo mese?', esc(nuovo && !haNumeri ? 'Si accende dopo le prime telefonate' : fraseMese()), 0, { spenta: nuovo && !haNumeri });
  const p = percorsoDash();
  const traguardo = tessera('traguardo', 'crescita', 'gr-crescita', 'gr-crescita-tinta', 'Qual è il mio prossimo traguardo?', esc(nuovo ? 'Si accende quando finisci l\'avvio' : limitato() ? 'Con l\'abbonamento attivo' : fraseTraguardo(p)), 0, { spenta: nuovo });
  const giorno = tessera('giorno', 'lampo', 'proposta', 'proposta-tinta', 'Com\'è andata oggi?', esc(fattoGiorno ? 'Il tuo giorno è scritto · tocca per rivederlo' : sera ? 'È ora: scrivi cosa hai fatto oggi' : 'Il tuo giorno: da scrivere stasera'), 0, { blu: sera && !fattoGiorno });
  if (nuovo) {
    const m = AVV.mio, { fatti, totale: tot } = MB21Lista.contatoreOnboarding(m);
    tessere.push(tessera('avvio', 'avvio', 'cat-partner', 'cat-partner-tinta', 'Il mio avvio', esc(`Fatti ${fatti} passi su ${tot} · prossimo: ${MB21Lista.prossimoPasso(m).nome}`), 1, { blu: true }), chi, mese, traguardo);
  } else if (sera && !fattoGiorno && !altro) tessere.push(giorno, chi, mese, traguardo);
  else tessere.push(chi, mese, traguardo, giorno);
  html += `<div class="lv-dom">Da dove vuoi partire?</div>${tessere.join('')}`;
  if (!vediTutti() && !limitato()) html += `<div class="lv-pic"><button id="ds-altro">${ic('report')} Report</button><button id="ds-griglia">${ic('pianomarketing')} Griglia PM</button></div>`;
  if (nuovo) html += consiglioNuovoHtml();
  html += tracceHtml() + mioPercorsoHtml();   // le due righe grigie di prima (tracce condivise e percorso di chi parte): per ora restano qui sotto
  app.innerHTML = html + versione();
  app.querySelectorAll('[data-lv]').forEach(b => b.onclick = () => {
    const go = b.dataset.lv;
    if (go === 'giorno') { if (!ST.offline && !limitato()) apriCheck(); return; }
    if (go === 'avvio') AVV.mioAperto = true;
    vaiLV(go);
  });
}

// ── Chi sento oggi? (secondo livello): le righe partono chiuse, un tocco le apre su un elenco corto, una riga per persona ──
// `contatto` (nota 001): l'id della persona, per il segnale Coach Yes accanto al nome (solo dove c'è una telefonata da fare)
function rigaPersona(tipo, id, nome, sotto, contatto) {
  return `<button class="lv-persona" data-lv-persona="${tipo}|${esc(id)}"><span class="rc-pastiglia">${esc(iniziali(nome))}</span>
    <span class="lv-pt"><b>${esc(nome)}${contatto ? segnoCoach(contatto, nome) : ''}</b><small>${esc(sotto)}</small></span><em>›</em></button>`;
}
const rigaFatta = nome => `<div class="lv-persona fatta"><span class="rc-pastiglia">${ic('fatto')}</span><span class="lv-pt"><b>${esc(nome)}</b><small>fatto</small></span></div>`;
// La riga di un contatto del giorno: sotto il nome cosa è successo l'ultima volta e quando (nota 016, MB21Coda.ultimaVolta) e, sulla propria coda,
// «Non ora» per saltarlo senza aprire la scheda (nota 018: poi «Salta», tra GIORNI_SALTA giorni, o «Scegli la data»). Offline: solo la riga.
// Nota Pagine 003 (Ignazio 06/10, urgente): c'è anche guardando un altro partner col Partner Select (solo l'Admin: la regola `contatti_own`
// gli lascia scrivere `rientro_il` dei contatti di tutti, provato sul database in una prova annullata); con «Tutti» la coda non c'è.
function rigaCoda(x) {
  const riga = rigaPersona('coda', x.id, x.nome, MB21Coda.ultimaVolta(x, ST.oggi), x.id);
  if (vediTutti() || ST.offline) return riga;
  return `<div class="lv-riga">${riga}<button class="lv-nonora" data-non-ora="${esc(x.id)}" title="Non ora">Non ora</button></div>`;
}
async function nonOra(id) {
  const x = (ST.risultato.coda || []).find(y => y.id === id);
  if (!x || ST.offline || vediTutti()) return;
  const v = await sceltaDa(`Non ora · ${x.nome}`, [
    { id: 'salta', etichetta: 'Salta', icona: 'rimandato', nota: `Torna tra ${MB21Coda.GIORNI_SALTA} giorni tra i contatti del giorno` },
    { id: 'data', etichetta: 'Scegli la data', icona: 'agenda', nota: 'Torna il giorno che scegli' }]);
  if (!v) return;
  let scelto = null;
  if (v.id === 'data') {
    const iso = await chiediData({ etichetta: 'Non ora: quando?', data: 'giorno', testo: 'Quel giorno torna tra i contatti del giorno, senza contare come fatto' }, x.nome);
    if (!iso) return;
    scelto = MB21Coda.oggiRoma(new Date(iso));
  }
  const giorno = MB21Coda.giornoRinvio(ST.oggi, v.id, scelto), prima = x.rientro_il;
  const { error } = await dbq('non ora', supa.from('contatti').update({ rientro_il: giorno, aggiornato_il: new Date().toISOString() }).eq('id', id));
  if (error) return mostraToast('Non salvato: controlla la connessione e riprova.');
  const posto = ST.risultato.coda.indexOf(x);
  ST.risultato.coda.splice(posto, 1);
  disegnaOggi();
  mostraToast(`${x.nome} · non ora, ${MB21Coda.testoRinvio(giorno, ST.oggi)}`, async () => {
    const { error: e2 } = await dbq('annulla non ora', supa.from('contatti').update({ rientro_il: prima, aggiornato_il: new Date().toISOString() }).eq('id', id));
    if (e2) return mostraToast('Annullamento non riuscito: riprova.');
    ST.risultato.coda.splice(Math.min(posto, ST.risultato.coda.length), 0, x);
    disegnaOggi();
    mostraToast('Annullato');
  });
}
const fatteDi = tipo => LV.fatte.filter(x => x.tipo === tipo);
function disegnaOggiLV() {
  const r = ST.risultato, st = ST.stato, altro = guardoAltri(), c = contiOggi();
  const sezioni = [];
  const metti = (id, icona, titolo, sotto, quanti, tipo, righe, contenutoSpeciale) => {
    const fatte = fatteDi(tipo), aperta = apertaRigaDash(id, false);
    const finita = !quanti;
    sezioni.push(rigaApribile('sez-' + id, finita ? 'fatta' : '', finita ? 'fatto' : icona, titolo, sotto, aperta, quanti)
      + (aperta ? (contenutoSpeciale ? contenutoSpeciale() : righe.join('') + fatte.map(x => rigaFatta(x.nome)).join('')) : ''));
  };
  if (CONF.righe.length || fatteDi('conf').length) metti('conferme', 'conferme', 'Conferme', c.conf ? `${c.conf} ${c.conf === 1 ? 'appuntamento da confermare' : 'appuntamenti da confermare'}` : 'tutte fatte', c.conf, 'conf',
    CONF.righe.map(x => rigaPersona('conf', x.id, x.contatti ? x.contatti.nome : '', MB21Agenda.testoConferma(x, new Date().toISOString()))));
  if (r.dareSeguito.length || fatteDi('ds').length) metti('dareseguito', 'rimandato', 'Dare Seguito scaduti', c.dare ? `${c.dare} da richiamare` : 'tutti fatti', c.dare, 'ds',
    r.dareSeguito.map(x => rigaPersona('ds', x.id, x.nome, `${x.ultima_fase || 'Senza esito'} · scaduto da ${x.scadutoDa} ${x.scadutoDa === 1 ? 'giorno' : 'giorni'}`, x.id)));
  const inPausa = st.contatti_al_giorno === 0;
  const conto = esc(MB21Coda.contoGiorno(st.fatti_oggi, st.contatti_al_giorno));   // «3 di 5» · «5 di 5 ✓ e 2 in più» (le telefonate scelte a mano oltre il traguardo)
  if (inPausa) metti('coda', 'telefonate', altro ? `Contatti del giorno di ${esc(nomeDi(visto()))}` : 'Contatti del giorno', 'In pausa · 0 contatti al giorno', 0, 'coda', [],
    () => altro ? `<div class="sotto">${ic('visione')} ${esc(nomeDi(visto()))} ha scelto una pausa: 0 contatti al giorno.</div>`
      : `<div class="vuoto">Sei in pausa: 0 contatti al giorno. Quando ti va, scegli da dove ripartire.</div><button class="primario" id="ds-riparto" ${ST.offline ? 'disabled' : ''}>Riparto</button>`);
  else metti('coda', 'telefonate', altro ? `Contatti del giorno di ${esc(nomeDi(visto()))}` : 'Contatti del giorno',
    c.coda ? `${c.coda} ancora da chiamare · fatti ${conto}` : `Fatti ${conto}`, c.coda, 'coda',
    r.coda.map(rigaCoda),
    altro ? () => `<div class="sotto">${ic('visione')} Gli esiti della coda li preme ${esc(nomeDi(visto()))} dalla sua app.</div>${r.coda.map(rigaCoda).join('')}` : null);
  // le telefonate scelte a mano (nota 012): in più dei contatti del giorno, restano finché non hanno un esito
  if (SCE.righe.length || fatteDi('scelta').length) metti('scelte', 'telefonate', 'Telefonate scelte a mano',
    c.scelte ? `${c.scelte} ancora da chiamare · in più dei contatti del giorno` : 'tutte fatte', c.scelte, 'scelta',
    SCE.righe.map(a => rigaPersona('scelta', a.id, a.contatti ? a.contatti.nome : '', sottoScelta(a), a.contatto_id)));
  if (RIO.righe.length || fatteDi('rio').length) metti('riordini', 'riordini', 'Riordini da sentire', c.rio ? `${c.rio} ${c.rio === 1 ? 'cliente da sentire' : 'clienti da sentire'}` : 'tutti sentiti', c.rio, 'rio',
    RIO.righe.map(a => rigaPersona('rio', a.id, a.contatti ? a.contatti.nome : '', ['Riordino', a.brand, a.prodotto].filter(Boolean).join(' · '), a.contatto_id)));
  const finito = !totaleOggi(c);
  let html = indietroLV() + `<h1>Chi sento oggi?</h1><div class="sotto">${esc(dataEstesa(ST.oggi))}${conto ? ` · fatti ${conto}` : ''}</div>` + (ST.offline ? '<div class="avviso">Sei offline: questa è la coda salvata. Solo lettura.</div>' : '')
    + sezioni.join('') + (finito ? `<div class="vuoto">Per oggi hai finito. ${ic('complimenti')}</div>` : '');
  app.innerHTML = html + versione();
  const daSole = { conferme: false, dareseguito: false, coda: false, scelte: false, riordini: false };
  for (const k of Object.keys(daSole)) { const b = document.getElementById('sez-' + k); if (b) b.onclick = () => cambiaRigaDash(k, false); }
  app.querySelectorAll('[data-lv-persona]').forEach(b => b.onclick = () => { ST.aperta = b.dataset.lvPersona.split('|')[1]; vaiLV('persona', { persona: b.dataset.lvPersona }); });
  app.querySelectorAll('[data-non-ora]').forEach(b => b.onclick = () => nonOra(b.dataset.nonOra));
  attaccaIndietroLV();
  const vai = LV.vaiA; LV.vaiA = null;
  const titolo = vai && document.getElementById('sez-' + vai);
  if (titolo) titolo.scrollIntoView({ block: 'start' });
}

// ── La persona (terzo livello): la stessa scheda per tutti, cambia il motivo e quello che si preme; finito l'esito si torna all'elenco con la spunta ──
function disegnaPersonaLV() {
  const [tipo, id] = String(LV.persona).split('|');
  const r = ST.risultato;
  let corpo = '', chip = '', nome = '';
  if (tipo === 'coda' || tipo === 'ds') {
    const x = (tipo === 'ds' ? r.dareSeguito : r.coda).find(y => y.id === id);
    if (x) { nome = x.nome; chip = tipo === 'ds' ? 'Dare Seguito scaduto' : x.contattato ? 'Da chiamare' : 'Mai contattato'; ST.aperta = id; corpo = cardContatto(x, tipo === 'ds'); }
  } else if (tipo === 'conf') {
    const x = CONF.righe.find(y => y.id === id);
    if (x) { nome = x.contatti ? x.contatti.nome : ''; chip = 'Da confermare'; corpo = confermeHtml(id); }
  } else if (tipo === 'rio') {
    const x = RIO.righe.find(y => y.id === id);
    if (x) { nome = x.contatti ? x.contatti.nome : ''; chip = 'Riordino'; ST.aperta = id; corpo = riordiniHtml(id); }
  } else if (tipo === 'scelta') {   // una telefonata scelta a mano (nota 012): la stessa scheda, gli esiti della telefonata
    const x = SCE.righe.find(y => y.id === id);
    if (x) { nome = x.contatti ? x.contatti.nome : ''; chip = 'Scelta a mano'; ST.aperta = id; corpo = sceltaHtml(x); }
  }
  if (!corpo) {   // l'esito è stato dato (o la persona non c'è più): si torna all'elenco, con la spunta
    const nomeFatto = LV.nomePersona || '';
    if (nomeFatto && !LV.fatte.some(x => x.tipo === tipo && x.id === id)) LV.fatte.push({ tipo, id, nome: nomeFatto });
    LV.nomePersona = null;
    return vaiLV('oggi');
  }
  LV.nomePersona = nome;
  // nota 001: accanto al nome il segnale Coach Yes, dove c'è una telefonata da fare (non sulle conferme)
  const chiContatto = tipo === 'coda' || tipo === 'ds' ? id : tipo === 'rio' ? (RIO.righe.find(y => y.id === id) || {}).contatto_id : tipo === 'scelta' ? (SCE.righe.find(y => y.id === id) || {}).contatto_id : null;
  app.innerHTML = indietroLV() + `<div><span class="lv-chip">${esc(chip)}</span></div><h1 style="margin-top:2px">${esc(nome)}${segnoCoach(chiContatto, nome)}</h1>${corpo}` + versione();
  attaccaIndietroLV();
}

// ── Come sto andando questo mese? (secondo livello): una card per area, con tutte le sue voci e la barra; "Dettaglio ›" apre l'area (terzo livello) ──
function cardArea(x) {
  const D = MB21Dashboard;
  const voci = x.riquadri.map(r => {
    const sx = r.senzaObiettivo ? centesimi(r.numero) : `${centesimi(r.numero)} <small>su ${esc(r.obiettivoTxt)}</small>`;
    return `<div class="lv-voce"><span>${esc(r.titolo)}</span><b>${sx}</b></div>
      ${r.senzaObiettivo ? '' : `<div class="dm-barra"><div style="width:${r.percentuale}%;background:${D.sintesiRiquadro(r).stato === 'ok' ? 'var(--ok)' : x.colore}"></div></div>`}`;
  }).join('');
  return `<button class="lv-area" data-lv-area="${x.chiave}"><span class="lv-area-t"><b style="color:${x.colore}">${esc(x.etichetta)}</b><span class="lv-pill">Dettaglio ›</span></span>${voci}
    <small class="lv-frase">${esc(D.riassuntoScheda(x))}</small></button>`;
}
function disegnaMeseLV() {
  const d = DS.dati, D = MB21Dashboard;
  if (!d) { app.innerHTML = indietroLV() + `<h1>Come sto andando questo mese?</h1><div class="avviso">I numeri non si leggono ora: riprova più tardi.</div>` + versione(); return attaccaIndietroLV(); }
  const mese = D.nomeMese(d.mese);
  let html = indietroLV() + `<h1>Come sto andando questo mese?</h1><div class="sotto">${esc(mese)} · ${d.giorni === 1 ? 'resta 1 giorno' : `restano ${d.giorni} giorni`}</div>
    <div class="sotto" style="margin-bottom:10px">Tocca una card per il dettaglio${DS.confronto ? ` e il confronto con ${esc(D.nomeMese(DS.confronto.mese).toLowerCase())}` : ''}.</div>${d.schede.map(cardArea).join('')}`;
  const rigaOb = limitato() || d.obiettiviMancanti || !obiettiviAperti() ? '' : `<button class="mese-riga" id="ds-obiettivi-mod" ${ST.offline ? 'disabled' : ''}>${ic('obiettivi')}<span><b>Obiettivi di ${esc(mese)}</b><small>i traguardi che ti sei dato</small></span><em>›</em></button>`;
  const rigaConf = !limitato() && DS.confronto ? `<button class="mese-riga" id="ds-confronto">${ic('obiettivi')}<span><b>Com'è andato ${esc(D.nomeMese(DS.confronto.mese).toLowerCase())}</b><small>${DS.confronto.raggiunti} ${DS.confronto.raggiunti === 1 ? 'obiettivo raggiunto' : 'obiettivi raggiunti'} su ${DS.confronto.totali}</small></span><em>›</em></button>` : '';
  if (rigaOb || rigaConf) html += `<div class="zona-oggi">Obiettivi</div><div class="riquadro mese-card dm-liste">${rigaOb}${rigaConf}</div>`;
  app.innerHTML = html + versione();
  attaccaIndietroLV();
  app.querySelectorAll('[data-lv-area]').forEach(b => b.onclick = () => vaiLV('area', { area: b.dataset.lvArea }));
}
// L'area (terzo livello): le stesse voci con il mese scorso accanto, con le parole (Raggiunto · Quasi · A metà strada · Lontano) e il collegamento al Check
function disegnaMeseDashboard(vai) {
  const d = DS.dati, D = MB21Dashboard, x = d && d.schede.find(s => s.chiave === (vai || LV.area));
  if (!x) return vaiLV('mese');
  const prima = DS.confronto ? D.nomeMese(DS.confronto.mese) : null;
  const righeConf = DS.confronto ? DS.confronto.gruppi.flatMap(g => g.righe) : [];
  const voce = r => {
    const t = D.sintesiRiquadro(r), cf = righeConf.find(y => y.k === r.campo);
    const f = n => Number(n).toLocaleString('it-IT', { maximumFractionDigits: 2 });
    return `<div class="dm-riga"><span class="n">${esc(r.titolo)}</span><span class="g" style="color:${t.stato === 'ok' ? 'var(--ok)' : x.colore}">${r.senzaObiettivo ? centesimi(r.numero) : `${centesimi(r.numero)} <small>su ${esc(r.obiettivoTxt)}</small>`}</span>
      ${r.senzaObiettivo ? '' : `<div class="dm-barra"><div style="width:${r.percentuale}%;background:${t.stato === 'ok' ? 'var(--ok)' : x.colore}"></div></div>`}
      ${cf ? `<small class="lv-prima">${esc(prima)}: ${esc(f(cf.fatto))} su ${esc(f(cf.obiettivo))} · <b class="lv-${cf.livello}">${esc(cf.parola)}</b></small>` : ''}</div>`;
  };
  app.innerHTML = indietroLV() + `<h1 style="color:${x.colore}">${esc(x.etichetta)}</h1><div class="sotto">${esc(D.nomeMese(d.mese))}${prima ? `, con ${esc(prima.toLowerCase())} accanto` : ''}</div>
    <div class="riquadro mese-card dm-corpo">${x.riquadri.map(voce).join('')}</div>
    <p class="sotto lv-frase-area">${esc(D.riassuntoScheda(x))}</p>
    <button class="mese-riga" id="lv-12mesi">${ic('report')}<span><b>Vedi i 12 mesi nel Check</b><small>l'andamento mese per mese</small></span><em>›</em></button>` + versione();
  attaccaIndietroLV();
  document.getElementById('lv-12mesi').onclick = () => { ST.tab = 'check'; mostraTab(); window.scrollTo(0, 0); };
}

// ── Qual è il mio prossimo traguardo? (secondo livello): Leader 1° livello, Core, Pacesetter e i livelli; il più vicino è segnato ──
const elencoVoci = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`);
// la riga di un gradino dice cosa manca, ma corta: le prime due cose e «e altre N»
const mancaCorto = xs => (xs.length > 3 ? `${xs.slice(0, 2).join(', ')} e altre ${xs.length - 2}` : elencoVoci(xs));
function rigaGradino(chiave, titolo, sotto, fatti, totale, vicino) {
  const ok = totale > 0 && fatti >= totale;
  return `<button class="lv-grad${vicino ? ' vicino' : ''}${ok ? ' fatto' : ''}" data-lv-grad="${chiave}"><span class="lv-tick">${ok ? ic('fatto') : ''}</span>
    <span class="lv-gt"><b>${esc(titolo)}</b>${vicino ? '<span class="lv-chip">Il più vicino</span>' : ''}<small>${esc(sotto)}</small>
    <span class="lv-prog"><i style="width:${totale ? Math.round(fatti / totale * 100) : 0}%"></i></span></span><span class="lv-gn">${fatti}/${totale}</span></button>`;
}
const conteggioVoci = voci => { const v = voci.filter(x => !x.sotto); return [v.filter(x => x.fatto).length, v.length]; };
function disegnaTraguardoLV() {
  const p = percorsoDash();
  let html = indietroLV() + '<h1>Qual è il mio prossimo traguardo?</h1>';
  if (!p) {
    app.innerHTML = html + `<div class="vuoto">${limitato() ? 'Con l\'abbonamento attivo.' : 'Leggo il percorso…'}</div>` + versione();
    return attaccaIndietroLV();
  }
  const { l, pc, lv } = p, vicino = MB21Check.piuVicino(pc.gradini), io = visto().id === ST.utente.id;
  html += `<div class="sotto">${esc(fraseTraguardo(p))}</div>`;
  for (const g of pc.gradini) {
    const lista = g.chiave === 'leader1' ? (l.luci || []).map(x => ({ testo: PUNTI_LC1[x.chiave] || x.titolo, fatto: x.ok })) : (g.voci || []);
    const mancano = g.chiave === 'leader1' ? (l.luci || []).filter(x => !x.ok).map(x => PUNTI_LC1[x.chiave] || x.titolo) : lista.filter(x => !x.fatto).map(x => x.testo);
    const sotto = g.fatto ? 'Raggiunto' : !g.pronto ? 'Leggo il Modulo Core…' : `${mancano.length === 1 ? 'Manca' : 'Mancano'}: ${mancaCorto(mancano)}`;
    html += rigaGradino(g.chiave, nomeGradino(g), sotto, g.fatti, g.totale, !!vicino && vicino.chiave === g.chiave);
  }
  if (lv) {
    html += `<div class="zona-oggi">I livelli${lv.doveSei ? ` · ${esc(lv.doveSei)}` : ' · ancora nessuno raggiunto'}</div>`;
    for (const r of lv.righe.filter(x => x.chiave !== 'plat')) { const [f, t] = conteggioVoci(r.voci); html += rigaGradino(r.chiave, r.titolo, r.sotto, f, t, false); }
  } else html += `<div class="zona-oggi">I livelli</div><div class="sotto">Leggo il file Amway…</div>`;
  app.innerHTML = html + versione();
  attaccaIndietroLV();
  app.querySelectorAll('[data-lv-grad]').forEach(b => b.onclick = () => vaiLV('gradino', { gradino: b.dataset.lvGrad }));
}
// Il gradino o il livello (terzo livello): la sua lista, voce per voce; per i livelli anche «Dove puoi crescere» con le persone da aiutare
function disegnaGradinoLV() {
  const p = percorsoDash();
  if (!p) return vaiLV('traguardo');
  const { l, pc, lv } = p, io = visto().id === ST.utente.id, nome = nomeProprio();
  const consiglio = c => !c ? '' : (() => {
    const t = esc(`Per ${io || !nome ? 'te' : nome}: ${c.cosa}`);
    return c.vai ? `<button class="prossimo vai" data-vai="${c.vai}"><span>${t}</span><span>›</span></button>` : `<div class="prossimo">${t}</div>`;
  })();
  const g = pc.gradini.find(x => x.chiave === LV.gradino), r = !g && lv && lv.righe.find(x => x.chiave === LV.gradino);
  if (!g && !r) return vaiLV('traguardo');
  let titolo, sotto, corpo;
  if (g) {
    titolo = nomeGradino(g);
    sotto = g.fatto ? 'Raggiunto' : g.chiave === 'core' ? `${g.fatti} abitudini su 7` : `Fatti ${g.fatti} passi su ${g.totale}`;
    const lista = g.chiave === 'leader1' ? (l.luci || []).map(x => ({ testo: PUNTI_LC1[x.chiave] || x.titolo, fatto: x.ok, stato: x.ok ? 'fatto' : x.ignoto ? 'non lo so' : x.testo })) : (g.voci || []);
    corpo = vociHtml(lista, null) + consiglio(g.consiglio) + (g.chiave === 'core' ? `<button class="ck-modulo" data-vai="core">${ic('crescita')} Modulo del mese<span>›</span></button>` : '');
  } else {
    const [f, t] = conteggioVoci(r.voci);
    titolo = r.titolo; sotto = r.fatto ? 'Raggiunto' : f === 0 ? `Ancora nessun passo su ${t}` : `${f === 1 ? 'Fatto 1 passo' : `Fatti ${f} passi`} su ${t}`;
    corpo = `<div class="sv-t">Segni Vitali</div>${vociHtml(r.voci, lv)}${passiHtml(r, lv.mese)}<p class="sotto">Il livello si accende quando tutta la lista è fatta.</p>`;
  }
  app.innerHTML = indietroLV() + `<h1>${esc(titolo)}</h1><div class="sotto">${esc(sotto)}</div><div class="riquadro lv-lista"><div class="ck-lc1">${corpo}</div></div>` + versione();
  attaccaIndietroLV();
}

// ── Il mio avvio (secondo livello del nuovo) ──
function disegnaAvvioLV() {
  AVV.mioAperto = true;   // nella sua pagina i 14 passi sono sempre aperti
  const dentro = mioAvvioHtml();
  if (!dentro) return vaiLV('home');   // avvio finito o in pausa: torna alla Dashboard
  app.innerHTML = indietroLV() + dentro + versione();
  attaccaIndietroLV();
}

// ── Il router: chi disegna cosa ──
function disegnaOggi() {
  if (ST.vistaCatalogo && ST.tab === 'lista') return disegnaCatalogo();   // «Da catalogare» (ora in Lista Nomi) usa le stesse funzioni: dopo ogni tocco si ridisegna da sé
  const vai = ST.vaiA; ST.vaiA = null;   // cantiere 29: dall'Agenda «N riordini da sentire» porta dritto al riquadro; dal benvenuto su «Il mio avvio»
  if (vai === 'riordini') { LV.vista = 'oggi'; LV.vaiA = 'riordini'; cambiaRigaDashAperta('riordini'); }
  if (vai === 'avvio') LV.vista = 'avvio';
  if (ST.oggi && LV.giorno !== ST.oggi) { LV.giorno = ST.oggi; LV.fatte = []; }   // le spunte dell'elenco valgono per oggi
  if (vediTutti()) {   // Partner Select «Tutti»: solo i numeri, ogni coda è di un partner
    app.innerHTML = `${testataDashboard()}<div class="sotto">${esc(dataEstesa(ST.oggi))}</div>` + dashboardTesta()
      + `<div class="vuoto">I contatti del giorno, le conferme e i riordini sono di ogni partner: sceglilo nel Partner Select per vederle.</div>` + dashboardBasso() + versione();
    return collegaDashboard();
  }
  switch (LV.vista) {
    case 'oggi': disegnaOggiLV(); break;
    case 'persona': disegnaPersonaLV(); break;
    case 'mese': disegnaMeseLV(); break;
    case 'area': disegnaMeseDashboard(LV.area); break;
    case 'traguardo': disegnaTraguardoLV(); break;
    case 'gradino': disegnaGradinoLV(); break;
    case 'avvio': disegnaAvvioLV(); break;
    default: LV.vista = 'home'; disegnaHome();
  }
  collegaVistaLV();
}
function cambiaRigaDashAperta(nome) { const a = aperteDash(); a[nome] = true; try { localStorage.setItem(CHIAVE_APERTE, JSON.stringify(a)); } catch (e) {} }
// I collegamenti che servono a più pagine: le righe dell'avvio, i pulsanti dei numeri, i consigli del percorso, le card della coda
function collegaVistaLV() {
  collegaDashboard();
  collegaMioAvvio();
  if (LV.vista === 'home') { mostraRigaTelefono(); mostraRiquadroObiettivi(); }
  if (ST.offline || limitato()) {
    app.querySelectorAll('.riga-coda, .bottoni button, button[data-scheda], button[data-conferma], #altri-catalogo').forEach(b => { b.disabled = true; b.onclick = null; });
    if (limitato()) return;
  }
  const sezGiorno = document.getElementById('sez-giorno');
  if (sezGiorno && !ST.offline && !limitato()) sezGiorno.onclick = apriCheck;
  collegaConferme();
  collegaRiordini();
  collegaScelte();
  collegaTracce();
  collegaMioPercorso();
  collegaCarteCoda();
  collegaPercorso(disegnaOggi);   // «Per te: …», i passi, «Non ora» (stessi del Check)
}

// Le card della coda e di «Da catalogare» (aprire, esiti, categorie, «Altri 5», scheda, elimina): stesse in Dashboard e nella pagina «Da catalogare» della Lista Nomi
function collegaCarteCoda() {
  app.querySelectorAll('.riga-coda').forEach(b => {
    b.onclick = () => { if (LV.vista === 'persona') return; ST.aperta = ST.aperta === b.dataset.apri ? null : b.dataset.apri; disegnaOggi(); };   // nella scheda della persona la card resta aperta
  });
  app.querySelectorAll('.bottoni button[data-contatto]').forEach(btn => {
    btn.onclick = () => toccaBottone(btn.dataset.contatto, Number(btn.dataset.bottone));
  });
  app.querySelectorAll('.bottoni button[data-cataloga]').forEach(btn => {
    btn.onclick = () => toccaCategoria(btn.dataset.cataloga, Number(btn.dataset.scelta));
  });
  const altri = document.getElementById('altri-catalogo');
  if (altri) altri.onclick = () => { ST.catalogoAltri = (ST.catalogoAltri || 0) + MB21Coda.QUOTA_CATALOGO; ST.dashLetta = 0; caricaOggi(); };
  app.querySelectorAll('button[data-scheda]').forEach(btn => {   // scheda contatto dalla coda e da Da catalogare (15/09)
    btn.onclick = () => apriContattoDa(btn.dataset.scheda, ST.vistaCatalogo ? 'catalogo' : 'oggi');
  });
  app.querySelectorAll('button[data-elimina-cat]').forEach(btn => {   // Elimina dentro «Da catalogare» (Ignazio 24/09): stessa funzione della Lista Nomi
    btn.onclick = () => {
      const c = (ST.catalogo && ST.catalogo.righe.find(x => x.id === btn.dataset.eliminaCat));
      if (c) elimina(c, caricaOggi);
    };
  });
}

// ── DA CATALOGARE (cantiere 16, decisioni di Ignazio 15/09 · brief F7 §4c) ──
// 5 senza categoria al giorno in ordine alfabetico, in più della coda. Il tocco sceglie la categoria
// (`cataloga_contatto`), con Annulla. Referral non c'è. Per ora l'Admin su un altro partner guarda soltanto.
const CATEGORIE_CATALOGO = [
  { etichetta: 'Prospect', categoria: 'Prospect' }, { etichetta: 'Partner', categoria: 'Partner' },
  { etichetta: 'Cliente', categoria: 'Cliente' }, { etichetta: 'Ex Partner/Cliente', categoria: 'Ex Partner/Cliente' },
  { etichetta: 'Non collegato', categoria: 'Unlinked' }, { etichetta: 'Archivia', categoria: 'Archiviato', classe: 'no' },
];
const ICONE_CAT = { 'Prospect': 'prospect', 'Partner': 'partner', 'Cliente': 'cliente', 'Ex Partner/Cliente': 'ex', 'Unlinked': 'unlinked', 'Archiviato': 'archiviato' };
// «Da catalogare» sta in Lista Nomi (Ignazio 01/10): una riga in cima alla lista, il tocco apre la pagina con le stesse card di prima
function catalogoRigaHtml() {
  const cat = ST.catalogo;
  if (!cat || !ST.stato) return '';
  const fatti = ST.stato.catalogati_oggi || 0;
  if (!cat.totale && !fatti) return '';
  // Ignazio 24/09: «fatti 20 di 20» sembrava un traguardo raggiunto: si dice quanti ne restano e quanti ne ha già fatti oggi (i 5 al giorno sono il ritmo, non un tetto)
  const ne = guardoAltri() ? 'ne ha catalogati' : 'ne hai catalogati';
  const sotto = cat.totale ? `${cat.totale} ancora da catalogare · oggi ${ne} ${fatti}` : `Tutti catalogati · oggi ${ne} ${fatti}`;
  return `<div class="ls-catalogo">${rigaApribile('lista-catalogo', 'catalogare' + (cat.totale ? '' : ' fatta'), cat.totale ? 'catalogare' : 'fatto', 'Da catalogare', sotto, false, cat.righe.length)}</div>`;
}
function disegnaCatalogo() {
  const cat = ST.catalogo, altro = guardoAltri();
  if (!cat || !ST.stato) { ST.vistaCatalogo = false; return disegnaLista(); }
  const fatti = ST.stato.catalogati_oggi || 0, ne = altro ? 'ne ha catalogati' : 'ne hai catalogati';
  const sotto = cat.totale ? `${cat.totale} ancora da catalogare · oggi ${ne} ${fatti}` : `Tutti catalogati · oggi ${ne} ${fatti}`;
  const corpo = cat.righe.length ? cat.righe.map(cardCatalogo).join('')
    : `<div class="vuoto">${cat.totale ? `Per oggi ${altro ? 'ha' : 'hai'} finito: ${fatti} ${fatti === 1 ? 'catalogato' : 'catalogati'}. ${ic('complimenti')}` : 'Tutti catalogati. ' + ic('complimenti')}</div>`
      + (cat.totale && !altro ? `<button class="primario" id="altri-catalogo">Altri ${MB21Coda.QUOTA_CATALOGO}</button>` : '');
  app.innerHTML = `<button class="indietro" id="indietro">‹ Lista Nomi</button><h1>Da catalogare</h1>
    <div class="sotto" style="margin-bottom:8px">${sotto}</div>
    ${altro ? `<div class="sotto">${ic('visione')} Solo da guardare, per ora.</div>` : ''}${corpo}${versione()}`;
  document.getElementById('indietro').onclick = () => { ST.vistaCatalogo = false; window.scrollTo(0, 0); disegnaLista(); };
  if (limitato()) {   // abbonamento scaduto: si vede, non si tocca (come in Dashboard)
    app.querySelectorAll('.riga-coda, .bottoni button, button[data-scheda], #altri-catalogo').forEach(b => { b.disabled = true; b.onclick = null; });
    return;
  }
  collegaCarteCoda();
}
function cardCatalogo(r) {
  const aperta = ST.aperta === r.id || !!r.categoria;   // catalogato da chiamare: resta aperto
  const testa = `
    <button class="riga-coda" data-apri="${esc(r.id)}" aria-expanded="${aperta}">
      <span class="rc-pastiglia">${esc(iniziali(r.nome))}</span><span class="rc-alto"><span class="nome">${esc(r.nome)}${nuovoBadge(r)}</span></span>
      <span class="rc-glide">${esc(r.categoria ? `✓ ${MB21Lista.nomeCategoria(r.categoria)} · chiamalo ora` : (r.professione || 'Senza categoria'))}</span>
      <span class="rc-freccia">${aperta ? '⌃' : '›'}</span>
    </button>`;
  if (!aperta) return `<div class="card compatta ${classeCat(r.categoria)}" id="card-${esc(r.id)}">${testa}</div>`;
  const luogo = [r.citta, r.fascia_eta].filter(Boolean).join(' · ');
  const bottoni = r.categoria
    ? bottoniCodaHtml(r, guardoAltri())   // come la coda, ma non conta nei contatti al giorno
    : CATEGORIE_CATALOGO.map((b, i) =>
      // scelta «A» di Ignazio (19/09, tools/design/confronto_catalogare.html): le tre categorie con cui si lavora hanno il tondo pieno del loro colore
      // con l'icona, come i tondi delle persone; Ex, Unlinked e Archivia stanno sotto, scritte piccole
      i < 3 ? `<button class="grande ${classeCat(b.categoria)}" data-cataloga="${esc(r.id)}" data-scelta="${i}" ${guardoAltri() ? 'disabled' : ''}><span>${ic(ICONE_CAT[b.categoria])}</span>${esc(b.etichetta)}</button>`
        : `<button class="piccola ${b.classe || ''}" data-cataloga="${esc(r.id)}" data-scelta="${i}" ${guardoAltri() ? 'disabled' : ''}>${ic(ICONE_CAT[b.categoria])} ${esc(b.etichetta)}</button>`).join('');
  return `
    <div class="card compatta aperta ${classeCat(r.categoria)}" id="card-${esc(r.id)}">
      ${testa}
      <div class="corpo">
        ${luogo ? `<div class="luogo">${esc(luogo)}</div>` : ''}
        ${contattaHtml(r.telefono)}
        ${r.note ? `<div class="luogo">Note: ${esc(r.note)}</div>` : ''}
        ${r.referral_di ? `<div class="luogo">Contatto e/o Incaricato di: ${esc(r.referral_di)}</div>` : ''}
        <div class="bottoni ${r.categoria ? 'due-righe' : 'scegli-cat'}">${bottoni}</div>
        ${r.categoria ? '' : `<small class="mc-cat-nota">Non collegato: ${esc(MB21Lista.SPIEGA_CATEGORIA.Unlinked.toLowerCase())}</small>`}
        <div class="cat-comandi">
          <button class="link" data-scheda="${esc(r.id)}">${ic('persona')} Apri contatto</button>
          ${guardoAltri() ? '' : `<button class="link elimina-qui" data-elimina-cat="${esc(r.id)}">${ic('elimina')} Elimina</button>`}
        </div>
      </div>
    </div>`;
}
async function toccaCategoria(id, indice) {
  const contatto = ST.catalogo.righe.find(x => x.id === id);
  if (!contatto) return;
  const scelta = CATEGORIE_CATALOGO[indice];
  const eraPartner = contatto.categoria === 'Partner';
  const card = document.getElementById('card-' + id);
  card.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const { data: prima, error } = await dbq('cataloga', supa.rpc('cataloga_contatto', { p_contatto: id, p_categoria: scelta.categoria }));
  if (error) {
    card.querySelectorAll('button').forEach(b => { b.disabled = false; });
    return mostraToast('Non salvato: controlla la connessione e riprova.');
  }
  const daChiamare = ['Prospect', 'Partner', 'Cliente'].includes(scelta.categoria);
  const dopo = () => {
    // da chiamare: la card resta con i bottoni esito (se non lo chiami, domani entra in coda); gli altri escono
    if (daChiamare) { contatto.categoria = scelta.categoria; contatto.user_id = contatto.user_id || visto().id; }
    else ST.catalogo.righe.splice(ST.catalogo.righe.indexOf(contatto), 1);
    ST.catalogo.totale--;
    ST.stato.catalogati_oggi = (ST.stato.catalogati_oggi || 0) + 1;
    ST.aperta = daChiamare ? id : null;
    disegnaOggi();
    mostraToast(`${contatto.nome} · ${scelta.etichetta}`, () => annullaCatalogo(contatto, prima, daChiamare, indice));
    if (scelta.categoria === 'Partner' && !eraPartner) domandaInvito(contatto);
  };
  if (daChiamare) return dopo();
  card.classList.add('via');
  setTimeout(dopo, 250);
}
async function annullaCatalogo(contatto, prima, daChiamare, indice) {
  const { error } = await dbq('annulla catalogo', supa.rpc('annulla_catalogo',
    { p_contatto: contatto.id, p_rientro: prima.rientro_prec, p_in_coda: prima.in_coda_prec }));
  if (error) return mostraToast('Annullamento non riuscito: riprova.');
  contatto.categoria = null;
  if (!daChiamare) {   // rimetti il nome in ordine alfabetico
    const righe = ST.catalogo.righe;
    const i = righe.findIndex(x => !x.categoria && (x.nome || '').localeCompare(contatto.nome || '', 'it', { sensitivity: 'base' }) > 0);
    righe.splice(i < 0 ? righe.length : i, 0, contatto);
  }
  ST.catalogo.totale++;
  ST.stato.catalogati_oggi--;
  disegnaOggi();
  mostraToast('Annullato');
}

// 'catalogo' = i catalogati in «Da catalogare» che si chiamano subito (cantiere 16, lavoro 3)
function listaDi(nome) { return nome === 'catalogo' ? ST.catalogo.righe : ST.risultato[nome]; }
function trovaInCoda(id) {
  for (const lista of ['dareSeguito', 'coda', 'catalogo']) {
    if (lista === 'catalogo' && !ST.catalogo) continue;
    const i = listaDi(lista).findIndex(x => x.id === id);
    if (i >= 0) return { lista, i, contatto: listaDi(lista)[i] };
  }
  return null;
}

async function toccaBottone(id, indice) {
  const pos = trovaInCoda(id);
  if (!pos) return;
  const bottone = bottoniPer(pos.contatto.categoria)[indice];
  let data = null, appuntamento = null;
  if (bottone.classe === 'appuntamento') {   // dal 15/09 crea l'appuntamento vero in Agenda
    appuntamento = await appuntamentoDaCoda(pos.contatto, bottone.etichetta);
    if (!appuntamento) return;
    data = appuntamento.inizio;
  } else if (bottone.data) {
    data = await chiediData(bottone, pos.contatto.nome);
    if (!data) return;                       // annullato dal foglio
  }
  const card = document.getElementById('card-' + id);
  card.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const daCoda = pos.lista === 'coda';   // i Dare Seguito non contano nei contatti al giorno
  const { data: esito, error } = await registraEsito(id, bottone, data, daCoda);
  if (error) {
    if (appuntamento) await dbq('togli appuntamento', supa.from('azioni').delete().eq('id', appuntamento.id));
    card.querySelectorAll('button').forEach(b => { b.disabled = false; });
    return mostraToast('Non salvato: controlla la connessione e riprova.');
  }
  if (appuntamento) esito.appuntamento_id = appuntamento.id;
  // Consulenza Prodotti fissata: il contatto esce dalla coda e lo segue l'appuntamento, come per PM Fissato e Appuntamento: dal 04/10 lo fa
  // `registra_esito` con la regola unica del rientro (applica_rientro, nota 030); prima qui c'era una scrittura in più dal telefono
  const rientro = bottone.rientro ? await chiediRientro(id, pos.contatto.nome, bottone.etichetta, MB21Agenda.giorniRisentire(bottone.etichetta)) : null;   // Annulla rimette il rientro di prima
  card.classList.add('via');
  setTimeout(() => {
    listaDi(pos.lista).splice(pos.i, 1);
    if (daCoda) ST.stato.fatti_oggi++;
    salvaCache();
    disegnaOggi();
    mostraToast(`${pos.contatto.nome} · ${appuntamento ? 'appuntamento fissato' : bottone.etichetta}${rientro ? ' · risentirlo il ' + dataBreve(rientro) : ''}`, () => annulla(pos, esito));
    // per ultimo il momento di riflessione (cantiere 42), sulla telefonata appena registrata; con «Ordine» alla chiusura del modulo Vendita
    // (la categoria serve al coach: la chat delle telefonate è per chi non è Partner né Cliente)
    const riflessione = () => chiediRiflessione({ id: esito.azione_id, contatto_id: id, user_id: pos.contatto.user_id, incontro: appuntamento || undefined, tipo_azione: 'Contatto', modalita: 'Telefonata',
      contatti: { nome: pos.contatto.nome, categoria: pos.contatto.categoria } }, bottone.etichetta);
    if (bottone.vendita) registraVenditaDa(id, pos.contatto.nome, pos.contatto.categoria, undefined, riflessione)   // «Ordine»: «La registri adesso?»
      .then(registrata => { if (!registrata) riflessione(); });
    else tracciaDiApertura(appuntamento, pos.contatto, riflessione);   // un Piano Marketing fissato: prima «Hai condiviso la traccia di apertura?», poi la chat del coach
  }, 250);
}

// Bottone «Appuntamento» (coda e «Azione +»): foglio Nuovo appuntamento dell'Agenda, già compilato.
// Restituisce { id, inizio } dell'appuntamento creato, o null se annullato.
// Lo stesso foglio per tutti: dalla coda, dall'Agenda e dalla scheda (`MB21Agenda.dopoTelefonata` decide cosa si fissa per quell'esito)
function appuntamentoDaCoda(contatto, esito) {
  const proposta = (esito && MB21Agenda.dopoTelefonata(contatto.categoria, esito).proposta) || MB21Agenda.tipoDaCoda(contatto.categoria);
  return nuovoAppuntamento({
    titolo: `Appuntamento · ${contatto.nome}`, resta: true,
    giorno: MB21Agenda.spostaGiorno(MB21Coda.oggiRoma(), 1), ora: '18:30',
    contatto: { id: contatto.id, nome: contatto.nome, categoria: contatto.categoria },
    categoria: proposta.categoria, tipo: proposta.tipo, modalita: proposta.modalita,
    userId: contatto.user_id,   // l'appuntamento è del proprietario del contatto (come l'esito)
  });
}

// Un esito (Dashboard e scheda contatto usano lo stesso codice) e il suo annullamento.
function registraEsito(contattoId, bottone, data, daCoda) {
  return dbq('registra esito', supa.rpc('registra_esito',
    { p_contatto: contattoId, p_chiave: bottone.chiave, p_data: data, p_da_coda: daCoda }));
}
// Prima l'esito (il database rifiuta se nel frattempo ce n'è un altro, nota 045), poi l'appuntamento nato con lui: se il secondo passo non riesce resta un appuntamento
// in più da eliminare, non un esito vivo senza appuntamento (prima l'ordine era l'opposto)
async function annullaEsito(esito) {
  const r = await dbq('annulla esito', supa.rpc('annulla_esito',
    { p_azione: esito.azione_id, p_rientro: esito.rientro_prec, p_in_coda: esito.in_coda_prec }));
  if (!r.error && esito.appuntamento_id) await dbq('annulla appuntamento', supa.from('azioni').delete().eq('id', esito.appuntamento_id));
  return r;
}

async function annulla(pos, esito) {
  const { error } = await annullaEsito(esito);
  if (error) return mostraToast(/altri|altre azioni/i.test(error.message || '') ? 'Non si può annullare: dopo questo esito ce ne sono altri.' : 'Annullamento non riuscito: riprova.');
  listaDi(pos.lista).splice(pos.i, 0, pos.contatto);
  if (pos.lista === 'coda') ST.stato.fatti_oggi--;
  salvaCache();
  disegnaOggi();
  mostraToast('Annullato');
}

function salvaCache() {
  try { localStorage.setItem(CHIAVE_CACHE, JSON.stringify({ oggi: ST.oggi, risultato: ST.risultato, stato: ST.stato, salvata: new Date().toISOString() })); } catch (e) {}
}

// «Quando risentirlo?» dopo un esito che chiude la relazione (No Interesse, No BuonFine: data già a un anno) e dopo «Relazione»
// (20 giorni, Ignazio 25/09), cambiabile. `giorni` da MB21Agenda.giorniRisentire.
// Scrive `rientro_il` del contatto (il giorno in cui rientra in coda). Stesso foglio da coda, Agenda e scheda. Restituisce il giorno o null.
async function chiediRientro(contattoId, nome, esito, giorni = MB21Agenda.GIORNI_CHIUSURA) {
  const tra = giorni === MB21Agenda.GIORNI_CHIUSURA ? 'un anno' : `${giorni} giorni`;
  const iso = await chiediData({ etichetta: 'Quando risentirlo?', data: 'giorno', giorni, testo: `${esito}: rientra in coda tra ${tra}, o quando vuoi tu` }, nome);
  if (!iso) return null;
  const giorno = MB21Coda.oggiRoma(new Date(iso));
  const { error } = await dbq('giorno di rientro', supa.from('contatti').update({ rientro_il: giorno, in_coda_dal: null }).eq('id', contattoId));
  if (error) { mostraToast('Data non salvata: resta un anno.'); return null; }
  return giorno;
}

// Foglio in basso per scegliere il giorno (e l'ora per l'appuntamento). Restituisce un ISO o null.
// bottone.giorni: giorno proposto = oggi + giorni (predefinito domani); bottone.testo: riga sotto il nome
function chiediData(bottone, nome) {
  const proposto = MB21Coda.oggiRoma(new Date(Date.now() + (bottone.giorni || 1) * 86400000));
  return new Promise(risolvi => {
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.innerHTML = `
      <div class="foglio">
        <h3>${esc(bottone.etichetta)}</h3>
        <p>${esc(nome)}${bottone.testo ? `<br><small>${esc(bottone.testo)}</small>` : ''}</p>
        <input id="scelta-giorno" type="date" value="${proposto}" min="${MB21Coda.oggiRoma()}">
        ${bottone.data === 'giorno-ora' ? '<input id="scelta-ora" type="time" value="18:30">' : ''}
        <div class="due">
          <button class="link" id="scelta-no">Annulla</button>
          <button class="primario" id="scelta-si">Conferma</button>
        </div>
      </div>`;
    document.body.appendChild(velo);
    const chiudi = valore => { velo.remove(); risolvi(valore); };
    velo.onclick = e => { if (e.target === velo) chiudi(null); };
    velo.querySelector('#scelta-no').onclick = () => chiudi(null);
    velo.querySelector('#scelta-si').onclick = () => {
      const giorno = velo.querySelector('#scelta-giorno').value;
      if (!giorno) return;
      const ora = bottone.data === 'giorno-ora' ? (velo.querySelector('#scelta-ora').value || '12:00') : '12:00';
      chiudi(new Date(`${giorno}T${ora}:00`).toISOString());   // ora del telefono (Italia)
    };
  });
}

// Contatti al giorno (1-10): è il massimo di esiti dalla coda in un giorno. Dal cantiere 25 si cambia nel Profilo
// (Ignazio 17/09: «solo profilo»); in Dashboard resta la scritta «Fatti N di M». `dopo` = cosa ridisegnare.
function scegliNumero(dopo = caricaOggi) {
  const attuale = ST.stato.contatti_al_giorno;
  const velo = document.createElement('div');
  velo.className = 'velo';
  velo.innerHTML = `
    <div class="foglio">
      <h3>Contatti al giorno</h3>
      <p>Quanti contatti vuoi lavorare ogni giorno. I Dare Seguito scaduti si aggiungono sempre.</p>
      <div class="numeri">${Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
        `<button class="${n === attuale ? 'scelto' : ''}" data-n="${n}">${n}</button>`).join('')}</div>
      <button class="link" data-n="0" style="display:block;margin:0 auto 4px;${attuale === 0 ? 'font-weight:700' : ''}">0 · Mi prendo una pausa</button>
      <div class="sotto" style="text-align:center;margin-bottom:6px">In pausa: niente coda, niente Dare Seguito e niente Buongiorno del mattino. Si riparte quando vuoi.</div>
      <button class="link" id="numero-no">Annulla</button>
    </div>`;
  document.body.appendChild(velo);
  velo.onclick = e => { if (e.target === velo) velo.remove(); };
  velo.querySelector('#numero-no').onclick = () => velo.remove();
  velo.querySelectorAll('[data-n]').forEach(b => {
    b.onclick = async () => {
      const n = Number(b.dataset.n);
      velo.remove();
      if (n === attuale) return;
      const { error } = await dbq('contatti al giorno', supa.rpc('imposta_contatti_al_giorno', { p_numero: n }));
      if (error) return mostraToast('Non salvato: controlla la connessione e riprova.');
      mostraToast(n === 0 ? 'Sei in pausa: 0 contatti al giorno' : `Contatti al giorno: ${n}`);
      ST.stato.contatti_al_giorno = n;
      dopo();   // dalla Dashboard la coda si riempie con un numero più alto
    };
  });
}


// ── CONFERME (15/09) ─────────────────────────────────────
// Appuntamenti del partner loggato da confermare: compaiono 12 ore prima, fino all'inizio (agenda.js → confermeDaFare).
// In Dashboard sopra la coda, non contano nei contatti al giorno. In Agenda, per oggi, il riepilogo.
const CONF = { righe: [], nonRisponde: new Set() };
const CAMPI_AZIONE = '*, contatti(nome, categoria, telefono), utenti!azioni_user_id_fkey(nome, nome_cognome)';

async function caricaConferme() {
  try {
    const A = MB21Agenda, adesso = new Date(), limite = new Date(adesso.getTime() + A.ORE_CONFERMA * 3600000);
    const [app1, coda] = await Promise.all([
      dbq('conferme appuntamenti', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', idVisti()).neq('tipo_azione', 'Contatto')
        .eq('completata', false).is('confermato_il', null).gt('inizio', adesso.toISOString()).lte('inizio', limite.toISOString())),
      dbq('conferme dalla coda', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', idVisti()).eq('tipo_azione', 'Contatto')
        .in('esito', ['PM Fissato', 'Appuntamento']).is('confermato_il', null).gt('data_scelta', adesso.toISOString()).lte('data_scelta', limite.toISOString())),
    ]);
    if (app1.error || coda.error) throw app1.error || coda.error;
    CONF.righe = A.confermeDaFare(A.senzaDoppioniCoda([...app1.data, ...coda.data]), adesso.toISOString());
  } catch (e) {
    CONF.righe = [];
  }
}

function confermeHtml(solo) {
  if (!CONF.righe.length) return '';
  const ordinate = CONF.righe.filter(c => !solo || c.id === solo).sort((a, b) => CONF.nonRisponde.has(a.id) - CONF.nonRisponde.has(b.id));
  return ordinate.map(c => {
    const tel = c.contatti && c.contatti.telefono;
    return `<div class="card conferma" id="conf-${esc(c.id)}"><div class="strip" style="background:${MB21Agenda.COLORI[c.tipo_azione] || 'var(--az-contatto)'}"></div>
      <div class="corpo">
        <div class="nome">${esc(c.contatti ? c.contatti.nome : '')}</div>
        <div class="conf-testo">${esc(MB21Agenda.testoConferma(c, new Date().toISOString()))}</div>
        ${CONF.nonRisponde.has(c.id) ? '<div class="conf-nr">' + ic('telefonooff') + ' Non risponde · riprova più tardi</div>' : ''}
        ${contattaHtml(tel)}
        <div class="bottoni conf-bottoni">
          <button class="appuntamento" data-conferma="si" data-id="${esc(c.id)}" ${ST.offline ? 'disabled' : ''}>Confermato</button>
          <button data-conferma="sposta" data-id="${esc(c.id)}" ${ST.offline ? 'disabled' : ''}>Sposta</button>
          <button class="no" data-conferma="annulla" data-id="${esc(c.id)}" ${ST.offline ? 'disabled' : ''}>Annullato</button>
          <button data-conferma="nr" data-id="${esc(c.id)}">Non risponde</button>
        </div>
      </div></div>`;
  }).join('');
}

function collegaConferme() {
  app.querySelectorAll('[data-conferma]').forEach(b => {
    b.onclick = async () => {
      const c = CONF.righe.find(x => x.id === b.dataset.id);
      if (!c) return;
      if (b.dataset.conferma === 'nr') { CONF.nonRisponde.add(c.id); return LV.vista === 'persona' ? vaiLV('oggi') : disegnaOggi(); }   // dalla scheda si torna all'elenco
      if (b.dataset.conferma === 'sposta') return spostaAppuntamento(c, async () => { await caricaConferme(); disegnaOggi(); });
      if (b.dataset.conferma === 'annulla') return annullaAppuntamentoDash(c);
      const { error } = await dbq('conferma', supa.from('azioni').update({ confermato_il: new Date().toISOString() }).eq('id', c.id));
      if (error) return mostraToast('Non salvato: controlla la connessione e riprova.');
      CONF.righe = CONF.righe.filter(x => x.id !== c.id);
      disegnaOggi();
      mostraToast(`${c.contatti ? c.contatti.nome : ''} · confermato`, async () => {
        await dbqAvvisa('annulla conferma', supa.from('azioni').update({ confermato_il: null }).eq('id', c.id), 'Annullamento non riuscito: controlla la connessione e riprova.');
        await caricaConferme();
        disegnaOggi();
      });
    };
  });
}

// «Annullato» (Ignazio 04/10): l'appuntamento non si fa più. Sparisce dall'Agenda e dalle conferme; la funzione del database tiene una copia (la stessa di «Elimina»,
// nota 010) e «Annulla» nell'avviso lo rimette com'era, con il rientro del contatto.
async function annullaAppuntamentoDash(c) {
  const nome = c.contatti ? c.contatti.nome : '';
  if (!await chiediConferma('Annullo questo appuntamento?', `${nome ? nome + ': ' : ''}sparisce dall'Agenda e dalle conferme. Se cambi idea, dopo tocchi «Annulla».`, 'Sì, annullo', true)) return;
  const { error } = await dbq('annulla appuntamento', supa.rpc('elimina_azione', { p_azione: c.id }));
  if (error) return mostraToast('Non annullato: controlla la connessione e riprova.');
  CONF.righe = CONF.righe.filter(x => x.id !== c.id);
  await aggiornaRiga(c.contatto_id);   // il rientro del contatto può essere cambiato
  disegnaOggi();
  mostraToast(`${nome ? nome + ' · ' : ''}appuntamento annullato`, async () => {
    const { error: e2 } = await dbq('ripristina appuntamento', supa.rpc('annulla_elimina_azione', { p_azione: c.id }));
    if (e2) return mostraToast('Non ripristinato: riprova.');
    await aggiornaRiga(c.contatto_id);
    await caricaConferme();
    disegnaOggi();
    mostraToast('Appuntamento ripristinato');
  });
}

// ── TELEFONATE SCELTE A MANO (Azioni, nota 012; decisioni di Ignazio 04/10/2026) ────
// Una telefonata che il partner programma da sé (scheda → «Nuova azione», Agenda → «+», tipo Contatto · Telefonata: `azioni.scelta_a_mano`)
// sta qui, in più dei contatti del giorno, dal giorno scelto e finché non ha un esito (anche il giorno dopo: non sparisce). Con l'ora sta anche
// in Agenda; senza (`senza_ora`) solo qui. La scheda è una sola: è la riga di `azioni`, e l'esito la chiude con `chiudiAppuntamento` come dall'Agenda
// (stesso foglio dopo la telefonata, stessa chat del coach, stesso Annulla). Chi ha una telefonata aperta qui non entra nella coda automatica.
// Il conto del giorno (`stato_oggi`) conta anche queste, fatte oggi: «5 di 5 ✓ e 3 in più» (MB21Coda.contoGiorno), mai «3 di 10».
const SCE = { righe: [] };
async function caricaScelte(oggi) {
  try {
    if (vediTutti()) { SCE.righe = []; return; }
    const { data, error } = await dbq('telefonate scelte a mano', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', idVisti())
      .eq('tipo_azione', 'Contatto').eq('scelta_a_mano', true).eq('completata', false).is('esito', null)
      .lt('inizio', MB21Agenda.isoDaRoma(MB21Agenda.spostaGiorno(oggi, 1), '00:00')).order('inizio'));
    if (error) throw error;
    SCE.righe = MB21Coda.telefonateScelte(data, oggi);
  } catch (e) {
    SCE.righe = [];
  }
}
// la riga sotto il nome: «Alle 10:30» · «Senza orario» · «… · era per ieri» se è rimasta aperta
function sottoScelta(a) {
  const quando = a.senza_ora ? 'Senza orario' : `Alle ${MB21Agenda.partiRoma(a.inizio).ora}`;
  return a.ritardo ? `${quando} · era per ${a.ritardo === 1 ? 'ieri' : 'il ' + dataBreve(a.giorno)}` : quando;
}
// la scheda aperta: promemoria e preparazione come in coda, telefono, gli esiti della telefonata su due righe (gli stessi della coda), «Apri contatto»
function sceltaHtml(a) {
  const categoria = (a.contatti && a.contatti.categoria) || a.categoria, nome = a.contatti ? a.contatti.nome : '';
  const tutti = bottoniPer(categoria), spento = ST.offline || soloGuardo() ? 'disabled' : '';
  const bottoni = MB21Agenda.esitiInDueRighe(tutti.map(b => b.etichetta)).map((riga, n) =>
    `<div class="${n === 0 ? 'buoni' : 'nonandati'}">${riga.map(f => `<button class="${(tutti.find(b => b.etichetta === f) || {}).classe || ''}" data-scelta-id="${esc(a.id)}" data-scelta-esito="${esc(f)}" ${spento}>${esc(f)}</button>`).join('')}</div>`).join('');
  return `<div class="card compatta aperta ${classeCat(categoria)}" data-scelta="${esc(a.id)}">
      <div class="corpo">
        <div class="luogo">${esc(sottoScelta(a))}${a.note ? ` · ${esc(a.note)}` : ''}</div>
        ${ricordoHtml(a.contatto_id, nome)}
        ${preparaChiamataHtml(a.contatto_id)}
        ${contattaHtml(a.contatti && a.contatti.telefono)}
        <div class="bottoni due-righe">${bottoni}</div>
        <button class="link" data-scheda="${esc(a.contatto_id)}">${ic('persona')} Apri contatto</button>
      </div></div>`;
}
// dopo l'esito (o il suo Annulla) si rileggono le telefonate scelte e il conto di oggi: due letture leggere, non tutta la Dashboard
async function rileggiStato() {
  const { data, error } = await dbq('stato di oggi', supa.rpc('stato_oggi', guardoAltri() ? { p_utente: visto().id } : {}));
  if (!error && data) ST.stato = data;
}
function collegaScelte() {
  app.querySelectorAll('[data-scelta-esito]').forEach(b => {
    const a = SCE.righe.find(x => x.id === b.dataset.sceltaId);
    if (!a) return;
    // dopo l'esito (o il suo Annulla): le telefonate scelte, il conto di oggi e la riga della persona in Lista; non tutta la Dashboard
    const dopo = async () => { await Promise.all([caricaScelte(ST.oggi), rileggiStato(), aggiornaRiga(a.contatto_id)]); salvaCache(); disegnaOggi(); };
    // senza orario l'ora della telefonata è adesso (la mette anche il database, chiudendo): così non passa per «storico» e il coach si apre
    const e = { ...a, categoria: a.categoria || (a.contatti && a.contatti.categoria), inizio: a.senza_ora ? new Date().toISOString() : a.inizio };
    b.onclick = () => chiudiAppuntamento(e, b.dataset.sceltaEsito, { dopo });
  });
}

// ── RIORDINI DA SENTIRE (cantiere 27 lavoro 1, 18/09) ────
// La telefonata «Riordino» che la vendita scrive in Agenda (10 giorni prima del riordino) si vedeva solo lì: qui ha il suo riquadro,
// sopra la coda come le conferme, senza consumare i posti della coda. Resta finché non ha un esito. Bottoni esito: gli stessi dell'Agenda.
// ── Partner da avviare e «Il mio avvio» (cantiere 31 lavori 2 e 3, decisioni di Ignazio 18/09) ──
// Per sponsor e upline: i partner del proprio ramo con l'avvio aperto e almeno un passo da fare (`avvio_del_ramo()` nel database:
// per ognuno vale la scheda dello sponsor, o del primo upline che ce l'ha, seguendo la mappa Amway; esce solo il percorso, mai
// telefoni e note). In Dashboard una riga sola «🚀 N partner da avviare ›»; il tocco apre la pagina dei nomi, dal più recente.
// Accanto al nome, tra [ ], lo sponsor Amway («così io come upline so a chi rivolgermi»). Chi è fermo per ora va «⏸ In pausa»:
// esce dall'elenco e dal numero, resta in fondo alla pagina («⏸ In pausa · N ›») e si riprende con un tocco.
// Segue il Partner Select (il ramo del partner guardato); con «Tutti» e offline non si mostra. Chi ha la scheda in lista (o l'Admin)
// la apre dal nome; gli altri upline vedono soltanto. **Per ora solo l'Admin spunta i passi e chiude l'avvio da qui** (Ignazio:
// «poi il leader»): scrive sulla scheda che vale, anche quando è nella lista di un altro.
// Dal 19/09 (Ignazio: «anche lo sponsor lo può mettere in pausa»): chi ha la scheda nella SUA lista ha qui gli stessi comandi che ha
// già nella scheda (passi, pausa, concluso, riprendi); gli altri upline vedono soltanto. In pausa da più di un anno
// (`MB21Lista.pausaLunga`): accanto a «▶️ Riprendi» c'è «🔄 Riprendi da capo», che toglie la pausa e spegne i 14 passi (con Annulla).
// In alto «ℹ️ Come funziona», chiusa, con il riassunto di tutto.
// Lavoro 4 (Ignazio 19/09: «l'app propone ed io decido»): «💡 L'app propone» elenca i passi spenti che l'app sa già (`MB21Lista.proposteAvvio`
// su `sa` di `avvio_del_ramo()`), con il perché; niente si accende da solo, «Segna» è lo stesso tocco del passo.
// Per il nuovo: «🚀 Il mio avvio» nella SUA Dashboard (`mio_avvio()`, `smarca_mio_passo()`): vede i suoi 14 passi e li smarca da solo;
// la scheda resta nella lista dello sponsor e lui non la vede. Sparisce con l'avvio concluso, in pausa o a passi finiti.
// Cantiere 32 (Ignazio 19/09): «Il mio avvio» c'è dal primo giorno, anche senza la scheda nella lista dello sponsor (`mio_percorso()`:
// con la scheda legge quella, senza legge i passi propri, che passano alla scheda da soli quando arriva); il primo passo si chiama
// «Perché iniziare» e sotto, in piccolo, ha le voci scelte nel benvenuto (`perche`: le proprie da `mio_percorso()`, quelle dei partner
// del Team da `avvio_del_team()`, che dentro ha `avvio_del_ramo()` tale e quale). I passi «Perché iniziare» e «Lista Start» del
// proprio avvio non si spuntano a mano: aprono la loro schermata del benvenuto (pagina-benvenuto.js), che li spunta.
const AVV = { tutte: [], righe: [], pausa: [], aperto: null, pausaAperta: false, comeAperto: false, mio: null, mioAperto: false, perche: {} };
function ricalcolaAvvio() {
  AVV.righe = MB21Lista.partnerDaAvviare(AVV.tutte, visto().partner_id);
  AVV.pausa = MB21Lista.partnerInPausa(AVV.tutte, visto().partner_id);
}
async function caricaAvvio() {
  AVV.tutte = []; AVV.mio = null; AVV.perche = {};
  if (!ST.offline && !vediTutti()) try {
    const [team, mio] = await Promise.all([
      dbq('avvio del Team', supa.rpc('avvio_del_team')),
      guardoAltri() ? { data: null } : dbq('il mio percorso', supa.rpc('mio_percorso')),
    ]);
    if (!team.error && team.data) { AVV.tutte = team.data.ramo || []; AVV.perche = team.data.perche || {}; }
    if (!mio.error) AVV.mio = mio.data || null;
  } catch (e) {}
  ricalcolaAvvio();
}
// Le voci di «Perché iniziare» in piccolo sotto il passo: stesso disegno in «Il mio avvio», «Partner da avviare» e scheda del Partner
// La VOCE in evidenza, la motivazione dopo, più leggera (Ignazio 19/09, visto in foto con 7 voci lunghe: altrimenti non si distinguono)
function percheRigheHtml(perche) {
  return MB21Benvenuto.pulisciPerche(perche).map(p => `<span><b>${esc(p.voce)}</b>${p.testo ? ': ' + esc(p.testo) : ''}</span>`);
}
function percheHtml(perche) {
  const righe = percheRigheHtml(perche);
  return righe.length ? `<small class="avv-perche">${righe.join('')}</small>` : '';
}
function avvioHtml() {
  const n = AVV.righe.length;
  return n ? rigaApribile('dash-avvio', 'catalogare', 'avvio', 'Partner da avviare',
    `${n} ${n === 1 ? 'avvio aperto' : 'avvii aperti'} · quando hai tempo`, false, n) : '';
}

// «Il mio avvio»: riga chiusa con passi fatti e prossimo passo; aperta, i 14 passi da smarcare
function mioAvvioHtml() {
  const m = AVV.mio, L = MB21Lista;
  if (!m || m.avvio_concluso_il || m.avvio_in_pausa_dal || !L.prossimoPasso(m)) return '';
  const { fatti, totale } = L.contatoreOnboarding(m), prossimo = L.prossimoPasso(m);
  return `<div class="riquadro avv-partner mio">
    <button class="avv-testa" id="mio-avvio"><span><b>${ic('avvio')} Il mio avvio</b><small>${ic('prossimo')} Prossimo passo: ${esc(prossimo.nome)} · ${esc(prossimo.descr)}</small></span>
      <span class="avv-conta">${fatti}/${totale}</span></button>
    <div class="barra"><div style="width:${Math.round(fatti / totale * 100)}%"></div></div>
    ${AVV.mioAperto ? mioPassiHtml(m) : ''}
    <div class="avv-consiglio"><b>Un consiglio</b>Prima di cambiare qualcosa, senti ${m.sponsor_nome ? `${esc(MB21Mappa.nomeLeggibile(m.sponsor_nome))}, il tuo sponsor` : 'il tuo sponsor'}, oppure il tuo upline attivo e in azione. Insieme si va più veloci.</div>
  </div>`;
}
// I 14 passi di chi è entrato: la stessa griglia in «🚀 Il mio avvio» (Dashboard) e nel Profilo. Ignazio 19/09, dopo la prova con un
// partner vero: a 14/14 o ad avvio concluso il riquadro in Dashboard sparisce, ma la persona deve poter rivedere i suoi passi e
// soprattutto i suoi «Perché iniziare» → li ritrova SEMPRE nel Profilo (`disegnaProfilo`), la Dashboard resta pulita.
// Con l'avvio concluso o in pausa i passi si leggono soltanto; «Perché iniziare ›» si apre sempre (gli obiettivi si rivedono e si cambiano).
function mioPassiHtml(m) {
  const L = MB21Lista, chiuso = !!(m.avvio_concluso_il || m.avvio_in_pausa_dal);
  return `<div class="avv-passi">${L.PASSI_ONBOARDING.map(([col, nome]) => {
      const voci = col === 'onb_sogno' ? percheHtml(m.perche) : '';   // «Perché iniziare»: sotto, in piccolo, quello che ha scelto
      const classe = `${m[col] ? 'fatto' : ''}${voci ? ' largo' : ''}`, dentro = `${m[col] ? ic('fatto') : '<i class="ic-vuoto"></i>'} ${esc(nome)}`;
      return chiuso && col !== 'onb_sogno' ? `<span class="${classe}">${dentro}</span>`
        : `<button class="${classe}" data-mio-passo="${col}">${dentro}${PASSI_CON_SCHERMATA[col] ? ' ›' : ''}${voci}</button>`; }).join('')}</div>
    ${eAdmin() && !chiuso ? `<button class="link" id="mio-prova-tel">${ic('chiamata')} Prova la telefonata prima di farla ›</button><div class="sotto" style="margin:0">⚠️ Per ora lo vedi solo tu</div>` : ''}
    <div class="sotto" style="margin:8px 0 0">${m.avvio_concluso_il ? `${ic('fatto')} Avvio concluso il ${L.data(m.avvio_concluso_il)}: i passi restano qui.`
      : m.avvio_in_pausa_dal ? `${ic('pausa')} Avvio in pausa dal ${L.data(m.avvio_in_pausa_dal)}: i passi restano qui.`
      : `Tocca un passo quando l'hai fatto${m.con_scheda === false ? '. Appena chi ti segue ti ha nella sua lista, li vede anche lui'
        : m.sponsor_nome ? `: lo vede anche ${esc(MB21Mappa.nomeLeggibile(m.sponsor_nome))}, che ti segue` : ''}.`}</div>
    ${m.con_scheda === false ? `<div class="avv-azioni">${m.avvio_concluso_il ? '<button class="link" id="mio-avvio-riapri">Riapri il mio avvio</button>'
      : '<button class="link" id="mio-avvio-concluso">' + ic('fatto') + ' Ho concluso il mio avvio</button>'}</div>` : ''}`;
}
// I passi che hanno la loro schermata nel benvenuto (decisione 14 del cantiere 32): il tocco la apre, ed è lei a spuntare il passo
const PASSI_CON_SCHERMATA = { onb_sogno: 'perche', onb_lista_start: 'cerchia' };
// ridisegna / ritorno: in Dashboard `disegnaOggi`; dal Profilo `disegnaProfilo` e ritorno 'profilo' (le schermate dei passi tornano lì)
function collegaMioAvvio(ridisegna = disegnaOggi, ritorno = null) {
  const testa = document.getElementById('mio-avvio');
  if (testa) testa.onclick = () => { AVV.mioAperto = !AVV.mioAperto; disegnaOggi(); };
  app.querySelectorAll('[data-mio-passo]').forEach(b => b.onclick = async () => {
    const col = b.dataset.mioPasso;
    if (PASSI_CON_SCHERMATA[col]) return apriBenvenuto({ solo: PASSI_CON_SCHERMATA[col], ritorno });
    const { data, error } = await dbq('segna il mio passo', supa.rpc('segna_mio_passo', { p_passo: col, p_fatto: !AVV.mio[col] }));
    if (error || !data) return mostraToast('Non salvato: riprova.');
    AVV.mio = data;
    ridisegna();
  });
  // Senza la scheda nella lista di chi lo segue (in cima alla mappa, o non ancora nel file Amway) l'avvio lo conclude da sé
  const provaTel = document.getElementById('mio-prova-tel');
  if (provaTel) provaTel.onclick = () => trnProvaTelefonata();
  const concluso = document.getElementById('mio-avvio-concluso');
  const concludi = async si => {
    const { data, error } = await dbq('concludo il mio avvio', supa.rpc('concludi_mio_avvio', { p_concluso: si }));
    if (error || !data) return mostraToast('Non salvato: riprova.');
    AVV.mio = data;
    ridisegna();
    if (si) mostraToast('Il tuo avvio è concluso: lo ritrovi nel Profilo', () => concludi(false));
  };
  if (concluso) concluso.onclick = () => concludi(true);
  const riapri = document.getElementById('mio-avvio-riapri');
  if (riapri) riapri.onclick = () => concludi(false);
}

// ── Com'è andato il mese scorso (Ignazio 01/10, «a fine mese»): gli obiettivi di allora contro quello che è risultato; si legge soltanto ──
function disegnaConfronto() {
  const c = DS.confronto, D = MB21Dashboard, f = x => Number(x).toLocaleString('it-IT', { maximumFractionDigits: 2 });
  if (!c) return disegnaOggi();
  const nome = D.nomeMese(c.mese).toLowerCase();
  // le parole sono quelle di tutta l'app (Ignazio 04/10): Raggiunto · Superato · Quasi · A metà strada · Lontano; mai «mancato»
  const riga = r => `<div class="dm-riga"><span class="n">${esc(r.etichetta)}</span><span class="g"><b class="lv-${r.livello}">${esc(r.parola)}</b></span>
    <small>${centesimi(f(r.fatto))} su ${esc(f(r.obiettivo))}</small><small class="r">${r.perc}%</small>
    <div class="dm-barra"><div style="width:${Math.min(100, r.perc)}%;background:${r.raggiunto ? 'var(--ok)' : 'var(--accento)'}"></div></div></div>`;
  app.innerHTML = `<button class="indietro" id="indietro">‹ Come sto andando questo mese?</button>
    <h1>${ic('obiettivi')} Com'è andato ${esc(nome)}</h1>
    <div class="sotto" style="margin-bottom:8px">Gli obiettivi che ti eri dato e quello che è risultato (Check, file Amway e persone).</div>
    <div class="riquadro mese-card"><div class="mese-t">${c.raggiunti} ${c.raggiunti === 1 ? 'obiettivo raggiunto' : 'obiettivi raggiunti'} su ${c.totali}</div>
      ${c.gruppi.map(g => `<div class="dm-sez"><div class="dm-testa" style="cursor:default"><b>${escIcone(g.pallino)} ${esc(g.nome)}</b></div><div class="dm-corpo">${g.righe.map(riga).join('')}</div></div>`).join('')}
    </div>${versione()}`;
  document.getElementById('indietro').onclick = () => { window.scrollTo(0, 0); vaiLV('mese'); };
}

// ── Obiettivi mensili dei partner (Ignazio 01/10): per chi sta sopra, gli obiettivi del mese di chi gli sta sotto, SOLO IN LETTURA ──
// Il database (`obiettivi_del_ramo`) dà già solo la discesa nella stessa linea; qui si tolgono anche l'Admin che guarda un altro (conta il ramo del partner
// guardato) e chi non ha scritto niente. Con «Tutti» e offline non si mostra. Una riga grigia in Dashboard, il tocco apre la pagina dei nomi.
// Le due righe da upline stanno in cima alla Mappa (Ignazio 01/10): Partner da avviare e Obiettivi mensili dei partner. Le pagine tornano dove sono nate.
const righeTeamHtml = () => avvioHtml() + obiettiviTeamHtml();
function collegaRigheTeam() {
  const apri = (id, apre) => { const el = document.getElementById(id); if (el) el.onclick = () => { ST.tornaA = 'mappa'; window.scrollTo(0, 0); apre(); }; };
  apri('dash-avvio', () => { AVV.aperto = null; disegnaAvvio(); });
  apri('dash-obteam', () => { OBT.aperto = null; disegnaObiettiviTeam(); });
}
function tornaDaTeam() {
  window.scrollTo(0, 0);
  if (ST.tornaA === 'mappa') { ST.tornaA = null; ST.tab = 'mappa'; return mostraTab(); }
  disegnaOggi();
}
const OBT = { righe: [], senza: [], mese: null, aperto: null };   // righe: chi ha scritto · senza: chi ha l'app e non ha ancora scritto
// La mappa e i volumi del mese in corso, letti una volta sola per ogni Dashboard: servono alla sezione Squadra di «Il mio mese» e agli «Obiettivi mensili dei partner»
function leggiSquadraMese(oggi, nuova) {
  if (!nuova && DS.sqLettura) return DS.sqLettura;
  const mese = Number(String(oggi).slice(0, 4) + String(oggi).slice(5, 7));
  const scorso = MB21Dashboard.meseSpostato(String(oggi).slice(0, 7) + '-01', -1);
  const prec = Number(scorso.slice(0, 4) + scorso.slice(5, 7));   // il mese scorso, per «Com'è andato»
  DS.sqLettura = (ST.offline || vediTutti() || !visto().partner_id || !obiettiviAperti()) ? Promise.resolve(null) : Promise.all([
    dbq('mappa del mese', supa.from('squadra').select('partner_id, sponsor_id, nome, data_ingresso')),
    dbq('volumi del mese in corso', supa.from('volumi_mese').select('partner_id, mese, vpp, vpg, bonus, dimensioni_gruppo').in('mese', [prec, mese])),
    dbq('15 Planner del mese scorso e in corso', supa.rpc('pm_del_ramo', { da: prec })),
  ]).then(([sq, vol, pm]) => (sq.error || vol.error ? null : { mese, prec, sq: sq.data, vol: vol.data, pm: pm.error ? null : pm.data }), () => null);
  return DS.sqLettura;
}
async function caricaObiettiviTeam(oggi) {
  OBT.righe = []; OBT.senza = []; OBT.mese = String(oggi).slice(0, 7) + '-01';
  if (ST.offline || vediTutti() || !obiettiviAperti() || !visto().partner_id) return;
  try {
    const prima = MB21Dashboard.meseSpostato(OBT.mese, -1);
    const [ob, obPrima, sqd] = await Promise.all([dbq('obiettivi dei partner', supa.rpc('obiettivi_del_ramo', { p_mese: OBT.mese })), dbq('obiettivi dei partner, mese scorso', supa.rpc('obiettivi_del_ramo', { p_mese: prima })), leggiSquadraMese(oggi)]);
    if (ob.error || !sqd || !ob.data) return;
    const radice = visto().partner_id;
    OBT.righe = MB21Dashboard.obiettiviDelTeam({ obiettivi: ob.data.obiettivi, linee: ob.data.linee, squadra: sqd.sq, volumi: sqd.vol, radice, mese: sqd.mese });
    // il mese scorso, solo per il VPG (è l'unico risultato di un partner che chi sta sopra può leggere: il file Amway): obiettivo di allora e VPG fatto
    for (const r of OBT.righe) {
      const o = obPrima.error || !obPrima.data ? null : (obPrima.data.obiettivi || []).find(x => x.partner_id === r.partner_id), v = sqd.vol.find(x => x.partner_id === r.partner_id && x.mese === sqd.prec);
      if (o && Number(o.vpg) > 0 && v && v.vpg != null) r.prima = { mese: prima, obiettivo: Number(o.vpg), fatto: Number(v.vpg) };
    }
    OBT.senza = MB21Dashboard.senzaObiettivi({ utenti: ob.data.utenti, squadra: sqd.sq, scritti: OBT.righe.map(r => r.partner_id), radice });
  } catch (e) {}
}
function obiettiviTeamHtml() {
  const n = OBT.righe.length, m = OBT.senza.length;
  return n || m ? rigaApribile('dash-obteam', 'catalogare', 'obiettivi', 'Obiettivi mensili dei partner',
    `${n} ${n === 1 ? 'ha scritto' : 'hanno scritto'} gli obiettivi di ${MB21Dashboard.nomeMese(OBT.mese).toLowerCase()}${m ? ` · ${m} non ancora` : ''} · per aiutarli`, false, m) : '';
}
function disegnaObiettiviTeam() {
  const D = MB21Dashboard, f = x => Number(x).toLocaleString('it-IT', { maximumFractionDigits: 2 }), altro = guardoAltri();
  const nomeMese = D.nomeMese(OBT.mese).toLowerCase();
  const card = r => {
    const aperto = OBT.aperto === r.partner_id, gradino = r.valori.vpg > 0 ? MB21Check.gradinoDaVpg(r.valori.vpg) : null;
    const riga = [r.valori.vpg > 0 ? `VPG ${f(r.valori.vpg)}${r.vpgOra != null ? ` · ora ${f(Math.round(r.vpgOra))}` : ''}` : '', gradino ? `bonus ${gradino}%` : '', r.valori.sponsor_gruppo > 0 ? `${f(r.valori.sponsor_gruppo)} ${r.valori.sponsor_gruppo === 1 ? 'nuovo iscritto' : 'nuovi iscritti'}` : ''].filter(Boolean).join(' · ');
    const gruppi = D.CAMPI_OBIETTIVI.map(([nome, pallino, campi]) => {
      const voci = campi.filter(([k]) => r.valori[k] > 0).map(([k, et, dec]) => `<div><span>${esc(et)}</span><b>${f(r.valori[k])}</b></div>`);
      return voci.length ? `<div class="obt-gruppo"><h4>${escIcone(pallino)} ${esc(nome)}</h4>${voci.join('')}</div>` : '';
    }).join('');
    const linee = r.linee.length ? `<div class="obt-gruppo"><h4>Le sue linee</h4>${r.linee.map(l => `<div><span>${esc(MB21Mappa.nomeLeggibile(l.nome))}</span><b>${l.vp > 0 ? f(l.vp) : '—'}</b></div>`).join('')}</div>` : '';
    return `<div class="riquadro avv-partner">
      <button class="avv-testa" data-obt="${esc(r.partner_id)}">
        <span><b>${esc(MB21Mappa.nomeLeggibile(r.nome))}</b>${r.sponsor_nome ? ` <span class="avv-sponsor${r.diretto && !altro ? ' tuo' : ''}">[${r.diretto && !altro ? 'Tuo/a' : esc(MB21Mappa.nomeLeggibile(r.sponsor_nome))}]</span>` : ''}
          <small>${esc(riga) || 'Obiettivi scritti'}</small></span><span class="avv-conta">${aperto ? '⌄' : '›'}</span></button>
      ${aperto ? `<div class="obt-corpo">${r.prima ? `<div class="obt-gruppo"><h4>${esc(D.nomeMese(r.prima.mese))}</h4><div><span>VPG: obiettivo ${f(r.prima.obiettivo)}</span><b>fatto ${f(Math.round(r.prima.fatto))} · ${Math.round(r.prima.fatto / r.prima.obiettivo * 100)}%</b></div></div>` : ''}${gruppi}${linee}</div>` : ''}
    </div>`;
  };
  app.innerHTML = `<button class="indietro" id="indietro">‹ ${ST.tornaA === 'mappa' ? 'Mappa' : 'Dashboard'}</button>
    <h1>${ic('obiettivi')} Obiettivi mensili dei partner</h1>
    <div class="sotto" style="margin-bottom:8px">Gli obiettivi di ${esc(nomeMese)} dei partner ${altro ? `del Team di ${esc(nomeDi(visto()))}` : 'della tua linea'}, per aiutarli a raggiungerli. Tocca un nome per vedere tutto. Qui si legge soltanto: li cambia ogni partner. Sono quelli che hanno già aperto l'app.</div>
    ${OBT.senza.length ? `<div class="obt-senza"><h4>Non ancora scritti · ${OBT.senza.length}</h4>${OBT.senza.map(r => `<div><span><b>${esc(MB21Mappa.nomeLeggibile(r.nome))}</b>${r.sponsor_nome ? ` <span class="avv-sponsor${r.diretto && !altro ? ' tuo' : ''}">[${r.diretto && !altro ? 'Tuo/a' : esc(MB21Mappa.nomeLeggibile(r.sponsor_nome))}]</span>` : ''}</span></div>`).join('')}</div>` : ''}
    ${OBT.righe.map(card).join('') || (OBT.senza.length ? '' : '<div class="vuoto">Nessun partner ha ancora scritto gli obiettivi.</div>')}${versione()}`;
  document.getElementById('indietro').onclick = tornaDaTeam;
  app.querySelectorAll('[data-obt]').forEach(b => b.onclick = () => { OBT.aperto = OBT.aperto === b.dataset.obt ? null : b.dataset.obt; disegnaObiettiviTeam(); });
}

function disegnaAvvio() {
  const L = MB21Lista, altro = guardoAltri(), admin = eAdmin();
  // Sponsorizzato da chi guarda (Ignazio 19/09: «qualcosa di più semplice o diretto»): [Tuo/a] al posto del proprio nome.
  // Lo sponsor è il primo di `linea`; guardando un altro col Partner Select resta il nome intero.
  const diretto = r => !altro && !!ST.utente.partner_id && (r.linea || [])[0] === ST.utente.partner_id;
  const card = r => {
    const { fatti, totale } = L.contatoreOnboarding(r), prossimo = L.prossimoPasso(r), aperto = AVV.aperto === r.partner_id;
    const entrato = L.entratoDa(r.data_ingresso, ST.oggi);
    const proposte = L.proposteAvvio(r);   // lavoro 4: l'app propone, chi spunta decide
    const mia = r.user_id === ST.utente.id || admin;   // ha la scheda in lista (o è l'Admin): apre la scheda e ha i comandi
    return `<div class="riquadro avv-partner">
      <button class="avv-testa" data-avvio="${esc(r.partner_id)}">
        <span><b>${esc(MB21Mappa.nomeLeggibile(r.nome))}</b>${r.sponsor_nome ? ` <span class="avv-sponsor${diretto(r) ? ' tuo' : ''}">[${diretto(r) ? 'Tuo/a' : esc(MB21Mappa.nomeLeggibile(r.sponsor_nome))}]</span>` : ''}
          <small>${r.avvio_in_pausa_dal ? `${ic('pausa')} in pausa dal ${L.data(r.avvio_in_pausa_dal)}${L.pausaLunga(r, ST.oggi) ? ' · più di un anno' : ''}` : prossimo ? ic('prossimo') + ' ' + esc(prossimo.nome) : ic('complimenti') + ' Tutti i passi fatti'}${entrato ? ' · ' + esc(entrato) : ''}${proposte.length ? ` · ${ic('propone')} ${proposte.length}` : ''}</small></span>
        <span class="avv-conta">${fatti}/${totale}</span></button>
      <div class="barra"><div style="width:${Math.round(fatti / totale * 100)}%"></div></div>
      ${aperto ? `<div class="avv-passi">${L.PASSI_ONBOARDING.map(([col, nome]) => {
          const voci = col === 'onb_sogno' ? percheHtml(AVV.perche[r.partner_id]) : '';   // cantiere 32: il perché lo vede anche chi lo segue
          return mia
          ? `<button class="${r[col] ? 'fatto' : ''}${voci ? ' largo' : ''}" data-spunta="${col}" data-di="${esc(r.partner_id)}">${r[col] ? ic('fatto') : '<i class="ic-vuoto"></i>'} ${esc(nome)}${voci}</button>`
          : `<span class="${r[col] ? 'fatto' : ''}${voci ? ' largo' : ''}">${r[col] ? ic('fatto') : '<i class="ic-vuoto"></i>'} ${esc(nome)}${voci}</span>`; }).join('')}</div>
        ${proposte.length ? `<div class="avv-proposte"><b>${ic('propone')} L'app propone</b>${proposte.map(p => `<div><span>${esc(p.nome)}: ${esc(p.perche)}</span>
            ${mia ? `<button class="piccolo" data-spunta="${p.col}" data-di="${esc(r.partner_id)}">Segna</button>` : ''}</div>`).join('')}</div>` : ''}
        <div class="sotto" style="margin:8px 0 0">Scheda nella lista di ${esc(r.lista || '—')}${r.data_ingresso ? ' · ingresso in Amway ' + L.data(r.data_ingresso) : ''}${mia ? '. Tocca un passo per segnarlo o toglierlo.' : ''}</div>
        <div class="avv-azioni">
          ${mia ? `<button class="link" data-apri-scheda="${esc(r.contatto_id)}">Apri la scheda ›</button>` : ''}
          ${mia ? (r.avvio_in_pausa_dal
            ? `<button class="link" data-chiudi="riprendi" data-di="${esc(r.partner_id)}">${ic('riprendi')} Riprendi</button>
               ${L.pausaLunga(r, ST.oggi) ? `<button class="link" data-chiudi="dacapo" data-di="${esc(r.partner_id)}">${ic('aggiorna')} Riprendi da capo</button>` : ''}`
            : `<button class="link" data-chiudi="pausa" data-di="${esc(r.partner_id)}">${ic('pausa')} In pausa</button>
               <button class="link" data-chiudi="concluso" data-di="${esc(r.partner_id)}">${ic('fatto')} Avvio concluso</button>`) : ''}
        </div>` : ''}
    </div>`;
  };
  app.innerHTML = `<button class="indietro" id="indietro">‹ ${ST.tornaA === 'mappa' ? 'Mappa' : 'Dashboard'}</button>
    <h1>${ic('avvio')} Partner da avviare</h1>
    <div class="sotto" style="margin-bottom:8px">I partner ${altro ? `del Team di ${esc(nomeDi(visto()))}` : 'del tuo Team'} con l'avvio aperto, dal più recente. Tocca un nome per vedere i suoi passi.</div>
    <button class="ag-blocco avv-come" id="avv-come"><span>${ic('info')} Come funziona</span><span>${AVV.comeAperto ? '⌄' : '›'}</span></button>
    ${AVV.comeAperto ? `<div class="riquadro avv-come-testo"><ul>
      <li>Qui vedi i partner ${altro ? 'del Team' : 'del tuo Team'} con l'avvio aperto, dal più recente. Tra [ ] c'è lo sponsor: è a lui che ti rivolgi${altro ? '' : '; «Tuo/a» se è tuo'}.</li>
      <li>${ic('prossimo')} è il prossimo passo da fare insieme. ${ic('propone')} sono i passi che l'app sa già: li segna chi ha il partner nella sua lista, se è d'accordo.</li>
      <li><b>Il perché</b> è il primo passo: il partner lo sceglie nel suo benvenuto («Perché vuoi iniziare?», come nel Piano Marketing) e qui, sotto il passo, leggi quello che ha scelto.</li>
      <li><b>${ic('fatto')} Avvio concluso</b>: cammina da solo, esce dall'elenco.</li>
      <li><b>${ic('pausa')} In pausa</b>: fermo per ora. Lo ritrovi in fondo alla pagina; <b>${ic('riprendi')} Riprendi</b> lo riporta qui.</li>
      <li><b>Fermo da più di un anno?</b> Alla ripresa l'avvio si rifà da capo: con <b>${ic('aggiorna')} Riprendi da capo</b> i 14 passi tornano tutti da fare.</li>
      <li><b>Comanda la mappa Amway</b>: chi non è più nell'ultimo file Amway caricato sparisce da solo dall'elenco, come chi non è più in categoria Partner.</li>
      <li>Passi, pausa e avvio concluso li tocca chi ha il partner nella sua lista (di solito lo sponsor); gli altri upline vedono soltanto.</li>
    </ul></div>` : ''}
    ${AVV.righe.map(card).join('') || '<div class="vuoto">Nessun partner da avviare.</div>'}
    ${AVV.pausa.length ? `<button class="ag-blocco avv-pausa" id="avv-pausa"><span>${ic('pausa')} In pausa · ${AVV.pausa.length}</span><span>${AVV.pausaAperta ? '⌄' : '›'}</span></button>
      ${AVV.pausaAperta ? AVV.pausa.map(card).join('') : ''}` : ''}${versione()}`;
  document.getElementById('indietro').onclick = tornaDaTeam;
  const come = document.getElementById('avv-come');
  if (come) come.onclick = () => { AVV.comeAperto = !AVV.comeAperto; disegnaAvvio(); };
  const pausa = document.getElementById('avv-pausa');
  if (pausa) pausa.onclick = () => { AVV.pausaAperta = !AVV.pausaAperta; disegnaAvvio(); };
  app.querySelectorAll('[data-avvio]').forEach(b => b.onclick = () => { AVV.aperto = AVV.aperto === b.dataset.avvio ? null : b.dataset.avvio; disegnaAvvio(); });
  // Chi ha la scheda in lista (e l'Admin, anche nella lista di un altro) scrive sulla scheda che vale (`contatto_id`); la Lista già letta resta allineata
  const scrivi = async (r, campi) => {
    if (!r || !(admin || r.user_id === ST.utente.id) || soloGuardo()) return false;
    const { error } = await dbq('avvio dalla pagina dei nomi', supa.from('contatti').update(campi).eq('id', r.contatto_id));
    if (error) { mostraToast('Non salvato: riprova.'); return false; }
    Object.assign(r, campi);
    const inLista = LS.righe.find(x => x.id === r.contatto_id);
    if (inLista) Object.assign(inLista, campi);
    if (LS.avvio && LS.avvio.id === r.contatto_id) LS.avvio = null;   // la scheda rilegge concluso / pausa
    ricalcolaAvvio();
    disegnaAvvio();
    return true;
  };
  const trova = id => AVV.tutte.find(x => x.partner_id === id);
  app.querySelectorAll('[data-spunta]').forEach(b => b.onclick = () => { const r = trova(b.dataset.di); if (r) scrivi(r, { [b.dataset.spunta]: !r[b.dataset.spunta] }); });
  app.querySelectorAll('[data-chiudi]').forEach(b => b.onclick = async () => {
    const r = trova(b.dataset.di), cosa = b.dataset.chiudi;
    const campi = cosa === 'pausa' ? { avvio_in_pausa_dal: ST.oggi } : cosa === 'riprendi' ? { avvio_in_pausa_dal: null }
      : cosa === 'dacapo' ? { avvio_in_pausa_dal: null, ...L.PASSI_SPENTI() } : { avvio_concluso_il: ST.oggi };
    const prima = r && { avvio_in_pausa_dal: r.avvio_in_pausa_dal || null, avvio_concluso_il: r.avvio_concluso_il || null,
      ...Object.fromEntries(L.PASSI_ONBOARDING.map(([col]) => [col, r[col] === true])) };   // per Annulla: anche i 14 passi com'erano
    const detto = { pausa: 'avvio in pausa', riprendi: 'avvio ripreso', dacapo: 'avvio ripreso da capo, 14 passi da fare', concluso: 'avvio concluso' }[cosa];
    if (await scrivi(r, campi)) mostraToast(`${MB21Mappa.nomeLeggibile(r.nome)}: ${detto}`, () => scrivi(r, prima));
  });
  app.querySelectorAll('[data-apri-scheda]').forEach(b => b.onclick = async () => {
    await apriContattoDa(b.dataset.apriScheda, ST.tornaA === 'mappa' ? 'mappa' : 'oggi');
    if (LS.contatto && LS.contatto.id === b.dataset.apriScheda) { LS.sezione = 'onboarding'; disegnaScheda(); }   // dritti sui 14 passi
  });
}

const RIO = { righe: [], nonRisponde: new Set(), spento: new Set() };

async function caricaRiordini(oggi) {
  try {
    const A = MB21Agenda;
    const [v, g] = await Promise.all([
      dbq('riordini da sentire', supa.from('vendite')
        .select(`riordino, prodotto, azione:azioni!azione_riordino_id(${CAMPI_AZIONE})`).in('user_id', idVisti()).not('azione_riordino_id', 'is', null)),
      // le telefonate di riordino importate da Glide, non ancora fatte, dal 1° settembre 2026 a oggi
      dbq('riordini di Glide', supa.from('azioni').select(CAMPI_AZIONE).in('user_id', idVisti()).eq('tipo_azione', 'Contatto').eq('esito', 'Riordino')
        .not('glide_id', 'is', null).or('completata.is.null,completata.eq.false')
        .gte('inizio', A.isoDaRoma(A.INIZIO_RIORDINI_GLIDE, '00:00')).lt('inizio', A.isoDaRoma(A.spostaGiorno(oggi, 1), '00:00'))),
    ]);
    if (v.error || g.error) throw v.error || g.error;
    RIO.righe = A.riordiniDaSentire(v.data, oggi, g.data);
  } catch (e) {
    RIO.righe = [];
  }
}

// Righe chiuse come la coda (cantiere 29 lavoro 1 bis, Ignazio 18/09: «aperto si prende tre quarti di schermo»):
// stessa `riga-coda` e stesso `ST.aperta` della coda, quindi il tocco che apre e chiude è quello di `disegnaOggi`.
function riordiniHtml(solo) {
  if (!RIO.righe.length) return '';
  const ordinate = RIO.righe.filter(a => !solo || a.id === solo).sort((a, b) => RIO.nonRisponde.has(a.id) - RIO.nonRisponde.has(b.id));
  return ordinate.map(a => {
    const categoria = a.contatti ? a.contatti.categoria : a.categoria;
    const aperta = ST.aperta === a.id;
    const strip = `<div class="strip" style="background:${MB21Agenda.COLORI['Consulenza PRD']}"></div>`;
    const testa = `
      <button class="riga-coda" data-apri="${esc(a.id)}" aria-expanded="${aperta}">
        <span class="rc-alto"><span class="nome">${esc(a.contatti ? a.contatti.nome : '')}</span></span>
        <span class="rc-glide">${esc(['Riordino', a.brand, a.prodotto].filter(Boolean).join(' · '))}${a.riordino ? ` · finisce il ${esc(dataBreve(a.riordino))}` : a.glide_id ? ` · era del ${esc(dataBreve(MB21Agenda.partiRoma(a.inizio).giorno))}` : ''}</span>
        ${RIO.nonRisponde.has(a.id) ? '<span class="conf-nr">' + ic('telefonooff') + (RIO.spento.has(a.id) ? ' Telefono spento · riprova più tardi' : ' Non risponde · riprova più tardi') + '</span>' : ''}
        <span class="rc-freccia">${aperta ? '⌃' : '›'}</span>
      </button>`;
    if (!aperta) return `<div class="card compatta conferma riordino" data-riordino="${esc(a.id)}">${strip}${testa}</div>`;
    const fasi = MB21Agenda.fasiPer(a.categoria || categoria, a.tipo_azione, a.modalita);
    const spento = ST.offline || soloGuardo() ? 'disabled' : '';
    // Ignazio 04/10: Ordine · Richiamare, poi Non risponde · Telefono spento (che lasciano il riordino aperto: «riprova più tardi») · Nessun ordine (è «No Interesse»: il cliente
    // torna, l'app chiede tra quanti giorni risentirlo). Il telefono spento si distingue dal non risponde.
    return `<div class="card compatta aperta conferma riordino" data-riordino="${esc(a.id)}">${strip}${testa}
      <div class="corpo">
        ${contattaHtml(a.contatti && a.contatti.telefono)}
        <div class="bottoni">
          ${fasi.filter(f => !MB21Agenda.ESITI_NON_ANDATI.includes(f) && f !== 'Appuntamento').map(f => `<button class="${f === 'Ordine' ? 'appuntamento' : ''}" data-riordino-esito="${esc(f)}" ${spento}>${esc(f)}</button>`).join('')}
          <button data-riordino-nr="${esc(a.id)}">Non risponde</button>
          <button data-riordino-spento="${esc(a.id)}">Telefono spento</button>
          ${fasi.includes('No Interesse') ? `<button class="no" data-riordino-esito="No Interesse" ${spento}>Nessun ordine</button>` : ''}
        </div>
        <button class="link" data-scheda="${esc(a.contatto_id)}">${ic('persona')} Apri contatto</button>
      </div></div>`;
  }).join('');
}

// Gli esiti passano da `chiudiAppuntamento`, come in Agenda (stessa strada di `collegaEsiti`, passo unico)
function collegaRiordini() {
  const dopo = async () => { await caricaRiordini(ST.oggi); disegnaOggi(); };
  app.querySelectorAll('[data-riordino]').forEach(el => {
    const a = RIO.righe.find(x => x.id === el.dataset.riordino);
    if (!a) return;
    const categoria = a.contatti ? a.contatti.categoria : a.categoria;
    el.querySelectorAll('[data-riordino-esito]').forEach(b => {
      b.onclick = () => chiudiAppuntamento({ ...a, categoria: a.categoria || categoria }, b.dataset.riordinoEsito, { dopo });
    });
    const nr = el.querySelector('[data-riordino-nr]');   // c'è solo nella riga aperta
    if (nr) nr.onclick = () => { RIO.nonRisponde.add(a.id); RIO.spento.delete(a.id); ST.aperta = null; LV.vista === 'persona' ? vaiLV('oggi') : disegnaOggi(); };
    const sp = el.querySelector('[data-riordino-spento]');
    if (sp) sp.onclick = () => { RIO.nonRisponde.add(a.id); RIO.spento.add(a.id); ST.aperta = null; LV.vista === 'persona' ? vaiLV('oggi') : disegnaOggi(); };
  });
}

// ── DASHBOARD (Fase 3) ───────────────────────────────────
// Copia della Dashboard di Glide (docs/MB21_v3_Dashboard_Agenda_come_e.md), brief Fase 3. Calcoli in dashboard.js.
// Ordine: Partner Select · banner · 4 schede · visione completa · [OGGI] · Segni Vitali · Mostra di più.
// Obiettivi del mese: il foglio nuovo (scala dei bonus, Segni Vitali, linee) è aperto a tutti i partner dal 01/10 (Ignazio). Con `false` il riquadro, il banner,
// la riga «Obiettivi di <mese>» e il foglio li vede e li usa solo l'Admin (era così nelle prime ore del 01/10, finché il foglio non era pronto).
const OBIETTIVI_PER_TUTTI = true;
const obiettiviAperti = () => OBIETTIVI_PER_TUTTI || eAdmin();
const DS = { dati: null, obiettivi: [] };

async function caricaDashboard(oggi) {
  CK.di = null;   // la card «Il tuo Check» rilegge i dati a ogni caricamento: dopo il Check del Giorno i numeri sono nuovi (27/09)
  try {
    const ids = idVisti();   // Partner Select: il partner scelto, o tutti
    const [cm, ob, segniAl, scad, seg, evBbs, evWes, sqd] = await Promise.all([
      dbq('check dei mesi', supa.from('check_mesi').select('*').in('user_id', ids)),
      dbq('obiettivi del mese', supa.from('obiettivi_mese').select('*').in('user_id', ids)),
      calcolatoreSegni(),   // BBS/WES/CEP dalle persone da settembre 2026
      vediTutti() ? { data: null } : dbq('scadenza abbonamento', supa.rpc('scadenza_abbonamento', { p_utente: visto().id })),   // con abbonamento in comune: quella di chi paga
      // cantiere 20 lavoro 2: BBS/Wes in vendita senza ancora il proprio biglietto (solo sulla propria Dashboard, anche l'Admin)
      vediTutti() || visto().id !== ST.utente.id ? { data: [] } : dbq('biglietti da segnare', supa.rpc('biglietti_da_segnare')),
      // gli eventi BBS e WES (01/10): il mese si legge accanto al nome, così si sa a quale evento si riferiscono i numeri (l'evento in vendita, come nella Mappa)
      dbq('eventi BBS', supa.from('bbs').select('data, creato_il')),
      dbq('eventi WES', supa.from('wes').select('data, creato_il')),
      leggiSquadraMese(oggi),   // la Squadra del mese (prime linee, linee riceventi Bonus, 15 Planner, totale gruppo) dal file Amway
    ]);
    // `breve` = nel riquadro piccolo, `lungo` = nel foglio obiettivi. Solo BBS e WES hanno un evento: il CEP è un numero da raggiungere (Ignazio 01/10: «oggi 5, vogliamo arrivare a 10»)
    const sigla = e => (e ? { breve: e.etichetta, lungo: `${e.etichetta} · ${e.inCorso ? 'in corso' : 'il prossimo'}` } : null);
    DS.eventi = { BBS: evBbs.error ? null : sigla(MB21Lista.eventoDaMostrare(evBbs.data, oggi)), WES: evWes.error ? null : sigla(MB21Lista.eventoDaMostrare(evWes.data, oggi)) };
    DS.daSegnare = seg.error ? [] : (seg.data || []);
    if (cm.error || ob.error) throw cm.error || ob.error;
    const dati = vediTutti() ? MB21Dashboard.unisciPartner(cm.data, ob.data, oggi.slice(0, 8) + '01', codiciDi()) : { checkMesi: cm.data, obiettivi: ob.data };
    DS.obiettivi = dati.obiettivi; DS.checkMesi = dati.checkMesi; DS.segniAl = segniAl;   // anche per i «Risultati» del modulo obiettivi
    const squadraAl = sqd ? MB21Dashboard.risultatiAmway({ squadra: sqd.sq, volumi: sqd.vol, pm: sqd.pm, pid: visto().partner_id, mese: sqd.mese }) : null;
    DS.dati = MB21Dashboard.calcola({ ...dati, oggi, scadenza: scad.error ? visto().abbonamento_scadenza : scad.data, segniAl, squadraAl });
    // «Com'è andato il mese scorso»: gli obiettivi di allora contro quello che è risultato (Check, file Amway, persone); solo con i propri obiettivi aperti
    DS.confronto = null;
    if (!vediTutti() && obiettiviAperti()) {
      const prima = MB21Dashboard.meseSpostato(DS.dati.mese, -1);
      const amwayPrec = sqd ? MB21Dashboard.risultatiAmway({ squadra: sqd.sq, volumi: sqd.vol, pm: sqd.pm, pid: visto().partner_id, mese: sqd.prec }) : null;
      const c = MB21Dashboard.confrontoMese({ obiettivo: dati.obiettivi.find(o => o.mese === prima), risultati: MB21Dashboard.risultatiMese({ checkMesi: dati.checkMesi, obiettivi: dati.obiettivi, mese: prima, oggi, segniAl }), amway: amwayPrec });
      if (c) DS.confronto = { mese: prima, ...c };
    }
    if (!guardoAltri() && ST.utente.ruolo !== 'Admin' && !scad.error) { ST.scaduto = DS.dati.abbonamento === 'scaduto'; aggiornaTab(); }
  } catch (e) {
    DS.dati = null;   // la coda si mostra lo stesso
  }
  await caricaRichiamoGriglia(oggi);
}

// Richiamo della Griglia PM in Dashboard (decisione 8 del Report): «PM fatti di obiettivo», apre la griglia
async function caricaRichiamoGriglia(oggi) {
  DS.griglia = null;
  if (vediTutti()) return;   // la griglia è di un partner
  try {
    const { data: imp, error } = await dbq('griglia PM', supa.from('griglia_pm').select('obiettivo, inizio, mesi').eq('user_id', visto().id).maybeSingle());
    if (error || !imp) return;
    const { data: pm, error: e2 } = await dbq('PM della griglia', supa.from('azioni').select('id, inizio, esito')   // esito: la Griglia conta solo i PM avvenuti
      .eq('user_id', visto().id).eq('tipo_azione', 'Piano Marketing').gte('inizio', MB21Agenda.isoDaRoma(imp.inizio, '00:00')));
    if (e2) return;
    DS.griglia = MB21Report.griglia(pm, imp, oggi);
  } catch (e) { /* il richiamo manca, la Dashboard resta */ }
}

// I biglietti BBS/WES della propria scheda (Ignazio 24/09, biglietti di Isabella): la scheda con il proprio codice Amway
// sta quasi sempre nella lista dell'upline e le regole di sicurezza non la fanno leggere al partner, così il biglietto
// c'era ma il Check e il Modulo Core lo davano per non comprato. Si passa da `miei_biglietti`, che sa dov'è la scheda.
// null = non lo so (nessuna scheda col mio codice) · [] = scheda sì, biglietti no. `contatto` = il biglietto è per me.
// Guardando un altro partner (Partner Select), l'Admin legge la sua scheda come prima: lui le vede tutte.
async function bigliettiDiChiGuardo(io, dal) {
  if (io.id === ST.utente.id) {
    const { data, error } = await dbq('i miei biglietti', supa.rpc('miei_biglietti', { p_dal: dal }));
    if (error || data == null) return null;
    return data.map(b => ({ tipo: b.tipo, evento: b.evento, ospiti: b.ospiti, contatto: !!b.io }));
  }
  if (!io.partner_id) return null;
  const sc = await dbq('la sua scheda', supa.from('contatti').select('id').eq('codice_amway', io.partner_id).is('eliminato_il', null).limit(1));
  const scheda = !sc.error && sc.data && sc.data[0] ? sc.data[0].id : null;
  if (!scheda) return null;
  let q = supa.from('biglietti').select('tipo, evento, contatto, ospiti').eq('contatto_id', scheda);
  if (dal) q = q.gte('evento', dal);   // senza `dal` tutti i biglietti (LC1 guarda anche i mesi passati)
  const bi = await dbq('i suoi biglietti', q);
  return bi.error ? null : (bi.data || []);
}

// I periodi CEP della propria scheda (LC1, 26/09): la stessa strada dei biglietti. Per sé `miei_segni` (la scheda sta
// nella lista dell'upline), per un altro partner l'Admin legge la sua scheda. null = non lo so · [] = scheda sì, CEP mai
async function cepDiChiGuardo(io) {
  if (io.id === ST.utente.id) {
    const { data, error } = await dbq('il mio CEP', supa.rpc('miei_segni'));
    if (error || !data || !data.scheda) return null;
    return (data.cep || []).map(p => ({ dal: p.dal, uscito_il: p.uscito_il }));
  }
  if (!io.partner_id) return null;
  const sc = await dbq('la sua scheda', supa.from('contatti').select('id').eq('codice_amway', io.partner_id).is('eliminato_il', null).limit(1));
  const scheda = !sc.error && sc.data && sc.data[0] ? sc.data[0].id : null;
  if (!scheda) return null;
  const c = await dbq('il suo CEP', supa.from('cep').select('dal, uscito_il').eq('contatto_id', scheda));
  return c.error ? null : (c.data || []);
}

const inArrivo = cosa => mostraToast(`${cosa}: in arrivo`);
const dataBreve = giorno => (giorno ? MB21Report.dataLunga(giorno) : '—');   // «02/10/2026»: la stessa di Report e Check (nota Azioni 030 punto 3: una data sola)

// «Nuovo BBS 10-2026 · Hai il biglietto?» (cantiere 20 lavoro 2, Ignazio 17/09): il partner risponde una volta sola
// (io · compagno/a · ospiti insieme); dopo, correzioni e aggiunte le fa l'Admin dalla scheda
// La domanda è una sola (`domandaBigliettoHtml`), usata qui e nel foglio del Profilo (cantiere 25 bis: stessa schermata, stesso codice).
// Dal 25 bis il biglietto si spegne e si rifà dal Profilo toccando la targhetta (prima: una risposta sola, correzioni dall'Admin).
function domandaBigliettoHtml(x, classe) {
  const k = x.tipo === 'BBS' ? 'bbs' : 'wes', nome = x.tipo === 'BBS' ? 'BBS' : 'WES';
  return `<div class="${classe} ${k}" data-seg="${esc(x.tipo)}|${esc(x.evento)}">
      <b>${ic('biglietto')} ${classe === 'banner-big' ? 'Nuovo ' : ''}${nome} ${esc(MB21Lista.etichettaEvento(x.evento))} · Hai il biglietto?</b>
      <div class="riga"><button class="sv-chip ${k} on" data-campo="contatto">Io</button>
        ${x.compagno ? `<button class="sv-chip ${k}" data-campo="compagno">${esc(x.compagno)}</button>` : ''}
        <label class="sv-osp">+<input type="number" min="0" max="50" value="0" data-campo="ospiti">ospiti</label></div>
      <div class="riga"><button class="primario" data-si>Sì, segna il biglietto</button><button class="link" data-no>No, niente biglietto</button></div>
      <small>Per correggere o aggiungere ospiti: nel tuo Profilo, tocca la targhetta ${nome.toUpperCase()}</small></div>`;
}
function riquadriBiglietto() {
  return (DS.daSegnare || []).map(x => domandaBigliettoHtml(x, 'banner-big')).join('');
}
// Collega chip e bottoni della domanda dentro `radice`; `dopo` = cosa ridisegnare a risposta salvata
function collegaDomandaBiglietto(radice, dopo) {
  radice.querySelectorAll('[data-seg]').forEach(box => {
    box.querySelectorAll('.sv-chip').forEach(ch => { ch.onclick = () => ch.classList.toggle('on'); });
    box.querySelector('[data-si]').onclick = () => rispondiBiglietto(box, true, dopo);
    box.querySelector('[data-no]').onclick = () => rispondiBiglietto(box, false, dopo);
  });
}

async function rispondiBiglietto(box, si, dopo) {
  const [tipo, evento] = box.dataset.seg.split('|');
  const on = campo => { const el = box.querySelector(`[data-campo="${campo}"]`); return !!el && el.classList.contains('on'); };
  const ospiti = Math.max(0, Number(box.querySelector('[data-campo="ospiti"]').value) || 0);
  const contatto = si && on('contatto'), compagno = si && on('compagno'), osp = si ? ospiti : 0;
  if (si && !contatto && !compagno && !osp) return mostraToast('Scegli almeno un biglietto, oppure premi «No»');
  box.querySelectorAll('button').forEach(b => { b.disabled = true; });
  const { error } = await dbq('segna il mio biglietto', supa.rpc('segna_mio_biglietto',
    { p_tipo: tipo, p_evento: evento, p_contatto: contatto, p_compagno: compagno, p_ospiti: osp }));
  if (error) { box.querySelectorAll('button').forEach(b => { b.disabled = false; }); return mostraToast(error.message || 'Non salvato: riprova.'); }
  DS.daSegnare = (DS.daSegnare || []).filter(x => !(x.tipo === tipo && x.evento === evento));
  mostraToast(si ? 'Biglietto segnato' : 'Va bene, non te lo chiedo più');
  dopo();
}

// Testata con il cerchietto del Profilo (cantiere 25): sempre di chi è entrato, anche col Partner Select
function testataDashboard() { return `<div class="testa-pagina"><h1>Dashboard</h1>${cerchiettoProfilo()}</div>`; }

// Dal 28/09 la testata (Partner Select, abbonamento, biglietti da segnare) resta in cima, mentre i numeri
// del mese stanno nei livelli (`disegnaMeseLV`).
function dashboardTesta() {
  const d = DS.dati;
  let html = partnerSelect();
  if (!d) return html + (ST.offline ? '' : `<div class="avviso">Numeri della Dashboard non disponibili: riprova più tardi.</div>`);
  if (!vediTutti() && visto().ruolo !== 'Admin') html += d.abbonamentoAttivo   // l'Admin non ha abbonamento (Ignazio 16/09)
    ? (d.abbonamento === 'in_scadenza'
      ? `<div class="banner-abb scaduto in-scadenza"><i class="pallino" style="background:var(--proposta)"></i>Abbonamento in scadenza il ${esc(d.scadenza.split('-').reverse().join('/'))}<small>Con il rinnovo prima della scadenza si continua a usare tutta l'app</small>
        <button id="ds-rinnova">Rinnovo l'abbonamento →</button></div>`
      : `<div class="banner-abb attivo">${ic('fatto')} Abbonamento attivo · Buon lavoro!</div>`)
    : `<div class="banner-abb scaduto"><i class="pallino" style="background:var(--pericolo)"></i>Abbonamento scaduto<small>Accesso limitato alle funzionalità</small>
        <button id="ds-rinnova">Rinnovo l'abbonamento →</button></div>`;
  html += riquadriBiglietto();
  // Scaduto (Ignazio 17/09): niente Check del Giorno e niente Obiettivi, i numeri si guardano soltanto
  if (d.obiettiviMancanti && !limitato() && obiettiviAperti()) html += `<button class="banner-grande obiettivi" id="ds-obiettivi"><span class="ico">${ic('obiettivi')}</span>
    <span><b>Imposta gli obiettivi del mese!</b><small>Clicca su questo banner</small></span></button>`;
  return html;
}

// (Il mese, gli obiettivi e il percorso stanno nei livelli della Dashboard: `disegnaMeseLV`, `disegnaMeseDashboard`, `disegnaTraguardoLV`.)

// i colori veri dell'app: BBS blu, WES rosso, CEP verde, come le targhette. `coloreSv(k)` il colore pieno, `tintaSv` la casella che si accende.
const COLORI_SV = { contatti: 'tenue', pm: 'gr-azione', bbs: 'bbs', wes: 'wes', cep: 'cep' };
const coloreSv = k => `var(--${COLORI_SV[k] === 'tenue' ? 'testo-tenue' : COLORI_SV[k]})`;
const tintaSv = (k, forza) => `rgba(var(--${COLORI_SV[k]}-rgb), ${forza})`;
// Tabella dei Segni Vitali a 12 mesi: dal 15/09 sta nel Check (decisione C); in Dashboard solo il mese in corso
const COLONNE_SV = [['contatti', 'Contatti'], ['pm', 'PM'], ['bbs', 'BBS'], ['wes', 'WES'], ['cep', 'CEP']];
function cellaSv(sv, k, v, tag) {
  if (!v) return `<${tag} class="zero">0</${tag}>`;
  const forza = 0.35 + 0.65 * v / (sv.massimi[k] || 1);   // più alto il numero, più acceso il colore
  return `<${tag} style="background:${tintaSv(k, forza.toFixed(2))}">${v}</${tag}>`;
}
function tabellaSv(sv, nome) {
  return `<div class="sv">
      <h3>${ic('segnivitali')} Segni Vitali</h3>
      <div class="sotto-sv">Ultimi 12 mesi · ${ic('persona')} ${esc(nome || nomeVisto())}</div>
      <div class="legenda">${COLONNE_SV.map(([k, t]) => `<span><i style="background:${coloreSv(k)}"></i>${t}</span>`).join('')}</div>
      <table><tr><th class="mese"></th>${COLONNE_SV.map(([k, t]) => `<th style="color:${coloreSv(k)}">${t.toUpperCase()}</th>`).join('')}</tr>
      ${sv.righe.map(r => `<tr><th class="mese">${r.etichetta}<br>${r.anno}</th>${COLONNE_SV.map(([k]) => cellaSv(sv, k, r[k], 'td')).join('')}</tr>`).join('')}
      </table>
      <div class="totali">${COLONNE_SV.map(([k, t]) => `<div><b style="color:${coloreSv(k)}">${sv.totali[k].valore}</b><span>${t.toUpperCase()}</span><small>${esc(sv.totali[k].sotto)}</small></div>`).join('')}</div>
    </div>`;
}
function dashboardBasso() {
  const d = DS.dati;
  if (!d || limitato()) return '';
  // Dal 28/09 il riquadro nero dei Segni Vitali non c'è più: erano gli stessi numeri della linguetta
  // «Segni Vitali N21» qui sopra, e i 12 mesi si aprono dal Check. In fondo resta solo la consultazione.
  return `<div class="zona-oggi">Approfondisci</div>
    <div class="ds-azioni">
      ${DS.griglia ? `<button class="ds-azione griglia" id="ds-griglia">${ic('pianomarketing')}<span><b>Griglia PM</b><small>${DS.griglia.fatti} di ${DS.griglia.obiettivo}</small></span></button>` : ''}
      <button class="ds-azione report" id="ds-altro">${ic('report')}<span><b>Report</b><small>I tuoi numeri, giorno per giorno</small></span></button></div>`;
}

function collegaDashboard() {
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  su('ds-sv', foglioStorico);   // la striscia dei Segni Vitali apre lo storico: stessa schermata del Check (Ignazio 25/09)
  collegaPartnerSelect();
  su('ds-rinnova', foglioRinnovo);
  su('ds-riparto', () => scegliNumero(caricaOggi));   // 02/10: dalla pausa si riparte scegliendo quanti
  su('ds-profilo', () => { PF.aperte.clear(); ST.tab = 'profilo'; mostraTab(); window.scrollTo(0, 0); });   // cantiere 25 · 25 bis: si entra con tutte le voci chiuse
  collegaDomandaBiglietto(app, () => { ST.tab = 'oggi'; mostraTab(); });   // la Dashboard si ridisegna e i segni si aggiornano
  su('ds-obiettivi', apriObiettivi);
  su('ds-obiettivi-mod', apriObiettivi);
  caricaCardCheck();   // i dati del percorso dopo la Dashboard, che non aspetta (27/09)
  su('ds-altro', () => { ST.tab = 'report'; RP.vista = 'report'; mostraTab(); window.scrollTo(0, 0); });
  su('ds-griglia', () => { ST.tab = 'report'; RP.vista = 'griglia'; RP.cella = null; mostraTab(); window.scrollTo(0, 0); });
  su('ds-check', apriCheck);
  su('ds-confronto', () => { window.scrollTo(0, 0); disegnaConfronto(); });
}

// Obiettivi del mese (lavoro 5): un foglio con i 12 obiettivi raggruppati come le schede, già compilati
// con quelli del mese (o del mese scorso). «Come <mese>» riempie, «Scelgo io» svuota, la barra «Crescita su <mese>»
// (5 · 10 · 20 · 30 · 40 · 50%) ricalcola tutti i campi mentre si sposta; sopra il 20% un avviso.
// Partenza di BBS/WES/CEP automatica: non si chiede. Si salva solo con almeno un obiettivo.
// Nel foglio i totali stanno in evidenza (VPP e VPG in azzurro, Nuovi Iscritti in arancio) e le parti sono «di cui» (Ignazio 01/10)
const CLASSE_TOTALE = { vpp: 'ob-vol', vpg: 'ob-vol', sponsor_gruppo: 'ob-az' };   // nomi propri: `.azione` e simili esistono già nell'app
// nota 035 (Ignazio 07/10): parole semplici, la sigla tra parentesi
const ETICHETTA_FOGLIO = { vpg: 'Punti attesi dal gruppo (VPG)', vpp: 'di cui tuoi (VPP)', vpv: 'di cui dai clienti (VP Clienti)', sponsor_gruppo: 'Nuovi iscritti attesi dal gruppo', sponsor_personali: 'di cui iscritti da te', pm: 'con quanti Piani Marketing tuoi', contatti: 'e quanti contatti', cep: 'Abbonati CEP nel gruppo' };
// Le sezioni del foglio si aprono e si chiudono, ognuna con una breve spiegazione (Ignazio 01/10: foglio unico per tutti, espandibile); Volume e Azione aperte, il resto chiuso
const SEZIONI_FOGLIO = {
  'Volume': { id: 'volume', aperta: true, spiega: 'I punti che ti servono: quelli di tutto il gruppo, quanti sono tuoi e quanti arrivano da chi sta sotto di te.' },
  'Azione': { id: 'azione', aperta: true, spiega: 'Cosa fai per arrivarci: quanti nuovi iscritti, e con quanti Piani Marketing e contatti.' },
  'Squadra': { id: 'squadra', aperta: false, spiega: 'La struttura che ti aspetti nel gruppo: linee, Planner, quante persone in tutto.' },
  'Le tue linee': { id: 'linee', aperta: false, spiega: 'Le persone che ti aspetti sotto di te, e quanti punti da ognuna.' },
  'Segni Vitali N21': { id: 'segni', aperta: false, spiega: 'I biglietti BBS e WES e gli iscritti CEP del tuo gruppo: i numeri a cui punta il Manuale.' },
  'Crescita': { id: 'crescita', aperta: false, spiega: 'Ascolti e letture: la tua crescita personale del mese.' },
};
const aperturaSezione = (pallino, nome) => {
  const d = SEZIONI_FOGLIO[nome];
  return `<section class="ob-sez" data-sez="${d.id}"><button type="button" class="ob-sez-testa" aria-expanded="${d.aperta}"><span><b>${escIcone(pallino)}${esc(nome)}</b><small>${esc(d.spiega)}</small><em class="ob-sez-sunto"></em></span><span class="ob-sez-dx"><i>${d.aperta ? '⌃' : '⌄'}</i></span></button><div class="ob-sez-corpo"${d.aperta ? '' : ' hidden'}>`;
};
// I punti con i centesimi nelle caselle si scrivono con la VIRGOLA, senza il punto delle migliaia (Ignazio 01/10: il punto si confondeva con la virgola)
const fmtNum = v => (v === '' || v == null ? '' : Number(v).toLocaleString('it-IT', { useGrouping: false, maximumFractionDigits: 2 }));
function apriObiettivi() {
  if (ST.offline || !DS.dati || soloGuardo() || !obiettiviAperti()) return;
  const D = MB21Dashboard, mese = DS.dati.mese;
  const { valori, mesePrima } = D.propostaObiettivi(DS.obiettivi, mese, 'attuali');
  const prima = mesePrima ? D.nomeMese(mesePrima).toLowerCase() : null;
  // I risultati sono del mese di calendario scorso, i traguardi dell'ultimo mese che ne aveva: di solito è lo stesso mese
  const meseRis = D.meseSpostato(mese, -1);
  const ris = D.risultatiMese({ checkMesi: DS.checkMesi || [], obiettivi: DS.obiettivi, mese: meseRis, oggi: ST.oggi, segniAl: DS.segniAl });
  const nomeRis = D.nomeMese(meseRis).toLowerCase();
  const risValori = ris ? Object.fromEntries(Object.entries(ris).map(([k, v]) => [k, v > 0 ? v : ''])) : null;   // un obiettivo a 0 non serve: campo vuoto
  const mesePrimo = Number(meseRis.slice(0, 4) + meseRis.slice(5, 7));
  // Gli obiettivi già salvati per questo mese (Ignazio 01/10: riaprendo il foglio il 12% scelto non si vedeva e restava il consiglio del 9%): se ci sono, il gradino
  // a cui corrispondono si ritrova acceso e il consiglio lascia il posto a «Hai il bonus 12%»
  const attuale = DS.obiettivi.find(o => o.mese === mese) || null;
  const salvato = D.haObiettivi(attuale);
  const gradinoSalvato = salvato ? MB21Check.gradinoDaVpg(attuale.vpg) : null;
  const meseOra = Number(mese.slice(0, 4) + mese.slice(5, 7));
  let vpgOra = null;   // il VPG del mese in corso, dal file Amway (si legge sotto, quando c'è il codice)
  // «Scala dei bonus»: il gradino di partenza è quello del mese prima (il Bonus Attività di quel mese, `volumi_mese`), si cambia con un tocco
  const NOMI_GRADINI = { 9: 'Leaders Club', 15: 'Executive', 21: 'Argento' };   // i livelli del Manuale che coincidono con un gradino
  const pidVisto = visto().partner_id;
  let gradinoPartenza = MB21Check.gradinoDalBonus(null), bonusPrima = null;   // finché non arriva la lettura (o se non arriva), il 3%
  let consiglia = () => {};   // si riempie quando il foglio è disegnato
  if (pidVisto) {
    dbq('bonus del mese prima', supa.from('volumi_mese').select('bonus').eq('partner_id', pidVisto).eq('mese', Number(meseRis.slice(0, 4) + meseRis.slice(5, 7))).maybeSingle())
      .then(r => { gradinoPartenza = MB21Check.gradinoDalBonus(r && r.data ? r.data.bonus : null); bonusPrima = r && r.data && r.data.bonus != null ? Number(r.data.bonus) : null; consiglia(); }, () => {});
  }
  if (pidVisto) {
    dbq('VPG di adesso', supa.from('volumi_mese').select('vpg').eq('partner_id', pidVisto).eq('mese', meseOra).maybeSingle())
      .then(r => { vpgOra = r && r.data && r.data.vpg != null ? Number(r.data.vpg) : null; riepilogoAgg(); }, () => {});
  }
  let riepilogoAgg = () => {};   // si riempie quando il foglio è disegnato
  // «Risultati di <mese>»: oltre al Check, quello che dice il file Amway (entrati nel mese, prime linee, linee riceventi Bonus, totale gruppo, 15 Planner);
  // si legge subito all'apertura, così al tocco è già pronto (D.risultatiAmway)
  let risAmwayDati = null;
  const risAmway = !pidVisto ? Promise.resolve(null) : Promise.all([
    dbq('squadra del mese', supa.from('squadra').select('partner_id, sponsor_id, data_ingresso')),
    dbq('volumi del mese', supa.from('volumi_mese').select('partner_id, mese, vpp, bonus, dimensioni_gruppo').eq('mese', mesePrimo)),
    dbq('15 Planner del mese', supa.rpc('pm_del_ramo', { da: mesePrimo })),
  ]).then(([sq, vol, pmr]) => (sq.error || vol.error ? null : D.risultatiAmway({ squadra: sq.data, volumi: vol.data, pm: pmr.error ? null : pmr.data, pid: pidVisto, mese: mesePrimo })), () => null)
    .then(r => { risAmwayDati = r; return r; });
  const velo = document.createElement('div');
  velo.className = 'velo';
  // stessa forma degli altri moduli (cantiere 34)
  velo.innerHTML = `<div class="foglio alto mc">
    ${OBIETTIVI_PER_TUTTI ? '' : '<small class="solo-tu">⚠️ Per ora lo vedi solo tu</small>'}
    <div class="mc-testa"><span class="ts-pastiglia" style="background:var(--pericolo-tinta);color:var(--pericolo)">${ic('obiettivi')}</span>
      <div><small>Obiettivi del mese${esc(aNome())}</small><b>${esc(D.nomeMese(mese))}</b></div><button id="ob-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <div class="ob-riepilogo" id="ob-riepilogo"></div>
    <div class="riquadro mc-g" style="margin-top:10px;padding-top:12px">
    <div class="ob-scala-testa"><b>Scala dei bonus</b><small>Un traguardo e il foglio si compila da solo</small></div>
      <div id="ob-sistema">
        <div class="chips ob-livelli"><span>Bonus</span>${MB21Check.GRADINI_BONUS.map(g => `<button data-bonus="${g}"${NOMI_GRADINI[g] ? ' class="traguardo"' : ''}>${g}%${NOMI_GRADINI[g] ? `<small>${NOMI_GRADINI[g]}</small>` : ''}</button>`).join('')}</div>
      </div>
      <p class="ob-consiglio" id="ob-consiglio"></p>
      <p class="ob-oppure">Oppure si parte da</p>
      <div class="chips ob-modi">
        <button data-modo="uguale"${prima ? '' : ' disabled'}>Obiettivi di ${esc(prima || nomeRis)}</button>
        <button data-modo="risultati"${ris ? '' : ' disabled'}>Risultati di ${esc(nomeRis)}</button>
        <button data-modo="vuoti">Scrivo io</button></div>
      <p class="ob-nota-base" id="ob-nota-base"></p>
      <div class="ob-crescita">
        <div class="ob-crescita-testa">Incremento: <b id="ob-perc">0%</b></div>
        <input type="range" id="ob-barra" min="0" max="${D.CRESCITE.length - 1}" step="1" value="0">
        <div class="ob-tacche">${D.CRESCITE.map(c => `<span>${c}%</span>`).join('')}</div>
        <div class="ob-ambizioso" id="ob-ambizioso" hidden>${ic('crescita')} Obiettivo ambizioso: parlane con il tuo upline</div>
      </div></div>
    ${D.CAMPI_OBIETTIVI.map(([gruppo, pallino, campi]) => `${aperturaSezione(pallino, gruppo)}<div class="riquadro mc-g ob-gruppo"><div class="ob-campi">
      ${campi.map(([k, etichetta, decimale]) => `${k === 'vpv' ? `<label>di cui consumo personale<input id="ob-consumo" inputmode="decimal"></label>` : ''}<label${CLASSE_TOTALE[k] ? ` class="ob-totale ${CLASSE_TOTALE[k]}"` : ''}>${esc(ETICHETTA_FOGLIO[k] || etichetta)}${(k === 'bbs' || k === 'wes') && DS.eventi && DS.eventi[etichetta] ? ` <small class="ob-evento">${esc(DS.eventi[etichetta].lungo)}</small>` : ''}<input id="ob-${k}" inputmode="${decimale ? 'decimal' : 'numeric'}" value="${esc(decimale ? fmtNum(valori[k]) : valori[k])}"></label>${k === 'vpg' ? '<div class="ob-dal-gruppo" id="ob-dal-gruppo"></div>' : ''}${k === 'pm' ? '<div class="ob-dal-gruppo ob-az" id="ob-hint-pm"></div>' : ''}${k === 'contatti' ? '<div class="ob-dal-gruppo ob-az" id="ob-hint-contatti"></div>' : ''}${k === 'bbs' || k === 'wes' || k === 'cep' ? `<div class="ob-dal-gruppo ob-sv" id="ob-ora-${k}"></div>` : ''}`).join('')}
    </div></div></div></section>${gruppo === 'Squadra' ? `${aperturaSezione('⚪', 'Le tue linee')}<div class="riquadro mc-g ob-gruppo">
      <p class="ob-linee-testo">I punti che ti aspetti dalle tue linee, già in possesso o da creare.</p>
      <div id="ob-linee"></div>
      <div class="ob-dal-gruppo" id="ob-linee-somma"></div>
      <div class="ob-linee-az">${pidVisto ? '<button type="button" class="link" id="ob-linee-porta">Porta le mie prime linee</button>' : ''}<button type="button" class="link" id="ob-linee-nuova">+ Aggiungi linea</button></div>
      <div class="ob-dal-gruppo" id="ob-linee-nota"></div></div></div></section>` : ''}`).join('')}
    ${pidVisto ? '<p class="ob-visto">La tua Linea di Sponsorizzazione vede i tuoi obiettivi del mese, per aiutarti a raggiungerli.</p>' : ''}
    <div class="errore" id="ob-errore"></div>
    <div class="mc-fondo"><button class="link" id="ob-no">Annulla</button><button class="primario" id="ob-si">Salva obiettivi</button></div>
  </div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.querySelector('#ob-x').onclick = chiudi;
  velo.querySelector('#ob-no').onclick = chiudi;
  // se il file Amway ha dei risultati, la scelta «Risultati» si accende anche quando il Check non ne aveva
  risAmway.then(r => { const b = velo.querySelector('[data-modo="risultati"]'); if (b && r && Object.values(r).some(v => v > 0)) b.disabled = false; });
  // VPP = consumo personale + VP Clienti (Ignazio 01/10): il VPP è il totale e si scrive per primo; «di cui consumo personale» e «di cui VP Clienti»
  // dicono come si divide, e toccandone una l'altra si aggiusta da sola. Il consumo personale non si salva: è VPP meno VP Clienti.
  // Cambiando il VPP la divisione si tiene IN PROPORZIONE (`quotaClienti`, ricordata finché non si tocca la divisione): scrivendo 100 cifra per cifra
  // («1», «10», «100») i VP Clienti non restano schiacciati sul primo numero (01/10: con VPP 100 uscivano consumo 99 e clienti 1).
  const campo = id => velo.querySelector('#ob-' + id);
  const numero = id => { const x = Number(String(campo(id).value).trim().replace(',', '.')); return Number.isFinite(x) && x > 0 ? x : 0; };
  const scriviNum = (id, v) => { campo(id).value = v > 0 ? fmtNum(v) : (v === 0 ? '0' : ''); };
  const consumoDaVpp = () => { const t = numero('vpp'); campo('consumo').value = t > 0 ? fmtNum(t - Math.min(numero('vpv'), t)) : ''; };
  let quotaClienti = 0;   // quanta parte del VPP viene dai clienti (0 … 1)
  const ricordaQuota = () => { const t = numero('vpp'); if (t > 0) quotaClienti = Math.min(numero('vpv'), t) / t; else if (!numero('vpv')) quotaClienti = 0; };   // da vuoto si riparte senza divisione
  campo('vpp').addEventListener('input', () => {
    const t = numero('vpp');
    if (t > 0 && quotaClienti > 0) scriviNum('vpv', Math.round(t * quotaClienti));
    else if (t > 0 && numero('vpv') > t) scriviNum('vpv', t);
    consumoDaVpp();
  });
  campo('vpv').addEventListener('input', () => { const t = numero('vpp'); if (t > 0 && numero('vpv') > t) scriviNum('vpv', t); consumoDaVpp(); ricordaQuota(); });
  campo('consumo').addEventListener('input', () => { const t = numero('vpp'); if (t > 0) scriviNum('vpv', t - Math.min(numero('consumo'), t)); consumoDaVpp(); ricordaQuota(); });
  const scrivi = nuovi => {
    for (const [, , campi] of D.CAMPI_OBIETTIVI) for (const [k, , dec] of campi) campo(k).value = nuovi ? (dec ? fmtNum(nuovi[k]) : (nuovi[k] ?? '')) : '';
    consumoDaVpp(); ricordaQuota(); dalGruppo(); indicazioni(); riepilogo(); sunti(); oraSegni();
  };
  // Nuovi Iscritti è il totale e Iscritti personali «di cui»: i personali non superano mai il totale (un personale è anche un nuovo iscritto)
  campo('sponsor_gruppo').addEventListener('input', () => { const t = numero('sponsor_gruppo'); if (t > 0 && numero('sponsor_personali') > t) scriviNum('sponsor_personali', t); });
  campo('sponsor_personali').addEventListener('input', () => { const p = numero('sponsor_personali'); if (p > numero('sponsor_gruppo')) scriviNum('sponsor_gruppo', p); });
  // «Le tue linee» (Ignazio 01/10, solo punti): righe nome + VP. Le linee già in possesso arrivano dal file Amway (nome fisso), quelle da creare si scrivono a mano.
  const righeLinee = velo.querySelector('#ob-linee');
  const numeroDi = el => { const x = Number(String(el.value).trim().replace(',', '.')); return Number.isFinite(x) && x > 0 ? x : 0; };
  const leggiLinee = () => [...righeLinee.querySelectorAll('.ob-linea')].map(r => ({ partner_id: r.dataset.pid || null, nome: r.querySelector('.ob-linea-nome').value.trim(), vp: numeroDi(r.querySelector('.ob-linea-vp')) }));
  const sommaLinee = () => leggiLinee().reduce((t, l) => t + l.vp, 0);
  const f = x => x.toLocaleString('it-IT');
  // «Gli altri da dove vengono?»: sotto il VPG, i punti che non sono i tuoi (VPG meno VPP) e chi li porta: i nuovi iscritti (50 VP a testa, quelli
  // scritti in Nuovi Iscritti) e le linee (quelle scritte qui sotto; senza linee, «le linee già attive»), con quanto resta da trovare (D.ripartoGruppo)
  const dalGruppo = () => {
    const el = velo.querySelector('#ob-dal-gruppo'), somma = sommaLinee();
    const r = D.ripartoGruppo(numero('vpg'), numero('vpp'), numero('sponsor_gruppo'), somma);
    velo.querySelector('#ob-linee-somma').textContent = somma > 0 ? `Le tue linee: ${f(somma)} VP in tutto` : '';
    if (!r) { el.textContent = numero('vpg') > 0 && numero('vpp') > 0 ? 'Il VPG è già coperto dal tuo VPP' : ''; return; }
    const nuovi = r.nuovi ? `${r.nuovi} ${r.nuovi === 1 ? 'nuovo iscritto' : 'nuovi iscritti'} da ${D.VP_NUOVO_ISCRITTO} VP = ${f(r.nuovi * D.VP_NUOVO_ISCRITTO)} VP` : '';
    const linee = r.conLinee ? (r.daLinee || r.restano ? `dalle tue linee: ${f(r.daLinee)} VP · ${r.restano ? `ancora da trovare: ${f(r.restano)} VP` : 'coperti'}` : 'coprono tutto')
      : r.daLinee ? `dalle linee già attive: ${f(r.daLinee)} VP` : 'coprono tutto';
    el.textContent = `Dal gruppo: ${f(r.altri)} VP · ` + (r.nuovi || r.conLinee ? [nuovi, linee].filter(Boolean).join(' · ') : `nuovi iscritti (${D.VP_NUOVO_ISCRITTO} VP a testa) e linee già attive`);
  };
  // Sotto ogni linea già in possesso, i suoi punti piccoli: «settembre N · ora M» (VPG del mese scorso e di adesso, dal file Amway; Ignazio 01/10)
  const vpDelleLinee = new Map();   // partner_id → { prima, ora } (si riempie quando arriva la lettura)
  const obiettivoDelleLinee = new Map();   // partner_id → il VPG che quella linea si è data per il mese (lo vede solo chi le sta sopra, `obiettivi_del_ramo`)
  const sottoLinea = r => {
    const v = vpDelleLinee.get(r.dataset.pid), el = r.querySelector('.ob-linea-sub'), suo = obiettivoDelleLinee.get(r.dataset.pid);
    const parti = [v && v.prima != null ? `${D.nomeMese(meseRis).toLowerCase()} ${f(Math.round(v.prima))}` : '', v && v.ora != null ? `ora ${f(Math.round(v.ora))}` : '', suo > 0 ? `suo obiettivo ${f(Math.round(suo))}` : ''].filter(Boolean);
    el.textContent = parti.join(' · ');
    el.hidden = !parti.length;
  };
  const aggiungiLinea = l => {
    const r = document.createElement('div');
    r.className = 'ob-linea'; r.dataset.pid = l.partner_id || '';
    r.innerHTML = `<input class="ob-linea-nome" placeholder="Nome della linea" value="${esc(l.nome || '')}"${l.partner_id ? ' readonly' : ''}><input class="ob-linea-vp" inputmode="decimal" placeholder="VP" value="${l.vp > 0 ? esc(fmtNum(l.vp)) : ''}"><button type="button" class="ob-linea-x" aria-label="Togli questa linea">×</button><small class="ob-linea-sub"></small>`;
    r.querySelector('.ob-linea-vp').addEventListener('input', dalGruppo);
    sottoLinea(r);
    r.querySelector('.ob-linea-x').onclick = () => { r.remove(); dalGruppo(); riepilogo(); sunti(); };
    righeLinee.appendChild(r);
    return r;
  };
  velo.querySelector('#ob-linee-nuova').onclick = () => { aggiungiLinea({}).querySelector('.ob-linea-nome').focus(); };
  const nota = t => { velo.querySelector('#ob-linee-nota').textContent = t; };
  const porta = velo.querySelector('#ob-linee-porta');
  if (porta) porta.onclick = async () => {
    porta.disabled = true; nota('Cerco le tue prime linee…');
    const [sq, vol] = await Promise.all([dbq('prime linee', supa.from('squadra').select('partner_id, sponsor_id, nome')), dbq('punti delle linee', supa.from('volumi_mese').select('partner_id, mese, vpg').eq('mese', mesePrimo)), lettura]);
    porta.disabled = false;
    if (sq.error || vol.error) return nota('Non riesco a leggere il file Amway: riprova.');
    const gia = new Set(leggiLinee().map(l => l.partner_id).filter(Boolean));
    const nuove = D.lineeDaSquadra(sq.data, vol.data, pidVisto, mesePrimo).filter(l => !gia.has(l.partner_id));
    // i punti si scrivono (sono obiettivi, cose da fare, non quelle già fatte): settembre e ora stanno sotto come riferimento; se la linea ha già scelto il suo obiettivo, parte da quello
    nuove.forEach(l => aggiungiLinea({ partner_id: l.partner_id, nome: MB21Mappa.nomeLeggibile(l.nome), vp: obiettivoDelleLinee.get(l.partner_id) || 0 }));
    dalGruppo();
    const dalSuo = nuove.filter(l => obiettivoDelleLinee.has(l.partner_id)).length;
    nota(nuove.length ? `Aggiunte ${nuove.length} ${nuove.length === 1 ? 'linea' : 'linee'}: ${dalSuo ? `dove la linea ha già scelto il suo obiettivo ho scritto quello, per le altre scrivi tu i punti.` : 'sotto ognuna trovi i punti di settembre e di adesso, i punti li scrivi tu.'}` : gia.size ? 'Le tue prime linee ci sono già.' : 'Non trovo prime linee nel file Amway: aggiungile a mano.');
  };
  // i punti di settembre e di adesso delle linee (una lettura sola; arriva anche dopo le righe, che si aggiornano)
  if (pidVisto) dbq('punti delle linee, settembre e ora', supa.from('volumi_mese').select('partner_id, mese, vpg').in('mese', [mesePrimo, meseOra])).then(r => {
    if (!r || r.error || !r.data) return;
    for (const v of r.data) { const x = vpDelleLinee.get(v.partner_id) || {}; x[v.mese === meseOra ? 'ora' : 'prima'] = v.vpg == null ? null : Number(v.vpg); vpDelleLinee.set(v.partner_id, x); }
    righeLinee.querySelectorAll('.ob-linea').forEach(sottoLinea);
  }, () => {});
  // gli obiettivi che le linee si sono date (solo verso il basso, nella stessa linea: lo garantisce il database, `obiettivi_del_ramo`); per un partner senza
  // nessuno sotto, o per chi non ha scritto obiettivi, resta vuoto. Il Admin riceve tutti, qui contano solo le prime linee di chi sta guardando.
  const lettura = !pidVisto ? Promise.resolve() : dbq('obiettivi delle linee', supa.rpc('obiettivi_del_ramo', { p_mese: mese })).then(r => {
    if (!r || r.error || !r.data) return;
    for (const o of r.data.obiettivi || []) if (o.partner_id && Number(o.vpg) > 0) obiettivoDelleLinee.set(o.partner_id, Number(o.vpg));
    righeLinee.querySelectorAll('.ob-linea').forEach(sottoLinea);
  }, () => {});
  // quelle già salvate per questo mese
  dbq('linee del mese', supa.from('obiettivi_linee').select('partner_id, nome, vp').eq('user_id', visto().id).eq('mese', mese).order('creato_il')).then(r => {
    if (r && r.data && r.data.length && !righeLinee.children.length) { r.data.forEach(l => aggiungiLinea({ partner_id: l.partner_id, nome: l.nome, vp: Number(l.vp) })); dalGruppo(); }
  }, () => {});
  for (const id of ['vpp', 'vpg', 'sponsor_gruppo']) campo(id).addEventListener('input', dalGruppo);
  // «Attraverso quanti PM e quanti contatti?»: l'indicazione sotto le due caselle (valori di partenza uguali per tutti, D.percorsoAzione); si scrive come si vuole
  const rapportiStorico = D.rapportiDalloStorico(DS.checkMesi, mese);   // i rapporti veri del partner (Check e azioni degli ultimi 6 mesi), che correggono quelli di partenza
  const indicazioni = () => {
    const r = D.percorsoAzione(numero('sponsor_personali'), numero('sponsor_gruppo'), numero('pm'), rapportiStorico);
    const fonte = t => (t === 'storico' ? 'dal tuo storico' : t === 'misto' ? 'in parte dal tuo storico' : 'valore di partenza');   // su cosa si basa, sempre scritto
    velo.querySelector('#ob-hint-pm').textContent = r ? `Per ${r.iscritti} ${r.personali ? (r.iscritti === 1 ? 'iscritto personale' : 'iscritti personali') : (r.iscritti === 1 ? 'nuovo iscritto' : 'nuovi iscritti')}: circa ${f(r.pm)} PM (${r.rapportoPm} per un iscritto · ${fonte(r.fontePm)})` : '';
    velo.querySelector('#ob-hint-contatti').textContent = r ? `Per ${f(r.perPm ? numero('pm') : r.pm)} PM: circa ${f(r.contatti)} contatti (${r.rapportoContatti} per ogni PM · ${fonte(r.fonteContatti)})` : '';
  };
  for (const id of ['sponsor_gruppo', 'sponsor_personali', 'pm']) campo(id).addEventListener('input', indicazioni);
  // Il riepilogo fisso in cima («il risultato che voglio») e, a sezione chiusa, il suo riassunto sulla testata (Ignazio 01/10)
  const testoNum = id => { const x = numero(id); return x > 0 ? f(x) : ''; };
  const riepilogo = () => {
    const vpg = testoNum('vpg'), vpp = testoNum('vpp'), nuovi = testoNum('sponsor_gruppo'), pers = testoNum('sponsor_personali');
    // quanti VPG mancano rispetto a quello atteso (Ignazio 01/10): il VPG di adesso dal file Amway contro l'obiettivo scritto
    const atteso = numero('vpg'), ora = vpgOra != null && atteso > 0 ? (vpgOra >= atteso ? 'Il VPG atteso è già raggiunto' : `Ora sei a ${f(Math.round(vpgOra * 100) / 100)} VPG: ne mancano ${f(Math.round((atteso - vpgOra) * 100) / 100)}`) : '';
    const el = velo.querySelector('#ob-riepilogo');
    el.innerHTML = vpg || nuovi
      ? `<div><b>${vpg ? `VPG ${esc(vpg)}` : 'VPG da scegliere'}</b>${vpp ? ` <span>· di cui tuoi ${esc(vpp)} (consumo ${esc(testoNum('consumo') || '0')} + clienti ${esc(testoNum('vpv') || '0')})</span>` : ''}</div>`
        + (ora ? `<div class="ob-riepilogo-ora">${esc(ora)}</div>` : '')
        + `<div><b>${nuovi ? `Nuovi iscritti ${esc(nuovi)}` : 'Nuovi iscritti da scegliere'}</b>${pers ? ` <span>· di cui personali ${esc(pers)}</span>` : ''}</div>`
      : '<span class="ob-riepilogo-vuoto">Qui in cima compare il riassunto di quello che scegli.</span>';
  };
  riepilogoAgg = riepilogo;   // quando arriva la lettura del VPG di adesso, il riepilogo si aggiorna
  // BBS, WES e CEP sono numeri da raggiungere (Ignazio 01/10: «oggi 5, vogliamo arrivare a 10»): sotto ognuno, quanti sono adesso nel gruppo e quanti ne mancano all'obiettivo scritto
  const segniOra = (() => { const sc = ((DS.dati && DS.dati.schede) || []).find(x => x.chiave === 'segni'); const m = {};
    for (const r of (sc && sc.riquadri) || []) { const x = Number(String(r.numero).replace(/\./g, '').replace(',', '.')); if (Number.isFinite(x)) m[r.titolo.toLowerCase()] = x; } return m; })();
  const oraSegni = () => { for (const k of ['bbs', 'wes', 'cep']) {
    const ora = segniOra[k], atteso = numero(k), el = velo.querySelector('#ob-ora-' + k);
    el.textContent = ora == null ? '' : atteso > 0 ? (ora >= atteso ? `Ora sono ${f(ora)}: obiettivo raggiunto` : `Ora sono ${f(ora)}: ne mancano ${f(atteso - ora)}`) : `Ora sono ${f(ora)} nel gruppo`;
  } };
  oraSegni();
  for (const k of ['bbs', 'wes', 'cep']) campo(k).addEventListener('input', oraSegni);
  // nota 035 (Ignazio 07/10): il riassunto sta su una riga sotto la spiegazione, in parole semplici e con i numeri in grassetto
  const sunto = id => {
    const n = k => { const t = testoNum(k); return t ? `<strong>${esc(t)}</strong>` : ''; }, unisci = (...p) => p.filter(Boolean).join(' · ');
    const biglietti = unisci(n('bbs') && `BBS ${n('bbs')}`, n('wes') && `WES ${n('wes')}`);
    return { volume: unisci(n('vpg') && `Punti del gruppo (VPG) ${n('vpg')}`, n('vpp') && `tuoi (VPP) ${n('vpp')}`),
      azione: unisci(n('sponsor_gruppo') && `${n('sponsor_gruppo')} nuovi iscritti`, n('pm') && `${n('pm')} Piani Marketing`, n('contatti') && `${n('contatti')} contatti`),
      squadra: unisci(n('prime_linee') && `${n('prime_linee')} prime linee`, n('totale_gruppo') && `${n('totale_gruppo')} persone nel gruppo`),
      linee: (() => { const l = leggiLinee().filter(x => x.nome || x.vp); return l.length ? `<strong>${l.length}</strong> ${l.length === 1 ? 'linea' : 'linee'}${sommaLinee() ? ` · <strong>${esc(f(sommaLinee()))}</strong> punti` : ''}` : ''; })(),
      segni: unisci(biglietti && `Biglietti ${biglietti}`, n('cep') && `abbonati CEP ${n('cep')}`),
      crescita: unisci(n('tracce') && `${n('tracce')} tracce`, n('pagine') && `${n('pagine')} pagine`) }[id] || '';
  };
  const sunti = () => velo.querySelectorAll('.ob-sez').forEach(sez => { sez.querySelector('.ob-sez-sunto').innerHTML = sez.querySelector('.ob-sez-corpo').hidden ? sunto(sez.dataset.sez) : ''; });
  velo.querySelectorAll('.ob-sez-testa').forEach(b => {
    b.onclick = () => {
      const corpo = b.nextElementSibling, apri = corpo.hidden;
      corpo.hidden = !apri; b.setAttribute('aria-expanded', String(apri)); b.querySelector('i').textContent = apri ? '⌃' : '⌄';
      sunti();
    };
  });
  velo.addEventListener('input', () => { riepilogo(); sunti(); });
  consumoDaVpp(); ricordaQuota(); dalGruppo(); indicazioni(); riepilogo(); sunti();
  const sceltaModo = b => velo.querySelectorAll('[data-modo]').forEach(x => x.classList.toggle('scelto', x === b));   // la scala (bottone grande) e le tre scelte sotto
  // «Base» = da cosa parte l'aumento: i traguardi del mese scorso, i risultati, la scala dei bonus, o niente (Scrivo io)
  // Scala dei bonus: il `gradino` (3% … 21%) riempie tutte le caselle di cui la scala ha il numero (MB21Check.SCALA_BONUS), le altre restano al partner
  let base = null, gradino = null;
  // i risultati: Check e file Amway insieme. Iscritti (personali e gruppo): il numero più alto dei due (il file arriva dopo, il Check si scrive a mano);
  // prime linee, linee riceventi Bonus, totale gruppo, 15 Planner: solo dal file Amway; senza dato la casella resta vuota
  const risUnito = () => {
    const r = { ...(risValori || Object.fromEntries(D.CHIAVI_FOGLIO.map(k => [k, '']))) }, a = risAmwayDati;
    if (!a) return r;
    for (const k of ['sponsor_personali', 'sponsor_gruppo']) { const m = Math.max(Number(r[k]) || 0, a[k] || 0); r[k] = m > 0 ? m : ''; }
    for (const k of ['prime_linee', 'linee_bonus', 'totale_gruppo', 'planner']) r[k] = a[k] > 0 ? a[k] : '';
    return r;
  };
  const NOMI_CAMPI = Object.fromEntries(D.CAMPI_OBIETTIVI.flatMap(([, , campi]) => campi.map(([k, e]) => [k, e])));
  // sotto le scelte, da dove arrivano i numeri e quali caselle restano vuote (e perché): nessuna casella vuota senza una spiegazione
  const notaBase = () => {
    const el = velo.querySelector('#ob-nota-base');
    const vuote = Object.keys(NOMI_CAMPI).filter(k => !String(campo(k).value).trim() && !['pm', 'contatti'].includes(k));
    const elenco = vuote.map(k => NOMI_CAMPI[k]).join(', ');
    el.textContent = base === 'risultati' ? `Quello che risulta dal Check e dal file Amway di ${nomeRis}.${elenco ? ` Nessun dato per: ${elenco}.` : ''}`
      : base === 'uguale' ? `I traguardi che ti eri dato a ${prima || nomeRis}.${elenco ? ` Non c'erano: ${elenco}.` : ''}`
      : base === 'scala' ? `Numeri del bonus ${gradino}%.${elenco ? ` Da scrivere tu: ${elenco}.` : ''}`
      : base === 'vuoti' ? 'Le caselle restano vuote: i numeri li scrivi tu.'
      : '';
  };
  const valoriBase = () => (base === 'risultati' ? risUnito() : base === 'scala' ? MB21Check.obiettiviDelBonus(gradino) : D.propostaObiettivi(DS.obiettivi, mese, 'uguale').valori);
  const barra = velo.querySelector('#ob-barra');
  const perc = velo.querySelector('#ob-perc'), ambizioso = velo.querySelector('#ob-ambizioso');
  const righeLivelli = velo.querySelector('#ob-sistema');
  const azzeraBarra = () => { perc.textContent = '0%'; barra.value = 0; ambizioso.hidden = true; };   // scegliendo un'altra base l'incremento riparte da 0%
  // I bonus stanno sempre in vista (Ignazio 01/10: «non è intuibile cliccare su Scala dei bonus»): nessuna scelta già fatta, un consiglio da dove partire
  // (il bonus del mese prima, o il 3% per chi comincia) e il gradino toccato diventa scuro. Passando a un'altra base si spegne.
  const sceltaGradino = () => righeLivelli.querySelectorAll('button').forEach(x => x.classList.toggle('scelto', Number(x.dataset.bonus) === (base === 'scala' ? gradino : base === null ? gradinoSalvato : null)));   // senza una scelta nuova, si ritrova il gradino già salvato
  const mostraScala = () => { if (base === 'scala') gradino = gradino || gradinoPartenza; sceltaGradino(); };
  consiglia = () => {
    righeLivelli.querySelectorAll('button').forEach(x => x.classList.toggle('consigliato', !salvato && Number(x.dataset.bonus) === gradinoPartenza));
    velo.querySelector('#ob-consiglio').textContent = salvato
      ? (gradinoSalvato ? `Hai il bonus ${gradinoSalvato}%: sono i tuoi obiettivi di ${D.nomeMese(mese).toLowerCase()}.` : `Questi sono i tuoi obiettivi di ${D.nomeMese(mese).toLowerCase()}.`)
      : bonusPrima != null && bonusPrima > 0
      ? `Ti consiglio di partire dal ${gradinoPartenza}%: il tuo bonus di ${nomeRis} era ${f(bonusPrima)}%.`
      : `Ti consiglio di partire dal ${gradinoPartenza}%, il primo gradino.`;
  };
  consiglia(); sceltaGradino();
  velo.querySelectorAll('[data-modo]').forEach(b => {
    b.onclick = async () => {
      base = b.dataset.modo; sceltaModo(b); azzeraBarra(); mostraScala();
      if (base === 'risultati' && !risAmwayDati) { velo.querySelector('#ob-nota-base').textContent = 'Leggo i dati…'; await risAmway; if (base !== 'risultati') return; }
      scrivi(base === 'vuoti' ? null : valoriBase()); notaBase();
    };
  });
  righeLivelli.querySelectorAll('button').forEach(b => {
    b.onclick = () => { base = 'scala'; gradino = Number(b.dataset.bonus); sceltaModo(null); azzeraBarra(); sceltaGradino(); scrivi(valoriBase()); notaBase(); };
  });
  barra.oninput = () => {
    const p = D.CRESCITE[Number(barra.value)];
    perc.textContent = p ? `+${p}%` : '0%';   // 0%: i numeri della scelta, com'è
    ambizioso.hidden = p <= D.SOGLIA_AMBIZIOSO;
    if (base === null || base === 'vuoti') { base = prima ? 'uguale' : ris ? 'risultati' : 'scala'; }
    sceltaModo(velo.querySelector(`[data-modo="${base}"]`));
    mostraScala();
    scrivi(Object.fromEntries(Object.entries(valoriBase()).map(([k, v]) => [k, v === '' || v == null ? '' : D.aumenta(Number(v), p)])));
    notaBase();
  };
  barra.onclick = barra.oninput;   // un tocco sulla posizione di partenza (0%) vale anche senza spostarla: tiene la scelta com'è
  // L'errore sta in fondo al foglio: chi tocca «Salva» da in alto non lo vedeva e credeva di aver salvato (Ignazio 01/10, il 600 di una linea tornava 400), quindi ci si porta lì
  const mostraErrore = t => { const el = velo.querySelector('#ob-errore'); el.textContent = t; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  velo.querySelector('#ob-si').onclick = async () => {
    const letti = {};
    for (const [, , campi] of D.CAMPI_OBIETTIVI) for (const [k] of campi) letti[k] = velo.querySelector('#ob-' + k).value;
    const { errore, valori: v } = D.validaObiettivi(letti);
    if (errore) { mostraErrore(errore); return; }
    if (leggiLinee().some(l => l.vp > 0 && !l.nome)) { mostraErrore('Scrivi il nome della linea.'); return; }
    const btn = velo.querySelector('#ob-si');
    btn.disabled = true; btn.textContent = 'Salvo…';
    // upsert sulla coppia partner+mese: tocca solo gli obiettivi (partenza e dati Amway restano)
    const { error } = await dbq('salva obiettivi', supa.from('obiettivi_mese')
      .upsert({ user_id: visto().id, mese, ...v }, { onConflict: 'user_id,mese' }));   // Partner Select: a nome del partner scelto
    if (error) {
      btn.disabled = false; btn.textContent = 'Salva obiettivi';
      mostraErrore('Non salvato: controlla la connessione e riprova.');
      return;
    }
    // le linee del mese: si riscrivono quelle del foglio (una sola lista per mese)
    const linee = leggiLinee().filter(l => l.nome);
    const tolte = await dbq('togli le linee', supa.from('obiettivi_linee').delete().eq('user_id', visto().id).eq('mese', mese));
    const messe = tolte.error || !linee.length ? tolte : await dbq('salva le linee', supa.from('obiettivi_linee').insert(linee.map(l => ({ user_id: visto().id, mese, partner_id: l.partner_id, nome: l.nome, vp: l.vp }))));
    if (messe.error) {
      btn.disabled = false; btn.textContent = 'Salva obiettivi';
      mostraErrore('Obiettivi salvati, ma le linee no: controlla la connessione e riprova.');
      return;
    }
    chiudi();
    await caricaDashboard(ST.oggi);
    disegnaOggi();
    mostraToast(`Obiettivi di ${D.nomeMese(mese)} salvati`);
  };
}

// Riquadro ampio degli obiettivi (Ignazio 01/10): dall'1 al 5 del mese, se gli obiettivi mancano, si apre da solo
// ogni volta che si entra in Dashboard o si rientra nell'app (non a ogni ridisegno: si ricorda in memoria, e si dimentica
// lasciando la Dashboard o uscendo dall'app) fino a quando non sono impostati. Si chiude per proseguire (la Dashboard sotto resta com'è); il banner resta.
const GIORNI_RIQUADRO_OBIETTIVI = 5;
// Foglio nuovo (Ignazio 01/10): chi gli obiettivi li aveva già scritti con il foglio vecchio vede il riquadro UNA volta (dall'1 al 3 ottobre 2026):
// «puoi rifarli, riportando i dati». Mai all'Admin («tranne per me»). Stessa finestra dell'avviso della sera (regole.ts → FOGLIO_NUOVO).
// Non insistente né opprimente (Ignazio 02/10): a chi li deve ancora scegliere il riquadro si apre al massimo UNA volta al giorno su quel dispositivo
// (anche se tocca «Più tardi» o esce e rientra), e con «Non questo mese» non si apre più per tutto il mese, né qui né come avviso (tabella `obiettivi_salto`).
const RIFAI_OBIETTIVI = { dal: '2026-10-01', al: '2026-10-03' };
const chiaveRifaiOb = mese => `mb21_ob_rifai_${ST.utente.id}_${mese}`;
const chiaveOggiOb = oggi => `mb21_ob_riquadro_${ST.utente.id}_${oggi}`;
const ricordoOb = chiave => { try { return !!localStorage.getItem(chiave); } catch (e) { return false; } };   // senza memoria del telefono: si mostra
const segnaOb = chiave => { try { localStorage.setItem(chiave, '1'); } catch (e) { /* pazienza */ } };
async function mostraRiquadroObiettivi() {
  const d = DS.dati;
  if (!d || !obiettiviAperti() || limitato() || ST.offline || soloGuardo() || vediTutti() || eAdmin()) return;
  if (Number(ST.oggi.slice(8, 10)) > GIORNI_RIQUADRO_OBIETTIVI) return;
  const rifai = !d.obiettiviMancanti;   // li ha già: solo l'invito a rifarli nel foglio nuovo, una volta
  if (rifai && (ST.oggi < RIFAI_OBIETTIVI.dal || ST.oggi > RIFAI_OBIETTIVI.al || ricordoOb(chiaveRifaiOb(d.mese)))) return;
  if (!rifai && ricordoOb(chiaveOggiOb(ST.oggi))) return;   // oggi l'ha già visto
  if (document.querySelector('.velo')) return;   // c'è già un foglio aperto (benvenuto, avviso…): non ci si sovrappone
  if (ST.riquadroObMostrato) return;
  ST.riquadroObMostrato = true;   // una volta per ingresso: toccare una fascia ridisegna la Dashboard e non deve riaprirlo
  const { data: saltato } = await dbq('obiettivi saltati', supa.from('obiettivi_salto').select('user_id').eq('user_id', ST.utente.id).eq('mese', d.mese).maybeSingle());
  if (saltato || document.querySelector('.velo') || ST.tab !== 'oggi') { ST.riquadroObMostrato = false; return; }   // «Non questo mese», o nel frattempo si è aperto altro
  segnaOb(rifai ? chiaveRifaiOb(d.mese) : chiaveOggiOb(ST.oggi));
  const mese = MB21Dashboard.nomeMese(d.mese).toLowerCase();
  const velo = document.createElement('div');
  velo.className = 'velo centro';
  velo.innerHTML = `<div class="riquadro-ob" role="dialog" aria-label="Obiettivi di ${esc(mese)}">
    ${OBIETTIVI_PER_TUTTI ? '' : '<small class="solo-tu">⚠️ Per ora lo vedi solo tu</small>'}
    <span class="ico">${ic('obiettivi')}</span>
    <h2>${rifai ? `Gli obiettivi di ${esc(mese)}, nel foglio nuovo` : `È iniziato ${esc(mese)}`}</h2>
    <p>${rifai ? 'Il foglio degli obiettivi è nuovo: chi li aveva già scritti può rifarli, riportando i dati. Ti bastano due minuti.'
      : 'Prima di cominciare, ti consiglio di scegliere i tuoi obiettivi del mese: ti bastano due minuti e tutto il mese ha una direzione.'}</p>
    <button class="primario" id="rob-si">${rifai ? 'Apro il foglio nuovo' : 'Scelgo i miei obiettivi'}</button>
    <button class="link" id="rob-no">Più tardi, vado alla Dashboard</button>
    <button class="link" id="rob-mai" style="font-size:13px;color:var(--grigio)">Non questo mese</button></div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.querySelector('#rob-no').onclick = chiudi;
  velo.querySelector('#rob-si').onclick = () => { chiudi(); apriObiettivi(); };
  velo.querySelector('#rob-mai').onclick = async () => {
    const { error } = await dbq('non questo mese', supa.from('obiettivi_salto').insert({ user_id: ST.utente.id, mese: d.mese }));
    if (error && error.code !== '23505') return mostraToast('Non salvato: riprova.');   // 23505: già saltato, va bene lo stesso
    chiudi();
    mostraToast(`Va bene: per ${mese} non ti propongo più gli obiettivi`);
  };
}

// Il telefono tiene l'app viva in secondo piano: uscendo dall'app il riquadro torna «da mostrare»; rientrando sulla Dashboard si riapre
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') ST.riquadroObMostrato = false;
  else if (ST.utente && ST.tab === 'oggi') mostraRiquadroObiettivi();
});

// «Il mio giorno» (fino al 28/09 «Check del Giorno»): 13 campi come in Glide. Dal 17/09 (Ignazio) un giorno che ha già un Check si apre compilato
// e «Salva» lo corregge invece di aggiungerne un altro (prima si sommavano, decisione 9). I giorni di Glide con
// più Check restano come sono: si modifica il più recente, con l'avviso.
function apriCheck() {
  if (soloGuardo()) return;
  const velo = document.createElement('div');
  velo.className = 'velo';
  // stessa forma degli altri moduli (cantiere 34): in testa il giorno, gruppi «Attività» e «Crescita», «Annulla · Salva» fermi in fondo
  // Ogni voce del Check è una riga numerata come nel modulo Core (Ignazio 22/09: «integrare sempre di più il Check nel Core»):
  // numero · titolo · targhetta «Core» se riempie il foglio Core del mese · come si riempie (automatico o a mano).
  const CK = Object.fromEntries(MB21Dashboard.CAMPI_CHECK.map(([k, etichetta, suggerimento, decimale]) => [k, { etichetta, suggerimento, decimale }]));
  const riga = (n, k, opz = {}) => `<div class="ckr riga1${opz.core ? ' core' : ''}" id="ck-campo-${k}"><b class="ck-n">${n}</b><div class="ck-corpo">
      <label for="ck-${k}">${escIcone(CK[k].etichetta)}${opz.core ? '<span class="ck-tag">Core</span>' : ''}</label>
      <input id="ck-${k}" inputmode="${CK[k].decimale ? 'decimal' : 'numeric'}" placeholder="0" aria-label="${esc(CK[k].suggerimento)}">
      <div class="ck-auto" id="ck-auto-${k}" style="display:none"></div>
      <div class="vn-aiuto">${opz.spiega || ''}</div></div></div>`;
  velo.innerHTML = `<div class="foglio alto mc">
    <div class="mc-testa"><span class="ts-pastiglia" style="background:var(--accento)">${ic('lampo')}</span>
      <div><small>Oggi${esc(aNome())}</small><b>Il mio giorno</b></div><button id="ck-x" aria-label="Chiudi">${ic('chiudi')}</button></div>
    <div class="riquadro mc-g" style="margin-top:14px">
    <div class="campo"><label>${ic('conferme')} Giorno <small>Obbligatorio</small></label><input id="ck-data" type="date" value="${MB21Coda.oggiRoma()}" max="${MB21Coda.oggiRoma()}"></div>
    <div id="ck-modifica" style="display:none;background:var(--proposta-tinta);color:var(--proposta);border-radius:12px;padding:10px 12px;font-size:14px;font-weight:600;margin:8px 0"></div></div>
    <h4 class="mc-t">Azione</h4><div class="riquadro mc-g">
    ${riga(1, 'contatti', { spiega: 'Automatico dal 14/09: dai contatti in cui hai parlato (coda, Riordini, Agenda, scheda).' })}
    ${riga(2, 'pm', { core: 1, spiega: 'Automatico: dai Piani Marketing avvenuti in Agenda → riempie la sezione 1 del foglio Core.' })}
    ${riga(3, 'sponsor_personali', { spiega: 'A mano: gli iscritti che hai sponsorizzato tu oggi.' })}
    ${riga(4, 'sponsor_gruppo', { spiega: 'A mano finché il file ufficiale Amway non è caricato dal tuo Leader/Upline.' })}
    <div class="ckr riga1 core auto volume" id="ck-campo-consumo"><b class="ck-n">5</b><div class="ck-corpo"><label>🛒 Consumo personale<span class="ck-tag">Core</span></label>
      <div class="ck-valore" id="ck-consumo">—</div><div class="vn-aiuto">Automatico: VP personali Amway del mese − VP clienti (il VPP non è autoconsumo: dentro ci sono anche i clienti) → sezione 2 del foglio Core.</div></div></div>
    ${riga(6, 'vp_clienti', { core: 2, spiega: 'Automatico dal 18/09: dalle vendite registrate nella scheda del cliente → sezione 3 del foglio Core.' })}
    </div><h4 class="mc-t">Crescita</h4><div class="riquadro mc-g" id="ck-crescita">
    ${riga(7, 'tracce', { core: 4, spiega: 'Scrivi quante tracce hai ascoltato oggi (CEP o BSM). Quelle del percorso che ti sono state condivise e segnate come “ascoltata” si aggiungono da sole. → sezione 4 del foglio Core.' })}
    <div class="ckr core" id="ck-campo-pagine"><b class="ck-n">8</b><div class="ck-corpo"><label for="ck-pagine">📖 Libro e pagine<span class="ck-tag">Core</span></label>
      <select id="ck-libro"><option value="">— Libro —</option>${MB21Dashboard.LIBRI.filter(l => l !== 'Libro no N21').map(l => `<option>${esc(l)}</option>`).join('')}<option value="__altro__">Libro non da sistema…</option></select>
      <input id="ck-pagine" inputmode="numeric" placeholder="${esc(CK.pagine.suggerimento)}">
      <input id="ck-note" maxlength="150" placeholder="Note del libro"><div class="conta" id="ck-conta">0/150</div>
      <div class="vn-aiuto">A mano: libro, pagine (10 al giorno) e note → sezione 5 del foglio Core e diario dei libri. Con «Libro non da sistema…» scrivi titolo e autore una volta sola.</div></div></div>
    </div><h4 class="mc-t">Squadra</h4><div class="riquadro mc-g">
    <div class="ckr core" id="ck-campo-open"><b class="ck-n">9</b><div class="ck-corpo"><label>🎫 OPEN settimanale · BBS · WES<span class="ck-tag">Core</span></label>
      <label class="ck-sotto"><input type="checkbox" id="ck-open"><span>oggi sono stato all'<b>OPEN</b></span></label>
      <div class="ck-badge-riga">Biglietto BBS <b class="ck-badge" id="ck-bbs">—</b> Biglietto WES <b class="ck-badge" id="ck-wes">—</b></div>
      <div class="vn-aiuto">L'OPEN lo spunti tu (la settimana conta); BBS e WES dai Segni vitali della tua scheda → sezione 6 del foglio Core.</div></div></div>
    <div class="ckr core" id="ck-campo-squadra"><b class="ck-n">10</b><div class="ck-corpo"><label>🤝 Counseling · Edificazione · No-crossline<span class="ck-tag">Core</span></label>
      <label class="ck-sotto"><input type="checkbox" id="ck-counseling"><span>oggi sessione di <b>counseling</b> con lo sponsor/upline</span></label>
      <label class="ck-sotto"><input type="checkbox" id="ck-edificazione"><span>oggi ho praticato l'<b>edificazione</b> (ho parlato bene degli altri, non solo nell'attività)</span></label>
      <label class="ck-sotto"><input type="checkbox" id="ck-no_crossline"><span>oggi ho praticato il <b>no-crossline</b></span></label>
      <div class="vn-aiuto">A mano, tutte e tre → sezione 7 del foglio Core.</div></div></div>
    </div>
    <div class="errore" id="ck-errore"></div>
    <div class="mc-fondo"><button class="link" id="ck-no">Annulla</button><button class="primario" id="ck-si">Salva</button></div>
  </div>`;
  document.body.appendChild(velo);
  const chiudi = () => velo.remove();
  velo.querySelector('#ck-x').onclick = chiudi;
  velo.querySelector('#ck-no').onclick = chiudi;
  const note = velo.querySelector('#ck-note');
  // I libri personali di chi è scelto («Altro libro…», cantiere 40 lavoro 7): si aggiungono all'elenco prima di «Altro libro…»
  const libroSel = velo.querySelector('#ck-libro'), vocealtro = libroSel.querySelector('[value="__altro__"]');
  dbq('libri personali', supa.from('libri_personali').select('titolo').eq('user_id', visto().id).order('titolo')).then(({ data }) => {
    for (const x of data || []) if (![...libroSel.options].some(o => o.value === x.titolo)) libroSel.insertBefore(new Option(x.titolo, x.titolo), vocealtro);
  });
  let libroPrima = '';
  libroSel.addEventListener('focus', () => { libroPrima = libroSel.value; });
  libroSel.addEventListener('change', async () => {
    if (libroSel.value !== '__altro__') return;
    const v = await moduloSemplice('Libro non da sistema', [
      { k: 'titolo', etichetta: 'Titolo', tipo: 'text', valore: '', obbligatorio: true },
      { k: 'autore', etichetta: 'Autore', tipo: 'text', valore: '' }]);
    const titolo = v && String(v.titolo || '').trim().slice(0, 120);
    if (!titolo) { libroSel.value = libroPrima; return; }
    const { error } = await dbq('altro libro', supa.from('libri_personali').upsert({ user_id: visto().id, titolo, autore: String(v.autore || '').trim().slice(0, 80) || null }, { onConflict: 'user_id,titolo' }));
    if (error) { libroSel.value = libroPrima; return mostraToast('Libro non salvato: riprova.'); }
    if (![...libroSel.options].some(o => o.value === titolo)) libroSel.insertBefore(new Option(titolo, titolo), vocealtro);
    libroSel.value = titolo;
  });
  note.oninput = () => { velo.querySelector('#ck-conta').textContent = `${note.value.length}/150`; };
  // Check già salvato nel giorno scelto: si carica nei campi (esistente = riga più recente, null = Check nuovo)
  let esistente = null, giro = 0;
  const campoData = velo.querySelector('#ck-data');
  const caricaGiorno = async () => {
    const mio = ++giro, data = campoData.value;
    const avviso = velo.querySelector('#ck-modifica');
    venditeDelGiorno(data, () => mio === giro);
    azioniDelGiorno(data, () => mio === giro);
    tracceDelGiorno(data, () => mio === giro);
    coreDelGiorno(data, () => mio === giro);
    const { data: righe, error } = data ? await dbq('check del giorno', supa.from('check_giorno').select('*')
      .eq('user_id', visto().id).eq('data', data).order('creato_il', { ascending: false })) : { data: [] };
    if (mio !== giro) return;   // nel frattempo è cambiata la data
    if (error) { avviso.style.display = 'block'; avviso.textContent = 'Non riesco a controllare se questo giorno è già scritto: riprova.'; return; }
    esistente = righe[0] || null;
    for (const [k] of MB21Dashboard.CAMPI_CHECK) velo.querySelector('#ck-' + k).value = esistente ? String(esistente[k] ?? '') : '';
    const libro = velo.querySelector('#ck-libro');
    // il valore già salvato resta sceglibile, tranne il vecchio «Libro no N21» (dal 22/09 c'è «Libro non da sistema…», una voce sola)
    const vecchio = esistente && esistente.libro === 'Libro no N21';
    if (esistente && esistente.libro && !vecchio && ![...libro.options].some(o => o.value === esistente.libro)) libro.insertBefore(new Option(esistente.libro, esistente.libro), libro.querySelector('[value="__altro__"]'));
    libro.value = esistente && !vecchio ? esistente.libro || '' : '';
    note.value = esistente ? esistente.note_libro || '' : ''; note.oninput();
    // Core N21 (cantiere 41): OPEN e counseling del giorno
    velo.querySelector('#ck-open').checked = !!(esistente && esistente.open);
    for (const k of ['counseling', 'edificazione', 'no_crossline']) velo.querySelector('#ck-' + k).checked = !!(esistente && esistente[k]);
    aggiornaCore();
    avviso.style.display = esistente ? 'block' : 'none';
    avviso.innerHTML = !esistente ? '' : ic('modifica') + esc(` Stai modificando il ${dataBreve(data)}` +
      (righe.length > 1 ? ` · questo giorno ha ${righe.length} schede da Glide: si modifica la più recente` : ''));
  };
  // VP Clienti dal 18/09 (MB21Dashboard.INIZIO_VENDITE): non si scrivono, si leggono dalle vendite del giorno; ogni vendita
  // porta alla scheda del cliente. Per i giorni prima resta il campo a mano.
  const venditeDelGiorno = async (data, ancoraValido) => {
    const riga6 = velo.querySelector('#ck-campo-vp_clienti'), campo = velo.querySelector('#ck-vp_clienti'), box = velo.querySelector('#ck-auto-vp_clienti');
    const dalle = MB21Dashboard.vpDalleVendite(data);
    riga6.classList.toggle('auto', dalle); riga6.classList.add('volume');
    riga6.querySelector(':scope > .ck-corpo > .vn-aiuto').style.display = dalle ? 'none' : '';   // una frase sola, in alto (Ignazio 22/09)
    campo.style.display = dalle ? 'none' : '';
    box.style.display = dalle ? '' : 'none';
    if (!dalle) return;
    box.innerHTML = '<div class="ck-valore">…</div><div class="vn-aiuto">Carico le vendite del giorno…</div>';
    const { data: righe, error } = await dbq('vendite del giorno', supa.from('vendite_conti')
      .select('id, contatto_id, prodotto, vp, contatti(nome)').eq('user_id', visto().id).eq('conta_il', data).order('creato_il'));
    if (!ancoraValido()) return;
    if (error) { box.innerHTML = '<div class="ck-valore">?</div><div class="vn-aiuto">Non riesco a leggere le vendite: riprova.</div>'; return; }
    const totale = MB21Lista.totaliVendite(righe).vp;
    box.innerHTML = `<div class="ck-valore">${MB21Lista.numero(totale)} VP</div>
      <div class="vn-aiuto">${righe.length ? 'Dalle vendite registrate nella scheda del cliente: tocca una vendita per aprirla. Riempie la sezione 3 del foglio Core.' : 'Nessuna vendita registrata in questo giorno. Arrivano dalle vendite scritte nella scheda del cliente (sezione Vendite). Riempie la sezione 3 del foglio Core.'}</div>
      ${righe.map(r => `<button type="button" class="ck-vn-riga" data-cliente="${r.contatto_id}"><span>${esc(r.contatti ? r.contatti.nome : 'Cliente')} · ${esc(r.prodotto)}</span><b>${MB21Lista.numero(r.vp)} VP ›</b></button>`).join('')}`;
    riga6.classList.toggle('fatta', righe.length > 0);   // Core: verde con almeno una vendita oggi
    box.querySelectorAll('[data-cliente]').forEach(b => b.onclick = async () => {
      chiudi();
      await apriContattoDa(b.dataset.cliente, 'oggi');
      if (LS.contatto && LS.contatto.id === b.dataset.cliente) { LS.sezione = 'vendite'; disegnaScheda(); }
    });
  };
  // Tracce dal percorso (cantiere 40 lavoro 6, dal 22/09): quelle segnate «ascoltata» in «Il mio percorso» contano da sole; il campo
  // resta per le altre (il CEP). Una riga sotto il campo dice quante ne arrivano già dal percorso, così non si contano due volte.
  const tracceDelGiorno = async (data, ancoraValido) => {
    // una frase sola (Ignazio 22/09), con il numero delle tracce del percorso già contate oggi
    const aiuto = velo.querySelector('#ck-campo-tracce .vn-aiuto');
    const frase = n => `Scrivi quante tracce hai ascoltato oggi (CEP o BSM). Quelle del percorso che ti sono state condivise e segnate come “ascoltata” si aggiungono da sole${n == null ? '' : `: oggi ${n} ${n === 1 ? 'condivisa' : 'condivise'}`}. → sezione 4 del foglio Core.`;
    aiuto.textContent = frase(null);
    if (!data || data < MB21Dashboard.INIZIO_TRACCE_PERCORSO || visto().id !== ST.utente.id) return;
    const { data: righe, error } = await dbq('tracce del percorso', supa.rpc('tracce_ascoltate_conti'));
    if (!ancoraValido() || error) return;
    aiuto.textContent = frase((righe || []).filter(r => r.giorno === data && r.user_id === ST.utente.id).length);
  };
  // Lo stato del giorno sulle righe Core (Ignazio 22/09): consumo = VP Amway del mese − VP clienti; BBS/WES dai Segni vitali
  // della propria scheda; sponsor gruppo dal file Amway (data di ingresso nella propria linea); le righe si segnano «fatte».
  const CK_CORE = { vp: null, percorso: 0, bbs: null, wes: null, gruppoOggi: null, gruppoMese: 0 };
  const num = k => Number(String(velo.querySelector('#ck-' + k).value).trim().replace(',', '.')) || 0;
  const aggiornaCore = () => {
    velo.querySelector('#ck-consumo').textContent = CK_CORE.vp == null ? '— (dati Amway del mese non ancora importati)' : `${String(CK_CORE.vp).replace('.', ',')} VP`;
    velo.querySelector('#ck-campo-consumo').classList.toggle('fatta', CK_CORE.vp != null && CK_CORE.vp > 0);
    for (const k of ['bbs', 'wes']) { const b = velo.querySelector('#ck-' + k); b.textContent = CK_CORE[k] == null ? '—' : CK_CORE[k] ? 'SI' : 'NO'; b.classList.toggle('si', !!CK_CORE[k]); }
    velo.querySelector('#ck-campo-tracce').classList.toggle('fatta', num('tracce') + CK_CORE.percorso >= 1);
    velo.querySelector('#ck-campo-pagine').classList.toggle('fatta', num('pagine') >= 10);
    velo.querySelector('#ck-campo-open').classList.toggle('fatta', velo.querySelector('#ck-open').checked);
    velo.querySelector('#ck-campo-squadra').classList.toggle('fatta', ['counseling', 'edificazione', 'no_crossline'].every(k => velo.querySelector('#ck-' + k).checked));   // tutte e tre (Ignazio 22/09)
    const sg = velo.querySelector('#ck-sponsor_gruppo'), aiutoSg = velo.querySelector('#ck-campo-sponsor_gruppo .vn-aiuto');
    velo.querySelector('#ck-campo-sponsor_gruppo').classList.toggle('auto', CK_CORE.gruppoOggi != null);   // automatico dal file Amway: riga colorata come Contatti e PM
    const autoSg = velo.querySelector('#ck-auto-sponsor_gruppo');
    if (CK_CORE.gruppoOggi != null) {
      sg.value = String(CK_CORE.gruppoOggi); sg.readOnly = true; sg.style.display = 'none';
      autoSg.style.display = ''; autoSg.innerHTML = `<div class="ck-valore">${CK_CORE.gruppoOggi}</div>`;
      aiutoSg.textContent = `Arrivano dal file ufficiale Amway caricato dal tuo Leader/Upline: ${CK_CORE.gruppoOggi} ${CK_CORE.gruppoOggi === 1 ? 'iscritto' : 'iscritti'} nella tua linea in questo giorno, ${CK_CORE.gruppoMese} nel mese.`;
    } else { sg.readOnly = false; sg.style.display = ''; autoSg.style.display = 'none'; }
  };
  for (const k of ['tracce', 'pagine']) velo.querySelector('#ck-' + k).addEventListener('input', aggiornaCore);
  for (const k of ['open', 'counseling', 'edificazione', 'no_crossline']) velo.querySelector('#ck-' + k).addEventListener('change', aggiornaCore);
  const coreDelGiorno = async (data, ancoraValido) => {
    if (!data) return;
    const A = MB21Agenda, mese0 = data.slice(0, 8) + '01', mese1 = A.spostaGiorno(mese0, 32).slice(0, 8) + '01';
    const io = visto();
    const [ve, ob, tr, sq] = await Promise.all([
      // le vendite che CONTANO nel mese (consegna nel mese, o senza consegna e pagate nel mese): la promo che conta nel 2027 non è qui
      dbq('clienti del mese', supa.from('vendite').select('contatto_id, vp').eq('user_id', io.id)
        .or(`and(consegna.is.null,data.gte.${mese0},data.lt.${mese1}),and(consegna.gte.${mese0},consegna.lt.${mese1})`)),
      dbq('vp amway', supa.from('obiettivi_mese').select('vpp_amway').eq('user_id', io.id).eq('mese', mese0).maybeSingle()),
      io.id === ST.utente.id && data >= MB21Dashboard.INIZIO_TRACCE_PERCORSO ? dbq('tracce del percorso', supa.rpc('tracce_ascoltate_conti')) : Promise.resolve({ data: [] }),
      io.partner_id ? dbq('squadra', supa.from('squadra').select('partner_id, sponsor_id, data_ingresso')) : Promise.resolve({ data: null }),
    ]);
    if (!ancoraValido()) return;
    const vpClienti = (ve.data || []).reduce((t, r) => t + (Number(r.vp) || 0), 0);
    CK_CORE.vp = ob.data && ob.data.vpp_amway != null ? Math.max(0, Math.round((Number(ob.data.vpp_amway) - vpClienti) * 100) / 100) : null;
    CK_CORE.percorso = (tr.data || []).filter(r => r.giorno === data && r.user_id === ST.utente.id).length;
    // la propria linea: chi ha come sponsor me, o chi ha come sponsor uno della mia linea (albero Amway `squadra`)
    if (sq.data && sq.data.length) {
      const figli = new Map();
      for (const r of sq.data) { if (!figli.has(r.sponsor_id)) figli.set(r.sponsor_id, []); figli.get(r.sponsor_id).push(r); }
      const linea = [], coda = [...(figli.get(io.partner_id) || [])];
      while (coda.length) { const r = coda.shift(); linea.push(r); coda.push(...(figli.get(r.partner_id) || [])); }
      CK_CORE.gruppoOggi = linea.filter(r => r.data_ingresso === data).length;
      CK_CORE.gruppoMese = linea.filter(r => r.data_ingresso && r.data_ingresso >= mese0 && r.data_ingresso < mese1).length;
    } else CK_CORE.gruppoOggi = null;
    const big = await bigliettiDiChiGuardo(io, mese0);   // 24/09: dalla propria scheda, ovunque sia
    if (!ancoraValido()) return;
    CK_CORE.bbs = big && big.some(b => b.tipo === 'BBS' && b.contatto);
    CK_CORE.wes = big && big.some(b => b.tipo === 'WES' && b.contatto);
    if (!big) { CK_CORE.bbs = null; CK_CORE.wes = null; }
    aggiornaCore();
  };
  // Contatti e PM dal 14/09 (MB21Dashboard.INIZIO_AZIONI): non si scrivono, si leggono dalle azioni del giorno che contano
  // (vista `azioni_conti`); ogni azione porta alla scheda del contatto. Per i giorni prima restano i campi a mano.
  const azioniDelGiorno = async (data, ancoraValido) => {
    const dalle = MB21Dashboard.contattiDalleAzioni(data);
    // la riga resta con il suo numero: se i dati arrivano da soli, il campo si nasconde e la riga si colora con dentro il contenuto automatico
    // automatico: una frase sola, in alto dentro la riga (Ignazio 22/09): la spiegazione di sotto si nasconde
    const auto = (k, dentro) => { const r = velo.querySelector('#ck-campo-' + k); r.classList.toggle('auto', dalle); velo.querySelector('#ck-' + k).style.display = dalle ? 'none' : ''; r.querySelector(':scope > .ck-corpo > .vn-aiuto').style.display = dalle ? 'none' : ''; const box = velo.querySelector('#ck-auto-' + k); box.style.display = dalle ? '' : 'none'; if (dentro != null) box.innerHTML = dentro; };
    if (!dalle) { auto('contatti', ''); auto('pm', ''); return; }
    const CARD = [
      // testi di Ignazio (22/09)
      { k: 'contatti', pieno: 'Arrivano in automatico dall\'esito della coda in Dashboard, da MB Plan (Agenda), dalla scheda del contatto e dai Riordini. «No Risposta» e «Telefono spento» non contano. Tocca una riga per aprire il contatto.',
        vuoto: 'Nessun contatto registrato in questo giorno. Arrivano in automatico dall\'esito della coda in Dashboard, da MB Plan (Agenda), dalla scheda del contatto e dai Riordini. «No Risposta» e «Telefono spento» non contano. Automatico dal 14/09.' },
      { k: 'pm', pieno: 'Arrivano dall\'esito dei PM in MB Plan (Agenda). «No Show» e «Rimandato» non contano. Tocca una riga per aprire il contatto. Riempie la sezione 1 del foglio Core.',
        vuoto: 'Nessun Piano Marketing effettuato in questo giorno. Arrivano dall\'esito dei PM in MB Plan (Agenda). «No Show» e «Rimandato» non contano. Riempie la sezione 1 del foglio Core.' },
    ];
    const dentro = (numero, aiuto, righe) => `<div class="ck-valore">${numero}</div><div class="vn-aiuto">${aiuto}</div>${righe || ''}`;
    for (const d of CARD) auto(d.k, dentro('…', 'Carico le azioni del giorno…'));
    const { data: righe, error } = await dbq('azioni del giorno', supa.from('azioni_conti')
      .select('id, contatto_id, tipo_azione, modalita, esito, contatti, pm, contatto:contatti(nome)').eq('user_id', visto().id).eq('giorno', data));
    if (!ancoraValido()) return;
    if (error) { for (const d of CARD) auto(d.k, dentro('?', 'Non riesco a leggere le azioni: riprova.')); return; }
    for (const d of CARD) {
      const sue = righe.filter(r => r[d.k]);
      auto(d.k, dentro(sue.length, sue.length ? d.pieno : d.vuoto, sue.map(r => `<button type="button" class="ck-vn-riga" data-contatto-az="${r.contatto_id}"><span>${esc(r.contatto ? r.contatto.nome : 'Contatto')}${r.modalita ? ' · ' + esc(r.modalita) : ''}</span><b>${esc(MB21Agenda.nomePasso(r.esito || ''))} ›</b></button>`).join('')));
      if (d.k === 'pm') velo.querySelector('#ck-campo-pm').classList.toggle('fatta', sue.length > 0);   // Core: verde con almeno un PM fatto oggi
    }
    velo.querySelectorAll('[data-contatto-az]').forEach(b => b.onclick = () => { chiudi(); apriContattoDa(b.dataset.contattoAz, 'oggi'); });
  };
  campoData.onchange = caricaGiorno;
  caricaGiorno();
  velo.querySelector('#ck-si').onclick = async () => {
    const v = { user_id: visto().id, data: velo.querySelector('#ck-data').value, libro: velo.querySelector('#ck-libro').value || null, note_libro: note.value.trim() || null,
      // Core N21 (cantiere 41): la riga giornaliera del modulo
      open: velo.querySelector('#ck-open').checked, counseling: velo.querySelector('#ck-counseling').checked,
      edificazione: velo.querySelector('#ck-edificazione').checked, no_crossline: velo.querySelector('#ck-no_crossline').checked };
    for (const [k] of MB21Dashboard.CAMPI_CHECK) v[k] = velo.querySelector('#ck-' + k).value;
    if (MB21Dashboard.contattiDalleAzioni(v.data)) for (const k of ['contatti', 'pm']) if (String(v[k]).trim() === '') v[k] = '0';   // dal 14/09 li danno le azioni (un Check vecchio tiene i suoi numeri, che non contano)
    if (MB21Dashboard.vpDalleVendite(v.data)) v.vp_clienti = '0';   // dal 18/09 i VP Clienti li danno le vendite: nel Check resta 0
    const errore = MB21Dashboard.validaCheck(v);
    if (errore) { velo.querySelector('#ck-errore').textContent = errore; return; }
    for (const [k] of MB21Dashboard.CAMPI_CHECK) v[k] = Number(String(v[k]).trim().replace(',', '.'));
    const btn = velo.querySelector('#ck-si');
    btn.disabled = true; btn.textContent = 'Salvo…';
    const prima = esistente;
    const { data, error } = prima
      ? await dbq('correggi check', supa.from('check_giorno').update(v).eq('id', prima.id).select('id').single())
      : await dbq('salva check', supa.from('check_giorno').insert(v).select('id').single());
    if (error) {
      btn.disabled = false; btn.textContent = 'Salva';
      velo.querySelector('#ck-errore').textContent = 'Non salvato: controlla la connessione e riprova.';
      return;
    }
    chiudi();
    if (prima) {   // Annulla rimette i numeri di prima
      await caricaDashboard(ST.oggi);
      disegnaOggi();
      return mostraToast('Giorno corretto', async () => {
        const vecchi = { libro: prima.libro, note_libro: prima.note_libro, open: prima.open, counseling: prima.counseling, edificazione: prima.edificazione, no_crossline: prima.no_crossline };
        for (const [k] of MB21Dashboard.CAMPI_CHECK) vecchi[k] = prima[k];
        const { error: e2 } = await dbq('annulla correzione check', supa.from('check_giorno').update(vecchi).eq('id', prima.id));
        if (e2) return mostraToast('Annullamento non riuscito: riprova.');
        await caricaDashboard(ST.oggi);
        disegnaOggi();
        mostraToast('Correzione annullata');
      });
    }
    await caricaDashboard(ST.oggi);
    disegnaOggi();
    mostraToast('Giorno salvato', async () => {
      const { error: e2 } = await dbq('annulla check', supa.from('check_giorno').delete().eq('id', data.id));
      if (e2) return mostraToast('Annullamento non riuscito: riprova.');
      await caricaDashboard(ST.oggi);
      disegnaOggi();
      mostraToast('Annullato');
    });
  };
}

// Il tab «Oggi» della barra riporta al primo livello (Pagine 040)
function vaiAlPrimoLivello() { LV.vista = 'home'; LV.area = null; LV.persona = null; LV.gradino = null; }

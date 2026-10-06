// Anteprima e prova della Dashboard «a livelli» (Pagine 040) con dati finti.
// Prende il codice VERO da pagina-dashboard.js e da index.html (nessuna copia da tenere allineata), lo fa girare con un finto DOM e dati inventati,
// e dà indietro la pagina disegnata: serve alla prova (tools/banco/prova_dashboard_livelli.js) e a guardare le schermate (e farne le foto).
// Nessun database, nessuna rete. Uso:  node tools/design/anteprima_dashboard.js [home|oggi|persona|mese|area|traguardo|gradino|avvio|nuovo] [file.html]
const fs = require('node:fs'), path = require('node:path');
const BASE = path.join(__dirname, '..', '..');
const sorgente = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
const pagina = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8');
const D = require(path.join(BASE, 'dashboard.js')), C = require(path.join(BASE, 'check.js')), K = require(path.join(BASE, 'core.js'));
const A = require(path.join(BASE, 'agenda.js')), R = require(path.join(BASE, 'report.js')), L = require(path.join(BASE, 'lista.js'));
const M = require(path.join(BASE, 'mappa.js')), Icone = require(path.join(BASE, 'icone.js'));

const fra = (da, a) => { const i = sorgente.indexOf(da); if (i < 0) throw new Error('non trovo ' + da); return sorgente.slice(i, sorgente.indexOf(a, i)); };
const funzione = nome => {
  const m = sorgente.match(new RegExp('^((?:async )?function ' + nome + '\\b[\\s\\S]*?)\\n\\}', 'm'));
  if (!m) throw new Error('non trovo la funzione ' + nome);
  return m[1] + '\n}';
};
const riga = inizio => { const r = sorgente.split('\n').find(x => x.startsWith(inizio)); if (!r) throw new Error('non trovo la riga ' + inizio); return r; };

const stile = fra('<style>', '</style>').replace('<style>', '');
const OGGI = '2026-10-04';
// l'ora «di adesso» è finta e si cambia (impostaOra('21:00')): così le prove non dipendono dall'ora in cui girano
let oraFinta = '12:00';
class DataFinta extends Date {
  constructor(...a) { if (a.length) super(...a); else super(`${OGGI}T${oraFinta}:00+02:00`); }
  static now() { return new Date(`${OGGI}T${oraFinta}:00+02:00`).getTime(); }
}
const impostaOra = h => { oraFinta = h; };

// ── il finto mondo: tutto quello che nell'app arriva dal database o da altre pagine ──
// Il piccolo DOM (tools/design/mini_dom.js): la pagina intera è un Nodo; i fogli che salgono dal basso sono altri Nodi
const { Nodo } = require('./mini_dom.js');
const app = new Nodo();
const cerca = sel => app.querySelectorAll(sel);
const documento = {
  getElementById: id => app.getElementById(id),
  querySelector: sel => app.querySelector(sel), querySelectorAll: sel => app.querySelectorAll(sel),
  createElement: () => new Nodo(),
  body: { appendChild() {} }, addEventListener() {}, hidden: false,
};
const clic = (sel, n = 0) => app.clic(sel, n);
const catena = new Proxy(function () {}, { get: (t, p) => (p === 'then' ? undefined : catena), apply: () => catena });
// un elemento qualunque (per i fogli che l'anteprima non deve far funzionare, solo disegnare)
const finto = () => ({ value: '', checked: false, style: {}, textContent: '', innerHTML: '', options: [], classList: { toggle() {}, add() {}, remove() {} }, addEventListener() {},
  querySelector: () => finto(), querySelectorAll: () => [], insertBefore() {}, remove() {}, appendChild() {}, oninput() {}, onclick: null, onchange: null });
const fogli = [];
documento.createElement = () => {
  const v = finto(); fogli.push(v);
  return v;
};
documento.body.appendChild = () => {};
const toast = [], chiusure = [];   // gli avvisi mostrati e le chiusure chieste a chiudiAppuntamento (telefonate scelte a mano, riordini)
const stub = {
  app, document: documento, window: { scrollY: 0, innerHeight: 800, scrollTo() {}, addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} },
  MB21Dashboard: D, MB21Check: C, MB21Core: K, MB21Agenda: A, MB21Report: R, MB21Lista: L, MB21Mappa: M, MB21Icone: Icone,
  MB21Coda: { ...require(path.join(BASE, 'coda.js')), oggiRoma: () => OGGI, CAPIENZA: 10 },   // il motore vero della coda (contoGiorno, telefonateScelte…), con l'oggi fermo
  MB21Benvenuto: { pulisciPerche: () => [] },
  supa: { rpc: () => Promise.resolve({ error: null }), from: () => catena },
  Option: class { constructor(t, v) { this.text = t; this.value = v; } }, moduloSemplice: async () => null,
  dbq: async () => ({ data: null, error: null }), dbqAvvisa: async () => ({ data: null, error: null }),
  SCRITTURE: { ultima: 0 }, CHIAVE_CACHE: 'x',
  mostraToast: (t, annulla) => { toast.push(t); toast.annulla = annulla || null; }, mostraTab: () => {}, chiediConferma: async () => true, aggiornaRiga: async () => {},
  sceltaDa: async () => null,   // «Non ora» (nota 018): le prove lo sostituiscono (chiediData è della pagina stessa)
  partnerSelect: () => '', collegaPartnerSelect() {}, versione: () => '', cerchiettoProfilo: () => '<span class="cerchietto">IS</span>',
  rigaTelefonoHtml: () => '', mostraRigaTelefono() {}, mostraRiquadroObiettivi() {}, riquadriBiglietto: () => '', collegaDomandaBiglietto() {},
  tracceHtml: () => '', mioPercorsoHtml: () => '', collegaTracce() {}, collegaMioPercorso() {},
  contattaHtml: tel => `<div class="contatta"><a>Chiama</a><a>SMS</a><a>WhatsApp</a><a>Telegram</a></div>`,
  ricordoHtml: () => '', preparaChiamataHtml: () => '', nuovoBadge: () => '', guardoAltriDi: () => false,
  caricaCardCheck() {}, aNome: () => '', apriObiettivi() {}, apriBenvenuto() {}, apriContattoDa() {}, foglioRinnovo() {}, foglioStorico() {}, scegliNumero() {}, caricaOggi: async () => {},
  chiudiAppuntamento: async (...a) => { chiusure.push(a); }, spostaAppuntamento: async () => {}, toccaBottone: async () => {}, calcolatoreSegni: () => ({}),
  caricaDatiCheck: async () => {}, caricaSchedeMappa: async () => {}, trnProvaTelefonata() {}, elimina() {}, PF: { aperte: new Set() }, RP: {},
  eAdmin: () => false, soloGuardo: () => false, idVisti: () => ['io'], codiciDi: () => [], nomeVisto: () => 'Isabella',
  datiCoreDelMese: async () => ({}), aggiornaTab() {}, leggiSquadraMese: async () => null, setTimeout: () => 0,
  visto: () => ({ id: 'io', partner_id: 'P1', nome_cognome: 'Isabella Sammito', ruolo: 'Partner' }),
  Intl, Date: DataFinta, JSON, Math, console,
};
const stato = {
  ST: { utente: { id: 'io', ruolo: 'Partner' }, oggi: OGGI, tab: 'oggi', offline: false, scaduto: false, aperta: null },
  PS: { scelto: null }, DS: null, AVV: null, CONF: null, RIO: null, CK: null,
};
// il codice: la pagina intera + i pezzi di index.html che usa
const pezzi = [
  fra('const CLASSI_CAT = {', '\nfunction classeCat'), riga('function classeCat'), riga('function ic('), riga('function escIcone'), funzione('esc'),
  riga('function iniziali('), funzione('centesimi'), funzione('dataEstesa'), riga('const nomeDi'), riga('const limitato'),
  funzione('statoPercorso'), funzione('salvaTraguardo'), funzione('livelliCheck'), funzione('caricaCoreCheck'),
  fra('const vociHtml = ', '\n// «I prossimi passi» del livello'), funzione('passiHtml'), funzione('collegaPercorso'), funzione('aggiornaCardCheck'),
  fra('const CK = {', 'const CAMPI_CK'),
  fra('const CY = {', '\nfunction doveSono'),   // nota 001: il segnale Coach Yes, vero
].join('\n');
const nomi = Object.keys(stub);
// ST, PS e il resto nascono in index.html: qui se ne mettono di finti, poi la pagina vera e quello che serve alla prova
const prefazio = `const ST = ${JSON.stringify(stato.ST)}; const PS = { scelto: null }; const MP = {}; const AG = {}; const CM = {}; const LS = {}; const VER = {};
const guardoAltri = () => !!PS.scelto, vediTutti = () => PS.scelto === 'tutti';
let ultimoTraguardoSalvato;\n`;
const uscita = '\nreturn { LV, DS, AVV, CONF, RIO, SCE, CK, ST, PS, apriCheck, disegnaOggi, vaiLV, vaiAlPrimoLivello, statoPercorso, percorsoDash, fraseTraguardo, nuovoInAvvio, nonOra, caricaCatalogo, CY };';
let mondo;
function avvia() {
  const g = new Function(...nomi, prefazio + pezzi + '\n' + pagina + uscita);
  mondo = g(...nomi.map(n => stub[n]));
  return mondo;
}

// ── i dati finti ──
const iso = (g, o) => A.isoDaRoma(g, o);
function carica(m, opz = {}) {
  Object.assign(m.ST, { oggi: OGGI, offline: false, scaduto: false, aperta: null, tab: 'oggi', utente: { id: 'io', ruolo: 'Partner', nome_cognome: 'Isabella Sammito' } });
  const cand = (id, nome, extra) => Object.assign({ id, nome, categoria: 'Prospect', contattato: false, telefono: '333 1234567', coach: '', ultima_fase: null }, extra || {});
  m.ST.risultato = opz.vuoto ? { coda: [], dareSeguito: [] } : {
    coda: [cand('c1', 'Laura Ferri'), cand('c2', 'Marco Neri', { contattato: true, ultima_fase: 'Richiamare', categoria: 'Cliente', ultimo_tipo: 'Contatto', ultima_modalita: 'Telefonata', ultima_il: iso('2026-10-01', '17:00'), rientro_il: OGGI }),
      cand('c3', 'Anna Villa', { contattato: true, ultima_fase: 'Relazione', ultimo_tipo: 'Appuntamento', ultima_il: iso('2026-10-03', '10:00'), rientro_il: OGGI })],
    dareSeguito: [cand('d1', 'Gino Pace', { contattato: true, ultima_fase: 'Dare Seguito', scadutoDa: 3 })] };
  m.ST.stato = { contatti_al_giorno: 5, fatti_oggi: opz.fatti != null ? opz.fatti : opz.nuovo ? 0 : 2 };
  // le telefonate scelte a mano (nota 012): una senza orario per oggi, una con l'ora rimasta da ieri (solo se la prova le chiede)
  m.SCE.righe = !opz.scelte ? [] : stub.MB21Coda.telefonateScelte([
    { id: 's1', contatto_id: 'x5', user_id: 'io', tipo_azione: 'Contatto', modalita: 'Telefonata', categoria: 'Prospect', scelta_a_mano: true, senza_ora: true, completata: false, esito: null,
      inizio: iso(OGGI, '00:00'), note: 'Richiamarla per il libro', contatti: { nome: 'Carla Bo', telefono: '333 555', categoria: 'Prospect' } },
    { id: 's2', contatto_id: 'x6', user_id: 'io', tipo_azione: 'Contatto', modalita: 'Telefonata', categoria: 'Partner', scelta_a_mano: true, senza_ora: false, completata: false, esito: null,
      inizio: iso('2026-10-03', '17:30'), contatti: { nome: 'Dario Lupo', telefono: '333 666', categoria: 'Partner' } },
  ], OGGI);
  m.CONF.righe = opz.vuoto ? [] : [{ id: 'k1', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', inizio: iso(OGGI, '18:30'), contatto_id: 'x1', contatti: { nome: 'Giulia Conti', telefono: '333 7654321', categoria: 'Prospect' } }];
  m.RIO.righe = opz.vuoto ? [] : [{ id: 'r1', contatto_id: 'x2', brand: 'Nutrilite', prodotto: 'Daily', riordino: '2026-10-12', contatti: { nome: 'Rosa Aprile', telefono: '333 111', categoria: 'Cliente' }, categoria: 'Cliente', tipo_azione: 'Contatto', inizio: iso(OGGI, '10:00') },
    { id: 'r2', contatto_id: 'x3', brand: 'Artistry', prodotto: '', riordino: '2026-10-14', contatti: { nome: 'Pino Manolo', telefono: '333 222', categoria: 'Cliente' }, categoria: 'Cliente', tipo_azione: 'Contatto', inizio: iso(OGGI, '10:00') }];
  // i numeri del mese
  const checkMesi = opz.nuovo ? [] : [{ mese: '2026-09-01', contatti: 71, pm: 8, sponsor_gruppo: 2, vp_clienti: 260, tracce: 28, pagine: 260 }, { mese: '2026-10-01', contatti: 24, pm: 2, sponsor_gruppo: 0, vp_clienti: 120, tracce: 3, pagine: 40, ultimo_check: '2026-10-03' }];
  const obiettivi = [{ mese: '2026-09-01', vpg: 3800, vpp: 500, vpv: 300, contatti: 60, pm: 8, sponsor_gruppo: 2, bbs: 3, wes: 3, cep: 1, tracce: 30, pagine: 300, vpg_amway: 3100, vpp_amway: 480 },
    { mese: '2026-10-01', vpg: 4000, vpp: 500, vpv: 300, contatti: 60, pm: 8, sponsor_gruppo: 2, bbs: 3, wes: 3, cep: 1, tracce: 30, pagine: 300, vpg_amway: 2670, vpp_amway: 310 }];
  m.DS.checkMesi = checkMesi; m.DS.obiettivi = obiettivi;
  m.DS.dati = D.calcola({ checkMesi, obiettivi, oggi: OGGI, scadenza: '2027-01-01', segniAl: null, squadraAl: { prime_linee: 3, linee_bonus: 1, planner: 0, totale_gruppo: 112 } });
  const c = D.confrontoMese({ obiettivo: obiettivi[0], risultati: D.risultatiMese({ checkMesi, obiettivi, mese: '2026-09-01', oggi: OGGI, segniAl: null }), amway: null });
  m.DS.confronto = c ? { mese: '2026-09-01', ...c } : null;
  m.DS.griglia = null; m.DS.eventi = {};
  // il percorso del Check
  const g = (data, v) => ({ data, contatti: 0, pm: 0, sponsor_personali: 0, sponsor_gruppo: 0, vp_clienti: 0, cep: 0, bbs: 0, wes: 0, tracce: 0, pagine: 0, ...v });
  Object.assign(m.CK, { di: 'io', giorni: [g('2026-10-02', { contatti: 5, sponsor_personali: opz.sponsor == null ? 1 : opz.sponsor })], periodo: R.periodoMese(OGGI), nonOra: [], lcLinee: [], aperti: new Set(),
    obiettivi: [{ mese: '2026-10-01', vpp_amway: opz.vp == null ? 40 : opz.vp, vpg_amway: 2670 }],
    eventi: { bbs: [{ data: '2026-11-01', creato_il: '2026-09-01T10:00:00+00:00' }], wes: [{ data: '2026-11-01', creato_il: '2026-09-01T10:00:00+00:00' }] },
    lc1: { biglietti: [{ tipo: 'BBS', evento: '2026-11-01', contatto: true }], cep: opz.cep === false ? [] : [{ dal: '2026-01-01', uscito_il: null }] },
    core: { '2026-10-01': { modulo: K.modulo({ mese: '2026-10', obiettivi: { vpp_amway: 187.5 }, oggi: OGGI }) } },
    amway: { squadra: [{ partner_id: 'A', sponsor_id: 'P1', nome: 'CILIA, ALBERTO' }, { partner_id: 'B', sponsor_id: 'P1', nome: 'CACCAMO, LUCA' }],
      volumi: [{ partner_id: 'P1', mese: 202610, vpp: 253, bonus: 6, al_livello_successivo: 194 }, { partner_id: 'A', mese: 202610, vpp: 107, bonus: 3, al_livello_successivo: 84 }, { partner_id: 'B', mese: 202610, vpp: 116, bonus: 0, al_livello_successivo: 122 }] },
    segniAl: () => ({ cep: 3, bbs: 2, wes: 1 }) });
  m.PS.scelto = null;
  m.AVV.mio = opz.nuovo ? { onb_sogno: true, onb_amway: true, onb_ordine: true, sponsor_nome: 'Giulia Conti', perche: [], con_scheda: true } : null;
  m.AVV.mioAperto = false;
}
// guardare un'altra persona (Partner Select): `visto()` e `idVisti()` nel finto mondo sono sempre «io»; qui basta che il partner_id ci sia per i livelli

function vista(nome, opz = {}) {
  const m = avvia();
  carica(m, opz);
  const vaiA = { home: ['home'], oggi: ['oggi'], persona: ['persona', { persona: opz.persona || 'coda|c1' }], mese: ['mese'], area: ['area', { area: opz.area || 'volume' }], traguardo: ['traguardo'], gradino: ['gradino', { gradino: opz.gradino || 'pace' }], avvio: ['avvio'] }[nome];
  if (opz.apri) { const a = m.ST; for (const k of opz.apri) { const o = JSON.parse(localStorage_get()); o[k] = true; localStorage_set(JSON.stringify(o)); } }
  m.LV.vista = vaiA[0]; Object.assign(m.LV, vaiA[1] || {});
  m.disegnaOggi();
  return { html: app.innerHTML, m };
}
const memo = {}; let giornoMemo;
const localStorage_get = () => JSON.stringify(memo);
const localStorage_set = v => Object.assign(memo, JSON.parse(v));
stub.localStorage = { getItem: () => JSON.stringify(Object.assign({ giorno: OGGI }, memo)), setItem: (k, v) => Object.assign(memo, JSON.parse(v)) };

// «Il mio giorno»: il foglio com'è disegnato (le righe automatiche si accendono a mano, come fa la pagina quando arrivano i dati)
function foglioGiorno(auto = true) {
  const m = avvia(); carica(m);
  fogli.length = 0;
  m.apriCheck();
  const h = fogli[0].innerHTML || '';
  return auto ? h.replace(/class="ckr riga1( core)?" id="ck-campo-(contatti|pm|vp_clienti)"/g, 'class="ckr riga1$1 auto" id="ck-campo-$2"') : h;
}
module.exports = { vista, avvia, carica, foglioGiorno, impostaOra, stub, app, memo, clic, cerca, toast, chiusure, iso, OGGI, stile };
if (require.main !== module) return;

const quale = process.argv[2] || 'tutte', dove = process.argv[3];
const scenari = {
  home: () => vista('home').html, nuovo: () => vista('home', { nuovo: true }).html,
  oggi: () => vista('oggi', { apri: ['coda', 'conferme', 'riordini'] }).html, persona: () => vista('persona').html,
  mese: () => vista('mese').html, area: () => vista('area').html, traguardo: () => vista('traguardo').html,
  gradino: () => vista('gradino', { gradino: 'lc' }).html, avvio: () => vista('avvio', { nuovo: true }).html,
};
const telefono = (titolo, dentro) => `<div class="pv-tel"><div class="pv-t">${titolo}</div>${dentro}</div>`;
const lista = quale === 'tutte' ? Object.keys(scenari) : [quale];
const corpo = lista.map(k => telefono(k, scenari[k]())).join('');
const pag = `<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MB21 · Dashboard a livelli, anteprima</title>${Icone.elenco()}
<style>${stile}
  body { background: #DDE1E8; padding: 18px 10px 40px; }
  .pv-fila { display: flex; gap: 20px; justify-content: center; align-items: flex-start; flex-wrap: wrap; }
  .pv-tel { width: 392px; background: var(--sfondo); border-radius: 34px; box-shadow: 0 10px 40px rgba(16,21,31,.18); padding: 8px 16px 22px; }
  .pv-t { font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: var(--testo-tenue); font-weight: 700; margin: 4px 2px 2px; }
</style><div class="pv-fila">${corpo}</div>`;
const fuori = dove || path.join(BASE, 'tools', 'design', 'anteprima_dashboard.html');
fs.writeFileSync(fuori, pag);
console.log('scritta ' + fuori);

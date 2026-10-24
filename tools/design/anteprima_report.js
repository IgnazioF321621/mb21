// Anteprima e prova del Report (linguette «Azioni» e «Provvigioni», nota Pagine 074) e della Griglia PM (nota 081) con dati finti.
// Prende il codice VERO da index.html (nessuna copia da tenere allineata), lo fa girare con un finto DOM, un finto database e dati inventati,
// e dà indietro la pagina disegnata: serve alla prova (tools/banco/prova_report_vista.js) e a guardare le schermate (e farne le foto).
// Nessun database, nessuna rete. Uso:  node tools/design/anteprima_report.js [azioni|mese|anno|griglia] [file.html]
const fs = require('node:fs'), path = require('node:path');
const BASE = path.join(__dirname, '..', '..');
const sorgente = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
const dashboard = fs.readFileSync(path.join(BASE, 'pagina-dashboard.js'), 'utf8');   // la scritta «Griglia PM · 2 di 8» (testoGriglia) è lì
const R = require(path.join(BASE, 'report.js')), L = require(path.join(BASE, 'lista.js')), A = require(path.join(BASE, 'agenda.js'));
const Icone = require(path.join(BASE, 'icone.js'));
const { Nodo } = require('./mini_dom.js');

const fra = (da, a) => { const i = sorgente.indexOf(da); if (i < 0) throw new Error('non trovo ' + da); const j = sorgente.indexOf(a, i); if (j < 0) throw new Error('non trovo la fine di ' + da); return sorgente.slice(i, j); };
const funzione = nome => {
  const m = sorgente.match(new RegExp('^((?:async )?function ' + nome + '\\b[\\s\\S]*?)\\n\\}', 'm'));
  if (!m) throw new Error('non trovo la funzione ' + nome);
  return m[1] + '\n}';
};
const riga = inizio => { const r = sorgente.split('\n').find(x => x.startsWith(inizio)); if (!r) throw new Error('non trovo la riga ' + inizio); return r; };
const stile = fra('<style>', '</style>').replace('<style>', '');
const OGGI = '2026-10-24';

// ── il finto database: le tabelle che il Report legge; ogni richiesta si annota (tabella e filtri) e risponde con le righe della tabella ──
function database(tabelle, opz = {}) {
  const richieste = [];
  const da = tabella => {
    const q = { tabella, passi: [] };
    richieste.push(q);
    const b = new Proxy({}, { get: (_, p) => {
      if (p === 'then') return (ok, ko) => Promise.resolve(risposta(q)).then(ok, ko);
      return (...a) => { q.passi.push([p, ...a]); return b; };
    } });
    return b;
  };
  const passo = (q, nome) => q.passi.find(x => x[0] === nome);
  function risposta(q) {
    if (opz.rotto && opz.rotto.includes(q.tabella)) return { data: null, error: { message: 'rete' } };
    let righe = tabelle[q.tabella] || [];
    const sel = (passo(q, 'select') || [])[1] || '';
    if (passo(q, 'maybeSingle')) return { data: righe[0] || null, error: null };
    if (passo(q, 'limit')) righe = [...righe].sort((x, y) => (x.data < y.data ? -1 : 1)).slice(0, passo(q, 'limit')[1]);   // la prima vendita
    const range = passo(q, 'range');
    if (range && range[1] > 0) righe = [];   // tutto sta nella prima pagina
    if (q.tabella === 'vendite' && /contatti\(/.test(sel)) righe = righe.map(v => ({ id: v.id, incassato: v.incassato, prezzo_pubblico: v.prezzo_pubblico, pagato_con: v.pagato_con, contatti: v.contatti }));
    return { data: righe, error: null };
  }
  return { from: da, rpc: () => Promise.resolve({ data: null, error: null }), richieste };
}

// ── le vendite finte (nomi inventati): vendite_conti ha i conti, vendite l'incasso e il cliente ──
const FC = 2.26194;
function vendita(id, contatto, nome, categoria, dal, v) {
  const conta_il = v.consegna ? v.ordinata_il || null : v.data;
  const provvigione = Math.round(v.vp * FC * 0.20 * 100) / 100;
  return { id, contatto_id: contatto, data: v.data, brand: v.brand, prodotto: v.prodotto || 'Prodotto', vp: v.vp, sconto: v.sconto || 0, consegna: v.consegna || null, ordinata_il: v.ordinata_il || null,
    conta_il, provvigione, guadagno_netto: Math.round((provvigione - (v.sconto || 0)) * 100) / 100,
    incassato: v.incassato == null ? null : v.incassato, prezzo_pubblico: v.prezzo == null ? null : v.prezzo, pagato_con: v.pagato_con || null,
    contatti: { nome, categoria, account_cliente_dal: dal } };
}
const VENDITE = [
  vendita('v1', 'c1', 'Persona A', 'Cliente', null, { data: '2026-10-21', brand: 'Nutrilite/XS', vp: 48.2, incassato: 95, prezzo: 99, sconto: 4, pagato_con: 'Contanti' }),
  vendita('v2', 'c2', 'Persona B', 'Cliente', '2026-06-01', { data: '2026-10-15', brand: 'Artistry', vp: 30 }),   // cliente con account: pagata sul sito
  vendita('v3', 'c3', 'Persona C', 'Prospect', null, { data: '2026-10-05', brand: 'Home', vp: 22.5, incassato: 40, prezzo: 40, pagato_con: 'Bonifico' }),
  vendita('v4', 'c1', 'Persona A', 'Cliente', null, { data: '2026-10-10', brand: 'eSpring', vp: 300, consegna: '2026-11-20', incassato: 600, prezzo: 600, pagato_con: 'Bonifico' }),   // da consegnare
  vendita('v5', 'c2', 'Persona B', 'Cliente', '2026-06-01', { data: '2026-09-12', brand: 'Artistry', vp: 30 }),
  vendita('v6', 'c3', 'Persona C', 'Prospect', null, { data: '2026-03-02', brand: 'Persona', vp: 12, incassato: 25, prezzo: 25, pagato_con: 'Contanti' }),
];
const AZIONI = [   // il Report delle azioni: due Contatti e un Piano Marketing a ottobre, niente Follow Up né Consulenze
  { id: 'a1', contatto_id: 'c1', categoria: 'Prospect', tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'PM Fissato', completata: true, inizio: '2026-10-20T15:00:00Z', esito_il: '2026-10-20', contatti: { nome: 'Persona A', categoria: 'Cliente' } },
  { id: 'a2', contatto_id: 'c3', categoria: 'Prospect', tipo_azione: 'Contatto', modalita: 'Telefonata', esito: 'Richiamare', completata: true, inizio: '2026-10-18T15:00:00Z', esito_il: '2026-10-18', contatti: { nome: 'Persona C', categoria: 'Prospect' } },
  { id: 'a3', contatto_id: 'c3', categoria: 'Prospect', tipo_azione: 'Piano Marketing', modalita: 'PM 1a1', esito: 'Presentazione', completata: true, inizio: '2026-10-12T17:00:00Z', contatti: { nome: 'Persona C', categoria: 'Prospect' } },
];

function avvia(opz = {}) {
  const app = new Nodo();
  const db = database({ vendite_conti: VENDITE, vendite: VENDITE, azioni: AZIONI, wes: [{ id: 'w1', data: '2026-09-01' }, { id: 'w2', data: '2026-11-01' }],
    griglia_pm: opz.griglia ? [opz.griglia] : [] }, opz);
  const aperti = [], ritorni = [];
  const stub = {
    app, document: { getElementById: id => app.getElementById(id), querySelectorAll: s => app.querySelectorAll(s) }, window: { scrollTo() {} },
    MB21Report: R, MB21Lista: L, MB21Agenda: A, MB21Icone: Icone, MB21Coda: { oggiRoma: () => OGGI },
    supa: db, dbq: async (cosa, p) => p, SCRITTURE: { ultima: 0 }, aggiungiPortatoDa: async x => x, rigaPortato: () => '', foglioAzione() {},
    partnerSelect: () => '', collegaPartnerSelect() {}, versione: () => '', eAdmin: () => false, vediTutti: () => false, idVisti: () => ['io'], visto: () => ({ id: 'io' }),
    ST: { tab: 'report', utente: { id: 'io' } }, LS: {}, mostraTab: () => ritorni.push('mostraTab'), apriContattoDa: (id, rit) => aperti.push([id, rit]),
    impostaGriglia() {}, soloGuardo: () => false, Date, JSON, Math, console, Promise, Map, Set,
  };
  const codice = [
    fra('const CLASSI_CAT = {', '\nfunction classeCat'), riga('function classeCat'), riga('function ic('), riga('function escIcone'), funzione('esc'), riga('function iniziali('),
    dashboard.split('\n').find(x => x.startsWith('const testoGriglia = ')),
    fra('// ── REPORT (Fase 5)', '\n// ── «Segnala»'), funzione('disegnaGriglia'),
    'return { RP, PV, apriReport, disegnaReport, disegnaProvvigioni, disegnaGriglia, apriProvvigioniDa, tornaInDashboard };',
  ].join('\n');
  const nomi = Object.keys(stub);
  const m = new Function(...nomi, codice)(...nomi.map(n => stub[n]));
  return { m, app, db, aperti, ritorni, stub, clic: (sel, n = 0) => app.clic(sel, n) };
}
const aspetta = () => new Promise(r => setImmediate(r));
// una vista pronta: azioni (Report di sempre) · mese · anno (Provvigioni) · griglia (aperta dalla Dashboard)
async function vista(nome, opz = {}) {
  const P = avvia(opz);
  if (nome === 'mese' || nome === 'anno') { P.m.RP.linguetta = 'provvigioni'; P.m.PV.vista = nome; }
  if (nome === 'griglia') { P.m.RP.grigliaDa = 'oggi'; await P.m.apriReport('griglia'); } else await P.m.apriReport('report');
  for (let i = 0; i < 5; i++) await aspetta();
  return P;
}
const pagina = corpo => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${stile}</style></head>
<body>${Icone.elenco ? Icone.elenco() : ''}<main id="app">${corpo}</main></body></html>`;

module.exports = { avvia, vista, aspetta, pagina, VENDITE, OGGI };

if (require.main === module) (async () => {
  const [nome = 'mese', file] = process.argv.slice(2);
  const P = await vista(nome);
  const html = pagina(P.app.innerHTML);
  if (file) fs.writeFileSync(file, html); else process.stdout.write(html);
})();

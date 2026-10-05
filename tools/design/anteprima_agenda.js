// Anteprima dell'Agenda con dati finti (cantiere 37).
// Prende lo stile e il codice VERI da index.html (nessuna copia da tenere allineata), li fa girare qui con
// dati inventati e scrive una pagina già disegnata: serve a guardare la griglia del giorno, la settimana e
// l'elenco mentre si lavora, e a farne le foto. Nessun database, nessuna rete.
// Uso:  node tools/design/anteprima_agenda.js   →  tools/design/anteprima_agenda.html
const fs = require('node:fs'), path = require('node:path');
const BASE = path.join(__dirname, '..', '..');
// dal 23/09 MB Plan vive in pagina-agenda.js: lo si rimette al suo posto in index.html (dove c'è il segnaposto),
// così i pezzi si prendono come prima, dai file veri
const sorgente = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8')
  .replace(/^\/\/ ── MB PLAN \(l'Agenda\) ── la pagina è in pagina-agenda\.js.*$/m, () => fs.readFileSync(path.join(BASE, 'pagina-agenda.js'), 'utf8'));
const A = require(path.join(BASE, 'agenda.js'));
const MB21Icone = require(path.join(BASE, 'icone.js'));
const MB21Spazi = require(path.join(BASE, 'spazi.js'));   // «Modello appuntamenti settimanale» (27/09)

const fra = (da, a) => sorgente.slice(sorgente.indexOf(da), sorgente.indexOf(a, sorgente.indexOf(da)));
const funzione = nome => {
  const m = sorgente.match(new RegExp('^((?:async )?function ' + nome + '\\b[\\s\\S]*?)\\n\\}', 'm'));
  if (!m) throw new Error('non trovo la funzione ' + nome);
  return m[1] + '\n}';
};
const riga = inizio => {
  const r = sorgente.split('\n').find(x => x.startsWith(inizio));
  if (!r) throw new Error('non trovo la riga ' + inizio);
  return r;
};

const stile = fra('<style>', '</style>').replace('<style>', '');
const codice = [
  fra('const CLASSI_CAT = {', '\nfunction classeCat'),
  riga('function classeCat'), riga('function ic('), riga('function escIcone'),
  funzione('esc'), funzione('bottoniEsiti'), funzione('bloccoEsiti'), funzione('statoAzione'), funzione('avvisoSovrapposti'), riga('function iniziali('),
  funzione('nuovoAppuntamento'),   // il modulo «+» vero (dal 05/10, nota 027: «Condividi con», la serata Team/Linea)
  fra("// ── Come si guarda l'Agenda (cantiere 37)", '// Prima si cerca la persona'),
  'return { disegnaAgenda, avvisoSovrapposti, grigliaGiorno, grigliaSettimana, menuAgendaHtml, foglioSpazio, preparaSettimana, rigaSpazioHtml, programmaSettimanaHtml, foglioCosa, collegaCose, spuntaCosa, foglioEvento, foglioRicevuto, foglioImpegniNuovi, controllaImpegniNuovi, nuovoAppuntamento };',
].join('\n');

// ── una giornata finta, con due appuntamenti alla stessa ora ──
const OGGI = '2026-09-21';
const q = (g, o) => A.isoDaRoma(g, o);
const az = (id, giorno, ora, durata, tipo, modalita, nome, categoria, extra) => Object.assign({
  id, user_id: 'io', contatto_id: 'c' + id, tipo_azione: tipo, modalita, area: 'Costruzione',
  inizio: q(giorno, ora), fine: durata ? new Date(Date.parse(q(giorno, ora)) + durata * 60000).toISOString() : null,
  completata: false, esito: null, contatti: { nome, categoria, telefono: '333 1234567' }, categoria,
}, extra || {});
const AZIONI = [
  az('t1', OGGI, '09:00', null, 'Contatto', 'Telefonata', 'Marco Bini', 'Prospect', { data_scelta: q(OGGI, '09:00'), esito: 'Richiamare' }),
  // con i punti da trattare e il link della chiamata (nota 026, 05/10): uno già trattato
  az('p1', OGGI, '11:00', 60, 'Piano Marketing', 'PM 1a1', 'Laura Ferri', 'Prospect', { link: 'https://meet.google.com/abc-defg-hij', punti: [{ t: 'Raccontare la mia storia', fatto: true }, { t: 'Il piano in 20 minuti', fatto: false }, { t: 'Fissare il Follow Up', fatto: false }] }),
  az('c1', OGGI, '15:00', 60, 'Appuntamento', 'Counseling', 'Isabella Rossi', 'Partner', { confermato_il: q(OGGI, '08:00') }),
  az('p2', OGGI, '18:30', 60, 'Piano Marketing', 'PM 1a1', 'Pino Manolo', 'Prospect'),
  az('v1', OGGI, '18:30', 30, 'Consulenza PRD', 'Riordino', 'Anna Villa', 'Cliente'),
  az('f1', OGGI, '20:00', 45, 'Follow Up', 'Personale', 'Gino Pace', 'Prospect', { ospite: 'la moglie' }),
  az('x1', '2026-09-22', '10:00', 60, 'Piano Marketing', 'PM 1a1', 'Rita Neri', 'Prospect'),
  az('x2', '2026-09-22', '17:00', 90, 'Appuntamento', 'Avvio', 'Luca Dini', 'Partner'),
  az('x3', '2026-09-24', '19:00', 60, 'Follow Up', 'Upline', 'Sara Conti', 'Prospect', { completata: true, esito: 'Ulteriore Follow Up' }),
  az('x4', '2026-09-25', '09:30', 30, 'Consulenza PRD', 'Riordino', 'Elio Massa', 'Cliente'),
  az('x5', '2026-09-25', '18:00', 60, 'Piano Marketing', 'PM Open', 'Gruppo', 'Prospect'),
  az('x6', '2026-09-25', '18:30', 60, 'Piano Marketing', 'PM 1a1', 'Nina Poli', 'Prospect'),
];

// ── finte le cose che nell'app arrivano dal database o da altre pagine ──
// `modo`: per provare anche l'Admin con il Partner Select su «Tutti» (più agende insieme)
const modo = { admin: false, tutti: false };
const { Nodo } = require('./mini_dom.js');
const app = new Nodo();   // dal 05/10 un piccolo DOM: la prova può toccare le pastiglie «Per chi è?» e il campo «Aggiungi…»
const AG = { giorno: OGGI, settimana: A.settimana(OGGI), azioni: AZIONI, passati: [{}], aperta: null,
  telefonate: { oggi: true, fatti_oggi: 4, contatti_al_giorno: 10 }, vista: 'giorno', portato: 'fatto',
  // MB Plan «Da fare» (05/10): ogni cosa è legata a una persona o a Team · LdS · Network 21 · Amway; una vecchia non ha il legame
  cose: [{ id: 'k1', testo: 'Comprare i biglietti BBS', giorno: '2026-09-19', ordine: 0, fatto_il: null, legato_a: 'N21' },
    { id: 'k2', testo: 'Preparare il PM di giovedì', giorno: OGGI, ordine: 1, fatto_il: null, contatto_id: 'c1', contatti: { nome: 'Laura Bianchi', categoria: 'Prospect' } },
    { id: 'k3', testo: 'Serata di Team da organizzare', giorno: OGGI, ordine: 2, fatto_il: null, legato_a: 'Team' },
    { id: 'k4', testo: 'Una cosa vecchia, ancora da collegare', giorno: OGGI, ordine: 3, fatto_il: null }],
  legame: null, filtro: '',
  // impegni ricevuti da altri (nota 027): nell'anteprima nessuno (le prove li mettono da `finto.ricevuti`); i frontali dell'Admin per «Una Linea»
  ricevuti: [], frontali: [{ partner_id: 'FR1', nome: 'ROSSI, CARLA' }, { partner_id: 'FR2', nome: 'BIANCHI, LUCA' }],
  // gli spazi da riempire (27/09): si vedono solo all'Admin (modo.admin)
  spazi: [{ id: 's1', user_id: 'io', tipo: 'SdS/OPEN', inizio: q(OGGI, '21:30'), durata: 60 }, { id: 's2', user_id: 'io', tipo: 'Piano Marketing', inizio: q(OGGI, '13:00'), durata: 60 },
    { id: 's3', user_id: 'io', tipo: 'Consulenza PRD', inizio: q('2026-09-23', '10:00'), durata: 60 }] };
// i fogli che salgono dal basso (Prepara la settimana, il foglio di uno spazio) sono Nodi del piccolo DOM (tools/design/mini_dom.js): la prova li tocca davvero
const fogli = [];
const documento = { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, body: { appendChild() {} },
  createElement: () => { const v = new Nodo(); fogli.push(v); return v; } };
// un finto database: si ricorda le scritture (insert · update · delete) e risponde «fatto»
const scritture = [], avvisi = [], scelta = { persona: null, esiste: false };   // `scelta.persona`: chi sceglie l'utente dalla lista quando tocca «Una persona»
const tabella = nome => new Proxy({}, { get: (t, op) => (...args) => { if (['insert', 'update', 'delete', 'upsert'].includes(op)) scritture.push({ tabella: nome, op, args }); return fine; } });
const fine = new Proxy(function () {}, { get: (t, p) => (p === 'then' ? undefined : fine), apply: () => fine });
// impegni condivisi (nota 027): cosa risponde il finto database alle funzioni (si cambia dalle prove); le chiamate alle funzioni finiscono in `scritture` come op 'rpc'
const finto = { ricevuti: [{ origine: 'azione', id: 'a-ric', inizio: q(OGGI, '17:00'), fine: q(OGGI, '18:00'), titolo: 'PM 1a1', tipo: 'Piano Marketing', da_utente: 'u-ign', da_nome: 'Ignazio',
    link: 'https://zoom.us/j/555', punti: [{ t: 'Il perché', fatto: false }], punti_condivisi: true, visto_il: null, risposta: null }],
  risposte: [{ utente_id: 'u-isa', nome: 'Isabella Rossi', risposta: 'ci_sono', risposto_il: q(OGGI, '08:00'), visto_il: q(OGGI, '08:00') }],
  condividi: { esito: 'ok', nome: 'Isabella Rossi', utente: 'u-isa' },
  contatti: [{ id: 'c-isa', nome: 'Isabella Rossi', categoria: 'Partner' }, { id: 'c-pino', nome: 'Pino Manolo', categoria: 'Prospect' }] };
const stub = {
  supa: { from: tabella, rpc: (nome, args) => { scritture.push({ tabella: 'rpc:' + nome, op: 'rpc', args: [args] }); return fine; } }, dbq: async nome => (nome === 'ripetizione già c\'è' ? { data: scelta.esiste ? [{ id: 'gia' }] : [], error: null }
    : nome === 'punto nel Da fare' ? { data: { id: 'nuovo-1', testo: 'x', giorno: OGGI, scala: 'giorno' }, error: null }   // `.single()`: una riga sola, non un elenco
    // impegni condivisi (nota 027): le risposte finte del database
    : nome === 'impegni ricevuti' || nome === 'impegni nuovi' ? { data: finto.ricevuti, error: null }
    : nome === 'risposte impegno' ? { data: finto.risposte, error: null }
    : nome === 'condividi azione' ? { data: finto.condividi, error: null }
    : nome === 'nuovo appuntamento' ? { data: { id: 'az-nuova' }, error: null }
    : nome === 'nuova serata' ? { data: { id: 'sp-nuova', ...(scritture.at(-1) || { args: [{}] }).args[0] }, error: null }
    : { data: [{ id: 'nuovo-1' }], error: null }),
  MB21Agenda: A, MB21Icone, MB21Spazi, app, AG, LIMITE_SENZA_ESITO: 50,
  ST: { utente: { id: 'io', partner_id: 'IO1' }, tab: 'agenda' }, RIO: { righe: [{}] }, CONF: { righe: [{}, {}] }, FATTO_APERTO: new Set(),
  MB21Coda: { ...require(path.join(BASE, 'coda.js')), oggiRoma: () => OGGI },   // il motore vero (contoGiorno), con l'oggi fermo
  vediTutti: () => modo.tutti, visto: () => ({ id: 'io' }), eAdmin: () => modo.admin, soloGuardo: () => false,
  partnerSelect: () => '', collegaPartnerSelect: () => {}, versione: () => '',
  contattaHtml: () => '<div class="contatta"><a href="#">Chiama</a><a href="#">Messaggio</a><a href="#">WhatsApp</a><a href="#">Telegram</a></div>',
  rigaPortato: n => 'portato da ' + n,
  ricordoHtml: () => '', preparaChiamataHtml: () => '', preparaPresentazioneHtml: () => '',   // il coach non c'entra qui (il foglio dell'impegno, per i punti da trattare)
  collegaEsiti: () => {}, mostraToast: (t, annulla) => { avvisi.push({ t, annulla }); }, mostraTab: () => {},
  spostaAppuntamento: () => {}, foglioAzione: () => {}, eliminaAppuntamento: () => {},
  // per il modulo «+» vero: i contatti della lista, niente spazi liberi, niente domande dopo il salvataggio
  leggiContattiMiei: async () => finto.contatti, spaziLiberi: async () => [], legaInizioFine() {}, domandaInvito() {}, tracciaDiApertura() {}, contattiMiei: null, LS: { righe: [] },
  aNome: () => '', chiediConferma: async () => true, sceltaContatto: async () => scelta.persona, apriContattoDa: () => {}, scegliPassato: () => {}, apriAgenda: async () => {}, apriCheck: () => {},
  document: documento,
  pilloleDurata: () => '<div class="ag-scelte"><button>1 ora</button></div>', collegaPilloleDurata() {}, segnaSenzaOpen: async () => true, dbqAvvisa: async (_, p) => (scritture.length, { error: null }),
  setInterval: () => 0,   // qui non serve la linea di «adesso» che si muove da sola: l'anteprima è una foto
  window: { scrollY: 0, innerHeight: 800, scrollTo: () => {}, addEventListener: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} },
};
const nomi = Object.keys(stub);
const { disegnaAgenda, avvisoSovrapposti, grigliaGiorno, grigliaSettimana, menuAgendaHtml, foglioSpazio, preparaSettimana, rigaSpazioHtml, programmaSettimanaHtml, foglioCosa, collegaCose, spuntaCosa, foglioEvento, foglioRicevuto, foglioImpegniNuovi, controllaImpegniNuovi, nuovoAppuntamento } = new Function(...nomi, codice)(...nomi.map(n => stub[n]));

// `orario` = la griglia del giorno da sola (nell'app sta nel cassetto «Timeline»); `giorno` (o `elenco`) = la pagina
// formato NotePlan (cantiere 41: impegni, foglio, Core); `settimana` = le sette colonne
function vista(v, aperta) {
  AG.aperta = aperta || null; AG.portato = 'fatto';
  if (v === 'orario') return grigliaGiorno(A.eventiDelGiorno(AG.azioni, AG.giorno), { mioId: modo.tutti ? null : 'io', admin: modo.admin });
  AG.vista = v === 'settimana' ? 'settimana' : 'giorno';
  disegnaAgenda();
  // la griglia a sette colonne sta nella colonna destra (o nella linguetta): nell'anteprima si mette sotto il foglio
  if (v === 'settimana') return app.innerHTML + grigliaSettimana({ mioId: modo.tutti ? null : 'io', admin: modo.admin });
  return app.innerHTML;
}
module.exports = { foglioCosa, collegaCose, spuntaCosa, scelta, app, A, AG, modo, vista, menuAgendaHtml, disegnaAgenda, avvisoSovrapposti, az, OGGI, foglioSpazio, foglioEvento, foglioRicevuto, foglioImpegniNuovi, controllaImpegniNuovi, nuovoAppuntamento, finto, preparaSettimana, rigaSpazioHtml, programmaSettimanaHtml, fogli, scritture, avvisi };
if (require.main !== module) return;

// con un argomento si guarda una vista sola, grande: node tools/design/anteprima_agenda.js giorno /tmp/x.html
const sola = process.argv[2], dove = process.argv[3];
const telefono = (titolo, dentro) => `<div class="pv-tel"><div class="pv-t">${titolo}</div>${dentro}</div>`;
// il modulo mentre avvisa: si sta fissando un PM alle 18:30, dove c'è già Pino Manolo
const pastiglie = (voci, scelta) => `<div class="ag-scelte">${voci.map(v => `<button class="${v === scelta ? 'scelto' : ''}">${v}</button>`).join('')}</div>`;
const modulo = () => `<div class="foglio mc" style="border-radius:22px;box-shadow:var(--ombra-card)">
  <div class="mc-testa cat-prospect"><span class="ts-pastiglia">PM</span><div><small>Nuovo appuntamento</small><b>Pino Manolo</b></div></div>
  <div class="riquadro mc-g" style="margin-top:14px">
    <div class="campo"><label>Giorno e ora <small>Obbligatorio</small></label><div class="ag-due-campi">
      <input type="date" value="2026-09-21"><input type="time" value="18:30"></div></div>
    <div class="campo"><label>Durata</label>${pastiglie(['5 min', '30 min', '45 min', '1 ora', '1h 30', '2 ore', 'Altra…'], 'Altra…')}</div>
    <div class="campo"><label>Finisce alle</label><input type="time" value="19:15"></div>
    ${avvisoSovrapposti('2026-09-21', '18:30', 45, null)}
  </div></div>`;
const tutti = sola === 'giorno' ? telefono('Timeline (il cassetto)', vista('orario'))
  : sola === 'settimana' ? telefono('Settimana', vista('settimana'))
  : sola === 'elenco' ? telefono('Il foglio del giorno', vista('giorno'))
  : sola === 'modulo' ? telefono('Fissi a un\'ora occupata', modulo())
  : telefono('Timeline (il cassetto)', vista('orario')) + telefono('Settimana', vista('settimana'))
    + telefono('Il foglio del giorno', vista('giorno')) + telefono('Fissi a un\'ora occupata', modulo());
const pagina = `<!doctype html>
<html lang="it"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MB21 · Agenda, anteprima con dati finti</title>
<style>
${stile}
  /* solo per l'anteprima, non fa parte dell'app */
  body { background: #DDE1E8; padding: 18px 10px 40px; ${sola ? 'zoom: .62;' : ''} }
  .pv-fila { display: flex; gap: 20px; justify-content: center; align-items: flex-start; flex-wrap: wrap; }
  .pv-tel { width: 392px; background: var(--sfondo); border-radius: 34px; box-shadow: 0 10px 40px rgba(16,21,31,.18); padding: 8px 16px 22px; }
  .pv-t { font-size: 12px; text-transform: uppercase; letter-spacing: .8px; color: var(--testo-tenue); font-weight: 700; margin: 4px 2px 2px; }
</style>
<div class="pv-fila">${tutti}</div>
`;
const fuori = dove || path.join(BASE, 'tools', 'design', 'anteprima_agenda.html');
fs.writeFileSync(fuori, pagina);
console.log('scritta ' + fuori);

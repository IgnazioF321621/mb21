// Anteprima dell'Agenda con dati finti (cantiere 37).
// Prende lo stile e il codice VERI da index.html (nessuna copia da tenere allineata), li fa girare qui con
// dati inventati e scrive una pagina già disegnata: serve a guardare la griglia del giorno, la settimana e
// l'elenco mentre si lavora, e a farne le foto. Nessun database, nessuna rete.
// Uso:  node tools/design/anteprima_agenda.js   →  tools/design/anteprima_agenda.html
const fs = require('node:fs'), path = require('node:path');
const BASE = path.join(__dirname, '..', '..');
const sorgente = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
const A = require(path.join(BASE, 'agenda.js'));
const MB21Icone = require(path.join(BASE, 'icone.js'));

const fra = (da, a) => sorgente.slice(sorgente.indexOf(da), sorgente.indexOf(a, sorgente.indexOf(da)));
const funzione = nome => {
  const m = sorgente.match(new RegExp('^(function ' + nome + '\\b[\\s\\S]*?)\\n\\}', 'm'));
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
  funzione('esc'), funzione('bloccoEsiti'), funzione('statoAzione'), funzione('avvisoSovrapposti'),
  fra("// ── Come si guarda l'Agenda (cantiere 37)", '// Prima si cerca la persona'),
  'return { disegnaAgenda, avvisoSovrapposti };',
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
  az('p1', OGGI, '11:00', 60, 'Piano Marketing', 'PM 1a1', 'Laura Ferri', 'Prospect'),
  az('c1', OGGI, '15:00', 60, 'Appuntamento', 'Counseling', 'Isabella Rossi', 'Partner', { confermato_il: q(OGGI, '08:00') }),
  az('p2', OGGI, '18:30', 60, 'Piano Marketing', 'PM 1a1', 'Pino Manolo', 'Prospect'),
  az('v1', OGGI, '18:30', 30, 'Consulenza PRD', 'Riordino', 'Anna Villa', 'Cliente'),
  az('f1', OGGI, '20:00', 45, 'Follow Up', 'Personale', 'Gino Pace', 'Prospect', { ospite: 'la moglie' }),
  az('x1', '2026-09-22', '10:00', 60, 'Piano Marketing', 'PM 1a1', 'Rita Neri', 'Prospect'),
  az('x2', '2026-09-22', '17:00', 90, 'Appuntamento', 'Avvio', 'Luca Dini', 'Partner'),
  az('x3', '2026-09-24', '19:00', 60, 'Follow Up', 'Upline', 'Sara Conti', 'Prospect', { completata: true, esito: 'DS Fissato' }),
  az('x4', '2026-09-25', '09:30', 30, 'Consulenza PRD', 'Riordino', 'Elio Massa', 'Cliente'),
  az('x5', '2026-09-25', '18:00', 60, 'Piano Marketing', 'PM Open', 'Gruppo', 'Prospect'),
  az('x6', '2026-09-25', '18:30', 60, 'Piano Marketing', 'PM 1a1', 'Nina Poli', 'Prospect'),
];

// ── finte le cose che nell'app arrivano dal database o da altre pagine ──
// `modo`: per provare anche l'Admin con il Partner Select su «Tutti» (più agende insieme)
const modo = { admin: false, tutti: false };
const app = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
const AG = { giorno: OGGI, settimana: A.settimana(OGGI), azioni: AZIONI, passati: [{}], aperta: null,
  telefonate: { oggi: true, fatti_oggi: 4, contatti_al_giorno: 10 }, vista: 'orario', portato: 'fatto' };
const stub = {
  MB21Agenda: A, MB21Icone, app, AG,
  ST: { utente: { id: 'io' }, tab: 'agenda' }, RIO: { righe: [{}] }, CONF: { righe: [{}, {}] }, FATTO_APERTO: new Set(),
  MB21Coda: { oggiRoma: () => OGGI },
  vediTutti: () => modo.tutti, visto: () => ({ id: 'io' }), eAdmin: () => modo.admin, soloGuardo: () => false,
  partnerSelect: () => '', collegaPartnerSelect: () => {}, versione: () => '',
  contattaHtml: () => '<div class="contatta"><a href="#">Chiama</a><a href="#">Messaggio</a><a href="#">WhatsApp</a><a href="#">Telegram</a></div>',
  rigaPortato: n => 'portato da ' + n,
  collegaEsiti: () => {}, mostraToast: () => {}, mostraTab: () => {},
  nuovoAppuntamento: () => {}, spostaAppuntamento: () => {}, foglioAzione: () => {}, eliminaAppuntamento: () => {},
  apriContattoDa: () => {}, scegliPassato: () => {}, apriAgenda: async () => {},
  document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, classList: { add() {} }, appendChild() {}, querySelector: () => null, querySelectorAll: () => [], addEventListener() {} }), body: { appendChild() {} } },
  setInterval: () => 0,   // qui non serve la linea di «adesso» che si muove da sola: l'anteprima è una foto
  window: { scrollY: 0, scrollTo: () => {} },
  localStorage: { getItem: () => null, setItem: () => {} },
};
const nomi = Object.keys(stub);
const { disegnaAgenda, avvisoSovrapposti } = new Function(...nomi, codice)(...nomi.map(n => stub[n]));

function vista(v, aperta) {
  AG.vista = v; AG.aperta = aperta || null; AG.portato = 'fatto';
  disegnaAgenda();
  return app.innerHTML;
}
module.exports = { A, AG, modo, vista, disegnaAgenda, avvisoSovrapposti, az, OGGI };
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
const tutti = sola === 'giorno' ? telefono('Giorno · a orario', vista('orario'))
  : sola === 'settimana' ? telefono('Settimana', vista('settimana'))
  : sola === 'elenco' ? telefono('Elenco (una riga aperta)', vista('elenco', 'p1'))
  : sola === 'modulo' ? telefono('Fissi a un\'ora occupata', modulo())
  : telefono('Giorno · a orario', vista('orario')) + telefono('Settimana', vista('settimana'))
    + telefono('Elenco (una riga aperta)', vista('elenco', 'p1')) + telefono('Fissi a un\'ora occupata', modulo());
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

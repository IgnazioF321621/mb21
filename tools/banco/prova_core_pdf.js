// Prova del Modulo Core in PDF (core-pdf.js). Uso: node tools/banco/prova_core_pdf.js
// Serve la libreria jspdf installata a parte (non è nel repo): JSPDF=/percorso/node_modules/jspdf node tools/banco/prova_core_pdf.js
// Con PDF_OUT=/percorso/file.pdf salva il foglio, per guardarlo.
const assert = require('node:assert/strict');
const C = require('../../core.js');
const P = require('../../core-pdf.js');

let jspdf;
try { jspdf = require(process.env.JSPDF || 'jspdf'); } catch (e) { console.log('SALTATA: jspdf non installato (JSPDF=/percorso/node_modules/jspdf)'); process.exit(0); }

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('OK  ' + nome); }

const mese = '2026-09';
const nomi = ['Laura Ferri', 'Pino Manolo', 'Giovanna Maria Esposito De Santis', 'Luca Neri', 'Sara Colombo', 'Marco Gallo', 'Elena Riva', 'Paolo Conti', 'Anna Villa'];
const modalita = ['PM 1a1', 'PM Casa/Pull'], esiti = ['Iscrizione', 'Prodotti', 'No BuonFine', 'Dare Seguito'];
const azioni = nomi.map((n, i) => ({ id: 'a' + i, tipo_azione: 'Piano Marketing', modalita: modalita[i % 2], esito: esiti[i % 4], completata: true,
  inizio: `2026-09-${String(2 + i * 3).padStart(2, '0')}T17:00:00Z`, contatti: { nome: n } }));
const vendite = Array.from({ length: 12 }, (_, i) => ({ contatto_id: 'c' + i, data: `2026-09-${String(1 + i * 2).padStart(2, '0')}`, vp: 12.5 + i * 7.25,
  contatti: { nome: i === 3 ? 'Cliente con un nome lunghissimo che non ci sta' : 'Cliente ' + (i + 1) } }));
const check = Array.from({ length: 23 }, (_, i) => ({ data: `2026-09-${String(i + 1).padStart(2, '0')}`, tracce: i % 5 === 4 ? 0 : 1 + (i % 3 === 0 ? 1 : 0),
  pagine: i % 4 === 3 ? 5 : 12, libro: 'Il potere del pensiero positivo', open: [1, 9, 16].includes(i), counseling: i === 14, edificazione: true, no_crossline: false }));
const tracce = [{ giorno: '2026-09-02', titolo: 'La visione' }, { giorno: '2026-09-15', titolo: 'Il sogno' }];
const biglietti = [{ tipo: 'BBS', evento: '2026-10-01', contatto: true }];
const obiettivi = { vpp: 300, vpg: 1200, sponsor_personali: 2, sponsor_gruppo: 4, cep: 30, bbs: 5, wes: 3, vpp_amway: 412.75 };
const dati = { pm: { a2: { candidati: 2 } }, punti: 'Fare le domande giuste e ascoltare di più; scrivere ogni sera tre cose fatte bene.', note: 'Mese buono: da rinforzare la lettura nel fine settimana.' };
const m = C.modulo({ mese, azioni, vendite, check, tracce, biglietti, obiettivi, dati });

prova('Il foglio è una pagina A4 verticale, con il modulo dentro', () => {
  const doc = P.crea(jspdf.jsPDF, m, { mese: 'settembre 2026', nome: 'Ignazio Fiorito', oggi: '23/09/2026' });
  assert.equal(doc.getNumberOfPages(), 1);
  const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  assert.ok(Math.abs(w - 210) < 0.5 && Math.abs(h - 297) < 0.5);
  const testo = doc.output();
  for (const t of ['PRESENTARE ALMENO 8', 'CONSUMARE I PRODOTTI', 'SERVIRE ALMENO 10', 'LAVORARE DI SQUADRA', 'Ignazio Fiorito', 'settembre 2026', 'Laura Ferri']) assert.ok(testo.includes(t), t);
  if (process.env.PDF_OUT) require('node:fs').writeFileSync(process.env.PDF_OUT, Buffer.from(doc.output('arraybuffer')));
});

prova('Anche un mese vuoto sta in una pagina (caselle da compilare a penna)', () => {
  const doc = P.crea(jspdf.jsPDF, C.modulo({ mese: '2026-10' }), { mese: 'ottobre 2026', nome: '', oggi: '1/10/2026' });
  assert.equal(doc.getNumberOfPages(), 1);
  if (process.env.PDF_OUT) require('node:fs').writeFileSync(process.env.PDF_OUT.replace('.pdf', '-vuoto.pdf'), Buffer.from(doc.output('arraybuffer')));
});

prova('Il nome del file va bene su iPhone, Android e Windows', () => {
  assert.equal(P.nomeFile('settembre 2026', 'Ignazio Fiorito'), 'Modulo Core - settembre 2026 - Ignazio Fiorito.pdf');
  assert.equal(P.nomeFile('settembre 2026', 'A/B: "C"'), 'Modulo Core - settembre 2026 - AB C.pdf');
  assert.equal(P.nomeFile('ottobre 2026', ''), 'Modulo Core - ottobre 2026.pdf');
});

console.log(`\n${ok} prove superate`);

// Prova di Admin › Segnalazioni (pagina-segnalazioni.js, nota Admin 005): la pagina si disegna con dati finti.
// Uso: node tools/banco/prova_admin_segnalazioni.js
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const S = require('../../segnala.js');
const ctx = { MB21Segnala: S, esc: s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), ic: n => `[${n}]`,
  nomeDi: u => u.nome, telefonoInvito: u => (u.telefono || '').startsWith('+') ? u.telefono : null,
  AD: { tutti: [{ id: 'u1', nome: 'Carolina', telefono: '+393381234567' }, { id: 'u2', nome: 'Luca', telefono: '' }], sezione: 'segnalazioni', segnalazioneAperta: 's1' } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../pagina-segnalazioni.js'), 'utf8') + '\nthis.html = segnalazioniAdminHtml;', ctx);
let ok = 0; const prova = (n, f) => { f(); ok++; console.log('OK  ' + n); };
ctx.AD.segnalazioni = { elenco: S.ordinaSegnalazioni([
  { id: 's1', user_id: 'u1', creata_il: '2026-10-18T10:00:00Z', motivo: 'non_capisco', testo: 'Come cambio la data?', dove: { pagina: 'agenda' }, versione: '2026.10.18', telefono: 'iPhone · Safari · app', immagine: 'u1/s1.jpg', risposta: null },
  { id: 's2', user_id: 'u2', creata_il: '2026-10-19T10:00:00Z', motivo: 'idea', testo: '<b>idea</b>', dove: {}, risolta_il: '2026-10-19T12:00:00Z', risposta: 'Fatto' }]) };
prova('aperta prima della risolta; testo protetto; tasti giusti nella aperta (con numero)', () => {
  const h = ctx.html();
  assert.ok(h.indexOf('data-sg-apri="s1"') < h.indexOf('data-sg-apri="s2"'));
  assert.match(h, /data-sg-wa="s1"/); assert.match(h, /data-sg-foto="s1"/); assert.match(h, /data-sg-risolta="s1"/); assert.match(h, /data-sg-letta="s1"/);
  assert.match(h, /Era in: MB Plan/); assert.doesNotMatch(h, /<b>idea<\/b>/);
});
prova('senza telefono niente tasto WhatsApp; la risolta si può rimettere aperta', () => {
  ctx.AD.segnalazioneAperta = 's2';
  const h = ctx.html();
  assert.doesNotMatch(h, /data-sg-wa=/); assert.match(h, /Manca il telefono/); assert.match(h, /data-sg-riapri="s2"/); assert.doesNotMatch(h, /data-sg-risolta=/);
});
prova('stati: caricamento, errore, vuoto', () => {
  ctx.AD.segnalazioni = null; assert.match(ctx.html(), /Carico/);
  ctx.AD.segnalazioni = { errore: 'No' }; assert.match(ctx.html(), /No/);
  ctx.AD.segnalazioni = { elenco: [] }; assert.match(ctx.html(), /Ancora nessuna/);
});
console.log(`\n${ok} prove superate`);

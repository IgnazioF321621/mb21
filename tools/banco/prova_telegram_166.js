// Prova della nota Pagine 166 (Ignazio 01/11/2026, «si si apre» provando il link sul Mac): Telegram sul Mac si apre in Telegram Web, nel browser,
// come WhatsApp; su iPhone e iPad resta l'app (t.me). Una regola sola (MB21Lista.linkTelegram / linkTelegramCondividi) per i tre posti:
// i 4 tasti per contattare (contattaHtml), apriTelegramCon (inviti, segnalazioni, condivisione dell'appuntamento) e «Condividi» (t.me/share).
// Seguito (Ignazio 01/11: «aprendo nuove pagine web, quelle precedenti si chiudono»): sul computer WhatsApp e Telegram riusano sempre la stessa scheda.
// Numeri finti. Uso: node tools/banco/prova_telegram_166.js
const assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');
const L = require('../../lista.js');
const BASE = path.join(__dirname, '..', '..');
const leggi = f => fs.readFileSync(path.join(BASE, f), 'utf8');
const IDX = leggi('index.html'), PL = leggi('pagina-lista.js'), AD = leggi('admin.js');

let ok = 0;
function prova(nome, fn) { fn(); ok++; console.log('✓', nome); }

prova('la chat di un numero: sul Mac Telegram Web (tg://resolve?phone=, senza «+»), altrove t.me come prima', () => {
  assert.equal(L.linkTelegram('+393330000001', true), 'https://web.telegram.org/k/#?tgaddr=tg%3A%2F%2Fresolve%3Fphone%3D393330000001');
  assert.equal(L.linkTelegram('+393330000001', false), 'https://t.me/+393330000001');
  assert.equal(L.linkTelegram(null, false), 'https://t.me/');   // senza numero: il tasto è spento, il link come prima
});
prova('condividere un link: sul Mac Telegram Web (tg://msg_url), altrove t.me/share come prima', () => {
  assert.equal(L.linkTelegramCondividi('https://esempio.it/a?b=1', 'Ciao a te', false), 'https://t.me/share/url?url=https%3A%2F%2Fesempio.it%2Fa%3Fb%3D1&text=Ciao%20a%20te');
  const web = L.linkTelegramCondividi('https://esempio.it/a?b=1', 'Ciao a te', true);
  assert.ok(web.startsWith('https://web.telegram.org/k/#?tgaddr='));
  assert.equal(decodeURIComponent(web.split('tgaddr=')[1]), 'tg://msg_url?url=https%3A%2F%2Fesempio.it%2Fa%3Fb%3D1&text=Ciao%20a%20te');
});
prova('WhatsApp: sul computer dritto a WhatsApp Web (web.whatsapp.com/send), sul telefono wa.me come prima; il testo è facoltativo', () => {
  assert.equal(L.linkWhatsApp('+393330000001', 'Ciao a te', true), 'https://web.whatsapp.com/send?phone=393330000001&text=Ciao%20a%20te');
  assert.equal(L.linkWhatsApp('+393330000001', 'Ciao a te', false), 'https://wa.me/393330000001?text=Ciao%20a%20te');
  assert.equal(L.linkWhatsApp('+393330000001', '', false), 'https://wa.me/393330000001');
  assert.equal(L.linkWhatsApp('+393330000001', '', true), 'https://web.whatsapp.com/send?phone=393330000001');
});
const pezzoIdx = () => { const da = IDX.indexOf('const sulComputer ='); return IDX.slice(da, IDX.indexOf('\n}\n', da) + 3); };
const mondo = (ua, tocchi) => { const aperte = []; const w = { opener: 'mb21' };
  const ctx = { navigator: { userAgent: ua, maxTouchPoints: tocchi }, window: { open: (...a) => { aperte.push(a); return w; } } };
  vm.createContext(ctx); vm.runInContext(pezzoIdx() + ';this.F = { sulComputer, schedaFuori, apriFuori };', ctx); return { F: ctx.F, aperte, w }; };
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)';
prova('computer o no: un Mac senza touch screen sì; l\'iPad (si presenta come Mac, ma col touch), l\'iPhone e Android no', () => {
  assert.equal(mondo(MAC, 0).F.sulComputer(), true);
  assert.equal(mondo(MAC, 5).F.sulComputer(), false);   // iPad
  assert.equal(mondo(IPHONE, 5).F.sulComputer(), false);
  assert.equal(mondo('Mozilla/5.0 (Linux; Android 14)', 5).F.sulComputer(), false);
});
prova('sul computer ogni tocco riusa la stessa scheda (un nome fisso, niente noopener, poi via il legame); sul telefono una scheda nuova come prima', () => {
  const m = mondo(MAC, 0);
  m.F.apriFuori('https://web.telegram.org/k/#?tgaddr=uno', 'telegram'); m.F.apriFuori('https://web.telegram.org/k/#?tgaddr=due', 'telegram');
  m.F.apriFuori('https://web.whatsapp.com/send?phone=1', 'whatsapp');
  assert.deepEqual(m.aperte.map(a => a.slice(1)), [['mb21-telegram'], ['mb21-telegram'], ['mb21-whatsapp']]);
  assert.equal(m.w.opener, null);
  assert.equal(m.F.schedaFuori('whatsapp'), 'target="mb21-whatsapp"');
  const t = mondo(IPHONE, 5);
  t.F.apriFuori('https://t.me/+393330000001', 'telegram');
  assert.deepEqual(t.aperte[0], ['https://t.me/+393330000001', '_blank', 'noopener']);
  assert.equal(t.F.schedaFuori('telegram'), 'target="_blank" rel="noopener"');
});
prova('tutti i posti usano la stessa regola', () => {
  assert.match(PL, /schedaFuori\(icona\)/);
  assert.match(PL, /link\(MB21Lista\.linkWhatsApp\(tel, '', sulComputer\(\)\), 'whatsapp', 'WhatsApp'\)\}\$\{link\(MB21Lista\.linkTelegram\(tel, sulComputer\(\)\), 'telegram', 'Telegram'\)/);
  assert.match(AD, /apriFuori\(MB21Lista\.linkTelegram\(tel, sulComputer\(\)\), 'telegram'\);/);
  assert.match(AD, /MB21Lista\.linkWhatsApp\(tel, invitoAvvisi\(u\), sulComputer\(\)\)\)\}" \$\{schedaFuori\('whatsapp'\)\}>/);
  assert.match(leggi('pagina-agenda.js'), /apriFuori\(MB21Lista\.linkWhatsApp\(tel, testo, sulComputer\(\)\), 'whatsapp'\)/);
  assert.match(IDX, /a\.dataset\.canale === 'wa' \? MB21Lista\.linkWhatsApp\(tel, attuale\(\), sulComputer\(\)\)/);
  assert.match(IDX, /a\.dataset\.canale === 'tg' \? MB21Lista\.linkTelegramCondividi\(link, attuale\(\)\.replace\(link, ''\)\.trim\(\), sulComputer\(\)\)/);
  assert.doesNotMatch(PL + AD + IDX + leggi('pagina-agenda.js'), /'https:\/\/t\.me\/'|t\.me\/share\/url\?url=\$\{|'https:\/\/wa\.me\/'|https:\/\/wa\.me\/\$\{/);   // nessun link scritto a mano rimasto
});
console.log(`\n${ok} prove superate`);

// Prova della nota Pagine 166 (Ignazio 01/11/2026, «si si apre» provando il link sul Mac): Telegram sul Mac si apre in Telegram Web, nel browser,
// come WhatsApp; su iPhone e iPad resta l'app (t.me). Una regola sola (MB21Lista.linkTelegram / linkTelegramCondividi) per i tre posti:
// i 4 tasti per contattare (contattaHtml), apriTelegramCon (inviti, segnalazioni, condivisione dell'appuntamento) e «Condividi» (t.me/share).
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
prova('Mac o no: un Mac senza touch screen sì; l\'iPad (si presenta come Mac, ma col touch), l\'iPhone e Android no', () => {
  const sulWeb = (ua, tocchi) => { const ctx = { navigator: { userAgent: ua, maxTouchPoints: tocchi } }; vm.createContext(ctx); return vm.runInContext(IDX.match(/^const telegramSulWeb = .*$/m)[0] + ';telegramSulWeb()', ctx); };
  assert.equal(sulWeb('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 0), true);
  assert.equal(sulWeb('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5), false);   // iPad
  assert.equal(sulWeb('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5), false);
  assert.equal(sulWeb('Mozilla/5.0 (Linux; Android 14)', 5), false);
});
prova('i tre posti usano la stessa regola', () => {
  assert.match(PL, /link\(MB21Lista\.linkTelegram\(tel, telegramSulWeb\(\)\), 'telegram', 'Telegram'\)/);
  assert.match(AD, /window\.open\(MB21Lista\.linkTelegram\(tel, telegramSulWeb\(\)\), '_blank', 'noopener'\);/);
  assert.match(IDX, /a\.dataset\.canale === 'tg' \? MB21Lista\.linkTelegramCondividi\(link, attuale\(\)\.replace\(link, ''\)\.trim\(\), telegramSulWeb\(\)\)/);
  assert.doesNotMatch(PL + AD + IDX, /'https:\/\/t\.me\/'|t\.me\/share\/url\?url=\$\{/);   // nessun t.me scritto a mano rimasto
});
console.log(`\n${ok} prove superate`);

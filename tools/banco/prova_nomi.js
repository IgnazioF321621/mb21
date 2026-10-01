// Prova dei nomi globali: gli script di MB21 sono classici e condividono lo stesso spazio, quindi due funzioni (o costanti) con lo stesso nome
// in file diversi si sovrascrivono in silenzio (01/10/2026: la `disegnaMese` della Dashboard e quella dell'Agenda; il tocco su «Il mio mese» chiamava quella dell'Agenda).
// Uso: node tools/banco/prova_nomi.js
const fs = require('node:fs');
const path = require('node:path');
const radice = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(radice, 'index.html'), 'utf8');
const script = [...html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"/g)].map(m => m[1]).filter(f => fs.existsSync(path.join(radice, f)));
const definizioni = new Map();
for (const f of script) {
  const testo = fs.readFileSync(path.join(radice, f), 'utf8');
  for (const m of testo.matchAll(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(|^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/gm)) {
    const nome = m[1] || m[2];
    if (!definizioni.has(nome)) definizioni.set(nome, new Set());
    definizioni.get(nome).add(f);
  }
}
const doppi = [...definizioni].filter(([, files]) => files.size > 1);
if (doppi.length) {
  for (const [nome, files] of doppi) console.log(`DOPPIO  ${nome}: ${[...files].join(', ')}`);
  console.log(`\n${doppi.length} nomi definiti in più file: uno copre l'altro`);
  process.exit(1);
}
console.log(`OK  nessun nome globale definito in due file (${definizioni.size} nomi in ${script.length} script)`);

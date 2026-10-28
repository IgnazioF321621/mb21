// Nota Pagine 111 (Ignazio 28/10): i pezzi condivisi delle testate v5 (feedbackV5 e rigaSopraV5), presi dal codice vero di pagina-oggi.js, per le prove
// e le anteprime che disegnano una testata. Uso: const pezziTestaV5 = require('../banco/testa_v5.js'); pezziTestaV5(PO) + '\n' + <la funzione della testata>
module.exports = PO => {
  const i = PO.indexOf('function feedbackV5'), j = PO.indexOf('const rigaSopraV5');
  if (i < 0 || j < 0) throw new Error('testa_v5: non trovo feedbackV5 o rigaSopraV5 in pagina-oggi.js');
  return PO.slice(i, PO.indexOf('\n', j) + 1);
};

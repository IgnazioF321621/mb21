// Note Pagine 111-112 (Ignazio 28/10): i pezzi condivisi delle testate v5 (feedbackV5 e testataV5, le due righe di tutte le testate), presi dal codice vero
// di pagina-oggi.js, per le prove e le anteprime che disegnano una testata. Uso: require('../banco/testa_v5.js')(PO) + '\n' + <la funzione della testata>
module.exports = PO => {
  const i = PO.indexOf('function feedbackV5'), j = PO.indexOf('function testataV5');
  if (i < 0 || j < 0) throw new Error('testa_v5: non trovo feedbackV5 o testataV5 in pagina-oggi.js');
  return PO.slice(i, PO.indexOf('\n}\n', j) + 3);
};

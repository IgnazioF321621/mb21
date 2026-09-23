// MB21 · Modulo Core in PDF (cantiere 41, 23/09/2026): un foglio A4 verticale su due colonne, da stampare o da mandare
// su WhatsApp, Telegram o email. Ignazio 23/09: «non stravolgere il modulo core, la sequenza resta»: la colonna di
// sinistra è la pagina 1 del modulo N21 (1 · 2 · 3), quella di destra la pagina 2 (4 · 5 · 6 · 7 e obiettivi).
// Riceve il modulo già calcolato da MB21Core.modulo (core.js) e il costruttore jsPDF; il bottone è in pagina-core.js.
// Prova: node tools/banco/prova_core_pdf.js (serve jspdf installato a parte).
(function (radice) {
  const BLU = [44, 74, 124], BLU_TINTA = [238, 243, 250], VERDE = [21, 128, 61], GRIGIO = [123, 132, 150], LINEA = [205, 211, 222], RIS = [236, 238, 242], NERO = [16, 21, 31];
  const A4 = { w: 210, h: 297 }, M = 10, GAP = 6, COL = (A4.w - 2 * M - GAP) / 2;
  const MASSIMO = { pm: 25, clienti: 40 };   // oltre, l'ultima riga dice «… e altri N»
  const num = v => v == null || v === '' ? '' : String(Math.round(Number(v) * 100) / 100).replace('.', ',');

  function crea(jsPDF, m, { mese, nome, oggi }) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const colore = (c, cosa) => cosa === 'f' ? doc.setFillColor(...c) : cosa === 'd' ? doc.setDrawColor(...c) : doc.setTextColor(...c);
    const font = (pt, peso, c) => { doc.setFont('helvetica', peso || 'normal'); doc.setFontSize(pt); colore(c || NERO); };
    // un testo che non esce dalla sua larghezza: si accorcia con «...»
    const taglia = (t, larg) => {
      t = String(t || '');
      if (doc.getTextWidth(t) <= larg) return t;
      while (t.length > 1 && doc.getTextWidth(t + '...') > larg) t = t.slice(0, -1);
      return t.trimEnd() + '...';
    };
    const scrivi = (t, x, y, larg, opz) => doc.text(larg ? taglia(t, larg) : String(t), x, y, opz || {});
    const spunta = (x, y, s, c) => {   // la ✓ disegnata dentro una casella di lato s
      colore(c || VERDE, 'd'); doc.setLineWidth(0.45);
      doc.line(x + s * 0.2, y + s * 0.55, x + s * 0.42, y + s * 0.78); doc.line(x + s * 0.42, y + s * 0.78, x + s * 0.82, y + s * 0.24);
      doc.setLineWidth(0.2);
    };
    const casella = (x, y, s, piena) => { colore(LINEA, 'd'); doc.setLineWidth(0.25); doc.rect(x, y, s, s); if (piena) spunta(x, y, s); };
    const riga = (x1, x2, y) => { colore(LINEA, 'd'); doc.setLineWidth(0.2); doc.line(x1, y, x2, y); };
    // SI / NO come nel modulo: la risposta data è piena (blu), l'altra vuota; null = nessuna delle due
    const siNo = (x, y, v) => {
      [['SI', true], ['NO', false]].forEach(([t, val], i) => {
        const bx = x + i * 8.5, piena = v === val;
        colore(piena ? BLU : LINEA, 'd'); colore(BLU, 'f'); doc.setLineWidth(0.25);
        doc.rect(bx, y - 3.4, 7.5, 4.6, piena ? 'FD' : 'S');
        font(7, 'bold', piena ? [255, 255, 255] : GRIGIO); doc.text(t, bx + 3.75, y - 0.2, { align: 'center' });
      });
    };
    const valore = (t, xDestra, y, larg) => {   // la casella grigia con il valore, allineata a destra
      colore(RIS, 'f'); doc.rect(xDestra - larg, y - 3.6, larg, 5, 'F');
      font(8.5, 'bold'); doc.text(taglia(t, larg - 2), xDestra - 1.2, y - 0.1, { align: 'right' });
    };
    // la testata di una sezione: numero grande e titolo in blu (verde con la ✓ quando l'abitudine è fatta); torna la y sotto
    const testa = (x, y, n, titolo, fatta) => {
      colore(fatta ? [228, 243, 232] : BLU_TINTA, 'f'); doc.rect(x, y, COL, 7, 'F');
      const c = fatta ? VERDE : BLU;
      let tx = x + 2;
      if (n) { font(15, 'bold', c); doc.text(String(n), x + 2, y + 5.6); tx = x + 8; }
      let pt = 8.2; font(pt, 'bold', c);
      const larg = COL - (tx - x) - (fatta ? 7 : 2);
      while (doc.getTextWidth(titolo.toUpperCase()) > larg && pt > 6.2) { pt -= 0.2; doc.setFontSize(pt); }
      doc.text(taglia(titolo.toUpperCase(), larg), tx, y + 4.7);
      if (fatta) spunta(x + COL - 6, y + 1.4, 4.2);
      return y + 7;
    };
    const cornice = (x, y0, y1, fatta) => { colore(fatta ? VERDE : BLU, 'd'); doc.setLineWidth(0.35); doc.roundedRect(x, y0, COL, y1 - y0, 1.5, 1.5); doc.setLineWidth(0.2); };
    const conto = (x, y, t) => { font(7.5, 'normal', GRIGIO); doc.text(t, x + 2, y); };

    // ── Testata del foglio: come il modulo N21 (titolo, nome, mese), in più quante abitudini sono fatte
    font(17, 'normal', BLU); doc.text('Le ', M, 16);
    let x = M + doc.getTextWidth('Le ');
    font(17, 'bold', [200, 30, 40]); doc.text('7 abitudini', x, 16); x += doc.getTextWidth('7 abitudini ');
    font(17, 'normal', BLU); doc.text('della persona ', x, 16); x += doc.getTextWidth('della persona ');
    font(17, 'bold', [200, 30, 40]); doc.text('Core', x, 16);
    font(9, 'normal', BLU); doc.text('modulo di auto-valutazione', M, 21.5);
    font(9, 'normal', GRIGIO); doc.text('nome', 118, 12.5); doc.text('mese di', 118, 19);
    font(10, 'bold'); scrivi(nome, 132, 12.5, A4.w - M - 132); scrivi(mese, 132, 19, A4.w - M - 132);
    riga(131, A4.w - M, 13.5); riga(131, A4.w - M, 20);
    font(8, 'bold', m.fatte === 7 ? VERDE : GRIGIO);
    doc.text(`${m.fatte}/7 abitudini nel mese${m.fatte === 7 ? ' · persona Core' : ''}`, A4.w - M, 25.5, { align: 'right' });
    colore(BLU, 'd'); doc.setLineWidth(0.5); doc.line(M, 28, A4.w - M, 28); doc.setLineWidth(0.2);

    // ══ Colonna di sinistra = pagina 1 del modulo ══
    let xs = M, y = 32, y0;
    // Righe: almeno quelle del modulo di carta (15 PM, 20 clienti su due colonne da 10, come l'originale); se ce ne sono di più
    // (Ignazio 23/09) le righe crescono e si stringono per stare nella pagina, fino a 25 PM e 40 clienti; oltre, l'ultima
    // riga dice «… e altri N» (i conti in cima restano completi).
    const pmTutti = m.s1.righe, cliTutti = m.s3.righe;
    const nP = Math.min(MASSIMO.pm, Math.max(15, pmTutti.length));
    const nC = Math.min(MASSIMO.clienti / 2, Math.max(10, Math.ceil(cliTutti.length / 2)));   // righe per colonna
    const RH = Math.min(4.9, 180 / (nP + nC));   // altezza di una riga: 4,9 mm di solito, fino a 4 con le tabelle piene
    const sb = Math.min(3, RH - 1.1), base = RH * 0.68;   // lato delle caselle e riga di scrittura dentro la riga
    const altri = (tutti, posti) => tutti.length > posti ? tutti.length - (posti - 1) : 0;   // quante non ci stanno (l'ultima riga le dice)

    // 1 · Piani Marketing
    y0 = y; y = testa(xs, y, 1, 'Presentare almeno 8 Piani Marketing al mese', m.s1.raggiunto) + 4.2;
    conto(xs, y, `${m.s1.quanti}/${m.s1.obiettivo} PM presentati · iscritti ${m.s1.iscritti} · clienti ${m.s1.clienti} · no ${m.s1.no}`);
    y += 2.5;
    // colonne: n. · data · 1a1 · nome · casa · n. cand. | risultati: iscritti · clienti · no
    const c1 = { n: xs + 2, data: xs + 7, uno: xs + 19, nome: xs + 26, casa: xs + 55, cand: xs + 62, isc: xs + 70.5, cli: xs + 78, no: xs + 85.5 };
    colore(RIS, 'f'); doc.rect(c1.isc - 1.5, y, COL - (c1.isc - 1.5 - xs) - 1.5, 4.5 + nP * RH + 1, 'F');
    font(6.3, 'bold', GRIGIO);
    [['Data', c1.data], ['1a1', c1.uno], ['Nome candidato', c1.nome], ['Casa', c1.casa], ['N.', c1.cand + 1.2], ['Iscr.', c1.isc - 0.8], ['Cli.', c1.cli - 0.3], ['NO', c1.no]]
      .forEach(([t, cx]) => doc.text(t, cx, y + 3.2));
    y += 4.5;
    const altriPm = altri(pmTutti, nP);
    for (let i = 0; i < nP; i++) {
      const yb = y + i * RH, yc = yb + (RH - sb) / 2;
      font(7, 'normal', GRIGIO); doc.text(String(i + 1), c1.n + 3, yb + base, { align: 'right' });
      if (altriPm && i === nP - 1) { font(7, 'italic', GRIGIO); doc.text(`... e altri ${altriPm} Piani Marketing (in tutto ${pmTutti.length})`, c1.data, yb + base); continue; }
      const r = pmTutti[i];
      font(7.3, 'normal', r ? NERO : LINEA); doc.text(r ? r.data : '__/__', c1.data, yb + base);
      casella(c1.uno, yc, sb, r && r.uno_a_uno);
      if (r) { font(7.3, 'bold'); scrivi(r.nome, c1.nome, yb + base, 27.5); }
      riga(c1.nome, c1.nome + 27.5, yb + base + 0.7);
      casella(c1.casa + 0.5, yc, sb, r && r.casa);
      colore(LINEA, 'd'); doc.rect(c1.cand, yc, 5, sb);
      if (r) { font(7, 'bold'); doc.text(String(r.candidati), c1.cand + 2.5, yc + sb - 0.5, { align: 'center' }); }
      casella(c1.isc, yc, sb, r && r.iscritti); casella(c1.cli, yc, sb, r && r.clienti); casella(c1.no, yc, sb, r && r.no);
    }
    y += nP * RH + 2.5;
    cornice(xs, y0, y, m.s1.raggiunto); y += 3.5;

    // 2 · Consumo personale
    const f2 = m.s2.vp != null && m.s2.vp > 0;
    y0 = y; y = testa(xs, y, 2, 'Consumare i prodotti Amway', f2) + 6.5;
    font(8.5); doc.text('Totale VP prodotti dal consumo personale', xs + 3, y);
    valore(num(m.s2.vp), xs + COL - 3, y, 20);
    y += 4.5; cornice(xs, y0, y, f2); y += 3.5;

    // 3 · Clienti: due colonne affiancate come nel modulo (1-10 · 11-20, o di più), in fondo il totale VP
    y0 = y; y = testa(xs, y, 3, 'Servire almeno 10 clienti al mese [100-300 VP]', m.s3.raggiunto) + 4.2;
    conto(xs, y, `${m.s3.quanti}/${m.s3.obiettivo} clienti · ${num(m.s3.vp) || 0} VP`);
    y += 2.5;
    const MEZZA = (COL - 2) / 2, altriCli = altri(cliTutti, 2 * nC);
    for (let k = 0; k < 2; k++) {
      const x0 = xs + 1 + k * MEZZA;
      font(6.3, 'bold', GRIGIO); doc.text('Nome cliente', x0 + 6.5, y + 3.2); doc.text('Valore Punti', x0 + MEZZA - 2, y + 3.2, { align: 'right' });
      for (let i = 0; i < nC; i++) {
        const j = k * nC + i, yb = y + 4.5 + i * RH;
        font(7, 'normal', GRIGIO); doc.text(String(j + 1), x0 + 5, yb + base, { align: 'right' });
        if (altriCli && j === 2 * nC - 1) { font(7, 'italic', GRIGIO); doc.text(`... e altri ${altriCli}`, x0 + 6.5, yb + base); continue; }
        const r = cliTutti[j];
        if (r) { font(7.3, 'bold'); scrivi(r.nome, x0 + 6.5, yb + base, MEZZA - 21); font(7.3); doc.text(num(r.vp), x0 + MEZZA - 3, yb + base, { align: 'right' }); }
        riga(x0 + 6.5, x0 + MEZZA - 14, yb + base + 0.7);
        colore(LINEA, 'd'); doc.rect(x0 + MEZZA - 13, yb + (RH - (RH - 1.1)) / 2, 11.5, RH - 1.1);
      }
    }
    y += 4.5 + nC * RH + 5;
    font(8.5); doc.text('Totale VP prodotti dalla vendita', xs + 3, y);
    valore(num(m.s3.vp), xs + COL - 3, y, 20);
    y += 3.5; cornice(xs, y0, y, m.s3.raggiunto);

    // ══ Colonna di destra = pagina 2 del modulo ══
    xs = M + COL + GAP; y = 32;

    // 4 · Tracce: un rigo per giorno, su due colonne (1-16 · 17-31)
    const f4 = m.s4.quanti >= m.giorni;
    y0 = y; y = testa(xs, y, 4, 'Ascoltare 1 traccia al giorno [CEP - catalogo BSM]', f4) + 4.2;
    conto(xs, y, `${m.s4.quanti}/${m.giorni} giorni`);
    y += 1;
    const meta = Math.ceil(m.s4.giorni.length / 2), RT = 4.4;
    m.s4.giorni.forEach((g, i) => {
      const cx = xs + (i < meta ? 0 : COL / 2), yb = y + (i % meta) * RT;
      font(7, g.fatto ? 'bold' : 'normal', g.fatto ? VERDE : GRIGIO); doc.text(String(g.giorno), cx + 7, yb + 3.3, { align: 'right' });
      if (g.titolo) { font(7); scrivi(g.titolo, cx + 9, yb + 3.2, COL / 2 - 11); }
      riga(cx + 9, cx + COL / 2 - 2, yb + 3.9);
    });
    y += meta * RT + 2.5; cornice(xs, y0, y, f4); y += 3.5;

    // 5 · Lettura: libro, un cerchietto per giorno (pieno = 10 pagine o più, a metà = meno), punti su cui concentrarsi
    const f5 = m.s5.quanti >= m.giorni;
    y0 = y; y = testa(xs, y, 5, 'Leggere 10 pagine al giorno [RB]', f5) + 5;
    font(8); doc.text('Libro in corso di lettura', xs + 3, y);
    let lx = xs + 3 + doc.getTextWidth('Libro in corso di lettura ') + 1;
    font(8, 'bold'); scrivi(m.s5.libro, lx, y - 0.3, xs + COL - 3 - lx); riga(lx, xs + COL - 3, y + 0.8);
    y += 4.5; conto(xs, y, `${m.s5.quanti}/${m.giorni} giorni · ${m.s5.pagine} pagine`);
    y += 2;
    const perRiga = 16, passo = (COL - 6) / perRiga, rc = 2.25;
    m.s5.giorni.forEach((g, i) => {
      const cx = xs + 3 + passo / 2 + (i % perRiga) * passo, cy = y + 2.6 + Math.floor(i / perRiga) * 5.4;
      doc.setLineWidth(0.25);
      if (g.fatto) { colore(VERDE, 'f'); colore(VERDE, 'd'); doc.circle(cx, cy, rc, 'FD'); }
      else if (g.qualcosa) { colore([228, 243, 232], 'f'); colore(BLU, 'd'); doc.circle(cx, cy, rc, 'FD'); }
      else { colore(BLU, 'd'); doc.circle(cx, cy, rc, 'S'); }
      font(5.6, 'bold', g.fatto ? [255, 255, 255] : BLU); doc.text(String(g.giorno), cx, cy + 0.8, { align: 'center' });
    });
    y += Math.ceil(m.s5.giorni.length / perRiga) * 5.4 + 3.5;
    font(8); doc.text('Punti sui quali mi concentrerò', xs + 3, y);
    const punti = m.s5.punti ? doc.splitTextToSize(m.s5.punti, COL - 6).slice(0, 2) : [];
    font(7.5, 'bold'); punti.forEach((t, i) => doc.text(t, xs + 3, y + 4.2 + i * 4));
    riga(xs + 3, xs + COL - 3, y + 5); riga(xs + 3, xs + COL - 3, y + 9);
    y += 11; cornice(xs, y0, y, f5); y += 3.5;

    // 6 · Incontri: una casella per settimana del mese (SI/NO), biglietti BBS e WES
    const f6 = m.abitudini[5];
    y0 = y; y = testa(xs, y, 6, 'Frequentare tutti gli incontri di Network 21', f6) + 5;
    font(8); doc.text('Partecipazione OPEN settimanale', xs + 3, y + 2.2);
    const ns = m.s6.settimane.length, largS = Math.min(9, (COL - 52) / ns);
    m.s6.settimane.forEach((w, i) => {
      const bx = xs + 50 + i * largS;
      colore(RIS, 'f'); doc.rect(bx, y - 2.6, largS - 1, 7.4, 'F');
      font(6.5, 'bold', GRIGIO); doc.text(String(i + 1), bx + (largS - 1) / 2, y, { align: 'center' });
      // SI = c'era e ci sei stato · «—» = nella tua città l'OPEN non c'era (non conta) · vuota = non ancora, o da scrivere a penna
      if (w.open) { font(6.3, 'bold', VERDE); doc.text('SI', bx + (largS - 1) / 2, y + 3.6, { align: 'center' }); }
      else if (w.senza) { font(7, 'bold', GRIGIO); doc.text('—', bx + (largS - 1) / 2, y + 3.8, { align: 'center' }); }
    });
    y += 10;
    font(8); doc.text('Acquisto biglietto BBS', xs + 3, y); siNo(xs + 34, y, m.s6.bbs);
    font(8); doc.text('WES', xs + 56, y); siNo(xs + 64, y, m.s6.wes);
    // sotto, in piccolo, il prossimo BBS e il prossimo WES dopo oggi (Ignazio 23/09)
    font(6.5, 'normal', GRIGIO);
    if (m.s6.prossimoBbs) doc.text(`prossimo: ${m.s6.prossimoBbs.testo}`, xs + 3, y + 3.6);
    if (m.s6.prossimoWes) doc.text(`prossimo: ${m.s6.prossimoWes.testo}`, xs + 56, y + 3.6);
    y += m.s6.prossimoBbs || m.s6.prossimoWes ? 6 : 3.5; cornice(xs, y0, y, f6); y += 3.5;

    // 7 · Lavorare di squadra
    const f7 = !!m.s7.counseling && m.s7.edificazione === true && m.s7.no_crossline === true;
    y0 = y; y = testa(xs, y, 7, 'Lavorare di squadra', f7) + 5.5;
    font(8); doc.text('Sessione di COUNSELING in data', xs + 3, y); valore(m.s7.counseling, xs + COL - 3, y, 17);
    y += 5.5; font(8); doc.text("Pratico il principio dell'EDIFICAZIONE", xs + 3, y); siNo(xs + COL - 19, y, m.s7.edificazione);
    y += 5.5; font(8); doc.text('Pratico il principio del NO-CROSSLINE', xs + 3, y); siNo(xs + COL - 19, y, m.s7.no_crossline);
    y += 3.5; cornice(xs, y0, y, f7); y += 3.5;

    // Obiettivi del mese, su due colonne
    const o = m.obiettivi;
    y0 = y; y = testa(xs, y, null, 'Obiettivi del mese') + 5;
    const obb = [['VP personali', o.vpp], ['VP gruppo', o.vpg], ['Sponsor. personale', o.sponsor_personali], ['Sponsor. gruppo', o.sponsor_gruppo], ['CEP', o.cep], ['BBS', o.bbs], ['WES', o.wes]];
    obb.forEach(([t, v], i) => {
      const cx = xs + (i < 4 ? 0 : COL / 2), yb = y + (i % 4) * 5.2;
      font(7.5); doc.text(t, cx + 3, yb); valore(num(v), cx + COL / 2 - 2.5, yb, 13);
    });
    y += 4 * 5.2 - 1.5; cornice(xs, y0, y, false); y += 3.5;

    // Note (quelle scritte nel modulo di MB21), se ci sono
    if (m.note) {
      font(7.5, 'bold', GRIGIO); doc.text('Note', xs + 1, y + 2);
      font(7.5); doc.splitTextToSize(m.note, COL - 2).slice(0, 3).forEach((t, i) => doc.text(t, xs + 1, y + 6 + i * 3.6));
    }

    // In fondo: chi l'ha compilato e quando
    font(6.5, 'normal', GRIGIO);
    doc.text(`Compilato da MB21 · ${oggi}`, A4.w - M, A4.h - 5, { align: 'right' });
    return doc;
  }

  // il nome del file: «Modulo Core - settembre 2026 - Ignazio Fiorito.pdf» (senza caratteri che Windows non accetta)
  const nomeFile = (mese, nome) => `Modulo Core - ${mese}${nome ? ' - ' + nome : ''}.pdf`.replace(/[\\/:*?"<>|]/g, '');

  const api = { crea, nomeFile };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21CorePdf = api;
})(this);

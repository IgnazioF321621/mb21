// MB21 · Modulo Core N21 (cantiere 41, 22/09/2026): «Le 7 abitudini della persona Core», modulo di auto-valutazione del mese.
// Funzioni pure: da quello che MB21 già sa (azioni, vendite, Check, tracce ascoltate, biglietti, obiettivi) e dai campi a mano
// (`dati` di core_mese) costruiscono il modulo del mese, sezione per sezione, con le caselle già riempite dove si può.
// Prove in tools/banco/prova_core.js. Il disegno è in pagina-core.js.
(function (radice) {
  const OBIETTIVI = { pm: 8, clienti: 10, pagine: 10, cd: 1 };
  const RIGHE = { pm: 15, clienti: 20 };   // le righe del modulo di carta: almeno queste; se ce ne sono di più si vedono tutte (Ignazio 23/09)
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const NON_AVVENUTI = ['No Show', 'Rimandato'];   // un PM con questo esito non è stato presentato (stessa regola di azioni_conti)

  const giorniDelMese = mese => new Date(Date.UTC(Number(mese.slice(0, 4)), Number(mese.slice(5, 7)), 0)).getUTCDate();
  const gg = giorno => `${Number(giorno.slice(8))}/${Number(giorno.slice(5, 7))}`;
  const nelMese = (giorno, mese) => !!giorno && giorno.slice(0, 7) === mese;
  // il giorno (Roma) di un istante ISO
  function giornoRoma(iso) {
    if (!iso) return null;
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso));
    const v = k => p.find(x => x.type === k).value;
    return `${v('year')}-${v('month')}-${v('day')}`;
  }
  // le settimane (lunedì → domenica) che toccano il mese, in ordine: [{ da, a }]
  function settimaneDelMese(mese) {
    const primo = mese + '-01', n = giorniDelMese(mese);
    const d0 = new Date(primo + 'T12:00:00Z');
    const dow = (d0.getUTCDay() + 6) % 7;
    const lun = new Date(d0); lun.setUTCDate(d0.getUTCDate() - dow);
    const out = [];
    for (let s = new Date(lun); ; s.setUTCDate(s.getUTCDate() + 7)) {
      const da = s.toISOString().slice(0, 10);
      const fine = new Date(s); fine.setUTCDate(s.getUTCDate() + 6);
      const a = fine.toISOString().slice(0, 10);
      out.push({ da, a });
      if (a >= `${mese}-${String(n).padStart(2, '0')}`) break;
    }
    return out;
  }

  // Il prossimo BBS o WES dopo oggi (Ignazio 23/09: «sotto BBS la data del prossimo, sempre quella successiva al giorno
  // di oggi»). eventi: righe di `bbs` o `wes` ({ data: primo del mese, giorno?: primo giorno del WES }). Con il giorno
  // conta il giorno (passato = si salta); senza giorno (il BBS, che cade in giorni diversi nelle città) vale il mese
  // intero: il BBS di settembre è «il prossimo» fino al 30 settembre. Torna { mese, giorno, testo: «ottobre 2026» } o null.
  function prossimoEvento(eventi, oggi) {
    const dopo = (eventi || []).filter(e => e && e.data && (e.giorno ? e.giorno >= oggi : e.data.slice(0, 7) >= oggi.slice(0, 7)))
      .sort((x, y) => ((x.giorno || x.data) < (y.giorno || y.data) ? -1 : 1));
    if (!dopo.length) return null;
    // si scrive solo mese e anno, anche per il WES che ha il giorno (Ignazio 23/09: «anche il WES facciamo mese/anno»)
    const e = dopo[0];
    return { mese: e.data.slice(0, 7), giorno: e.giorno || null, testo: `${MESI[Number(e.data.slice(5, 7)) - 1]} ${e.data.slice(0, 4)}` };
  }

  // Il modulo del mese. `mese` = 'AAAA-MM'.
  // azioni: righe di azioni del mese (tipo, modalita, esito, completata, inizio, contatti{nome}) · vendite: (contatto_id, data, vp, contatti{nome})
  // check: righe di check_giorno del mese · tracce: [{ giorno, titolo }] del percorso ascoltate · biglietti: [{ tipo, evento, contatto }] della propria scheda
  // obiettivi: la riga di obiettivi_mese (o null) · dati: i campi a mano (core_mese.dati)
  // date: { bbs, wes } le righe delle tabelle bbs e wes, oggi: 'AAAA-MM-GG' (per il prossimo BBS e WES)
  function modulo({ mese, azioni = [], vendite = [], check = [], tracce = [], biglietti = [], obiettivi = null, dati = {}, date = {}, oggi = null }) {
    const d = dati || {};
    const n = giorniDelMese(mese);
    const perGiorno = new Map(check.map(c => [c.data, c]));

    // 1 · Presentare almeno 8 PM al mese
    const pm = azioni
      .filter(a => a.tipo_azione === 'Piano Marketing' && a.completata && !NON_AVVENUTI.includes(a.esito) && nelMese(giornoRoma(a.inizio), mese))
      .sort((x, y) => (x.inizio < y.inizio ? -1 : 1))
      .map(a => {
        const mano = (d.pm || {})[a.id] || {};
        return { id: a.id, data: gg(giornoRoma(a.inizio)), uno_a_uno: a.modalita === 'PM 1a1', casa: a.modalita === 'PM Casa/Pull',
          nome: (a.contatti && a.contatti.nome) || '—', candidati: mano.candidati != null ? Number(mano.candidati) : 1,
          iscritti: a.esito === 'Iscrizione', clienti: a.esito === 'Prodotti', no: a.esito === 'No BuonFine' };
      });
    const s1 = { righe: pm, quanti: pm.length, obiettivo: OBIETTIVI.pm, raggiunto: pm.length >= OBIETTIVI.pm,
      iscritti: pm.filter(r => r.iscritti).length, clienti: pm.filter(r => r.clienti).length, no: pm.filter(r => r.no).length };

    // 3 · Servire almeno 10 clienti al mese: un cliente per riga, con i VP del mese
    // una vendita conta nel mese in cui CONTANO i suoi VP (`consegna` se c'è, se no `data`: la promo pagata oggi con l'ordine
    // Amway a marzo 2027 sta nel modulo di marzo 2027; Ignazio 22/09: «Elisa non entra nei clienti di settembre»)
    const perCliente = new Map();
    for (const v of vendite.filter(v => nelMese(v.consegna || v.data, mese))) {
      const k = v.contatto_id, r = perCliente.get(k) || { id: k, nome: (v.contatti && v.contatti.nome) || '—', vp: 0 };
      r.vp = Math.round((r.vp + (Number(v.vp) || 0)) * 100) / 100;
      perCliente.set(k, r);
    }
    const clienti = [...perCliente.values()].sort((x, y) => y.vp - x.vp);
    const s3 = { righe: clienti, quanti: clienti.length, obiettivo: OBIETTIVI.clienti, raggiunto: clienti.length >= OBIETTIVI.clienti,
      vp: Math.round(clienti.reduce((t, r) => t + r.vp, 0) * 100) / 100 };   // arrotondato: la somma dei decimali dava «29,560000000000002» (Isabella, 22/09)

    // 2 · Consumare i prodotti Amway (Ignazio 22/09): il consumo personale = i VP personali Amway del mese MENO i VP venduti
    // ai clienti (chi compra solo per vendere non consuma). Senza dati Amway vale quello scritto a mano.
    const vpAmway = obiettivi && obiettivi.vpp_amway != null ? Number(obiettivi.vpp_amway) : null;
    const s2 = { vp: vpAmway != null ? Math.max(0, Math.round((vpAmway - s3.vp) * 100) / 100) : d.vp_consumo != null ? Number(d.vp_consumo) : null,
      auto: vpAmway != null, vpAmway, vpClienti: s3.vp };

    // 4 · Ascoltare 1 CD al giorno: un rigo per giorno. Le tracce del percorso segnate «ascoltata» SI SOMMANO a quelle scritte
    // nel Check (Ignazio 22/09: «due ascoltate e una condivisa diventano tre»); niente titoli a mano (ripetitivo): si scrive
    // quante sono, e i titoli del percorso, che arrivano da soli.
    const s4 = { giorni: Array.from({ length: n }, (_, i) => {
      const giorno = `${mese}-${String(i + 1).padStart(2, '0')}`;
      const c = perGiorno.get(giorno);
      const percorso = tracce.filter(t => t.giorno === giorno).length;
      const quante = (c ? Number(c.tracce) || 0 : 0) + percorso;
      const testo = quante ? `${quante} ${quante === 1 ? 'traccia' : 'tracce'}${percorso ? ` (${percorso} dal percorso)` : ''}` : '';   // senza titoli (Ignazio 22/09)
      return { giorno: i + 1, quante, titolo: testo, fatto: quante >= OBIETTIVI.cd };
    }) };
    s4.quanti = s4.giorni.filter(g => g.fatto).length;

    // 5 · Leggere 10 pagine al giorno: libro in corso, un cerchietto per giorno, punti su cui concentrarsi (a mano)
    const conLibro = check.filter(c => c.libro && nelMese(c.data, mese)).sort((x, y) => (x.data < y.data ? 1 : -1));
    const s5 = { libro: conLibro.length ? conLibro[0].libro : (d.libro || ''), auto: conLibro.length > 0,
      giorni: Array.from({ length: n }, (_, i) => {
        const c = perGiorno.get(`${mese}-${String(i + 1).padStart(2, '0')}`);
        const pagine = c ? Number(c.pagine) || 0 : 0;
        return { giorno: i + 1, pagine, fatto: pagine >= OBIETTIVI.pagine, qualcosa: pagine > 0 };
      }), punti: d.punti || '' };
    s5.quanti = s5.giorni.filter(g => g.fatto).length;
    s5.pagine = s5.giorni.reduce((t, g) => t + g.pagine, 0);

    // 6 · Frequentare tutti gli incontri N21: OPEN per settimana (dal Check), biglietti BBS e WES (dalla propria scheda).
    // Gli OPEN cambiano da città a città (Ignazio 23/09): niente calendario; una settimana in cui nella propria città l'OPEN
    // non c'era si segna «non c'era» nel modulo (`dati.senza_open`: i lunedì di quelle settimane) e non conta. Se il Check
    // dice che all'OPEN ci sei stato, vale quello.
    const senzaOpen = new Set(d.senza_open || []);
    const s6 = { settimane: settimaneDelMese(mese).map(w => {
        const open = check.some(c => c.open && c.data >= w.da && c.data <= w.a);
        return { ...w, open, senza: !open && senzaOpen.has(w.da) };
      }),
      bbs: biglietti.some(b => b.tipo === 'BBS' && b.contatto), wes: biglietti.some(b => b.tipo === 'WES' && b.contatto),
      prossimoBbs: oggi ? prossimoEvento(date.bbs, oggi) : null, prossimoWes: oggi ? prossimoEvento(date.wes, oggi) : null };
    s6.open = s6.settimane.filter(w => w.open).length;
    s6.valide = s6.settimane.filter(w => !w.senza).length;   // le settimane in cui l'OPEN c'era (o non si sa ancora)

    // 7 · Lavorare di squadra: counseling (dal Check), edificazione e no-crossline (a mano)
    const cons = check.filter(c => c.counseling && nelMese(c.data, mese)).map(c => c.data).sort();
    // edificazione e no-crossline: SI se almeno un Check del mese li ha spuntati (Ignazio 22/09: «gli altri punti li dobbiamo mettere»); se no, la risposta data a mano nel modulo
    const daCheck = k => check.some(c => c[k] && nelMese(c.data, mese));
    const s7 = { counseling: cons.length ? gg(cons[0]) : (d.counseling || ''), auto: cons.length > 0,
      edificazione: daCheck('edificazione') ? true : d.edificazione === true ? true : d.edificazione === false ? false : null,
      no_crossline: daCheck('no_crossline') ? true : d.no_crossline === true ? true : d.no_crossline === false ? false : null,
      autoEdificazione: daCheck('edificazione'), autoNoCrossline: daCheck('no_crossline') };

    // Obiettivi del mese (dal Check: obiettivi_mese)
    const o = obiettivi || {};
    const ob = { vpp: o.vpp, vpg: o.vpg, sponsor_personali: o.sponsor_personali, sponsor_gruppo: o.sponsor_gruppo, cep: o.cep, bbs: o.bbs, wes: o.wes };

    // 7 è fatta solo con tutte e tre (Ignazio 22/09): counseling, edificazione e no-crossline
    const abitudini = [s1.raggiunto, s2.vp != null && s2.vp > 0, s3.raggiunto, s4.quanti >= n, s5.quanti >= n, s6.open >= s6.valide && s6.bbs && s6.wes,
      !!s7.counseling && s7.edificazione === true && s7.no_crossline === true];
    return { mese, giorni: n, s1, s2, s3, s4, s5, s6, s7, obiettivi: ob, note: d.note || '', fatte: abitudini.filter(Boolean).length, abitudini };
  }

  const api = { OBIETTIVI, RIGHE, NON_AVVENUTI, giorniDelMese, giornoRoma, settimaneDelMese, prossimoEvento, modulo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Core = api;
})(this);

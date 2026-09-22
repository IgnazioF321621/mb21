// MB21 · pagina «Modulo Core» (cantiere 41, 22/09/2026): il foglio del mese = «Le 7 abitudini della persona Core» di N21,
// ricreato con lo stesso modello e già compilato da MB21 (azioni, vendite, Check, tracce, biglietti, obiettivi); quello che
// l'app non sa lo compila l'incaricato qui dentro (core_mese.dati) e si salva da solo. Si apre dal ☰ dell'Agenda → «Mese».
// La regola è in core.js (MB21Core.modulo). Solo definizioni.

const CM = { mese: null, dati: {}, riga: null, salvo: null };

async function apriCoreMese(mese) {
  CM.mese = mese || CM.mese || MB21Coda.oggiRoma().slice(0, 7);
  const titolo = () => `${MB21Rubrica.MESI[Number(CM.mese.slice(5, 7)) - 1]} ${CM.mese.slice(0, 4)}`;
  const testa = () => `<button class="indietro" id="cm-indietro">‹ Agenda</button>
    <div class="cm-testa"><button class="freccia" id="cm-prima" aria-label="Mese prima">‹</button><h1>${ic('crescita')} Modulo Core</h1><button class="freccia" id="cm-dopo" aria-label="Mese dopo">›</button></div>
    <div class="cm-mese">${esc(titolo())}${aNome() ? esc(aNome()) : ''}</div>`;
  app.innerHTML = `${testa()}<div class="vuoto">Compilo il modulo…</div>`;
  const collegaTesta = () => {
    document.getElementById('cm-indietro').onclick = () => { ST.tab = 'agenda'; mostraTab(); };
    document.getElementById('cm-prima').onclick = () => apriCoreMese(MB21Agenda.spostaGiorno(CM.mese + '-01', -1).slice(0, 7));
    document.getElementById('cm-dopo').onclick = () => apriCoreMese(MB21Agenda.spostaGiorno(CM.mese + '-01', 32).slice(0, 7));
  };
  collegaTesta();
  const A = MB21Agenda, C = MB21Core;
  const mese0 = CM.mese + '-01', mese1 = A.spostaGiorno(mese0, 32).slice(0, 8) + '01';
  const da = A.isoDaRoma(mese0, '00:00'), a = A.isoDaRoma(mese1, '00:00');
  const io = visto();
  const [az, ve, ck, ob, cm, scheda] = await Promise.all([
    dbq('PM del mese', supa.from('azioni').select('id, tipo_azione, modalita, esito, completata, inizio, contatti(nome)').eq('user_id', io.id).eq('tipo_azione', 'Piano Marketing').gte('inizio', da).lt('inizio', a)),
    dbq('vendite del mese', supa.from('vendite').select('contatto_id, data, vp, contatti(nome)').eq('user_id', io.id).gte('data', mese0).lt('data', mese1)),
    dbq('check del mese', supa.from('check_giorno').select('data, tracce, pagine, libro, open, counseling').eq('user_id', io.id).gte('data', mese0).lt('data', mese1)),
    dbq('obiettivi del mese', supa.from('obiettivi_mese').select('*').eq('user_id', io.id).eq('mese', mese0).maybeSingle()),
    dbq('modulo core', supa.from('core_mese').select('*').eq('user_id', io.id).eq('mese', mese0).maybeSingle()),
    io.partner_id ? dbq('la mia scheda', supa.from('contatti').select('id').eq('codice_amway', io.partner_id).is('eliminato_il', null).limit(1)) : { data: [] },
  ]);
  if (az.error || ve.error || ck.error) { app.innerHTML = `${testa()}<div class="avviso">Non riesco a compilare il modulo: riprova.</div>${versione()}`; collegaTesta(); return; }
  // le tracce del percorso ascoltate nel mese e i biglietti: sulla propria scheda (il contatto con il proprio codice Amway)
  const miaScheda = scheda.data && scheda.data[0] ? scheda.data[0].id : null;
  let tracce = [], biglietti = [];
  if (miaScheda) {
    const [tr, bi] = await Promise.all([
      dbq('tracce ascoltate', supa.from('condivisioni').select('ascoltata_il, materiali(titolo)').eq('contatto_id', miaScheda).eq('ascoltata', true).gte('ascoltata_il', mese0).lt('ascoltata_il', mese1)),
      dbq('biglietti', supa.from('biglietti').select('tipo, evento, contatto').eq('contatto_id', miaScheda).gte('evento', mese0)),
    ]);
    tracce = (tr.data || []).map(r => ({ giorno: r.ascoltata_il, titolo: r.materiali && r.materiali.titolo })).filter(t => t.titolo);
    biglietti = bi.data || [];
  }
  CM.riga = cm.data || null;
  CM.dati = (cm.data && cm.data.dati) || {};
  const disegna = () => {
    const m = C.modulo({ mese: CM.mese, azioni: az.data || [], vendite: ve.data || [], check: ck.data || [], tracce, biglietti, obiettivi: ob.data || null, dati: CM.dati });
    app.innerHTML = testa() + moduloCoreHtml(m) + versione();
    collegaTesta();
    collegaModuloCore(m, disegna);
  };
  disegna();
  window.scrollTo(0, 0);
}

// Il modulo disegnato come il foglio N21: 7 riquadri numerati con il titolo blu, le tabelle e le caselle; quelle a mano si scrivono qui.
function moduloCoreHtml(m) {
  const C = MB21Core;
  const si = v => v ? ic('fatto', 14) : '';
  const sn = (k, v) => `<span class="cm-sino" data-sino="${k}"><button class="${v === true ? 'si' : ''}">SI</button><button class="${v === false ? 'si' : ''}">NO</button></span>`;
  const vuote = (n, righe) => Array.from({ length: Math.max(0, n - righe) }, () => '');
  const num = v => v == null || v === '' ? '' : String(Number(v)).replace('.', ',');
  const vuotoPer = (n, k) => `<div class="cm-vuoto">Nessun ${k} in questo mese: qui arrivano da soli ${n}.</div>`;
  const sez = (n, titolo, dentro, stato) => `<section class="cm-sez${stato ? ' fatta' : ''}"><div class="cm-sez-testa"><b>${n}</b><span>${esc(titolo)}</span>${stato ? ic('fatto') : ''}</div>${dentro}</section>`;

  const s1 = sez(1, 'Presentare almeno 8 Piani Marketing al mese', `
    <div class="cm-conto"><b>${m.s1.quanti}</b>/${m.s1.obiettivo} PM presentati · iscritti <b>${m.s1.iscritti}</b> · clienti <b>${m.s1.clienti}</b> · no <b>${m.s1.no}</b></div>
    ${m.s1.righe.length ? `<table class="cm-tab"><thead><tr><th>Data</th><th>1a1</th><th>Nome candidato</th><th>Casa</th><th>N.</th><th class="ris">Iscr.</th><th class="ris">Cli.</th><th class="ris">NO</th></tr></thead><tbody>
      ${m.s1.righe.map((r, i) => `<tr><td>${esc(r.data)}</td><td class="c">${si(r.uno_a_uno)}</td><td class="nome">${esc(r.nome)}</td><td class="c">${si(r.casa)}</td>
        <td class="c"><input class="cm-num" data-pm="${esc(r.id)}" inputmode="numeric" value="${r.candidati}" aria-label="Numero candidati"></td>
        <td class="c ris">${si(r.iscritti)}</td><td class="c ris">${si(r.clienti)}</td><td class="c ris">${si(r.no)}</td></tr>`).join('')}
      ${vuote(Math.min(C.RIGHE.pm, Math.max(m.s1.obiettivo, m.s1.righe.length + 1)), m.s1.righe.length).map(() => `<tr class="vuota"><td>__/__</td><td></td><td></td><td></td><td></td><td class="ris"></td><td class="ris"></td><td class="ris"></td></tr>`).join('')}
    </tbody></table>` : vuotoPer('dai Piani Marketing avvenuti in Agenda', 'Piano Marketing')}`, m.s1.raggiunto);

  const s2 = sez(2, 'Consumare i prodotti Amway', `
    <div class="cm-riga"><span>Totale VP prodotti dal consumo personale</span>${m.s2.auto ? `<b class="cm-auto">${num(m.s2.vp)}</b>` : `<input class="cm-num larga" id="cm-vp-consumo" inputmode="decimal" value="${num(m.s2.vp)}" placeholder="VP">`}</div>
    <div class="vn-aiuto">${m.s2.auto ? `VP personali Amway ${num(m.s2.vpAmway)} − VP venduti ai clienti ${num(m.s2.vpClienti)}: quello che resta è consumo.` : 'Senza dati Amway del mese si scrive a mano: VP personali meno VP venduti ai clienti.'}</div>`, m.s2.vp != null && m.s2.vp > 0);

  const s3 = sez(3, 'Servire almeno 10 clienti al mese [100-300 VP]', `
    <div class="cm-conto"><b>${m.s3.quanti}</b>/${m.s3.obiettivo} clienti · <b>${num(m.s3.vp)}</b> VP</div>
    ${m.s3.righe.length ? `<table class="cm-tab"><thead><tr><th></th><th>Nome cliente</th><th class="r">Valore Punti</th></tr></thead><tbody>
      ${m.s3.righe.map((r, i) => `<tr><td>${i + 1}</td><td class="nome">${esc(r.nome)}</td><td class="r">${num(r.vp)}</td></tr>`).join('')}
      ${vuote(Math.max(m.s3.obiettivo, m.s3.righe.length), m.s3.righe.length).map((_, i) => `<tr class="vuota"><td>${m.s3.righe.length + i + 1}</td><td></td><td></td></tr>`).join('')}
    </tbody><tfoot><tr><td></td><td>Totale VP prodotti dalla vendita</td><td class="r"><b>${num(m.s3.vp)}</b></td></tr></tfoot></table>` : vuotoPer('dalle vendite registrate nella scheda del cliente', 'cliente')}`, m.s3.raggiunto);

  const s4 = sez(4, 'Ascoltare 1 traccia al giorno [CEP - catalogo BSM]', `
    <div class="cm-conto"><b>${m.s4.quanti}</b>/${m.giorni} giorni</div>
    <div class="cm-giorni">${m.s4.giorni.map(g => `<div class="cm-g${g.fatto ? ' fatto' : ''}"><b>${g.giorno}</b><span>${esc(g.titolo)}</span></div>`).join('')}</div>
    <div class="vn-aiuto">Le tracce scritte nel Check del Giorno più quelle del percorso segnate «ascoltata»: con almeno una, il giorno è fatto.</div>`, m.s4.quanti >= m.giorni);

  const s5 = sez(5, 'Leggere 10 pagine al giorno [RB]', `
    <div class="cm-riga"><span>Libro in corso di lettura</span>${m.s5.auto ? `<b class="cm-auto">${esc(m.s5.libro)}</b>` : `<input class="cm-testo" id="cm-libro" value="${esc(m.s5.libro)}" placeholder="Titolo" maxlength="120">`}</div>
    <div class="cm-conto"><b>${m.s5.quanti}</b>/${m.giorni} giorni · <b>${m.s5.pagine}</b> pagine</div>
    <div class="cm-cerchi">${m.s5.giorni.map(g => `<i class="${g.fatto ? 'pieno' : g.qualcosa ? 'mezzo' : ''}" title="${g.pagine} pagine">${g.giorno}</i>`).join('')}</div>
    <div class="campo"><label>Punti sui quali mi concentrerò</label><textarea id="cm-punti" rows="2" maxlength="300">${esc(m.s5.punti)}</textarea></div>`, m.s5.quanti >= m.giorni);

  const s6 = sez(6, 'Frequentare tutti gli incontri di Network 21', `
    <div class="cm-riga"><span>Partecipazione OPEN settimanale</span><span class="cm-sett">${m.s6.settimane.map((w, i) => `<b class="${w.open ? 'si' : ''}" title="${w.da} – ${w.a}">${i + 1}${w.open ? ' ' + ic('fatto', 12) : ''}</b>`).join('')}</span></div>
    <div class="cm-riga"><span>Acquisto biglietto BBS</span><b class="cm-auto">${m.s6.bbs ? 'SI' : 'NO'}</b></div>
    <div class="cm-riga"><span>Acquisto biglietto WES</span><b class="cm-auto">${m.s6.wes ? 'SI' : 'NO'}</b></div>
    <div class="vn-aiuto">L'OPEN dal Check del Giorno («oggi sono stato all'OPEN»), i biglietti dalla tua scheda.</div>`, m.s6.open >= m.s6.settimane.length && m.s6.bbs && m.s6.wes);

  const s7 = sez(7, 'Lavorare di squadra', `
    <div class="cm-riga"><span>Sessione di COUNSELING in data</span>${m.s7.auto ? `<b class="cm-auto">${esc(m.s7.counseling)}</b>` : `<input class="cm-num larga" id="cm-counseling" value="${esc(m.s7.counseling)}" placeholder="gg/mm" maxlength="10">`}</div>
    <div class="cm-riga"><span>Pratico il principio dell'EDIFICAZIONE</span>${m.s7.autoEdificazione ? '<b class="cm-auto">SI</b><small>dal Check</small>' : sn('edificazione', m.s7.edificazione)}</div>
    <div class="cm-riga"><span>Pratico il principio del NO-CROSSLINE</span>${m.s7.autoNoCrossline ? '<b class="cm-auto">SI</b><small>dal Check</small>' : sn('no_crossline', m.s7.no_crossline)}</div>`, !!m.s7.counseling);

  const o = m.obiettivi;
  const ob = `<section class="cm-sez ob"><div class="cm-sez-testa"><span>Obiettivi del mese</span></div>
    ${[['VP personali', o.vpp], ['VP gruppo', o.vpg], ['Sponsorizzazione personale', o.sponsor_personali], ['Sponsorizzazione gruppo', o.sponsor_gruppo], ['CEP', o.cep], ['BBS', o.bbs], ['WES', o.wes]]
      .map(([t, v]) => `<div class="cm-riga"><span>${t}</span><b class="cm-auto">${v == null ? '—' : num(v)}</b></div>`).join('')}
    <div class="vn-aiuto">Dagli obiettivi del mese scritti nel Check.</div></section>`;

  return `<div class="cm-riass">${m.fatte}/7 abitudini nel mese${m.fatte === 7 ? ' · persona Core ✓' : ''}</div>
    ${s1}${s2}${s3}${s4}${s5}${s6}${s7}${ob}
    <div class="campo"><label>Note</label><textarea id="cm-note" rows="2" maxlength="300">${esc(m.note)}</textarea></div>
    <div class="vn-aiuto">Le caselle con il bordo si compilano a mano e si salvano da sole. Scarica e stampa (PDF): presto.</div>`;
}

// I campi a mano si salvano da soli in core_mese.dati (una riga per mese); dopo ogni salvataggio il modulo si ricalcola.
function collegaModuloCore(m, disegna) {
  const salva = async cambia => {
    const dati = JSON.parse(JSON.stringify(CM.dati));
    cambia(dati);
    const { data, error } = await dbq('modulo core', supa.from('core_mese').upsert({ user_id: visto().id, mese: CM.mese + '-01', dati, aggiornato_il: new Date().toISOString() }, { onConflict: 'user_id,mese' }).select().single());
    if (error) return mostraToast('Non salvato: riprova.');
    CM.riga = data; CM.dati = data.dati || dati;
    disegna();
  };
  const numero = s => { const v = String(s).trim().replace(',', '.'); return v === '' ? null : Number(v); };
  app.querySelectorAll('[data-pm]').forEach(i => { i.onchange = () => salva(d => { d.pm = d.pm || {}; d.pm[i.dataset.pm] = { candidati: Math.max(0, Math.round(numero(i.value) || 0)) }; }); });
  const su = (id, fn) => { const el = document.getElementById(id); if (el) el.onchange = () => salva(d => fn(d, el.value)); };
  su('cm-vp-consumo', (d, v) => { d.vp_consumo = numero(v); });
  su('cm-libro', (d, v) => { d.libro = v.trim().slice(0, 120); });
  su('cm-punti', (d, v) => { d.punti = v.trim().slice(0, 300); });
  su('cm-counseling', (d, v) => { d.counseling = v.trim().slice(0, 10); });
  su('cm-note', (d, v) => { d.note = v.trim().slice(0, 300); });
  app.querySelectorAll('[data-sino]').forEach(s => {
    const [bSi, bNo] = s.querySelectorAll('button');
    bSi.onclick = () => salva(d => { d[s.dataset.sino] = CM.dati[s.dataset.sino] === true ? null : true; });
    bNo.onclick = () => salva(d => { d[s.dataset.sino] = CM.dati[s.dataset.sino] === false ? null : false; });
  });
}

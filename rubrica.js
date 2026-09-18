// MB21 · Importa dalla rubrica del telefono (cantiere 30, lavoro A; decisioni di Ignazio 18/09).
// Funzioni pure, nessun accesso alla rete: leggono un file vCard (.vcf) esportato da iPhone (vCard 3.0) o Android (vCard 2.1,
// lettere accentate in «quoted-printable») e preparano il riepilogo prima di salvare. Prove in tools/banco/prova_rubrica.js.
// Si tiene solo: nome, numeri, compleanno. Le foto (quasi tutto il peso del file) si buttano subito.
(function (radice) {
  const L = typeof require !== 'undefined' ? require('./lista.js') : radice.MB21Lista;
  const soloCifre = s => String(s || '').replace(/\D/g, '');

  // ── 1. Righe logiche: le righe lunghe sono spezzate in due modi diversi ──
  // vCard 3.0: la riga dopo inizia con uno spazio. vCard 2.1 quoted-printable: la riga finisce con «=».
  function righeLogiche(testo) {
    const righe = String(testo || '').replace(/\r\n?/g, '\n').split('\n');
    const fuori = [];
    for (let i = 0; i < righe.length; i++) {
      let r = righe[i];
      if (/^[ \t]/.test(r) && fuori.length) { fuori[fuori.length - 1] += r.slice(1); continue; }
      if (/^[^:]*QUOTED-PRINTABLE/i.test(r)) while (r.endsWith('=') && i + 1 < righe.length) r = r.slice(0, -1) + righe[++i];
      fuori.push(r);
    }
    return fuori;
  }

  // «=C3=B2» → «ò»
  function daQuotedPrintable(s) {
    const byte = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) { byte.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; }
      else byte.push(...new TextEncoder().encode(s[i]));
    }
    return new TextDecoder('utf-8').decode(new Uint8Array(byte));
  }
  const senzaBarre = s => String(s || '').replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1');
  const pulisci = s => senzaBarre(s).replace(/\s+/g, ' ').trim();
  // divide su «;» ma non su «\;» (senza «lookbehind»: i Safari più vecchi non lo capiscono)
  const pezzi = v => String(v || '').replace(/\\;/g, '\u0000').split(';').map(x => x.replace(/\u0000/g, '\\;'));

  // Compleanno: «1985-04-12» · «19850412» · «--04-12» (senza anno) · «1604-04-12» (iPhone: 1604 = anno non scritto)
  function leggiCompleanno(v) {
    const m = String(v || '').trim().match(/^(?:(\d{4})|--)-?(\d{2})-?(\d{2})/);
    if (!m) return null;
    const anno = m[1] ? Number(m[1]) : null, mese = Number(m[2]), giorno = Number(m[3]);
    if (mese < 1 || mese > 12 || giorno < 1 || giorno > 31) return null;
    return { giorno, mese, anno: anno && anno > 1900 ? anno : null };
  }

  // Numero come lo scrive MB21 («+39…»), stessa regola del modulo Nuovo Contatto; troppo corto (119, 187…) = non è un numero di persona
  function numeroMb21(scritto) {
    const n = L.componiTelefono('+39', scritto);
    return n && soloCifre(n).length >= 8 ? n : null;
  }

  // ── 2. Dal testo del file alle schede ──
  // → [{ nome, telefono, altriNumeri: [], compleanno, ditta: bool }]
  function leggiVcard(testo) {
    const schede = [];
    let s = null;
    for (const riga of righeLogiche(testo)) {
      if (/^BEGIN:VCARD/i.test(riga)) { s = { fn: '', n: '', org: '', tel: [], compleanno: null, societa: false }; continue; }
      if (/^END:VCARD/i.test(riga)) { if (s) schede.push(chiudiScheda(s)); s = null; continue; }
      if (!s) continue;
      const due = riga.indexOf(':');
      if (due < 0) continue;
      const testa = riga.slice(0, due).replace(/^item\d+\./i, '').toUpperCase();
      const campo = testa.split(';')[0];
      if (!['FN', 'N', 'ORG', 'TEL', 'BDAY', 'X-ABSHOWAS'].includes(campo)) continue;   // foto, indirizzi, note… non servono
      let valore = riga.slice(due + 1);
      if (testa.includes('QUOTED-PRINTABLE')) valore = daQuotedPrintable(valore);
      if (campo === 'FN') s.fn = pulisci(valore);
      else if (campo === 'N') { const p = pezzi(valore).map(pulisci); s.n = [p[3], p[1], p[2], p[0]].filter(Boolean).join(' '); s.haN = !!(p[0] || p[1]); }
      else if (campo === 'ORG') s.org = pulisci(pezzi(valore)[0]);
      else if (campo === 'BDAY') s.compleanno = leggiCompleanno(valore);
      else if (campo === 'X-ABSHOWAS') s.societa = /COMPANY/i.test(valore);
      else if (campo === 'TEL') s.tel.push({ numero: numeroMb21(valore), cell: /CELL|MOBILE|IPHONE/.test(testa), pref: /PREF/.test(testa) });
    }
    return schede;
  }

  // Un numero solo per scheda (deciso con Ignazio): il cellulare (prima il preferito), altrimenti il primo; gli altri finiscono nelle note
  function chiudiScheda(s) {
    const numeri = [];
    s.tel.forEach(t => { if (t.numero && !numeri.some(x => x.numero === t.numero)) numeri.push(t); });
    const eCell = t => /^\+393/.test(t.numero) || (t.cell && !/^\+390/.test(t.numero));
    const scelto = numeri.find(t => eCell(t) && t.pref) || numeri.find(eCell) || numeri.find(t => t.pref) || numeri[0] || null;
    return {
      nome: s.fn || s.n || s.org || '',
      telefono: scelto ? scelto.numero : null,
      altriNumeri: numeri.filter(t => t !== scelto).map(t => t.numero),
      compleanno: s.compleanno,
      ditta: s.societa || (!s.haN && !!s.org),
    };
  }

  // ── 3. Doppioni dentro il file (Android fonde la stessa persona presa da più account) ──
  function unisciDoppioni(schede) {
    const perNumero = new Map(), perNome = new Map(), fuori = [];
    for (const s of schede) {
      const numeri = [s.telefono, ...s.altriNumeri].filter(Boolean);
      const gia = numeri.map(n => perNumero.get(n)).find(Boolean) || (!numeri.length && s.nome ? perNome.get(L.piega(s.nome)) : null);
      if (gia) {
        numeri.forEach(n => { if (n !== gia.telefono && !gia.altriNumeri.includes(n)) gia.altriNumeri.push(n); perNumero.set(n, gia); });
        if (!gia.telefono && s.telefono) { gia.telefono = s.telefono; gia.altriNumeri = gia.altriNumeri.filter(n => n !== s.telefono); }
        if (!gia.compleanno) gia.compleanno = s.compleanno;
        if (!gia.nome) gia.nome = s.nome;
        continue;
      }
      const nuova = { ...s, altriNumeri: [...s.altriNumeri] };
      fuori.push(nuova);
      numeri.forEach(n => perNumero.set(n, nuova));
      if (!numeri.length && s.nome) perNome.set(L.piega(s.nome), nuova);
    }
    return fuori;
  }

  // ── 4. Cosa evidenziare (l'app evidenzia, decide l'utente) ──
  const PAROLE_DITTA = /\b(s\.?r\.?l\.?s?|s\.?p\.?a|s\.?n\.?c|s\.?a\.?s|pizzeria|ristorante|trattoria|bar|pub|hotel|b&b|studio|dott|dr|dottor|dottoressa|avv|avvocato|geom|ing|notaio|commercialista|farmacia|banca|posta|poste|officina|carrozzeria|gommista|taxi|assistenza|servizio clienti|clienti|comune|scuola|asilo|palestra|centro|negozio|idraulico|elettricista|meccanico|muratore|falegname|fabbro|giardiniere|veterinario|dentista|medico|pediatra|parrucchiere|parrucchiera|estetista|agenzia|assicurazione|assicurazioni|condominio|amministratore|corriere|segreteria|ufficio|ospedale|guardia medica|pronto soccorso)\b/i;
  const PAROLE_VAGHE = /\b(amic[oa]|collega|vicin[oa]|tip[oa]|tizi[oa]|ragazz[oa]|mamma|papà|papa|babbo|zi[oa]|nonn[oa]|cugin[oa]|fratello|sorella|marito|moglie|casa|lavoro|nuovo|vecchio|numero|cell|cellulare|fisso|non rispondere|boh)\b/i;
  function motiviNome(s) {
    const nome = s.nome.trim(), motivi = [];
    if (!nome) return motivi;
    if (s.ditta || PAROLE_DITTA.test(nome)) motivi.push('ditta');
    else if (nome.split(/\s+/).length < 2 || /\d/.test(nome) || PAROLE_VAGHE.test(nome) || /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(nome)) motivi.push('nome');
    return motivi;
  }

  // ── 5. Il riepilogo prima di salvare ──
  // righe: la Lista già letta dall'app; utenteId: il proprietario che riceve i nomi.
  // → { presenti, numeri, nuovi, controllare, incompleti }: ogni scheda ha `spunta` (entra se accesa) e `motivi`
  //   motivi: 'nome' (poco chiaro) · 'ditta' · 'omonimo' (stesso nome in Lista con un altro numero: parte SENZA spunta) · 'senza-telefono' · 'senza-nome'
  //   numeri: stesso nome di UNA scheda della Lista che non ha il numero → non si crea un doppione, si aggiunge il numero a `contattoId`
  function preparaImport(testo, righe, { utenteId } = {}) {
    const mie = (righe || []).filter(r => r.user_id === utenteId);
    const numeriLista = new Set(mie.map(r => soloCifre(r.telefono)).filter(c => c.length >= 6));
    const perNomeLista = new Map();
    mie.forEach(r => { const k = L.piega(r.nome); if (k) perNomeLista.set(k, [...(perNomeLista.get(k) || []), r]); });
    const nomiLista = perNomeLista;
    const esito = { letti: 0, presenti: [], numeri: [], nuovi: [], controllare: [], incompleti: [] };
    const schede = unisciDoppioni(leggiVcard(testo));
    esito.letti = schede.length;
    for (const s of schede) {
      const numeri = [s.telefono, ...s.altriNumeri].filter(Boolean);
      if (numeri.some(n => numeriLista.has(soloCifre(n)))) { esito.presenti.push(s); continue; }
      if (!s.telefono && s.nome && nomiLista.has(L.piega(s.nome))) { esito.presenti.push(s); continue; }
      const motivi = motiviNome(s);
      if (!s.nome.trim()) esito.incompleti.push({ ...s, motivi: ['senza-nome'], spunta: false });
      else if (!s.telefono) esito.incompleti.push({ ...s, motivi: ['senza-telefono', ...motivi], spunta: false });
      else {
        const uguali = nomiLista.get(L.piega(s.nome)) || [];
        if (uguali.length === 1 && !uguali[0].telefono) { esito.numeri.push({ ...s, motivi: [], spunta: true, contattoId: uguali[0].id }); continue; }
        if (uguali.length) motivi.push('omonimo');
        (motivi.length ? esito.controllare : esito.nuovi).push({ ...s, motivi, spunta: !motivi.includes('omonimo') });
      }
    }
    const perNome = (a, b) => L.piega(a.nome).localeCompare(L.piega(b.nome), 'it');
    ['presenti', 'numeri', 'nuovi', 'controllare', 'incompleti'].forEach(k => esito[k].sort(perNome));
    return esito;
  }

  // Compleanno come lo tiene il database: una data; quando l'anno non si sa si scrive 1604 (la stessa convenzione dell'iPhone)
  const ANNO_IGNOTO = 1604;
  const due = n => String(n).padStart(2, '0');
  const dataCompleanno = c => (c ? `${c.anno || ANNO_IGNOTO}-${due(c.mese)}-${due(c.giorno)}` : null);
  // «2026-04-12» → «12 aprile 1985» · «1604-12-25» → «25 dicembre»
  function compleannoScritto(data) {
    const m = String(data || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '';
    const mesi = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
    return `${Number(m[3])} ${mesi[Number(m[2]) - 1]}${Number(m[1]) === ANNO_IGNOTO ? '' : ' ' + m[1]}`;
  }

  // Riga pronta per la tabella `contatti`: senza categoria → «Da catalogare»; gli altri numeri nelle note
  function rigaContatto(s, utenteId) {
    return {
      user_id: utenteId, nome: s.nome.trim(), telefono: s.telefono || null,
      note: s.altriNumeri.length ? 'Altri numeri: ' + s.altriNumeri.join(' · ') : null,
      compleanno: dataCompleanno(s.compleanno),
    };
  }

  const api = { righeLogiche, daQuotedPrintable, leggiCompleanno, numeroMb21, leggiVcard, unisciDoppioni, motiviNome, preparaImport, rigaContatto, dataCompleanno, compleannoScritto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Rubrica = api;
})(this);

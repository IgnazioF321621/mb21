// MB21 · «Segnala» (nota Pagine 009, Ignazio 05/10/2026): da ogni schermata, pagina e foglio un piccolo insetto in alto a destra apre
// «Cosa non va, o cosa proponi?» con tre scelte a un tocco e un testo; l'app aggiunge da sola dove era il partner, la versione e il telefono.
// Qui le regole pure (niente rete, niente pagina): le usano index.html (foglioSegnala) e tools/banco/prova_segnala.js.
// Le segnalazioni vanno nella tabella `segnalazioni` (migrazione 20261006001000); le legge l'Admin (pagina a parte, titolo Admin e Controlli).
(function (radice) {
  const MOTIVI = [['non_funziona', 'Non funziona'], ['non_capisco', 'Non capisco'], ['idea', 'Un’idea']];
  const MAX_TESTO = 1000;
  const NOMI_PAGINE = { oggi: 'Dashboard', lista: 'Lista Nomi', agenda: 'MB Plan', report: 'Report', mappa: 'Mappa', check: 'Check', admin: 'Admin', profilo: 'Profilo', training: 'Training' };
  const nomeMotivo = k => (MOTIVI.find(m => m[0] === k) || [])[1] || '';
  const nomePagina = p => NOMI_PAGINE[p] || String(p || '');
  const pulisci = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);

  // Dove era il partner: { pagina (il tab), sezione, fogli (i titoli dei fogli aperti, dal primo all'ultimo), contatto (id), vista } → solo i pezzi pieni
  function doveDa(stato) {
    const s = stato || {}, d = {};
    if (s.pagina) d.pagina = String(s.pagina);
    const sezione = pulisci(s.sezione); if (sezione) d.sezione = sezione;
    const fogli = (Array.isArray(s.fogli) ? s.fogli : []).map(pulisci).filter(Boolean).slice(0, 5); if (fogli.length) d.fogli = fogli;
    if (s.contatto) d.contatto = String(s.contatto);
    const vista = pulisci(s.vista); if (vista) d.vista = vista;
    return d;
  }
  // «Lista Nomi › Scheda contatto · Dati › Modifica contatto»: per chi legge le segnalazioni
  function descrizioneDove(dove) {
    const d = dove || {};
    return [nomePagina(d.pagina), d.vista, d.sezione, ...(Array.isArray(d.fogli) ? d.fogli : [])].filter(Boolean).join(' › ');
  }
  // Il telefono, in breve, dall'user agent: «iPhone · Safari · app» (app = aggiunta alla schermata Home)
  function telefonoDa(ua, standalone) {
    const u = String(ua || '');
    const cosa = /iPad/.test(u) || (/Macintosh/.test(u) && /Mobile/.test(u)) ? 'iPad' : /iPhone|iPod/.test(u) ? 'iPhone' : /Android/.test(u) ? 'Android' : /Macintosh/.test(u) ? 'Mac' : /Windows/.test(u) ? 'Windows' : 'Altro';
    const come = /CriOS|Chrome/.test(u) && !/Edg/.test(u) ? 'Chrome' : /Edg/.test(u) ? 'Edge' : /Firefox|FxiOS/.test(u) ? 'Firefox' : /Safari/.test(u) ? 'Safari' : '';
    return [cosa, come, standalone ? 'app' : ''].filter(Boolean).join(' · ');
  }
  // La riga da salvare; null se manca chi segnala o il motivo non è uno dei tre. Il testo è facoltativo (al massimo MAX_TESTO caratteri)
  function riga({ userId, motivo, testo, dove, versione, telefono } = {}) {
    if (!userId || !MOTIVI.some(m => m[0] === motivo)) return null;
    const t = String(testo || '').trim().slice(0, MAX_TESTO);
    return { user_id: userId, motivo, testo: t || null, dove: dove && typeof dove === 'object' ? dove : {}, versione: versione || null, telefono: telefono || null };
  }
  const api = { MOTIVI, MAX_TESTO, NOMI_PAGINE, nomeMotivo, nomePagina, doveDa, descrizioneDove, telefonoDa, riga };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else radice.MB21Segnala = api;
})(this);

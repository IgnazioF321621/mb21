// MB21 · le icone (cantiere 34): una famiglia sola, a tratto. La regola è in docs/MB21_Design.md:
// griglia 24×24, nessun riempimento, tratto 1,8, punte e giunzioni tonde, un colore solo (prende quello del testo: currentColor).
// I disegni vengono dalla tela di Claude Design (tavola «Icone»); i nomi li dà Code. Un'icona nuova si aggiunge QUI e da nessun'altra parte.
//   MB21Icone.icona('casa')         → '<svg class="ic" …><use href="#ic-casa"/></svg>'  (grande quanto la scritta: 1em)
//   MB21Icone.icona('casa', 23)     → la stessa, 23 px
// Nel browser il file mette da solo nella pagina l'elenco dei disegni (uno <symbol id="ic-…"> per icona), così anche l'HTML scritto
// a mano può usare <svg class="ic"><use href="#ic-casa"/></svg>. Funzioni pure a parte questo: le usa anche tools/banco/prova_icone.js.
(function (radice) {
  const DISEGNI = {
    // Barra in basso
    'casa': '<path d="M3.8 10.8 12 4l8.2 6.8V19a1.4 1.4 0 0 1-1.4 1.4h-3.6v-5.6H8.8v5.6H5.2A1.4 1.4 0 0 1 3.8 19z"/>',   // Dashboard
    'agenda': '<rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2.6"/><path d="M3.6 10.1h16.8M8.4 3.3v3.9M15.6 3.3v3.9"/>',   // Agenda
    'lista': '<circle cx="9.2" cy="8" r="3.2"/><path d="M3.4 19.8c0-3.2 2.6-5.8 5.8-5.8s5.8 2.6 5.8 5.8"/><path d="M16.4 5.4a3 3 0 0 1 0 5.6M18.2 14.4c1.9.8 3.2 2.7 3.2 5"/>',   // Lista
    'report': '<path d="M5.2 20.2v-7.4M12 20.2V4.4M18.8 20.2v-4.8"/>',   // Report
    'mappa': '<circle cx="12" cy="4.9" r="2.1"/><circle cx="5.6" cy="19.1" r="2.1"/><circle cx="18.4" cy="19.1" r="2.1"/><path d="M12 7v3.8M12 10.8 6.6 17.2M12 10.8l5.4 6.4"/>',   // Mappa
    // Categorie dei contatti
    'prospect': '<circle cx="9.8" cy="8.2" r="3.3"/><path d="M3.6 19.9c0-3.4 2.8-6.2 6.2-6.2 1.3 0 2.5.4 3.5 1.1"/><path d="M16.2 15.7a1.9 1.9 0 1 1 2.4 1.8v1.1"/><path d="M18.6 20.5h.01"/>',   // Prospect
    'cliente': '<circle cx="9.8" cy="8.2" r="3.3"/><path d="M3.6 19.9c0-3.4 2.8-6.2 6.2-6.2 1.3 0 2.5.4 3.5 1.1"/><path d="M15.4 16.3h5.2l-.5 4.3h-4.2z"/><path d="M17 16.3v-.8a1.1 1.1 0 0 1 2 0v.8"/>',   // Cliente
    'partner': '<circle cx="9.8" cy="8.2" r="3.3"/><path d="M3.6 19.9c0-3.4 2.8-6.2 6.2-6.2 1.3 0 2.5.4 3.5 1.1"/><path d="M18.3 20.7v-5.4M16 17.6l2.3-2.3 2.3 2.3"/>',   // Partner
    'referral': '<circle cx="9.8" cy="8.2" r="3.3"/><path d="M3.6 19.9c0-3.4 2.8-6.2 6.2-6.2 1.3 0 2.5.4 3.5 1.1"/><circle cx="17.6" cy="9.6" r="2.4"/><path d="M16.6 14.3c2.6.5 4.4 2.7 4.4 5.6"/>',   // Referral
    'ex': '<circle cx="9.8" cy="8.2" r="3.3"/><path d="M3.6 19.9c0-3.4 2.8-6.2 6.2-6.2 1.3 0 2.5.4 3.5 1.1"/><path d="m16.1 16.3 4.5 4.5M20.6 16.3l-4.5 4.5"/>',   // Ex Partner / Cliente
    'unlinked': '<circle cx="9.8" cy="8.2" r="3.3"/><path d="M3.6 19.9c0-3.4 2.8-6.2 6.2-6.2 1.3 0 2.5.4 3.5 1.1"/><path d="m16.1 20.6 1.6-1.6M19.5 17.2l1.6-1.6"/><path d="M18.6 18.1h.01"/>',   // Unlinked
    'archiviato': '<circle cx="9.8" cy="8.2" r="3.3"/><path d="M3.6 19.9c0-3.4 2.8-6.2 6.2-6.2 1.3 0 2.5.4 3.5 1.1"/><path d="M18.3 14.4v4.3M16.3 16.8l2 2 2-2M15.2 21h6.2"/>',   // Archiviato
    // Tipi di azione
    'contatto': '<path d="M5.6 3.7h3.1l1.9 4.6-2.4 1.4a10.6 10.6 0 0 0 5.7 5.7l1.4-2.4 4.6 1.9v3.1a1.9 1.9 0 0 1-1.9 1.9A15.6 15.6 0 0 1 3.7 5.6a1.9 1.9 0 0 1 1.9-1.9z"/>',   // Contatto
    'appuntamento': '<rect x="2.8" y="5.2" width="12.6" height="15.2" rx="2.6"/><path d="M2.8 10.1h12.6M6.6 3.3v3.9M11.8 3.3v3.9"/><circle cx="18.2" cy="16.6" r="4.4"/><path d="M18.2 14.4v2.4l1.6 1"/>',   // Appuntamento
    'consulenza': '<path d="M4.4 8.4 12 4.6l7.6 3.8v7.2L12 19.4l-7.6-3.8z"/><path d="m4.4 8.4 7.6 3.8 7.6-3.8M12 12.2v7.2"/>',   // Consulenza prodotti
    'followup': '<path d="M20.4 12a8.4 8.4 0 1 1-2.6-6.1"/><path d="M20.8 3.6v4.2h-4.2"/><path d="M12 7.8V12l2.9 1.8"/>',   // Follow up
    'pianomarketing': '<rect x="3.4" y="4.5" width="17.2" height="11.8" rx="2.2"/><path d="M12 16.3v3.2M8.4 19.5h7.2"/><path d="m7.7 12.5 2.8-3 2.4 2.2 3.5-4"/>',   // Piano Marketing
    // Esiti più usati
    'norisposta': '<path d="M4.5 4.3h2.5l1.5 3.7-1.9 1.1a8.6 8.6 0 0 0 4.6 4.6l1.1-1.9 3.7 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5A12.7 12.7 0 0 1 3 5.8a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M15.6 4.6h.01M18.4 4.6h.01M21.2 4.6h.01"/>',   // Non risponde
    'telefonooff': '<path d="M4.5 4.3h2.5l1.5 3.7-1.9 1.1a8.6 8.6 0 0 0 4.6 4.6l1.1-1.9 3.7 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5A12.7 12.7 0 0 1 3 5.8a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M3.2 20.8 20.8 3.2"/>',   // Telefono off
    'richiamare': '<path d="M4.5 4.3h2.5l1.5 3.7-1.9 1.1a8.6 8.6 0 0 0 4.6 4.6l1.1-1.9 3.7 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5A12.7 12.7 0 0 1 3 5.8a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M21.2 6.8a3.4 3.4 0 1 1-1.1-2.5"/><path d="M21 2.6V5h-2.4"/>',   // Richiamare
    'nointeresse': '<circle cx="12" cy="12" r="8.4"/><path d="M6.1 17.9 17.9 6.1"/>',   // Non interessa
    'pmfissato': '<rect x="3.4" y="4.5" width="17.2" height="11.8" rx="2.2"/><path d="M12 16.3v3.2M8.4 19.5h7.2"/><path d="m8.7 10.3 2.2 2.2 4.4-4.4"/>',   // PM fissato
    'presentazione': '<rect x="3.4" y="4.5" width="17.2" height="11.8" rx="2.2"/><path d="M12 16.3v3.2M8.4 19.5h7.2"/>',   // Presentazione
    'dsfissato': '<rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2.6"/><path d="M3.6 10.1h16.8M8.4 3.3v3.9M15.6 3.3v3.9"/><path d="m8.7 15.3 2.2 2.2 4.4-4.4"/>',   // DS fissato
    'rimandato': '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 2"/>',   // Rimandato
    'noshow': '<circle cx="12" cy="12" r="8.4" stroke-dasharray="2.4 3.2"/><circle cx="12" cy="10.6" r="2.4"/><path d="M7.9 17.4c.7-1.9 2.2-3 4.1-3s3.4 1.1 4.1 3"/>',   // No show
    'prodotti': '<rect x="3.6" y="4.6" width="16.8" height="14.8" rx="2.4"/><path d="M12 4.6v14.8M3.6 12h16.8"/>',   // Prodotti
    'iscrizione': '<path d="m4.6 12.8 5.2 5.2L19.4 6.6"/>',   // Iscrizione
    'nobuonfine': '<circle cx="12" cy="12" r="8.4"/><path d="m8.8 8.8 6.4 6.4M15.2 8.8l-6.4 6.4"/>',   // No buon fine
    // Provvisoria, disegnata da Code nello stesso tratto: manca ancora nella tela di Design
    'admin': '<path d="M5 7h9M18 7h1M5 12h2M11 12h8M5 17h7M16 17h3"/><circle cx="16" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="14" cy="17" r="2"/>',   // Admin
  };
  const ha = nome => Object.prototype.hasOwnProperty.call(DISEGNI, nome);
  // Un nome che non esiste dà una stringa vuota: meglio niente che un quadratino rotto
  function icona(nome, px) {
    if (!ha(nome)) return '';
    const misura = px ? ` width="${Number(px)}" height="${Number(px)}"` : '';
    return `<svg class="ic"${misura} viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-${nome}"/></svg>`;
  }
  const elenco = () => `<svg id="mb21-icone" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${
    Object.keys(DISEGNI).map(n => `<symbol id="ic-${n}" viewBox="0 0 24 24">${DISEGNI[n]}</symbol>`).join('')}</defs></svg>`;
  function monta(documento) {
    if (!documento || documento.getElementById('mb21-icone')) return;
    const posto = documento.createElement('div');
    posto.innerHTML = elenco();
    documento.body.insertBefore(posto.firstChild, documento.body.firstChild);
  }
  const api = { icona, ha, nomi: () => Object.keys(DISEGNI), elenco, monta };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    radice.MB21Icone = api;
    if (radice.document) {
      if (radice.document.body) monta(radice.document);
      else radice.document.addEventListener('DOMContentLoaded', () => monta(radice.document));
    }
  }
})(this);

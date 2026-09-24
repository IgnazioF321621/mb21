// MB21 · le icone (cantiere 34): una famiglia sola, a tratto. La regola è in docs/MB21_Design.md:
// griglia 24×24, nessun riempimento, tratto 1,8, punte e giunzioni tonde, un colore solo (prende quello del testo: currentColor).
// I disegni e i nomi vengono dalla tela di Claude Design (tavola «Icone»): li porta qui tools/design/importa_icone.py, che riscrive
// il blocco DISEGNI. Un'icona nuova si chiede a Design e si importa: non si disegna a mano in una pagina.
//   MB21Icone.icona('casa')         → '<svg class="ic" …><use href="#ic-casa"/></svg>'  (grande quanto la scritta: 1em)
//   MB21Icone.icona('casa', 23)     → la stessa, 23 px
// Nel browser il file mette da solo nella pagina l'elenco dei disegni (uno <symbol id="ic-…"> per icona), così anche l'HTML scritto
// a mano può usare <svg class="ic"><use href="#ic-casa"/></svg>. Funzioni pure a parte questo: le usa anche tools/banco/prova_icone.js.
(function (radice) {
  const DISEGNI = {
    // ── DISEGNI: inizio (scritto da tools/design/importa_icone.py: non modificare a mano)
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
    // Azioni e comandi
    'modifica': '<path d="M4 20.1h4.2L19 9.3a2.5 2.5 0 0 0-3.5-3.5L4.7 16.6z"/><path d="m14.6 6.9 3.5 3.5"/>',   // Modifica
    'elimina': '<path d="M4.6 6.8h14.8"/><path d="M9 6.8V4.9a1.3 1.3 0 0 1 1.3-1.3h3.4A1.3 1.3 0 0 1 15 4.9v1.9"/><path d="M6.6 6.8 7.5 19a1.6 1.6 0 0 0 1.6 1.5h5.8A1.6 1.6 0 0 0 16.5 19l.9-12.2"/><path d="M10.3 10.6v6M13.7 10.6v6"/>',   // Elimina
    'collega': '<path d="M10.2 13.8a3.6 3.6 0 0 0 5.4.4l2.6-2.6a3.6 3.6 0 0 0-5.1-5.1l-1.5 1.5"/><path d="M13.8 10.2a3.6 3.6 0 0 0-5.4-.4l-2.6 2.6a3.6 3.6 0 0 0 5.1 5.1l1.5-1.5"/>',   // Collega
    'condividi': '<path d="M12 3.6v11.2"/><path d="m8.2 7.4 3.8-3.8 3.8 3.8"/><path d="M5.4 12.6v6a1.8 1.8 0 0 0 1.8 1.8h9.6a1.8 1.8 0 0 0 1.8-1.8v-6"/>',   // Condividi
    'aggiorna': '<path d="M20.2 11.4a8.2 8.2 0 0 0-14-4.6L3.8 9.2"/><path d="M3.8 12.6a8.2 8.2 0 0 0 14 4.6l2.4-2.4"/><path d="M3.8 4.6v4.6h4.6M20.2 19.4v-4.6h-4.6"/>',   // Aggiorna
    'pausa': '<path d="M9.4 4.8v14.4M14.6 4.8v14.4"/>',   // Pausa
    'riprendi': '<path d="M7.6 4.8 19 12 7.6 19.2z"/>',   // Riprendi
    'visione': '<path d="M2.6 12S6.2 5.6 12 5.6 21.4 12 21.4 12 17.8 18.4 12 18.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="3.2"/>',   // Visione completa
    'info': '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.4"/><path d="M12 7.7h.01"/>',   // Come funziona
    'attenzione': '<path d="M10.6 4.3 2.9 17.6a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.4 4.3a1.6 1.6 0 0 0-2.8 0z"/><path d="M12 9.4v4.2"/><path d="M12 17h.01"/>',   // Attenzione
    'fatto': '<circle cx="12" cy="12" r="8.6"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/>',   // Fatto
    'chiudi': '<path d="m6 6 12 12M18 6 6 18"/>',   // Chiudi
    'piu': '<path d="M12 5v14M5 12h14"/>',   // Aggiungi
    'freccia': '<path d="m9 5 7 7-7 7"/>',   // Vai avanti
    'puntini': '<circle cx="5.6" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.4" cy="12" r="1.2" fill="currentColor" stroke="none"/>',   // Altre azioni
    'cerca': '<circle cx="11" cy="11" r="6.6"/><path d="m16 16 4.4 4.4"/>',   // Cerca
    'foto': '<rect x="2.8" y="6.6" width="18.4" height="13.2" rx="2.6"/><path d="m8.6 6.6 1.5-2.4h3.8l1.5 2.4"/><circle cx="12" cy="13.2" r="3.6"/>',   // Foto
    // Lavoro di ogni giorno
    'lampo': '<path d="M13.2 3 5 14.2h6.2l-1 6.8 8-11.2h-6.2z"/>',   // Check del giorno
    'obiettivi': '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.2"/><path d="M12 10.6h.01"/>',   // Obiettivi
    'telefonate': '<path d="M4.5 4.3h2.5l1.5 3.7-1.9 1.1a8.6 8.6 0 0 0 4.6 4.6l1.1-1.9 3.7 1.5v2.5a1.5 1.5 0 0 1-1.5 1.5A12.7 12.7 0 0 1 3 5.8a1.5 1.5 0 0 1 1.5-1.5z"/><path d="M15.8 3.4a7 7 0 0 1 4.8 4.8M16.4 7.4a3.4 3.4 0 0 1 2.2 2.2"/>',   // Telefonate
    'riordini': '<path d="M6.5 10.7 12 8l5.5 2.7v5.2L12 18.6l-5.5-2.6z"/><path d="m6.5 10.7 5.5 2.7 5.5-2.7M12 13.4v5.2"/><path d="M3.6 9.9a9 9 0 0 1 16.8 0"/><path d="m17.8 8.1 2.6 1.8 1-3"/>',   // Riordini
    'conferme': '<rect x="3.6" y="5.2" width="16.8" height="15.2" rx="2.6"/><path d="M3.6 10.1h16.8M8.4 3.3v3.9M15.6 3.3v3.9"/><path d="m8.7 15.3 2.2 2.2 4.4-4.4"/>',   // Conferme
    'vendite': '<circle cx="9.6" cy="19.4" r="1.6"/><circle cx="17.4" cy="19.4" r="1.6"/><path d="M2.8 3.8h2.6l2.4 11.4h10.6l1.8-8.2H6.6"/>',   // Vendite
    'consegna': '<path d="M4.4 8.4 12 4.6l7.6 3.8v7.2L12 19.4l-7.6-3.8z"/><path d="m4.4 8.4 7.6 3.8 7.6-3.8M12 12.2v7.2"/><path d="m8.2 6.5 7.6 3.8"/>',   // Consegna
    'propone': '<path d="M9.6 16.8a5.8 5.8 0 1 1 4.8 0v1.8H9.6z"/><path d="M9.8 20.4h4.4"/>',   // L'app propone
    'prossimo': '<circle cx="12" cy="12" r="8.6"/><path d="M8.4 12h7.2M12.6 8.8l3.2 3.2-3.2 3.2"/>',   // Prossimo passo
    'orario': '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.2V12l3.2 2"/>',   // Orario
    'catalogare': '<rect x="3.4" y="4.6" width="17.2" height="6.4" rx="1.8"/><rect x="3.4" y="13" width="17.2" height="6.4" rx="1.8"/><path d="M9.6 7.8h4.8M9.6 16.2h4.8"/>',   // Da catalogare
    // Persone e squadra
    'persona': '<circle cx="12" cy="8.2" r="3.6"/><path d="M4.8 20.2c0-3.9 3.2-7 7.2-7s7.2 3.1 7.2 7"/>',   // Persona
    'squadra': '<circle cx="12" cy="8.6" r="2.8"/><path d="M7.4 16.6c0-2.6 2.1-4.6 4.6-4.6s4.6 2 4.6 4.6"/><circle cx="4.8" cy="10.8" r="2.2"/><path d="M1.5 17.8c0-2.1 1.5-3.8 3.3-3.8"/><circle cx="19.2" cy="10.8" r="2.2"/><path d="M22.5 17.8c0-2.1-1.5-3.8-3.3-3.8"/>',   // Squadra
    'avvio': '<path d="M12 2.6c2.8 2.2 4.4 5.4 4.4 9l-1.8 3.6H9.4L7.6 11.6c0-3.6 1.6-6.8 4.4-9z"/><circle cx="12" cy="9.8" r="1.8"/><path d="m9.4 15.2-2.4 2c-.4 1.4-.3 2.8.2 4.2 1.4-.4 2.6-1.2 3.4-2.4M14.6 15.2l2.4 2c.4 1.4.3 2.8-.2 4.2-1.4-.4-2.6-1.2-3.4-2.4"/>',   // Avvio del partner
    'perche': '<path d="m12 3.4 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6-4.4-4.3 6.1-.9z"/>',   // Perché ho iniziato
    'compleanno': '<path d="M4.2 13.4h15.6a1.8 1.8 0 0 1 1.8 1.8v3.6a1.8 1.8 0 0 1-1.8 1.8H4.2a1.8 1.8 0 0 1-1.8-1.8v-3.6a1.8 1.8 0 0 1 1.8-1.8z"/><path d="M12 13.4V9.8M8 13.4v-2.6M16 13.4v-2.6"/><path d="M12 7.6h.01M8 8.8h.01M16 8.8h.01"/>',   // Compleanno
    'benvenuto': '<path d="M8.6 12.4V5.6a1.6 1.6 0 0 1 3.2 0v5.2"/><path d="M11.8 10.8V4.8a1.6 1.6 0 0 1 3.2 0v5.8"/><path d="M15 10.8V6.8a1.6 1.6 0 0 1 3.2 0v7.8a7 7 0 0 1-7 7 5.6 5.6 0 0 1-4.4-2.2L4 16.2a1.7 1.7 0 0 1 2.6-2.2l2 2.2"/>',   // Benvenuto
    'complimenti': '<path d="M7.4 4.4h9.2v4.8a4.6 4.6 0 0 1-9.2 0z"/><path d="M7.4 6.2H5.2a2.4 2.4 0 0 0 2.2 3.4M16.6 6.2h2.2a2.4 2.4 0 0 1-2.2 3.4"/><path d="M12 13.8v3.4M8.6 20.4h6.8l-.8-3.2H9.4z"/>',   // Complimenti
    'liberta': '<path d="M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5z"/><path d="M16 8 2.8 21.2"/><path d="M17.5 15H9"/>',   // Niente è vincolante
    // Segni vitali e numeri
    'segnivitali': '<path d="M2.8 12.4h4l2-4.8 3.4 9.2 2.6-6.2 1.6 1.8h4.8"/>',   // Segni vitali
    'crescita': '<path d="m3.4 17.4 5.6-5.6 3.6 3.6 7.4-7.4"/><path d="M15.4 8h5v5"/>',   // Crescita
    'biglietto': '<path d="M3.4 8.2a2 2 0 0 1 2-2h13.2a2 2 0 0 1 2 2v1.6a2.2 2.2 0 0 0 0 4.4v1.6a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2v-1.6a2.2 2.2 0 0 0 0-4.4z"/><path d="M14.4 6.2v11.6" stroke-dasharray="2 2.4"/>',   // Biglietto BBS / WES
    'volume': '<ellipse cx="12" cy="6.4" rx="7.2" ry="2.8"/><path d="M4.8 6.4v4.6c0 1.5 3.2 2.8 7.2 2.8s7.2-1.3 7.2-2.8V6.4"/><path d="M4.8 11v4.6c0 1.5 3.2 2.8 7.2 2.8s7.2-1.3 7.2-2.8V11"/>',   // Volume VP
    // Telefono e app
    'app': '<rect x="6.4" y="2.6" width="11.2" height="18.8" rx="2.6"/><path d="M10.6 5.4h2.8"/><path d="M12 18.4h.01"/>',   // Usa l'app
    'installa': '<rect x="6.4" y="2.6" width="11.2" height="18.8" rx="2.6"/><path d="M12 7.2v6.6M9.4 11.2 12 13.8l2.6-2.6"/><path d="M12 18.4h.01"/>',   // Installa
    'avvisi': '<path d="M18.2 16.2H5.8a2 2 0 0 1-1.5-3.3c.9-1 1.5-2.2 1.5-3.5V9a6.2 6.2 0 0 1 12.4 0v.4c0 1.3.6 2.5 1.5 3.5a2 2 0 0 1-1.5 3.3z"/><path d="M9.8 19a2.4 2.4 0 0 0 4.4 0"/>',   // Avvisi
    'avvisi-spenti': '<path d="M18.2 16.2H5.8a2 2 0 0 1-1.5-3.3c.9-1 1.5-2.2 1.5-3.5V9a6.2 6.2 0 0 1 12.4 0v.4c0 1.3.6 2.5 1.5 3.5a2 2 0 0 1-1.5 3.3z"/><path d="M9.8 19a2.4 2.4 0 0 0 4.4 0"/><path d="M3.4 20.6 20.6 3.4"/>',   // Avvisi spenti
    'password': '<circle cx="8.2" cy="8.2" r="4.6"/><path d="m11.5 11.5 8.3 8.3"/><path d="m16.4 16.4 2.2-2.2M18.6 18.6l2.2-2.2"/>',   // Password
    'novita': '<path d="m11.4 3.6 1.7 4.3 4.3 1.7-4.3 1.7-1.7 4.3-1.7-4.3L5.4 9.6l4.3-1.7z"/><path d="m18.2 14.8.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',   // Novità
    'invito': '<rect x="3" y="5.4" width="18" height="13.2" rx="2.2"/><path d="m3.6 6.6 8.4 6 8.4-6"/>',   // Invito
    'file': '<path d="M13.4 3.4H7.2a2 2 0 0 0-2 2v13.2a2 2 0 0 0 2 2h9.6a2 2 0 0 0 2-2V8.8z"/><path d="M13.4 3.4v5.4h5.4"/><path d="M8.8 13h6.4M8.8 16.6h4.2"/>',   // File Amway
    'rubrica': '<rect x="5.4" y="3.2" width="13.4" height="17.6" rx="2.2"/><circle cx="12.2" cy="10.2" r="2.4"/><path d="M8.6 16.6c.5-1.8 1.9-2.8 3.6-2.8s3.1 1 3.6 2.8"/><path d="M5.4 7.4H2.8M5.4 12H2.8M5.4 16.6H2.8"/>',   // Rubrica
    'messaggio': '<path d="M20.4 12.6a7.6 7.6 0 0 1-10.4 7L4 21l1.4-5.6A7.6 7.6 0 1 1 20.4 12.6z"/>',   // Messaggio
    'whatsapp': '<path d="M20.6 11.6a7.6 7.6 0 0 1-10.6 7L4 20.2l1.6-5.8a7.6 7.6 0 1 1 15-2.8z"/><path d="M9.8 9.8c0 2.9 2.3 5.2 5.2 5.2.5 0 .9-.4.9-.9v-.9l-2-.8-.8 1a4.4 4.4 0 0 1-1.7-1.7l1-.8-.8-2h-.9c-.5 0-.9.4-.9.9z"/>',   // WhatsApp
    'email': '<path d="M3 10.6 12 4.4l9 6.2v7.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m3 10.6 7.8 5.2a2.2 2.2 0 0 0 2.4 0L21 10.6"/>',   // Email
    'telegram': '<path d="M21 3 3 10.4l7.6 3 3 7.6z"/><path d="M21 3 10.6 13.4"/>',   // Telegram
    // Materiali
    'audio': '<path d="M4.2 14.4v-2.2a7.8 7.8 0 0 1 15.6 0v2.2"/><path d="M4.2 13.4h2.2a1.6 1.6 0 0 1 1.6 1.6v3.2a1.6 1.6 0 0 1-1.6 1.6H5.8a1.6 1.6 0 0 1-1.6-1.6z"/><path d="M19.8 13.4h-2.2a1.6 1.6 0 0 0-1.6 1.6v3.2a1.6 1.6 0 0 0 1.6 1.6h.6a1.6 1.6 0 0 0 1.6-1.6z"/>',   // Audio
    'libro': '<path d="M4.2 4.6a1.8 1.8 0 0 1 1.8-1.8h12a1.8 1.8 0 0 1 1.8 1.8v14.8a1.8 1.8 0 0 0-1.8-1.8H6a1.8 1.8 0 0 0-1.8 1.8z"/><path d="M4.2 19.4a1.8 1.8 0 0 0 1.8 1.8h12"/><path d="M8.4 7.4h7.2M8.4 11h5"/>',   // Libro
    'admin': '<path d="M4.4 7.6h5.2M14.4 7.6h5.2M4.4 16.4h9.2M18.4 16.4h1.2"/><circle cx="12" cy="7.6" r="2.4"/><circle cx="16" cy="16.4" r="2.4"/>',   // Admin
    // ── DISEGNI: fine
    // ── Aggiunte a mano per MB Plan (cantiere 41, 22-23/09), fuori dal blocco importato da Claude Design (l'import non le cancella):
    // stesso tratto e stessa griglia delle altre. Se un giorno arrivano da Design, si tolgono da qui.
    'menu': '<path d="M4 7h16M4 12h16M4 17h16"/>',   // le tre linee del menu
    'scala-giorno': '<rect x="4" y="5" width="16" height="15" rx="2.2"/><path d="M8 3v4M16 3v4M4 9.5h16"/><rect x="8" y="12.5" width="4" height="4" rx=".8"/>',   // Giorno: il foglio con il giorno segnato
    'scala-settimana': '<rect x="3.5" y="4.5" width="17" height="15" rx="2.2"/><path d="M9.2 4.5v15M14.8 4.5v15"/>',   // Settimana: le colonnine
    'scala-mese': '<rect x="4" y="5" width="16" height="15" rx="2.2"/><path d="M8 3v4M16 3v4M4 9.5h16M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01"/>',   // Mese: la griglia dei giorni
    'copia': '<rect x="8.6" y="8.6" width="11.8" height="11.8" rx="2.2"/><path d="M15.4 8.6V5.8a2.2 2.2 0 0 0-2.2-2.2H5.8a2.2 2.2 0 0 0-2.2 2.2v7.4a2.2 2.2 0 0 0 2.2 2.2h2.8"/>',   // Copia: due fogli (Progetti, 24/09)
    'scala-anno': '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',   // Anno: i quadratini
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
  // I testi che arrivano già scritti dalle funzioni pure (agenda.js, dashboard.js, check.js, mappa.js, benvenuto.js) portano ancora
  // l'emoji: quelle funzioni e le loro prove non si toccano. Qui l'emoji diventa l'icona, o un cerchietto colorato se è un pallino.
  // `conIcone` vuole un testo GIÀ messo al sicuro (passato da esc): nella pagina lo chiama escIcone().
  const DA_EMOJI = { '⏳': 'orario', '✅': 'fatto', '👍': 'conferme', '📞': 'telefonate', '🗓': 'agenda', '📅': 'agenda', '⭐': 'perche', '👥': 'squadra',
    '🛒': 'vendite', '🎧': 'audio', '📖': 'libro', '🏠': 'casa', '📋': 'lista', '📊': 'report', '🗺': 'mappa', '📲': 'installa', '🔔': 'avvisi' };
  // i pallini prendono i colori veri dell'app: erano gli ultimi quattro scritti a mano, e di un tono diverso dai gruppi accanto a cui si vedono (cantiere 34, 20/09)
  const PALLINI = { '🔵': 'var(--gr-volume)', '🟠': 'var(--gr-azione)', '🟢': 'var(--gr-segni)', '🟣': 'var(--gr-crescita)', '🔴': 'var(--pericolo)', '⚪': 'var(--spento)' };
  function conIcone(htmlSicuro) {
    return String(htmlSicuro).replace(/(\p{Extended_Pictographic})\uFE0F?/gu, (tutto, segno) =>
      DA_EMOJI[segno] ? icona(DA_EMOJI[segno]) : PALLINI[segno] ? `<i class="pallino" style="background:${PALLINI[segno]}"></i>` : tutto);
  }
  const api = { icona, ha, nomi: () => Object.keys(DISEGNI), elenco, monta, conIcone };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    radice.MB21Icone = api;
    if (radice.document) {
      if (radice.document.body) monta(radice.document);
      else radice.document.addEventListener('DOMContentLoaded', () => monta(radice.document));
    }
  }
})(this);

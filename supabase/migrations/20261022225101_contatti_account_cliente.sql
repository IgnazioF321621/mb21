-- Verifica Vendite V4 (Ignazio 22/10/2026, strada B): «Ha un account cliente: ordina da solo» al posto dell'attesa «Ordina da solo»
-- (nota Azioni 025): niente domanda «ha ordinato?» dopo 7 giorni né riquadro in Dashboard.
-- SOLO AGGIUNTA: un campo facoltativo sul contatto, il giorno da cui il cliente ordina dal suo account cliente (vuoto = no).
-- Non cambia nient'altro:
--   · il trigger mb21_vendita_agenda non si tocca: nel modulo vendita di un cliente con account il riordino parte su «Nessun riordino»
--     (si può cambiare), quindi nessuna telefonata; senza riordino il cliente torna nella coda alla sua data di rientro (scelta di Ignazio);
--   · le colonne azioni.attesa_*, la funzione attesa_ordine, la riga di sequenze e la vista azioni_conti restano: storico e conti intatti.
-- I permessi della tabella contatti (e le sue regole RLS) valgono anche per la colonna nuova: nessun GRANT da aggiungere.
-- Da applicare AL RILASCIO, prima del codice che la legge (pagina-lista.js, pagina-vendite.js); poi la prova di lettura vera.

alter table public.contatti add column if not exists account_cliente_dal date;

comment on column public.contatti.account_cliente_dal is
  'V4 Vendite (22/10/2026): giorno da cui il cliente ordina da solo dal suo account cliente; vuoto = no. Si segna da Modifica nella scheda.';

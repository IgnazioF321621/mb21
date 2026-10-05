-- ════════════════════════════════════════════════════════════════════════════
-- MB Plan · via i «Modelli personali» e i «Progetti» (Ignazio 05/10/2026: «cancella tutto»)
--   Erano usati solo da due utenti: 1 modello di prova di Isabella (con 1 voce) e 1 progetto di Ignazio
--   (22 righe, già trasferito in Evernote). Copia dei dati prima di cancellare:
--   ~/evernote/copie/2026-10-05/modelli-progetti-prima-della-pulizia.json
--   NON tocca le 7 voci Core del Modulo Core N21 (modello_giorno con `core` pieno, fuori da ogni modello).
--   Le tabelle restano (vuote): l'app online le legge ancora finché non esce la versione nuova.
-- Si applica AL RILASCIO, prima della pubblicazione (CLAUDE.md § 4).
-- ════════════════════════════════════════════════════════════════════════════

delete from public.cose_da_fare where progetto_id is not null;
delete from public.progetti;
delete from public.cose_da_fare where modello_id in (select id from public.modello_giorno where core is null);
delete from public.modello_giorno where core is null;
delete from public.modelli;

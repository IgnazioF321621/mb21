-- ═══════════════════════════════════════════════════════════
-- MODIFICA di una vista esistente: ok di Ignazio dell'08/10/2026 (14:20). Si applica al rilascio con `supabase db push`.
-- Nota Azioni 025: «Ordina da solo» conta come contatto fatto (Ignazio 08/10: «il contatto conta come fatto»), come «Ordine» e «Richiamare».
-- La vista `azioni_conti` (migrazione 20260918133500) ha gli esiti che contano scritti dentro: si aggiunge «Ordina da solo».
-- La stessa lista sta in report.js → CONTATTO_PARLATO (⚠️ si cambiano insieme): quella si cambia nello stesso rilascio.
-- Definizione di prima (pg_get_viewdef, 08/10/2026): uguale a questa, senza 'Ordina da solo' nell'elenco degli esiti.
-- Copia di com'era: tools/banco/copie/azioni_conti_prima_025.sql.
-- ═══════════════════════════════════════════════════════════
create or replace view public.azioni_conti as
 SELECT id, user_id, contatto_id,
    (inizio AT TIME ZONE 'Europe/Rome')::date AS giorno,
    tipo_azione, modalita, esito,
    (tipo_azione = 'Contatto')::integer AS contatti,
    (tipo_azione = 'Piano Marketing')::integer AS pm
   FROM azioni a
  WHERE (inizio AT TIME ZONE 'Europe/Rome')::date >= date '2026-09-14'
    AND (inizio AT TIME ZONE 'Europe/Rome')::date <= (now() AT TIME ZONE 'Europe/Rome')::date
    AND ((tipo_azione = 'Contatto' AND coalesce(categoria, '') <> 'Partner'
          AND (esito = ANY (ARRAY['PM Fissato', 'Appuntamento', 'Ordine', 'Ordina da solo', 'Richiamare', 'Relazione', 'No Interesse', 'Consulenza Prodotti'])
               OR esito = 'Riordino' AND coalesce(completata, false)))
         OR (tipo_azione = 'Piano Marketing' AND esito = ANY (ARRAY['Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti'])));

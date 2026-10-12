-- ═══════════════════════════════════════════════════════════
-- MODIFICA di una vista esistente: ok di Ignazio del 12/10/2026 (nota Azioni 030, «quello che conta è il reale, non il previsto»;
-- ok scritto nella nota per la vista azioni_conti, con copia di com'era). Si applica al rilascio con `supabase db push`, dopo 20261012185500.
-- `azioni_conti.giorno` = il giorno in cui l'azione conta:
--   · Contatto (telefonata, messaggio…): il giorno in cui è stato dato l'esito (`esito_il`); se è vuoto (azioni di prima) il giorno dell'azione;
--   · Piano Marketing e appuntamenti: il giorno dell'incontro (scelta di Ignazio 12/10: «il giorno dell'incontro»), come prima.
-- Da qui contano check_giorni_conti e check_mesi (Dashboard, Check, Obiettivi) e i complimenti della sera (funzione online avvisi).
-- La stessa regola sta in report.js → giornoAzione (⚠️ si cambiano insieme). Stesse colonne di prima, stesso ordine.
-- Copia di com'era: tools/banco/copie/azioni_conti_prima_030.sql.
-- ═══════════════════════════════════════════════════════════
create or replace view public.azioni_conti as
 SELECT a.id, a.user_id, a.contatto_id,
    g.giorno,
    a.tipo_azione, a.modalita, a.esito,
    (a.tipo_azione = 'Contatto')::integer AS contatti,
    (a.tipo_azione = 'Piano Marketing')::integer AS pm
   FROM azioni a
   CROSS JOIN LATERAL (SELECT CASE WHEN a.tipo_azione = 'Contatto' AND a.esito_il IS NOT NULL THEN a.esito_il
                                   ELSE (a.inizio AT TIME ZONE 'Europe/Rome')::date END AS giorno) g
  WHERE g.giorno >= date '2026-09-14'
    AND g.giorno <= (now() AT TIME ZONE 'Europe/Rome')::date
    AND ((a.tipo_azione = 'Contatto' AND coalesce(a.categoria, '') <> 'Partner'
          AND (a.esito = ANY (ARRAY['PM Fissato', 'Appuntamento', 'Ordine', 'Ordina da solo', 'Richiamare', 'Relazione', 'No Interesse', 'Consulenza Prodotti'])
               OR a.esito = 'Riordino' AND coalesce(a.completata, false)))
         OR (a.tipo_azione = 'Piano Marketing' AND a.esito = ANY (ARRAY['Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti'])));

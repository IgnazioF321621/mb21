-- Copia della vista azioni_conti com'era prima della nota Pagine 110 (dalla migrazione 20261012185700, uguale al database il 28/10/2026: pg_get_viewdef letto in sola lettura).
-- Per tornare indietro si rilancia questo testo.
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

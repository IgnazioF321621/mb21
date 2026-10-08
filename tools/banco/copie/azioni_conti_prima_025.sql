-- azioni_conti com'era l'08/10/2026 (pg_get_viewdef), prima della nota Azioni 025
create or replace view public.azioni_conti as
 SELECT id,
    user_id,
    contatto_id,
    (inizio AT TIME ZONE 'Europe/Rome'::text)::date AS giorno,
    tipo_azione,
    modalita,
    esito,
    (tipo_azione = 'Contatto'::text)::integer AS contatti,
    (tipo_azione = 'Piano Marketing'::text)::integer AS pm
   FROM azioni a
  WHERE (inizio AT TIME ZONE 'Europe/Rome'::text)::date >= '2026-09-14'::date AND (inizio AT TIME ZONE 'Europe/Rome'::text)::date <= (now() AT TIME ZONE 'Europe/Rome'::text)::date AND (tipo_azione = 'Contatto'::text AND COALESCE(categoria, ''::text) <> 'Partner'::text AND ((esito = ANY (ARRAY['PM Fissato'::text, 'Appuntamento'::text, 'Ordine'::text, 'Richiamare'::text, 'Relazione'::text, 'No Interesse'::text, 'Consulenza Prodotti'::text])) OR esito = 'Riordino'::text AND COALESCE(completata, false)) OR tipo_azione = 'Piano Marketing'::text AND (esito = ANY (ARRAY['Presentazione'::text, 'Dare Seguito'::text, 'Iscrizione'::text, 'No BuonFine'::text, 'Prodotti'::text])));

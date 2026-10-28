-- ═══════════════════════════════════════════════════════════
-- MODIFICA di una vista esistente: ok di Ignazio del 28/10/2026 (nota Pagine 110: «1 PM a 1 persona = 1 dato singolo; 1 PM a N persone = 1 PM in Report,
-- Core, Griglia. Ogni persona ha la sua azione»; e, alla domanda «anche nel Check?», «sì»). Si applica al rilascio con `supabase db push`.
-- Un Piano Marketing con più persone (le note 103 e 108 scrivono una riga di azioni per persona: stesso partner, stessa ora d'inizio, stesso sottotipo)
-- conta UNO: `pm` = 1 solo sulla prima riga dell'incontro (in ordine di id), 0 sulle altre. Le righe restano tutte (ognuno il suo esito, la Dashboard
-- elenca le persone); `contatti` non cambia. Da qui contano check_giorni_conti e check_mesi (Dashboard, Check, Obiettivi) e i complimenti della sera.
-- La stessa regola sta in report.js → pmIncontri (Report, Griglia PM) e core.js (Modulo Core): ⚠️ si cambiano insieme.
-- Stesse colonne di prima, stesso ordine e stessi tipi (create or replace view); i permessi e le opzioni restano quelli di prima.
-- Copia di com'era: tools/banco/copie/azioni_conti_prima_110.sql.
-- ═══════════════════════════════════════════════════════════
create or replace view public.azioni_conti as
 SELECT t.id, t.user_id, t.contatto_id, t.giorno, t.tipo_azione, t.modalita, t.esito, t.contatti,
    CASE WHEN t.tipo_azione = 'Piano Marketing'
         THEN (row_number() OVER (PARTITION BY t.user_id, t.inizio, t.modalita ORDER BY t.id) = 1)::integer
         ELSE 0 END AS pm
   FROM (
 SELECT a.id, a.user_id, a.contatto_id,
    g.giorno,
    a.tipo_azione, a.modalita, a.esito,
    (a.tipo_azione = 'Contatto')::integer AS contatti,
    a.inizio
   FROM azioni a
   CROSS JOIN LATERAL (SELECT CASE WHEN a.tipo_azione = 'Contatto' AND a.esito_il IS NOT NULL THEN a.esito_il
                                   ELSE (a.inizio AT TIME ZONE 'Europe/Rome')::date END AS giorno) g
  WHERE g.giorno >= date '2026-09-14'
    AND g.giorno <= (now() AT TIME ZONE 'Europe/Rome')::date
    AND ((a.tipo_azione = 'Contatto' AND coalesce(a.categoria, '') <> 'Partner'
          AND (a.esito = ANY (ARRAY['PM Fissato', 'Appuntamento', 'Ordine', 'Ordina da solo', 'Richiamare', 'Relazione', 'No Interesse', 'Consulenza Prodotti'])
               OR a.esito = 'Riordino' AND coalesce(a.completata, false)))
         OR (a.tipo_azione = 'Piano Marketing' AND a.esito = ANY (ARRAY['Presentazione', 'Dare Seguito', 'Iscrizione', 'No BuonFine', 'Prodotti'])))
   ) t;
